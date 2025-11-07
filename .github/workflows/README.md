# GitHub Actions Workflows

This directory contains automated workflows for the Robotman project.

## Available Workflows

### 🚀 deploy.yml

Automatically deploys the application to your Ubuntu server when code is pushed to the `main` branch.

**Features:**
- Automated deployment on push to main
- Manual deployment via workflow dispatch
- Environment variable management via GitHub Secrets
- Docker Compose orchestration
- Deployment verification

**See:** [DEPLOY.md](../DEPLOY.md) for complete setup instructions.

## Quick Start

1. Set up your Ubuntu server with Docker and Docker Compose
2. Configure GitHub Secrets (see DEPLOY.md)
3. Push to `main` branch or manually trigger deployment
4. Monitor deployment in the Actions tab

## Manual Deployment

To manually trigger a deployment:

1. Go to **Actions** tab
2. Select "Deploy to Ubuntu Server"
3. Click **Run workflow**
4. Select branch and click **Run workflow**

## Required GitHub Secrets

Minimum required secrets for deployment:

- `SSH_PRIVATE_KEY` - SSH private key for server access
- `SERVER_USER` - SSH username
- `SERVER_HOST` - Server IP or hostname
- `DEPLOY_PATH` - Deployment directory path
- `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` - Database credentials
- `DISCORD_TOKEN` - Discord bot token
- Plus other application-specific secrets

For a complete list, see [DEPLOY.md](../DEPLOY.md).
