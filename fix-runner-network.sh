#!/bin/bash

# Script to fix Gitea Runner network configuration

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔══════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Gitea Runner Network Fix Script        ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════╝${NC}"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
   echo -e "${YELLOW}This script needs sudo privileges${NC}"
   exec sudo "$0" "$@"
fi

echo -e "${YELLOW}Step 1: Finding the correct Gitea network...${NC}"
echo ""

# List all Docker networks
echo -e "${BLUE}Available Docker networks:${NC}"
docker network ls

echo ""
echo -e "${YELLOW}Step 2: Finding Gitea container network...${NC}"

# Try to find the Gitea container and its network
GITEA_CONTAINER=$(docker ps --format "table {{.Names}}" | grep -i gitea | head -1)

if [ -n "$GITEA_CONTAINER" ]; then
    echo -e "${GREEN}Found Gitea container: ${GITEA_CONTAINER}${NC}"

    # Get the actual network name
    NETWORK_NAME=$(docker inspect ${GITEA_CONTAINER} --format='{{range $net,$v := .NetworkSettings.Networks}}{{$net}}{{end}}' | head -1)
    echo -e "${GREEN}Gitea is using network: ${NETWORK_NAME}${NC}"
else
    echo -e "${RED}Could not find Gitea container automatically${NC}"
    echo -e "${YELLOW}Please check the container name with: docker ps${NC}"
    echo ""

    # Manual detection
    echo "Looking for networks with 'gitea' in the name:"
    docker network ls | grep -i gitea || echo "No networks found with 'gitea' in the name"

    echo ""
    read -p "Enter the name of your Gitea container: " GITEA_CONTAINER

    if [ -n "$GITEA_CONTAINER" ]; then
        NETWORK_NAME=$(docker inspect ${GITEA_CONTAINER} --format='{{range $net,$v := .NetworkSettings.Networks}}{{$net}}{{end}}' | head -1)
        echo -e "${GREEN}Gitea is using network: ${NETWORK_NAME}${NC}"
    else
        echo -e "${YELLOW}Please manually enter the network name:${NC}"
        read -p "Network name: " NETWORK_NAME
    fi
fi

if [ -z "$NETWORK_NAME" ] || [ "$NETWORK_NAME" == "bridge" ] || [ "$NETWORK_NAME" == "host" ]; then
    echo -e "${RED}Invalid or default network detected.${NC}"
    echo -e "${YELLOW}Creating a custom network for Gitea and runners...${NC}"

    # Create a custom network
    NETWORK_NAME="gitea-network"
    docker network create ${NETWORK_NAME} 2>/dev/null || echo "Network ${NETWORK_NAME} already exists"

    echo -e "${YELLOW}Connecting Gitea container to ${NETWORK_NAME}...${NC}"
    docker network connect ${NETWORK_NAME} ${GITEA_CONTAINER} 2>/dev/null || echo "Already connected"
fi

echo ""
echo -e "${GREEN}✓ Network configuration determined: ${NETWORK_NAME}${NC}"

# Update the .env file
echo -e "${YELLOW}Step 3: Updating configuration files...${NC}"

if [ -f /opt/gitea-runners/.env ]; then
    # Backup existing .env
    cp /opt/gitea-runners/.env /opt/gitea-runners/.env.backup

    # Update the GITEA_NETWORK variable
    sed -i "s/^GITEA_NETWORK=.*/GITEA_NETWORK=${NETWORK_NAME}/" /opt/gitea-runners/.env
    echo -e "${GREEN}✓ Updated .env file${NC}"
fi

# Update docker-compose.yml
if [ -f /opt/gitea-runners/docker-compose.yml ]; then
    # Backup existing docker-compose.yml
    cp /opt/gitea-runners/docker-compose.yml /opt/gitea-runners/docker-compose.yml.backup

    # Update the network references
    sed -i "s/gitea-ad_default/${NETWORK_NAME}/g" /opt/gitea-runners/docker-compose.yml
    echo -e "${GREEN}✓ Updated docker-compose.yml${NC}"
fi

# Update runner configs
for i in 1 2 3; do
    if [ -f /opt/gitea-runners/configs/runner-$i.yaml ]; then
        sed -i "s/network:.*/network: ${NETWORK_NAME}/" /opt/gitea-runners/configs/runner-$i.yaml
        echo -e "${GREEN}✓ Updated runner-$i.yaml${NC}"
    fi
done

# Create updated registration script
echo -e "${YELLOW}Step 4: Creating fixed registration script...${NC}"

cat > /opt/gitea-runners/scripts/register-runners-fixed.sh << SCRIPT
#!/bin/bash

# Fixed registration script with correct network

# Configuration
GITEA_URL="https://git.oe74.net"
RUNNER_VERSION="0.2.11"
NETWORK_NAME="${NETWORK_NAME}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "\${BLUE}╔════════════════════════════════════╗\${NC}"
echo -e "\${BLUE}║   Fixed Runner Registration Script  ║\${NC}"
echo -e "\${BLUE}╚════════════════════════════════════╝\${NC}"
echo ""
echo -e "\${GREEN}Using network: \${NETWORK_NAME}\${NC}"
echo ""
echo -e "\${YELLOW}You need a registration token from your Gitea instance.\${NC}"
echo -e "\${YELLOW}Get it from: \${GITEA_URL}/admin/actions/runners\${NC}"
echo ""
read -p "Enter your Gitea Runner registration token: " TOKEN

if [ -z "\$TOKEN" ]; then
    echo -e "\${RED}Token cannot be empty\${NC}"
    exit 1
fi

# Register each runner WITHOUT the --network flag for registration
for i in 1 2 3; do
    echo -e "\${YELLOW}Registering runner-\$i...\${NC}"

    # Clean any existing registration
    rm -f /opt/gitea-runners/data/runner-\$i/.runner 2>/dev/null

    # Register without network flag (registration doesn't need network access)
    docker run --rm \
        -v /opt/gitea-runners/data/runner-\$i:/data \
        gitea/act_runner:\${RUNNER_VERSION} \
        register \
        --no-interactive \
        --instance \${GITEA_URL} \
        --token \${TOKEN} \
        --name "docker-runner-\$i" \
        --labels "ubuntu-latest:docker://node:20,ubuntu-22.04:docker://node:20"

    if [ \$? -eq 0 ]; then
        echo -e "\${GREEN}✓ runner-\$i registered successfully\${NC}"
    else
        echo -e "\${RED}✗ Failed to register runner-\$i\${NC}"
    fi
done

echo ""
echo -e "\${GREEN}Registration complete!\${NC}"
echo -e "\${YELLOW}Start the runners with: cd /opt/gitea-runners && docker-compose up -d\${NC}"
SCRIPT

chmod +x /opt/gitea-runners/scripts/register-runners-fixed.sh

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║         Fix Applied Successfully!         ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Network configuration fixed to: ${NETWORK_NAME}${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo -e "1. ${GREEN}cd /opt/gitea-runners/scripts${NC}"
echo -e "2. ${GREEN}./register-runners-fixed.sh${NC}"
echo -e "3. ${GREEN}cd /opt/gitea-runners && docker-compose up -d${NC}"
echo ""

# Show the current network status
echo -e "${BLUE}Current Docker network status:${NC}"
docker network inspect ${NETWORK_NAME} --format='Name: {{.Name}}
Driver: {{.Driver}}
Containers connected: {{len .Containers}}'

echo ""
echo -e "${YELLOW}If registration still fails, try the alternative approach:${NC}"
echo -e "1. Use host network for registration only"
echo -e "2. The runners will use the correct network when running"