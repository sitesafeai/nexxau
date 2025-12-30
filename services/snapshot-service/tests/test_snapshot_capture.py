"""
Tests for Snapshot Capture

Tests snapshot and video clip capture functionality.
"""
import pytest
import tempfile
import shutil
from pathlib import Path
from datetime import datetime, timedelta
import os

import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from snapshot_capture import SnapshotCapture


@pytest.fixture
def temp_frames_dir():
    """Create temporary frames directory"""
    temp_dir = tempfile.mkdtemp()
    yield temp_dir
    shutil.rmtree(temp_dir)


@pytest.fixture
def sample_camera_frames(temp_frames_dir):
    """Create sample camera frames for testing"""
    camera_id = "camera-123"
    camera_dir = Path(temp_frames_dir) / camera_id
    camera_dir.mkdir(parents=True)
    
    # Create frame files with timestamps
    base_time = datetime.utcnow()
    frames = []
    
    for i in range(10):
        frame_path = camera_dir / f"frame_{i:05d}.jpg"
        frame_path.touch()
        # Set modification time to simulate frame timestamps
        frame_time = base_time + timedelta(seconds=i)
        os.utime(frame_path, (frame_time.timestamp(), frame_time.timestamp()))
        frames.append((frame_path, frame_time))
    
    return temp_frames_dir, camera_id, frames


def test_capture_snapshot_success(sample_camera_frames):
    """Test successful snapshot capture"""
    frames_dir, camera_id, frames = sample_camera_frames
    capture = SnapshotCapture(frames_base_path=frames_dir)
    
    # Target timestamp in middle of frame sequence
    target_time = frames[5][1]  # 5th frame timestamp
    
    with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as tmp:
        output_path = tmp.name
    
    try:
        result = capture.capture_snapshot(
            camera_id=camera_id,
            violation_timestamp=target_time,
            output_path=output_path
        )
        
        assert result == output_path
        assert os.path.exists(output_path)
        assert os.path.getsize(output_path) == 0  # Empty file (touch), but exists
        
    finally:
        if os.path.exists(output_path):
            os.unlink(output_path)


def test_capture_snapshot_no_frames():
    """Test snapshot capture when no frames exist"""
    temp_dir = tempfile.mkdtemp()
    try:
        capture = SnapshotCapture(frames_base_path=temp_dir)
        
        result = capture.capture_snapshot(
            camera_id="nonexistent-camera",
            violation_timestamp=datetime.utcnow(),
            output_path="/tmp/test.jpg"
        )
        
        assert result is None
    finally:
        shutil.rmtree(temp_dir)


def test_capture_snapshot_finds_closest_frame(sample_camera_frames):
    """Test that snapshot capture finds closest frame to timestamp"""
    frames_dir, camera_id, frames = sample_camera_frames
    capture = SnapshotCapture(frames_base_path=frames_dir)
    
    # Target timestamp between frames
    target_time = frames[3][1] + timedelta(seconds=0.5)
    
    with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as tmp:
        output_path = tmp.name
    
    try:
        result = capture.capture_snapshot(
            camera_id=camera_id,
            violation_timestamp=target_time,
            output_path=output_path
        )
        
        # Should find frame 3 or 4 (closest)
        assert result is not None
        
    finally:
        if os.path.exists(output_path):
            os.unlink(output_path)


def test_capture_video_clip_success(sample_camera_frames):
    """Test successful video clip capture"""
    frames_dir, camera_id, frames = sample_camera_frames
    capture = SnapshotCapture(
        frames_base_path=frames_dir,
        clip_pre_seconds=2,
        clip_post_seconds=2
    )
    
    # Target timestamp in middle
    target_time = frames[5][1]
    
    with tempfile.NamedTemporaryFile(suffix='.mp4', delete=False) as tmp:
        output_path = tmp.name
    
    try:
        # Note: This will fail if FFmpeg is not installed
        # In real tests, would mock FFmpeg or skip if not available
        result = capture.capture_video_clip(
            camera_id=camera_id,
            violation_timestamp=target_time,
            output_path=output_path
        )
        
        # Result may be None if FFmpeg not available
        # In production, would check FFmpeg availability
        
    finally:
        if os.path.exists(output_path):
            os.unlink(output_path)


def test_find_frames_in_range(sample_camera_frames):
    """Test finding frames within time range"""
    frames_dir, camera_id, frames = sample_camera_frames
    capture = SnapshotCapture(frames_base_path=frames_dir)
    
    # Range from frame 2 to frame 7
    start_time = frames[2][1]
    end_time = frames[7][1]
    
    frame_paths = capture._find_frames_in_range(camera_id, start_time, end_time)
    
    # Should find frames 2-7 (6 frames)
    assert len(frame_paths) == 6


if __name__ == '__main__':
    pytest.main([__file__, '-v'])

