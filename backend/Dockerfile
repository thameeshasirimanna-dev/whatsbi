# Stage 1: Build the TypeScript application
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --legacy-peer-deps

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Stage 2: Run the application
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production --legacy-peer-deps

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Copy environment file
COPY --from=builder /app/.env ./

# Expose port 8080
EXPOSE 8080

# Start the application
CMD ["npm", "start"]