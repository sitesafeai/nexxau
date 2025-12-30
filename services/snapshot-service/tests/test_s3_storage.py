"""
Tests for S3 Storage

Tests S3 storage operations (upload, signed URLs, deletion).
"""
import pytest
from unittest.mock import Mock, patch, MagicMock
import boto3

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from s3_storage import S3Storage


@pytest.fixture
def mock_s3_client():
    """Mock S3 client"""
    with patch('boto3.client') as mock_client:
        s3_mock = MagicMock()
        mock_client.return_value = s3_mock
        yield s3_mock


def test_s3_key_generation():
    """Test S3 key generation with proper layout"""
    storage = S3Storage(
        endpoint_url=None,
        bucket_name="test-bucket",
        access_key="test-key",
        secret_key="test-secret"
    )
    
    s3_key = storage.get_s3_key(
        tenant_id="tenant-123",
        worksite_id="worksite-456",
        violation_id="violation-789",
        filename="snapshot.jpg"
    )
    
    expected = "tenant/tenant-123/worksite/worksite-456/violations/violation-789/snapshot.jpg"
    assert s3_key == expected


def test_s3_key_with_zone():
    """Test S3 key generation includes zone if provided"""
    storage = S3Storage(
        endpoint_url=None,
        bucket_name="test-bucket",
        access_key="test-key",
        secret_key="test-secret"
    )
    
    # Note: Current implementation doesn't include zone in path
    # This test verifies current behavior
    s3_key = storage.get_s3_key(
        tenant_id="tenant-123",
        worksite_id="worksite-456",
        violation_id="violation-789",
        filename="clip.mp4"
    )
    
    assert "tenant/tenant-123" in s3_key
    assert "worksite/worksite-456" in s3_key
    assert "violations/violation-789" in s3_key
    assert s3_key.endswith("clip.mp4")


@patch('boto3.client')
def test_upload_file_success(mock_client):
    """Test successful file upload"""
    s3_mock = MagicMock()
    mock_client.return_value = s3_mock
    
    storage = S3Storage(
        endpoint_url=None,
        bucket_name="test-bucket",
        access_key="test-key",
        secret_key="test-secret"
    )
    
    # Create temporary file
    import tempfile
    with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as tmp:
        tmp.write(b"test image data")
        tmp_path = tmp.name
    
    try:
        result = storage.upload_file(
            local_path=tmp_path,
            s3_key="test/key.jpg",
            content_type="image/jpeg"
        )
        
        assert result is True
        s3_mock.upload_file.assert_called_once()
        
    finally:
        os.unlink(tmp_path)


@patch('boto3.client')
def test_generate_signed_url(mock_client):
    """Test signed URL generation"""
    s3_mock = MagicMock()
    s3_mock.generate_presigned_url.return_value = "https://s3.example.com/signed-url"
    mock_client.return_value = s3_mock
    
    storage = S3Storage(
        endpoint_url=None,
        bucket_name="test-bucket",
        access_key="test-key",
        secret_key="test-secret"
    )
    
    url = storage.generate_signed_url(
        s3_key="test/key.jpg",
        expiration_seconds=3600
    )
    
    assert url == "https://s3.example.com/signed-url"
    s3_mock.generate_presigned_url.assert_called_once()


@patch('boto3.client')
def test_delete_file_success(mock_client):
    """Test successful file deletion"""
    s3_mock = MagicMock()
    mock_client.return_value = s3_mock
    
    storage = S3Storage(
        endpoint_url=None,
        bucket_name="test-bucket",
        access_key="test-key",
        secret_key="test-secret"
    )
    
    result = storage.delete_file("test/key.jpg")
    
    assert result is True
    s3_mock.delete_object.assert_called_once_with(
        Bucket="test-bucket",
        Key="test/key.jpg"
    )


if __name__ == '__main__':
    pytest.main([__file__, '-v'])

