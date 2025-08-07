# Nexxau: Camera Streaming & AI Detection Platform

## Overview
This project is a full-stack platform for live camera streaming, AI detection (YOLO), and dashboard management. It uses:
- **Next.js** frontend (app/)
- **FastAPI/Flask** backend (backend/)
- **YOLOv8 Inference Service** (ai-detection/)
- **MediaMTX** for RTSP/HLS streaming
- **Docker Compose** for orchestration

---

## Quick Start (Local Development)

### 1. Clone the Repo
```bash
git clone <your-repo-url>
cd nexxau
```

### 2. Set Up Environment Variables
- Copy `.env.example` to `.env` in each service directory as needed.
- Fill in secrets (DB URL, API keys, etc.).

### 3. Build & Run All Services
```bash
docker-compose up --build
```
- Frontend: [http://localhost:3000](http://localhost:3000)
- Backend API: [http://localhost:8000](http://localhost:8000)
- YOLO Inference: [http://localhost:5000](http://localhost:5000)
- MediaMTX: [http://localhost:8888](http://localhost:8888)

### 4. Seed the Database (if needed)
```bash
docker-compose exec backend npx prisma db seed
```

---

## Service Structure

- `app/` - Next.js frontend (user dashboard, camera feeds)
- `backend/` - FastAPI/Flask backend (API, DB access)
- `ai-detection/` - YOLOv8 inference (Flask or FastAPI)
- `prisma/` - Prisma schema and migrations
- `mediamtx.yml` - MediaMTX config (RTSP/HLS streaming)

---

## Environment Variables
- Each service uses its own `.env` file for secrets/config.
- **Never commit real secrets to git!**
- Example for backend:
  ```env
  DATABASE_URL=file:/app/prisma/dev.db
  JWT_SECRET=your_jwt_secret
  ```

---

## Logs & Troubleshooting
- View logs for all services:
  ```bash
  docker-compose logs -f
  ```
- Restart a service:
  ```bash
  docker-compose restart <service-name>
  ```
- Common issues:
  - Build context too large? Check `.dockerignore` files.
  - Service not starting? Check logs and env vars.

---

## Production Tips
- Use a real database (Postgres, MySQL) in production.
- Add HTTPS/reverse proxy (e.g., Traefik, Nginx).
- Use a secrets manager for sensitive config.
- Add centralized logging/monitoring (Loki, Prometheus, Grafana).
- Restrict public ports and secure endpoints.

---

## Contributing
Pull requests welcome! Please open issues for bugs or feature requests.

---

## License
MIT

