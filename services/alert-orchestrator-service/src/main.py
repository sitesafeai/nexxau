"""
Alert Orchestrator Service - Main Entry Point

Orchestrates alert delivery with rate limiting, escalation, and retry logic.
"""
import os
import sys
import logging
import signal
import time
import redis
from prometheus_client import Counter, Histogram, start_http_server

from .violation_consumer import ViolationStateChangeConsumer
from .alert_channels import SocketIOAlertChannel, EmailAlertChannel, TwilioSMSAlertChannel
from .rate_limiter import RateLimiter
from .escalation_manager import EscalationManager
from .retry_handler import RetryHandler, FailureLogger
from .alert_orchestrator import AlertOrchestrator
from .sms_rate_limiter import SMSRateLimiter

logger = logging.getLogger(__name__)

# Prometheus metrics
alerts_orchestrated_total = Counter(
    'alerts_orchestrated_total',
    'Total number of alerts orchestrated',
    ['severity', 'tenant_id', 'success']
)

alerts_rate_limited_total = Counter(
    'alerts_rate_limited_total',
    'Total number of alerts rate-limited',
    ['reason', 'tenant_id']
)

alert_orchestration_latency_ms = Histogram(
    'alert_orchestration_latency_ms',
    'Alert orchestration latency in milliseconds',
    buckets=[100, 500, 1000, 2000, 5000, 10000]
)

alert_retry_attempts_total = Counter(
    'alert_retry_attempts_total',
    'Total retry attempts for alerts',
    ['channel', 'tenant_id']
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


class AlertOrchestratorService:
    """Main alert orchestrator service"""
    
    def __init__(
        self,
        redis_client: redis.Redis,
        orchestrator: AlertOrchestrator
    ):
        self.redis = redis_client
        self.consumer = ViolationStateChangeConsumer(redis_client)
        self.orchestrator = orchestrator
        self.running = False
    
    def start(self) -> None:
        """Start service"""
        self.running = True
        logger.info("Starting alert orchestrator service")
        
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
        
        logger.info("Alert orchestrator service stopped")
    
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
                # Check if alert should be sent
                if not state_change.should_send_alert():
                    message_ids_to_ack.append(state_change.message_id)
                    continue
                
                # Orchestrate alert delivery
                start_time = time.time()
                result = self.orchestrator.send_alert(
                    violation_id=state_change.violation_id,
                    tenant_id=state_change.tenant_id,
                    worksite_id=state_change.worksite_id,
                    camera_id=state_change.camera_id,
                    violation_type=state_change.violation_type,
                    state=state_change.new_state,
                    snapshot_url=state_change.metadata.get('snapshot_url') if state_change.metadata else None,
                    clip_url=state_change.metadata.get('clip_url') if state_change.metadata else None,
                    recipients=None,  # TODO: Fetch from database based on tenant/worksite
                    violation_timestamp=state_change.timestamp_dt,
                    metadata=state_change.metadata
                )
                latency_ms = (time.time() - start_time) * 1000
                
                # Update metrics
                alerts_orchestrated_total.labels(
                    severity=result.get('severity', 'UNKNOWN'),
                    tenant_id=state_change.tenant_id,
                    success='true' if result.get('success') else 'false'
                ).inc()
                
                if result.get('rate_limited'):
                    alerts_rate_limited_total.labels(
                        reason=result.get('rate_limit_reason', 'unknown'),
                        tenant_id=state_change.tenant_id
                    ).inc()
                
                alert_orchestration_latency_ms.observe(latency_ms)
                
                # Audit logging
                logger.info(
                    f"Orchestrated alert delivery",
                    extra={
                        'violation_id': state_change.violation_id,
                        'state': state_change.new_state,
                        'severity': result.get('severity'),
                        'success': result.get('success'),
                        'rate_limited': result.get('rate_limited'),
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
    metrics_port = int(os.getenv('METRICS_PORT', '8000'))
    
    # Rate limiting configuration
    camera_limit_per_minute = int(os.getenv('RATE_LIMIT_CAMERA_PER_MINUTE', '5'))
    user_limit_per_minute = int(os.getenv('RATE_LIMIT_USER_PER_MINUTE', '10'))
    
    # Escalation configuration
    critical_threshold_minutes = int(os.getenv('ESCALATION_CRITICAL_THRESHOLD_MINUTES', '15'))
    
    # Retry configuration
    retry_max_attempts = int(os.getenv('RETRY_MAX_ATTEMPTS', '3'))
    retry_initial_backoff = float(os.getenv('RETRY_INITIAL_BACKOFF_SECONDS', '1.0'))
    retry_max_backoff = float(os.getenv('RETRY_MAX_BACKOFF_SECONDS', '60.0'))
    retry_backoff_multiplier = float(os.getenv('RETRY_BACKOFF_MULTIPLIER', '2.0'))
    
    # Channel configuration
    enable_socketio = os.getenv('ENABLE_SOCKETIO', 'true').lower() == 'true'
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
    
    logger.info("=" * 60)
    logger.info("Alert Orchestrator Service Starting")
    logger.info(f"Rate limits: Camera={camera_limit_per_minute}/min, User={user_limit_per_minute}/min")
    logger.info(f"Escalation: CRITICAL threshold={critical_threshold_minutes} minutes")
    logger.info(f"Retry: max_attempts={retry_max_attempts}, backoff={retry_initial_backoff}s")
    logger.info("=" * 60)
    
    # Connect to Redis
    try:
        redis_client = create_redis_client()
        redis_client.ping()
        logger.info("Redis connected successfully")
    except Exception as e:
        logger.error(f"Failed to connect to Redis: {e}", exc_info=True)
        sys.exit(1)
    
    # Initialize alert channels
    channels = {}
    
    if enable_socketio:
        channels['socketio'] = SocketIOAlertChannel(redis_client)
        logger.info("Socket.IO channel enabled")
    
    if enable_email:
        if smtp_user and smtp_password:
            channels['email'] = EmailAlertChannel(
                smtp_host=smtp_host,
                smtp_port=smtp_port,
                smtp_user=smtp_user,
                smtp_password=smtp_password,
                from_email=smtp_from_email
            )
            logger.info("Email channel enabled")
        else:
            logger.warning("Email channel disabled (missing SMTP credentials)")
    
    if enable_sms:
        if twilio_account_sid and twilio_auth_token and twilio_from_number:
            channels['sms'] = TwilioSMSAlertChannel(
                twilio_account_sid=twilio_account_sid,
                twilio_auth_token=twilio_auth_token,
                twilio_from_number=twilio_from_number
            )
            logger.info("SMS channel enabled")
        else:
            logger.warning("SMS channel disabled (missing Twilio credentials)")
    
    if not channels:
        logger.error("No alert channels enabled. Exiting.")
        sys.exit(1)
    
    # Initialize components
    rate_limiter = RateLimiter(
        camera_limit_per_minute=camera_limit_per_minute,
        user_limit_per_minute=user_limit_per_minute
    )
    
    escalation_manager = EscalationManager(
        critical_threshold_minutes=critical_threshold_minutes
    )
    
    retry_handler = RetryHandler(
        max_attempts=retry_max_attempts,
        initial_backoff_seconds=retry_initial_backoff,
        max_backoff_seconds=retry_max_backoff,
        backoff_multiplier=retry_backoff_multiplier
    )
    
    failure_logger = FailureLogger(log_to_database=False)
    
    # Initialize SMS rate limiter
    sms_rate_limiter = SMSRateLimiter.from_env(redis_client)
    logger.info("SMS rate limiter initialized")
    
    orchestrator = AlertOrchestrator(
        channels=channels,
        rate_limiter=rate_limiter,
        escalation_manager=escalation_manager,
        retry_handler=retry_handler,
        failure_logger=failure_logger,
        sms_rate_limiter=sms_rate_limiter
    )
    
    # Start Prometheus metrics server
    try:
        start_http_server(metrics_port)
        logger.info(f"Prometheus metrics server started on port {metrics_port}")
    except Exception as e:
        logger.warning(f"Failed to start metrics server: {e}")
    
    # Setup signal handlers
    service = AlertOrchestratorService(redis_client, orchestrator)
    
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

