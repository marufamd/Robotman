# Production Deployment Guide — Ubuntu Server

This guide walks through deploying Robotman services (API, Bot, PostgreSQL) to an Ubuntu server for production use.

## Prerequisites

- Ubuntu Server 20.04 LTS or newer
- Root or sudo access
- A domain name (for API HTTPS access)
- Basic familiarity with Linux command line

## Table of Contents

1. [Initial Server Setup](#initial-server-setup)
2. [Install Docker & Docker Compose](#install-docker--docker-compose)
3. [Clone Repository & Configure](#clone-repository--configure)
4. [Production Environment Configuration](#production-environment-configuration)
5. [Security Hardening](#security-hardening)
6. [Deploy with Docker Compose](#deploy-with-docker-compose)
7. [Set Up Nginx Reverse Proxy](#set-up-nginx-reverse-proxy)
8. [SSL/TLS with Let's Encrypt](#ssltls-with-lets-encrypt)
9. [Systemd Service for Auto-Start](#systemd-service-for-auto-start)
10. [Monitoring & Logs](#monitoring--logs)
11. [Backups](#backups)
12. [Updates & Maintenance](#updates--maintenance)
13. [Troubleshooting](#troubleshooting)

---

## Initial Server Setup

### 1. Update system packages
```bash
sudo apt update && sudo apt upgrade -y
```

### 2. Create a dedicated user (recommended)
```bash
sudo adduser robotman
sudo usermod -aG sudo robotman
sudo usermod -aG docker robotman  # Add after Docker is installed
```

### 3. Set up firewall (UFW)
```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
sudo ufw status
```

**Important**: Do NOT expose port 5432 (PostgreSQL) or 3001 (API) directly to the internet. Use nginx as a reverse proxy.

---

## Install Docker & Docker Compose

### Install Docker
```bash
# Remove old versions
sudo apt remove docker docker-engine docker.io containerd runc

# Install dependencies
sudo apt install -y apt-transport-https ca-certificates curl software-properties-common

# Add Docker's official GPG key
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Add Docker repository
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io

# Verify installation
sudo docker --version
```

### Install Docker Compose
```bash
# Download Docker Compose (check for latest version at https://github.com/docker/compose/releases)
sudo curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

# Make executable
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker-compose --version
```

### Add user to docker group
```bash
sudo usermod -aG docker $USER
newgrp docker  # Apply group changes
```

### Enable Docker to start on boot
```bash
sudo systemctl enable docker
sudo systemctl start docker
```

---

## Clone Repository & Configure

### 1. Clone the repository
```bash
cd /opt  # Or your preferred directory
sudo mkdir -p robotman
sudo chown $USER:$USER robotman
cd robotman
git clone https://github.com/marufamd/Robotman.git .
```

### 2. Create production `.env` file
```bash
cp .env.example .env
nano .env  # Or use vim/vi
```

**IMPORTANT**: Fill in all required values. See [Production Environment Configuration](#production-environment-configuration) below.

---

## Production Environment Configuration

### Required changes to `.env`

```bash
# ===================================
# CRITICAL: Update these values
# ===================================

# API Service
PORT=3000
NODE_ENV=production

# Generate strong postgres password
POSTGRES_PASSWORD=$(openssl rand -base64 32)
POSTGRES_URL=postgres://robotman:${POSTGRES_PASSWORD}@postgres:5432/robotman

# Your production domain
WEB_URL=https://api.yourdomain.com

# Discord webhook for error logging (optional but recommended)
WEBHOOK_URL=https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_TOKEN

# Discord OAuth (from Discord Developer Portal)
CLIENT_ID=your_discord_client_id
CLIENT_SECRET=your_discord_client_secret

# Bot Service
DISCORD_TOKEN=your_discord_bot_token
BOT_PREFIX=!
BOT_OWNER=your_discord_user_id
SCORE_GUILD=your_guild_id

# Optional API keys (add as needed)
GOOGLE_SEARCH_KEY=
GOOGLE_ENGINE_KEY=
# ... etc
```

### Update `docker-compose.yml` for production

Create `docker-compose.prod.yml`:
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:12-alpine
    environment:
      POSTGRES_USER: robotman
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: robotman
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backups:/backups  # For database backups
    restart: always
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U robotman"]
      interval: 10s
      timeout: 5s
      retries: 5
    # DO NOT expose port 5432 in production
    networks:
      - robotman_network

  api:
    build:
      context: .
      dockerfile: services/api/Dockerfile
    env_file: .env
    environment:
      POSTGRES_URL: postgres://robotman:${POSTGRES_PASSWORD}@postgres:5432/robotman
      NODE_ENV: production
    expose:
      - "3000"
    depends_on:
      postgres:
        condition: service_healthy
    restart: always
    networks:
      - robotman_network
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  bot:
    build:
      context: .
      dockerfile: services/bot/Dockerfile
    env_file: .env
    environment:
      POSTGRES_URL: postgres://robotman:${POSTGRES_PASSWORD}@postgres:5432/robotman
      NODE_ENV: production
    depends_on:
      postgres:
        condition: service_healthy
    restart: always
    networks:
      - robotman_network
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

volumes:
  postgres_data:

networks:
  robotman_network:
    driver: bridge
```

**Key production changes**:
- Use `restart: always` instead of `unless-stopped`
- Don't expose postgres port 5432
- Use environment variables for postgres password
- Add logging limits
- Use dedicated network
- Add backup volume mount

---

## Security Hardening

### 1. Secure `.env` file permissions
```bash
chmod 600 .env
chown $USER:$USER .env
```

### 2. Use Docker secrets (alternative to .env)
For enhanced security, use Docker secrets:

```bash
# Create secrets
echo "your_postgres_password" | docker secret create postgres_password -
echo "your_discord_token" | docker secret create discord_token -
```

Then update `docker-compose.prod.yml` to use secrets instead of environment variables.

### 3. Run containers as non-root
The Dockerfiles already configure non-root users. Verify:
```bash
docker compose exec api whoami
docker compose exec bot whoami
# Should output: robotman
```

### 4. Disable unnecessary services
```bash
sudo systemctl disable apache2  # If not using Apache
sudo systemctl stop apache2
```

### 5. Set up fail2ban (optional but recommended)
```bash
sudo apt install -y fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### 6. Regular security updates
```bash
# Set up unattended upgrades
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure --priority=low unattended-upgrades
```

---

## Deploy with Docker Compose

### 1. Build images
```bash
cd /opt/robotman
docker compose -f docker-compose.prod.yml build --no-cache
```

### 2. Start services
```bash
docker compose -f docker-compose.prod.yml up -d
```

### 3. Verify services are running
```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f
```

### 4. Check API health
```bash
curl http://localhost:3000
```

---

## Set Up Nginx Reverse Proxy

### 1. Install Nginx
```bash
sudo apt install -y nginx
```

### 2. Create Nginx configuration
```bash
sudo nano /etc/nginx/sites-available/robotman-api
```

Add the following configuration:
```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    # Increase client body size for file uploads
    client_max_body_size 10M;

    location / {
        proxy_pass http://localhost:3000;
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
}
```

### 3. Enable the site
```bash
sudo ln -s /etc/nginx/sites-available/robotman-api /etc/nginx/sites-enabled/
sudo nginx -t  # Test configuration
sudo systemctl reload nginx
```

---

## SSL/TLS with Let's Encrypt

### 1. Install Certbot
```bash
sudo apt install -y certbot python3-certbot-nginx
```

### 2. Obtain SSL certificate
```bash
sudo certbot --nginx -d api.yourdomain.com
```

Follow the prompts. Certbot will automatically:
- Obtain a certificate
- Configure Nginx for HTTPS
- Set up auto-renewal

### 3. Verify auto-renewal
```bash
sudo certbot renew --dry-run
```

### 4. Update `.env` with HTTPS URL
```bash
WEB_URL=https://api.yourdomain.com
```

Restart services:
```bash
docker compose -f docker-compose.prod.yml restart
```

---

## Systemd Service for Auto-Start

Create a systemd service to manage Docker Compose:

### 1. Create service file
```bash
sudo nano /etc/systemd/system/robotman.service
```

Add the following:
```ini
[Unit]
Description=Robotman Discord Bot Services
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/robotman
ExecStart=/usr/local/bin/docker-compose -f docker-compose.prod.yml up -d
ExecStop=/usr/local/bin/docker-compose -f docker-compose.prod.yml down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
```

### 2. Enable and start the service
```bash
sudo systemctl daemon-reload
sudo systemctl enable robotman.service
sudo systemctl start robotman.service
```

### 3. Check service status
```bash
sudo systemctl status robotman.service
```

### 4. Manage the service
```bash
sudo systemctl stop robotman     # Stop services
sudo systemctl start robotman    # Start services
sudo systemctl restart robotman  # Restart services
```

---

## Monitoring & Logs

### View logs
```bash
# All services
docker compose -f docker-compose.prod.yml logs -f

# Specific service
docker compose -f docker-compose.prod.yml logs -f api
docker compose -f docker-compose.prod.yml logs -f bot
docker compose -f docker-compose.prod.yml logs -f postgres

# Last 100 lines
docker compose -f docker-compose.prod.yml logs --tail=100 api
```

### Monitor resource usage
```bash
docker stats
```

### Set up log rotation
Docker already handles log rotation (configured in docker-compose.prod.yml), but you can also use logrotate:

```bash
sudo nano /etc/logrotate.d/docker-containers
```

Add:
```
/var/lib/docker/containers/*/*.log {
    rotate 7
    daily
    compress
    missingok
    delaycompress
    copytruncate
}
```

### Monitor with htop
```bash
sudo apt install -y htop
htop
```

### Set up alerts (optional)
Consider using monitoring tools like:
- **Prometheus + Grafana** for metrics
- **Uptime Kuma** for uptime monitoring
- **Discord webhooks** for error notifications (already configured via WEBHOOK_URL)

---

## Backups

### 1. Automated PostgreSQL backups

Create backup script:
```bash
sudo nano /opt/robotman/backup.sh
```

Add:
```bash
#!/bin/bash
BACKUP_DIR="/opt/robotman/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/robotman_$DATE.sql"

mkdir -p $BACKUP_DIR

docker compose -f /opt/robotman/docker-compose.prod.yml exec -T postgres \
  pg_dump -U robotman robotman > $BACKUP_FILE

# Compress backup
gzip $BACKUP_FILE

# Delete backups older than 7 days
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete

echo "Backup completed: ${BACKUP_FILE}.gz"
```

Make executable:
```bash
chmod +x /opt/robotman/backup.sh
```

### 2. Set up cron job for daily backups
```bash
crontab -e
```

Add:
```bash
# Daily backup at 2 AM
0 2 * * * /opt/robotman/backup.sh >> /var/log/robotman-backup.log 2>&1
```

### 3. Backup to remote storage (recommended)
Use tools like:
- **rclone** — sync to cloud storage (S3, Google Drive, etc.)
- **rsync** — sync to remote server
- **restic** — encrypted backups

Example with rclone to S3:
```bash
# Install rclone
sudo apt install -y rclone

# Configure rclone (interactive)
rclone config

# Add to backup script
rclone copy $BACKUP_DIR remote:robotman-backups/
```

### 4. Restore from backup
```bash
# Restore from specific backup
gunzip -c /opt/robotman/backups/robotman_20250106_020000.sql.gz | \
  docker compose -f /opt/robotman/docker-compose.prod.yml exec -T postgres \
  psql -U robotman robotman
```

---

## Updates & Maintenance

### Updating the application

```bash
cd /opt/robotman

# Pull latest changes
git pull origin main

# Rebuild images
docker compose -f docker-compose.prod.yml build --no-cache

# Stop services
docker compose -f docker-compose.prod.yml down

# Start with new images
docker compose -f docker-compose.prod.yml up -d

# Check logs
docker compose -f docker-compose.prod.yml logs -f
```

### Zero-downtime updates (advanced)
For production systems, consider:
- **Blue-green deployment**: Run two identical environments
- **Rolling updates**: Update services one at a time
- **Docker Swarm or Kubernetes**: For orchestration and zero-downtime deployments

### Clean up old images
```bash
docker system prune -a --volumes
```

### Update system packages
```bash
sudo apt update && sudo apt upgrade -y
sudo reboot  # If kernel updates were applied
```

---

## Troubleshooting

### Services won't start
```bash
# Check logs
docker compose -f docker-compose.prod.yml logs

# Check container status
docker compose -f docker-compose.prod.yml ps

# Check for port conflicts
sudo netstat -tulpn | grep :3000
sudo netstat -tulpn | grep :5432
```

### Database connection issues
```bash
# Test postgres connection
docker compose -f docker-compose.prod.yml exec postgres psql -U robotman -d robotman

# Check POSTGRES_URL in .env
cat .env | grep POSTGRES_URL

# Verify postgres is healthy
docker compose -f docker-compose.prod.yml ps postgres
```

### API returns 502 Bad Gateway
```bash
# Check nginx error logs
sudo tail -f /var/log/nginx/error.log

# Check if API container is running
docker compose -f docker-compose.prod.yml ps api

# Test API directly (bypass nginx)
curl http://localhost:3000
```

### Out of disk space
```bash
# Check disk usage
df -h

# Clean Docker resources
docker system prune -a --volumes

# Check log sizes
du -sh /var/lib/docker/containers/*/*-json.log
```

### Permission denied errors
```bash
# Fix .env permissions
chmod 600 .env

# Fix directory ownership
sudo chown -R $USER:$USER /opt/robotman
```

### Bot not responding to commands
```bash
# Check bot logs
docker compose -f docker-compose.prod.yml logs -f bot

# Verify DISCORD_TOKEN is correct
# Check bot has proper permissions in Discord server
# Ensure bot is online in Discord Developer Portal
```

### Memory issues
```bash
# Check memory usage
free -h
docker stats

# Set memory limits in docker-compose.prod.yml
services:
  api:
    mem_limit: 512m
  bot:
    mem_limit: 1g
```

---

## Production Checklist

Before going live:
- [ ] Strong postgres password set in `.env`
- [ ] `.env` file has `chmod 600` permissions
- [ ] PostgreSQL port 5432 is NOT exposed to internet
- [ ] Nginx reverse proxy configured
- [ ] SSL/TLS certificate obtained and auto-renewal configured
- [ ] Firewall (UFW) enabled with only necessary ports open
- [ ] Systemd service configured for auto-start
- [ ] Automated backups configured and tested
- [ ] Log rotation configured
- [ ] Monitoring/alerting set up
- [ ] Discord OAuth redirect URIs updated in Discord Developer Portal
- [ ] Test restore procedure from backup
- [ ] Document custom configuration for team

---

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Discord Developer Portal](https://discord.com/developers/applications)

---

## Support

For issues specific to this deployment:
1. Check logs: `docker compose -f docker-compose.prod.yml logs -f`
2. Review [DOCKER.md](./DOCKER.md) for Docker Compose usage
3. Check [GitHub Issues](https://github.com/marufamd/Robotman/issues)

---

**Last updated**: November 2025
