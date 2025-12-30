"""
Acknowledgement Service - Main Entry Point

HTTP API service for handling acknowledgements.
"""
import os
import sys
import logging
from flask import Flask, request, jsonify
from prometheus_client import Counter, Histogram, generate_latest
import signal

from .acknowledgement_service import AcknowledgementService
from .acknowledgement_repository import AcknowledgementRepository
from .state_manager import StateManager
from .database import create_connection_pool

logger = logging.getLogger(__name__)

# Prometheus metrics
acknowledgements_created_total = Counter(
    'acknowledgements_created_total',
    'Total number of acknowledgements created',
    ['method', 'tenant_id']
)

acknowledgement_processing_latency_ms = Histogram(
    'acknowledgement_processing_latency_ms',
    'Acknowledgement processing latency in milliseconds',
    buckets=[100, 500, 1000, 2000, 5000]
)

app = Flask(__name__)
acknowledgement_service = None


@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({'status': 'healthy'}), 200


@app.route('/metrics', methods=['GET'])
def metrics():
    """Prometheus metrics endpoint"""
    return generate_latest(), 200


@app.route('/acknowledge', methods=['POST'])
def acknowledge_web():
    """
    Acknowledge violation via web interface.
    
    Request body:
    {
        "violation_id": "...",
        "tenant_id": "...",
        "user_id": "...",
        "note": "..." (optional)
    }
    """
    import time
    start_time = time.time()
    
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'missing_request_body'}), 400
        
        violation_id = data.get('violation_id')
        tenant_id = data.get('tenant_id')
        user_id = data.get('user_id')
        note = data.get('note')
        
        if not all([violation_id, tenant_id, user_id]):
            return jsonify({'error': 'missing_required_fields'}), 400
        
        result = acknowledgement_service.acknowledge_violation_web(
            violation_id=violation_id,
            tenant_id=tenant_id,
            user_id=user_id,
            note=note
        )
        
        latency_ms = (time.time() - start_time) * 1000
        acknowledgement_processing_latency_ms.observe(latency_ms)
        
        if result.get('success'):
            acknowledgements_created_total.labels(
                method='web',
                tenant_id=tenant_id
            ).inc()
            
            return jsonify(result), 200
        else:
            return jsonify(result), 400
            
    except Exception as e:
        logger.error(f"Error processing web acknowledgement: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500


@app.route('/acknowledge/email', methods=['GET'])
def acknowledge_email_link():
    """
    Acknowledge violation via email link.
    
    Query parameters:
    - token: Secure token from email link
    - note: Optional acknowledgement note
    """
    import time
    start_time = time.time()
    
    try:
        token = request.args.get('token')
        note = request.args.get('note')
        
        if not token:
            return jsonify({'error': 'missing_token'}), 400
        
        result = acknowledgement_service.acknowledge_violation_email_link(
            token=token,
            note=note
        )
        
        latency_ms = (time.time() - start_time) * 1000
        acknowledgement_processing_latency_ms.observe(latency_ms)
        
        if result.get('success'):
            # Extract tenant_id from token for metrics
            token_data = acknowledgement_service._decode_token(token)
            tenant_id = token_data.get('tenant_id', 'unknown') if token_data else 'unknown'
            
            acknowledgements_created_total.labels(
                method='email_link',
                tenant_id=tenant_id
            ).inc()
            
            # Return HTML page for email links
            if result.get('already_acknowledged'):
                return """
                <html>
                <body>
                <h2>Violation Already Acknowledged</h2>
                <p>This violation has already been acknowledged.</p>
                </body>
                </html>
                """, 200
            else:
                return """
                <html>
                <body>
                <h2>Acknowledgement Received</h2>
                <p>Thank you for acknowledging this violation.</p>
                </body>
                </html>
                """, 200
        else:
            return jsonify(result), 400
            
    except Exception as e:
        logger.error(f"Error processing email acknowledgement: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500


@app.route('/acknowledge/sms', methods=['POST'])
def acknowledge_sms():
    """
    Acknowledge violation via SMS reply.
    
    Request body (from Twilio webhook):
    {
        "violation_id": "...",
        "tenant_id": "...",
        "From": "+1234567890",
        "Body": "..." (optional note)
    }
    """
    import time
    start_time = time.time()
    
    try:
        data = request.get_json() or request.form.to_dict()
        
        violation_id = data.get('violation_id')
        tenant_id = data.get('tenant_id')
        user_phone = data.get('From') or data.get('from')
        note = data.get('Body') or data.get('body')
        
        if not all([violation_id, tenant_id, user_phone]):
            return jsonify({'error': 'missing_required_fields'}), 400
        
        result = acknowledgement_service.acknowledge_violation_sms(
            violation_id=violation_id,
            tenant_id=tenant_id,
            user_phone=user_phone,
            note=note
        )
        
        latency_ms = (time.time() - start_time) * 1000
        acknowledgement_processing_latency_ms.observe(latency_ms)
        
        if result.get('success'):
            acknowledgements_created_total.labels(
                method='sms',
                tenant_id=tenant_id
            ).inc()
            
            # Return Twilio XML response
            return '<?xml version="1.0" encoding="UTF-8"?><Response><Message>Acknowledgement received. Thank you.</Message></Response>', 200
        else:
            return jsonify(result), 400
            
    except Exception as e:
        logger.error(f"Error processing SMS acknowledgement: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500


def main():
    """Main entry point"""
    global acknowledgement_service
    
    # Setup logging
    logging.basicConfig(
        level=os.getenv('LOG_LEVEL', 'INFO'),
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    # Load configuration
    port = int(os.getenv('PORT', '8080'))
    token_secret = os.getenv('ACK_TOKEN_SECRET', 'change-me-in-production')
    acknowledgement_timeout_minutes = int(os.getenv('ACK_TIMEOUT_MINUTES', '30'))
    escalation_timeout_minutes = int(os.getenv('ESCALATION_TIMEOUT_MINUTES', '60'))
    
    logger.info("=" * 60)
    logger.info("Acknowledgement Service Starting")
    logger.info(f"Acknowledgement timeout: {acknowledgement_timeout_minutes} minutes")
    logger.info(f"Escalation timeout: {escalation_timeout_minutes} minutes")
    logger.info("=" * 60)
    
    # Connect to PostgreSQL
    try:
        db_pool = create_connection_pool()
        if not db_pool:
            logger.error("Failed to create database connection pool")
            sys.exit(1)
        logger.info("Database connected successfully")
    except Exception as e:
        logger.error(f"Failed to connect to database: {e}", exc_info=True)
        sys.exit(1)
    
    # Initialize components
    acknowledgement_repository = AcknowledgementRepository(db_pool)
    
    state_manager = StateManager(
        acknowledgement_timeout_minutes=acknowledgement_timeout_minutes,
        escalation_timeout_minutes=escalation_timeout_minutes
    )
    
    acknowledgement_service = AcknowledgementService(
        acknowledgement_repository=acknowledgement_repository,
        state_manager=state_manager,
        token_secret=token_secret
    )
    
    # Setup signal handlers
    def signal_handler(sig, frame):
        logger.info("Received shutdown signal")
        sys.exit(0)
    
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    # Start Flask app
    logger.info(f"Starting Flask app on port {port}")
    app.run(host='0.0.0.0', port=port, debug=False)


if __name__ == '__main__':
    main()

