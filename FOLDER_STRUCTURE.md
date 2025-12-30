# Nexxau Monorepo - Folder Structure

```
nexxau/
│
├── services/                          # Microservices
│   ├── api-gateway/                  # API Gateway (Node.js)
│   │   ├── src/
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── auth-service/                 # Authentication & Authorization (Node.js)
│   │   ├── src/
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── camera-service/               # Camera Management (Node.js)
│   │   ├── src/
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── detection-service/            # ML Detection Worker (Python)
│   │   ├── main.py
│   │   ├── requirements.txt
│   │   └── Dockerfile
│   │
│   ├── notification-service/         # Alerts & Notifications (Node.js)
│   │   ├── src/
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── _template-nodejs/             # Node.js service template
│   │   ├── src/
│   │   │   └── index.ts
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── README.md
│   │
│   └── _template-python/             # Python service template
│       ├── main.py
│       ├── requirements.txt
│       ├── Dockerfile
│       └── README.md
│
├── packages/                          # Shared packages
│   ├── shared-types/                 # TypeScript & Python types
│   │   ├── src/
│   │   │   └── index.ts             # TypeScript types
│   │   ├── python/
│   │   │   ├── __init__.py          # Python types
│   │   │   └── pyproject.toml
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── README.md
│   │
│   ├── logger/                       # JSON logger (Node.js)
│   │   ├── src/
│   │   │   └── index.ts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── README.md
│   │
│   ├── errors/                       # Error handling (Node.js)
│   │   ├── src/
│   │   │   └── index.ts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── README.md
│   │
│   └── config/                       # Configuration management (Node.js)
│       ├── src/
│       │   └── index.ts
│       ├── package.json
│       ├── tsconfig.json
│       └── README.md
│
├── infrastructure/                    # Infrastructure as code
│   ├── docker/                       # Docker templates
│   │   ├── Dockerfile.nodejs.base
│   │   ├── Dockerfile.python.base
│   │   └── .dockerignore
│   │
│   ├── k8s/                          # Kubernetes manifests
│   │   ├── namespace.yaml
│   │   ├── configmap.yaml
│   │   ├── secrets.yaml
│   │   └── [service]-deployment.yaml
│   │
│   └── scripts/                      # Deployment scripts
│       ├── build.sh
│       ├── deploy.sh
│       └── test.sh
│
├── docker-compose.yml                # Local development orchestration
├── package.json                      # Root workspace configuration
├── pnpm-workspace.yaml               # pnpm workspace config (if using pnpm)
├── .npmrc                            # npm workspace config
├── .gitignore                        # Git ignore rules
│
└── MONOREPO_README.md                # This documentation

```

## Service Structure Details

### Node.js Service Structure
```
service-name/
├── src/
│   ├── index.ts                     # Entry point
│   ├── routes/                      # API routes
│   ├── controllers/                 # Request handlers
│   ├── services/                    # Business logic
│   ├── models/                      # Data models
│   ├── middleware/                  # Express middleware
│   └── utils/                       # Utility functions
├── tests/                           # Test files
├── Dockerfile
├── package.json
├── tsconfig.json
└── README.md
```

### Python Service Structure
```
service-name/
├── main.py                          # Entry point
├── app/
│   ├── __init__.py
│   ├── routes.py                    # API routes
│   ├── services.py                  # Business logic
│   ├── models.py                    # Data models
│   └── utils.py                     # Utility functions
├── tests/                           # Test files
├── requirements.txt
├── Dockerfile
└── README.md
```

## Package Structure

All shared packages follow this structure:
```
package-name/
├── src/                             # Source code
│   └── index.ts                     # Main export
├── dist/                            # Compiled output (generated)
├── package.json
├── tsconfig.json
└── README.md                        # Package documentation
```
