#!/bin/bash

# Gitea Runner Setup Script
# This script automates the setup of Gitea Runners for your CI/CD pipeline

set -e

# Configuration
GITEA_URL="https://git.oe74.net"
RUNNER_VERSION="0.2.11"
RUNNERS_COUNT=3

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Gitea Runner Setup Script ===${NC}"
echo ""

# Check if running as root
if [ "$EUID" -eq 0 ]; then
   echo -e "${RED}Please do not run this script as root${NC}"
   exit 1
fi

# Check Docker installation
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Docker is not installed. Please install Docker first.${NC}"
    exit 1
fi

# Check Docker Compose installation
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}Docker Compose is not installed. Please install Docker Compose first.${NC}"
    exit 1
fi

# Create runner directory structure
echo -e "${YELLOW}Creating directory structure...${NC}"
mkdir -p gitea-runner/{configs,data,cache}
cd gitea-runner

# Generate docker-compose.yml
echo -e "${YELLOW}Generating docker-compose.yml...${NC}"
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  runner-1:
    image: gitea/act_runner:${RUNNER_VERSION:-latest}
    container_name: gitea-runner-1
    restart: unless-stopped
    volumes:
      - ./configs/runner-1.yaml:/config.yaml:ro
      - ./data/runner-1:/data
      - ./cache:/cache
      - /var/run/docker.sock:/var/run/docker.sock
    environment:
      - CONFIG_FILE=/config.yaml
      - GITEA_INSTANCE_URL=${GITEA_URL}
      - GITEA_RUNNER_NAME=runner-1
      - GITEA_RUNNER_LABELS=ubuntu-latest:docker://node:20,ubuntu-22.04:docker://node:20
    networks:
      - gitea-network

  runner-2:
    image: gitea/act_runner:${RUNNER_VERSION:-latest}
    container_name: gitea-runner-2
    restart: unless-stopped
    volumes:
      - ./configs/runner-2.yaml:/config.yaml:ro
      - ./data/runner-2:/data
      - ./cache:/cache
      - /var/run/docker.sock:/var/run/docker.sock
    environment:
      - CONFIG_FILE=/config.yaml
      - GITEA_INSTANCE_URL=${GITEA_URL}
      - GITEA_RUNNER_NAME=runner-2
      - GITEA_RUNNER_LABELS=ubuntu-latest:docker://node:20,ubuntu-22.04:docker://node:20
    networks:
      - gitea-network

  runner-3:
    image: gitea/act_runner:${RUNNER_VERSION:-latest}
    container_name: gitea-runner-3
    restart: unless-stopped
    volumes:
      - ./configs/runner-3.yaml:/config.yaml:ro
      - ./data/runner-3:/data
      - ./cache:/cache
      - /var/run/docker.sock:/var/run/docker.sock
    environment:
      - CONFIG_FILE=/config.yaml
      - GITEA_INSTANCE_URL=${GITEA_URL}
      - GITEA_RUNNER_NAME=runner-3
      - GITEA_RUNNER_LABELS=ubuntu-latest:docker://node:20,ubuntu-22.04:docker://node:20
    networks:
      - gitea-network

networks:
  gitea-network:
    external: true
    name: gitea_default
EOF

# Generate base runner config
echo -e "${YELLOW}Generating runner configurations...${NC}"
for i in 1 2 3; do
cat > configs/runner-$i.yaml << 'EOF'
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

cache:
  enabled: true
  dir: /cache
  host: ""
  port: 0

container:
  network: gitea-network
  privileged: false
  options:
  workdir_parent:
  valid_volumes:
    - /cache
  docker_host: ""

host:
  workdir_parent:
EOF
done

# Create .env file for environment variables
echo -e "${YELLOW}Creating environment file...${NC}"
cat > .env << EOF
RUNNER_VERSION=${RUNNER_VERSION}
GITEA_URL=${GITEA_URL}
EOF

# Generate registration script
echo -e "${YELLOW}Creating registration script...${NC}"
cat > register-runners.sh << 'SCRIPT'
#!/bin/bash

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}Runner Registration${NC}"
echo ""
echo "You need a registration token from your Gitea instance."
echo "Get it from: ${GITEA_URL}/admin/actions/runners"
echo ""
read -p "Enter your Gitea Runner registration token: " TOKEN

if [ -z "$TOKEN" ]; then
    echo -e "${RED}Token cannot be empty${NC}"
    exit 1
fi

# Register each runner
for i in 1 2 3; do
    echo -e "${YELLOW}Registering runner-$i...${NC}"

    docker run --rm \
        -v $(pwd)/data/runner-$i:/data \
        gitea/act_runner:${RUNNER_VERSION:-latest} \
        register \
        --instance ${GITEA_URL} \
        --token ${TOKEN} \
        --name "runner-$i" \
        --labels "ubuntu-latest:docker://node:20,ubuntu-22.04:docker://node:20"

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}runner-$i registered successfully${NC}"
    else
        echo -e "${RED}Failed to register runner-$i${NC}"
    fi
done

echo ""
echo -e "${GREEN}Registration complete!${NC}"
echo "Start the runners with: docker-compose up -d"
SCRIPT

chmod +x register-runners.sh

# Generate monitoring script
echo -e "${YELLOW}Creating monitoring script...${NC}"
cat > monitor-runners.sh << 'MONITOR'
#!/bin/bash

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}=== Gitea Runner Monitor ===${NC}"
echo ""

# Check runner status
echo -e "${YELLOW}Runner Status:${NC}"
docker-compose ps

echo ""
echo -e "${YELLOW}Runner Logs (last 20 lines):${NC}"
for i in 1 2 3; do
    echo -e "${GREEN}--- Runner $i ---${NC}"
    docker-compose logs --tail=20 runner-$i 2>/dev/null | tail -5
done

echo ""
echo -e "${YELLOW}Resource Usage:${NC}"
docker stats --no-stream $(docker-compose ps -q)
MONITOR

chmod +x monitor-runners.sh

# Generate systemd service file
echo -e "${YELLOW}Creating systemd service file...${NC}"
cat > gitea-runners.service << SERVICE
[Unit]
Description=Gitea Runners
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=$(pwd)
ExecStart=/usr/local/bin/docker-compose up -d
ExecStop=/usr/local/bin/docker-compose down
ExecReload=/usr/local/bin/docker-compose restart

[Install]
WantedBy=multi-user.target
SERVICE

echo ""
echo -e "${GREEN}=== Setup Complete ===${NC}"
echo ""
echo -e "Next steps:"
echo -e "1. ${YELLOW}cd gitea-runner${NC}"
echo -e "2. ${YELLOW}./register-runners.sh${NC} - Register runners with your Gitea instance"
echo -e "3. ${YELLOW}docker-compose up -d${NC} - Start the runners"
echo -e "4. ${YELLOW}./monitor-runners.sh${NC} - Monitor runner status"
echo ""
echo -e "Optional: Install as systemd service:"
echo -e "  ${YELLOW}sudo cp gitea-runners.service /etc/systemd/system/${NC}"
echo -e "  ${YELLOW}sudo systemctl daemon-reload${NC}"
echo -e "  ${YELLOW}sudo systemctl enable gitea-runners${NC}"
echo -e "  ${YELLOW}sudo systemctl start gitea-runners${NC}"
echo ""
echo -e "${GREEN}Documentation: GITEA_RUNNER_SETUP.md${NC}"