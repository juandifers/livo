import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator, 
  Alert,
  Image,
  Linking,
  SafeAreaView,
  StatusBar,
  Platform
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { assetApi, bookingApi } from '../../api';
import { showCalendarSelection } from '../../utils/calendarUtils';
import { getCurrentApiConfig } from '../../config';
import { useI18n } from '../../i18n';

const BookingDetailScreen = ({ route, navigation }) => {
  const { bookingId, booking: initialBooking } = route.params;
  const resolvedBookingId = bookingId || initialBooking?._id;
  const { t, formatDate, mapApiError } = useI18n();
  const [booking, setBooking] = useState(initialBooking || null);
  const [isLoading, setIsLoading] = useState(!initialBooking && Boolean(resolvedBookingId));
  const [isCancelling, setIsCancelling] = useState(false);
  const hydratedAssetIdsRef = useRef(new Set());

  useEffect(() => {
    let isActive = true;

    const loadBookingDetails = async () => {
      if (!resolvedBookingId) {
        setIsLoading(false);
        return;
      }

      try {
        if (!initialBooking) {
          setIsLoading(true);
        }
        const result = await bookingApi.getBookingById(resolvedBookingId);
        if (isActive && result.success && result.data) {
          setBooking(result.data);
        }
      } catch (error) {
        console.error('Error loading booking details:', error);
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    loadBookingDetails();

    return () => {
      isActive = false;
    };
  }, [resolvedBookingId, initialBooking]);

  useEffect(() => {
    let isActive = true;

    const hydrateAssetDetails = async () => {
      if (!booking) return;

      const rawAsset = booking.asset;
      const assetId = typeof rawAsset === 'string' ? rawAsset : rawAsset?._id;
      if (!assetId) return;
      if (hydratedAssetIdsRef.current.has(String(assetId))) return;

      const currentPropertyManager =
        (typeof rawAsset === 'object' && rawAsset?.propertyManager) || booking.propertyManager || {};
      const hasPropertyManager = Boolean(
        currentPropertyManager?.name || currentPropertyManager?.phone || currentPropertyManager?.email
      );
      const hasPhotos = Array.isArray(rawAsset?.photos) && rawAsset.photos.length > 0;
      const hasLocationAddress = Boolean(rawAsset?.locationAddress || booking.locationAddress);

      // Fetch full asset only when booking payload is partial.
      if (hasPropertyManager && hasPhotos && hasLocationAddress) {
        return;
      }

      hydratedAssetIdsRef.current.add(String(assetId));
      const assetResult = await assetApi.getAssetById(assetId);
      if (!isActive || !assetResult?.success || !assetResult?.data) return;

      setBooking((prev) => {
        if (!prev) return prev;
        const prevAsset = typeof prev.asset === 'object' && prev.asset ? prev.asset : { _id: assetId };
        return {
          ...prev,
          asset: {
            ...prevAsset,
            ...assetResult.data
          }
        };
      });
    };

    hydrateAssetDetails();

    return () => {
      isActive = false;
    };
  }, [booking]);

  const handleCancelBooking = () => {
    // Check if this is a short-term booking (within 60 days)
    const now = new Date();
    const bookingStart = new Date(booking.startDate);
    const daysUntilBooking = Math.ceil((bookingStart - now) / (1000 * 60 * 60 * 24));
    
    const isShortTermBooking = daysUntilBooking <= 60;
    
    const title = t('Cancel Booking');
    const message = isShortTermBooking 
      ? t('⚠️ Short-term Cancellation Warning\n\nThis booking is within 60 days of the start date. If you cancel now, these days will still count against your allocation unless someone else books these dates.\n\nAre you sure you want to cancel?')
      : t('Are you sure you want to cancel this booking?');
    
    Alert.alert(
      title,
      message,
      [
        {
          text: t('No'),
          style: 'cancel',
        },
        {
          text: t('Yes'),
          onPress: async () => {
            try {
              setIsCancelling(true);
              const result = await bookingApi.cancelBooking(resolvedBookingId);
              setIsCancelling(false);
              
              if (result.success) {
                // Update the local booking state to reflect cancellation
                setBooking({
                  ...booking,
                  status: 'cancelled'
                });
                
                const successMessage = isShortTermBooking
                  ? t('Short-term booking cancelled. Note that this will still count against your allocation unless another owner books these dates.')
                  : t('Booking has been cancelled');
                
                Alert.alert(t('Success'), successMessage, [
                  {
                    text: t('OK'),
                    onPress: () => {
                      // Navigate back to refresh the bookings list
                      navigation.goBack();
                    }
                  }
                ]);
              } else {
                Alert.alert(t('Error'), mapApiError(result.error || 'Failed to cancel booking'));
              }
            } catch (error) {
              setIsCancelling(false);
              Alert.alert(t('Error'), t('An unexpected error occurred'));
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
      Alert.alert(t('Error'), t('Booking details not available'));
      return;
    }

    // Mock asset data - in a real app, this would come from the booking or API
    const asset = {
      name: booking?.asset?.name || booking.assetName || 'Aquarii',
      location: booking?.asset?.locationAddress || booking?.asset?.location || booking.location || 'Cartagena, Colombia',
      type: booking?.asset?.type || booking.assetType || 'boat'
    };

    try {
      await showCalendarSelection(booking, asset);
    } catch (error) {
      console.error('Error adding to calendar:', error);
      Alert.alert(t('Error'), t('Unable to add booking to calendar'));
    }
  };

  // Get asset image based on type
  const getAssetImage = () => {
    const asset = booking?.asset || {};
    const firstPhoto = Array.isArray(asset.photos) && asset.photos.length > 0
      ? asset.photos[0]
      : null;

    if (firstPhoto) {
      if (typeof firstPhoto === 'string') {
        if (firstPhoto.startsWith('http://') || firstPhoto.startsWith('https://')) {
          return firstPhoto;
        }

        const apiConfig = getCurrentApiConfig();
        const baseUrl = apiConfig.baseURL.replace('/api', '');
        return `${baseUrl}${firstPhoto.startsWith('/') ? '' : '/'}${firstPhoto}`;
      }

      if (typeof firstPhoto === 'object' && typeof firstPhoto.url === 'string') {
        return firstPhoto.url;
      }
    }

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
        <Text style={styles.errorText}>{t('Booking not found')}</Text>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>{t('Go Back')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const durationDays = Math.ceil(
    (new Date(booking.endDate) - new Date(booking.startDate)) / (1000 * 60 * 60 * 24)
  ) + 1;

  const durationNights = durationDays - 1;
  const specialTypeLabel = booking?.specialDateType
    ? (booking.specialDateType === 'type1' ? 'Type 1 Special Date' : booking.specialDateType === 'type2' ? 'Type 2 Special Date' : null)
    : null;

  // Helper function to determine booking status display
  const getBookingStatus = (booking) => {
    if (booking.status === 'cancelled') {
      return { text: 'CANCELLED_STATUS', color: '#dc3545' }; // Red color for cancelled
    }
    
    const now = new Date();
    const endDate = new Date(booking.endDate);
    
    if (endDate < now) {
      return { text: 'PAST_STATUS', color: '#6c757d' }; // Gray color for past
    } else {
      return { text: 'UPCOMING_STATUS', color: '#1E4640' }; // Green color for upcoming
    }
  };

  const bookingStatus = getBookingStatus(booking);
  const bookingAsset = booking?.asset || {};
  const bookingAddress = bookingAsset.locationAddress || booking.locationAddress || bookingAsset.location || booking.location || '';
  const propertyManager = bookingAsset.propertyManager || booking.propertyManager || {};
  const managerName = typeof propertyManager.name === 'string' ? propertyManager.name.trim() : '';
  const managerPhone = typeof propertyManager.phone === 'string' ? propertyManager.phone.trim() : '';
  const managerEmail = typeof propertyManager.email === 'string' ? propertyManager.email.trim() : '';
  const hasManagerInfo = Boolean(managerName || managerPhone || managerEmail);

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
              {bookingAsset.name || booking.assetName || t('Asset')}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: bookingStatus.color }]}>
              <Text style={styles.statusText}>{bookingStatus.text}</Text>
            </View>
          </View>
        </View>

        {/* Booking Details */}
        <View style={styles.detailsContainer}>
          <Text style={styles.sectionTitle}>{t('Booking Details')}</Text>
        
          
          {/* Booking Type */}
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{t('Booking Type')}</Text>
            <Text style={styles.detailValue}>{booking.bookingType || t('Short')}</Text>
          </View>

          {/* Special Date Type (if applicable) */}
          {specialTypeLabel && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{t('Special Date')}</Text>
              <Text style={[styles.detailValue, { color: booking.specialDateType === 'type1' ? '#ff6b6b' : '#6200ee' }]}>
                {specialTypeLabel}
              </Text>
            </View>
          )}
          
          {/* Booking Date */}
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{t('Booking Date')}</Text>
            <Text style={styles.detailValue}>
              {formatDate(new Date(booking.startDate), 'dd MMM, yyyy')} - {formatDate(new Date(booking.endDate), 'dd MMM, yyyy')} ( {durationNights} NIGHTS, {durationDays} DAYS )
            </Text>
          </View>
          
          {/* Divider */}
          <View style={styles.divider} />
          
          {/* Cancellation Policies */}
          <TouchableOpacity 
            style={styles.policiesButton}
            onPress={() => navigation.navigate('CancellationPolicies')}
          >
            <Text style={styles.policiesText}>{t('CANCELLATION POLICIES')}</Text>
            <MaterialIcons name="info" size={24} color="#000" />
          </TouchableOpacity>
          
          {/* Add To Calendar */}
          <TouchableOpacity style={styles.addToCalendarRow} onPress={handleAddToCalendar}>
            <Text style={styles.addToCalendarText}>{t('Add To Calendar')}</Text>
            <View style={styles.addToCalendarIcon}>
              <MaterialIcons name="event" size={24} color="#000" />
              <MaterialIcons name="chevron-right" size={24} color="#000" />
            </View>
          </TouchableOpacity>
          
          {/* Location */}
          <View style={styles.locationRow}>
            <View>
              <Text style={styles.locationLabel}>{t('Location Address')}</Text>
              <Text style={styles.locationValue}>{bookingAddress || t('Unknown Location')}</Text>
            </View>
            <TouchableOpacity 
              style={styles.mapButton}
              onPress={() => {
                try {
                  const address = bookingAddress;
                  if (!address) return;
                  const url = Platform.select({
                    ios: `http://maps.apple.com/?q=${encodeURIComponent(address)}`,
                    android: `geo:0,0?q=${encodeURIComponent(address)}`
                  });
                  if (url) {
                    Linking.openURL(url);
                  }
                } catch (_e) {}
              }}
            >
              <Text style={styles.mapButtonText}>{t('SHOW ON MAP')}</Text>
              <MaterialIcons name="chevron-right" size={24} color="#000" />
            </TouchableOpacity>
          </View>
          
          {/* Property Manager */}
          {hasManagerInfo && (
            <View style={styles.managerSection}>
              <Text style={styles.managerTitle}>{t('Property Manager details')}</Text>
              <View style={styles.managerInfo}>
                {managerName ? (
                  <Text style={styles.managerName}>{managerName}</Text>
                ) : null}
                {managerPhone ? (
                  <View style={styles.managerContact}>
                    <MaterialIcons name="phone" size={16} color="#000" />
                    <Text style={styles.managerContactText}>{managerPhone}</Text>
                  </View>
                ) : null}
                {managerEmail ? (
                  <View style={styles.managerContact}>
                    <MaterialIcons name="email" size={16} color="#000" />
                    <Text style={styles.managerContactText}>{managerEmail}</Text>
                  </View>
                ) : null}
              </View>
            </View>
          )}
          
          {/* Action Buttons - hide when booking is cancelled */}
          {booking.status !== 'cancelled' && (
            <View style={styles.actionButtonsContainer}>
              <TouchableOpacity 
                style={styles.cancelBookingButton}
                onPress={handleCancelBooking}
                disabled={isCancelling}
              >
                <Text style={styles.cancelBookingText}>
                  {isCancelling ? t('Cancelling...') : t('Cancel Booking')}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.modifyBookingButton}
                onPress={handleModifyBooking}
              >
                <Text style={styles.modifyBookingText}>{t('Modify Booking')}</Text>
              </TouchableOpacity>
            </View>
          )}
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
