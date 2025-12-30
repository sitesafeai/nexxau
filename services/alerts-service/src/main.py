"""
Alerts Service - Main Entry Point

Processes violation state changes and sends alerts via multiple channels.
"""
import os
import sys
import logging
import signal
import time
import redis
from prometheus_client import Counter, Histogram, start_http_server

from .violation_consumer import ViolationStateChangeConsumer
from .alert_channels import WebSocketAlertChannel, EmailAlertChannel, SMSAlertChannel
from .alert_router import AlertRouter
from .snapshot_client import SnapshotClient
from .acknowledgement_repository import AcknowledgementRepository
from .alert_processor import AlertProcessor
from .database import create_connection_pool

logger = logging.getLogger(__name__)

# Prometheus metrics
alerts_sent_total = Counter(
    'alerts_sent_total',
    'Total number of alerts sent',
    ['channel', 'tenant_id', 'state']
)

alerts_acknowledged_total = Counter(
    'alerts_acknowledged_total',
    'Total number of alerts acknowledged',
    ['tenant_id']
)

alerts_escalated_total = Counter(
    'alerts_escalated_total',
    'Total number of alerts escalated',
    ['tenant_id']
)

alert_send_latency_ms = Histogram(
    'alert_send_latency_ms',
    'Alert send latency in milliseconds',
    buckets=[100, 500, 1000, 2000, 5000]
)


def create_redis_client() -> redis.Redis:
    """Create Redis client from environment variables"""
    host = os.getenv('REDIS_HOST', 'localhost')
    port = int(os.getenv('REDIS_PORT', 6379))
    password = os.getenv('REDIS_PASSWORD') or None
    db = int(os.getenv('REDIS_DB', 0))
    use_ssl = os.getenv('REDIS_TLS', 'false').lower() == 'true'
    
    return redis.Redis(
        host=host,
        port=port,
        password=password,
        db=db,
        ssl=use_ssl,
        decode_responses=False,
        socket_connect_timeout=5,
        socket_timeout=5,
        retry_on_timeout=True,
    )


class AlertsService:
    """Main alerts service"""
    
    def __init__(
        self,
        redis_client: redis.Redis,
        alert_processor: AlertProcessor
    ):
        self.redis = redis_client
        self.consumer = ViolationStateChangeConsumer(redis_client)
        self.processor = alert_processor
        self.running = False
    
    def start(self) -> None:
        """Start service"""
        self.running = True
        logger.info("Starting alerts service")
        
        while self.running:
            try:
                self._process_batch()
            except KeyboardInterrupt:
                logger.info("Received interrupt signal, shutting down")
                self.running = False
                break
            except Exception as e:
                logger.error(f"Error in processing loop: {e}", exc_info=True)
                time.sleep(1)
        
        logger.info("Alerts service stopped")
    
    def stop(self) -> None:
        """Stop service"""
        self.running = False
    
    def _process_batch(self) -> None:
        """Process a batch of violation state changes"""
        # Read pending messages first
        pending_events = self.consumer.read_messages(count=10, block_ms=1000)
        
        # Then read new messages
        new_events = self.consumer.read_new_messages(count=10, block_ms=0)
        
        all_events = pending_events + new_events
        
        if not all_events:
            time.sleep(0.1)
            return
        
        message_ids_to_ack = []
        
        for state_change in all_events:
            try:
                # Process alert
                start_time = time.time()
                result = self.processor.process_violation_state_change(state_change)
                latency_ms = (time.time() - start_time) * 1000
                
                # Update metrics
                if result.get('alert_sent'):
                    channels = result.get('channels', {})
                    for channel_name, success in channels.items():
                        if success:
                            alerts_sent_total.labels(
                                channel=channel_name,
                                tenant_id=state_change.tenant_id,
                                state=state_change.new_state
                            ).inc()
                    
                    # Track escalation
                    if state_change.new_state == 'ESCALATED':
                        alerts_escalated_total.labels(
                            tenant_id=state_change.tenant_id
                        ).inc()
                
                alert_send_latency_ms.observe(latency_ms)
                
                # Audit logging
                logger.info(
                    f"Processed violation state change",
                    extra={
                        'violation_id': state_change.violation_id,
                        'state': state_change.new_state,
                        'alert_sent': result.get('alert_sent', False),
                        'channels': list(result.get('channels', {}).keys()),
                        'latency_ms': latency_ms,
                    }
                )
                
                # Acknowledge message
                message_ids_to_ack.append(state_change.message_id)
                
            except Exception as e:
                logger.error(
                    f"Failed to process state change {state_change.message_id}: {e}",
                    exc_info=True
                )
                # Acknowledge poison message
                message_ids_to_ack.append(state_change.message_id)
        
        # Acknowledge all processed messages
        if message_ids_to_ack:
            for message_id in message_ids_to_ack:
                self.consumer.acknowledge_message(message_id)


def main():
    """Main entry point"""
    # Setup logging
    logging.basicConfig(
        level=os.getenv('LOG_LEVEL', 'INFO'),
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    # Load configuration
    suppression_window_seconds = int(os.getenv('ALERT_SUPPRESSION_WINDOW_SECONDS', '60'))
    require_snapshots = os.getenv('REQUIRE_SNAPSHOTS', 'true').lower() == 'true'
    retry_max_attempts = int(os.getenv('ALERT_RETRY_MAX_ATTEMPTS', '3'))
    retry_backoff_seconds = float(os.getenv('ALERT_RETRY_BACKOFF_SECONDS', '1.0'))
    metrics_port = int(os.getenv('METRICS_PORT', '8000'))
    
    # Channel configuration
    enable_websocket = os.getenv('ENABLE_WEBSOCKET', 'true').lower() == 'true'
    enable_email = os.getenv('ENABLE_EMAIL', 'true').lower() == 'true'
    enable_sms = os.getenv('ENABLE_SMS', 'false').lower() == 'true'
    
    # Email configuration
    smtp_host = os.getenv('SMTP_HOST', 'smtp.gmail.com')
    smtp_port = int(os.getenv('SMTP_PORT', '587'))
    smtp_user = os.getenv('SMTP_USER')
    smtp_password = os.getenv('SMTP_PASSWORD')
    smtp_from_email = os.getenv('SMTP_FROM_EMAIL')
    
    # SMS configuration
    twilio_account_sid = os.getenv('TWILIO_ACCOUNT_SID')
    twilio_auth_token = os.getenv('TWILIO_AUTH_TOKEN')
    twilio_from_number = os.getenv('TWILIO_FROM_NUMBER')
    
    # S3 configuration (for signed URLs)
    s3_endpoint_url = os.getenv('S3_ENDPOINT_URL')
    s3_access_key = os.getenv('S3_ACCESS_KEY')
    s3_secret_key = os.getenv('S3_SECRET_KEY')
    s3_region = os.getenv('S3_REGION', 'us-east-1')
    signed_url_ttl_seconds = int(os.getenv('SIGNED_URL_TTL_SECONDS', '3600'))
    
    logger.info("=" * 60)
    logger.info("Alerts Service Starting")
    logger.info(f"Suppression window: {suppression_window_seconds}s")
    logger.info(f"Require snapshots: {require_snapshots}")
    logger.info(f"Channels: WebSocket={enable_websocket}, Email={enable_email}, SMS={enable_sms}")
    logger.info("=" * 60)
    
    # Connect to Redis
    try:
        redis_client = create_redis_client()
        redis_client.ping()
        logger.info("Redis connected successfully")
    except Exception as e:
        logger.error(f"Failed to connect to Redis: {e}", exc_info=True)
        sys.exit(1)
    
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
    
    # Initialize S3 client (optional, for signed URLs)
    s3_client = None
    if s3_access_key and s3_secret_key:
        try:
            import boto3
            s3_client = boto3.client(
                's3',
                endpoint_url=s3_endpoint_url,
                aws_access_key_id=s3_access_key,
                aws_secret_access_key=s3_secret_key,
                region_name=s3_region
            )
            logger.info("S3 client initialized for signed URLs")
        except Exception as e:
            logger.warning(f"Failed to initialize S3 client: {e}")
    
    # Initialize alert channels
    channels = []
    
    if enable_websocket:
        channels.append(WebSocketAlertChannel(redis_client))
        logger.info("WebSocket channel enabled")
    
    if enable_email:
        if smtp_user and smtp_password:
            channels.append(EmailAlertChannel(
                smtp_host=smtp_host,
                smtp_port=smtp_port,
                smtp_user=smtp_user,
                smtp_password=smtp_password,
                from_email=smtp_from_email
            ))
            logger.info("Email channel enabled")
        else:
            logger.warning("Email channel disabled (missing SMTP credentials)")
    
    if enable_sms:
        if twilio_account_sid and twilio_auth_token and twilio_from_number:
            channels.append(SMSAlertChannel(
                twilio_account_sid=twilio_account_sid,
                twilio_auth_token=twilio_auth_token,
                twilio_from_number=twilio_from_number
            ))
            logger.info("SMS channel enabled")
        else:
            logger.warning("SMS channel disabled (missing Twilio credentials)")
    
    if not channels:
        logger.error("No alert channels enabled. Exiting.")
        sys.exit(1)
    
    # Initialize components
    alert_router = AlertRouter(
        channels=channels,
        suppression_window_seconds=suppression_window_seconds,
        enable_websocket=enable_websocket,
        enable_email=enable_email,
        enable_sms=enable_sms
    )
    
    snapshot_client = SnapshotClient(db_pool, s3_client)
    
    acknowledgement_repository = AcknowledgementRepository(db_pool)
    
    alert_processor = AlertProcessor(
        alert_router=alert_router,
        snapshot_client=snapshot_client,
        acknowledgement_repository=acknowledgement_repository,
        require_snapshots=require_snapshots,
        retry_max_attempts=retry_max_attempts,
        retry_backoff_seconds=retry_backoff_seconds
    )
    
    # Start Prometheus metrics server
    try:
        start_http_server(metrics_port)
        logger.info(f"Prometheus metrics server started on port {metrics_port}")
    except Exception as e:
        logger.warning(f"Failed to start metrics server: {e}")
    
    # Setup signal handlers
    service = AlertsService(redis_client, alert_processor)
    
    def signal_handler(sig, frame):
        logger.info("Received shutdown signal")
        service.stop()
    
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    # Start service
    try:
        service.start()
    except Exception as e:
        logger.error(f"Fatal error: {e}", exc_info=True)
        sys.exit(1)


if __name__ == '__main__':
    main()

