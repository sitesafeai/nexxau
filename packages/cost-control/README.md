# Cost Control Package

Shared package for cost control and graceful degradation across services.

## Features

- **Circuit Breaker**: Prevents resource exhaustion
- **Rate Limiter**: Per-tenant rate limiting (SMS, snapshots, etc.)
- **Cost Control Config**: Centralized configuration for cost rules

## Components

### Circuit Breaker

Prevents cascading failures by stopping requests when thresholds are exceeded.

```python
from cost_control import CircuitBreaker, CircuitBreakerConfig

config = CircuitBreakerConfig(
    failure_threshold=5,
    timeout_seconds=60.0
)
breaker = CircuitBreaker("snapshot-service", config)

# Use circuit breaker
try:
    result = breaker.call(snapshot_service.capture, camera_id)
except CircuitBreakerOpenError:
    # Service is degraded, use fallback
    pass
```

### Rate Limiter

Enforces per-tenant rate limits (e.g., SMS caps).

```python
from cost_control import RateLimiter

# Max 100 SMS per tenant per hour
limiter = RateLimiter(
    max_requests=100,
    window_seconds=3600,
    redis_client=redis_client  # Optional, uses local if None
)

# Check if allowed
is_allowed, remaining = limiter.is_allowed(f"tenant:{tenant_id}:sms")
if not is_allowed:
    # Rate limit exceeded
    pass
```

### Cost Control Config

Centralized configuration for all cost control rules.

```python
from cost_control import CostControlConfig

config = CostControlConfig.from_env()
# Access config.fps_control, config.gpu_saturation, etc.
```

## Usage in Services

See service-specific implementations:
- Camera Ingest Service: FPS reduction under load
- Detection Service: GPU saturation frame dropping
- Alert Orchestrator: SMS per-tenant capping
- Snapshot Service: Storage limit checks

