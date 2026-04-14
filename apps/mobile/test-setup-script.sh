#!/bin/bash

# Livo App Testing Setup Script
echo "🚀 Setting up Livo App for Testing..."
echo "=================================="

# Check if backend is running
echo "📡 Checking backend connectivity..."
response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/assets)

if [ $response -eq 200 ] || [ $response -eq 401 ]; then
    echo "✅ Backend is running on http://localhost:3000"
else
    echo "❌ Backend is not responding. Please start it with:"
    echo "   cd LivoApp-BE && npm start"
    exit 1
fi

# Start the React Native app
echo ""
echo "📱 Starting React Native application..."
echo "Make sure you have:"
echo "1. Backend running (✅ Verified)"
echo "2. Expo CLI installed"
echo "3. Mobile device/simulator ready"
echo ""

# Check if Expo CLI is installed
if command -v expo &> /dev/null; then
    echo "✅ Expo CLI found"
    echo "🎯 Starting development server..."
    npx expo start
else
    echo "❌ Expo CLI not found. Installing..."
    npm install -g @expo/cli
    echo "🎯 Starting development server..."
    npx expo start
fi 