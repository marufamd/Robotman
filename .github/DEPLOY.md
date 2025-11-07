# GitHub Actions Deployment Setup

This guide will help you set up automated deployment to your Ubuntu server using GitHub Actions.

## Prerequisites

1. An Ubuntu server with Docker and Docker Compose installed
2. SSH access to your server
3. GitHub repository with Actions enabled

## Setup Steps

### 1. Server Setup

On your Ubuntu server, ensure Docker and Docker Compose are installed:

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt-get update
sudo apt-get install docker-compose-plugin
```

### 2. Generate SSH Key for Deployment

On your **local machine**:

```bash
# Generate a new SSH key specifically for deployment
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_deploy_key

# Copy the public key to your server
ssh-copy-id -i ~/.ssh/github_deploy_key.pub your-user@your-server-ip

# Test the connection
ssh -i ~/.ssh/github_deploy_key your-user@your-server-ip
```

### 3. Configure GitHub Secrets

Go to your GitHub repository: **Settings → Secrets and variables → Actions → New repository secret**

Add the following secrets:

#### Required Secrets

| Secret Name | Description | Example |
|------------|-------------|---------|
| `SSH_PRIVATE_KEY` | Private key content from `~/.ssh/github_deploy_key` | `-----BEGIN OPENSSH PRIVATE KEY-----...` |
| `SERVER_USER` | SSH username on your Ubuntu server | `ubuntu` or `root` |
| `SERVER_HOST` | IP address or hostname of your server | `192.168.1.100` or `server.example.com` |
| `DEPLOY_PATH` | Deployment directory on server | `/home/ubuntu/robotman` |

#### Database Secrets

| Secret Name | Value |
|------------|-------|
| `POSTGRES_USER` | `robotman` (or custom) |
| `POSTGRES_PASSWORD` | Strong password |
| `POSTGRES_DB` | `robotman` (or custom) |

#### Discord/API Secrets

| Secret Name | Description |
|------------|-------------|
| `DISCORD_TOKEN` | Your Discord bot token |
| `BOT_PREFIX` | Command prefix (e.g., `!`) |
| `BOT_OWNER` | Your Discord user ID |
| `SCORE_GUILD` | Guild ID for scoring |
| `CLIENT_ID` | Discord OAuth client ID |
| `CLIENT_SECRET` | Discord OAuth client secret |
| `WEBHOOK_URL` | Discord webhook URL |
| `WEB_URL` | Your web URL (e.g., `https://yourdomain.com`) |

#### Optional API Keys

Add these only if you use these services:

- `GOOGLE_SEARCH_KEY`
- `GOOGLE_ENGINE_KEY`
- `SERVICE_ACCOUNT_EMAIL`
- `SERVICE_ACCOUNT_KEY`
- `SPREADSHEET_ID`
- `IMGUR_CLIENT_ID`
- `PASTEE_KEY`
- `OPEN_MOVIE_DB_KEY`
- `COMICVINE_KEY`
- `WEBSTER_DICTIONARY_KEY`
- `WEBSTER_THESAURUS_KEY`
- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_WEB_URL`
- `NEXT_PUBLIC_CLIENT_ID`
- `NEXT_PUBLIC_BOT_AVATAR`

### 4. Copy SSH Private Key

To get your SSH private key content:

```bash
cat ~/.ssh/github_deploy_key
```

Copy the entire output (including `-----BEGIN OPENSSH PRIVATE KEY-----` and `-----END OPENSSH PRIVATE KEY-----`) and paste it into the `SSH_PRIVATE_KEY` secret.

### 5. Test the Deployment

#### Manual Trigger

1. Go to **Actions** tab in your GitHub repository
2. Click on "Deploy to Ubuntu Server" workflow
3. Click "Run workflow" → "Run workflow"
4. Monitor the deployment progress

#### Automatic Trigger

Push to the `main` branch:

```bash
git add .
git commit -m "Deploy to production"
git push origin main
```

## Deployment Process

The workflow will:

1. ✅ Checkout your code
2. ✅ Set up SSH connection to your server
3. ✅ Create `.env` file with all secrets
4. ✅ Sync files to your server (via rsync)
5. ✅ Build Docker images on the server
6. ✅ Stop old containers
7. ✅ Start new containers
8. ✅ Clean up old images
9. ✅ Verify deployment status

## Monitoring

### View Logs on Server

```bash
# SSH into your server
ssh your-user@your-server-ip

# Navigate to deployment directory
cd /path/to/deployment

# View logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f bot
docker-compose logs -f api
docker-compose logs -f postgres
```

### Check Container Status

```bash
docker-compose ps
```

### Restart Services

```bash
docker-compose restart
```

## Troubleshooting

### Deployment Fails with SSH Error

- Verify SSH key is correct in GitHub Secrets
- Ensure the public key is in `~/.ssh/authorized_keys` on the server
- Check server firewall allows SSH (port 22)

### Docker Permission Denied

```bash
# On your server, add your user to docker group
sudo usermod -aG docker $USER
# Log out and log back in
```

### Containers Won't Start

```bash
# Check logs
docker-compose logs

# Check .env file exists
ls -la .env

# Rebuild from scratch
docker-compose down -v
docker-compose up -d --build
```

### Database Connection Issues

- Verify `POSTGRES_URL` format in .env
- Check postgres container is healthy: `docker-compose ps`
- Check postgres logs: `docker-compose logs postgres`

## Security Best Practices

1. ✅ **Never commit `.env` or secrets to git**
2. ✅ **Use strong passwords** for `POSTGRES_PASSWORD`
3. ✅ **Rotate SSH keys periodically**
4. ✅ **Use separate keys** for different environments (staging/production)
5. ✅ **Limit SSH key permissions** (600 for private key)
6. ✅ **Use firewall rules** to restrict access to your server
7. ✅ **Don't expose PostgreSQL port** (5432) to the internet

## Rollback

If deployment fails and you need to rollback:

```bash
# SSH into server
ssh your-user@your-server-ip
cd /path/to/deployment

# Checkout previous commit
git checkout <previous-commit-hash>

# Rebuild and restart
docker-compose down
docker-compose up -d --build
```

## Advanced: Multiple Environments

To deploy to staging and production:

1. Create separate workflows: `deploy-staging.yml`, `deploy-production.yml`
2. Use different secrets for each environment
3. Deploy to staging on `develop` branch
4. Deploy to production on `main` branch

## Support

If you encounter issues:

1. Check GitHub Actions logs
2. SSH into server and check Docker logs
3. Verify all secrets are set correctly
4. Ensure server has enough resources (disk space, memory)
