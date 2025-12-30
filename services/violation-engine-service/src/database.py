"""
Database Connection Management

PostgreSQL connection pool management for violation repository.
"""
import os
import logging
from typing import Optional
from psycopg2.pool import ThreadedConnectionPool

logger = logging.getLogger(__name__)


def create_connection_pool(
    min_conn: int = 1,
    max_conn: int = 10
) -> Optional[ThreadedConnectionPool]:
    """
    Create PostgreSQL connection pool.
    
    Args:
        min_conn: Minimum connections in pool (default: 1)
        max_conn: Maximum connections in pool (default: 10)
        
    Returns:
        ThreadedConnectionPool instance or None on error
    """
    # Get connection parameters from environment
    db_host = os.getenv('DB_HOST', 'localhost')
    db_port = int(os.getenv('DB_PORT', 5432))
    db_name = os.getenv('DB_NAME', 'nexxau')
    db_user = os.getenv('DB_USER', 'postgres')
    db_password = os.getenv('DB_PASSWORD', '')
    
    try:
        pool = ThreadedConnectionPool(
            min_conn,
            max_conn,
            host=db_host,
            port=db_port,
            database=db_name,
            user=db_user,
            password=db_password
        )
        
        # Test connection
        conn = pool.getconn()
        try:
            conn.cursor().execute('SELECT 1')
            logger.info("Database connection pool created successfully")
        finally:
            pool.putconn(conn)
        
        return pool
        
    except Exception as e:
        logger.error(f"Failed to create database connection pool: {e}", exc_info=True)
        return None

