#!/bin/bash

# Check if .env file exists
if [ ! -f .env ]; then
  echo "Creating .env file with default values"
  cat > .env << EOL
PORT=3000
MONGO_URI=mongodb://localhost:27017/assetBookingSystem
JWT_SECRET=your_jwt_secret_should_be_at_least_32_chars_long
JWT_EXPIRE=30d
JWT_COOKIE_EXPIRE=30

# Rate limiting
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100
AUTH_RATE_LIMIT_WINDOW=3600000
AUTH_RATE_LIMIT_MAX=5
PASSWORD_RESET_RATE_LIMIT_WINDOW=3600000
PASSWORD_RESET_RATE_LIMIT_MAX=3

# Email settings (replace with your own)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USERNAME=your_email@example.com
SMTP_PASSWORD=your_email_password
FROM_EMAIL=noreply@yourdomain.com
FROM_NAME=Asset Booking System

BASE_URL=http://localhost:3000
EOL
  echo ".env file created. Please edit it with your actual values."
  echo "Especially update the JWT_SECRET for security!"
  echo ""
fi

# Check if MongoDB is running using the setup helper
echo "Setting up MongoDB..."
./setup-mongodb.sh
if [ $? -ne 0 ]; then
  echo "Failed to set up MongoDB. Cannot continue."
  echo "You have these options:"
  echo "1. Try to fix MongoDB manually and then run this script again"
  echo "2. Use a Docker MongoDB container:"
  echo "   docker run --name mongodb -d -p 27017:27017 mongo:latest"
  echo "3. Update the .env file to point to a remote MongoDB instance"
  exit 1
fi

# Check if admin user exists, if not create it
echo "Setting up admin user..."
npm run seed

# Start the application
echo "Starting the application..."
npm run dev || {
  echo ""
  echo "Application failed to start."
  echo "Check the error message above for details."
  echo ""
  echo "Common issues:"
  echo "1. Missing dependencies - run 'npm install'"
  echo "2. Port conflicts - change the PORT in .env"
  echo "3. Code errors - check for syntax errors in recent changes"
  echo ""
  exit 1
} 