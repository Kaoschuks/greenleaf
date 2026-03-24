# Use official Node.js image
FROM node:18

# Create app directory
WORKDIR /usr/src/app

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the application code
COPY . .

# Install nodemon globally for hot reload
RUN npm install -g nodemon

# Expose the port the app runs on
EXPOSE 5000

# Start the service with nodemon for hot reload
CMD ["nodemon", "--exec", "npm", "start"]
