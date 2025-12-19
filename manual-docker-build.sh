#!/bin/bash

# Manual Docker Build and Push Script for Cora
# This bypasses CI/CD and pushes directly to the registry

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}Manual Docker Build & Push for Cora${NC}"
echo ""

# Configuration
REGISTRY="git.oe74.net"
IMAGE_NAME="adelorenzo/cora-ai"
FULL_IMAGE="${REGISTRY}/${IMAGE_NAME}"

# Get version from git tag or use latest
VERSION=$(git describe --tags --abbrev=0 2>/dev/null || echo "latest")
echo -e "${YELLOW}Building version: ${VERSION}${NC}"

# Step 1: Build the Docker image
echo -e "\n${YELLOW}Step 1: Building Docker image...${NC}"
docker build -t ${FULL_IMAGE}:${VERSION} -t ${FULL_IMAGE}:latest -f Dockerfile .

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Image built successfully${NC}"
else
    echo -e "${RED}✗ Build failed${NC}"
    exit 1
fi

# Step 2: Login to Gitea registry
echo -e "\n${YELLOW}Step 2: Login to Gitea Container Registry${NC}"
echo -e "${YELLOW}Please enter your Gitea credentials:${NC}"
docker login ${REGISTRY}

# Step 3: Push the image
echo -e "\n${YELLOW}Step 3: Pushing image to registry...${NC}"
docker push ${FULL_IMAGE}:${VERSION}
docker push ${FULL_IMAGE}:latest

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Image pushed successfully${NC}"
else
    echo -e "${RED}✗ Push failed${NC}"
    exit 1
fi

# Step 4: Verify
echo -e "\n${GREEN}✅ Success! Container available at:${NC}"
echo -e "  ${FULL_IMAGE}:${VERSION}"
echo -e "  ${FULL_IMAGE}:latest"
echo ""
echo -e "${YELLOW}To pull the image:${NC}"
echo -e "  docker pull ${FULL_IMAGE}:latest"
echo ""
echo -e "${YELLOW}To run the container:${NC}"
echo -e "  docker run -p 8000:8000 ${FULL_IMAGE}:latest"