#!/bin/bash

# Navigate to server directory and check if node_modules is missing
cd server
if [ ! -d "node_modules" ]; then
  echo "node_modules not found in server directory. Running npm install..."
  npm install
fi

# Check if server's dist directory exists and run npm run build if necessary
if [ ! -d "dist" ]; then
  echo "dist directory not found in server directory. Running npm run build..."
  npm run build
fi

# Start the server
echo "Starting server..."
node dist/index.js &
SERVER_PID=$!

# Navigate to client directory and check if dist is missing
cd ../client
echo "DIR" 
pwd

if [ ! -d "dist" ]; then
  echo "dist directory not found in client directory. Running npm run build..."
  npm i express path
  npm run build
fi

# Start the client
echo "Starting client..."
node serve.js &
CLIENT_PID=$!

# Function to kill background processes on script exit
cleanup() {
  echo "Stopping client and server..."
  kill $CLIENT_PID
  kill $SERVER_PID
  exit 0
}

# Trap script exit to ensure cleanup
trap cleanup EXIT

# Wait for both background processes to finish
wait $CLIENT_PID
wait $SERVER_PID
