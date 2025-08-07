# Security Best Practices

## 1. Secrets Management
- **Never commit real secrets or .env files to git.**
- Use `.env.example` templates for sharing config structure.
- In production, use a secrets manager (AWS Secrets Manager, Vault, etc.) or secure environment variables.

## 2. HTTPS & Reverse Proxy
- **Always use HTTPS in production.**
- Use a reverse proxy (Traefik, Nginx, or Caddy) to:
  - Terminate SSL
  - Route traffic to the correct service
  - Add authentication or rate limiting if needed
- Example: Only expose the reverse proxy to the public internet; keep internal services on a private network.

## 3. Public vs. Private Ports
- **Public (exposed to internet):**
  - 80/443 (HTTP/HTTPS via reverse proxy)
  - 3000 (Next.js frontend, for dev only)
- **Private (internal only):**
  - 8000 (backend API)
  - 5000 (YOLO inference)
  - 8888 (MediaMTX HLS)
  - 8554 (MediaMTX RTSP)
  - 8889 (MediaMTX WebRTC/metrics)
- Use Docker Compose networks to restrict access between services.

## 4. Additional Recommendations
- Rotate secrets regularly.
- Use strong, unique passwords for all services.
- Keep dependencies and base images up to date.
- Regularly audit your code and containers for vulnerabilities.
- Restrict SSH and admin access to trusted IPs only.

---

## Next Steps
- Review your repo for any committed secrets and remove them.
- Set up a reverse proxy for production.
- Document which ports are exposed and why.
- Plan for regular security reviews. 