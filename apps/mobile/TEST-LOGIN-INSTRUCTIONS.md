# Test Login Instructions

The Livo app has been configured to work in development mode with test data.

## Login credentials
- Email: test@example.com
- Password: password

## What to expect
- You'll see a development mode notice on the login screen
- The app uses pre-configured test data for assets, bookings, and user information
- All API calls are simulated and will work without a backend connection
- Data changes (like creating bookings) will persist only during the current app session

## Testing features
1. Login with the test credentials
2. Browse assets (homes and boats)
3. Create a booking
4. View your bookings
5. Cancel a booking
6. View your profile

## How to run the app
```
cd LivoApp-FE
npm start
```

Then scan the QR code with the Expo Go app on your mobile device.

## Switching to production mode
When you're ready to connect to a real backend:
1. Set `DEV_MODE = false` in:
   - src/api/authApi.js
   - src/api/assetApi.js 
   - src/api/bookingApi.js
   - src/api/apiClient.js
2. Update the API_URL in src/api/apiClient.js to point to your backend server 