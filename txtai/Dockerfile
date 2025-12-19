# txtai Dockerfile for Cora RAG service
# Lightweight document processing and vector search

FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    make \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Install txtai and dependencies
RUN pip install --no-cache-dir \
    txtai \
    fastapi \
    uvicorn[standard] \
    python-multipart \
    pypdf \
    python-docx \
    openpyxl \
    markdown \
    pydantic

# Copy application code
COPY app_simple.py /app/app.py
COPY config.yml /app/

# Create data directory for embeddings
RUN mkdir -p /app/data

# Expose port
EXPOSE 8001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8001/health || exit 1

# Run the application
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8001", "--reload"]