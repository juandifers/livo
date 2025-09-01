import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator,
  Image,
  SafeAreaView,
  StatusBar,
  Dimensions
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { assetApi, bookingApi, authApi } from '../../api';

const { width } = Dimensions.get('window');

const AssetDetailScreen = ({ route, navigation }) => {
  const { assetId, asset: initialAsset } = route.params;
  const [asset, setAsset] = useState(initialAsset || null);
  const [bookings, setBookings] = useState([]);
  const [userAllocation, setUserAllocation] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(!initialAsset);
  const [isLoadingBookings, setIsLoadingBookings] = useState(true);
  const [isLoadingAllocation, setIsLoadingAllocation] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const loadCurrentUser = async () => {
    try {
      const result = await authApi.getCurrentUser();
      if (result.success) {
        setCurrentUser(result.data);
        return result.data;
      }
    } catch (error) {
      console.error('Error loading current user:', error);
    }
    return null;
  };

  const loadAssetDetails = async () => {
    if (!initialAsset) {
      try {
        setIsLoading(true);
        const result = await assetApi.getAssetById(assetId);
        if (result.success) {
          setAsset(result.data);
        }
      } catch (error) {
        console.error('Error loading asset details:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const loadAssetBookings = async () => {
    try {
      setIsLoadingBookings(true);
      const result = await bookingApi.getAssetBookings(assetId);
      if (result.success) {
        setBookings(result.data);
      }
    } catch (error) {
      console.error('Error loading asset bookings:', error);
    } finally {
      setIsLoadingBookings(false);
    }
  };

  const loadUserAllocation = async (user) => {
    try {
      setIsLoadingAllocation(true);
      const result = await bookingApi.getUserAllocation(user._id, assetId);
      if (result.success) {
        setUserAllocation(result.data);
      }
    } catch (error) {
      console.error('Error loading user allocation:', error);
    } finally {
      setIsLoadingAllocation(false);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      const user = await loadCurrentUser();
      await loadAssetDetails();
      await loadAssetBookings();
      if (user) {
        await loadUserAllocation(user);
      }
    };
    loadData();
  }, [assetId]);

  // Get asset image based on type
  const getAssetImage = () => {
    if (asset?.type === 'boat') {
      return 'https://images.unsplash.com/photo-1564834744159-ff0ea41ba4b9?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80';
    } else {
      return 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80';
    }
  };

  // Get ownership display from real data
  const getOwnershipDisplay = () => {
    if (userAllocation?.sharePercentage) {
      const percentage = userAllocation.sharePercentage;
      // Convert percentage to eighths: 12.5% = 1/8, 25% = 2/8, 50% = 4/8, etc.
      const eighths = Math.round(percentage / 12.5);
      return `${percentage}% (${eighths}/8 Ownership)`;
    }
    return 'No ownership data'; // Default value
  };

  // Get used days from real data
  const getUsedDays = () => {
    if (userAllocation) {
      return {
        used: userAllocation.daysBooked || 0,
        total: userAllocation.allowedDaysPerYear || 0
      };
    }
    return {
      used: 0,
      total: 0
    };
  };

  // Get special dates usage from real data
  const getSpecialDatesUsage = () => {
    if (userAllocation?.specialDates) {
      return {
        type1: userAllocation.specialDates.type1,
        type2: userAllocation.specialDates.type2
      };
    }
    return {
      type1: { used: 0, total: 0 },
      type2: { used: 0, total: 0 }
    };
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1E4640" />
      </View>
    );
  }

  const usedDays = getUsedDays();
  const specialDates = getSpecialDatesUsage();

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <ScrollView style={styles.container} bounces={false}>
        {/* Image Header */}
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
          
          {/* Image Indicator */}
          <View style={styles.indicatorContainer}>
            <View style={styles.indicator} />
          </View>
        </View>

        {/* Asset Details */}
        <View style={styles.detailsContainer}>
          {/* Asset Name & Type */}
          <Text style={styles.assetName}>
            {asset.name}
          </Text>
          
          {/* Ownership */}
          <Text style={styles.ownershipText}>
            {isLoadingAllocation ? 'Loading...' : getOwnershipDisplay()}
          </Text>
          
          {/* Category */}
          <View style={styles.detailSection}>
            <Text style={styles.sectionTitle}>Category</Text>
            <Text style={styles.breadcrumbText}>
              {asset.type === 'boat' ? 'Boats' : 'Homes'}
            </Text>
          </View>
          
          {/* Location */}
          <View style={styles.detailSection}>
            <View style={styles.locationHeader}>
              <Text style={styles.sectionTitle}>Location Address</Text>
              <TouchableOpacity style={styles.mapButton}>
                <Text style={styles.mapButtonText}>SHOW ON MAP</Text>
                <MaterialIcons name="chevron-right" size={24} color="#000" />
              </TouchableOpacity>
            </View>
            <Text style={styles.sectionValue}>{asset.location || 'Mesa de Yeguas'}</Text>
          </View>
          
          {/* Annual Stay Tracker */}
          <View style={styles.detailSection}>
            <Text style={styles.sectionTitle}>Annual stay tracker</Text>
            <View style={styles.stayTrackerSection}>
              <Text style={styles.trackerTitle}>Day Used / Total Available</Text>
              <Text style={styles.trackerValue}>
                {isLoadingAllocation ? 'Loading...' : `${usedDays.used}/${usedDays.total}`}
              </Text>
            </View>
          </View>
          
          {/**
           * Special Dates quick summary (commented out per request) - keep for potential re-enable
           *
           * <View style={styles.detailSection}>
           *   <Text style={styles.sectionTitle}>Special Dates Used/ Total Available</Text>
           *   <Text style={styles.trackerValue}>
           *     Tipo 1: {specialDates.type1.used} / {specialDates.type1.total} y Tipo 2: {specialDates.type2.used} / {specialDates.type2.total}
           *   </Text>
           * </View>
           */}
          
          {/* Booking Summary */}
          <View style={styles.summaryContainer}>
            <Text style={styles.summaryTitle}>Annual Booking Summary</Text>
            
            {userAllocation && (
              <>
                {/* Days Summary */}
                <View style={styles.summaryRow}>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryValue}>{userAllocation.daysRemaining}</Text>
                    <Text style={styles.summaryLabel}>Days Remaining</Text>
                  </View>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryValue}>{userAllocation.daysBooked}</Text>
                    <Text style={styles.summaryLabel}>Booked</Text>
                  </View>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryValue}>{userAllocation.allowedDaysPerYear}</Text>
                    <Text style={styles.summaryLabel}>Total</Text>
                  </View>
                </View>

                {/* Progress Bar */}
                <View style={styles.progressContainer}>
                  <View style={styles.progressBarBackground}>
                    <View 
                      style={[
                        styles.progressBar, 
                        { 
                          width: `${(userAllocation.daysBooked / userAllocation.allowedDaysPerYear) * 100}%`,
                          backgroundColor: userAllocation.daysBooked > userAllocation.allowedDaysPerYear * 0.8 ? '#ff6b6b' : '#1E4640'
                        }
                      ]} 
                    />
                  </View>
                  <Text style={styles.progressText}>
                    {Math.round((userAllocation.daysBooked / userAllocation.allowedDaysPerYear) * 100)}% of annual allocation used
                  </Text>
                </View>

                {/* Special Dates Summary */}
                {userAllocation.specialDates && (
                  <View style={styles.specialDatesContainer}>
                    <Text style={styles.specialDatesTitle}>Special Dates</Text>
                   
                    
                    <View style={styles.specialDatesRow}>
                      {/* Type 1 Special Dates */}
                      <View style={styles.specialDateItem}>
                        <View style={styles.specialDateHeader}>
                          <Text style={styles.specialDateType}></Text>
                          <View style={[styles.specialDateBadge, styles.type1Badge]}>
                            <Text style={styles.specialDateBadgeText}>TYPE 1</Text>
                          </View>
                        </View>
                        <Text style={styles.specialDateUsage}>
                          {userAllocation.specialDates.type1.used} / {userAllocation.specialDates.type1.total} used
                        </Text>
                        <View style={styles.specialDateProgressContainer}>
                          <View style={styles.specialDateProgressBackground}>
                            <View 
                              style={[
                                styles.specialDateProgress,
                                styles.type1Progress,
                                { 
                                  width: userAllocation.specialDates.type1.total > 0 
                                    ? `${(userAllocation.specialDates.type1.used / userAllocation.specialDates.type1.total) * 100}%`
                                    : '0%'
                                }
                              ]} 
                            />
                          </View>
                        </View>
                      </View>

                      {/* Type 2 Special Dates */}
                      <View style={styles.specialDateItem}>
                        <View style={styles.specialDateHeader}>
                          <Text style={styles.specialDateType}></Text>
                          <View style={[styles.specialDateBadge, styles.type2Badge]}>
                            <Text style={styles.specialDateBadgeText}>TYPE 2</Text>
                          </View>
                        </View>
                        <Text style={styles.specialDateUsage}>
                          {userAllocation.specialDates.type2.used} / {userAllocation.specialDates.type2.total} used
                        </Text>
                        <View style={styles.specialDateProgressContainer}>
                          <View style={styles.specialDateProgressBackground}>
                            <View 
                              style={[
                                styles.specialDateProgress,
                                styles.type2Progress,
                                { 
                                  width: userAllocation.specialDates.type2.total > 0 
                                    ? `${(userAllocation.specialDates.type2.used / userAllocation.specialDates.type2.total) * 100}%`
                                    : '0%'
                                }
                              ]} 
                            />
                          </View>
                        </View>
                      </View>
                    </View>
                    
                    <Text style={styles.specialDatesNote}>
                      Each 1/8 share (12.5%) grants access to one special date of each type per year
                    </Text>
                  </View>
                )}

                {/* Active Bookings */}
                <View style={styles.activeBookingsContainer}>
                  <Text style={styles.activeBookingsTitle}>Active Bookings</Text>
                  <Text style={styles.activeBookingsCount}>
                    {userAllocation.activeBookings} of {userAllocation.maxActiveBookings} slots used
                  </Text>
                </View>
              </>
            )}
          </View>
          
          {/* Book Now Button */}
          <TouchableOpacity 
            style={styles.bookButton}
            onPress={() => navigation.navigate('CreateBooking', { asset })}
          >
            <MaterialIcons name="calendar-today" size={20} color="#fff" />
            <Text style={styles.bookButtonText}>Book Now</Text>
          </TouchableOpacity>
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
  indicatorContainer: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center'
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
    margin: 4
  },
  detailsContainer: {
    padding: 20
  },
  assetName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5
  },
  ownershipText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 20
  },
  detailSection: {
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  locationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  sectionTitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5
  },
  sectionValue: {
    fontSize: 18,
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
  stayTrackerSection: {
    marginTop: 5
  },
  trackerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5
  },
  trackerValue: {
    fontSize: 20,
    fontWeight: 'bold'
  },
  bookButton: {
    backgroundColor: '#1E4640',
    borderRadius: 8,
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20
  },
  bookButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10
  },
  breadcrumbText: {
    fontSize: 18,
    fontWeight: 'bold'
  },
  summaryContainer: {
    padding: 20,
    alignItems: 'center'
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center'
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 10
  },
  summaryItem: {
    flexDirection: 'column',
    alignItems: 'center',
    minWidth: 90
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold'
  },
  summaryLabel: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center'
  },
  progressContainer: {
    marginBottom: 20,
    width: '90%',
    alignItems: 'center'
  },
  progressBarBackground: {
    height: 14,
    backgroundColor: '#eee',
    borderRadius: 10,
    overflow: 'hidden',
    width: '100%'
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#1E4640',
    borderRadius: 10
  },
  progressText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 8,
    textAlign: 'center'
  },
  specialDatesContainer: {
    padding: 20,
    alignItems: 'center'
  },
  specialDatesTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center'
  },
  specialDatesSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center'
  },
  specialDatesRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 10
  },
  specialDateItem: {
    flexDirection: 'column',
    alignItems: 'center',
    minWidth: 140
  },
  specialDateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5
  },
  specialDateType: {
    fontSize: 16,
    fontWeight: 'bold'
  },
  specialDateBadge: {
    backgroundColor: '#eee',
    borderRadius: 10,
    padding: 5
  },
  specialDateBadgeText: {
    fontSize: 14,
    fontWeight: 'bold'
  },
  specialDateUsage: {
    fontSize: 18,
    fontWeight: 'bold'
  },
  specialDateProgressContainer: {
    width: 100,
    height: 20,
    backgroundColor: '#eee',
    borderRadius: 10,
    overflow: 'hidden',
    marginTop: 5
  },
  specialDateProgressBackground: {
    height: '100%',
    backgroundColor: '#eee',
    borderRadius: 10,
    overflow: 'hidden'
  },
  specialDateProgress: {
    height: '100%',
    backgroundColor: '#6200ee',
    borderRadius: 10
  },
  type1Badge: {
    backgroundColor: '#ff6b6b'
  },
  type2Badge: {
    backgroundColor: '#6200ee'
  },
  type1Progress: {
    backgroundColor: '#ff6b6b'
  },
  type2Progress: {
    backgroundColor: '#6200ee'
  },
  specialDatesNote: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
    textAlign: 'center'
  },
  activeBookingsContainer: {
    padding: 20
  },
  activeBookingsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20
  },
  activeBookingsCount: {
    fontSize: 18,
    fontWeight: 'bold'
  }
});

export default AssetDetailScreen; 