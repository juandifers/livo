# Testing the Asset Booking System

This guide explains how to test the Asset Booking System API using Postman.

## Prerequisites

- Node.js and npm
- MongoDB (or Docker for MongoDB container)
- Postman

## Quick Start

1. **Set up MongoDB**:
   ```
   ./setup-mongodb.sh
   ```

2. **Start the application**:
   ```
   ./start.sh
   ```

3. **Import Postman tests**:
   - Open Postman
   - Import `postman/AssetBookingSystem-Collection.json`
   - Import `postman/AssetBookingSystem-Environment.json`

4. **Run the tests in sequence**:
   - Start with "Admin Login"
   - Run "Create New User"
   - Extract token with: `node tools/extract-token.js`
   - Continue with remaining tests in order

## Detailed Guides

- For detailed MongoDB setup options, see the [MongoDB Setup Guide](#mongodb-setup-guide)
- For step-by-step Postman testing instructions, see [postman/RunningTests.md](postman/RunningTests.md)
- For troubleshooting common issues, see the [Troubleshooting Guide](#troubleshooting-guide)

## MongoDB Setup Guide

### Option 1: Local MongoDB (Recommended)

1. Use the setup helper:
   ```
   ./setup-mongodb.sh
   ```

### Option 2: Docker

1. Pull and run the MongoDB image:
   ```
   docker run --name mongodb -d -p 27017:27017 mongo:latest
   ```

2. Update the `.env` file to use the correct MongoDB URI:
   ```
   MONGO_URI=mongodb://localhost:27017/assetBookingSystem
   ```

### Option 3: MongoDB Atlas (Cloud)

1. Create a free account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Set up a new cluster
3. Create a database user and whitelist your IP address
4. Get your connection string and update the `.env` file:
   ```
   MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/assetBookingSystem?retryWrites=true&w=majority
   ```

## Running the Tests

### Test Script Organization

The Postman tests are organized into several files:
- `Auth-Tests.js` - Tests for authentication endpoints
- `User-Tests.js` - Tests for user management endpoints
- `Asset-Tests.js` - Tests for asset management endpoints
- `Booking-Tests.js` - Tests for booking functionality

### Running Individual Tests

Follow the sequence outlined in [postman/RunningTests.md](postman/RunningTests.md) for best results.

### Using Collection Runner

1. Open Postman
2. Click "Runner" (bottom left)
3. Drag the "Asset Booking System API Tests" collection to the runner
4. Select the "Asset Booking System" environment
5. Set delay to 500ms
6. Click "Run"

## Token Extraction

After creating a test user, you need to extract the setup token:

```
node tools/extract-token.js
```

Copy the output token and set it as the `setupToken` environment variable in Postman.

## Troubleshooting Guide

### MongoDB Connection Issues

**Symptom**: "MongoNetworkError" in logs, application fails to start

**Solutions**:
1. Verify MongoDB is running: `./setup-mongodb.sh`
2. Check MongoDB logs: `cat ~/data/db/mongod.log`
3. Try Docker alternative: `docker run --name mongodb -d -p 27017:27017 mongo:latest`

### Authentication Errors

**Symptom**: 401 Unauthorized responses

**Solutions**:
1. Re-run "Admin Login" to refresh the token
2. Check if JWT_SECRET in .env is correctly set
3. Verify your token is correctly set in the environment

### Missing Environment Variables

**Symptom**: Tests fail with "Cannot read property of undefined"

**Solutions**:
1. Ensure previous tests (that set variables) ran successfully
2. Manually set the required variables in Postman
3. Check the environment variable names match what's used in the tests

### Database Conflicts

**Symptom**: "Duplicate key error" in logs

**Solutions**:
1. Delete test data before retrying:
   ```
   node tools/cleanup-test-data.js
   ```
   (Note: You might need to create this script)

2. Manually delete via MongoDB shell:
   ```
   use assetBookingSystem
   db.users.deleteOne({email: "testuser@example.com"})
   ```

## Customizing the Tests

To modify or extend the tests:

1. Edit the test scripts in the appropriate test file (e.g., `Auth-Tests.js`, `Booking-Tests.js`)
2. Add new requests to the collection in Postman
3. Update the test flow in the documentation

## Continuous Integration

For CI/CD environments, you can run the tests using Newman (Postman CLI):

1. Install Newman:
   ```
   npm install -g newman
   ```

2. Run the tests:
   ```
   newman run postman/AssetBookingSystem-Collection.json -e postman/AssetBookingSystem-Environment.json
   ```

However, this approach will require additional scripting to handle token extraction automatically. 