# Asset Booking System - Postman Tests

This directory contains Postman test files for testing the Asset Booking System API.

## Files

- `AssetBookingSystem-Collection.json` - The main Postman collection with all API endpoints
- `AssetBookingSystem-Environment.json` - Environment variables for the tests
- `Auth-Tests.js` - Test scripts for authentication endpoints
- `User-Tests.js` - Test scripts for user management endpoints
- `Asset-Tests.js` - Test scripts for asset management endpoints
- `Booking-Tests.js` - Test scripts for booking management endpoints

## Setup Instructions

1. Install Postman from [https://www.postman.com/downloads/](https://www.postman.com/downloads/)

2. Import the collection:
   - Open Postman
   - Click on "Import" button
   - Select `AssetBookingSystem-Collection.json`

3. Import the environment:
   - Click on the gear icon (top right) to manage environments
   - Click "Import" and select `AssetBookingSystem-Environment.json`
   - Select the "Asset Booking System" environment from the dropdown (top right)

4. Update environment variables:
   - Make sure your API server is running (default: http://localhost:3000/api)
   - Check if `baseUrl` points to your server's API endpoint

## Running the Tests

### Manually

You can run each request individually by:
1. Selecting a request from the collection
2. Clicking the "Send" button
3. Viewing test results in the "Test Results" tab

### Automated Collection Runner

To run all tests automatically:
1. Click the "Runner" button in Postman
2. Drag the "Asset Booking System API Tests" collection into the runner
3. Select the "Asset Booking System" environment
4. Set the delay between requests (recommended: 500ms)
5. Click "Start Run"

## Test Flow

The tests are designed to run in a specific order to test the full workflow:

1. Admin Authentication:
   - Admin login (using seeded admin credentials)
   - Get current admin info

2. User Management:
   - Create a new user (as admin)
   - Extract setup token from response (in real-world this would come from an email)
   - Complete account setup
   - User login

3. Asset Management:
   - Create a new asset (as admin)
   - Add user as an owner
   - Get and update asset information

4. Booking Management:
   - Check availability
   - Create a booking
   - Add special dates (as admin)
   - Process payment for extra days
   - Update and delete bookings

5. Cleanup:
   - Delete test resources
   - Logout

## Important Notes

1. **Setup and Reset Tokens**: In a real application, these tokens would be sent via email. For testing purposes, you need to:
   - Extract the setup token from the response when creating a user
   - Extract the reset token from the response when requesting a password reset
   - Manually set these in your environment variables

2. **JWT Authentication**: The tests automatically handle JWT tokens by:
   - Extracting tokens from login responses
   - Storing them in environment variables
   - Using them in the Authorization header for subsequent requests

3. **Test Dependencies**: Many tests depend on previous tests' successful execution. For example, you can't test "Get Asset by ID" without first successfully creating an asset and storing its ID.

## Extending the Tests

To add more tests:
1. Add new requests to the collection
2. Write test scripts using the existing ones as templates
3. Update the test flow if needed

## Troubleshooting

If tests fail:
1. Check server logs for errors
2. Verify environment variables are set correctly
3. Check that your database has the seeded admin user
4. Ensure all required services (MongoDB, email) are running 