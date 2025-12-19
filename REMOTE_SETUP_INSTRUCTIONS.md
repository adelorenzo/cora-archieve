# Remote Gitea Runner Setup Instructions

## Quick Setup for Your Remote Server

Since your Gitea server is deployed in Docker at `/opt/gitea-ad` on a remote machine, follow these steps:

### 1. Transfer the Setup Script

Copy the setup script to your remote server:

```bash
# From your local machine
scp remote-runner-setup.sh your-user@your-server:/tmp/

# Or copy the script content and create it directly on the server
ssh your-user@your-server
sudo nano /tmp/remote-runner-setup.sh
# Paste the script content, save and exit
```

### 2. Run the Setup Script

On your remote server:

```bash
# SSH into your server
ssh your-user@your-server

# Make the script executable
chmod +x /tmp/remote-runner-setup.sh

# Run the setup script (will ask for sudo if needed)
/tmp/remote-runner-setup.sh
```

The script will:
- ✅ Check that Gitea is running in `/opt/gitea-ad`
- ✅ Create runner directories in `/opt/gitea-runners`
- ✅ Generate Docker Compose configuration
- ✅ Create management scripts
- ✅ Set up proper networking with your Gitea container

### 3. Get Registration Token

1. Open your Gitea instance: `https://git.oe74.net`
2. Log in as admin
3. Navigate to: **Site Administration → Actions → Runners**
4. Click **"Create new Runner"**
5. Copy the registration token

### 4. Register the Runners

On your remote server:

```bash
# Navigate to the runners directory
cd /opt/gitea-runners/scripts

# Run the registration script
./register-runners.sh

# Enter the token when prompted
```

### 5. Start the Runners

```bash
# Go back to the main runner directory
cd /opt/gitea-runners

# Start all three runners
docker-compose up -d

# Verify they're running
docker-compose ps
```

### 6. Monitor Runner Status

```bash
# Use the monitoring script
/opt/gitea-runners/scripts/monitor-runners.sh

# Or check logs
cd /opt/gitea-runners
docker-compose logs -f
```

## Directory Structure on Remote Server

After setup, your remote server will have:

```
/opt/
├── gitea-ad/               # Your existing Gitea installation
│   ├── docker-compose.yml
│   ├── data/
│   └── ...
│
└── gitea-runners/          # New runner installation
    ├── docker-compose.yml
    ├── .env
    ├── configs/
    │   ├── runner-1.yaml
    │   ├── runner-2.yaml
    │   └── runner-3.yaml
    ├── data/
    │   ├── runner-1/
    │   ├── runner-2/
    │   └── runner-3/
    ├── cache/              # Shared cache for all runners
    └── scripts/
        ├── register-runners.sh
        ├── monitor-runners.sh
        ├── start-runners.sh
        ├── stop-runners.sh
        ├── restart-runners.sh
        └── logs-runners.sh
```

## Management Commands

All commands should be run on your remote server:

### Start/Stop/Restart Runners

```bash
# Start
/opt/gitea-runners/scripts/start-runners.sh

# Stop
/opt/gitea-runners/scripts/stop-runners.sh

# Restart
/opt/gitea-runners/scripts/restart-runners.sh
```

### View Logs

```bash
# Follow all runner logs
/opt/gitea-runners/scripts/logs-runners.sh

# View specific runner logs
docker logs -f gitea-runner-1
```

### Check Status

```bash
# Comprehensive status check
/opt/gitea-runners/scripts/monitor-runners.sh

# Quick container status
cd /opt/gitea-runners && docker-compose ps
```

## Enable Auto-Start on Boot (Optional)

To ensure runners start automatically after server reboot:

```bash
# Copy the systemd service file
sudo cp /opt/gitea-runners/gitea-runners.service /etc/systemd/system/

# Reload systemd
sudo systemctl daemon-reload

# Enable the service
sudo systemctl enable gitea-runners

# Start the service
sudo systemctl start gitea-runners

# Check service status
sudo systemctl status gitea-runners
```

## Verify CI/CD Pipeline

Once runners are set up:

1. **Check Runner Registration** in Gitea:
   - Go to: `https://git.oe74.net/admin/actions/runners`
   - You should see 3 runners: `docker-runner-1`, `docker-runner-2`, `docker-runner-3`
   - Status should show as "Idle" (green)

2. **Test the Pipeline**:
   ```bash
   # Make a small change and push to trigger CI
   git checkout develop
   echo "# CI Test" >> README.md
   git add README.md
   git commit -m "test: Trigger CI pipeline"
   git push origin develop
   ```

3. **Monitor Pipeline Execution**:
   - Go to your repository on Gitea
   - Click on "Actions" tab
   - Watch the workflow execute

## Troubleshooting

### Runners Not Showing in Gitea

```bash
# Check if runners are registered
ls -la /opt/gitea-runners/data/runner-*/.runner

# Re-register if needed
cd /opt/gitea-runners/scripts
./register-runners.sh
```

### Network Issues

```bash
# Verify Gitea network
docker network ls | grep gitea

# Check runner connectivity to Gitea
docker exec gitea-runner-1 ping gitea
```

### Permission Issues

```bash
# Fix permissions
sudo chown -R root:docker /opt/gitea-runners
sudo chmod -R 755 /opt/gitea-runners
```

### Runner Can't Access Docker

```bash
# Ensure Docker socket is accessible
ls -la /var/run/docker.sock

# Add proper permissions if needed
sudo chmod 666 /var/run/docker.sock
```

## Security Considerations

1. **Runner Isolation**: Each runner runs in its own container
2. **Network Segmentation**: Runners use the same network as Gitea
3. **Volume Restrictions**: Runners can only access specified volumes
4. **Non-Privileged**: Runners run without privileged mode by default

## Resource Requirements

**Per Runner:**
- CPU: 0.5-1 core
- Memory: 512MB-1GB
- Disk: 1GB + cache

**Total for 3 Runners:**
- CPU: 2-3 cores recommended
- Memory: 2-3GB recommended
- Disk: 5GB recommended

## Next Steps

After successful setup:

1. ✅ Runners are registered and running
2. ✅ CI/CD pipeline is active
3. 🚀 Ready for Sprint 8: Containerization

The CI/CD pipeline will now automatically:
- Build and test on push to `develop`
- Create Docker images on push to `main`
- Generate releases for version tags

---

For additional help, check:
- [GITEA_RUNNER_SETUP.md](./GITEA_RUNNER_SETUP.md) - Detailed setup guide
- [.gitea/workflows/ci.yml](./.gitea/workflows/ci.yml) - Pipeline configuration
- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - Deployment strategies