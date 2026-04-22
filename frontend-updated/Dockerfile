FROM node:20-alpine

WORKDIR /app

# Copy package descriptors
COPY package.json package-lock.json* ./

# Install packages
RUN npm install

# Copy application source
COPY . .

# Set API URL during build time
ENV NEXT_PUBLIC_API_URL="https://ai-backend-560359652969.us-central1.run.app"

# Build for production
RUN npm run build

# Expose port 3000
EXPOSE 3000

# Start server
CMD ["npm", "run", "start"]
