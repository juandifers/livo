import React, { useState, useEffect, useCallback } from 'react';
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
import { format } from 'date-fns';

const { width } = Dimensions.get('window');

const BookingsScreen = ({ navigation }) => {
  const [bookings, setBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('upcoming');

  const loadBookings = async () => {
    try {
      setIsLoading(true);
      const result = await bookingApi.getUserBookings();
      if (result.success) {
        setBookings(result.data);
      }
    } catch (error) {
      console.error('Error loading bookings:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, []);

  // Refresh data whenever screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (!isLoading) {
        loadBookings();
      }
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadBookings();
  };

  // Filter bookings based on active tab
  const getFilteredBookings = () => {
    const now = new Date();
    
    if (activeTab === 'upcoming') {
      return bookings.filter(booking => 
        new Date(booking.endDate) >= now && booking.status !== 'cancelled'
      );
    } else if (activeTab === 'past') {
      return bookings.filter(booking => 
        new Date(booking.endDate) < now && booking.status !== 'cancelled'
      );
    } else if (activeTab === 'cancelled') {
      return bookings.filter(booking => booking.status === 'cancelled');
    }
    
    return [];
  };

  // Calculate days left for booking
  const getDaysLeft = (endDate) => {
    const today = new Date();
    const end = new Date(endDate);
    const diffTime = Math.abs(end - today);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Get asset image (mock function for now)
  const getAssetImage = (asset) => {
    if (asset?.type === 'boat') {
      return 'https://images.unsplash.com/photo-1564834744159-ff0ea41ba4b9?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=500&q=80';
    } else {
      return 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=500&q=80';
    }
  };

  // Add a navigation handler for booking details
  const navigateToBookingDetail = (bookingId, booking) => {
    navigation.navigate('BookingDetail', { bookingId, booking });
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
      <Text style={styles.emptyStateText}>No Data Found</Text>
    </View>
  );

  const renderBookingItem = ({ item }) => {
    const daysLeft = getDaysLeft(item.endDate);
    
    return (
      <TouchableOpacity 
        style={styles.bookingCard}
        onPress={() => navigateToBookingDetail(item._id, item)}
      >
        <Image 
          source={{ uri: getAssetImage(item.asset) }}
          style={styles.bookingImage}
          resizeMode="cover"
        />
        <View style={styles.bookingContent}>
          <View style={styles.bookingHeader}>
            <Text style={styles.assetName}>{item.asset.name}</Text>
            <Text style={styles.assetLocation}>{item.asset.location || 'Cartagena'}</Text>
            
            <View style={styles.dateContainer}>
              <Text style={styles.bookingDates}>
                {format(new Date(item.startDate), 'dd MMM, yyyy')} - {format(new Date(item.endDate), 'dd MMM, yyyy')}
              </Text>
            </View>
            
            <View style={styles.bookingTypeContainer}>
              <Text style={styles.bookingTypeLabel}>Booking Type</Text>
              <Text style={styles.bookingType}>{item.bookingType || 'Short'}</Text>
            </View>
          </View>
          
          {activeTab === 'upcoming' && (
            <View style={styles.daysLeftContainer}>
              <Text style={styles.daysLeftText}>{daysLeft} Days Left</Text>
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
          <Text style={styles.headerTitle}>My Bookings</Text>
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
              UPCOMING
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
              PAST
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
              CANCELLED
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
            <TouchableOpacity style={styles.schedulingRulesContainer}>
              <Text style={styles.schedulingRulesText}>Smart Scheduling Rules</Text>
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
    bottom: 70,
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