# Oracle System - Deployment Guide

## 🚀 Production Deployment

This guide covers deploying the Oracle Prediction System to a production environment with optimal performance and security.

## Prerequisites

### System Requirements

**Minimum Hardware:**
- CPU: 2 cores, 2.4GHz
- RAM: 4GB
- Storage: 50GB SSD
- Network: 100Mbps bandwidth

**Recommended Hardware:**
- CPU: 4+ cores, 3.0GHz
- RAM: 8GB+
- Storage: 100GB+ SSD
- Network: 1Gbps bandwidth

**Software Requirements:**
- Node.js 18.17.0 or higher
- npm 9.0.0 or higher
- SQLite 3.40.0 or higher
- PM2 process manager (recommended)

### Environment Setup

**1. Create Production Environment File**

```bash
# Create .env.production
NODE_ENV=production
PORT=3001
JWT_SECRET=your-super-secure-jwt-secret-key-here
DB_PATH=./data/astral-draft.db

# Performance Settings
CACHE_TTL_PREDICTIONS=900
CACHE_TTL_ANALYTICS=1800
CACHE_TTL_USERS=600
CACHE_TTL_QUERIES=300

# Rate Limiting
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX=100
RATE_LIMIT_ANALYTICS=30
RATE_LIMIT_ADMIN=10

# Database Settings
DB_CONNECTION_TIMEOUT=30000
DB_QUERY_TIMEOUT=10000
DB_MAX_CONNECTIONS=10

# Security Settings
CORS_ORIGIN=https://your-domain.com
HELMET_ENABLED=true
COMPRESSION_ENABLED=true

# Monitoring
LOG_LEVEL=info
METRICS_ENABLED=true
PERFORMANCE_MONITORING=true
```

**2. Security Configuration**

```bash
# Generate secure JWT secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Set file permissions
chmod 600 .env.production
chmod 755 backend/
chmod 644 package.json
```

## Database Setup

### 1. Database Initialization

```bash
# Create database directory
mkdir -p data
chmod 755 data

# Initialize database with production schema
npm run db:init:production
```

### 2. Create Optimized Indexes

```bash
# Run database optimization
curl -X POST http://localhost:3001/api/oracle/performance/optimize \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### 3. Database Backup Strategy

```bash
# Create backup script
cat > scripts/backup-db.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/oracle"
DB_PATH="./data/astral-draft.db"

mkdir -p $BACKUP_DIR
sqlite3 $DB_PATH ".backup $BACKUP_DIR/oracle_backup_$DATE.db"
gzip $BACKUP_DIR/oracle_backup_$DATE.db

# Keep only last 30 days of backups
find $BACKUP_DIR -name "oracle_backup_*.db.gz" -mtime +30 -delete
EOF

chmod +x scripts/backup-db.sh

# Schedule daily backups with cron
echo "0 2 * * * /path/to/scripts/backup-db.sh" | crontab -
```

## Application Deployment

### 1. Build for Production

```bash
# Install dependencies
npm ci --only=production

# Build TypeScript
npm run build

# Run tests
npm test

# Type check
npx tsc --noEmit
```

### 2. PM2 Process Management

**Install PM2:**
```bash
npm install -g pm2
```

**Create PM2 Ecosystem File:**
```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'oracle-api',
    script: 'backend/server.ts',
    interpreter: 'npx',
    interpreter_args: 'tsx',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'development'
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024'
  }]
};
```

**Start Application:**
```bash
# Create logs directory
mkdir -p logs

# Start with PM2
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save

# Setup PM2 startup script
pm2 startup
```

### 3. Health Monitoring

**Create Health Check Script:**
```bash
# scripts/health-check.sh
#!/bin/bash
HEALTH_URL="http://localhost:3001/api/oracle/health"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" $HEALTH_URL)

if [ $RESPONSE -eq 200 ]; then
    echo "Oracle API is healthy"
    exit 0
else
    echo "Oracle API is unhealthy (HTTP $RESPONSE)"
    # Restart service if unhealthy
    pm2 restart oracle-api
    exit 1
fi
```

**Schedule Health Checks:**
```bash
# Add to crontab
echo "*/5 * * * * /path/to/scripts/health-check.sh" | crontab -
```

## Reverse Proxy Setup (Nginx)

### 1. Install and Configure Nginx

```nginx
# /etc/nginx/sites-available/oracle-api
server {
    listen 80;
    server_name your-domain.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    # SSL Configuration
    ssl_certificate /path/to/ssl/certificate.pem;
    ssl_certificate_key /path/to/ssl/private.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
    
    # Security Headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";
    
    # Compression
    gzip on;
    gzip_types text/plain application/json application/javascript text/css;
    
    # Rate Limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    
    location /api/oracle {
        limit_req zone=api burst=20 nodelay;
        
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # WebSocket support for real-time updates
    location /ws {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

**Enable Site:**
```bash
sudo ln -s /etc/nginx/sites-available/oracle-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Performance Optimization

### 1. Database Optimization

```bash
# Run optimization daily
cat > scripts/optimize-db.sh << 'EOF'
#!/bin/bash
curl -X POST http://localhost:3001/api/oracle/performance/optimize \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json"
EOF

# Schedule daily optimization
echo "0 3 * * * /path/to/scripts/optimize-db.sh" | crontab -
```

### 2. Cache Warming

```bash
# Warm up cache on startup
cat > scripts/warm-cache.sh << 'EOF'
#!/bin/bash
# Wait for service to start
sleep 30

# Warm up critical endpoints
curl -s "http://localhost:3001/api/oracle/predictions/production?week=1&season=2024" > /dev/null
curl -s "http://localhost:3001/api/oracle/analytics/performance?season=2024" > /dev/null
curl -s "http://localhost:3001/api/oracle/leaderboard?season=2024&limit=50" > /dev/null

echo "Cache warming completed"
EOF

# Add to PM2 startup
pm2 startup
```

### 3. Log Rotation

```bash
# Configure logrotate
cat > /etc/logrotate.d/oracle-api << 'EOF'
/path/to/oracle/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    notifempty
    create 0644 node node
    postrotate
        pm2 reloadLogs
    endscript
}
EOF
```

## Monitoring & Alerting

### 1. Performance Monitoring

```bash
# Install monitoring tools
npm install -g pm2-logrotate
pm2 install pm2-server-monit

# Monitor system resources
pm2 monit
```

### 2. Custom Monitoring Script

```bash
# scripts/monitor-performance.sh
#!/bin/bash
API_URL="http://localhost:3001/api/oracle/performance/monitoring"
LOG_FILE="/var/log/oracle-performance.log"

RESPONSE=$(curl -s -H "Authorization: Bearer $ADMIN_TOKEN" $API_URL)
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

echo "[$TIMESTAMP] $RESPONSE" >> $LOG_FILE

# Check for performance issues
MEMORY_USAGE=$(echo $RESPONSE | jq '.data.monitoring.memoryUsage.heapUsed')
if [ $MEMORY_USAGE -gt 500000000 ]; then  # 500MB
    echo "High memory usage detected: $MEMORY_USAGE bytes"
    # Send alert (email, Slack, etc.)
fi
```

### 3. Uptime Monitoring

```bash
# External uptime monitoring
curl -X POST "https://api.uptimerobot.com/v2/newMonitor" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "api_key=YOUR_API_KEY&format=json&type=1&url=https://your-domain.com/api/oracle/health&friendly_name=Oracle API"
```

## Security Configuration

### 1. Firewall Setup

```bash
# Configure UFW firewall
sudo ufw enable
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw deny 3001  # Block direct access to API port
```

### 2. SSL/TLS Configuration

```bash
# Install Certbot for Let's Encrypt
sudo apt install certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d your-domain.com

# Auto-renew certificates
echo "0 12 * * * /usr/bin/certbot renew --quiet" | sudo crontab -
```

### 3. Security Headers

Already configured in Nginx, but also ensure in application:

```javascript
// backend/middleware/security.ts
import helmet from 'helmet';
import cors from 'cors';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"]
    }
  }
}));

app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
  credentials: true
}));
```

## Backup & Recovery

### 1. Automated Backups

```bash
# Enhanced backup script
cat > scripts/backup-system.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/var/backups/oracle"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR/{database,logs,config}

# Backup database
sqlite3 ./data/astral-draft.db ".backup $BACKUP_DIR/database/oracle_$DATE.db"

# Backup logs
cp -r logs/* $BACKUP_DIR/logs/ 2>/dev/null || true

# Backup configuration
cp .env.production $BACKUP_DIR/config/env_$DATE
cp ecosystem.config.js $BACKUP_DIR/config/ecosystem_$DATE.js

# Compress backups
tar -czf $BACKUP_DIR/oracle_backup_$DATE.tar.gz -C $BACKUP_DIR database logs config
rm -rf $BACKUP_DIR/{database,logs,config}

# Upload to remote storage (optional)
# aws s3 cp $BACKUP_DIR/oracle_backup_$DATE.tar.gz s3://your-backup-bucket/

echo "Backup completed: oracle_backup_$DATE.tar.gz"
EOF
```

### 2. Recovery Procedures

```bash
# Recovery script
cat > scripts/restore-backup.sh << 'EOF'
#!/bin/bash
BACKUP_FILE=$1
TEMP_DIR="/tmp/oracle_restore"

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: $0 <backup_file.tar.gz>"
    exit 1
fi

# Stop service
pm2 stop oracle-api

# Extract backup
mkdir -p $TEMP_DIR
tar -xzf $BACKUP_FILE -C $TEMP_DIR

# Restore database
cp $TEMP_DIR/database/*.db ./data/astral-draft.db

# Restore configuration
cp $TEMP_DIR/config/env_* .env.production

# Start service
pm2 start oracle-api

echo "Restoration completed"
EOF
```

## Deployment Checklist

### Pre-Deployment

- [ ] Environment variables configured
- [ ] SSL certificates installed
- [ ] Database optimized and backed up
- [ ] Firewall rules configured
- [ ] Monitoring scripts in place

### Deployment

- [ ] Application built and tested
- [ ] PM2 configuration ready
- [ ] Nginx configuration updated
- [ ] Health checks passing
- [ ] Performance monitoring active

### Post-Deployment

- [ ] Service startup verified
- [ ] API endpoints tested
- [ ] Cache warming completed
- [ ] Backup system verified
- [ ] Monitoring alerts configured

## Troubleshooting

### Common Issues

**Service Won't Start:**
```bash
# Check logs
pm2 logs oracle-api

# Verify configuration
pm2 describe oracle-api

# Check port availability
netstat -tlnp | grep 3001
```

**High Memory Usage:**
```bash
# Monitor memory
pm2 monit

# Restart if needed
pm2 restart oracle-api

# Check for memory leaks
node --inspect backend/server.ts
```

**Database Issues:**
```bash
# Check database integrity
sqlite3 data/astral-draft.db "PRAGMA integrity_check;"

# Optimize database
sqlite3 data/astral-draft.db "VACUUM; ANALYZE;"
```

**Performance Issues:**
```bash
# Check system resources
htop
iotop
df -h

# Monitor API performance
curl -w "@curl-format.txt" http://localhost:3001/api/oracle/health
```

### Support Contacts

- **System Administrator**: admin@your-domain.com
- **Technical Support**: support@your-domain.com
- **Emergency Contact**: +1-555-ORACLE

---

## Conclusion

This deployment guide provides a comprehensive setup for production Oracle System deployment with:

✅ **High Performance**: Optimized database and caching
✅ **Security**: SSL, firewall, and security headers  
✅ **Monitoring**: Health checks and performance monitoring
✅ **Reliability**: Backup/recovery and process management
✅ **Scalability**: Cluster mode and load balancing ready

Follow this guide for a robust, production-ready Oracle Prediction System deployment.

---

*Last Updated: August 11, 2025*
*Deployment Guide Version: 1.0.0*
*Production Ready* ✅
