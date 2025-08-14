#!/bin/bash

# Astral Draft Production Deployment Script
# This script handles the complete deployment process for production

set -e

echo "🚀 Starting Astral Draft production deployment..."

# Configuration
PROJECT_DIR="/opt/astral-draft"
BACKUP_DIR="/opt/astral-draft/backups"
LOG_FILE="/opt/astral-draft/logs/deployment.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a $LOG_FILE
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1" | tee -a $LOG_FILE
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1" | tee -a $LOG_FILE
    exit 1
}

# Pre-deployment checks
pre_deployment_checks() {
    log "Running pre-deployment checks..."
    
    # Check if Docker is running
    if ! docker --version > /dev/null 2>&1; then
        error "Docker is not installed or not running"
    fi
    
    if ! docker-compose --version > /dev/null 2>&1; then
        error "Docker Compose is not installed"
    fi
    
    # Check disk space (require at least 5GB free)
    AVAILABLE_SPACE=$(df / | awk 'NR==2 {print $4}')
    REQUIRED_SPACE=5242880 # 5GB in KB
    
    if [ $AVAILABLE_SPACE -lt $REQUIRED_SPACE ]; then
        error "Insufficient disk space. Required: 5GB, Available: $(($AVAILABLE_SPACE/1024/1024))GB"
    fi
    
    # Check if ports are available
    if netstat -tuln | grep -q ":80 "; then
        warn "Port 80 is already in use"
    fi
    
    if netstat -tuln | grep -q ":443 "; then
        warn "Port 443 is already in use"
    fi
    
    log "Pre-deployment checks passed ✅"
}

# Backup current deployment
backup_current_deployment() {
    log "Creating backup of current deployment..."
    
    if [ -d "$PROJECT_DIR" ]; then
        BACKUP_NAME="astral-draft-backup-$(date +%Y%m%d-%H%M%S)"
        mkdir -p "$BACKUP_DIR"
        
        # Backup database
        if [ -f "$PROJECT_DIR/data/astral-draft.db" ]; then
            cp "$PROJECT_DIR/data/astral-draft.db" "$BACKUP_DIR/$BACKUP_NAME.db"
            log "Database backed up to $BACKUP_DIR/$BACKUP_NAME.db"
        fi
        
        # Backup configuration
        if [ -f "$PROJECT_DIR/.env" ]; then
            cp "$PROJECT_DIR/.env" "$BACKUP_DIR/$BACKUP_NAME.env"
            log "Environment configuration backed up"
        fi
        
        # Clean old backups (keep last 7 days)
        find "$BACKUP_DIR" -name "*.db" -mtime +7 -delete
        find "$BACKUP_DIR" -name "*.env" -mtime +7 -delete
    fi
    
    log "Backup completed ✅"
}

# Pull latest code and images
update_deployment() {
    log "Updating deployment..."
    
    cd "$PROJECT_DIR"
    
    # Pull latest images
    docker-compose pull
    
    # Stop services gracefully
    log "Stopping current services..."
    docker-compose down --timeout 30
    
    # Remove unused images and containers
    docker system prune -f --volumes
    
    log "Update completed ✅"
}

# Deploy services
deploy_services() {
    log "Deploying services..."
    
    cd "$PROJECT_DIR"
    
    # Start services
    docker-compose up -d --remove-orphans
    
    # Wait for services to be ready
    log "Waiting for services to start..."
    sleep 30
    
    log "Services deployed ✅"
}

# Health checks
health_checks() {
    log "Running health checks..."
    
    # Check backend health
    for i in {1..10}; do
        if curl -f http://localhost:3001/health > /dev/null 2>&1; then
            log "Backend health check passed ✅"
            break
        fi
        
        if [ $i -eq 10 ]; then
            error "Backend health check failed after 10 attempts"
        fi
        
        log "Backend not ready, waiting 10 seconds... (attempt $i/10)"
        sleep 10
    done
    
    # Check frontend
    for i in {1..5}; do
        if curl -f http://localhost:80 > /dev/null 2>&1; then
            log "Frontend health check passed ✅"
            break
        fi
        
        if [ $i -eq 5 ]; then
            error "Frontend health check failed after 5 attempts"
        fi
        
        log "Frontend not ready, waiting 10 seconds... (attempt $i/5)"
        sleep 10
    done
    
    # Check WebSocket
    if ss -tuln | grep -q ":3002 "; then
        log "WebSocket service is running ✅"
    else
        warn "WebSocket service might not be running properly"
    fi
    
    log "Health checks completed ✅"
}

# Post-deployment tasks
post_deployment_tasks() {
    log "Running post-deployment tasks..."
    
    # Update nginx configuration if needed
    if docker-compose exec nginx nginx -t; then
        log "Nginx configuration is valid ✅"
    else
        error "Nginx configuration is invalid"
    fi
    
    # Restart nginx to pick up any config changes
    docker-compose restart nginx
    
    # Clean up old Docker images
    docker image prune -f
    
    log "Post-deployment tasks completed ✅"
}

# Main deployment function
main() {
    log "🚀 Starting Astral Draft production deployment..."
    
    # Create necessary directories
    mkdir -p "$PROJECT_DIR/logs"
    mkdir -p "$PROJECT_DIR/data"
    mkdir -p "$BACKUP_DIR"
    
    # Run deployment steps
    pre_deployment_checks
    backup_current_deployment
    update_deployment
    deploy_services
    health_checks
    post_deployment_tasks
    
    log "🎉 Deployment completed successfully!"
    log "🌐 Astral Draft is now live at https://astraldraft.com"
    
    # Display service status
    echo ""
    log "Service Status:"
    docker-compose ps
}

# Rollback function
rollback() {
    log "🔄 Rolling back deployment..."
    
    # Find latest backup
    LATEST_BACKUP=$(ls -t "$BACKUP_DIR"/*.db 2>/dev/null | head -n1)
    
    if [ -n "$LATEST_BACKUP" ]; then
        # Stop services
        docker-compose down
        
        # Restore database
        cp "$LATEST_BACKUP" "$PROJECT_DIR/data/astral-draft.db"
        log "Database restored from backup"
        
        # Start services with previous version
        docker-compose up -d
        
        log "Rollback completed ✅"
    else
        error "No backup found for rollback"
    fi
}

# Handle script arguments
case "${1:-deploy}" in
    "deploy")
        main
        ;;
    "rollback")
        rollback
        ;;
    "health")
        health_checks
        ;;
    *)
        echo "Usage: $0 [deploy|rollback|health]"
        echo "  deploy  - Run full deployment (default)"
        echo "  rollback - Rollback to previous version"
        echo "  health  - Run health checks only"
        exit 1
        ;;
esac
