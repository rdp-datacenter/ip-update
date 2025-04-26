FROM node:slim

# Set working directory
WORKDIR /app

# Copy package files for better caching
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the TypeScript files
RUN npm run build

# Expose the port
EXPOSE ${PORT:-5555}

# Set NODE_ENV to production
ENV NODE_ENV=production

# Run the application
CMD ["node", "dist/index.js"]