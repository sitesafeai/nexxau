# Quick Start - Nexxau Monorepo

## Initial Setup

### 1. Install Dependencies

```bash
# Install root dependencies
npm install

# Install dependencies for all workspaces
npm install --workspaces
```

### 2. Build Shared Packages

```bash
# Build all packages
npm run build:packages

# Or build individually
cd packages/logger && npm install && npm run build
cd packages/errors && npm install && npm run build
cd packages/config && npm install && npm run build
cd packages/shared-types && npm install && npm run build
```

### 3. Create a New Service

#### Node.js Service

```bash
# Copy template
cp -r services/_template-nodejs services/my-new-service

# Navigate to service
cd services/my-new-service

# Update package.json name to @nexxau/my-new-service

# Install dependencies
npm install

# Copy env.example to .env and configure
cp env.example .env

# Start development server
npm run dev
```

#### Python Service

```bash
# Copy template
cp -r services/_template-python services/my-new-service

# Navigate to service
cd services/my-new-service

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install shared types (if needed)
pip install -e ../../packages/shared-types/python

# Install dependencies
pip install -r requirements.txt

# Copy env.example to .env and configure
cp env.example .env

# Run service
python main.py
```

### 4. Docker Development

```bash
# Build all services
docker-compose build

# Start all services
docker-compose up

# Start specific service
docker-compose up auth-service
```

## Service Development

### Using Shared Packages

#### In Node.js Services

```typescript
// In package.json
{
  "dependencies": {
    "@nexxau/logger": "workspace:*",
    "@nexxau/errors": "workspace:*",
    "@nexxau/config": "workspace:*",
    "@nexxau/shared-types": "workspace:*"
  }
}
```

```typescript
// In your code
import { createLogger } from '@nexxau/logger';
import { NotFoundError } from '@nexxau/errors';
import { Config } from '@nexxau/config';
import { DetectionResult } from '@nexxau/shared-types';
```

#### In Python Services

```bash
# In requirements.txt
-e ../../packages/shared-types/python
```

```python
# In your code
from nexxau_shared_types import DetectionResult, DetectionType
```

## Environment Variables

Each service needs its own `.env` file. Copy from `env.example`:

```bash
cd services/auth-service
cp env.example .env
# Edit .env with your configuration
```

## Testing

```bash
# Run tests for all services
npm test

# Run tests for specific service
cd services/auth-service
npm test
```

## Building for Production

```bash
# Build all services
npm run build

# Build Docker images
docker-compose build

# Or build individual service
cd services/auth-service
docker build -t auth-service .
```

## Next Steps

1. Read [MONOREPO_README.md](./MONOREPO_README.md) for detailed conventions
2. Review [FOLDER_STRUCTURE.md](./FOLDER_STRUCTURE.md) for structure details
3. Check service templates in `services/_template-*`
4. Review shared packages documentation in `packages/*/README.md`
