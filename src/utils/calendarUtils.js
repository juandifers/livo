import * as Calendar from 'expo-calendar';
import { Platform, Alert } from 'react-native';
import { format } from 'date-fns';

/**
 * Calendar utility functions for managing booking events
 */

/**
 * Request calendar permissions
 */
export const requestCalendarPermissions = async () => {
  try {
    const { status } = await Calendar.requestCalendarPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert(
        'Calendar Permission Required',
        'Please enable calendar access in your device settings to add booking events to your calendar.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => {
            if (Platform.OS === 'ios') {
              // On iOS, we can't directly open settings, but we can guide the user
              Alert.alert(
                'Enable Calendar Access',
                'Go to Settings > Privacy & Security > Calendars > Livo and enable access.'
              );
            }
          }}
        ]
      );
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error requesting calendar permissions:', error);
    Alert.alert('Error', 'Unable to request calendar permissions');
    return false;
  }
};

/**
 * Get available calendars
 */
export const getAvailableCalendars = async () => {
  try {
    const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
    
    // Filter to writable calendars
    const writableCalendars = calendars.filter(calendar => 
      calendar.allowsModifications && 
      (calendar.source.name === 'Default' || 
       calendar.source.name === 'iCloud' || 
       calendar.source.name === 'Local')
    );
    
    return writableCalendars;
  } catch (error) {
    console.error('Error getting calendars:', error);
    return [];
  }
};

/**
 * Get or create a default calendar for Livo bookings
 */
export const getDefaultCalendar = async () => {
  try {
    const calendars = await getAvailableCalendars();
    
    // Try to find an existing Livo calendar
    const livoCalendar = calendars.find(cal => cal.title === 'Livo Bookings');
    if (livoCalendar) {
      return livoCalendar;
    }
    
    // Use the default calendar if no Livo calendar exists
    const defaultCalendar = calendars.find(cal => 
      cal.isPrimary || 
      cal.source.name === 'Default' || 
      cal.source.name === 'iCloud'
    );
    
    return defaultCalendar || calendars[0];
  } catch (error) {
    console.error('Error getting default calendar:', error);
    return null;
  }
};

/**
 * Create a calendar event for a booking
 */
export const createBookingEvent = async (booking, asset) => {
  try {
    // Request permissions first
    const hasPermission = await requestCalendarPermissions();
    if (!hasPermission) return null;

    // Get the default calendar
    const calendar = await getDefaultCalendar();
    if (!calendar) {
      Alert.alert('Error', 'No suitable calendar found to add the event');
      return null;
    }

    // Prepare event details
    const startDate = new Date(booking.startDate);
    const endDate = new Date(booking.endDate);
    
    // Set times for all-day events
    startDate.setHours(15, 0, 0, 0); // 3 PM check-in
    endDate.setHours(11, 0, 0, 0);   // 11 AM check-out

    const eventDetails = {
      title: `${asset?.name || 'Asset'} Booking`,
      startDate: startDate,
      endDate: endDate,
      allDay: false,
      location: asset?.location || '',
      notes: [
        `Booking for ${asset?.name || 'Asset'}`,
        asset?.location ? `Location: ${asset.location}` : '',
        booking.notes ? `Notes: ${booking.notes}` : '',
        `Booking ID: ${booking._id || booking.id || 'N/A'}`,
        `Status: ${booking.status || 'Confirmed'}`,
        '',
        'Added by Livo App'
      ].filter(Boolean).join('\n'),
      alarms: [
        { relativeOffset: -24 * 60 }, // 1 day before
        { relativeOffset: -2 * 60 }   // 2 hours before
      ]
    };

    // Create the event
    const eventId = await Calendar.createEventAsync(calendar.id, eventDetails);
    
    if (eventId) {
      Alert.alert(
        'Event Added',
        `Your booking has been added to your ${calendar.title} calendar with reminders.`,
        [{ text: 'OK' }]
      );
      return eventId;
    }
    
    return null;
  } catch (error) {
    console.error('Error creating calendar event:', error);
    Alert.alert(
      'Error Adding Event',
      'There was an error adding your booking to the calendar. Please try again.'
    );
    return null;
  }
};

/**
 * Show calendar selection dialog if multiple calendars are available
 */
export const showCalendarSelection = async (booking, asset) => {
  try {
    const hasPermission = await requestCalendarPermissions();
    if (!hasPermission) return;

    const calendars = await getAvailableCalendars();
    
    if (calendars.length === 0) {
      Alert.alert('Error', 'No writable calendars found on your device');
      return;
    }
    
    if (calendars.length === 1) {
      // Only one calendar, use it directly
      return await createBookingEvent(booking, asset);
    }
    
    // Multiple calendars - show selection
    const calendarOptions = calendars.map(cal => ({
      text: cal.title || cal.source.name,
      onPress: async () => {
        // Create event with selected calendar
        try {
          const startDate = new Date(booking.startDate);
          const endDate = new Date(booking.endDate);
          
          startDate.setHours(15, 0, 0, 0);
          endDate.setHours(11, 0, 0, 0);

          const eventDetails = {
            title: `${asset?.name || 'Asset'} Booking`,
            startDate: startDate,
            endDate: endDate,
            allDay: false,
            location: asset?.location || '',
            notes: [
              `Booking for ${asset?.name || 'Asset'}`,
              asset?.location ? `Location: ${asset.location}` : '',
              booking.notes ? `Notes: ${booking.notes}` : '',
              `Booking ID: ${booking._id || booking.id || 'N/A'}`,
              `Status: ${booking.status || 'Confirmed'}`,
              '',
              'Added by Livo App'
            ].filter(Boolean).join('\n'),
            alarms: [
              { relativeOffset: -24 * 60 },
              { relativeOffset: -2 * 60 }
            ]
          };

          const eventId = await Calendar.createEventAsync(cal.id, eventDetails);
          
          if (eventId) {
            Alert.alert(
              'Event Added',
              `Your booking has been added to your ${cal.title} calendar.`
            );
          }
        } catch (error) {
          console.error('Error creating event in selected calendar:', error);
          Alert.alert('Error', 'Failed to add event to selected calendar');
        }
      }
    }));
    
    Alert.alert(
      'Select Calendar',
      'Choose which calendar to add your booking to:',
      [
        ...calendarOptions,
        { text: 'Cancel', style: 'cancel' }
      ]
    );
    
  } catch (error) {
    console.error('Error showing calendar selection:', error);
    Alert.alert('Error', 'Unable to access calendars');
  }
};

/**
 * Format booking duration for display
 */
export const formatBookingDuration = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  const nights = diffDays > 0 ? diffDays - 1 : 0;
  
  return `${nights} night${nights !== 1 ? 's' : ''}, ${diffDays} day${diffDays !== 1 ? 's' : ''}`;
}; 