FROM node:24.13.1-alpine3.23

# install dependencies
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# skip puppeteer chrome download
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY index.js ./

# Download-Verzeichnis erstellen
RUN mkdir -p /app/downloads

# Standard-Download-Pfad setzen (kann per .env überschrieben werden)
ENV DOWNLOAD_DIR=/app/downloads

ENTRYPOINT ["node", "index.js"]

