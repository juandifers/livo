import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator, 
  RefreshControl,
  Image,
  Dimensions,
  StatusBar,
  SafeAreaView
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { assetApi } from '../../api';
import { getCurrentApiConfig } from '../../config';

// Get screen width
const { width } = Dimensions.get('window');

const HomeScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [ownedAssets, setOwnedAssets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      setIsLoading(true);
      
      // Get user's owned assets
      const assetsResult = await assetApi.getUserAssets();
      if (assetsResult.success) {
        setOwnedAssets(assetsResult.data);
      }
    } catch (error) {
      console.error('Error loading home data:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Refresh data whenever screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // Get asset image from uploaded photos or fallback to placeholder
  const getAssetImage = (asset) => {
    // Check if asset has uploaded photos
    if (asset?.photos && asset.photos.length > 0) {
      const photoUrl = asset.photos[0];
      // Handle both relative and absolute URLs
      if (photoUrl.startsWith('http')) {
        return photoUrl;
      } else {
        // Construct full URL for relative paths
        const apiConfig = getCurrentApiConfig();
        const baseUrl = apiConfig.baseURL.replace('/api', '');
        return `${baseUrl}${photoUrl}`;
      }
    }
    
    // Fallback to placeholder images based on type
    if (asset.type === 'boat') {
      return 'https://images.unsplash.com/photo-1564834744159-ff0ea41ba4b9?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=500&q=80';
    } else {
      return 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=500&q=80';
    }
  };

  // Navigation handler for asset details - add this back
  const navigateToAssetDetail = (asset) => {
    navigation.navigate('Assets', { 
      screen: 'AssetDetail', 
      params: { assetId: asset._id, asset } 
    });
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1E4640" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.container}>
        {/* Header with user profile */}
        <View style={styles.header}>
          <View style={styles.profileContainer}>
            <View style={styles.avatarContainer}>
              <Text style={styles.avatarText}>
                {user?.name?.charAt(0)}
              </Text>
            </View>
            <Text style={styles.userName}>
              {`${user?.name} ${user?.lastName || ''}`}
            </Text>
          </View>
        </View>

        <ScrollView 
          style={styles.scrollContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* Your Assets Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>YOUR HOMES</Text>

            {ownedAssets.length > 0 ? (
              ownedAssets.map((asset) => (
                <TouchableOpacity 
                  key={asset._id} 
                  style={styles.assetCard}
                  onPress={() => navigateToAssetDetail(asset)}
                >
                  <Image
                    source={{ uri: getAssetImage(asset) }}
                    style={styles.assetImage}
                    resizeMode="cover"
                  />
                  <View style={styles.assetInfo}>
                    <Text style={styles.assetName}>
                      {asset.name}
                    </Text>
                    <Text style={styles.assetLocation}>
                      {asset.location}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>You don't own any assets yet</Text>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Bottom Navigation removed - now handled by tab navigator */}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  header: {
    backgroundColor: '#fff',
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  profileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#1E4640',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E4640',
    marginLeft: 15,
  },
  scrollContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#000',
  },
  assetCard: {
    marginBottom: 20,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  assetImage: {
    width: '100%',
    height: 200,
    backgroundColor: '#f0f0f0',
  },
  assetInfo: {
    padding: 15,
  },
  assetName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#000',
  },
  assetLocation: {
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
});

export default HomeScreen; 