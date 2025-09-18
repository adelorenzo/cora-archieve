# Multi-stage Dockerfile for Cora AI Assistant
# v1.3.0 - Fixed MIME types with proper nginx mime.types

# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY web/package*.json ./
RUN npm ci
COPY web/ ./
RUN npm run build

# Stage 2: Production
FROM nginx:alpine

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy built application
COPY --from=builder /app/dist /usr/share/nginx/html

# Create custom MIME types configuration
RUN cat > /etc/nginx/mime.types << 'EOF'
types {
    text/html                             html htm shtml;
    text/css                              css;
    text/xml                              xml;
    image/gif                             gif;
    image/jpeg                            jpeg jpg;
    application/javascript                js mjs jsx;
    application/json                      json;
    application/wasm                      wasm;
    text/plain                            txt;
    image/png                             png;
    image/svg+xml                         svg svgz;
    image/webp                            webp;
    image/x-icon                          ico;
    font/woff                             woff;
    font/woff2                            woff2;
    application/font-woff                 woff;
    application/x-font-ttf                ttf;
    font/opentype                         otf;
    application/octet-stream              bin exe dll;
    application/octet-stream              deb;
    application/octet-stream              dmg;
    application/octet-stream              iso img;
    application/octet-stream              msi msp msm;
}
EOF

# Create nginx server configuration
RUN cat > /etc/nginx/conf.d/default.conf << 'EOF'
server {
    listen 8000;
    listen [::]:8000;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    # SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/json application/wasm;
}
EOF

EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8000/ || exit 1

CMD ["nginx", "-g", "daemon off;"]