#!/bin/bash

# Correct Gitea Runner Registration using official documentation
# Based on https://docs.gitea.com/usage/actions/act-runner

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${GREEN}╔══════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   Official Gitea Runner Registration      ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════╝${NC}"
echo ""

# Configuration
GITEA_URL="https://git.oe74.net"
RUNNER_VERSION="0.2.11"

echo -e "${YELLOW}Get your registration token from one of these locations:${NC}"
echo -e "  1. Instance level: ${GITEA_URL}/admin/actions/runners"
echo -e "  2. Organization level: ${GITEA_URL}/<org>/settings/actions/runners"
echo -e "  3. Repository level: ${GITEA_URL}/<owner>/<repo>/settings/actions/runners"
echo ""
read -p "Enter your Gitea Runner registration token: " TOKEN

if [ -z "$TOKEN" ]; then
    echo -e "${RED}Token cannot be empty${NC}"
    exit 1
fi

# Create data directories
echo -e "${YELLOW}Creating data directories...${NC}"
sudo mkdir -p /opt/gitea-runners/data/runner-{1,2,3}

echo ""
echo -e "${BLUE}Choose registration method:${NC}"
echo "  1. Docker with environment variables (Recommended)"
echo "  2. Interactive mode"
echo "  3. Non-interactive with parameters"
read -p "Select method (1-3): " METHOD

case $METHOD in
    1)
        echo -e "${GREEN}Method 1: Docker with Environment Variables${NC}"
        echo ""

        for i in 1 2 3; do
            echo -e "${YELLOW}Registering runner-$i...${NC}"

            # Using the official method with environment variables
            sudo docker run --rm \
                -v /opt/gitea-runners/data/runner-$i:/data \
                -e GITEA_INSTANCE_URL="${GITEA_URL}" \
                -e GITEA_RUNNER_REGISTRATION_TOKEN="${TOKEN}" \
                -e GITEA_RUNNER_NAME="docker-runner-$i" \
                -e GITEA_RUNNER_LABELS="ubuntu-latest:docker://node:20,ubuntu-22.04:docker://node:20" \
                gitea/act_runner:${RUNNER_VERSION}

            if [ $? -eq 0 ]; then
                echo -e "${GREEN}✓ runner-$i registered successfully${NC}"
            else
                echo -e "${RED}✗ Failed to register runner-$i${NC}"
            fi
            echo ""
        done
        ;;

    2)
        echo -e "${GREEN}Method 2: Interactive Registration${NC}"
        echo ""

        for i in 1 2 3; do
            echo -e "${YELLOW}Registering runner-$i interactively...${NC}"
            echo -e "${BLUE}When prompted, enter:${NC}"
            echo "  Instance URL: ${GITEA_URL}"
            echo "  Token: [your token]"
            echo "  Runner name: docker-runner-$i"
            echo "  Labels: ubuntu-latest:docker://node:20,ubuntu-22.04:docker://node:20"
            echo ""

            sudo docker run --rm -it \
                -v /opt/gitea-runners/data/runner-$i:/data \
                gitea/act_runner:${RUNNER_VERSION} \
                register

            echo ""
        done
        ;;

    3)
        echo -e "${GREEN}Method 3: Non-Interactive with Parameters${NC}"
        echo ""

        for i in 1 2 3; do
            echo -e "${YELLOW}Registering runner-$i...${NC}"

            sudo docker run --rm \
                -v /opt/gitea-runners/data/runner-$i:/data \
                gitea/act_runner:${RUNNER_VERSION} \
                register \
                --no-interactive \
                --instance "${GITEA_URL}" \
                --token "${TOKEN}" \
                --name "docker-runner-$i" \
                --labels "ubuntu-latest:docker://node:20,ubuntu-22.04:docker://node:20"

            if [ $? -eq 0 ]; then
                echo -e "${GREEN}✓ runner-$i registered successfully${NC}"
            else
                echo -e "${RED}✗ Failed to register runner-$i${NC}"
            fi
            echo ""
        done
        ;;

    *)
        echo -e "${RED}Invalid selection${NC}"
        exit 1
        ;;
esac

# Verify registration
echo -e "${YELLOW}Verifying registration...${NC}"
for i in 1 2 3; do
    if [ -f /opt/gitea-runners/data/runner-$i/.runner ]; then
        echo -e "${GREEN}✓ Runner $i: Configuration file exists${NC}"
    else
        echo -e "${RED}✗ Runner $i: No configuration file found${NC}"
    fi
done

# Update docker-compose.yml to ensure correct configuration
echo ""
echo -e "${YELLOW}Updating docker-compose.yml...${NC}"

cat > /opt/gitea-runners/docker-compose.yml << 'EOF'
version: '3.8'

services:
  runner-1:
    image: gitea/act_runner:0.2.11
    container_name: gitea-runner-1
    restart: unless-stopped
    volumes:
      - ./data/runner-1:/data
      - /var/run/docker.sock:/var/run/docker.sock
    environment:
      - CONFIG_FILE=/data/.runner
      - GITEA_RUNNER_NAME=docker-runner-1
    networks:
      - gitea-ad_gitea-ad

  runner-2:
    image: gitea/act_runner:0.2.11
    container_name: gitea-runner-2
    restart: unless-stopped
    volumes:
      - ./data/runner-2:/data
      - /var/run/docker.sock:/var/run/docker.sock
    environment:
      - CONFIG_FILE=/data/.runner
      - GITEA_RUNNER_NAME=docker-runner-2
    networks:
      - gitea-ad_gitea-ad

  runner-3:
    image: gitea/act_runner:0.2.11
    container_name: gitea-runner-3
    restart: unless-stopped
    volumes:
      - ./data/runner-3:/data
      - /var/run/docker.sock:/var/run/docker.sock
    environment:
      - CONFIG_FILE=/data/.runner
      - GITEA_RUNNER_NAME=docker-runner-3
    networks:
      - gitea-ad_gitea-ad

networks:
  gitea-ad_gitea-ad:
    external: true
EOF

echo -e "${GREEN}✓ docker-compose.yml updated${NC}"

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║      Registration Complete! Next Steps    ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}1. Start the runners:${NC}"
echo -e "   ${YELLOW}cd /opt/gitea-runners${NC}"
echo -e "   ${YELLOW}sudo docker-compose up -d${NC}"
echo ""
echo -e "${BLUE}2. Check status:${NC}"
echo -e "   ${YELLOW}sudo docker-compose ps${NC}"
echo -e "   ${YELLOW}sudo docker-compose logs -f${NC}"
echo ""
echo -e "${BLUE}3. Verify in Gitea:${NC}"
echo -e "   Go to ${GITEA_URL}/admin/actions/runners"
echo -e "   You should see your 3 runners listed as 'Idle'"
echo ""

# Create a daemon script for running runners
cat > /opt/gitea-runners/start-runners-daemon.sh << 'DAEMON'
#!/bin/bash
cd /opt/gitea-runners
docker-compose up -d
echo "Runners started in background"
docker-compose ps
DAEMON

chmod +x /opt/gitea-runners/start-runners-daemon.sh

echo -e "${GREEN}Helper script created: /opt/gitea-runners/start-runners-daemon.sh${NC}"