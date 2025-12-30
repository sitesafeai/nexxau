"""
S3-Compatible Storage

Handles storage of snapshots and video clips in S3-compatible object storage.
"""
import os
import logging
from typing import Optional
from pathlib import Path
import boto3
from botocore.exceptions import ClientError
from botocore.config import Config

logger = logging.getLogger(__name__)


class S3Storage:
    """
    S3-compatible storage for snapshots and video clips.
    
    Supports MinIO and AWS S3.
    """
    
    def __init__(
        self,
        endpoint_url: Optional[str] = None,
        bucket_name: str = "violation-snapshots",
        access_key: Optional[str] = None,
        secret_key: Optional[str] = None,
        region: str = "us-east-1"
    ):
        """
        Initialize S3 storage client.
        
        Args:
            endpoint_url: S3 endpoint URL (None for AWS S3, set for MinIO)
            bucket_name: S3 bucket name (default: "violation-snapshots")
            access_key: AWS access key (or MinIO access key)
            secret_key: AWS secret key (or MinIO secret key)
            region: AWS region (default: "us-east-1")
        """
        self.bucket_name = bucket_name
        
        # Initialize S3 client
        s3_config = Config(
            signature_version='s3v4',
            retries={'max_attempts': 3, 'mode': 'standard'}
        )
        
        self.s3_client = boto3.client(
            's3',
            endpoint_url=endpoint_url,
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key,
            region_name=region,
            config=s3_config
        )
        
        # Ensure bucket exists
        self._ensure_bucket()
    
    def _ensure_bucket(self) -> None:
        """Create bucket if it doesn't exist"""
        try:
            self.s3_client.head_bucket(Bucket=self.bucket_name)
            logger.debug(f"Bucket {self.bucket_name} exists")
        except ClientError as e:
            error_code = e.response.get('Error', {}).get('Code', '')
            if error_code == '404':
                # Bucket doesn't exist, create it
                try:
                    if self.s3_client.meta.endpoint_url:
                        # MinIO - use location constraint
                        self.s3_client.create_bucket(Bucket=self.bucket_name)
                    else:
                        # AWS S3 - specify region
                        self.s3_client.create_bucket(
                            Bucket=self.bucket_name,
                            CreateBucketConfiguration={'LocationConstraint': self.s3_client.meta.region_name}
                        )
                    logger.info(f"Created bucket {self.bucket_name}")
                except Exception as create_error:
                    logger.error(f"Failed to create bucket {self.bucket_name}: {create_error}", exc_info=True)
                    raise
            else:
                logger.error(f"Error checking bucket {self.bucket_name}: {e}", exc_info=True)
                raise
    
    def upload_file(
        self,
        local_path: str,
        s3_key: str,
        content_type: Optional[str] = None
    ) -> bool:
        """
        Upload file to S3.
        
        Args:
            local_path: Local file path
            s3_key: S3 object key (path in bucket)
            content_type: Content type (default: auto-detect)
            
        Returns:
            True if successful, False otherwise
        """
        try:
            extra_args = {}
            if content_type:
                extra_args['ContentType'] = content_type
            else:
                # Auto-detect content type
                if local_path.endswith('.jpg') or local_path.endswith('.jpeg'):
                    extra_args['ContentType'] = 'image/jpeg'
                elif local_path.endswith('.mp4'):
                    extra_args['ContentType'] = 'video/mp4'
            
            self.s3_client.upload_file(
                local_path,
                self.bucket_name,
                s3_key,
                ExtraArgs=extra_args
            )
            
            logger.info(
                f"Uploaded file to S3",
                extra={
                    'local_path': local_path,
                    's3_key': s3_key,
                    'bucket': self.bucket_name,
                }
            )
            
            return True
            
        except Exception as e:
            logger.error(
                f"Failed to upload file to S3: {e}",
                extra={
                    'local_path': local_path,
                    's3_key': s3_key,
                },
                exc_info=True
            )
            return False
    
    def generate_signed_url(
        self,
        s3_key: str,
        expiration_seconds: int = 3600
    ) -> Optional[str]:
        """
        Generate presigned URL for S3 object.
        
        Args:
            s3_key: S3 object key
            expiration_seconds: URL expiration time in seconds (default: 3600 = 1 hour)
            
        Returns:
            Presigned URL if successful, None otherwise
        """
        try:
            url = self.s3_client.generate_presigned_url(
                'get_object',
                Params={
                    'Bucket': self.bucket_name,
                    'Key': s3_key
                },
                ExpiresIn=expiration_seconds
            )
            
            return url
            
        except Exception as e:
            logger.error(
                f"Failed to generate signed URL: {e}",
                extra={
                    's3_key': s3_key,
                },
                exc_info=True
            )
            return None
    
    def delete_file(self, s3_key: str) -> bool:
        """
        Delete file from S3.
        
        Args:
            s3_key: S3 object key
            
        Returns:
            True if successful, False otherwise
        """
        try:
            self.s3_client.delete_object(
                Bucket=self.bucket_name,
                Key=s3_key
            )
            
            logger.info(
                f"Deleted file from S3",
                extra={
                    's3_key': s3_key,
                    'bucket': self.bucket_name,
                }
            )
            
            return True
            
        except Exception as e:
            logger.error(
                f"Failed to delete file from S3: {e}",
                extra={
                    's3_key': s3_key,
                },
                exc_info=True
            )
            return False
    
    def get_s3_key(
        self,
        tenant_id: str,
        worksite_id: str,
        violation_id: str,
        filename: str
    ) -> str:
        """
        Generate S3 key (path) for snapshot/clip.
        
        Layout: tenant/{tenant_id}/worksite/{worksite_id}/violations/{violation_id}/{filename}
        
        Args:
            tenant_id: Tenant identifier
            worksite_id: Worksite identifier
            violation_id: Violation identifier
            filename: Filename (e.g., "snapshot.jpg", "clip.mp4")
            
        Returns:
            S3 key string
        """
        return f"tenant/{tenant_id}/worksite/{worksite_id}/violations/{violation_id}/{filename}"

