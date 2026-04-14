# Calendar Integration for Livo App

## Overview
The Livo app now includes calendar integration that allows users to add their bookings directly to their device's calendar with automatic reminders.

## Features

### ✅ What's Included:
- **Automatic Calendar Events**: Bookings are added with proper start/end times (3 PM check-in, 11 AM check-out)
- **Smart Reminders**: 1 day and 2 hours before booking starts
- **Rich Event Details**: Includes asset name, location, booking notes, and booking ID
- **Multiple Calendar Support**: Users can choose which calendar to add events to
- **Permission Handling**: Proper iOS/Android calendar permission requests
- **Error Handling**: Graceful fallbacks if calendar access is denied

### 📱 User Experience:
1. **After Booking**: Users are prompted to add their new booking to calendar
2. **From Booking Details**: "Add to Calendar" button in booking detail screen
3. **Calendar Selection**: If multiple calendars exist, users can choose which one to use
4. **Confirmation**: Success feedback when event is added

## Implementation Details

### Files Modified:
- `src/utils/calendarUtils.js` - Core calendar functionality
- `src/screens/app/BookingDetailScreen.js` - "Add to Calendar" button
- `src/screens/app/CreateBookingScreen.js` - Post-booking calendar prompt
- `src/screens/app/ApiTestScreen.js` - Calendar testing functions
- `app.json` - Calendar permissions and plugin configuration

### Permissions Required:
- **iOS**: `NSCalendarsUsageDescription` and `NSRemindersUsageDescription`
- **Android**: `READ_CALENDAR` and `WRITE_CALENDAR`

## Testing on Expo Go

### Calendar Permission Flow:
1. Open the app in Expo Go on your iPhone
2. Navigate to "API Test" screen
3. Tap "Test Calendar Permissions" to check/request permissions
4. Tap "Test Add to Calendar" to test event creation

### Full Booking Flow:
1. Create a booking in the app
2. When booking is confirmed, choose "Add to Calendar"
3. Select which calendar to use (if multiple available)
4. Event is added with reminders set

### Verify in iOS Calendar:
1. Open the iOS Calendar app
2. Look for the booking event with asset name
3. Check that reminders are set for 1 day and 2 hours before
4. Verify event details include location and notes

## Event Details Format

When a booking is added to the calendar, it includes:

```
Title: [Asset Name] Booking
Start: [Check-in Date] at 3:00 PM
End: [Check-out Date] at 11:00 AM
Location: [Asset Location]
Notes: 
- Booking for [Asset Name]
- Location: [Asset Location]
- Notes: [User Notes]
- Booking ID: [Booking ID]
- Status: Confirmed
- Added by Livo App

Reminders:
- 1 day before booking
- 2 hours before booking
```

## Troubleshooting

### Permission Issues:
- Make sure calendar permissions are granted in iOS Settings > Privacy & Security > Calendars
- Test permissions using the API Test screen first

### Calendar Not Found:
- Ensure you have at least one writable calendar on your device
- iCloud calendars work best for cross-device sync

### Events Not Appearing:
- Check if you selected the correct calendar
- Verify the date range in your calendar app
- Look for events under the calendar you selected

## Future Enhancements

Potential improvements for production:
- **Calendar Creation**: Create a dedicated "Livo Bookings" calendar
- **Event Updates**: Sync calendar when bookings are modified/cancelled
- **Recurring Events**: Support for recurring bookings
- **Time Zone Handling**: Smart time zone detection for asset locations
- **Custom Reminders**: User-configurable reminder preferences

## Development Notes

The calendar integration is built using:
- `expo-calendar` for cross-platform calendar access
- Proper permission handling for iOS and Android
- Error boundaries and user-friendly error messages
- Consistent with Expo Go testing environment

This feature enhances the user experience by seamlessly integrating bookings with their personal calendar system, making it easy to track and remember upcoming stays. 