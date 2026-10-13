FROM python:3.11-slim

# Create user with UID 1000 (compatible with both Render and HF Spaces)
RUN useradd -m -u 1000 appuser

WORKDIR /app

# Install minimal system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install PyTorch CPU first to avoid heavy GPU wheels and memory spikes
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu

# Copy and install python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download spaCy model and sentence transformer cache for fast runtime startup
ENV HF_HOME=/app/cache/huggingface
RUN mkdir -p /app/cache/huggingface && \
    python -m spacy download en_core_web_sm && \
    python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')"

# Copy application files
COPY . .

# Build retrieval index if not already pre-packaged
RUN ALLOW_DRAFT=1 python build_index.py || true

# Set permissions for non-root execution
RUN chown -R appuser:appuser /app
USER appuser

EXPOSE 7860

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]