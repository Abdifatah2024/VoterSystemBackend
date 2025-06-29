# Use the official Node.js 20 image
FROM node:20

# Create app directory inside container
WORKDIR /app

# Copy package.json (and package-lock.json if you have it)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of your app code
COPY . .

# Build TypeScript (compiles src/ to dist/)
RUN npm run build

# Expose your server port
EXPOSE 4000

# Start the server
CMD ["npm", "start"]
