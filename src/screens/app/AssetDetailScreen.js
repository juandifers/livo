import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Dimensions,
  FlatList,
  Modal,
  Linking
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { assetApi, bookingApi, authApi } from '../../api';
import { useI18n } from '../../i18n';

const { width } = Dimensions.get('window');

const AssetDetailScreen = ({ route, navigation }) => {
  const { t } = useI18n();
  const { assetId, asset: initialAsset } = route.params;
  const [asset, setAsset] = useState(initialAsset || null);
  const [bookings, setBookings] = useState([]);
  const [userAllocation, setUserAllocation] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(!initialAsset);
  const [isLoadingBookings, setIsLoadingBookings] = useState(true);
  const [isLoadingAllocation, setIsLoadingAllocation] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [selectedWindowKey, setSelectedWindowKey] = useState('current'); // 'current' | 'next'
  const [showYearPicker, setShowYearPicker] = useState(false);
  const hasInitialLoadCompletedRef = useRef(false);
  const refreshInFlightRef = useRef(false);

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
      if (refreshInFlightRef.current) {
        return;
      }

      refreshInFlightRef.current = true;
      hasInitialLoadCompletedRef.current = false;
      try {
        const user = await loadCurrentUser();
        await loadAssetDetails();
        await loadAssetBookings();
        if (user) {
          await loadUserAllocation(user);
        }
      } finally {
        refreshInFlightRef.current = false;
        hasInitialLoadCompletedRef.current = true;
      }
    };
    loadData();
  }, [assetId]);

  // Refresh counters whenever this screen regains focus.
  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      if (!hasInitialLoadCompletedRef.current || refreshInFlightRef.current) {
        return () => {
          isActive = false;
        };
      }

      (async () => {
        refreshInFlightRef.current = true;
        try {
          const user = currentUser || await loadCurrentUser();
          if (!isActive) return;
          await loadAssetBookings();
          if (user && isActive) {
            await loadUserAllocation(user);
          }
        } finally {
          refreshInFlightRef.current = false;
        }
      })();

      return () => {
        isActive = false;
      };
    }, [assetId, currentUser])
  );

  // Get asset image - prioritize uploaded photos, fallback to default
  const getAssetImage = () => {
    // If asset has uploaded photos, use the first one
    if (asset?.photos && asset.photos.length > 0) {
      const photoUrl = asset.photos[0];
      // Handle both relative and absolute URLs
      if (photoUrl.startsWith('http')) {
        return photoUrl;
      } else {
        // Construct full URL for relative paths
        const { getCurrentApiConfig } = require('../../config');
        const apiConfig = getCurrentApiConfig();
        const baseUrl = apiConfig.baseURL.replace('/api', '');
        return `${baseUrl}${photoUrl}`;
      }
    }
    
    // Fallback to default images based on type
    if (asset?.type === 'boat') {
      return 'https://images.unsplash.com/photo-1564834744159-ff0ea41ba4b9?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80';
    } else {
      return 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80';
    }
  };

  // Get all asset images for gallery
  const getAssetImages = () => {
    if (asset?.photos && asset.photos.length > 0) {
      const { getCurrentApiConfig } = require('../../config');
      const apiConfig = getCurrentApiConfig();
      const baseUrl = apiConfig.baseURL.replace('/api', '');
      
      return asset.photos.map(photoUrl => {
        if (photoUrl.startsWith('http')) {
          return photoUrl;
        } else {
          return `${baseUrl}${photoUrl}`;
        }
      });
    }
    
    // Fallback to single default image
    return [getAssetImage()];
  };

  // Get ownership display from real data
  const getOwnershipDisplay = () => {
    if (userAllocation?.sharePercentage) {
      const percentage = userAllocation.sharePercentage;
      // Convert percentage to eighths: 12.5% = 1/8, 25% = 2/8, 50% = 4/8, etc.
      const eighths = Math.round(percentage / 12.5);
      return t('{{percentage}}% ({{eighths}}/8 Ownership)', { percentage, eighths });
    }
    return t('No ownership data'); // Default value
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

  const getSelectedWindowData = () => {
    if (!userAllocation) return null;
    if (selectedWindowKey === 'next') return userAllocation.nextYear || null;
    return userAllocation.currentYear || null;
  };

  const getWindowLabelFromAllocation = (key) => {
    if (!userAllocation) return t('Loading...');

    // Prefer top-level window ranges (backend now returns these).
    const top =
      key === 'next'
        ? userAllocation?.nextWindow
        : userAllocation?.currentWindow;
    if (top?.start && top?.end) return `${top.start} → ${top.end}`;

    // Fallback to per-window fields (kept for backwards compatibility).
    const per = key === 'next' ? userAllocation?.nextYear : userAllocation?.currentYear;
    if (per?.windowStart && per?.windowEnd) return `${per.windowStart} → ${per.windowEnd}`;

    return t('Loading...');
  };

  const getSelectedWindowLabel = () => {
    return getWindowLabelFromAllocation(selectedWindowKey);
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
  const assetAddress = asset?.locationAddress || asset?.location || '';

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <ScrollView style={styles.container} bounces={false}>
        {/* Image Header */}
        <View style={styles.imageContainer}>
          <FlatList
            data={getAssetImages()}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item, index) => index.toString()}
            onMomentumScrollEnd={(event) => {
              const newIndex = Math.round(event.nativeEvent.contentOffset.x / width);
              setCurrentImageIndex(newIndex);
            }}
            renderItem={({ item }) => (
              <Image
                source={{ uri: item }}
                style={styles.assetImage}
                resizeMode="cover"
              />
            )}
          />
          
          {/* Back Button */}
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <MaterialIcons name="arrow-back" size={24} color="black" />
          </TouchableOpacity>
          
          {/* Image Indicators */}
          {getAssetImages().length > 1 && (
            <View style={styles.indicatorContainer}>
              {getAssetImages().map((_, index) => (
                <View 
                  key={index}
                  style={[
                    styles.indicator, 
                    index === currentImageIndex && styles.activeIndicator
                  ]} 
                />
              ))}
            </View>
          )}
        </View>

        {/* Asset Details */}
        <View style={styles.detailsContainer}>
          {/* Asset Name & Type */}
          <Text style={styles.assetName}>
            {asset.name}
          </Text>
          
          {/* Ownership */}
          <Text style={styles.ownershipText}>
            {isLoadingAllocation ? t('Loading...') : getOwnershipDisplay()}
          </Text>
          
          {/* Category */}
          <View style={styles.detailSection}>
            <Text style={styles.sectionTitle}>{t('Category')}</Text>
            <Text style={styles.breadcrumbText}>
              {asset.type === 'boat' ? t('Boats') : t('Homes')}
            </Text>
          </View>
          
          {/* Location */}
          <View style={styles.detailSection}>
            <View style={styles.locationHeader}>
              <Text style={styles.sectionTitle}>{t('Location Address')}</Text>
              <TouchableOpacity
                style={styles.mapButton}
                onPress={() => {
                  if (!assetAddress) return;
                  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(assetAddress)}`;
                  Linking.openURL(mapsUrl).catch(() => {});
                }}
              >
                <Text style={styles.mapButtonText}>{t('SHOW ON MAP')}</Text>
                <MaterialIcons name="chevron-right" size={24} color="#000" />
              </TouchableOpacity>
            </View>
            <Text style={styles.sectionValue}>{assetAddress || t('Unknown Location')}</Text>
          </View>
          
          {/* Annual Stay Tracker */}
          <View style={styles.detailSection}>
            <Text style={styles.sectionTitle}>{t('Annual stay tracker')}</Text>
            <View style={styles.stayTrackerSection}>
              <Text style={styles.trackerTitle}>{t('Day Used / Total Available')}</Text>
              <Text style={styles.trackerValue}>
                {isLoadingAllocation ? t('Loading...') : `${usedDays.used}/${usedDays.total}`}
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
            {/* Allocation Window Selector */}
            <TouchableOpacity 
              style={styles.yearSelector}
              onPress={() => setShowYearPicker(true)}
            >
              <Text style={styles.yearSelectorText}>{getSelectedWindowLabel()}</Text>
              <MaterialIcons name="arrow-drop-down" size={20} color="#666" />
            </TouchableOpacity>
            
            <Text style={styles.summaryTitle}>{t('Annual Booking Summary')}</Text>
            
            {userAllocation && (
              <>
                {/* Selected Year Summary */}
                <View style={styles.summaryRow}>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryValue}>
                      {(() => {
                        const d = getSelectedWindowData();
                        return d?.daysRemaining ?? userAllocation.daysRemaining ?? 0;
                      })()}
                    </Text>
                    <Text style={styles.summaryLabel}>{t('Days Remaining')}</Text>
                  </View>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryValue}>
                      {(() => {
                        const d = getSelectedWindowData();
                        return d?.daysBooked ?? userAllocation.daysBooked ?? 0;
                      })()}
                    </Text>
                    <Text style={styles.summaryLabel}>{t('Booked')}</Text>
                  </View>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryValue}>{userAllocation.allowedDaysPerYear}</Text>
                    <Text style={styles.summaryLabel}>{t('Total')}</Text>
                  </View>
                </View>

                {/* Progress Bar */}
                <View style={styles.progressContainer}>
                  <View style={styles.progressBarBackground}>
                    <View 
                      style={[
                        styles.progressBar, 
                        { 
                          width: `${(() => {
                            const daysBooked = (() => {
                              const d = getSelectedWindowData();
                              return d?.daysBooked ?? userAllocation.daysBooked ?? 0;
                            })();
                            return (daysBooked / userAllocation.allowedDaysPerYear) * 100;
                          })()}%`,
                          backgroundColor: (() => {
                            const daysBooked = (() => {
                              const d = getSelectedWindowData();
                              return d?.daysBooked ?? userAllocation.daysBooked ?? 0;
                            })();
                            return daysBooked > userAllocation.allowedDaysPerYear * 0.8 ? '#ff6b6b' : '#1E4640';
                          })()
                        }
                      ]} 
                    />
                  </View>
                  <Text style={styles.progressText}>
                    {(() => {
                      const daysBooked = (() => {
                        const d = getSelectedWindowData();
                        return d?.daysBooked ?? userAllocation.daysBooked ?? 0;
                      })();
                      return Math.round((daysBooked / userAllocation.allowedDaysPerYear) * 100);
                    })()}% {t('of this window allocation used')}
                  </Text>
                </View>

                {/* Special Dates Summary */}
                {userAllocation.specialDates && (
                  <View style={styles.specialDatesContainer}>
                    <Text style={styles.specialDatesTitle}>{t('Special Dates')}</Text>
                   
                    
                    <View style={styles.specialDatesRow}>
                      {/* Type 1 Special Dates */}
                      <View style={styles.specialDateItem}>
                        <View style={styles.specialDateHeader}>
                          <Text style={styles.specialDateType}></Text>
                          <View style={[styles.specialDateBadge, styles.type1Badge]}>
                            <Text style={styles.specialDateBadgeText}>{t('Type 1')}</Text>
                          </View>
                        </View>
                        <Text style={styles.specialDateUsage}>
                          {userAllocation.specialDates.type1.used} / {userAllocation.specialDates.type1.total} {t('used')}
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
                            <Text style={styles.specialDateBadgeText}>{t('Type 2')}</Text>
                          </View>
                        </View>
                        <Text style={styles.specialDateUsage}>
                          {userAllocation.specialDates.type2.used} / {userAllocation.specialDates.type2.total} {t('used')}
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
                    
                  </View>
                )}

                {/* Active Bookings - FEAT-ACTIVE-001: Use universal counter */}
                <View style={styles.activeBookingsContainer}>
                  <Text style={styles.activeBookingsTitle}>{t('Active Bookings')}</Text>
                  <Text style={styles.activeBookingsCount}>
                    {(() => {
                      // Use universal counter fields (activeBookingsUsed) if available
                      // Fall back to legacy field (activeBookings) for backward compatibility
                      const used = userAllocation.activeBookingsUsed !== undefined 
                        ? userAllocation.activeBookingsUsed 
                        : (userAllocation.activeBookings || 0);
                      const total = userAllocation.activeBookingsUsed !== undefined
                        ? used + (userAllocation.activeBookingsRemaining || 0)
                        : userAllocation.maxActiveBookings;
                      return t('{{used}} of {{total}} slots used', { used, total });
                    })()}
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
            <Text style={styles.bookButtonText}>{t('Book Now')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Year Picker Modal */}
      <Modal
        visible={showYearPicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowYearPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('Select Allocation Window')}</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setShowYearPicker(false)}
              >
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.yearList}>
              {(() => {
                // Always present both windows; labels always derived from allocation (or "Loading…").
                const options = [
                  { key: 'current', label: getWindowLabelFromAllocation('current') },
                  { key: 'next', label: getWindowLabelFromAllocation('next') },
                ];

                return options.map(({ key, label }) => (
                  <TouchableOpacity
                    key={key}
                    style={[
                      styles.yearOption,
                      selectedWindowKey === key && styles.selectedYearOption
                    ]}
                    onPress={() => {
                      setSelectedWindowKey(key);
                      setShowYearPicker(false);
                    }}
                  >
                    <Text style={[
                      styles.yearOptionText,
                      selectedWindowKey === key && styles.selectedYearOptionText
                    ]}>
                      {label}
                    </Text>
                    {selectedWindowKey === key && (
                      <MaterialIcons name="check" size={20} color="#007AFF" />
                    )}
                  </TouchableOpacity>
                ));
              })()}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
    width: width,
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
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    margin: 4
  },
  activeIndicator: {
    backgroundColor: '#fff'
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
  yearSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
    alignSelf: 'center',
    marginBottom: 15
  },
  yearSelectorText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#495057',
    marginRight: 4
  },
  yearSection: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e9ecef'
  },
  yearTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
    color: '#495057'
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
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '80%',
    maxHeight: '60%'
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333'
  },
  closeButton: {
    padding: 4
  },
  yearList: {
    maxHeight: 200
  },
  yearOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  selectedYearOption: {
    backgroundColor: '#f0f8ff'
  },
  yearOptionText: {
    fontSize: 16,
    color: '#333'
  },
  selectedYearOptionText: {
    color: '#007AFF',
    fontWeight: '600'
  }
});

export default AssetDetailScreen; 
