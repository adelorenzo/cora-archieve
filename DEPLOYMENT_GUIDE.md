# Deployment Guide - Cora AI Assistant

## Overview

This guide covers multiple deployment strategies for the Cora AI Assistant application, from simple static hosting to containerized deployments with CI/CD automation.

## Deployment Methods

### 1. Static Hosting (Simplest)

Deploy to any static hosting service (Netlify, Vercel, GitHub Pages, etc.):

```bash
# Build the application
cd web
npm install
npm run build

# Deploy the 'dist' folder to your static host
```

**Requirements:**
- Node.js 18+ for building
- Static file hosting service
- Proper MIME types for WASM files

**Configuration:**
```nginx
# Example Nginx configuration
location ~ \.wasm$ {
    add_header Content-Type application/wasm;
}
```

### 2. Docker Deployment

Using the pre-built Docker image:

```bash
# Build the Docker image
docker build -t cora-ai:latest .

# Run the container
docker run -d \
  --name cora-ai \
  -p 8000:8000 \
  --restart unless-stopped \
  cora-ai:latest
```

**Docker Compose:**
```yaml
version: '3.8'

services:
  cora-ai:
    build: .
    container_name: cora-ai
    ports:
      - "8000:8000"
    restart: unless-stopped
    volumes:
      - ./config:/app/config  # Optional: for custom configuration
```

### 3. Kubernetes Deployment

Deploy to a Kubernetes cluster:

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cora-ai
  namespace: default
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
        image: cora-ai:latest
        ports:
        - containerPort: 8000
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
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
      targetPort: 8000
  type: LoadBalancer
```

Apply the configuration:
```bash
kubectl apply -f deployment.yaml
```

### 4. CI/CD Pipeline with Gitea

Our repository includes automated CI/CD using Gitea Actions:

#### Pipeline Stages

1. **Build & Lint** - Compiles the application and checks code quality
2. **Test** - Runs automated test suite with Playwright
3. **Docker Build** - Creates container image
4. **Security Scan** - Vulnerability assessment
5. **Release** - Automated deployment for tagged versions

#### Setup Gitea Runners

```bash
# Run the automated setup script
./setup-gitea-runners.sh

# Or manually set up runners
cd gitea-runner
./register-runners.sh
docker-compose up -d
```

#### Trigger Deployments

Push to specific branches triggers different actions:
- `develop` → Build and test only
- `main` → Build, test, and create Docker image
- `v*` tags → Full release with artifacts

```bash
# Create a release
git tag -a v1.0.1 -m "Release v1.0.1"
git push origin v1.0.1
```

## Environment Configuration

### Required Environment Variables

None required - the application runs entirely in the browser.

### Optional Configuration

Create a `config.json` for custom settings:

```json
{
  "defaultModel": "SmolLM2-135M-Instruct",
  "theme": "dark",
  "enableWebSearch": false,
  "modelCachePath": "/cache/models"
}
```

## SSL/HTTPS Setup

### Using Let's Encrypt

```bash
# Install certbot
sudo apt-get install certbot python3-certbot-nginx

# Generate certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal
sudo certbot renew --dry-run
```

### Using Cloudflare

1. Add your domain to Cloudflare
2. Enable "Full SSL/TLS" mode
3. Use Cloudflare's origin certificates for your server

## Performance Optimization

### CDN Configuration

Use a CDN for static assets:

```javascript
// Configure CDN in vite.config.js
export default {
  base: 'https://cdn.your-domain.com/',
  build: {
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        assetFileNames: 'assets/[name]-[hash][extname]'
      }
    }
  }
}
```

### Caching Strategy

Configure proper cache headers:

```nginx
# Static assets - long cache
location ~* \.(js|css|wasm|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}

# HTML - no cache
location ~* \.(html)$ {
    expires -1;
    add_header Cache-Control "no-cache, no-store, must-revalidate";
}
```

## Monitoring

### Health Check Endpoint

The application provides a health check at `/health`:

```bash
curl https://your-domain.com/health
```

### Metrics Collection

Integrate with monitoring solutions:

```yaml
# Prometheus configuration
scrape_configs:
  - job_name: 'cora-ai'
    static_configs:
      - targets: ['localhost:8000']
    metrics_path: '/metrics'
```

### Logging

Application logs are available via:
- Browser console (client-side)
- Docker logs: `docker logs cora-ai`
- Kubernetes: `kubectl logs -f deployment/cora-ai`

## Scaling Considerations

### Horizontal Scaling

Since the application runs in the browser, scaling is primarily about serving static files:

1. **CDN Distribution**: Use multiple CDN endpoints
2. **Load Balancing**: Distribute traffic across multiple servers
3. **Geographic Distribution**: Deploy to multiple regions

### Resource Requirements

**Minimum Requirements:**
- 256MB RAM (server)
- 1 CPU core
- 1GB disk space

**Recommended for Production:**
- 512MB RAM
- 2 CPU cores
- 5GB disk space (for caching)

## Backup and Recovery

### Data Persistence

User data is stored in browser localStorage. For server-side backups:

```bash
# Backup Docker volumes
docker run --rm \
  -v cora-ai_data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/cora-backup-$(date +%Y%m%d).tar.gz /data
```

### Disaster Recovery

1. **Application Recovery**: Redeploy from Git repository
2. **Configuration Recovery**: Restore from config backups
3. **User Data**: Client-side only, users manage their own data

## Security Best Practices

### Content Security Policy

```nginx
add_header Content-Security-Policy "
  default-src 'self';
  script-src 'self' 'wasm-unsafe-eval';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: blob:;
  connect-src 'self' https://cdn.jsdelivr.net https://huggingface.co;
" always;
```

### CORS Configuration

```nginx
# Restrict CORS to specific origins
add_header Access-Control-Allow-Origin "https://your-domain.com" always;
add_header Access-Control-Allow-Methods "GET, POST, OPTIONS" always;
```

### Rate Limiting

```nginx
limit_req_zone $binary_remote_addr zone=app:10m rate=10r/s;

server {
    location / {
        limit_req zone=app burst=20 nodelay;
    }
}
```

## Troubleshooting

### Common Issues

**WebGPU Not Available**
- Solution: Ensure users are using Chrome/Edge
- Fallback: Application automatically uses WASM

**CORS Errors**
- Check CDN configuration
- Verify Content-Type headers for WASM files
- Review CSP headers

**Memory Issues**
- Clear browser cache
- Reduce model size
- Check for memory leaks in console

### Debug Mode

Enable debug logging:
```javascript
localStorage.setItem('debug', 'true');
```

### Support Channels

- GitHub Issues: Bug reports and feature requests
- Documentation: `/docs` folder
- Logs: Check browser console and server logs

## Rollback Procedures

### Docker Rollback

```bash
# Tag current version before update
docker tag cora-ai:latest cora-ai:backup

# Rollback if needed
docker stop cora-ai
docker run -d --name cora-ai -p 8000:8000 cora-ai:backup
```

### Kubernetes Rollback

```bash
# View rollout history
kubectl rollout history deployment/cora-ai

# Rollback to previous version
kubectl rollout undo deployment/cora-ai

# Rollback to specific revision
kubectl rollout undo deployment/cora-ai --to-revision=2
```

## Production Checklist

Before deploying to production:

- [ ] Run full test suite
- [ ] Update version numbers
- [ ] Review security headers
- [ ] Configure monitoring
- [ ] Set up backups
- [ ] Document configuration
- [ ] Test rollback procedure
- [ ] Verify SSL certificates
- [ ] Configure rate limiting
- [ ] Enable error tracking
- [ ] Review resource limits
- [ ] Test on target browsers

## Maintenance

### Regular Tasks

**Daily:**
- Monitor error logs
- Check resource usage

**Weekly:**
- Review performance metrics
- Update dependencies (security patches)

**Monthly:**
- Full backup
- Security audit
- Performance review

**Quarterly:**
- Disaster recovery test
- Capacity planning review

---

For additional deployment support, see:
- [GITEA_RUNNER_SETUP.md](./GITEA_RUNNER_SETUP.md) - CI/CD setup
- [README.md](./README.md) - Application overview
- [.gitea/workflows/ci.yml](./.gitea/workflows/ci.yml) - Pipeline configuration