# 🚀 Nexxau Production Setup Guide

This guide will help you deploy the Nexxau AI Detection system to production.

## 📋 Prerequisites

- Docker and Docker Compose installed
- Domain name configured
- SSL certificate (Let's Encrypt recommended)
- PostgreSQL database (Supabase recommended)
- Twilio account for SMS notifications

## 🔧 Environment Configuration

Create a `.env.production` file with the following variables:

**🔐 Database Configuration:**
```
DATABASE_URL=postgresql://username:password@your-db-host:5432/nexxau_production
```

**📱 SMS Configuration (You already have Twilio):**
```
TWILIO_ACCOUNT_SID=your_twilio_account_sid_here
TWILIO_AUTH_TOKEN=your_twilio_auth_token_here
TWILIO_PHONE_NUMBER=your_twilio_phone_number_here
```

## 🗄️ Database Setup

### Option 1: Cloud PostgreSQL (Recommended)

1. **Supabase Setup:**
   - Create a new project at [supabase.com](https://supabase.com)
   - Get your database URL from Settings > Database
   - Update `DATABASE_URL` in your environment

2. **Run Migrations:**
   ```bash
   cd app
   npx prisma migrate deploy
   npx prisma generate
   ```

### Option 2: Self-Hosted PostgreSQL

1. **Install PostgreSQL:**
   ```bash
   # Ubuntu/Debian
   sudo apt update
   sudo apt install postgresql postgresql-contrib
   
   # macOS
   brew install postgresql
   brew services start postgresql
   ```

2. **Create Database:**
   ```sql
   CREATE DATABASE nexxau_production;
   CREATE USER nexxau_user WITH PASSWORD 'your_secure_password';
   GRANT ALL PRIVILEGES ON DATABASE nexxau_production TO nexxau_user;
   ```

## 🐳 Docker Deployment

1. **Build and Deploy:**
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

2. **Verify Services:**
   ```bash
   docker-compose ps
   docker-compose logs -f
   ```

## 🌐 Domain & SSL Setup

1. **Configure DNS:**
   - Point your domain to your server's IP address
   - Add A record: `@` → `your-server-ip`
   - Add CNAME record: `www` → `your-domain.com`

2. **SSL Certificate:**
   ```bash
   # Using Let's Encrypt with Certbot
   sudo certbot --nginx -d your-domain.com -d www.your-domain.com
   ```

## 📊 Monitoring & Maintenance

1. **Health Checks:**
   - Application: `https://your-domain.com/api/health`
   - Database: Check connection status
   - MediaMTX: `http://your-domain.com:8888`

2. **Logs:**
   ```bash
   # Application logs
   docker-compose logs -f app
   
   # Database logs
   docker-compose logs -f db
   
   # MediaMTX logs
   docker-compose logs -f mediamtx
   ```

3. **Backups:**
   ```bash
   # Database backup
   pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql
   
   # Media files backup
   tar -czf media_backup_$(date +%Y%m%d).tar.gz ./media/
   ```

## 🔒 Security Checklist

- [ ] Environment variables secured
- [ ] Database credentials rotated
- [ ] SSL certificate valid
- [ ] Firewall configured (ports 80, 443, 22)
- [ ] Regular security updates
- [ ] Monitoring alerts configured

## 🚨 Troubleshooting

### Common Issues:

1. **Database Connection Failed:**
   - Check `DATABASE_URL` format
   - Verify database server is running
   - Check firewall rules

2. **SSL Certificate Issues:**
   - Verify domain DNS settings
   - Check certificate expiration
   - Restart nginx after certificate renewal

3. **MediaMTX Not Working:**
   - Check port 8888 is open
   - Verify configuration file
   - Check Docker container logs

### Support:

- Check logs: `docker-compose logs -f [service-name]`
- Restart services: `docker-compose restart [service-name]`
- Full restart: `docker-compose down && docker-compose up -d`

## 📈 Performance Optimization

1. **Database:**
   - Enable connection pooling
   - Add appropriate indexes
   - Regular VACUUM and ANALYZE

2. **Application:**
   - Enable gzip compression
   - Configure CDN for static assets
   - Monitor memory usage

3. **MediaMTX:**
   - Adjust buffer sizes
   - Configure appropriate bitrates
   - Monitor CPU usage

---

**🎉 Congratulations!** Your Nexxau AI Detection system is now running in production!

For additional support, check the logs and refer to the troubleshooting section above.