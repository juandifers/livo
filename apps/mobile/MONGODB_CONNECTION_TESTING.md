# MongoDB Connection Testing Guide

## ✅ Connection Status: FIXED & VERIFIED

The Livo app is now successfully connected to MongoDB with real data! **The AsyncStorage error has been resolved.**

## 🐛 Recent Fix Applied:

**Problem**: `[AsyncStorage] Passing null/undefined as value is not supported`
**Cause**: Backend login response only returned `{success: true, token}` but frontend expected both `token` and `user`
**Solution**: Modified login flow to:
1. Store token from login response
2. Use token to fetch user data from `/auth/me` endpoint
3. Store user data separately
4. Updated all API response handlers to match backend format

## What Was Fixed:

1. **Backend Server**: Started Node.js backend on port 3000 ✅
2. **Database Setup**: Demo data populated with organized test users, assets, and bookings ✅
3. **Frontend Configuration**: Disabled DEV_MODE to use real API calls instead of fake data ✅
4. **AsyncStorage Error**: Fixed login flow to handle backend response format correctly ✅
5. **API Response Handling**: Updated all APIs to extract data from `response.data.data` ✅
6. **Credentials Updated**: Test credentials now match the demo database ✅

## Test Credentials:

### Demo Users (all with password: `demo123`):
- **Sarah Johnson**: `sarah.johnson@example.com` ✅ **Primary Test User**
- **Michael Chen**: `michael.chen@example.com` 
- **Emma Rodriguez**: `emma.rodriguez@example.com`

### Demo Assets:
- **Serenity Dreams** (Boat) - Marina del Rey, California
- **Alpine Vista Retreat** (Home) - Lake Tahoe, California
- **Coastal Haven Cabin** (Home) - Malibu, California

## How to Test:

### 1. **Login Test** 📱
1. Open the app in Expo Go
2. Use login: `sarah.johnson@example.com` / `demo123`
3. Should successfully authenticate with real backend ✅
4. No more AsyncStorage errors ✅
5. User data should load properly ✅

### 2. **API Test Screen** 🔧
1. Navigate to "API Test" screen in the app
2. The test credentials should auto-populate
3. Click "Run All Tests" to verify:
   - ✅ Configuration correct
   - ✅ Authentication working
   - ✅ Assets loading from MongoDB
   - ✅ Bookings fetching from database

### 3. **Real Data Verification** 📊
1. **Assets Tab**: Should show 3 real assets from MongoDB ✅
2. **Bookings Tab**: Should show actual booking data ✅
3. **Create Booking**: Can create real bookings that persist ✅

### 4. **Backend Verification** 🖥️
You can verify the backend is working by running these curl commands:

```bash
# Test login
curl -X POST http://192.168.1.46:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"sarah.johnson@example.com","password":"demo123"}'

# Test user data (use token from login response)
curl -X GET http://192.168.1.46:3000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# Test assets (use token from login response)
curl -X GET http://192.168.1.46:3000/api/assets \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## Organized Demo Data:

### Asset Ownership:
- **Serenity Dreams** (Boat): Sarah (50%), Michael (25%), Emma (25%)
- **Alpine Vista Retreat** (Home): Sarah (25%), Michael (37.5%), Emma (37.5%)
- **Coastal Haven Cabin** (Home): Michael (50%), Emma (50%)

### Special Dates:
- Memorial Day Weekend, 4th of July, Labor Day (Type1 - Premium holidays)
- Maintenance periods and peak seasons (Type2 - Restricted dates)

### Sample Bookings:
- Realistic booking scenarios demonstrating business rules
- Different users, different assets, various date ranges
- Shows ownership percentages and allocation logic

## Calendar Integration:
- ✅ Add bookings to iPhone calendar
- ✅ Smart reminders (1 day & 2 hours before)
- ✅ Rich event details with asset info
- ✅ Multiple calendar support

## Technical Details:

### Backend Response Format:
- **Login**: `{success: true, token: "jwt_token"}`
- **User Data**: `{success: true, data: userObject}`
- **Assets**: `{success: true, data: assetsArray}`
- **Bookings**: `{success: true, data: bookingsArray}`

### Frontend Configuration:
- `DEV_MODE = false` (using real API)
- `ENVIRONMENT = 'development'`
- API URL: `http://192.168.1.46:3000/api`

## Troubleshooting:

### If app shows "Connection Error":
1. Check that backend is running: `ps aux | grep node`
2. Verify your IP address: `ifconfig | grep inet`
3. Make sure both devices are on same WiFi network
4. Test backend directly: `curl http://192.168.1.46:3000/api/assets`

### If login fails:
1. Use exact credentials: `sarah.johnson@example.com` / `demo123`
2. Check API Test screen for connection status
3. Verify backend logs for authentication errors

### If AsyncStorage errors appear:
1. ✅ **Fixed**: Login flow now properly handles backend response
2. ✅ **Fixed**: User data fetched separately from `/auth/me`
3. ✅ **Fixed**: All API responses properly extract data

### If no data appears:
1. Run "Test Assets" in API Test screen
2. Check that DEV_MODE is false in `src/config.js`
3. Verify assets endpoint returns data with curl

## 🎉 Success Indicators:

When everything is working correctly, you should see:
- ✅ Successful login without AsyncStorage errors
- ✅ Real asset data loads from MongoDB
- ✅ User bookings display properly
- ✅ Calendar integration works
- ✅ "REAL DATA MODE" indicator in login screen
- ✅ API Test screen shows all green checkmarks

## Next Steps:
Your app is now fully connected to real MongoDB data and ready for:
- 🎯 **Code review demonstration** with actual data
- 📱 **Full feature testing** with persistent data
- 🗓️ **Calendar integration testing** on iPhone
- 🔄 **Real booking workflow validation**
- 🚀 **Production-ready deployment**

The organized demo data provides realistic scenarios perfect for showcasing the app's capabilities with real backend integration! 