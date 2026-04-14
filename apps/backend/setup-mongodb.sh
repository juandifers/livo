#!/bin/bash

echo "MongoDB Setup Helper"
echo "===================="
echo

# Check if MongoDB is installed
if command -v mongod &> /dev/null; then
    echo "MongoDB is installed ✅"
else
    echo "MongoDB is not installed ❌"
    echo "Please install MongoDB using one of these methods:"
    echo "1. Using Homebrew: brew install mongodb-community"
    echo "2. Download from the official website: https://www.mongodb.com/try/download/community"
    exit 1
fi

# Check if MongoDB is running
if nc -z localhost 27017 2>/dev/null; then
    echo "MongoDB is already running on port 27017 ✅"
    exit 0
else
    echo "MongoDB is not running on port 27017 ❌"
fi

# Try to start MongoDB using different methods
echo "Attempting to start MongoDB..."

# Method 1: Homebrew services
if brew services list | grep -q mongodb-community; then
    echo "Trying to start MongoDB using Homebrew services..."
    brew services start mongodb-community
    sleep 2
    if nc -z localhost 27017 2>/dev/null; then
        echo "MongoDB started successfully with Homebrew services ✅"
        exit 0
    else
        echo "Failed to start MongoDB with Homebrew services ❌"
    fi
fi

# Method 2: Manual start
echo "Trying to start MongoDB manually..."
MONGODB_DATA_DIR="$HOME/data/db"

# Create data directory if it doesn't exist
if [ ! -d "$MONGODB_DATA_DIR" ]; then
    echo "Creating MongoDB data directory at $MONGODB_DATA_DIR"
    mkdir -p "$MONGODB_DATA_DIR"
fi

# Start MongoDB in the background
echo "Starting MongoDB daemon..."
mongod --dbpath "$MONGODB_DATA_DIR" --fork --logpath "$MONGODB_DATA_DIR/mongod.log"

# Check if MongoDB started
sleep 2
if nc -z localhost 27017 2>/dev/null; then
    echo "MongoDB started successfully manually ✅"
    echo "MongoDB log file is at $MONGODB_DATA_DIR/mongod.log"
    exit 0
else
    echo "Failed to start MongoDB manually ❌"
    echo "Please try starting MongoDB using your system's method or check MongoDB documentation."
    echo "If you're using Docker, you might need to start a MongoDB container:"
    echo "docker run --name mongodb -d -p 27017:27017 mongo:latest"
    exit 1
fi 