"""
YOLO Model Manager with CPU/GPU support and automatic fallback
Includes model metadata collection for compliance and audit trails
"""
import os
import logging
import hashlib
from typing import Optional, Tuple, Dict
import torch

logger = logging.getLogger(__name__)


class ModelManager:
    """
    Manages YOLO model loading with CPU/GPU support and model metadata tracking.
    
    Model metadata is collected once at load time and reused for all detections.
    This ensures immutability and audit compliance for insurance/workflow requirements.
    """
    
    def __init__(self, model_path: str):
        self.model_path = model_path
        self.model = None
        self.device_str = None
        self.device = None
        self.actual_device = None  # Actual device after fallback
        self.model_metadata: Optional[Dict[str, str]] = None  # Immutable metadata collected at load
        
    def load(self) -> Tuple[str, torch.device]:
        """
        Load YOLO model with device selection and fallback
        
        Returns:
            Tuple of (device_string, torch.device)
        """
        from ultralytics import YOLO
        
        # Determine requested device
        requested_device = os.getenv('YOLO_DEVICE', 'cpu').strip().lower()
        
        # Parse device
        if requested_device.startswith('cuda'):
            # Extract CUDA device index (e.g., "cuda:0" -> device "cuda:0")
            device_str = requested_device
            requested_torch_device = torch.device(device_str)
            
            # Check if CUDA is available
            if not torch.cuda.is_available():
                logger.error(
                    f"CUDA requested ({device_str}) but not available. "
                    "Falling back to CPU."
                )
                device_str = 'cpu'
                requested_torch_device = torch.device('cpu')
        else:
            device_str = 'cpu'
            requested_torch_device = torch.device('cpu')
        
        # Store actual device (after fallback)
        self.device_str = device_str
        self.device = requested_torch_device
        self.actual_device = requested_torch_device
        
        logger.info(f"Loading YOLO model from: {self.model_path}")
        logger.info(f"Device: {device_str} (requested: {os.getenv('YOLO_DEVICE', 'cpu')})")
        
        if device_str.startswith('cuda'):
            logger.info(f"CUDA Device: {torch.cuda.get_device_name(0)}")
            logger.info(f"CUDA Memory: {torch.cuda.get_device_properties(0).total_memory / 1e9:.2f} GB")
        
        # Load model
        try:
            self.model = YOLO(self.model_path)
            # Move model to device (YOLO handles this internally, but we track it)
            logger.info(f"Model loaded successfully on {device_str}")
        except Exception as e:
            logger.error(f"Failed to load model: {e}", exc_info=True)
            raise
        
        # Collect model metadata once at load time (immutable for audit compliance)
        self._collect_model_metadata(device_str)
        
        return device_str, requested_torch_device
    
    def _collect_model_metadata(self, device_str: str) -> None:
        """
        Collect model metadata at load time for compliance and audit trails.
        
        Metadata is computed ONCE and reused for all detections to ensure:
        - Immutability: Same model always has same metadata
        - Performance: No per-frame computation overhead
        - Audit compliance: Full provenance for insurance/workflow requirements
        
        Metadata includes:
        - model_name: Extracted from model file or Ultralytics model info
        - model_version: From Ultralytics if available
        - model_sha: SHA256 hash of model file (content-based identification)
        - device_type: Actual device used (cpu or cuda)
        """
        try:
            # Extract model name from path or model object
            model_name = os.path.basename(self.model_path).replace('.pt', '').replace('.onnx', '')
            
            # Try to get version from Ultralytics model
            model_version = "unknown"
            try:
                # Ultralytics models may have metadata
                if hasattr(self.model, 'model') and hasattr(self.model.model, '__version__'):
                    model_version = str(self.model.model.__version__)
                elif hasattr(self.model, 'version'):
                    model_version = str(self.model.version)
                # Try to get from ultralytics package version as fallback
                try:
                    import ultralytics
                    model_version = ultralytics.__version__
                except:
                    pass
            except Exception as e:
                logger.warning(f"Could not extract model version: {e}")
            
            # Compute SHA256 hash of model file (for content-based identification)
            model_sha = self._compute_file_hash(self.model_path)
            
            # Determine device type (cpu or cuda:0, cuda:1, etc.)
            device_type = device_str if device_str.startswith('cuda') else 'cpu'
            
            # Store immutable metadata
            self.model_metadata = {
                'name': model_name,
                'version': model_version,
                'sha': model_sha,
                'device': device_type,
            }
            
            logger.info(
                "Model metadata collected",
                extra={
                    'model_name': model_name,
                    'model_version': model_version,
                    'model_sha': model_sha,
                    'device_type': device_type,
                }
            )
            
        except Exception as e:
            logger.error(f"Failed to collect model metadata: {e}", exc_info=True)
            # Fallback metadata to ensure service continues
            self.model_metadata = {
                'name': 'unknown',
                'version': 'unknown',
                'sha': 'unknown',
                'device': device_str if device_str.startswith('cuda') else 'cpu',
            }
    
    def _compute_file_hash(self, file_path: str) -> str:
        """
        Compute SHA256 hash of model file for content-based identification.
        
        This hash uniquely identifies the model file contents, ensuring:
        - Same file always produces same hash
        - Different files produce different hashes
        - Audit trail of exact model version used for each detection
        """
        try:
            sha256_hash = hashlib.sha256()
            with open(file_path, "rb") as f:
                # Read file in chunks for memory efficiency
                for byte_block in iter(lambda: f.read(4096), b""):
                    sha256_hash.update(byte_block)
            return sha256_hash.hexdigest()
        except Exception as e:
            logger.error(f"Failed to compute model file hash: {e}", exc_info=True)
            return "unknown"
    
    def get_model_metadata(self) -> Dict[str, str]:
        """
        Get model metadata for inclusion in detection outputs.
        
        Returns immutable metadata dictionary collected at model load time.
        This ensures all detections from the same model instance have identical metadata.
        
        Returns:
            Dictionary with keys: name, version, sha, device
        """
        if self.model_metadata is None:
            # Fallback if metadata not collected (should not happen)
            logger.warning("Model metadata not available, returning fallback metadata")
            return {
                'name': 'unknown',
                'version': 'unknown',
                'sha': 'unknown',
                'device': self.device_str if self.device_str else 'cpu',
            }
        return self.model_metadata.copy()  # Return copy to ensure immutability
    
    def is_gpu(self) -> bool:
        """Check if model is running on GPU"""
        return self.device_str and self.device_str.startswith('cuda')
    
    def predict(self, images, batch_size: int = 1, **kwargs):
        """
        Run inference on images
        
        Args:
            images: Single image path, list of image paths, or numpy array(s)
            batch_size: Batch size (only used in GPU mode)
            **kwargs: Additional YOLO predict arguments
            
        Returns:
            YOLO results object or list of results
        """
        if self.model is None:
            raise RuntimeError("Model not loaded. Call load() first.")
        
        # Set batch size for GPU mode
        if self.is_gpu() and batch_size > 1:
            kwargs['batch'] = batch_size
        
        # Run inference
        results = self.model.predict(images, device=str(self.device), **kwargs)
        
        return results
