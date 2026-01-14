#!/bin/bash

echo "Starting LinkedIn Content Engine Backend..."

cd "$(dirname "$0")/backend"

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install dependencies
echo "Installing dependencies..."
pip install -q -r requirements.txt

# Check for .env file
if [ ! -f ".env" ]; then
    echo ""
    echo "WARNING: No .env file found!"
    echo "Please create a .env file with your ANTHROPIC_API_KEY"
    echo "Example: cp .env.example .env && edit .env"
    echo ""
fi

# Start the server
echo "Starting FastAPI server on http://localhost:8000"
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
