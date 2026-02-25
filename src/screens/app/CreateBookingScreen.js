import React, { useState, useRef, useEffect, useMemo, useCallback, useContext } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Platform, 
  TouchableOpacity, 
  Alert,
  SafeAreaView,
  StatusBar,
  Dimensions,
  FlatList,
  Modal
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { bookingApi, assetApi } from '../../api';
import { addDays, addMonths, isSameDay, isWithinInterval, isBefore, getMonth, getYear, getDaysInMonth, startOfMonth, getDay } from 'date-fns';
import { showCalendarSelection } from '../../utils/calendarUtils';
import { useAuth } from '../../context/AuthContext';
import { validateBooking, determineBookingType, getBookingTypeInfo, BOOKING_TYPES, checkSpecialDateOverlap } from '../../utils/bookingValidation';
import DateUtils from '../../utils/dateUtils';
import { useI18n } from '../../i18n';

const { width } = Dimensions.get('window');

const CreateBookingScreen = ({ route, navigation }) => {
  const { asset: navigationAsset, editBooking, onBookingUpdated } = route.params || {};
  const alertContext = route?.params?.alertContext || null;
  const { user } = useAuth(); // Get current user from AuthContext
  const { t, formatDate, weekdaysShort, mapApiError } = useI18n();
  
  const [asset, setAsset] = useState(navigationAsset || null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [selectedDates, setSelectedDates] = useState([]);
  const [unavailableDates, setUnavailableDates] = useState([]);
  const [specialDatesType1, setSpecialDatesType1] = useState([]);
  const [specialDatesType2, setSpecialDatesType2] = useState([]);
  const [months, setMonths] = useState([]);
  const [showAssetDropdown, setShowAssetDropdown] = useState(false);
  const [availableAssets, setAvailableAssets] = useState([]);
  const [currentUserBookings, setCurrentUserBookings] = useState([]);
  const [currentUserBookingDates, setCurrentUserBookingDates] = useState([]);
  const [validationResults, setValidationResults] = useState(null);
  const [bookingType, setBookingType] = useState('Short');
  const [bookingTypeInfo, setBookingTypeInfo] = useState(null);
  const [specialDates, setSpecialDates] = useState([]);
  const [userBookingsThisYear, setUserBookingsThisYear] = useState([]);
  const [userAllocation, setUserAllocation] = useState(null);
  const [alertHighlightRange, setAlertHighlightRange] = useState(null);
  const monthListRef = useRef(null);
  const availabilityInFlightRef = useRef(false);
  const userBookingsRequestRef = useRef(null);
  const userBookingsCacheRef = useRef({ data: null, fetchedAt: 0 });
  const lastAssetRefreshAtRef = useRef(0);
  const skipNextFocusRefreshRef = useRef(true);
  const lastHandledAlertNonceRef = useRef(null);
  // Track which month is currently visible using FlatList viewability API
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 }).current;
  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    try {
      if (Array.isArray(viewableItems) && viewableItems.length > 0) {
        // Use the first sufficiently visible item as the current month
        const candidate = viewableItems.find(v => v.isViewable) || viewableItems[0];
        if (candidate && candidate.item && candidate.item.getTime) {
          setCurrentMonth(candidate.item);
        }
      }
    } catch (e) {}
  }).current;

  const fetchUserBookings = useCallback(async ({ force = false } = {}) => {
    const now = Date.now();
    const cacheTtlMs = 1500;
    const cached = userBookingsCacheRef.current;

    if (!force && cached.data && now - cached.fetchedAt < cacheTtlMs) {
      return cached.data;
    }

    if (userBookingsRequestRef.current) {
      return userBookingsRequestRef.current;
    }

    userBookingsRequestRef.current = (async () => {
      const result = await bookingApi.getUserBookings();
      if (!result.success) {
        throw new Error(result.error || 'Failed to load user bookings');
      }
      userBookingsCacheRef.current = {
        data: result.data,
        fetchedAt: Date.now()
      };
      return result.data;
    })();

    try {
      return await userBookingsRequestRef.current;
    } finally {
      userBookingsRequestRef.current = null;
    }
  }, []);
  
  // Load unavailable dates and special dates for the asset
  useEffect(() => {
    generateMonths();
    loadAvailableAssets();
    loadCurrentUserBookings();
    loadUserBookingsThisYear();
  }, []);
  
  // Update validation when dates or asset change
  useEffect(() => {
    console.log('🔄 Validation useEffect triggered');
    console.log('📊 Current state:', { 
      startDate: startDate?.toDateString(), 
      endDate: endDate?.toDateString(), 
      asset: asset?.name, 
      user: user?.name 
    });
    
    if (startDate && endDate && asset && user) {
      // Debounce validation to prevent too many calls
      const timeoutId = setTimeout(() => {
        console.log('⏰ Starting validation after debounce...');
        validateCurrentBooking();
      }, 300);
      
      return () => {
        console.log('🧹 Clearing validation timeout');
        clearTimeout(timeoutId);
      };
    } else {
      // Clear validation results if required data is missing
      console.log('🧹 Clearing validation results - missing required data');
      setValidationResults(null);
      setBookingTypeInfo(null);
    }
  }, [startDate, endDate, asset, user, currentUserBookings, specialDates]);
  
  // Load assets when dropdown is opened
  const loadAvailableAssets = async () => {
    try {
      console.log('🏠 Loading available assets...');
      // Fetch user's owned assets instead of all assets
      const result = await assetApi.getUserAssets();
      console.log('🏠 User assets API result:', result);
      
      if (result.success) {
        console.log('✅ User assets loaded successfully:', result.data.length, 'assets');
        setAvailableAssets(result.data);
        
        // If no asset is currently selected and we have assets, select the first one
        if (!asset && result.data.length > 0) {
          console.log('🎯 Auto-selecting first asset:', result.data[0].name);
          setAsset(result.data[0]);
        }
      } else {
        console.error('❌ Error loading user assets:', result.error);
        // Fallback to empty array if API fails
        setAvailableAssets([]);
      }
    } catch (error) {
      console.error('❌ Error loading user assets:', error.message);
      setAvailableAssets([]);
    }
  };
  
  // Update availability when asset changes
  useEffect(() => {
    if (asset && user) {
      (async () => {
        await Promise.all([
          loadAssetAvailability(),
          loadCurrentUserBookings()
        ]);

        // Load allocation for current user and selected asset
        try {
          const result = await bookingApi.getUserAllocation(user._id, asset._id);
          if (result.success) {
            setUserAllocation(result.data);
          } else {
            setUserAllocation(null);
          }
        } catch (e) {
          setUserAllocation(null);
        }

        lastAssetRefreshAtRef.current = Date.now();
        skipNextFocusRefreshRef.current = false;
      })();
    }
  }, [asset, user]);
  
  // Refresh availability data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (asset && user) {
        if (skipNextFocusRefreshRef.current) {
          skipNextFocusRefreshRef.current = false;
          return;
        }

        // Ignore immediate focus events that follow an asset/user-triggered refresh.
        if (Date.now() - lastAssetRefreshAtRef.current < 1000) {
          return;
        }

        lastAssetRefreshAtRef.current = Date.now();
        loadAssetAvailability();
        loadCurrentUserBookings();
        loadUserBookingsThisYear();
      }
    }, [asset, user])
  );

  const parseAlertDate = useCallback((dateStr) => {
    if (!dateStr || typeof dateStr !== 'string') return null;
    const parsed = new Date(`${dateStr}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }, []);

  useEffect(() => {
    const nonce = alertContext?.nonce;
    if (!nonce) return;
    if (lastHandledAlertNonceRef.current === nonce) return;
    if (!months.length) return;

    const parsedStart = parseAlertDate(alertContext?.startDate);
    const parsedEnd = parseAlertDate(alertContext?.endDate);
    if (!parsedStart || !parsedEnd) return;

    lastHandledAlertNonceRef.current = nonce;

    const targetAssetId = alertContext?.asset?._id;
    if (targetAssetId) {
      const fullAsset = availableAssets.find((candidate) => candidate?._id === targetAssetId);
      setAsset(fullAsset || alertContext.asset);
    }

    setStartDate(null);
    setEndDate(null);
    setSelectedDates([]);
    setValidationResults(null);
    setBookingTypeInfo(null);
    setAlertHighlightRange({
      start: parsedStart,
      end: parsedEnd
    });

    const targetMonth = new Date(parsedStart.getFullYear(), parsedStart.getMonth(), 1);
    setCurrentMonth(targetMonth);

    const monthIndex = months.findIndex((monthDate) =>
      getMonth(monthDate) === getMonth(targetMonth) &&
      getYear(monthDate) === getYear(targetMonth)
    );

    if (monthIndex >= 0 && monthListRef.current) {
      setTimeout(() => {
        try {
          monthListRef.current.scrollToIndex({ index: monthIndex, animated: true });
        } catch (e) {
          // Best effort: keep month title synced even if scrolling fails.
        }
      }, 30);
    }
  }, [alertContext, months, availableAssets, parseAlertDate]);
  
  const generateMonths = () => {
    // Generate 24 months starting from the current month
    const generatedMonths = [];
    const start = new Date();
    start.setDate(1);
    for (let i = 0; i < 24; i++) {
      generatedMonths.push(addMonths(start, i));
    }
    setMonths(generatedMonths);
  };
  
  const loadAssetAvailability = async () => {
    if (!asset) {
      console.log('⚠️ No asset selected, skipping availability load');
      return;
    }

    if (availabilityInFlightRef.current) {
      return;
    }
    
    try {
      availabilityInFlightRef.current = true;
      console.log('🔍 Loading availability for asset:', asset.name);
      setIsLoading(true);
      
      // Only reset selected dates when asset changes, not on every availability load
      // This prevents recursive loops with validation
      if (!editBooking) {
        // Only reset dates if we're not editing an existing booking
        console.log('🧹 Resetting selected dates for new booking');
      setStartDate(null);
      setEndDate(null);
      setSelectedDates([]);
      }
      
      // Calculate date range for availability (current month + next 24 months)
      const startMonth = new Date();
      startMonth.setDate(1); // First day of current month
      const endMonth = new Date(startMonth);
      endMonth.setMonth(endMonth.getMonth() + 24); // 24 months ahead
      endMonth.setDate(0); // Last day of the final month
      
      console.log('📅 Fetching availability from:', startMonth.toDateString(), 'to:', endMonth.toDateString());
      
      // Fetch real availability data from API
      const availabilityResult = await bookingApi.getAssetAvailability(
        asset._id,
        DateUtils.toApiFormat(startMonth), // YYYY-MM-DD format (timezone-safe)
        DateUtils.toApiFormat(endMonth)
      );
      
      console.log('🔍 Availability API result:', availabilityResult);
      
      if (availabilityResult.success) {
        const { unavailableDates = [], specialDates = {}, bookings = [] } = availabilityResult.data;
        
        console.log('📊 Availability data:', {
          unavailableDates: unavailableDates.length,
          specialDatesType1: (specialDates.type1 || []).length,
          specialDatesType2: (specialDates.type2 || []).length,
          bookings: bookings.length
        });
      
        // Convert string dates to Date objects
        const unavailable = unavailableDates.map(dateStr => new Date(dateStr + 'T00:00:00'));
        const special1 = (specialDates.type1 || []).map(dateStr => new Date(dateStr + 'T00:00:00'));
        const special2 = (specialDates.type2 || []).map(dateStr => new Date(dateStr + 'T00:00:00'));
        
        // Add booked dates to unavailable dates (supports both range and day-entry payloads)
        bookings.forEach(booking => {
          // Parse dates with proper timezone handling - handle both YYYY-MM-DD and ISO formats
          let startDate, endDate;
          
          if (booking.startDate && booking.endDate) {
            // Check if the date is already in YYYY-MM-DD format or ISO format
            if (booking.startDate.includes('T')) {
              // ISO format - convert to local date
              startDate = new Date(booking.startDate.split('T')[0] + 'T00:00:00');
              endDate = new Date(booking.endDate.split('T')[0] + 'T00:00:00');
            } else {
              // YYYY-MM-DD format - create local date
              startDate = new Date(booking.startDate + 'T00:00:00');
              endDate = new Date(booking.endDate + 'T00:00:00');
            }
          } else if (booking.date && typeof booking.date === 'string') {
            // Availability endpoint may return one entry per date.
            startDate = new Date(booking.date + 'T00:00:00');
            endDate = new Date(booking.date + 'T00:00:00');
          } else {
            return;
          }
          
          const currentDate = new Date(startDate);
      
          // Only add to unavailable dates if it's NOT the current user's booking
          const isCurrentUserBooking = booking.userId === user?._id || booking.user === user?._id;
          
          while (currentDate <= endDate) {
            if (!isCurrentUserBooking) {
              unavailable.push(new Date(currentDate));
            }
            currentDate.setDate(currentDate.getDate() + 1);
          }
        });
        
        console.log('✅ Processed availability data:', {
          totalUnavailable: unavailable.length,
          specialType1: special1.length,
          specialType2: special2.length
        });
      
      setUnavailableDates(unavailable);
      setSpecialDatesType1(special1);
      setSpecialDatesType2(special2);
      
        // Store special dates for validation (convert to expected format)
        const specialDatesForValidation = [
          ...(specialDates.type1 || []).map(dateStr => ({
            startDate: dateStr,
            endDate: dateStr,
            type: 'peak'
          })),
          ...(specialDates.type2 || []).map(dateStr => ({
            startDate: dateStr,
            endDate: dateStr,
            type: 'holiday'
          }))
        ];
        setSpecialDates(specialDatesForValidation);
      } else {
        console.error('❌ Error loading availability:', availabilityResult.error);
        // Set empty arrays if API fails
        setUnavailableDates([]);
        setSpecialDatesType1([]);
        setSpecialDatesType2([]);
      }
      
      // If editing, set the selected dates AFTER loading availability
      if (editBooking && !startDate && !endDate) {
        console.log('📝 Setting dates for edit booking:', editBooking);
        // Create dates at midnight to ensure proper calculation
        const editStartDate = new Date(editBooking.startDate + 'T00:00:00');
        const editEndDate = new Date(editBooking.endDate + 'T00:00:00');
        
        handleDateSelection(editStartDate);
        handleDateSelection(editEndDate);
      }
      
    } catch (error) {
      console.error('❌ Error loading asset availability:', error.message);
      // Set empty arrays if there's an error
      setUnavailableDates([]);
      setSpecialDatesType1([]);
      setSpecialDatesType2([]);
    } finally {
      availabilityInFlightRef.current = false;
      setIsLoading(false);
    }
  };
  
  // Handle asset selection
  const handleAssetSelection = (selectedAsset) => {
    setAsset(selectedAsset);
    setShowAssetDropdown(false);
    setAlertHighlightRange(null);
  };
  
  // Toggle dropdown
  const toggleAssetDropdown = () => {
    setShowAssetDropdown(!showAssetDropdown);
  };
  
  // Render asset item in dropdown
  const renderAssetItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.assetItem} 
      onPress={() => handleAssetSelection(item)}
    >
      <View style={styles.assetItemContent}>
        <Text style={styles.assetItemName}>
          {item?.name || t('Unknown Asset')}
        </Text>
        <Text style={styles.assetItemLocation}>{item?.location || t('Unknown Location')}</Text>
      </View>
      {asset && asset._id === item?._id && (
        <MaterialIcons name="check" size={24} color="#1E4640" />
      )}
    </TouchableOpacity>
  );
  
  // Update the date selection handler to prevent scroll issues
  const handleDateSelection = useCallback((date) => {
    console.log('🔥 handleDateSelection called with date:', date);
    
    try {
      // Initial validation - check if date is valid
      if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
        console.warn('❌ Invalid date passed to handleDateSelection:', date);
        return;
      }
      
      // Normalize date to midnight to ensure consistent calculations
      const normalizedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      console.log('✅ Date normalized to midnight:', normalizedDate);

      // Any manual date interaction should clear contextual alert highlighting.
      setAlertHighlightRange(null);
      
      // Additional safety check - ensure date has proper methods
      if (!normalizedDate.getTime || typeof normalizedDate.getTime !== 'function') {
        console.warn('❌ Date object missing getTime method:', normalizedDate);
        return;
      }

      console.log('📅 Processing date selection for:', normalizedDate.toDateString());
      console.log('📊 Current state - startDate:', startDate?.toDateString(), 'endDate:', endDate?.toDateString());

    // Save the current scroll position
    let currentScrollOffset = 0;
    if (monthListRef.current) {
      // Get current scroll offset if available
        try {
      currentScrollOffset = monthListRef.current._scrollMetrics?.offset || 0;
          console.log('📜 Current scroll offset:', currentScrollOffset);
        } catch (scrollError) {
          console.warn('⚠️ Could not get scroll offset:', scrollError);
          currentScrollOffset = 0;
        }
    }

    // Check if date is unavailable - quick check first
      console.log('🔍 Checking if date is unavailable for booking...');
      if (isDateUnavailableForBooking(normalizedDate)) {
        console.log('❌ Date is unavailable for booking');
      Alert.alert(t('Date Unavailable'), t('This date is not available for booking.'));
      return;
    }
      console.log('✅ Date is available for booking');
    
    // If no start date is selected, set it immediately
    if (!startDate) {
        console.log('🎯 Setting as start date (no previous start date)');
        setStartDate(normalizedDate);
        setSelectedDates([normalizedDate]);
      
      // Restore scroll position after state update
      setTimeout(() => {
        if (monthListRef.current && currentScrollOffset > 0) {
            try {
          monthListRef.current.scrollToOffset({ 
            offset: currentScrollOffset, 
            animated: false 
          });
              console.log('📜 Scroll position restored');
            } catch (scrollError) {
              console.warn('⚠️ Could not restore scroll position:', scrollError);
            }
        }
      }, 10);
      return;
    }
    
    // If start date is selected but no end date
    if (startDate && !endDate) {
        console.log('🎯 Processing end date selection...');
        
        // Validate startDate before comparison
        if (!startDate.getTime || isNaN(startDate.getTime())) {
          console.error('❌ Invalid startDate in handleDateSelection:', startDate);
          setStartDate(normalizedDate);
          setSelectedDates([normalizedDate]);
          return;
        }
        
      // If selected date is before start date, make it the new start date
        if (isBefore(normalizedDate, startDate)) {
          console.log('🔄 Selected date is before start date, making it new start date');
          setStartDate(normalizedDate);
          setSelectedDates([normalizedDate]);
        
        // Restore scroll position after state update
        setTimeout(() => {
          if (monthListRef.current && currentScrollOffset > 0) {
              try {
            monthListRef.current.scrollToOffset({ 
              offset: currentScrollOffset, 
              animated: false 
            });
                console.log('📜 Scroll position restored (new start date)');
              } catch (scrollError) {
                console.warn('⚠️ Could not restore scroll position:', scrollError);
              }
          }
        }, 10);
        return;
      }
      
      // For performance, first check if start and end dates are unavailable
        console.log('🔍 Checking if date range is valid...');
        if (isDateUnavailableForBooking(startDate) || isDateUnavailableForBooking(normalizedDate)) {
          console.log('❌ Date range includes unavailable dates');
        Alert.alert(t('Invalid Selection'), t('Your selection includes unavailable dates.'));
        return;
      }
      
        console.log('✅ Date range is valid, setting end date');
      // Set the end date immediately to provide visual feedback
        setEndDate(normalizedDate);
      
      // Then calculate the date range in a setTimeout to prevent UI blocking
      setTimeout(() => {
          console.log('⏰ Starting date range calculation...');
          try {
        const datesInRange = [];
        let currentDate = new Date(startDate);
            const endDateValue = new Date(normalizedDate);
            
            console.log('📅 Calculating range from:', currentDate.toDateString(), 'to:', endDateValue.toDateString());
            
            // Ensure we don't have invalid dates
            if (isNaN(currentDate.getTime()) || isNaN(endDateValue.getTime())) {
              console.error('❌ Invalid dates in range calculation:', { startDate, endDate: normalizedDate });
              setSelectedDates([startDate, normalizedDate]);
              return;
            }
            
            console.log('✅ Date range validation passed');
        
        // Optimization: limit range check to 90 days maximum
        let dateCount = 0;
        const maxDays = 90;
        
            console.log('🔄 Starting date iteration...');
        while (currentDate <= endDateValue && dateCount < maxDays) {
              // Create a new date object to avoid reference issues
              datesInRange.push(new Date(currentDate.getTime()));
              
              // Move to next day safely
              const nextDay = new Date(currentDate);
              nextDay.setDate(nextDay.getDate() + 1);
              
              // Check if date rolled over correctly (handles month/year boundaries)
              if (nextDay.getDate() === 1 && currentDate.getDate() > 28) {
                // Month rollover happened correctly
                currentDate = nextDay;
              } else if (nextDay.getDate() === currentDate.getDate() + 1) {
                // Normal day increment
                currentDate = nextDay;
              } else {
                // Something went wrong with date increment
                console.error('❌ Date increment error:', { current: currentDate, next: nextDay });
                break;
              }
              
          dateCount++;
              
              // Safety check to prevent infinite loops
              if (dateCount > maxDays) {
                console.warn('⚠️ Date range calculation exceeded maximum days, truncating');
                break;
              }
            }
            
            console.log(`✅ Calculated ${datesInRange.length} dates in range`);
        setSelectedDates(datesInRange);
        
            console.log('📜 Attempting to restore scroll position...');
        // Restore scroll position after state update
        if (monthListRef.current && currentScrollOffset > 0) {
              try {
          monthListRef.current.scrollToOffset({ 
            offset: currentScrollOffset, 
            animated: false 
          });
                console.log('✅ Scroll position restored successfully');
              } catch (scrollError) {
                console.warn('⚠️ Could not restore scroll position:', scrollError);
              }
            }
          } catch (error) {
            console.error('❌ Error calculating date range:', error);
            // Fallback to just start and end dates
            setSelectedDates([startDate, normalizedDate]);
        }
      }, 10);
    } else {
      // Both dates are selected, start a new selection
        console.log('🔄 Both dates selected, starting new selection');
        setStartDate(normalizedDate);
      setEndDate(null);
        setSelectedDates([normalizedDate]);
      
      // Restore scroll position after state update
      setTimeout(() => {
        if (monthListRef.current && currentScrollOffset > 0) {
            try {
          monthListRef.current.scrollToOffset({ 
            offset: currentScrollOffset, 
            animated: false 
          });
              console.log('📜 Scroll position restored (new selection)');
            } catch (scrollError) {
              console.warn('⚠️ Could not restore scroll position:', scrollError);
            }
        }
      }, 10);
    }
      
      console.log('✅ handleDateSelection completed successfully');
    } catch (error) {
      console.error('💥 CRASH in handleDateSelection:', error);
      console.error('💥 Error stack:', error.stack);
      console.error('💥 Date that caused error:', date);
      console.error('💥 Current state:', { startDate, endDate, selectedDates: selectedDates?.length });
      Alert.alert(t('Error'), t('There was an error selecting the date. Please try again.'));
    }
  }, [startDate, endDate, isDateUnavailableForBooking]);
  
  const getDatesInRange = (start, end) => {
    const dates = [];
    let currentDate = start;
    
    while (!isSameDay(currentDate, addDays(end, 1))) {
      dates.push(new Date(currentDate));
      currentDate = addDays(currentDate, 1);
    }
    
    return dates;
  };

  const isDateInAlertHighlightRange = useCallback((date) => {
    try {
      if (!alertHighlightRange || !date || !date.getTime || isNaN(date.getTime())) return false;
      const start = alertHighlightRange.start;
      const end = alertHighlightRange.end;
      if (!start || !end || isNaN(start.getTime()) || isNaN(end.getTime())) return false;
      return isWithinInterval(date, { start, end });
    } catch (error) {
      console.error('Error in isDateInAlertHighlightRange:', error);
      return false;
    }
  }, [alertHighlightRange]);
  
  const isDateSelected = (date) => {
    try {
      if (!date || !date.getTime || isNaN(date.getTime()) || (!startDate && !endDate)) return false;
    
    if (startDate && !endDate) {
        return startDate.getTime && !isNaN(startDate.getTime()) && isSameDay(date, startDate);
    }
    
    if (startDate && endDate) {
        return startDate.getTime && endDate.getTime && 
               !isNaN(startDate.getTime()) && !isNaN(endDate.getTime()) &&
               isWithinInterval(date, { start: startDate, end: endDate });
    }
    
    return false;
    } catch (error) {
      console.error('Error in isDateSelected:', error);
      return false;
    }
  };
  
  const isStartDate = (date) => {
    try {
      return startDate && date && 
             startDate.getTime && date.getTime &&
             !isNaN(startDate.getTime()) && !isNaN(date.getTime()) &&
             isSameDay(date, startDate);
    } catch (error) {
      console.error('Error in isStartDate:', error);
      return false;
    }
  };
  
  const isEndDate = (date) => {
    try {
      return endDate && date && 
             endDate.getTime && date.getTime &&
             !isNaN(endDate.getTime()) && !isNaN(date.getTime()) &&
             isSameDay(date, endDate);
    } catch (error) {
      console.error('Error in isEndDate:', error);
      return false;
    }
  };
  
  const isMiddleDate = (date) => {
    try {
    if (!startDate || !endDate || !date) return false;
      if (!startDate.getTime || !endDate.getTime || !date.getTime) return false;
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()) || isNaN(date.getTime())) return false;
      
    return isDateSelected(date) && !isStartDate(date) && !isEndDate(date);
    } catch (error) {
      console.error('Error in isMiddleDate:', error);
      return false;
    }
  };
  
  const isDateUnavailable = (date) => {
    try {
      if (!date || !date.getTime || isNaN(date.getTime())) return false;
      if (!Array.isArray(unavailableDates)) return false;
    
    // Compare by timestamp for better performance
    const dateTime = date.getTime();
    return unavailableDates.some(unavailableDate => {
        return unavailableDate && 
               unavailableDate.getTime && 
               !isNaN(unavailableDate.getTime()) &&
               unavailableDate.getTime() === dateTime;
    });
    } catch (error) {
      console.error('Error in isDateUnavailable:', error);
      return false;
    }
  };
  
  const isSpecialDateType1 = (date) => {
    try {
      if (!date || !date.getTime || isNaN(date.getTime())) return false;
      if (!Array.isArray(specialDatesType1)) return false;
      
    const dateTime = date.getTime();
      return specialDatesType1.some(specialDate => 
        specialDate && 
        specialDate.getTime && 
        !isNaN(specialDate.getTime()) &&
        specialDate.getTime() === dateTime
      );
    } catch (error) {
      console.error('Error in isSpecialDateType1:', error);
      return false;
    }
  };
  
  const isSpecialDateType2 = (date) => {
    try {
      if (!date || !date.getTime || isNaN(date.getTime())) return false;
      if (!Array.isArray(specialDatesType2)) return false;
      
      const dateTime = date.getTime();
      return specialDatesType2.some(specialDate => 
        specialDate && 
        specialDate.getTime && 
        !isNaN(specialDate.getTime()) &&
        specialDate.getTime() === dateTime
      );
    } catch (error) {
      console.error('Error in isSpecialDateType2:', error);
      return false;
    }
  };
  
  // Check if a date is part of current user's booking
  const isCurrentUserBookingDate = (date) => {
    try {
      if (!date || !date.getTime || isNaN(date.getTime())) return false;
      if (!Array.isArray(currentUserBookingDates)) return false;
      
      const dateTime = date.getTime();
      const dateString = date.toDateString();
      
      const isUserBooking = currentUserBookingDates.some(userDate => {
        if (!userDate || !userDate.getTime || isNaN(userDate.getTime())) return false;
        
        return userDate.getTime() === dateTime || userDate.toDateString() === dateString;
      });
      
      return isUserBooking;
    } catch (error) {
      console.error('Error in isCurrentUserBookingDate:', error);
      return false;
    }
  };
  
  // Check if a date is unavailable for new bookings (excluding user's own bookings)
  const isDateUnavailableForBooking = (date) => {
    try {
      if (!date || !date.getTime || isNaN(date.getTime())) return false;
      
      // If it's the user's own booking, it should not be considered unavailable for selection
      if (isCurrentUserBookingDate(date)) {
        return false;
      }
      
      // Otherwise check if it's unavailable
      return isDateUnavailable(date);
    } catch (error) {
      console.error('Error in isDateUnavailableForBooking:', error);
      return false;
    }
  };
  
  // Memoize the dates data to avoid recalculation on every render
  const generateCalendarData = useCallback((month) => {
    try {
      if (!month || !month.getTime || isNaN(month.getTime())) {
        console.warn('Invalid month passed to generateCalendarData:', month);
        return { weeks: [], monthYear: 'Invalid Month' };
      }
      
    const daysInMonth = getDaysInMonth(month);
    const firstDayOfMonth = startOfMonth(month);
    const startingDayOfWeek = getDay(firstDayOfMonth);
    
    // Create array of dates for the month
    const dates = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      dates.push(null); // Empty cells for days before the 1st of the month
    }
    
    for (let i = 1; i <= daysInMonth; i++) {
        const dateObj = new Date(month.getFullYear(), month.getMonth(), i);
        // Validate the created date
        if (dateObj.getTime && !isNaN(dateObj.getTime())) {
          dates.push(dateObj);
        } else {
          console.warn('Invalid date created in generateCalendarData:', dateObj);
          dates.push(null);
        }
    }

    // Group dates into weeks
    const weeks = [];
    let week = [];
    
    dates.forEach((date, index) => {
      week.push(date);
      if (week.length === 7 || index === dates.length - 1) {
        // Pad the last week with null if needed
        while (week.length < 7) {
          week.push(null);
        }
          weeks.push([...week]); // Create a copy of the week array
        week = [];
      }
    });
    
      const monthYear = formatDate(month, 'MMMM yyyy');
      return { weeks, monthYear };
    } catch (error) {
      console.error('Error in generateCalendarData:', error, 'Month:', month);
      return { weeks: [], monthYear: 'Error' };
    }
  }, []);
  
  // Memoize day cell rendering function
  const renderDayCell = useCallback((date, index, week) => {
    if (!date) return <View key={`empty-${index}`} style={styles.emptyCell} />;
    
    try {
      // Validate date object before using it
      if (!date.getTime || isNaN(date.getTime())) {
        console.warn('Invalid date object in renderDayCell:', date);
        return <View key={`invalid-${index}`} style={styles.emptyCell} />;
      }
    
    const isSelected = isDateSelected(date);
    const isUnavailable = isDateUnavailable(date);
      const isCurrentUserBooking = isCurrentUserBookingDate(date);
      const isOtherUserBooking = isUnavailable && !isCurrentUserBooking;
    const isSpecialType1 = isSpecialDateType1(date);
    const isSpecialType2 = isSpecialDateType2(date);
    const isStart = isStartDate(date);
    const isEnd = isEndDate(date);
    const isAlertHighlighted = isDateInAlertHighlightRange(date);
    const isAlertStart = !!(isAlertHighlighted && alertHighlightRange?.start && isSameDay(date, alertHighlightRange.start));
    const isAlertEnd = !!(isAlertHighlighted && alertHighlightRange?.end && isSameDay(date, alertHighlightRange.end));
    
    // Get adjacent dates in the week to check for continuous selection
      const prevDate = index > 0 && week[index - 1] ? week[index - 1] : null;
      const nextDate = index < 6 && week[index + 1] ? week[index + 1] : null;
    
      // Safely check if adjacent dates are selected
      const isPrevSelected = prevDate && prevDate.getTime && !isNaN(prevDate.getTime()) && isDateSelected(prevDate);
      const isNextSelected = nextDate && nextDate.getTime && !isNaN(nextDate.getTime()) && isDateSelected(nextDate);
      const isPrevAlertHighlighted = prevDate && prevDate.getTime && !isNaN(prevDate.getTime()) && isDateInAlertHighlightRange(prevDate);
      const isNextAlertHighlighted = nextDate && nextDate.getTime && !isNaN(nextDate.getTime()) && isDateInAlertHighlightRange(nextDate);
      
      // For current user bookings, check adjacent user booking dates for styling
      const isPrevUserBooking = prevDate && prevDate.getTime && !isNaN(prevDate.getTime()) && isCurrentUserBookingDate(prevDate);
      const isNextUserBooking = nextDate && nextDate.getTime && !isNaN(nextDate.getTime()) && isCurrentUserBookingDate(nextDate);
    
    // Determine cell styles based on selection state
    let cellStyle = [styles.dayCell];
    let textStyle = [styles.dayText];
    
      // Handle current user's existing bookings (show in green like selected)
      if (isCurrentUserBooking && !isSelected) {
        cellStyle.push(styles.userBookingDay);
        textStyle.push(styles.userBookingDayText);
        
        // Apply start/end/middle styling for user bookings
        if (!isPrevUserBooking) {
          cellStyle.push(styles.startDay);
        }
        if (!isNextUserBooking) {
          cellStyle.push(styles.endDay);
        }
        if (isPrevUserBooking && isNextUserBooking) {
          cellStyle.push(styles.middleDay);
        }
      }

      // Alert highlights represent freed ranges and are visual-only context.
      if (isAlertHighlighted && !isCurrentUserBooking && !isOtherUserBooking && !isSelected) {
        cellStyle.push(styles.alertHighlightedDay);
        textStyle.push(styles.alertHighlightedDayText);

        if (isAlertStart || !isPrevAlertHighlighted) {
          cellStyle.push(styles.startDay, styles.alertHighlightStartDay);
        }
        if (isAlertEnd || !isNextAlertHighlighted) {
          cellStyle.push(styles.endDay, styles.alertHighlightEndDay);
        }
        if ((isPrevAlertHighlighted && isNextAlertHighlighted) || (!isAlertStart && !isAlertEnd)) {
          cellStyle.push(styles.middleDay, styles.alertHighlightMiddleDay);
        }
      }
      
      // Handle new selection (overrides user booking styling)
    if (isSelected) {
        cellStyle = [styles.dayCell, styles.selectedDay];
        textStyle = [styles.dayText, styles.selectedDayText];
      
      if (isStart || !isPrevSelected) {
        cellStyle.push(styles.startDay);
      }
      
      if (isEnd || !isNextSelected) {
        cellStyle.push(styles.endDay);
      }
      
      if ((isPrevSelected && isNextSelected) || (!isStart && !isEnd)) {
        cellStyle.push(styles.middleDay);
      }
    }
    
      // Handle other users' bookings (crossed out)
      if (isOtherUserBooking) {
      cellStyle.push(styles.unavailableDay);
      textStyle.push(styles.unavailableDayText);
    }
      
      // Get the day number safely
      const dayNumber = date.getDate();
    
    return (
      <TouchableOpacity
          key={`day-${date.getTime()}`}
        style={cellStyle}
        onPress={() => handleDateSelection(date)}
          disabled={isOtherUserBooking}
        activeOpacity={0.7} // Prevent full opacity change on press
      >
          <Text style={textStyle}>{dayNumber}</Text>
          {isSpecialType1 && !isOtherUserBooking && (
            <View style={styles.specialDateIndicator}>
              <MaterialIcons name="star" size={16} color={(isSelected || isCurrentUserBooking) ? "#fff" : "#ff6b6b"} />
            </View>
          )}
          {isSpecialType2 && !isOtherUserBooking && (
            <View style={styles.specialDateIndicator}>
              <MaterialIcons name="star" size={16} color={(isSelected || isCurrentUserBooking) ? "#fff" : "#6200ee"} />
            </View>
          )}
          {isOtherUserBooking && (
          <View style={styles.strikethrough} />
        )}
      </TouchableOpacity>
    );
    } catch (error) {
      console.error('Error rendering day cell:', error, 'Date:', date);
      return <View key={`error-${index}`} style={styles.emptyCell} />;
    }
  }, [startDate, endDate, selectedDates, unavailableDates, currentUserBookingDates, specialDatesType1, specialDatesType2, handleDateSelection, alertHighlightRange, isDateInAlertHighlightRange]);
  
  // Optimize month rendering with memoization
  const renderCalendarMonth = useCallback(({ item }) => {
    try {
      if (!item) return null;
      
    const { weeks, monthYear } = generateCalendarData(item);
    
    return (
      <View style={styles.monthContainer}>
        <Text style={styles.monthTitle}>{monthYear}</Text>
        <View style={styles.weekdaysHeader}>
          {weekdaysShort.map((weekday) => (
            <Text key={weekday} style={styles.weekdayText}>
              {weekday}
            </Text>
          ))}
        </View>
        
        <View style={styles.weeksContainer}>
            {weeks && weeks.map((weekDates, weekIndex) => (
            <View key={`week-${weekIndex}`} style={styles.weekRow}>
                {weekDates && weekDates.map((date, dayIndex) => (
                <View key={`day-${dayIndex}`} style={styles.dayCellContainer}>
                    {renderDayCell(date, dayIndex, weekDates)}
                </View>
              ))}
            </View>
          ))}
        </View>
      </View>
    );
    } catch (error) {
      console.error('Error rendering calendar month:', error);
      return (
        <View style={styles.monthContainer}>
          <Text style={styles.monthTitle}>{t('Error loading month')}</Text>
        </View>
      );
    }
  }, [generateCalendarData, renderDayCell, t, weekdaysShort]);
  
  // Create optimized getItemLayout for FlatList
  const getItemLayout = useCallback((data, index) => ({
    length: 340, // Increased from 300 to accommodate larger headers
    offset: 340 * index,
    index,
  }), []);
  
  const handleNextMonth = () => {
    const nextMonth = addMonths(currentMonth, 1);
    setCurrentMonth(nextMonth);
    const monthIndex = months.findIndex(month => 
      getMonth(month) === getMonth(nextMonth) && 
      getYear(month) === getYear(nextMonth)
    );
    if (monthIndex >= 0 && monthListRef.current) {
      monthListRef.current.scrollToIndex({ index: monthIndex, animated: true });
    }
  };
  
  const handlePrevMonth = () => {
    const prevMonth = addMonths(currentMonth, -1);
    setCurrentMonth(prevMonth);
    const monthIndex = months.findIndex(month => 
      getMonth(month) === getMonth(prevMonth) && 
      getYear(month) === getYear(prevMonth)
    );
    if (monthIndex >= 0 && monthListRef.current) {
      monthListRef.current.scrollToIndex({ index: monthIndex, animated: true });
    }
  };
  
  const handleContinueToBook = () => {
    try {
      console.log('handleContinueToBook called');
      
      if (!startDate || !endDate || selectedDates.length === 0) {
        Alert.alert(t('Selection Required'), t('Please select your booking dates.'));
      return;
    }
    
      if (!asset || !asset._id) {
        Alert.alert(t('Asset Required'), t('Please select an asset to book.'));
        return;
      }
      
      if (!user || !user._id) {
        Alert.alert(t('Authentication Required'), t('Please log in to create a booking.'));
        return;
      }
      
      // Check validation results
      if (!validationResults) {
        Alert.alert(t('Validation Pending'), t('Please wait while we validate your booking.'));
        return;
      }
      
      // Show validation errors if any
      if (!validationResults.isValid && validationResults.errors && validationResults.errors.length > 0) {
        const errorMessage = validationResults.errors.join('\n\n');
        Alert.alert(t('Booking Not Available'), mapApiError(errorMessage, 'Booking Not Available'));
        return;
      }
      
      // Prepare booking data with determined booking type
    const bookingData = {
        assetId: asset._id,
      startDate,
      endDate,
        bookingType: validationResults.bookingType || 'Short',
      };
      
      console.log('Preparing booking with data:', {
        asset: asset.name || 'Unknown',
        assetId: asset._id,
        user: user.name || 'Unknown',
        userId: user._id,
        startDate: DateUtils.toApiFormat(startDate),
        endDate: DateUtils.toApiFormat(endDate),
        bookingType: validationResults.bookingType || 'Short'
      });
      
      // Show confirmation with validation warnings (if any) and booking type info
      let confirmationMessage = t(
        'Do you want to book {{asset}} from {{start}} to {{end}}?',
        {
          asset: asset.name || t('this asset'),
          start: formatDate(startDate, 'dd MMM, yyyy'),
          end: formatDate(endDate, 'dd MMM, yyyy'),
        }
      );
      
      if (bookingTypeInfo && bookingTypeInfo.title) {
        confirmationMessage += `\n\n${t('Booking Type')}: ${bookingTypeInfo.title}`;
        if (bookingTypeInfo.description) {
          confirmationMessage += `\n${bookingTypeInfo.description}`;
        }
      }
      
      if (validationResults.allocationInfo) {
        const { remainingDays = 0, bookingLength = 0 } = validationResults.allocationInfo;
        const remainingAfterBooking = Math.max(0, remainingDays - bookingLength);
        confirmationMessage += `\n\n${t('Allocation')}: ${bookingLength} ${t('days')} ${t('will be used')}, ${remainingAfterBooking} ${t('days remaining')}.`;
      }
      
      if (validationResults.warnings && Array.isArray(validationResults.warnings) && validationResults.warnings.length > 0) {
        confirmationMessage += `\n\n${t('Warnings')}:\n${validationResults.warnings.join('\n')}`;
      }
    
    Alert.alert(
      t('Confirm Booking'),
        confirmationMessage,
      [
        {
          text: t('Cancel'),
          style: 'cancel'
        },
        {
          text: t('Confirm'),
          onPress: () => submitBooking(bookingData)
        }
      ]
    );
    } catch (error) {
      console.error('Error in handleContinueToBook:', error);
      Alert.alert(t('Error'), t('There was an error preparing your booking. Please try again.'));
    }
  };
  
  const submitBooking = async (bookingData) => {
    try {
      console.log('submitBooking called with:', bookingData);
      setIsLoading(true);
      
      if (!bookingData || !bookingData.startDate || !bookingData.endDate) {
        throw new Error('Invalid booking data');
      }
      
      // Ensure dates are in the correct format using DateUtils
      const formattedBookingData = {
        assetId: bookingData.assetId,
        startDate: DateUtils.toApiFormat(bookingData.startDate), // YYYY-MM-DD format
        endDate: DateUtils.toApiFormat(bookingData.endDate), // YYYY-MM-DD format
        bookingType: bookingData.bookingType
      };
      
      console.log('Submitting booking with data:', formattedBookingData);
      
      // Use real API to create booking
      const result = await bookingApi.createBooking(formattedBookingData);
      
      console.log('Booking API result:', result);
      
        setIsLoading(false);
        
      if (result && result.success) {
        // Call the callback if provided (for edit operations)
        if (onBookingUpdated && typeof onBookingUpdated === 'function') {
          try {
            onBookingUpdated(result.data);
          } catch (callbackError) {
            console.error('Error in onBookingUpdated callback:', callbackError);
          }
        }
        
        // Show success message and navigation options
        Alert.alert(
          t('Booking Successful'),
          t('Your booking has been confirmed. Would you like to add it to your calendar?'),
          [
            { 
              text: t('Skip'), 
              onPress: () => {
                try {
                  // Check if we can go back (editing flow) or need to navigate to tab
                  if (navigation.canGoBack() && editBooking) {
                    navigation.goBack();
                  } else {
                    navigation.navigate('Tabs', { screen: 'BookingsTab' });
                  }
                } catch (navError) {
                  console.error('Navigation error:', navError);
                  // Fallback navigation
                  navigation.navigate('Tabs', { screen: 'BookingsTab' });
                }
              }
            },
            {
              text: t('Add to Calendar'),
              onPress: async () => {
                try {
                  const booking = {
                    ...result.data,
                    startDate: bookingData.startDate,
                    endDate: bookingData.endDate,
                    status: 'confirmed',
                    notes: `${asset?.name || t('Asset')} ${t('booking')}`
                  };
                  
                  await showCalendarSelection(booking, asset);
                  
                  // Check if we can go back (editing flow) or need to navigate to tab
                  if (navigation.canGoBack() && editBooking) {
                    navigation.goBack();
                  } else {
                    navigation.navigate('Tabs', { screen: 'BookingsTab' });
                  }
                } catch (error) {
                  console.error('Error adding to calendar:', error);
                  
                  // Check if we can go back (editing flow) or need to navigate to tab
                  try {
                    if (navigation.canGoBack() && editBooking) {
                      navigation.goBack();
                    } else {
                      navigation.navigate('Tabs', { screen: 'BookingsTab' });
                    }
                  } catch (navError) {
                    console.error('Navigation error after calendar error:', navError);
                    navigation.navigate('Tabs', { screen: 'BookingsTab' });
                  }
                }
              }
            }
          ]
        );
        
      } else {
        const errorMessage = result?.error || t('Failed to create booking. Please try again.');
        Alert.alert(t('Error'), mapApiError(errorMessage));
      }
      
    } catch (error) {
      setIsLoading(false);
      console.error('Error creating booking:', error);
      Alert.alert(t('Error'), t('Failed to create booking. Please try again.'));
    }
  };
  
  const getBookingSummary = () => {
    if (!startDate || !endDate || !selectedDates || selectedDates.length === 0) {
      return '';
    }
    
    // Use same calculation as backend for consistency
    const daysCount = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    ) + 1;  // Add 1 to include both start and end dates
    const nightsCount = Math.max(0, daysCount - 1);
    
    return `${nightsCount} ${t('nights')}, ${daysCount} ${t('days')}`;
  };
  
  const loadCurrentUserBookings = async () => {
    try {
      console.log('📚 Loading current user bookings...');
      const bookings = await fetchUserBookings();
      console.log('✅ User bookings loaded successfully:', bookings.length, 'bookings');
      setCurrentUserBookings(bookings);
        
      // Generate date arrays for all user's CONFIRMED bookings for this asset
      const userBookingDates = [];
      bookings.forEach(booking => {
        // Only include CONFIRMED bookings for the current asset (exclude cancelled bookings)
        if (booking.asset && booking.asset._id === asset?._id && booking.status === 'confirmed') {
          console.log('📅 Including confirmed booking:', {
            id: booking._id,
            startDate: booking.startDate,
            endDate: booking.endDate,
            status: booking.status
          });
          
          // Parse dates using DateUtils for consistent handling
          const startDate = DateUtils.parseDate(booking.startDate);
          const endDate = DateUtils.parseDate(booking.endDate);
          
          const currentDate = new Date(startDate);
          
          console.log('📅 Parsed dates for calendar:', {
            startDate: startDate.toDateString(),
            endDate: endDate.toDateString(),
            originalStart: booking.startDate,
            originalEnd: booking.endDate
          });
          
          while (currentDate <= endDate) {
            userBookingDates.push(new Date(currentDate));
            currentDate.setDate(currentDate.getDate() + 1);
          }
        } else if (booking.asset && booking.asset._id === asset?._id) {
          console.log('📅 Excluding booking (not confirmed):', {
            id: booking._id,
            status: booking.status,
            startDate: booking.startDate,
            endDate: booking.endDate
          });
        }
      });
      
      console.log('📅 Generated user booking dates for asset (confirmed only):', userBookingDates.length, 'dates');
      console.log('📅 User booking dates list:', userBookingDates.map(d => d.toDateString()));
      setCurrentUserBookingDates(userBookingDates);
    } catch (error) {
      console.error('❌ Error loading current user bookings:', error.message);
      setCurrentUserBookings([]);
      setCurrentUserBookingDates([]);
    }
  };
  
  const validateCurrentBooking = async () => {
    try {
      if (!startDate || !endDate || !asset || !user) {
        console.log('Validation skipped - missing required data:', { startDate: !!startDate, endDate: !!endDate, asset: !!asset, user: !!user });
        return;
      }
      
      console.log('Starting booking validation...');
      
      // Get all required data for validation (include backend allocation, bookings, and special dates calendar if available later)
      const bookingData = { 
        startDate, 
        endDate,
        allocationInfo: userAllocation || null,
        allUserBookings: currentUserBookings || [],
        specialDatesCalendar: { type1: specialDatesType1, type2: specialDatesType2 }
      };
      
      // Get existing CONFIRMED bookings from currentUserBookings and other users' bookings
      // We need to fetch all bookings for this asset, not just unavailable dates
      const existingBookings = [];
      
      // Add current user's existing CONFIRMED bookings only
      if (currentUserBookings && Array.isArray(currentUserBookings)) {
        currentUserBookings.forEach(booking => {
          if (booking.asset && booking.asset._id === asset._id && booking.status === 'confirmed') {
            console.log('📊 Including confirmed booking in validation:', {
              id: booking._id,
              startDate: booking.startDate,
              endDate: booking.endDate,
              status: booking.status
            });
            existingBookings.push(booking);
          } else if (booking.asset && booking.asset._id === asset._id) {
            console.log('📊 Excluding booking from validation (not confirmed):', {
              id: booking._id,
              status: booking.status
            });
          }
        });
      }
      
      console.log('Existing confirmed bookings for validation:', existingBookings.length);
      console.log('User bookings this year:', userBookingsThisYear?.length || 0);
      console.log('Special dates:', specialDates?.length || 0);
      
      // Validate the booking
      const validation = await validateBooking(
        bookingData,
        user,
        asset,
        existingBookings,
        userBookingsThisYear || [],
        specialDates || []
      );
      
      console.log('Validation result:', validation);
      
      setValidationResults(validation);
      
      // Update booking type info
      if (validation.bookingType) {
        // Check for special date overlap
        const specialDateInfo = checkSpecialDateOverlap(
          startDate, 
          endDate, 
          { type1: specialDatesType1, type2: specialDatesType2 }
        );
        
        const typeInfo = getBookingTypeInfo(
          validation.bookingType, 
          validation.daysInAdvance,
          specialDateInfo,
          asset?.type || 'home'
        );
        setBookingTypeInfo(typeInfo);
        setBookingType(validation.bookingType);
      }
      
    } catch (error) {
      console.error('Error validating booking:', error);
      // Set a safe fallback validation result
      setValidationResults({
        isValid: false,
        errors: ['Validation failed. Please try again.'],
        warnings: [],
        bookingType: 'Short',
        allocationInfo: null
      });
    }
  };
  
  // Load user's bookings for this year for allocation calculation
  const loadUserBookingsThisYear = async () => {
    try {
      console.log('📅 Loading user bookings for this year...');
      const bookings = await fetchUserBookings();
      const currentYear = new Date().getFullYear();
      // Only include CONFIRMED bookings for allocation calculation
      const thisYearConfirmedBookings = bookings.filter(booking => 
        new Date(booking.startDate).getFullYear() === currentYear && booking.status === 'confirmed'
      );
      console.log('📅 This year confirmed bookings for allocation:', thisYearConfirmedBookings.length, 'out of', bookings.length, 'total');
      setUserBookingsThisYear(thisYearConfirmedBookings);
    } catch (error) {
      console.error('Error loading user bookings for this year:', error);
    }
  };
  
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      {(() => {
        try {
          return (
      <View style={styles.container}>
        <View style={styles.header}>
                <TouchableOpacity 
                  style={styles.backButton}
                  onPress={() => navigation.goBack()}
                >
                  <MaterialIcons name="arrow-back" size={24} color="#000" />
                </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('Book My Stay')}</Text>
          <TouchableOpacity style={styles.helpButton}>
            <MaterialIcons name="help" size={24} color="#000" />
          </TouchableOpacity>
        </View>
        
        {/* Asset Selector */}
        <TouchableOpacity style={styles.assetSelector} onPress={toggleAssetDropdown}>
          <Text style={styles.assetSelectorText}>
                  {asset && asset.name ? asset.name : t('Select an Asset')}
          </Text>
          <MaterialIcons name="keyboard-arrow-down" size={24} color="#000" />
        </TouchableOpacity>
        
        {/* Asset Dropdown */}
        <Modal
          visible={showAssetDropdown}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowAssetDropdown(false)}
        >
          <TouchableOpacity 
            style={styles.dropdownOverlay}
            activeOpacity={1}
            onPress={() => setShowAssetDropdown(false)}
          >
            <View style={styles.dropdownContainer}>
              <Text style={styles.dropdownTitle}>{t('Select an Asset')}</Text>
              <FlatList
                data={availableAssets}
                renderItem={renderAssetItem}
                      keyExtractor={(item, index) => item?._id || `asset-${index}`}
                contentContainerStyle={styles.dropdownList}
              />
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Month Navigation */}
        <View style={styles.monthNavigation}>
          <TouchableOpacity onPress={handlePrevMonth} style={styles.navButton}>
            <MaterialIcons name="chevron-left" size={36} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.currentMonth}>
            {formatDate(currentMonth, 'MMMM yyyy')}
          </Text>
          <TouchableOpacity onPress={handleNextMonth} style={styles.navButton}>
            <MaterialIcons name="chevron-right" size={36} color="#fff" />
          </TouchableOpacity>
        </View>
        
        {/* Calendar */}
              {(() => {
                try {
                  return (
        <View style={styles.calendarContainer}>
          <FlatList
            ref={monthListRef}
            data={months}
            renderItem={renderCalendarMonth}
            keyExtractor={(item) => item.toISOString()}
            showsVerticalScrollIndicator={false}
            initialScrollIndex={0}
            getItemLayout={getItemLayout}
            maxToRenderPerBatch={3}
            windowSize={7}
            scrollEventThrottle={16}
            removeClippedSubviews={true}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.calendarContent}
            onScrollToIndexFailed={() => {}}
            maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
            onMomentumScrollEnd={(event) => {
              try {
                const index = Math.round(event.nativeEvent.contentOffset.y / 340);
                if (index >= 0 && index < months.length) setCurrentMonth(months[index]);
              } catch (e) {}
            }}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
          />
        </View>
                  );
                } catch (calendarError) {
                  console.error('💥 CRASH in calendar render:', calendarError);
                  return <View style={styles.calendarContainer}><Text>{t('Calendar Error')}</Text></View>;
                }
              })()}
              
              {/* Booking Validation Summary */}
              {(() => {
                try {
                  if (startDate && endDate && bookingTypeInfo) {
                    try {
                      const bookingTypeSection = bookingTypeInfo ? (
                        <>
                          <View style={styles.bookingTypeHeader}>
                            <Text style={styles.bookingTypeTitle}>{bookingTypeInfo.title || t('Booking')}</Text>
                            {bookingTypeInfo.badge && (
                              <View style={[styles.bookingTypeBadge, { backgroundColor: bookingTypeInfo.badgeColor || '#45B7D1' }]}>
                                <Text style={styles.bookingTypeBadgeText}>{bookingTypeInfo.badge}</Text>
                              </View>
                            )}
                          </View>
                          
                          {bookingTypeInfo.description && (
                            <Text style={styles.bookingTypeDescription}>{bookingTypeInfo.description}</Text>
                          )}
                        </>
                      ) : null;
                      
                      const allocationSection = validationResults?.allocationInfo ? (
                        <View style={styles.allocationInfo}>
                          <Text style={styles.allocationTitle}>{t('Booking Details')}</Text>
                          
                          {/* Booking Length */}
                          <View style={styles.allocationRow}>
                            <Text style={styles.allocationLabel}>{t('Booking length:')}</Text>
                            <Text style={styles.allocationValue}>{validationResults.allocationInfo.bookingLength || 0} {t('days')}</Text>
                          </View>
                          
                          {/* Allocation Usage based on Booking Type */}
                          {(() => {
                            const specialDateInfo = checkSpecialDateOverlap(
                              startDate, 
                              endDate, 
                              { type1: specialDatesType1, type2: specialDatesType2 }
                            );
                            
                            const bookingLength = validationResults.allocationInfo.bookingLength || 0;
                            const remainingDays = validationResults.allocationInfo.remainingDays || 0;
                            const remainingAfterBooking = Math.max(0, remainingDays - bookingLength);
                            
                            if (specialDateInfo.hasSpecialDates) {
                              return (
                                <>
                                  <View style={styles.allocationRow}>
                                    <Text style={styles.allocationLabel}>{t('Special date booking:')}</Text>
                                    <Text style={[styles.allocationValue, {color: '#9B59B6'}]}>
                                      {specialDateInfo.types.map(type => 
                                        type.replace('type1', 'Type 1').replace('type2', 'Type 2')
                                      ).join(' & ')}
                                    </Text>
                                  </View>                    
                                </>
                              );
                            } else if (validationResults.bookingType === 'VeryShort') {
                              const extraCost = bookingLength > remainingDays;
                              return (
                                <>
                                  <View style={styles.allocationRow}>
                                    <Text style={styles.allocationLabel}>{t('Last minute booking:')}</Text>
                                    <Text style={[styles.allocationValue, {color: extraCost ? '#FF6B6B' : '#27AE60'}]}>
                                      {extraCost ? t('Extra cost applies') : t('No extra cost')}
                                    </Text>
                                  </View>
                                </>
                              );
                            } else if (validationResults.bookingType === 'Short') {
                              return (
                                <>
                                  <View style={styles.allocationRow}>
                                    <Text style={styles.allocationLabel}>{t('Short term booking:')}</Text>
                                    <Text style={[styles.allocationValue, {color: '#4ECDC4'}]}>{t('Flexible rules')}</Text>
                                  </View>
                                
                                </>
                              );
                            } else {
                              return (
                                <>
                                  <View style={styles.allocationRow}>
                                    <Text style={styles.allocationLabel}>{t('Long term booking:')}</Text>
                                    <Text style={[styles.allocationValue, {color: '#45B7D1'}]}>{t('Standard rules')}</Text>
                                  </View>
                                
                                </>
                              );
                            }
                          })()}
                        </View>
                      ) : null;
                      
                      const warningsSection = null; // Hidden per request
                      
                      const errorsSection = (validationResults?.errors && Array.isArray(validationResults.errors) && validationResults.errors.length > 0) ? (
                        <View style={styles.errorsContainer}>
                          <Text style={styles.errorTitle}>{t('❌ Booking Not Available')}</Text>
                          {validationResults.errors.map((error, index) => (
                            <Text key={`error-${index}`} style={styles.errorText}>• {String(error || t('Unknown error'))}</Text>
                          ))}
                        </View>
                      ) : null;
                      
                      return (
                        <View style={styles.validationSummary}>
                          <View style={styles.validationContent}>
                            {bookingTypeSection}
                            {allocationSection}
                            {/* warningsSection intentionally omitted */}
                            {errorsSection}
                          </View>
                        </View>
                      );
                    } catch (summaryError) {
                      console.error('💥 CRASH in validation summary building:', summaryError);
                      return (
                        <View style={styles.validationSummary}>
                          <View style={styles.validationContent}>
                            <Text>{t('Validation summary error')}</Text>
                          </View>
                        </View>
                      );
                    }
                  } else {
                    console.log('📋 Validation summary conditions not met, skipping render');
                    return null;
                  }
                } catch (validationError) {
                  console.error('💥 CRASH in validation summary render:', validationError);
                  return <View><Text>{t('Validation Error')}</Text></View>;
                }
              })()}
        
        {/* Book Button */}
              {(() => {
                try {
                  if (startDate && endDate) {
                    return (
          <View style={styles.bookButtonContainer}>
                        {(validationResults?.errors && validationResults.errors.length > 0) ? (
                          <View style={styles.buttonRow}>
                            <TouchableOpacity 
                              style={styles.clearButton}
                              onPress={() => {
                                setStartDate(null);
                                setEndDate(null);
                                setSelectedDates([]);
                                setValidationResults(null);
                                setAlertHighlightRange(null);
                              }}
                            >
                              <Text style={styles.clearButtonText}>{t('Clear Selection')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                              style={[styles.bookButton, styles.bookButtonDisabled, styles.flexButton]}
                              disabled={true}
                            >
                              <Text style={[styles.bookButtonText, styles.bookButtonTextDisabled]}>
                                Cannot Book
                              </Text>
                              <Text style={[styles.bookButtonSubtext, styles.bookButtonSubtextDisabled]}>
                                {getBookingSummary()}
                              </Text>
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <View style={styles.buttonRow}>
                            <TouchableOpacity 
                              style={styles.clearButton}
                              onPress={() => {
                                setStartDate(null);
                                setEndDate(null);
                                setSelectedDates([]);
                                setValidationResults(null);
                                setAlertHighlightRange(null);
                              }}
                            >
                              <Text style={styles.clearButtonText}>{t('Clear Selection')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                              style={[styles.bookButton, styles.flexButton]}
                              onPress={handleContinueToBook}
                              disabled={isLoading}
                            >
                              <Text style={styles.bookButtonText}>
                                {isLoading ? t('Processing...') : t('Continue To Book')}
                              </Text>
                              <Text style={styles.bookButtonSubtext}>
                                {getBookingSummary()}
                              </Text>
                            </TouchableOpacity>
                          </View>
                        )}
      </View>
                    );
                  } else {
                    return null;
                  }
                } catch (buttonError) {
                  console.error('💥 CRASH in book button render:', buttonError);
                  return <View><Text>{t('Button Error')}</Text></View>;
                }
              })()}
            </View>
          );
        } catch (renderError) {
          console.error('💥 MAJOR CRASH in component render:', renderError);
          console.error('💥 Error stack:', renderError.stack);
          return (
            <View style={styles.container}>
              <Text>{t('App Error - Please restart')}</Text>
            </View>
          );
        }
      })()}
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
    backgroundColor: '#fff',
    paddingBottom: 70, // Increased from 60 to match new tab bar height
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18, // Increased from 15
    position: 'relative'
  },
  headerTitle: {
    fontSize: 22, // Increased from 20
    fontWeight: 'bold',
    textAlign: 'center'
  },
  helpButton: {
    position: 'absolute',
    right: 15,
    width: 44, // Increased from 40
    height: 44, // Increased from 40
    borderRadius: 22,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2
  },
  backButton: {
    position: 'absolute',
    left: 15,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2
  },
  assetSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 15,
    padding: 18, // Increased from 15
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 15
  },
  assetSelectorText: {
    fontSize: 20 // Increased from 18
  },
  monthNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1E4640',
    paddingVertical: 20,
    paddingHorizontal: 10
  },
  navButton: {
    padding: 8,
  },
  currentMonth: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff'
  },
  calendarContainer: {
    flex: 1,
    backgroundColor: '#e8f5f0', // Light mint color
    overflow: 'hidden'
  },
  calendarContent: {
    flexGrow: 1,
    paddingBottom: 220,
  },
  monthContainer: {
    height: 340, // Increased from 300
    paddingVertical: 0,
    paddingHorizontal: 0,
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginVertical: 10,
    textAlign: 'center',
    display: 'none' // Hide repeated month titles when using FlatList
  },
  weekdaysHeader: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingHorizontal: 2,
    paddingVertical: 10,
    backgroundColor: '#e0eeea',
    borderBottomWidth: 1,
    borderBottomColor: '#c5dbd5'
  },
  weekdayText: {
    flex: 1,
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 16,
    color: '#1E4640'
  },
  weeksContainer: {
    flex: 1,
  },
  weekRow: {
    flexDirection: 'row',
    width: '100%',
    height: 45, // Reduced to fit more weeks in view
  },
  dayCellContainer: {
    width: '14.28%', // 7 days per row
    height: '100%',
    padding: 0,
  },
  dayCell: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    margin: 1, // Reduced margin to make cells larger
    borderRadius: 5,
  },
  emptyCell: {
    flex: 1
  },
  dayText: {
    fontSize: 15, // Slightly smaller text to fit better
  },
  selectedDay: {
    backgroundColor: '#1E4640',
    margin: 0,
    borderRadius: 0,
  },
  alertHighlightedDay: {
    backgroundColor: '#dff4ef',
    margin: 0,
    borderRadius: 0,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#9fd2c8',
  },
  selectedDayText: {
    color: '#fff',
    fontWeight: 'bold'
  },
  alertHighlightedDayText: {
    color: '#1E4640',
    fontWeight: '700'
  },
  unavailableDay: {
    position: 'relative'
  },
  unavailableDayText: {
    color: '#aaa'
  },
  strikethrough: {
    position: 'absolute',
    width: '100%',
    height: 1,
    backgroundColor: '#888',
    top: '50%',
    transform: [{ rotate: '45deg' }]
  },
  specialDateIndicator: {
    position: 'absolute',
    top: 2,
    right: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookButtonContainer: {
    position: 'absolute',
    bottom: 70, // Increased from 60 to match new tab bar height
    left: 0,
    right: 0,
    backgroundColor: 'white',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  bookButton: {
    backgroundColor: '#1E4640',
    marginHorizontal: 15,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  bookButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold'
  },
  bookButtonSubtext: {
    color: '#fff',
    fontSize: 14,
    marginTop: 5
  },
  startDay: {
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
  },
  endDay: {
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
  },
  middleDay: {
    margin: 0,
  },
  alertHighlightStartDay: {
    borderLeftWidth: 1,
    borderLeftColor: '#9fd2c8',
  },
  alertHighlightEndDay: {
    borderRightWidth: 1,
    borderRightColor: '#9fd2c8',
  },
  alertHighlightMiddleDay: {
    margin: 0,
  },
  // Dropdown styles
  dropdownOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownContainer: {
    width: '90%',
    backgroundColor: 'white',
    borderRadius: 10,
    overflow: 'hidden',
    maxHeight: 400,
  },
  dropdownTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    textAlign: 'center',
  },
  dropdownList: {
    padding: 10,
  },
  assetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  assetItemContent: {
    flex: 1,
  },
  assetItemName: {
    fontSize: 18,
    fontWeight: '500',
  },
  assetItemLocation: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  userBookingDay: {
    backgroundColor: '#1E4640',
    margin: 0,
    borderRadius: 0,
  },
  userBookingDayText: {
    color: '#fff',
    fontWeight: 'bold'
  },
  validationSummary: {
    maxHeight: 280,
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    marginHorizontal: 15,
    marginVertical: 12,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
    alignItems: 'center',
    marginBottom: 120
  },
  validationContent: {
    flexGrow: 1,
    paddingBottom: 0,
    width: '92%'
  },
  bookingTypeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  bookingTypeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E4640',
    textAlign: 'center'
  },
  bookingTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 10,
  },
  bookingTypeBadgeText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  bookingTypeDescription: {
    marginBottom: 10,
    color: '#666',
    fontSize: 14,
    textAlign: 'center'
  },
  allocationInfo: {
    marginBottom: 10,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    alignItems: 'center'
  },
  allocationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#1E4640',
    textAlign: 'center'
  },
  allocationRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 6,
  },
  allocationLabel: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center'
  },
  allocationValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1E4640',
    textAlign: 'center'
  },
  warningsContainer: {
    marginBottom: 10,
    padding: 10,
    backgroundColor: '#FFF8DC',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FF8C00',
    alignItems: 'center'
  },
  warningTitle: {
    fontWeight: 'bold',
    color: '#FF8C00',
    fontSize: 14,
    marginBottom: 5,
    textAlign: 'center'
  },
  warningText: {
    color: '#B8860B',
    fontSize: 13,
    marginBottom: 3,
    textAlign: 'center'
  },
  errorsContainer: {
    marginBottom: 10,
    padding: 10,
    backgroundColor: '#FFF0F0',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B6B',
    alignItems: 'center'
  },
  errorTitle: {
    fontWeight: 'bold',
    color: '#FF6B6B',
    fontSize: 14,
    marginBottom: 5,
    textAlign: 'center'
  },
  errorText: {
    color: '#DC143C',
    fontSize: 13,
    marginBottom: 3,
    textAlign: 'center'
  },
  serverBanner: {
    position: 'absolute',
    left: 15,
    right: 15,
    bottom: 135,
    backgroundColor: '#FFF8DC',
    borderLeftWidth: 4,
    borderLeftColor: '#FF8C00',
    padding: 10,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
    alignItems: 'center'
  },
  serverBannerText: {
    color: '#8a6d3b',
    textAlign: 'center'
  },
  bookButtonDisabled: {
    backgroundColor: '#ccc',
  },
  bookButtonTextDisabled: {
    color: '#999',
  },
  bookButtonSubtextDisabled: {
    color: '#999',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  clearButton: {
    backgroundColor: '#1E4640',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    minWidth: 120,
    marginRight: 10,
  },
  clearButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  },
  flexButton: {
    flex: 1,
  },
});

export default CreateBookingScreen; 
