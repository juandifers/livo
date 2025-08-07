# Step-by-Step Guide for Running Postman Tests

This guide will walk you through the process of running the Postman tests against your Asset Booking System API.

## Prerequisites

1. MongoDB installed and running
2. Node.js and npm installed
3. Postman installed

## Step 1: Set Up MongoDB

You have several options for setting up MongoDB:

1. **Using the setup helper script**:
   ```
   ./setup-mongodb.sh
   ```
   This script will:
   - Check if MongoDB is installed
   - Try to start MongoDB using Homebrew services
   - If that fails, attempt to start MongoDB manually
   - Provide guidance if both methods fail

2. **Using Docker** (if the helper script fails):
   ```
   docker run --name mongodb -d -p 27017:27017 mongo:latest
   ```
   This will start a MongoDB container accessible on port 27017.

3. **Using MongoDB Atlas**:
   - Create a free MongoDB Atlas account at https://www.mongodb.com/cloud/atlas
   - Set up a cluster and get your connection string
   - Update the `MONGO_URI` in your `.env` file

## Step 2: Start the API Server

1. Navigate to the project root directory
2. Run the start script:
   ```
   ./start.sh
   ```
   This will:
   - Create a `.env` file if it doesn't exist
   - Check if MongoDB is running (using the helper script)
   - Set up the admin user
   - Start the development server

## Step 3: Set Up Postman

1. Open Postman
2. Import the collection:
   - Click "Import" in the top left
   - Select the file `AssetBookingSystem-Collection.json` from the postman directory
   - Click "Import"

3. Import the environment:
   - Click the gear icon in the top right
   - Click "Import" and select `AssetBookingSystem-Environment.json`
   - Click "Import"
   - Select the "Asset Booking System" environment from the dropdown in the top right

4. Verify your environment setup:
   - Make sure `baseUrl` is set to where your API is running (default: http://localhost:3000/api)
   - If you're using a different port or domain, update this value

## Step 4: Run Tests in Sequence

It's important to run the tests in a specific order because some tests depend on the results of previous tests.

### Authentication Flow

1. Run "Admin Login":
   - This will log in with the default admin credentials (`admin@example.com` / `admin123`)
   - The admin token will be automatically stored in the environment variables

2. Run "Create New User":
   - This will create a test user
   - Normally, the user would receive an email with a setup token
   - For testing purposes, you'll need to extract the setup token manually using one of these methods:

     **Method 1: Using the token extraction tool**:
     ```
     node tools/extract-token.js
     ```
     This will connect to MongoDB and extract the setup token for the test user.

     **Method 2: Using MongoDB directly**:
     If you're using a MongoDB client like MongoDB Compass or the mongo shell:
     ```
     use assetBookingSystem
     db.users.findOne({email: "testuser@example.com"})
     ```

3. Run "Account Setup":
   - This will complete the account setup for the test user
   - The user token will be stored in the environment

### Asset Flow

4. Run "Create Asset":
   - Creates a test asset
   - The asset ID will be stored in the environment

5. Run "Add Owner to Asset":
   - Adds the test user as an owner of the asset with a share percentage

### Booking Flow

6. Run "Get Availability":
   - Checks availability for the test asset

7. Run "Create Booking":
   - Creates a test booking
   - The booking ID will be stored in the environment

8. Run remaining booking tests in sequence

## Step 5: Use Collection Runner (Optional)

For automated testing:

1. Click "Runner" in the bottom left of Postman
2. Drag the "Asset Booking System API Tests" collection to the runner
3. Select the "Asset Booking System" environment
4. Configure run settings:
   - Iterations: 1
   - Delay: 500ms
   - Log responses: All
5. Click "Run"

**Note**: The automated runner might fail at some points because certain environment variables (like setup tokens) need to be manually extracted and set. In a production environment, you'd use Postman's scripting capabilities to extract these values from email services or directly from the database.

## Step 6: Interpret Results

1. Green tests indicate success
2. Red tests indicate failures
3. Check the response body and console logs for more details on failures

## Common Issues

1. **MongoDB Connection Issues**:
   - If you see "MongoNetworkError" in your API logs, make sure MongoDB is running
   - Try using the `setup-mongodb.sh` script to diagnose and fix MongoDB issues
   - Consider using Docker or MongoDB Atlas as alternatives

2. **Authentication Errors**: 
   - JWT tokens might expire. Re-run the login request to get a fresh token
   - Check if the JWT_SECRET in your .env file is properly set

3. **Missing Environment Variables**: 
   - If tests fail because variables are undefined, make sure previous tests have run successfully
   - You can manually set environment variables in Postman if needed

4. **Rate Limiting**: 
   - If you hit rate limits, wait for the specified time before retrying
   - You can increase the rate limits in your .env file for testing purposes

5. **Database Conflicts**: 
   - If tests fail due to duplicate keys, you might need to clear test data from previous runs
   - In MongoDB shell: `db.users.deleteOne({email: "testuser@example.com"})` 