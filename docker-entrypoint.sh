#!/bin/sh
# Docker entrypoint script to configure runtime environment

# Default URLs for Docker Compose networking
SEARXNG_URL=${SEARXNG_URL:-http://searxng-cora:8080}
TXTAI_URL=${TXTAI_URL:-http://txtai-cora:8001}

# Create runtime config file with environment variables
cat > /usr/share/nginx/html/config.js << EOF
// Runtime configuration for Cora
// Generated at container startup
window.APP_CONFIG = {
  SEARXNG_URL: '${SEARXNG_URL}',
  TXTAI_URL: '${TXTAI_URL}'
};
EOF

echo "Configured SearXNG URL: ${SEARXNG_URL}"
echo "Configured txtai URL: ${TXTAI_URL}"

# Start nginx
exec nginx -g 'daemon off;'