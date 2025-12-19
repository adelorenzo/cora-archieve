FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python packages
RUN pip install --no-cache-dir \
    txtai[api] \
    sentence-transformers \
    torch \
    transformers \
    fastapi \
    uvicorn \
    python-multipart \
    pypdf2 \
    python-docx \
    openpyxl \
    markdown \
    numpy

# Copy application files
COPY app.py /app/app.py

# Create data directory
RUN mkdir -p /app/data

# Expose port
EXPOSE 8000

# Health check endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Start custom API server
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]