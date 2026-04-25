FROM node:20-slim

# Install system dependencies: ffmpeg, python3, pip for yt-dlp
RUN apt-get update && apt-get install -y \
    ffmpeg \
    python3 \
    python3-pip \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install yt-dlp (latest version from GitHub releases)
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
    && chmod a+rx /usr/local/bin/yt-dlp

# Verify installations
RUN yt-dlp --version && ffmpeg -version | head -1

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies (including devDeps needed for prisma generate)
RUN npm ci --omit=dev || npm install --omit=dev

# Generate Prisma client
RUN npx prisma generate

# Copy source code
COPY src ./src

# Create non-root user for security
RUN useradd -m -u 1001 soundwave && chown -R soundwave:soundwave /app
USER soundwave

EXPOSE 3001

# Run migrations then start server
CMD ["sh", "-c", "npx prisma migrate deploy && node src/index.js"]
