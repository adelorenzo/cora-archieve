#!/bin/bash

# Quick fix for Gitea Runner network configuration
# Network found: gitea-ad_gitea-ad

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${GREEN}╔══════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   Quick Fix for Gitea Runners Network    ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Found network: gitea-ad_gitea-ad${NC}"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
   echo -e "${YELLOW}This script needs sudo privileges${NC}"
   exec sudo "$0" "$@"
fi

# Update configuration files
echo -e "${YELLOW}Updating configuration files...${NC}"

# Update .env file
if [ -f /opt/gitea-runners/.env ]; then
    sed -i "s/^GITEA_NETWORK=.*/GITEA_NETWORK=gitea-ad_gitea-ad/" /opt/gitea-runners/.env
    echo -e "${GREEN}✓ Updated .env file${NC}"
else
    echo -e "${YELLOW}Creating .env file...${NC}"
    cat > /opt/gitea-runners/.env << EOF
RUNNER_VERSION=0.2.11
GITEA_URL=https://git.oe74.net
GITEA_NETWORK=gitea-ad_gitea-ad
EOF
fi

# Update docker-compose.yml
if [ -f /opt/gitea-runners/docker-compose.yml ]; then
    # Fix the network name in docker-compose.yml
    sed -i "s/gitea-ad_default/gitea-ad_gitea-ad/g" /opt/gitea-runners/docker-compose.yml
    sed -i "s/\${GITEA_NETWORK}/gitea-ad_gitea-ad/g" /opt/gitea-runners/docker-compose.yml

    # Ensure the network section is correct
    sed -i '/^networks:/,/^[^ ]/{
        s/gitea-ad_default:/gitea-ad_gitea-ad:/
        s/external: true/external: true/
    }' /opt/gitea-runners/docker-compose.yml

    echo -e "${GREEN}✓ Updated docker-compose.yml${NC}"
fi

# Update runner configs
for i in 1 2 3; do
    if [ -f /opt/gitea-runners/configs/runner-$i.yaml ]; then
        sed -i "s/network:.*/network: gitea-ad_gitea-ad/" /opt/gitea-runners/configs/runner-$i.yaml
        echo -e "${GREEN}✓ Updated runner-$i.yaml${NC}"
    fi
done

# Create simple registration script that works
cat > /opt/gitea-runners/register-simple.sh << 'SCRIPT'
#!/bin/bash

# Simple registration script without network complications

GITEA_URL="https://git.oe74.net"
RUNNER_VERSION="0.2.11"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Simple Runner Registration        ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Get your token from: ${GITEA_URL}/admin/actions/runners${NC}"
echo ""
read -p "Enter your Gitea Runner registration token: " TOKEN

if [ -z "$TOKEN" ]; then
    echo -e "${RED}Token cannot be empty${NC}"
    exit 1
fi

# Create data directories if they don't exist
mkdir -p /opt/gitea-runners/data/runner-{1,2,3}

# Register each runner (no network needed for registration)
for i in 1 2 3; do
    echo -e "${YELLOW}Registering runner-$i...${NC}"

    # Remove any existing registration
    rm -f /opt/gitea-runners/data/runner-$i/.runner 2>/dev/null

    # Register without network (registration doesn't need it)
    docker run --rm \
        -v /opt/gitea-runners/data/runner-$i:/data \
        gitea/act_runner:${RUNNER_VERSION} \
        register \
        --no-interactive \
        --instance ${GITEA_URL} \
        --token ${TOKEN} \
        --name "docker-runner-$i" \
        --labels "ubuntu-latest:docker://node:20,ubuntu-22.04:docker://node:20"

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ runner-$i registered successfully${NC}"
    else
        echo -e "${RED}✗ Failed to register runner-$i${NC}"
    fi
done

echo ""
echo -e "${GREEN}Registration complete!${NC}"
echo ""
echo -e "${YELLOW}Now start the runners:${NC}"
echo -e "${GREEN}cd /opt/gitea-runners${NC}"
echo -e "${GREEN}docker-compose up -d${NC}"
SCRIPT

chmod +x /opt/gitea-runners/register-simple.sh

# Verify the network exists
echo ""
echo -e "${YELLOW}Verifying network configuration...${NC}"
if docker network ls | grep -q "gitea-ad_gitea-ad"; then
    echo -e "${GREEN}✓ Network 'gitea-ad_gitea-ad' exists${NC}"

    # Show what's connected to the network
    echo -e "${BLUE}Containers on this network:${NC}"
    docker network inspect gitea-ad_gitea-ad --format='{{range .Containers}}  - {{.Name}}{{"\n"}}{{end}}' 2>/dev/null || echo "  No containers currently connected"
else
    echo -e "${RED}✗ Network 'gitea-ad_gitea-ad' not found${NC}"
fi

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║           Fix Complete!                   ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo ""
echo -e "1. ${YELLOW}Register the runners:${NC}"
echo -e "   ${GREEN}/opt/gitea-runners/register-simple.sh${NC}"
echo ""
echo -e "2. ${YELLOW}Start the runners:${NC}"
echo -e "   ${GREEN}cd /opt/gitea-runners${NC}"
echo -e "   ${GREEN}docker-compose up -d${NC}"
echo ""
echo -e "3. ${YELLOW}Check status:${NC}"
echo -e "   ${GREEN}docker-compose ps${NC}"
echo -e "   ${GREEN}docker-compose logs -f${NC}"
echo ""
echo -e "${BLUE}The network 'gitea-ad_gitea-ad' will be used when runners start.${NC}"