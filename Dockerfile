# Use a lightweight Node image
FROM node:22-alpine

WORKDIR /app

# Copy root package.json for install-all script
COPY package.json ./

# Copy client and server directories
COPY snooker-client/ ./snooker-client/
COPY snooker-server/ ./snooker-server/

# Install dependencies and build client
RUN npm run install-all
RUN npm run build

# Expose port (Back4app expects apps to bind to a port, usually injected via ENV)
EXPOSE 3001

# Start the server
CMD ["npm", "start"]
