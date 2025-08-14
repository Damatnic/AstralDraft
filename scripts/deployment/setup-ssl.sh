#!/bin/bash

# SSL Certificate Setup Script for Astral Draft
# This script sets up SSL certificates using Let's Encrypt

set -e

# Configuration
DOMAIN="astraldraft.com"
EMAIL="admin@astraldraft.com"
WEBROOT="/var/www/html"
CERT_DIR="/etc/nginx/ssl"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"
    exit 1
}

# Install certbot if not present
install_certbot() {
    if ! command -v certbot &> /dev/null; then
        log "Installing certbot..."
        
        if command -v apt-get &> /dev/null; then
            # Ubuntu/Debian
            apt-get update
            apt-get install -y certbot python3-certbot-nginx
        elif command -v yum &> /dev/null; then
            # CentOS/RHEL
            yum install -y certbot python3-certbot-nginx
        else
            error "Unsupported package manager. Please install certbot manually."
        fi
        
        log "Certbot installed successfully ✅"
    else
        log "Certbot is already installed ✅"
    fi
}

# Generate SSL certificate
generate_certificate() {
    log "Generating SSL certificate for $DOMAIN..."
    
    # Stop nginx temporarily if running
    if systemctl is-active --quiet nginx; then
        systemctl stop nginx
        NGINX_WAS_RUNNING=true
    fi
    
    # Generate certificate
    certbot certonly \
        --standalone \
        --email "$EMAIL" \
        --agree-tos \
        --no-eff-email \
        --domains "$DOMAIN,www.$DOMAIN" \
        --non-interactive
    
    if [ $? -eq 0 ]; then
        log "SSL certificate generated successfully ✅"
    else
        error "Failed to generate SSL certificate"
    fi
    
    # Restart nginx if it was running
    if [ "$NGINX_WAS_RUNNING" = true ]; then
        systemctl start nginx
    fi
}

# Copy certificates to nginx directory
setup_nginx_ssl() {
    log "Setting up SSL certificates for nginx..."
    
    # Create SSL directory
    mkdir -p "$CERT_DIR"
    
    # Copy certificates
    cp "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" "$CERT_DIR/cert.pem"
    cp "/etc/letsencrypt/live/$DOMAIN/privkey.pem" "$CERT_DIR/key.pem"
    
    # Set proper permissions
    chmod 644 "$CERT_DIR/cert.pem"
    chmod 600 "$CERT_DIR/key.pem"
    chown root:root "$CERT_DIR"/*.pem
    
    log "SSL certificates set up for nginx ✅"
}

# Set up automatic renewal
setup_auto_renewal() {
    log "Setting up automatic certificate renewal..."
    
    # Create renewal script
    cat > /usr/local/bin/renew-ssl.sh << 'EOF'
#!/bin/bash

# Renew SSL certificates
certbot renew --quiet

# Reload nginx if certificates were renewed
if [ $? -eq 0 ]; then
    # Copy renewed certificates
    cp /etc/letsencrypt/live/astraldraft.com/fullchain.pem /etc/nginx/ssl/cert.pem
    cp /etc/letsencrypt/live/astraldraft.com/privkey.pem /etc/nginx/ssl/key.pem
    
    # Reload nginx
    docker-compose -f /opt/astral-draft/docker-compose.yml exec nginx nginx -s reload
    
    echo "$(date): SSL certificates renewed and nginx reloaded" >> /var/log/ssl-renewal.log
fi
EOF

    chmod +x /usr/local/bin/renew-ssl.sh
    
    # Add to crontab (run twice daily)
    (crontab -l 2>/dev/null; echo "0 0,12 * * * /usr/local/bin/renew-ssl.sh") | crontab -
    
    log "Automatic renewal set up ✅"
}

# Generate self-signed certificate for development
generate_self_signed() {
    log "Generating self-signed certificate for development..."
    
    mkdir -p "$CERT_DIR"
    
    # Generate private key
    openssl genrsa -out "$CERT_DIR/key.pem" 2048
    
    # Generate certificate
    openssl req -new -x509 -key "$CERT_DIR/key.pem" -out "$CERT_DIR/cert.pem" -days 365 -subj "/C=US/ST=State/L=City/O=Organization/CN=$DOMAIN"
    
    # Set permissions
    chmod 644 "$CERT_DIR/cert.pem"
    chmod 600 "$CERT_DIR/key.pem"
    
    log "Self-signed certificate generated ✅"
    warn "This is a self-signed certificate and will show security warnings in browsers"
}

# Main function
main() {
    log "🔒 Setting up SSL certificates for Astral Draft..."
    
    case "${1:-production}" in
        "production")
            install_certbot
            generate_certificate
            setup_nginx_ssl
            setup_auto_renewal
            log "🎉 Production SSL setup completed!"
            log "Your site is now secure at https://$DOMAIN"
            ;;
        "development")
            generate_self_signed
            log "🎉 Development SSL setup completed!"
            log "Your site is available at https://$DOMAIN (with self-signed certificate)"
            ;;
        *)
            echo "Usage: $0 [production|development]"
            echo "  production  - Set up Let's Encrypt SSL certificates"
            echo "  development - Generate self-signed certificates for local development"
            exit 1
            ;;
    esac
}

main "$@"
