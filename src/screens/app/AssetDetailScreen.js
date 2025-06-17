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

  // Get special dates usage
  const getSpecialDatesUsage = () => {
    // In a real app, this would come from the backend
    return {
      type1: { used: 0, total: 1 },
      type2: { used: 0, total: 1 }
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
          
          {/* Special Dates */}
          <View style={styles.detailSection}>
            <Text style={styles.sectionTitle}>Special Dates Used/ Total Available</Text>
            <Text style={styles.trackerValue}>
              Tipo 1: {specialDates.type1.used}/ {specialDates.type1.total} y Tipo 2: {specialDates.type2.used}/ {specialDates.type2.total}
            </Text>
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
  }
});

export default AssetDetailScreen; 