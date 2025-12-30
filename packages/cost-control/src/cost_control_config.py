"""
Cost Control Configuration

Configuration for cost control and graceful degradation rules.
"""
import os
from dataclasses import dataclass
from typing import Optional


@dataclass
class FPSControlConfig:
    """FPS reduction configuration"""
    min_fps: float = 0.5  # Minimum FPS under load
    max_fps: float = 10.0  # Maximum FPS (normal operation)
    reduction_factor: float = 0.5  # Reduce FPS by this factor when load detected
    load_threshold_cpu: float = 0.8  # Reduce FPS if CPU > 80%
    load_threshold_memory: float = 0.8  # Reduce FPS if memory > 80%
    load_threshold_backlog: int = 15  # Reduce FPS if frame backlog > 15


@dataclass
class GPUSaturationConfig:
    """GPU saturation detection configuration"""
    lag_threshold_warning: int = 100  # Warning at 100 entries lag
    lag_threshold_critical: int = 500  # Critical at 500 entries lag
    drop_probability_lag_100: float = 0.1  # Drop 10% of frames at 100 lag
    drop_probability_lag_500: float = 0.5  # Drop 50% of frames at 500 lag
    max_drop_probability: float = 0.9  # Never drop more than 90%


@dataclass
class SMSCapConfig:
    """SMS per-tenant capping configuration"""
    max_sms_per_tenant_per_hour: int = 100  # Max SMS per tenant per hour
    max_sms_per_tenant_per_day: int = 1000  # Max SMS per tenant per day
    warning_threshold_hourly: float = 0.8  # Warn at 80% of hourly limit
    warning_threshold_daily: float = 0.8  # Warn at 80% of daily limit


@dataclass
class SnapshotStorageConfig:
    """Snapshot storage limit configuration"""
    max_storage_bytes: Optional[int] = None  # Max storage in bytes (None = unlimited)
    warning_threshold: float = 0.8  # Warn at 80% of storage limit
    disable_threshold: float = 0.95  # Disable snapshots at 95% of storage limit
    check_interval_seconds: float = 300.0  # Check storage every 5 minutes


@dataclass
class CostControlConfig:
    """Complete cost control configuration"""
    fps_control: FPSControlConfig
    gpu_saturation: GPUSaturationConfig
    sms_cap: SMSCapConfig
    snapshot_storage: SnapshotStorageConfig
    
    @classmethod
    def from_env(cls) -> 'CostControlConfig':
        """Create configuration from environment variables"""
        return cls(
            fps_control=FPSControlConfig(
                min_fps=float(os.getenv('FPS_CONTROL_MIN', '0.5')),
                max_fps=float(os.getenv('FPS_CONTROL_MAX', '10.0')),
                reduction_factor=float(os.getenv('FPS_CONTROL_REDUCTION_FACTOR', '0.5')),
                load_threshold_cpu=float(os.getenv('FPS_CONTROL_CPU_THRESHOLD', '0.8')),
                load_threshold_memory=float(os.getenv('FPS_CONTROL_MEMORY_THRESHOLD', '0.8')),
                load_threshold_backlog=int(os.getenv('FPS_CONTROL_BACKLOG_THRESHOLD', '15'))
            ),
            gpu_saturation=GPUSaturationConfig(
                lag_threshold_warning=int(os.getenv('GPU_SATURATION_LAG_WARNING', '100')),
                lag_threshold_critical=int(os.getenv('GPU_SATURATION_LAG_CRITICAL', '500')),
                drop_probability_lag_100=float(os.getenv('GPU_SATURATION_DROP_PROB_100', '0.1')),
                drop_probability_lag_500=float(os.getenv('GPU_SATURATION_DROP_PROB_500', '0.5')),
                max_drop_probability=float(os.getenv('GPU_SATURATION_MAX_DROP', '0.9'))
            ),
            sms_cap=SMSCapConfig(
                max_sms_per_tenant_per_hour=int(os.getenv('SMS_CAP_HOURLY', '100')),
                max_sms_per_tenant_per_day=int(os.getenv('SMS_CAP_DAILY', '1000')),
                warning_threshold_hourly=float(os.getenv('SMS_CAP_WARNING_HOURLY', '0.8')),
                warning_threshold_daily=float(os.getenv('SMS_CAP_WARNING_DAILY', '0.8'))
            ),
            snapshot_storage=SnapshotStorageConfig(
                max_storage_bytes=int(os.getenv('SNAPSHOT_STORAGE_MAX_BYTES', '0')) or None,
                warning_threshold=float(os.getenv('SNAPSHOT_STORAGE_WARNING', '0.8')),
                disable_threshold=float(os.getenv('SNAPSHOT_STORAGE_DISABLE', '0.95')),
                check_interval_seconds=float(os.getenv('SNAPSHOT_STORAGE_CHECK_INTERVAL', '300.0'))
            )
        )

