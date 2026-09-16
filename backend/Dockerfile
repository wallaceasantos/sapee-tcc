# Backend SAPEE DEWAS
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    default-libmysqlclient-dev \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Prepara o banco (bootstrap) e inicia o servidor lendo PORT via Python.
# Nao usa `$PORT` no comando, evitando falha quando o shell nao expande a variavel.
CMD ["python", "run.py"]
