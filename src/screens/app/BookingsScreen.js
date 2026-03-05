import React, { useState, useRef, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator,
  RefreshControl,
  Image,
  SafeAreaView,
  StatusBar,
  Dimensions
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { bookingApi } from '../../api';
import { getCurrentApiConfig } from '../../config';
import { useI18n } from '../../i18n';

const { width } = Dimensions.get('window');

const BookingsScreen = ({ navigation }) => {
  const { t, formatDate } = useI18n();
  const [bookings, setBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('upcoming');
  const hasLoadedOnceRef = useRef(false);

  const loadBookings = useCallback(async ({ silent = false, forceRefresh = false } = {}) => {
    try {
      if (!silent) {
        setIsLoading(true);
      }

      const result = await bookingApi.getUserBookings({ forceRefresh });
      if (result.success) {
        setBookings(result.data);
      } else {
        setBookings([]);
      }
    } catch (error) {
      console.error('Error loading bookings:', error);
      setBookings([]);
    } finally {
      if (!silent) {
        setIsLoading(false);
      }
      setRefreshing(false);
    }
  }, []);

  // Refresh data whenever screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (!hasLoadedOnceRef.current) {
        hasLoadedOnceRef.current = true;
        loadBookings({ silent: false });
        return;
      }
      loadBookings({ silent: true });
    }, [loadBookings])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadBookings({ silent: true, forceRefresh: true });
  };

  const handleBookingUpdated = useCallback((updatedBooking) => {
    const bookingId = updatedBooking?._id;
    if (!bookingId) return;

    setBookings((prev) => {
      if (!Array.isArray(prev) || prev.length === 0) return prev;
      const index = prev.findIndex((booking) => String(booking._id) === String(bookingId));
      if (index === -1) return prev;

      const next = [...prev];
      next[index] = { ...next[index], ...updatedBooking };
      return next;
    });
  }, []);

  // Filter and sort bookings based on active tab
  const getFilteredBookings = () => {
    const now = new Date();
    let filtered = [];
    
    if (activeTab === 'upcoming') {
      filtered = bookings.filter(booking => 
        new Date(booking.endDate) >= now && booking.status !== 'cancelled'
      );
      // Sort by start date (closest to today first)
      filtered.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
    } else if (activeTab === 'past') {
      filtered = bookings.filter(booking => 
        new Date(booking.endDate) < now && booking.status !== 'cancelled'
      );
      // Sort by end date (most recent first)
      filtered.sort((a, b) => new Date(b.endDate) - new Date(a.endDate));
    } else if (activeTab === 'cancelled') {
      filtered = bookings.filter(booking => booking.status === 'cancelled');
      // Sort by cancellation date or start date (most recent first)
      filtered.sort((a, b) => {
        const dateA = a.cancelledAt ? new Date(a.cancelledAt) : new Date(a.startDate);
        const dateB = b.cancelledAt ? new Date(b.cancelledAt) : new Date(b.startDate);
        return dateB - dateA;
      });
    }
    
    return filtered;
  };

  // Calculate days left for booking
  const getDaysLeft = (endDate) => {
    const today = new Date();
    const end = new Date(endDate);
    const diffTime = Math.abs(end - today);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Get asset image - use actual photos from asset
  const getAssetImage = (asset) => {
    // Check if asset has photos array and get the first photo
    if (asset?.photos && Array.isArray(asset.photos) && asset.photos.length > 0) {
      const firstPhoto = asset.photos[0];
      
      // Handle different photo URL formats
      if (typeof firstPhoto === 'string') {
        // If it's already a full URL, use it directly
        if (firstPhoto.startsWith('http://') || firstPhoto.startsWith('https://')) {
          return firstPhoto;
        }
        // If it's a relative path, construct the full URL
        const apiConfig = getCurrentApiConfig();
        // Remove '/api' from baseURL to get the server base URL
        const baseUrl = apiConfig.baseURL.replace('/api', '');
        return `${baseUrl}${firstPhoto.startsWith('/') ? '' : '/'}${firstPhoto}`;
      } else if (typeof firstPhoto === 'object' && firstPhoto.url) {
        // If photo is an object with a url property
        return firstPhoto.url;
      }
    }
    
    // Fallback to placeholder images if no photos available
    if (asset?.type === 'boat') {
      return 'https://images.unsplash.com/photo-1564834744159-ff0ea41ba4b9?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=500&q=80';
    } else {
      return 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=500&q=80';
    }
  };

  // Add a navigation handler for booking details
  const navigateToBookingDetail = (booking) => {
    navigation.navigate('BookingDetail', {
      bookingId: booking?._id,
      booking,
      onBookingUpdated: handleBookingUpdated
    });
  };

  const renderEmptyState = () => (
    <View style={styles.emptyStateContainer}>
      <Image
        source={require('../../../assets/no-data.png')}
        style={styles.emptyStateImage}
        defaultSource={require('../../../assets/no-data.png')}
        fallback={
          <View style={styles.fallbackImageContainer}>
            <MaterialIcons name="search-off" size={60} color="#ccc" />
          </View>
        }
      />
      <Text style={styles.emptyStateText}>{t('No Data Found')}</Text>
    </View>
  );

  const renderBookingItem = ({ item }) => {
    const daysLeft = getDaysLeft(item.endDate);
    
    // Add null check for asset
    if (!item.asset) {
      return null; // Skip rendering this item if asset is null
    }
    
    // Derive cancelled short-term penalty info
    const isCancelled = item.status === 'cancelled';
    const isShortTermCancelled = isCancelled && item.shortTermCancelled;
    const originalDays = item.originalDays ?? (Math.ceil((new Date(item.endDate) - new Date(item.startDate)) / (1000 * 60 * 60 * 24)) + 1);
    const rebookedDays = item.rebookedDays || 0;
    const remainingPenaltyDays = isShortTermCancelled
      ? (item.remainingPenaltyDays != null ? item.remainingPenaltyDays : Math.max(0, originalDays - rebookedDays))
      : 0;

    return (
      <TouchableOpacity 
        style={styles.bookingCard}
        onPress={() => navigateToBookingDetail(item)}
      >
        <Image 
          source={{ uri: getAssetImage(item.asset) }}
          style={styles.bookingImage}
          resizeMode="cover"
        />
        <View style={styles.bookingContent}>
          <View style={styles.bookingHeader}>
            <Text style={styles.assetName}>{item.asset?.name || t('Unknown Asset')}</Text>
            <Text style={styles.assetLocation}>{item.asset?.location || t('Location not available')}</Text>
            
            <View style={styles.dateContainer}>
              <Text style={styles.bookingDates}>
                {formatDate(new Date(item.startDate), 'dd MMM, yyyy')} - {formatDate(new Date(item.endDate), 'dd MMM, yyyy')}
              </Text>
            </View>
            
            <View style={styles.bookingTypeContainer}>
              <Text style={styles.bookingTypeLabel}>{t('Booking Type')}</Text>
              <Text style={styles.bookingType}>{item.bookingType || t('Short')}</Text>
            </View>

            {activeTab === 'cancelled' && (
              <View style={styles.cancelledInfoContainer}>
                {isShortTermCancelled ? (
                  <Text style={styles.cancelledInfoText}>
                    {remainingPenaltyDays > 0
                      ? t('{{days}} day{{suffix}} deducted', {
                          days: remainingPenaltyDays,
                          suffix: remainingPenaltyDays === 1 ? '' : 's',
                        })
                      : t('No days deducted')}
                    {rebookedDays > 0 ? ` • ${rebookedDays} rebooked` : ''}
                  </Text>
                ) : (
                  <Text style={styles.cancelledInfoText}>{t('No days deducted')}</Text>
                )}
              </View>
            )}
          </View>
          
          {activeTab === 'upcoming' && (
            <View style={styles.daysLeftContainer}>
              <Text style={styles.daysLeftText}>{t('{{days}} Days Left', { days: daysLeft })}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t('My Bookings')}</Text>
        </View>
        
        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'upcoming' && styles.activeTab]}
            onPress={() => setActiveTab('upcoming')}
          >
            <Text 
              style={[
                styles.tabText, 
                activeTab === 'upcoming' && styles.activeTabText
              ]}
            >
              {t('UPCOMING')}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.tab, activeTab === 'past' && styles.activeTab]}
            onPress={() => setActiveTab('past')}
          >
            <Text 
              style={[
                styles.tabText, 
                activeTab === 'past' && styles.activeTabText
              ]}
            >
              {t('PAST')}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.tab, activeTab === 'cancelled' && styles.activeTab]}
            onPress={() => setActiveTab('cancelled')}
          >
            <Text 
              style={[
                styles.tabText, 
                activeTab === 'cancelled' && styles.activeTabText
              ]}
            >
              {t('CANCELLED')}
            </Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.tabIndicatorContainer}>
          <View 
            style={[
              styles.tabIndicator, 
              { 
                left: activeTab === 'upcoming' ? 0 : 
                      activeTab === 'past' ? width / 3 : 
                      2 * width / 3,
                width: width / 3
              }
            ]} 
          />
        </View>
        
        {/* Content */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#1E4640" />
          </View>
        ) : (
          <>
            <FlatList
              data={getFilteredBookings()}
              keyExtractor={(item) => item._id}
              renderItem={renderBookingItem}
              contentContainerStyle={styles.listContainer}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
              }
              ListEmptyComponent={renderEmptyState}
            />
            
            {/* Smart Scheduling Rules */}
            <TouchableOpacity style={styles.schedulingRulesContainer} onPress={() => navigation.navigate('SchedulingRules') }>
              <Text style={styles.schedulingRulesText}>{t('Smart Scheduling Rules')}</Text>
              <MaterialIcons name="chevron-right" size={24} color="#000" />
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingBottom: 70,
  },
  header: {
    padding: 20,
    paddingBottom: 10,
    backgroundColor: '#fff',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
  },
  tab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#fff',
  },
  tabText: {
    fontSize: 14,
    color: '#9e9e9e',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#000',
    fontWeight: 'bold',
  },
  tabIndicatorContainer: {
    height: 3,
    backgroundColor: '#e0e0e0',
    position: 'relative',
  },
  tabIndicator: {
    height: 3,
    backgroundColor: '#000',
    position: 'absolute',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    flexGrow: 1,
    padding: 15,
    paddingBottom: 70,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyStateImage: {
    width: 200,
    height: 200,
    resizeMode: 'contain',
  },
  fallbackImageContainer: {
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 100,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
  },
  bookingCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#eee',
  },
  bookingImage: {
    width: '100%',
    height: 160,
  },
  bookingContent: {
    padding: 15,
    position: 'relative',
  },
  bookingHeader: {
    flexDirection: 'column',
  },
  assetName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 3,
  },
  assetLocation: {
    fontSize: 16,
    color: '#666',
    marginBottom: 10,
  },
  dateContainer: {
    backgroundColor: '#1E4640',
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
  },
  bookingDates: {
    fontSize: 14,
    color: '#fff',
    textAlign: 'center',
  },
  bookingTypeContainer: {
    marginTop: 5,
  },
  bookingTypeLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 3,
  },
  bookingType: {
    fontSize: 16,
    fontWeight: '500',
  },
  cancelledInfoContainer: {
    marginTop: 8,
    backgroundColor: '#FFF5E6',
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#FFE0B2'
  },
  cancelledInfoText: {
    fontSize: 12,
    color: '#8D6E63'
  },
  daysLeftContainer: {
    position: 'absolute',
    right: 15,
    bottom: 15,
    backgroundColor: '#1E4640',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 5,
  },
  daysLeftText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  schedulingRulesContainer: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderColor: '#eee',
  },
  schedulingRulesText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default BookingsScreen; 
