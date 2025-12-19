#!/bin/bash

# Remote Gitea Runner Setup Script
# For Gitea server deployed in /opt/gitea-ad

set -e

# Configuration
GITEA_DIR="/opt/gitea-ad"
RUNNER_DIR="/opt/gitea-runners"
GITEA_URL="https://git.oe74.net"
RUNNER_VERSION="0.2.11"
RUNNERS_COUNT=3

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}╔══════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   Gitea Runner Setup for Remote Server   ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Gitea Location:${NC} ${GITEA_DIR}"
echo -e "${BLUE}Runner Location:${NC} ${RUNNER_DIR}"
echo -e "${BLUE}Gitea URL:${NC} ${GITEA_URL}"
echo ""

# Check if running as root (needed for /opt directory)
if [ "$EUID" -ne 0 ]; then
   echo -e "${YELLOW}Note: This script needs sudo privileges to create directories in /opt${NC}"
   echo -e "${YELLOW}Re-running with sudo...${NC}"
   exec sudo "$0" "$@"
fi

# Check Docker installation
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Docker is not installed. Please install Docker first.${NC}"
    exit 1
fi

# Check if Gitea is running
echo -e "${YELLOW}Checking Gitea status...${NC}"
if [ -d "$GITEA_DIR" ]; then
    cd "$GITEA_DIR"
    if docker-compose ps | grep -q "gitea.*Up"; then
        echo -e "${GREEN}✓ Gitea is running${NC}"

        # Get Gitea network name
        GITEA_NETWORK=$(docker inspect gitea 2>/dev/null | grep -oP '"NetworkMode": "\K[^"]+' | head -1)
        if [ -z "$GITEA_NETWORK" ]; then
            GITEA_NETWORK="gitea-ad_default"
        fi
        echo -e "${BLUE}Gitea network:${NC} ${GITEA_NETWORK}"
    else
        echo -e "${RED}Gitea container is not running. Please start it first.${NC}"
        exit 1
    fi
else
    echo -e "${RED}Gitea directory not found at ${GITEA_DIR}${NC}"
    exit 1
fi

# Create runner directory structure
echo -e "${YELLOW}Creating runner directory structure...${NC}"
mkdir -p ${RUNNER_DIR}/{configs,data,cache,scripts}
cd ${RUNNER_DIR}

# Generate docker-compose.yml for runners
echo -e "${YELLOW}Generating docker-compose.yml for runners...${NC}"
cat > docker-compose.yml << EOF
version: '3.8'

services:
  runner-1:
    image: gitea/act_runner:\${RUNNER_VERSION:-latest}
    container_name: gitea-runner-1
    restart: unless-stopped
    volumes:
      - ./configs/runner-1.yaml:/config.yaml:ro
      - ./data/runner-1:/data
      - ./cache:/cache:rw
      - /var/run/docker.sock:/var/run/docker.sock
    environment:
      - CONFIG_FILE=/config.yaml
      - GITEA_INSTANCE_URL=${GITEA_URL}
      - GITEA_RUNNER_NAME=docker-runner-1
      - GITEA_RUNNER_LABELS=ubuntu-latest:docker://node:20,ubuntu-22.04:docker://node:20
    networks:
      - ${GITEA_NETWORK}

  runner-2:
    image: gitea/act_runner:\${RUNNER_VERSION:-latest}
    container_name: gitea-runner-2
    restart: unless-stopped
    volumes:
      - ./configs/runner-2.yaml:/config.yaml:ro
      - ./data/runner-2:/data
      - ./cache:/cache:rw
      - /var/run/docker.sock:/var/run/docker.sock
    environment:
      - CONFIG_FILE=/config.yaml
      - GITEA_INSTANCE_URL=${GITEA_URL}
      - GITEA_RUNNER_NAME=docker-runner-2
      - GITEA_RUNNER_LABELS=ubuntu-latest:docker://node:20,ubuntu-22.04:docker://node:20
    networks:
      - ${GITEA_NETWORK}

  runner-3:
    image: gitea/act_runner:\${RUNNER_VERSION:-latest}
    container_name: gitea-runner-3
    restart: unless-stopped
    volumes:
      - ./configs/runner-3.yaml:/config.yaml:ro
      - ./data/runner-3:/data
      - ./cache:/cache:rw
      - /var/run/docker.sock:/var/run/docker.sock
    environment:
      - CONFIG_FILE=/config.yaml
      - GITEA_INSTANCE_URL=${GITEA_URL}
      - GITEA_RUNNER_NAME=docker-runner-3
      - GITEA_RUNNER_LABELS=ubuntu-latest:docker://node:20,ubuntu-22.04:docker://node:20
    networks:
      - ${GITEA_NETWORK}

networks:
  ${GITEA_NETWORK}:
    external: true
EOF

# Generate runner configurations
echo -e "${YELLOW}Generating runner configurations...${NC}"
for i in 1 2 3; do
cat > configs/runner-$i.yaml << EOF
log:
  level: info

runner:
  file: /data/.runner
  capacity: 2
  env_file: /data/.env
  timeout: 3h
  insecure: false
  fetch_timeout: 5s
  fetch_interval: 2s
  labels:
    - "ubuntu-latest:docker://node:20-bullseye"
    - "ubuntu-22.04:docker://node:20-bullseye"
    - "ubuntu-20.04:docker://node:18-bullseye"

cache:
  enabled: true
  dir: /cache
  host: ""
  port: 0

container:
  network: ${GITEA_NETWORK}
  privileged: false
  options:
  workdir_parent: /workspace
  valid_volumes:
    - /cache
  docker_host: ""

host:
  workdir_parent: /workspace
EOF
done

# Create .env file
echo -e "${YELLOW}Creating environment file...${NC}"
cat > .env << EOF
RUNNER_VERSION=${RUNNER_VERSION}
GITEA_URL=${GITEA_URL}
GITEA_NETWORK=${GITEA_NETWORK}
EOF

# Generate registration script
echo -e "${YELLOW}Creating registration script...${NC}"
cat > scripts/register-runners.sh << 'SCRIPT'
#!/bin/bash

source ../.env

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Runner Registration Script     ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}You need a registration token from your Gitea instance.${NC}"
echo -e "${YELLOW}Get it from: ${GITEA_URL}/admin/actions/runners${NC}"
echo ""
read -p "Enter your Gitea Runner registration token: " TOKEN

if [ -z "$TOKEN" ]; then
    echo -e "${RED}Token cannot be empty${NC}"
    exit 1
fi

# Register each runner
for i in 1 2 3; do
    echo -e "${YELLOW}Registering runner-$i...${NC}"

    # Clean any existing registration
    rm -f ../data/runner-$i/.runner 2>/dev/null

    docker run --rm \
        -v $(realpath ../data/runner-$i):/data \
        -v /var/run/docker.sock:/var/run/docker.sock \
        --network ${GITEA_NETWORK} \
        gitea/act_runner:${RUNNER_VERSION:-latest} \
        register \
        --no-interactive \
        --instance ${GITEA_URL} \
        --token ${TOKEN} \
        --name "docker-runner-$i" \
        --labels "ubuntu-latest:docker://node:20-bullseye,ubuntu-22.04:docker://node:20-bullseye"

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ runner-$i registered successfully${NC}"
    else
        echo -e "${RED}✗ Failed to register runner-$i${NC}"
    fi
done

echo ""
echo -e "${GREEN}Registration complete!${NC}"
echo -e "${YELLOW}Start the runners with: cd .. && docker-compose up -d${NC}"
SCRIPT

chmod +x scripts/register-runners.sh

# Generate monitoring script
echo -e "${YELLOW}Creating monitoring script...${NC}"
cat > scripts/monitor-runners.sh << 'MONITOR'
#!/bin/bash

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

clear
echo -e "${BLUE}╔══════════════════════════════════════╗${NC}"
echo -e "${BLUE}║      Gitea Runner Monitor v1.0       ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════╝${NC}"
echo ""

# Check runner status
echo -e "${YELLOW}▶ Runner Container Status:${NC}"
cd /opt/gitea-runners
docker-compose ps
echo ""

# Check if runners are connected to Gitea
echo -e "${YELLOW}▶ Runner Registration Status:${NC}"
for i in 1 2 3; do
    if [ -f "data/runner-$i/.runner" ]; then
        echo -e "${GREEN}  ✓ Runner $i: Registered${NC}"
    else
        echo -e "${RED}  ✗ Runner $i: Not registered${NC}"
    fi
done
echo ""

# Show recent logs
echo -e "${YELLOW}▶ Recent Activity (last 10 lines per runner):${NC}"
for i in 1 2 3; do
    echo -e "${BLUE}  Runner $i:${NC}"
    docker-compose logs --tail=10 runner-$i 2>/dev/null | tail -5 | sed 's/^/    /'
    echo ""
done

# Resource usage
echo -e "${YELLOW}▶ Resource Usage:${NC}"
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}" \
    gitea-runner-1 gitea-runner-2 gitea-runner-3 2>/dev/null || \
    echo "  No runners are currently running"
echo ""

# Check for running jobs
echo -e "${YELLOW}▶ Active Jobs:${NC}"
for i in 1 2 3; do
    JOBS=$(docker exec gitea-runner-$i 2>/dev/null find /workspace -type d -name "act-*" 2>/dev/null | wc -l)
    if [ "$JOBS" -gt 0 ]; then
        echo -e "${GREEN}  Runner $i: $JOBS active job(s)${NC}"
    else
        echo -e "  Runner $i: Idle"
    fi
done
MONITOR

chmod +x scripts/monitor-runners.sh

# Generate start/stop scripts
echo -e "${YELLOW}Creating management scripts...${NC}"

cat > scripts/start-runners.sh << 'START'
#!/bin/bash
cd /opt/gitea-runners
docker-compose up -d
echo "Runners started. Check status with: ./scripts/monitor-runners.sh"
START

cat > scripts/stop-runners.sh << 'STOP'
#!/bin/bash
cd /opt/gitea-runners
docker-compose down
echo "Runners stopped."
STOP

cat > scripts/restart-runners.sh << 'RESTART'
#!/bin/bash
cd /opt/gitea-runners
docker-compose restart
echo "Runners restarted. Check status with: ./scripts/monitor-runners.sh"
RESTART

cat > scripts/logs-runners.sh << 'LOGS'
#!/bin/bash
cd /opt/gitea-runners
docker-compose logs -f --tail=50
LOGS

chmod +x scripts/*.sh

# Generate systemd service
echo -e "${YELLOW}Creating systemd service file...${NC}"
cat > gitea-runners.service << SERVICE
[Unit]
Description=Gitea CI/CD Runners
Requires=docker.service
After=docker.service gitea.service
StartLimitIntervalSec=0

[Service]
Type=forking
RemainAfterExit=yes
WorkingDirectory=${RUNNER_DIR}
ExecStart=/usr/local/bin/docker-compose up -d
ExecStop=/usr/local/bin/docker-compose down
ExecReload=/usr/local/bin/docker-compose restart
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
SERVICE

# Set proper permissions
chown -R root:docker ${RUNNER_DIR} 2>/dev/null || chown -R root:root ${RUNNER_DIR}
chmod -R 755 ${RUNNER_DIR}

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║        Setup Complete! Next Steps:       ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}1. Register the runners:${NC}"
echo -e "   ${YELLOW}cd ${RUNNER_DIR}/scripts${NC}"
echo -e "   ${YELLOW}./register-runners.sh${NC}"
echo ""
echo -e "${BLUE}2. Start the runners:${NC}"
echo -e "   ${YELLOW}cd ${RUNNER_DIR}${NC}"
echo -e "   ${YELLOW}docker-compose up -d${NC}"
echo ""
echo -e "${BLUE}3. Monitor runner status:${NC}"
echo -e "   ${YELLOW}${RUNNER_DIR}/scripts/monitor-runners.sh${NC}"
echo ""
echo -e "${BLUE}Optional: Install as system service:${NC}"
echo -e "   ${YELLOW}cp ${RUNNER_DIR}/gitea-runners.service /etc/systemd/system/${NC}"
echo -e "   ${YELLOW}systemctl daemon-reload${NC}"
echo -e "   ${YELLOW}systemctl enable gitea-runners${NC}"
echo -e "   ${YELLOW}systemctl start gitea-runners${NC}"
echo ""
echo -e "${GREEN}Runner directory: ${RUNNER_DIR}${NC}"
echo -e "${GREEN}Configuration: ${RUNNER_DIR}/docker-compose.yml${NC}"
echo -e "${GREEN}Scripts: ${RUNNER_DIR}/scripts/${NC}"