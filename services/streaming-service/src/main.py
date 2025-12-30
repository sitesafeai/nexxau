"""
Streaming Service - Main Entry Point

HTTP API service for video streaming with WebRTC and LL-HLS support.
"""
import os
import sys
import logging
import signal
from flask import Flask, jsonify, send_file, Response, request
from typing import Optional
from prometheus_client import generate_latest
from pathlib import Path

from .stream_manager import StreamManager
from .streaming_config import StreamingConfig
from .health_monitor import HealthMonitor
from .fallback_manager import FallbackManager
from .camera_client import CameraClient
from .database import create_connection_pool

logger = logging.getLogger(__name__)

app = Flask(__name__)
stream_manager: Optional[StreamManager] = None
health_monitor: Optional[HealthMonitor] = None
fallback_manager: Optional[FallbackManager] = None
camera_client: Optional[CameraClient] = None


@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({'status': 'healthy'}), 200


@app.route('/metrics', methods=['GET'])
def metrics():
    """Prometheus metrics endpoint"""
    return generate_latest(), 200


@app.route('/stream/<camera_id>/start', methods=['POST'])
def start_stream(camera_id: str):
    """
    Start streaming for a camera.
    
    Query parameters:
    - protocol: Optional (webrtc, ll_hls). Auto-selected if not provided.
    """
    try:
        # Get camera information
        camera = camera_client.get_camera(camera_id)
        if not camera:
            return jsonify({'error': 'camera_not_found'}), 404
        
        rtsp_url = camera.get('stream_url')
        if not rtsp_url:
            return jsonify({'error': 'no_stream_url'}), 400
        
        worksite_id = camera.get('worksite_id')
        
        # Get camera count for protocol selection
        camera_count = camera_client.get_camera_count_by_worksite(worksite_id) if worksite_id else 1
        
        # Determine protocol
        protocol = None
        if 'protocol' in request.args:
            from .streaming_config import StreamingProtocol
            protocol = StreamingProtocol(request.args['protocol'])
        
        # Start stream
        success = stream_manager.start_stream(
            camera_id=camera_id,
            rtsp_url=rtsp_url,
            protocol=protocol,
            camera_count=camera_count
        )
        
        if success:
            # Record health monitoring
            stream = stream_manager._streams.get(camera_id)
            if stream:
                health_monitor.record_stream_start(
                    camera_id=camera_id,
                    protocol=stream.protocol.value,
                    worksite_id=worksite_id or 'unknown'
                )
            
            stream_url = stream_manager.get_stream_url(camera_id)
            return jsonify({
                'success': True,
                'camera_id': camera_id,
                'stream_url': stream_url,
                'protocol': stream.protocol.value if stream else None
            }), 200
        else:
            return jsonify({'error': 'failed_to_start_stream'}), 500
            
    except Exception as e:
        logger.error(f"Error starting stream: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500


@app.route('/stream/<camera_id>/stop', methods=['POST'])
def stop_stream(camera_id: str):
    """Stop streaming for a camera"""
    try:
        success = stream_manager.stop_stream(camera_id)
        
        if success:
            health_monitor.record_stream_stop(camera_id)
            return jsonify({'success': True}), 200
        else:
            return jsonify({'error': 'stream_not_found'}), 404
            
    except Exception as e:
        logger.error(f"Error stopping stream: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500


@app.route('/stream/<camera_id>/status', methods=['GET'])
def get_stream_status(camera_id: str):
    """Get stream status and health"""
    try:
        is_active = stream_manager.is_stream_active(camera_id)
        health = health_monitor.get_stream_health(camera_id)
        stream_url = stream_manager.get_stream_url(camera_id)
        
        return jsonify({
            'camera_id': camera_id,
            'is_active': is_active,
            'stream_url': stream_url,
            'health': health
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting stream status: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500


@app.route('/hls/<camera_id>/playlist.m3u8', methods=['GET'])
def serve_hls_playlist(camera_id: str):
    """Serve HLS playlist file"""
    try:
        playlist_path = stream_manager.stream_base_path / camera_id / "playlist.m3u8"
        
        if not playlist_path.exists():
            return jsonify({'error': 'playlist_not_found'}), 404
        
        return send_file(str(playlist_path), mimetype='application/vnd.apple.mpegurl')
        
    except Exception as e:
        logger.error(f"Error serving HLS playlist: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500


@app.route('/hls/<camera_id>/<segment>', methods=['GET'])
def serve_hls_segment(camera_id: str, segment: str):
    """Serve HLS segment file"""
    try:
        segment_path = stream_manager.stream_base_path / camera_id / segment
        
        if not segment_path.exists():
            return jsonify({'error': 'segment_not_found'}), 404
        
        return send_file(str(segment_path), mimetype='video/mp2t')
        
    except Exception as e:
        logger.error(f"Error serving HLS segment: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500


@app.route('/webrtc/<camera_id>', methods=['GET'])
def webrtc_endpoint(camera_id: str):
    """WebRTC signaling endpoint (placeholder)"""
    return jsonify({
        'camera_id': camera_id,
        'protocol': 'webrtc',
        'status': 'not_implemented'
    }), 501  # Not Implemented


def main():
    """Main entry point"""
    global stream_manager, health_monitor, fallback_manager, camera_client
    
    # Setup logging
    logging.basicConfig(
        level=os.getenv('LOG_LEVEL', 'INFO'),
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    # Load configuration
    port = int(os.getenv('PORT', '8080'))
    
    logger.info("=" * 60)
    logger.info("Streaming Service Starting")
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
    config = StreamingConfig.from_env()
    stream_manager = StreamManager(config)
    health_monitor = HealthMonitor()
    fallback_manager = FallbackManager(enable_fallback=True)
    camera_client = CameraClient(db_pool)
    
    # Setup signal handlers
    def signal_handler(sig, frame):
        logger.info("Received shutdown signal")
        # Stop all streams
        for camera_id in list(stream_manager._streams.keys()):
            stream_manager.stop_stream(camera_id)
        sys.exit(0)
    
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    # Start Flask app
    logger.info(f"Starting Flask app on port {port}")
    app.run(host='0.0.0.0', port=port, debug=False)


if __name__ == '__main__':
    main()

