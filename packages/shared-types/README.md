# @nexxau/shared-types

Shared types for Nexxau microservices (TypeScript and Python).

## TypeScript Usage

```typescript
import { DetectionResult, DetectionType, UserRole } from '@nexxau/shared-types';

const result: DetectionResult = {
  id: 'det-123',
  cameraId: 'cam-456',
  tenantId: 'tenant-789',
  timestamp: new Date(),
  detections: [
    {
      id: 'det-1',
      type: DetectionType.PERSON_WITHOUT_HARDHAT,
      confidence: 0.95,
      bbox: { x: 100, y: 200, width: 50, height: 80 },
    },
  ],
};
```

## Python Usage

```python
from nexxau_shared_types import (
    DetectionResult,
    DetectionType,
    Detection,
    BoundingBox,
    datetime,
)

result = DetectionResult(
    id='det-123',
    camera_id='cam-456',
    tenant_id='tenant-789',
    timestamp=datetime.utcnow(),
    detections=[
        Detection(
            id='det-1',
            type=DetectionType.PERSON_WITHOUT_HARDHAT,
            confidence=0.95,
            bbox=BoundingBox(x=100, y=200, width=50, height=80),
        ),
    ],
)
```

## Installation

### TypeScript
```bash
# In service package.json, use workspace protocol
"dependencies": {
  "@nexxau/shared-types": "workspace:*"
}
```

### Python
```bash
# Install in editable mode during development
cd packages/shared-types/python
pip install -e .

# Or in service requirements.txt
-e ../../packages/shared-types/python
```

## Type Alignment

TypeScript and Python types are kept in sync manually. When adding new types:

1. Add TypeScript type in `src/index.ts`
2. Add corresponding Python type in `python/__init__.py`
3. Ensure field names match (camelCase in TS, snake_case in Python)
4. Update this README if needed
