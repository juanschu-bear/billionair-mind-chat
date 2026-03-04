FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm install --production

# Copy source files
COPY . .

# Install a lightweight static + API server
RUN npm install -g serve

# Expose port
EXPOSE 3000

# For local Docker usage, use a simple Node server
# that serves static files from public/ and proxies /api/ routes
CMD ["node", "server.js"]
