# Docker Compose Setup for Cora with SearXNG

This Docker Compose configuration runs Cora with an integrated SearXNG instance for web search capabilities.

## Services

### 1. Cora (cora-dev)
- **Port**: 8000
- **Features**: Full AI assistant with WebGPU/WASM support
- **Web Search**: Integrated with SearXNG

### 2. SearXNG (searxng)
- **Internal Only**: No external ports exposed
- **Access**: Via Docker internal network at `http://searxng:8080`
- **Privacy**: All searches remain local

## Quick Start

1. Build and run both services:
```bash
docker-compose up --build
```

2. Access Cora at:
```
http://localhost:8000
```

3. Web search is automatically configured to use the internal SearXNG instance.

## Configuration

### Environment Variables

The setup uses the following environment variables:

- `SEARXNG_URL`: Automatically set to `http://searxng:8080` for internal networking
- `SEARXNG_SECRET_KEY`: Can be customized (default: ultrasecretkey)

### Profiles

- **Default**: Runs `cora-dev` and `searxng` services
- **Production**: Use `--profile production` to run with production image
- **Registry**: Use `--profile registry` to run from Gitea registry

## Commands

```bash
# Start services
docker-compose up

# Start with build
docker-compose up --build

# Run in background
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

## Network Architecture

```
┌─────────────────┐
│   Browser       │
│  localhost:8000 │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Cora (nginx)  │◄──── Port 8000 exposed
│   Container     │
└────────┬────────┘
         │
         │ Internal Network
         │ http://searxng:8080
         ▼
┌─────────────────┐
│   SearXNG       │◄──── No external ports
│   Container     │      (Internal only)
└─────────────────┘
```

## Troubleshooting

### Web search not working
- Check if SearXNG container is running: `docker-compose ps`
- View SearXNG logs: `docker-compose logs searxng`
- Ensure both containers are on the same network: `docker network ls`

### Cannot access Cora
- Ensure port 8000 is not in use: `lsof -i :8000`
- Check Cora logs: `docker-compose logs cora-dev`

### Building issues
- Clear Docker cache: `docker-compose build --no-cache`
- Remove old containers: `docker-compose down --rmi all`

## Security

- SearXNG runs internally only (no external access)
- All searches are private and local
- No data leaves your local network
- LLM models stored in browser (IndexedDB)

## Development

To modify the SearXNG URL for development:

1. Edit `docker-compose.yml`
2. Change the `SEARXNG_URL` environment variable
3. Rebuild: `docker-compose up --build`

## Production Deployment

For production use, consider:

1. Using the production profile
2. Setting secure `SEARXNG_SECRET_KEY`
3. Implementing HTTPS with reverse proxy
4. Adding resource limits to containers