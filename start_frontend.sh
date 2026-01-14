#!/bin/bash

echo "Starting LinkedIn Content Engine Frontend..."

cd "$(dirname "$0")/frontend"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Start the development server
echo "Starting React development server on http://localhost:3000"
npm start
