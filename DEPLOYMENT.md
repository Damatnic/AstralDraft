# Astral Draft Production Deployment Guide

This guide provides step-by-step instructions for deploying Astral Draft to production.

## 📋 Prerequisites

### Server Requirements
- **OS**: Ubuntu 20.04+ or CentOS 8+
- **RAM**: Minimum 4GB, Recommended 8GB+
- **CPU**: 2+ cores
- **Storage**: 50GB+ SSD
- **Network**: Static IP address

### Software Requirements
- Docker 20.10+
- Docker Compose 2.0+
- Git
- SSL certificate (Let's Encrypt recommended)

### Domain & DNS
- Domain name (e.g., astraldraft.com)
- DNS A records pointing to your server IP
- Subdomain for staging (staging.astraldraft.com)

## 🚀 Deployment Options

We provide multiple deployment options:

1. **Docker + Netlify** (Recommended for small-medium scale)
2. **Full Docker Stack** (For enterprise deployment)
3. **Cloud Deployment** (AWS, GCP, Azure)

---

## Option 1: Docker + Netlify Deployment

### Step 1: Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installations
docker --version
docker-compose --version
```

### Step 2: Clone Repository

```bash
# Create project directory
sudo mkdir -p /opt/astral-draft
sudo chown $USER:$USER /opt/astral-draft
cd /opt/astral-draft

# Clone repository
git clone https://github.com/yourusername/astral-draft.git .
```

### Step 3: Environment Configuration

```bash
# Copy environment template
cp .env.example .env.prod

# Edit production environment
nano .env.prod
```

**Required Environment Variables:**
```bash
# JWT Configuration
JWT_SECRET=your-super-secure-jwt-secret-key-with-minimum-32-characters

# API Keys
VITE_GEMINI_API_KEY=your_production_gemini_api_key
VITE_ESPN_API_KEY=your_production_espn_api_key
VITE_NFL_API_KEY=your_production_nfl_api_key
VITE_ODDS_API_KEY=your_production_odds_api_key

# Domain Configuration
CORS_ORIGIN=https://astraldraft.com,https://www.astraldraft.com
```

### Step 4: SSL Certificate Setup

```bash
# Make script executable
chmod +x scripts/deployment/setup-ssl.sh

# Generate SSL certificates
sudo ./scripts/deployment/setup-ssl.sh production
```

### Step 5: Deploy Backend Services

```bash
# Make deployment script executable
chmod +x scripts/deployment/deploy.sh

# Run deployment
sudo ./scripts/deployment/deploy.sh deploy
```

### Step 6: Frontend Deployment (Netlify)

1. **Build locally:**
   ```bash
   npm ci
   npm run build:prod
   ```

2. **Deploy to Netlify:**
   ```bash
   # Install Netlify CLI
   npm install -g netlify-cli

   # Login to Netlify
   netlify login

   # Deploy
   netlify deploy --prod --dir=dist
   ```

3. **Configure Netlify:**
   - Set environment variables in Netlify dashboard
   - Configure custom domain
   - Enable HTTPS

---

## Option 2: Full Docker Stack Deployment

### Step 1-3: Same as Option 1

### Step 4: Deploy Full Stack

```bash
# Deploy all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

### Step 5: Configure Nginx & SSL

```bash
# Setup SSL certificates
sudo ./scripts/deployment/setup-ssl.sh production

# Restart nginx to load certificates
docker-compose restart nginx
```

---

## 🔧 Configuration

### GitHub Actions Secrets

Add these secrets to your GitHub repository:

```bash
# Production Server
PRODUCTION_HOST=your.server.ip
PRODUCTION_USER=deploy
PRODUCTION_SSH_KEY=-----BEGIN RSA PRIVATE KEY-----...

# API Keys
VITE_GEMINI_API_KEY=your_key
VITE_ESPN_API_KEY=your_key
VITE_NFL_API_KEY=your_key
VITE_ODDS_API_KEY=your_key

# Netlify (if using Option 1)
NETLIFY_AUTH_TOKEN=your_netlify_token
NETLIFY_SITE_ID=your_site_id

# Notifications
SLACK_WEBHOOK_URL=your_slack_webhook
```

### Database Configuration

```bash
# Initialize database
docker-compose exec backend npm run db:migrate

# Seed initial data
docker-compose exec backend npm run db:seed
```

---

## 🔍 Monitoring & Health Checks

### Health Check Endpoints

- **Backend**: `https://astraldraft.com/api/health`
- **WebSocket**: `wss://astraldraft.com/ws/health`
- **Frontend**: `https://astraldraft.com/health`

### Monitoring Commands

```bash
# Check service status
docker-compose ps

# View logs
docker-compose logs -f [service_name]

# Check resource usage
docker stats

# Database backup
docker-compose exec db-backup /usr/local/bin/backup.sh
```

---

## 🛠 Maintenance

### Regular Tasks

```bash
# Update deployment
sudo ./scripts/deployment/deploy.sh deploy

# Backup database
docker-compose exec db-backup sqlite3 /data/astral-draft.db '.backup /backups/manual-backup.db'

# Clean up old Docker images
docker system prune -f

# Check SSL certificate status
sudo certbot certificates
```

### Rollback Procedure

```bash
# Rollback to previous version
sudo ./scripts/deployment/deploy.sh rollback

# Or manual rollback
docker-compose down
docker-compose pull
docker-compose up -d
```

---

## 🚨 Troubleshooting

### Common Issues

**1. Port Already in Use**
```bash
# Check what's using the port
sudo netstat -tulpn | grep :80
sudo netstat -tulpn | grep :443

# Kill process if needed
sudo kill -9 [PID]
```

**2. SSL Certificate Issues**
```bash
# Renew certificate manually
sudo certbot renew

# Test nginx configuration
docker-compose exec nginx nginx -t
```

**3. Database Connection Issues**
```bash
# Check database file permissions
ls -la /opt/astral-draft/data/

# Reset database (DANGER: Data loss)
rm /opt/astral-draft/data/astral-draft.db
docker-compose restart backend
```

**4. Memory Issues**
```bash
# Check memory usage
free -h

# Restart services
docker-compose restart
```

### Log Locations

- **Application Logs**: `/opt/astral-draft/logs/`
- **Nginx Logs**: `/var/log/nginx/`
- **Docker Logs**: `docker-compose logs [service]`
- **System Logs**: `/var/log/syslog`

---

## 📊 Performance Optimization

### Production Optimizations

1. **Enable Gzip Compression**
   - Already configured in nginx.conf

2. **CDN Setup**
   ```bash
   # Configure CloudFlare or similar CDN
   # Point DNS to CDN
   # Enable caching rules
   ```

3. **Database Optimization**
   ```sql
   -- Add indexes for common queries
   CREATE INDEX idx_player_position ON nfl_players(position);
   CREATE INDEX idx_league_created ON leagues(created_at);
   ```

4. **Memory Optimization**
   ```bash
   # Adjust Docker memory limits
   # Edit docker-compose.yml
   deploy:
     resources:
       limits:
         memory: 1G
   ```

---

## 🔐 Security Checklist

- [ ] SSL certificates installed and auto-renewing
- [ ] Firewall configured (ports 80, 443, 22 only)
- [ ] Strong JWT secrets configured
- [ ] Database file permissions secured
- [ ] API keys stored as secrets
- [ ] Rate limiting enabled
- [ ] CORS configured properly
- [ ] Security headers enabled
- [ ] Regular security updates scheduled

---

## 📞 Support

### Emergency Procedures

1. **Site Down**: Run health checks, check logs, restart services
2. **Database Corruption**: Restore from latest backup
3. **SSL Expired**: Renew certificate manually
4. **High Load**: Scale services, check for DDoS

### Contact Information

- **Primary**: admin@astraldraft.com
- **Emergency**: +1-555-ASTRAL-1
- **Status Page**: https://status.astraldraft.com

---

## 🎉 Deployment Complete!

Once deployed, your Astral Draft platform will be available at:

- **Production**: https://astraldraft.com
- **API**: https://astraldraft.com/api
- **WebSocket**: wss://astraldraft.com/ws
- **Health Check**: https://astraldraft.com/health

**Next Steps:**
1. Test all functionality
2. Set up monitoring alerts
3. Configure backup schedule
4. Document custom configurations
5. Train your team on maintenance procedures

Your production-grade fantasy football platform is now live! 🏈🚀
