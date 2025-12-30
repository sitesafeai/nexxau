"""
Template for Python microservice
Customize this file for your service needs
"""
import os
import logging
from datetime import datetime
from typing import Dict, Any

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='{"timestamp": "%(asctime)s", "level": "%(levelname)s", "service": "%(name)s", "message": "%(message)s"}',
    datefmt='%Y-%m-%dT%H:%M:%SZ'
)

logger = logging.getLogger(__name__)


def get_config() -> Dict[str, Any]:
    """Load configuration from environment variables"""
    return {
        'service_name': os.getenv('SERVICE_NAME', 'SERVICE_NAME'),
        'port': int(os.getenv('PORT', '8000')),
        'environment': os.getenv('NODE_ENV', 'development'),
        'version': os.getenv('SERVICE_VERSION', '1.0.0'),
        'log_level': os.getenv('LOG_LEVEL', 'INFO'),
    }


def health_check() -> Dict[str, Any]:
    """Health check endpoint response"""
    config = get_config()
    return {
        'status': 'healthy',
        'service': config['service_name'],
        'version': config['version'],
        'timestamp': datetime.utcnow().isoformat() + 'Z',
    }


def main():
    """Main entry point"""
    config = get_config()
    logger.info(f"Starting {config['service_name']} v{config['version']}")
    logger.info(f"Environment: {config['environment']}")
    logger.info(f"Port: {config['port']}")
    
    # Add your service initialization here
    
    logger.info("Service started successfully")


if __name__ == '__main__':
    main()
