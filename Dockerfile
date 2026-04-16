FROM node:20-alpine

# Native module build tools (required for better-sqlite3 and other native deps)
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files first for layer cache
COPY package.json package-lock.json ./

# Install all dependencies (devDeps needed for Strapi admin build)
RUN npm ci

# Copy source
COPY . .

# Build Strapi admin panel
RUN npm run build

EXPOSE 1337

CMD ["npm", "run", "start"]
