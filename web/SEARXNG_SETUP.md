# Local SearXNG Setup for Web Search

## Quick Start

### 1. Start SearXNG with Docker

```bash
# From the web directory
docker-compose up -d

# Check if it's running
docker ps | grep searxng
```

### 2. Verify Installation

Open http://localhost:8888 in your browser. You should see the SearXNG search interface.

### 3. Test API Access

```bash
# Test JSON API
curl "http://localhost:8888/search?q=test&format=json"
```

## How It Works

1. **Local First**: The app tries `localhost:8888` first (no CORS issues!)
2. **Automatic Fallback**: If local instance is down, falls back to public instances
3. **No API Keys**: SearXNG aggregates results from multiple search engines
4. **Full Results**: Get real search results instead of simulated responses

## Benefits Over Public Instances

- ✅ **No CORS issues** - Direct local access
- ✅ **No rate limiting** - It's your own instance
- ✅ **Better privacy** - Searches don't go through third parties
- ✅ **Reliable** - Not dependent on public instance availability
- ✅ **Fast** - Local network latency only

## Configuration

The configuration is in `searxng/settings.yml`. Key settings:

- **Engines**: Google, Bing, DuckDuckGo, Wikipedia, GitHub, StackOverflow
- **Rate Limiting**: Disabled for local use
- **JSON Format**: Enabled for API access
- **CORS**: Configured for localhost access

## Troubleshooting

### Port Already in Use
```bash
# Change port in docker-compose.yml
ports:
  - "8889:8080"  # Use different port

# Update web-search-service.js
'http://localhost:8889'
```

### Container Won't Start
```bash
# Check logs
docker logs searxng

# Restart
docker-compose restart searxng
```

### No Search Results
- Check if engines are enabled in `searxng/settings.yml`
- Some engines may require additional configuration

## Stop/Remove

```bash
# Stop container
docker-compose stop

# Remove container and network
docker-compose down

# Remove with volumes
docker-compose down -v
```

## Alternative: Direct Binary Installation

If you prefer not to use Docker:

```bash
# Install SearXNG from source
git clone https://github.com/searxng/searxng.git
cd searxng
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python searx/webapp.py
```

The app will automatically use the local instance when available!