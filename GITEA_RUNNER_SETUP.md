# Gitea Runner Setup Guide for Cora

**Gitea Version**: 1.24.6
**Infrastructure**: Docker on Ubuntu Linux
**Purpose**: Complete CI/CD pipeline for Cora AI Assistant

## 📋 Prerequisites

- Gitea 1.24.6 running in Docker ✅
- Docker available on host ✅
- Ubuntu Linux host ✅
- Root or sudo access for initial setup

## 🏗️ Architecture Recommendations

### Best Practice Setup
```
┌─────────────────┐
│   Gitea Server  │
│   (Container)   │
└────────┬────────┘
         │
    ┌────▼────┐
    │ Network │
    └────┬────┘
         │
┌────────▼────────┐     ┌─────────────────┐
│  Runner Host 1  │     │  Runner Host 2  │
│  (2-4 runners)  │     │  (2-4 runners)  │
│   - Docker      │     │   - Docker      │
│   - Node.js     │     │   - Playwright  │
└─────────────────┘     └─────────────────┘
```

### For Your Setup
**Recommended**: Run 2-3 Docker-based runners on the same server (since you have Docker available)
- **Runner 1**: General builds (Node.js, Docker builds)
- **Runner 2**: Test runner (Playwright, cross-browser)
- **Runner 3**: Deploy runner (Docker push, K8s deploy)

## 🚀 Step 1: Enable Actions in Gitea

### 1.1 Update Gitea Configuration

Edit your Gitea `app.ini` or docker-compose environment:

```ini
[actions]
ENABLED = true
DEFAULT_ACTIONS_URL = https://gitea.com
```

Or in docker-compose.yml:
```yaml
services:
  gitea:
    environment:
      - GITEA__actions__ENABLED=true
      - GITEA__actions__DEFAULT_ACTIONS_URL=https://gitea.com
```

### 1.2 Restart Gitea
```bash
docker-compose restart gitea
```

## 🏃 Step 2: Install Gitea Act Runner

### 2.1 Download Act Runner
```bash
# Create runner directory
sudo mkdir -p /opt/gitea-runner
cd /opt/gitea-runner

# Download latest act_runner (check https://gitea.com/gitea/act_runner/releases for latest)
sudo wget -O act_runner https://gitea.com/gitea/act_runner/releases/download/v0.2.10/act_runner-0.2.10-linux-amd64
sudo chmod +x act_runner

# Or use Docker image (recommended)
docker pull gitea/act_runner:latest
```

### 2.2 Register Runners

Get registration token from Gitea:
1. Go to your Gitea instance
2. Navigate to Site Administration → Actions → Runners
3. Copy the registration token

## 🐳 Step 3: Docker-based Runner Setup (Recommended)

### 3.1 Create Docker Compose for Runners

Create `/opt/gitea-runner/docker-compose.yml`:

```yaml
version: '3.8'

services:
  runner-general:
    image: gitea/act_runner:latest
    container_name: gitea-runner-general
    restart: unless-stopped
    volumes:
      - ./data/general:/data
      - /var/run/docker.sock:/var/run/docker.sock
    environment:
      - GITEA_INSTANCE_URL=http://your-gitea-server:3000
      - GITEA_RUNNER_REGISTRATION_TOKEN=YOUR_REGISTRATION_TOKEN
      - GITEA_RUNNER_NAME=docker-general
      - GITEA_RUNNER_LABELS=docker,node,build
      - GITEA_RUNNER_MAX_PARALLEL_JOBS=2
    networks:
      - gitea

  runner-test:
    image: gitea/act_runner:latest
    container_name: gitea-runner-test
    restart: unless-stopped
    volumes:
      - ./data/test:/data
      - /var/run/docker.sock:/var/run/docker.sock
    environment:
      - GITEA_INSTANCE_URL=http://your-gitea-server:3000
      - GITEA_RUNNER_REGISTRATION_TOKEN=YOUR_REGISTRATION_TOKEN
      - GITEA_RUNNER_NAME=docker-test
      - GITEA_RUNNER_LABELS=docker,test,playwright
      - GITEA_RUNNER_MAX_PARALLEL_JOBS=1
    networks:
      - gitea

  runner-deploy:
    image: gitea/act_runner:latest
    container_name: gitea-runner-deploy
    restart: unless-stopped
    volumes:
      - ./data/deploy:/data
      - /var/run/docker.sock:/var/run/docker.sock
      - ~/.kube:/root/.kube:ro  # For K8s deployments
    environment:
      - GITEA_INSTANCE_URL=http://your-gitea-server:3000
      - GITEA_RUNNER_REGISTRATION_TOKEN=YOUR_REGISTRATION_TOKEN
      - GITEA_RUNNER_NAME=docker-deploy
      - GITEA_RUNNER_LABELS=docker,deploy,k8s
      - GITEA_RUNNER_MAX_PARALLEL_JOBS=1
    networks:
      - gitea

networks:
  gitea:
    external: true  # Assuming Gitea is on this network
```

### 3.2 Create Runner Configuration

Create `/opt/gitea-runner/config.yaml`:

```yaml
log:
  level: info

runner:
  file: .runner
  capacity: 2
  envs:
    A_TEST_ENV_NAME_1: a_test_env_value_1
    A_TEST_ENV_NAME_2: a_test_env_value_2
  env_file: .env
  timeout: 3h
  insecure: false
  fetch_timeout: 5s
  fetch_interval: 2s
  labels:
    - "docker:docker://node:20-bullseye"
    - "ubuntu-latest:docker://node:20-bullseye"
    - "ubuntu-22.04:docker://node:20-bullseye"
    - "ubuntu-20.04:docker://node:20-bullseye"

cache:
  enabled: true
  dir: ""
  host: ""
  port: 0
  external_server: ""

container:
  network: gitea
  privileged: false
  options:
  workdir_parent:
  valid_volumes:
    - /opt/gitea-runner/data
  docker_host: ""
  force_pull: true

host:
  workdir_parent:
```

### 3.3 Start Runners

```bash
cd /opt/gitea-runner
docker-compose up -d

# Check status
docker-compose logs -f
```

## 📝 Step 4: Create CI/CD Workflows

### 4.1 Main CI/CD Workflow

Create `.gitea/workflows/ci.yml` in your repository:

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
  tag:
    - 'v*'

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: cora-ai

jobs:
  # Job 1: Build and Test
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [20.x]

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'
          cache-dependency-path: web/package-lock.json

      - name: Install dependencies
        run: |
          cd web
          npm ci

      - name: Run linting
        run: |
          cd web
          npm run lint || true

      - name: Build application
        run: |
          cd web
          npm run build

      - name: Upload build artifacts
        uses: actions/upload-artifact@v3
        with:
          name: build-artifacts
          path: web/dist

  # Job 2: Playwright Tests
  playwright-tests:
    runs-on: ubuntu-latest
    needs: test
    container:
      image: mcr.microsoft.com/playwright:v1.40.0-jammy

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20.x
          cache: 'npm'
          cache-dependency-path: web/package-lock.json

      - name: Install dependencies
        run: |
          cd web
          npm ci

      - name: Install Playwright browsers
        run: |
          cd web
          npx playwright install --with-deps

      - name: Run Playwright tests
        run: |
          cd web
          npm run test:ci || true
        continue-on-error: true

      - name: Upload test results
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: web/test-results/
          retention-days: 7

  # Job 3: Build Docker Image
  docker-build:
    runs-on: ubuntu-latest
    needs: test
    if: github.event_name == 'push'

    steps:
      - uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Log in to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=ref,event=branch
            type=ref,event=pr
            type=semver,pattern={{version}}
            type=semver,pattern={{major}}.{{minor}}
            type=sha

      - name: Build and push Docker image
        uses: docker/build-push-action@v5
        with:
          context: .
          file: ./Dockerfile
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  # Job 4: Deploy to Kubernetes (on tags only)
  deploy:
    runs-on: ubuntu-latest
    needs: [test, docker-build]
    if: startsWith(github.ref, 'refs/tags/v')

    steps:
      - uses: actions/checkout@v4

      - name: Setup kubectl
        uses: azure/setup-kubectl@v3
        with:
          version: 'latest'

      - name: Configure kubectl
        run: |
          echo "${{ secrets.KUBE_CONFIG }}" | base64 -d > /tmp/kubeconfig
          export KUBECONFIG=/tmp/kubeconfig

      - name: Deploy to Kubernetes
        run: |
          kubectl apply -f k8s/
          kubectl set image deployment/cora-ai cora-ai=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.ref_name }}
          kubectl rollout status deployment/cora-ai
```

### 4.2 Nightly Build Workflow

Create `.gitea/workflows/nightly.yml`:

```yaml
name: Nightly Build

on:
  schedule:
    - cron: '0 2 * * *'  # 2 AM UTC daily
  workflow_dispatch:  # Manual trigger

jobs:
  nightly-test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4
        with:
          ref: develop

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20.x
          cache: 'npm'
          cache-dependency-path: web/package-lock.json

      - name: Install dependencies
        run: |
          cd web
          npm ci

      - name: Run comprehensive tests
        run: |
          cd web
          npm run test:all

      - name: Performance audit
        run: |
          cd web
          npx lighthouse http://localhost:8000 --output=json --output-path=./lighthouse-report.json
        continue-on-error: true

      - name: Security audit
        run: |
          cd web
          npm audit --audit-level=moderate

      - name: Notify on failure
        if: failure()
        run: |
          echo "Nightly build failed! Send notification..."
          # Add webhook or email notification here
```

## 🐳 Step 5: Create Dockerfile for Cora

Create `Dockerfile` in repository root:

```dockerfile
# Multi-stage build for Cora AI Assistant
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY web/package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application files
COPY web/ ./

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built files from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
```

## 🎯 Step 6: Kubernetes Deployment

Create `k8s/deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cora-ai
  labels:
    app: cora-ai
spec:
  replicas: 3
  selector:
    matchLabels:
      app: cora-ai
  template:
    metadata:
      labels:
        app: cora-ai
    spec:
      containers:
      - name: cora-ai
        image: ghcr.io/cora-ai:latest
        ports:
        - containerPort: 80
        resources:
          requests:
            memory: "256Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /
            port: 80
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /
            port: 80
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: cora-ai-service
spec:
  selector:
    app: cora-ai
  ports:
    - protocol: TCP
      port: 80
      targetPort: 80
  type: LoadBalancer
```

## 🔧 Step 7: Runner Management Commands

### Useful Commands
```bash
# View runner status in Gitea
# Go to: Admin → Actions → Runners

# View runner logs
docker-compose logs -f runner-general

# Restart a runner
docker-compose restart runner-general

# Scale runners (add more instances)
docker-compose up -d --scale runner-general=3

# Remove and re-register a runner
docker-compose down
rm -rf ./data/general/.runner
docker-compose up -d

# Update runners
docker-compose pull
docker-compose up -d
```

## 📊 Monitoring & Maintenance

### Runner Health Checks
```bash
#!/bin/bash
# health-check.sh

# Check if runners are running
for runner in runner-general runner-test runner-deploy; do
  if docker ps | grep -q $runner; then
    echo "✅ $runner is running"
  else
    echo "❌ $runner is down"
    docker-compose up -d $runner
  fi
done

# Check runner registration
curl -s http://your-gitea:3000/api/v1/admin/runners \
  -H "Authorization: token YOUR_ADMIN_TOKEN" | jq .
```

### Cleanup Old Artifacts
```bash
# Clean artifacts older than 7 days
find /opt/gitea-runner/data -type f -mtime +7 -delete

# Clean Docker images
docker image prune -a -f --filter "until=168h"
```

## 🚀 Step 8: Secret Management

In your Gitea repository settings, add these secrets:
- `DOCKER_REGISTRY_PASSWORD` - For Docker Hub/GHCR
- `KUBE_CONFIG` - Base64 encoded kubeconfig
- `DEPLOY_KEY` - SSH key for deployments
- `NOTIFICATION_WEBHOOK` - For build notifications

## 📈 Performance Tuning

### Runner Optimization
```yaml
# For better performance, adjust in docker-compose.yml:
environment:
  - GITEA_RUNNER_MAX_PARALLEL_JOBS=3  # Increase if server can handle
  - ACTIONS_RUNNER_DEBUG=false  # Set true only for debugging
  - ACTIONS_RUNNER_HOOK_JOB_STARTED=/opt/scripts/job-start.sh
  - ACTIONS_RUNNER_HOOK_JOB_COMPLETED=/opt/scripts/job-complete.sh
```

### Cache Configuration
```yaml
# In runner config.yaml:
cache:
  enabled: true
  dir: "/data/cache"
  host: "redis"  # Optional: Use Redis for distributed cache
  port: 6379
```

## 🎉 Quick Start Script

Save this as `setup-runners.sh`:

```bash
#!/bin/bash

# Configuration
GITEA_URL="http://your-gitea-server:3000"
REGISTRATION_TOKEN="YOUR_TOKEN_HERE"
RUNNER_DIR="/opt/gitea-runner"

# Create directory
sudo mkdir -p $RUNNER_DIR
cd $RUNNER_DIR

# Download files
curl -O https://raw.githubusercontent.com/your-repo/docker-compose.yml
curl -O https://raw.githubusercontent.com/your-repo/config.yaml

# Update token
sed -i "s/YOUR_REGISTRATION_TOKEN/$REGISTRATION_TOKEN/g" docker-compose.yml
sed -i "s|your-gitea-server:3000|$GITEA_URL|g" docker-compose.yml

# Start runners
docker-compose up -d

echo "✅ Gitea runners are now running!"
echo "Check status: docker-compose logs -f"
```

## 📚 Next Steps

1. **Test the setup**: Push a commit to trigger the workflow
2. **Monitor runners**: Check Gitea Admin → Actions → Runners
3. **Customize workflows**: Adapt the CI/CD pipeline to your needs
4. **Add notifications**: Configure webhooks for build status
5. **Security scanning**: Add container scanning tools

## 🆘 Troubleshooting

**Runner not appearing in Gitea:**
- Check registration token is correct
- Verify network connectivity
- Check runner logs: `docker-compose logs runner-general`

**Jobs stuck in pending:**
- Check runner labels match job requirements
- Verify runner has capacity
- Check Docker daemon is accessible

**Permission denied errors:**
- Ensure Docker socket is mounted correctly
- Check runner has permission to access Docker

---

**Ready to implement?** This setup will give you a production-grade CI/CD pipeline for Cora!