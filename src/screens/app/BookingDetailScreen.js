import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator, 
  Alert,
  Image,
  SafeAreaView,
  StatusBar
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { bookingApi } from '../../api';
import { format } from 'date-fns';
import { showCalendarSelection, formatBookingDuration } from '../../utils/calendarUtils';

const BookingDetailScreen = ({ route, navigation }) => {
  const { bookingId, booking: initialBooking } = route.params;
  const [booking, setBooking] = useState(initialBooking || null);
  const [isLoading, setIsLoading] = useState(!initialBooking);
  const [isCancelling, setIsCancelling] = useState(false);

  const loadBookingDetails = async () => {
    if (!initialBooking) {
      try {
        setIsLoading(true);
        // Fetch booking details - this endpoint is not implemented in the API yet
        // This is a placeholder for when the API is updated
        const result = await bookingApi.getBookingById(bookingId);
        if (result.success) {
          setBooking(result.data);
        }
      } catch (error) {
        console.error('Error loading booking details:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    loadBookingDetails();
  }, [bookingId]);

  const handleCancelBooking = () => {
    Alert.alert(
      'Cancel Booking',
      'Are you sure you want to cancel this booking?',
      [
        {
          text: 'No',
          style: 'cancel',
        },
        {
          text: 'Yes',
          onPress: async () => {
            try {
              setIsCancelling(true);
              const result = await bookingApi.cancelBooking(bookingId);
              setIsCancelling(false);
              
              if (result.success) {
                // Update the local booking state to reflect cancellation
                setBooking({
                  ...booking,
                  status: 'cancelled'
                });
                Alert.alert('Success', 'Booking has been cancelled', [
                  {
                    text: 'OK',
                    onPress: () => {
                      // Navigate back to refresh the bookings list
                      navigation.goBack();
                    }
                  }
                ]);
              } else {
                Alert.alert('Error', result.error || 'Failed to cancel booking');
              }
            } catch (error) {
              setIsCancelling(false);
              Alert.alert('Error', 'An unexpected error occurred');
              console.error('Error cancelling booking:', error);
            }
          },
        },
      ]
    );
  };

  const handleModifyBooking = () => {
    // Navigate to modify booking screen with callback
    navigation.navigate('CreateBooking', { 
      asset: booking.asset, 
      editBooking: booking,
      onBookingUpdated: (updatedBooking) => {
        // Update local state and refresh
        setBooking(updatedBooking);
      }
    });
  };

  const handleAddToCalendar = async () => {
    if (!booking) {
      Alert.alert('Error', 'Booking details not available');
      return;
    }

    // Mock asset data - in a real app, this would come from the booking or API
    const asset = {
      name: booking.assetName || 'Aquarii',
      location: booking.location || 'Cartagena, Colombia',
      type: booking.assetType || 'boat'
    };

    try {
      await showCalendarSelection(booking, asset);
    } catch (error) {
      console.error('Error adding to calendar:', error);
      Alert.alert('Error', 'Unable to add booking to calendar');
    }
  };

  // Get asset image based on type
  const getAssetImage = () => {
    if (booking?.asset?.type === 'boat') {
      return 'https://images.unsplash.com/photo-1564834744159-ff0ea41ba4b9?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80';
    } else {
      return 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80';
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1E4640" />
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={styles.errorContainer}>
        <MaterialIcons name="error-outline" size={48} color="#999" />
        <Text style={styles.errorText}>Booking not found</Text>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const durationDays = Math.ceil(
    (new Date(booking.endDate) - new Date(booking.startDate)) / (1000 * 60 * 60 * 24)
  );

  const durationNights = durationDays - 1;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <ScrollView style={styles.container} bounces={false}>
        {/* Header Image */}
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: getAssetImage() }}
            style={styles.assetImage}
            resizeMode="cover"
          />
          
          {/* Back Button */}
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <MaterialIcons name="arrow-back" size={24} color="black" />
          </TouchableOpacity>
          
          {/* Asset Name and Status */}
          <View style={styles.assetNameContainer}>
            <Text style={styles.assetName}>
              {booking.asset.name}
            </Text>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>UPCOMING</Text>
            </View>
          </View>
        </View>

        {/* Booking Details */}
        <View style={styles.detailsContainer}>
          <Text style={styles.sectionTitle}>Booking Details</Text>
          
          {/* Booked By */}
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Booked by</Text>
            <Text style={styles.detailValue}>Juan Diego Fernandez</Text>
          </View>
          
          {/* Booking Type */}
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Booking Type</Text>
            <Text style={styles.detailValue}>{booking.bookingType || 'Short'}</Text>
          </View>
          
          {/* Booking Date */}
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Booking Date</Text>
            <Text style={styles.detailValue}>
              {format(new Date(booking.startDate), 'dd MMM, yyyy')} - {format(new Date(booking.endDate), 'dd MMM, yyyy')} ( {durationNights} NIGHTS, {durationDays} DAYS )
            </Text>
          </View>
          
          {/* Divider */}
          <View style={styles.divider} />
          
          {/* Cancellation Policies */}
          <TouchableOpacity style={styles.policiesButton}>
            <Text style={styles.policiesText}>CANELLATION POLICIES</Text>
            <MaterialIcons name="info" size={24} color="#000" />
          </TouchableOpacity>
          
          {/* Add To Calendar */}
          <TouchableOpacity style={styles.addToCalendarRow} onPress={handleAddToCalendar}>
            <Text style={styles.addToCalendarText}>Add To Calendar</Text>
            <View style={styles.addToCalendarIcon}>
              <MaterialIcons name="event" size={24} color="#000" />
              <MaterialIcons name="chevron-right" size={24} color="#000" />
            </View>
          </TouchableOpacity>
          
          {/* Location */}
          <View style={styles.locationRow}>
            <View>
              <Text style={styles.locationLabel}>Location Address</Text>
              <Text style={styles.locationValue}>{booking.asset.location || 'Cartagena'}</Text>
            </View>
            <TouchableOpacity style={styles.mapButton}>
              <Text style={styles.mapButtonText}>SHOW ON MAP</Text>
              <MaterialIcons name="chevron-right" size={24} color="#000" />
            </TouchableOpacity>
          </View>
          
          {/* Property Manager */}
          <View style={styles.managerSection}>
            <Text style={styles.managerTitle}>Property Manager details</Text>
            <View style={styles.managerContainer}>
              <Image
                source={{ uri: 'https://randomuser.me/api/portraits/men/32.jpg' }}
                style={styles.managerImage}
              />
              <View style={styles.managerInfo}>
                <Text style={styles.managerName}>Andrea Molina</Text>
                <View style={styles.managerContact}>
                  <MaterialIcons name="phone" size={16} color="#000" />
                  <Text style={styles.managerContactText}>+573204836784</Text>
                </View>
                <View style={styles.managerContact}>
                  <MaterialIcons name="email" size={16} color="#000" />
                  <Text style={styles.managerContactText}>andrea@livo.co</Text>
                </View>
              </View>
            </View>
          </View>
          
          {/* Booking Confirmation Code */}
          <View style={styles.codeSection}>
            <Text style={styles.codeTitle}>Booking Confirmation Code</Text>
            <View style={styles.codeContainer}>
              <Text style={styles.codeValue}>#1000764</Text>
              <TouchableOpacity style={styles.copyButton}>
                <MaterialIcons name="content-copy" size={24} color="#000" />
              </TouchableOpacity>
            </View>
          </View>
          
          {/* Door Entry Code */}
          <View style={styles.codeSection}>
            <Text style={styles.codeTitle}>Door Entry Code</Text>
            <View style={styles.codeContainer}>
              <Text style={styles.codeValue}>Available 48 hrs prior to arrival</Text>
              <TouchableOpacity style={styles.copyButton}>
                <MaterialIcons name="content-copy" size={24} color="#000" />
              </TouchableOpacity>
            </View>
          </View>
          
          {/* WiFi Password */}
          <View style={styles.codeSection}>
            <Text style={styles.codeTitle}>Wifi Password</Text>
            <View style={styles.codeContainer}>
              <Text style={styles.codeValue}>Available 48 hrs prior to arrival</Text>
              <TouchableOpacity style={styles.copyButton}>
                <MaterialIcons name="content-copy" size={24} color="#000" />
              </TouchableOpacity>
            </View>
          </View>
          
          {/* Action Buttons */}
          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity 
              style={styles.cancelBookingButton}
              onPress={handleCancelBooking}
              disabled={isCancelling}
            >
              <Text style={styles.cancelBookingText}>
                {isCancelling ? 'Cancelling...' : 'Cancel Booking'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.modifyBookingButton}
              onPress={handleModifyBooking}
            >
              <Text style={styles.modifyBookingText}>Modify Booking</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff'
  },
  container: {
    flex: 1,
    backgroundColor: '#fff'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff'
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff'
  },
  errorText: {
    fontSize: 18,
    color: '#666',
    marginVertical: 15,
  },
  imageContainer: {
    width: '100%',
    height: 300,
    position: 'relative'
  },
  assetImage: {
    width: '100%',
    height: '100%'
  },
  backButton: {
    position: 'absolute',
    top: 20,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5
  },
  assetNameContainer: {
    position: 'absolute',
    bottom: 15,
    left: 15,
    right: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end'
  },
  assetName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    backgroundColor: '#fff',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 5
  },
  statusBadge: {
    backgroundColor: '#1E4640',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 5
  },
  statusText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12
  },
  detailsContainer: {
    padding: 20
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20
  },
  detailRow: {
    marginBottom: 20
  },
  detailLabel: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5
  },
  detailValue: {
    fontSize: 18,
    fontWeight: '500'
  },
  divider: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 20
  },
  policiesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#eee'
  },
  policiesText: {
    fontSize: 16,
    fontWeight: 'bold'
  },
  addToCalendarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderColor: '#eee'
  },
  addToCalendarText: {
    fontSize: 16,
    fontWeight: 'bold'
  },
  addToCalendarIcon: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  locationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderColor: '#eee'
  },
  locationLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5
  },
  locationValue: {
    fontSize: 16,
    color: '#999'
  },
  mapButton: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  mapButtonText: {
    fontSize: 14,
    fontWeight: 'bold'
  },
  managerSection: {
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderColor: '#eee'
  },
  managerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 15
  },
  managerContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  managerImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
    marginRight: 15
  },
  managerInfo: {
    flex: 1
  },
  managerName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8
  },
  managerContact: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5
  },
  managerContactText: {
    fontSize: 14,
    marginLeft: 10
  },
  codeSection: {
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderColor: '#eee'
  },
  codeTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10
  },
  codeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 10,
    paddingVertical: 15,
    paddingHorizontal: 20
  },
  codeValue: {
    fontSize: 16
  },
  copyButton: {
    padding: 5
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    marginTop: 30,
    marginBottom: 20
  },
  cancelBookingButton: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingVertical: 15,
    borderRadius: 10,
    marginRight: 10,
    alignItems: 'center'
  },
  cancelBookingText: {
    fontSize: 16,
    fontWeight: 'bold'
  },
  modifyBookingButton: {
    flex: 1,
    backgroundColor: '#1E4640',
    paddingVertical: 15,
    borderRadius: 10,
    marginLeft: 10,
    alignItems: 'center'
  },
  modifyBookingText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff'
  }
});

export default BookingDetailScreen; 