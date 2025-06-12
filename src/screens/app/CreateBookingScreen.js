import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
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
import { bookingApi, assetApi } from '../../api';
import { format, addDays, addMonths, isSameDay, isWithinInterval, isBefore, getMonth, getYear, getDaysInMonth, startOfMonth, getDay } from 'date-fns';

const { width } = Dimensions.get('window');

const CreateBookingScreen = ({ route, navigation }) => {
  const { asset: navigationAsset, editBooking } = route.params || {};
  
  // Default asset for testing when no asset is provided
  const defaultAsset = {
    _id: '123456',
    name: 'Aquarii',
    type: 'boat',
    location: 'Cartagena'
  };
  
  const [asset, setAsset] = useState(navigationAsset || defaultAsset);
  const [isLoading, setIsLoading] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date(2025, 7, 1)); // August 2025
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [selectedDates, setSelectedDates] = useState([]);
  const [unavailableDates, setUnavailableDates] = useState([]);
  const [specialDatesType1, setSpecialDatesType1] = useState([]);
  const [specialDatesType2, setSpecialDatesType2] = useState([]);
  const [months, setMonths] = useState([]);
  const [showAssetDropdown, setShowAssetDropdown] = useState(false);
  const [availableAssets, setAvailableAssets] = useState([]);
  const monthListRef = useRef(null);
  
  // Load unavailable dates and special dates for the asset
  useEffect(() => {
    loadAssetAvailability();
    generateMonths();
    loadAvailableAssets();
  }, []);
  
  // Load assets when dropdown is opened
  const loadAvailableAssets = async () => {
    try {
      // In a real app, fetch this from your API
      const assets = [
        {
          _id: '123456',
          name: 'Aquarii',
          type: 'boat',
          location: 'Cartagena'
        },
        {
          _id: '789012',
          name: 'Ocean View',
          type: 'house',
          location: 'Miami'
        },
        {
          _id: '345678',
          name: 'Serenity',
          type: 'boat',
          location: 'Bahamas'
        },
        {
          _id: '901234',
          name: 'Mountain Lodge',
          type: 'house',
          location: 'Aspen'
        }
      ];
      
      setAvailableAssets(assets);
    } catch (error) {
      console.error('Error loading assets:', error);
    }
  };
  
  // Update availability when asset changes
  useEffect(() => {
    if (asset) {
      loadAssetAvailability();
    }
  }, [asset]);
  
  const generateMonths = () => {
    // Generate 24 months starting from current month
    const generatedMonths = [];
    const startMonth = new Date(2025, 0, 1); // January 2025
    
    for (let i = 0; i < 24; i++) {
      generatedMonths.push(addMonths(startMonth, i));
    }
    
    setMonths(generatedMonths);
  };
  
  const loadAssetAvailability = async () => {
    if (!asset) return;
    
    try {
      setIsLoading(true);
      
      // Reset selected dates when asset changes
      setStartDate(null);
      setEndDate(null);
      setSelectedDates([]);
      
      // Mock unavailable dates (in a real app, get these from API)
      const unavailable = [
        new Date(2025, 7, 20),
        new Date(2025, 7, 21),
        new Date(2025, 7, 22),
      ];
      
      // Mock special dates type 1 (empty stars)
      const special1 = [
        new Date(2025, 7, 7),
        new Date(2025, 7, 8),
        new Date(2025, 7, 9),
        new Date(2025, 7, 10),
        new Date(2025, 7, 15),
        new Date(2025, 7, 16),
        new Date(2025, 7, 17),
        new Date(2025, 7, 18),
      ];
      
      // Mock special dates type 2 (filled stars)
      const special2 = [];
      
      setUnavailableDates(unavailable);
      setSpecialDatesType1(special1);
      setSpecialDatesType2(special2);
      
      // If editing, set the selected dates
      if (editBooking) {
        handleDateSelection(new Date(editBooking.startDate));
        handleDateSelection(new Date(editBooking.endDate));
      }
      
      setIsLoading(false);
    } catch (error) {
      setIsLoading(false);
      console.error('Error loading asset availability:', error);
    }
  };
  
  // Handle asset selection
  const handleAssetSelection = (selectedAsset) => {
    setAsset(selectedAsset);
    setShowAssetDropdown(false);
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
          {item.name} {item.type === 'boat' ? '(T)' : '(H)'}
        </Text>
        <Text style={styles.assetItemLocation}>{item.location}</Text>
      </View>
      {asset._id === item._id && (
        <MaterialIcons name="check" size={24} color="#1E4640" />
      )}
    </TouchableOpacity>
  );
  
  // Update the date selection handler to prevent scroll issues
  const handleDateSelection = useCallback((date) => {
    // Save the current scroll position
    let currentScrollOffset = 0;
    if (monthListRef.current) {
      // Get current scroll offset if available
      currentScrollOffset = monthListRef.current._scrollMetrics?.offset || 0;
    }

    // Check if date is unavailable - quick check first
    if (isDateUnavailable(date)) {
      Alert.alert('Date Unavailable', 'This date is not available for booking.');
      return;
    }
    
    // If no start date is selected, set it immediately
    if (!startDate) {
      setStartDate(date);
      setSelectedDates([date]);
      
      // Restore scroll position after state update
      setTimeout(() => {
        if (monthListRef.current && currentScrollOffset > 0) {
          monthListRef.current.scrollToOffset({ 
            offset: currentScrollOffset, 
            animated: false 
          });
        }
      }, 10);
      return;
    }
    
    // If start date is selected but no end date
    if (startDate && !endDate) {
      // If selected date is before start date, make it the new start date
      if (isBefore(date, startDate)) {
        setStartDate(date);
        setSelectedDates([date]);
        
        // Restore scroll position after state update
        setTimeout(() => {
          if (monthListRef.current && currentScrollOffset > 0) {
            monthListRef.current.scrollToOffset({ 
              offset: currentScrollOffset, 
              animated: false 
            });
          }
        }, 10);
        return;
      }
      
      // For performance, first check if start and end dates are unavailable
      if (isDateUnavailable(startDate) || isDateUnavailable(date)) {
        Alert.alert('Invalid Selection', 'Your selection includes unavailable dates.');
        return;
      }
      
      // Set the end date immediately to provide visual feedback
      setEndDate(date);
      
      // Then calculate the date range in a setTimeout to prevent UI blocking
      setTimeout(() => {
        const datesInRange = [];
        let currentDate = new Date(startDate);
        const endDateValue = new Date(date);
        
        // Optimization: limit range check to 90 days maximum
        let dateCount = 0;
        const maxDays = 90;
        
        while (currentDate <= endDateValue && dateCount < maxDays) {
          datesInRange.push(new Date(currentDate));
          currentDate.setDate(currentDate.getDate() + 1);
          dateCount++;
        }
        
        setSelectedDates(datesInRange);
        
        // Restore scroll position after state update
        if (monthListRef.current && currentScrollOffset > 0) {
          monthListRef.current.scrollToOffset({ 
            offset: currentScrollOffset, 
            animated: false 
          });
        }
      }, 10);
    } else {
      // Both dates are selected, start a new selection
      setStartDate(date);
      setEndDate(null);
      setSelectedDates([date]);
      
      // Restore scroll position after state update
      setTimeout(() => {
        if (monthListRef.current && currentScrollOffset > 0) {
          monthListRef.current.scrollToOffset({ 
            offset: currentScrollOffset, 
            animated: false 
          });
        }
      }, 10);
    }
  }, [startDate, endDate, isDateUnavailable]);
  
  const getDatesInRange = (start, end) => {
    const dates = [];
    let currentDate = start;
    
    while (!isSameDay(currentDate, addDays(end, 1))) {
      dates.push(new Date(currentDate));
      currentDate = addDays(currentDate, 1);
    }
    
    return dates;
  };
  
  const isDateSelected = (date) => {
    if (!date || (!startDate && !endDate)) return false;
    
    if (startDate && !endDate) {
      return isSameDay(date, startDate);
    }
    
    if (startDate && endDate) {
      return isWithinInterval(date, { start: startDate, end: endDate });
    }
    
    return false;
  };
  
  const isStartDate = (date) => startDate && isSameDay(date, startDate);
  const isEndDate = (date) => endDate && isSameDay(date, endDate);
  const isMiddleDate = (date) => {
    if (!startDate || !endDate || !date) return false;
    return isDateSelected(date) && !isStartDate(date) && !isEndDate(date);
  };
  
  const isDateUnavailable = (date) => {
    if (!date) return false;
    
    // Compare by timestamp for better performance
    const dateTime = date.getTime();
    return unavailableDates.some(unavailableDate => {
      return unavailableDate.getTime() === dateTime;
    });
  };
  
  const isSpecialDateType1 = (date) => {
    if (!date) return false;
    const dateTime = date.getTime();
    return specialDatesType1.some(specialDate => specialDate.getTime() === dateTime);
  };
  
  const isSpecialDateType2 = (date) => {
    if (!date) return false;
    const dateTime = date.getTime();
    return specialDatesType2.some(specialDate => specialDate.getTime() === dateTime);
  };
  
  // Memoize the dates data to avoid recalculation on every render
  const generateCalendarData = useCallback((month) => {
    const daysInMonth = getDaysInMonth(month);
    const firstDayOfMonth = startOfMonth(month);
    const startingDayOfWeek = getDay(firstDayOfMonth);
    
    // Create array of dates for the month
    const dates = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      dates.push(null); // Empty cells for days before the 1st of the month
    }
    
    for (let i = 1; i <= daysInMonth; i++) {
      dates.push(new Date(month.getFullYear(), month.getMonth(), i));
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
        weeks.push(week);
        week = [];
      }
    });
    
    return { weeks, monthYear: format(month, 'MMMM yyyy') };
  }, []);
  
  // Memoize day cell rendering function
  const renderDayCell = useCallback((date, index, week) => {
    if (!date) return <View style={styles.emptyCell} />;
    
    const isSelected = isDateSelected(date);
    const isUnavailable = isDateUnavailable(date);
    const isSpecialType1 = isSpecialDateType1(date);
    const isSpecialType2 = isSpecialDateType2(date);
    const isStart = isStartDate(date);
    const isEnd = isEndDate(date);
    
    // Get adjacent dates in the week to check for continuous selection
    const prevDate = index > 0 ? week[index - 1] : null;
    const nextDate = index < 6 ? week[index + 1] : null;
    
    const isPrevSelected = prevDate && isDateSelected(prevDate);
    const isNextSelected = nextDate && isDateSelected(nextDate);
    
    // Determine cell styles based on selection state
    let cellStyle = [styles.dayCell];
    let textStyle = [styles.dayText];
    
    if (isSelected) {
      cellStyle.push(styles.selectedDay);
      textStyle.push(styles.selectedDayText);
      
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
    
    if (isUnavailable) {
      cellStyle.push(styles.unavailableDay);
      textStyle.push(styles.unavailableDayText);
    }
    
    return (
      <TouchableOpacity
        style={cellStyle}
        onPress={() => handleDateSelection(date)}
        disabled={isUnavailable}
        activeOpacity={0.7} // Prevent full opacity change on press
      >
        <Text style={textStyle}>{date.getDate()}</Text>
        {isSpecialType1 && !isUnavailable && (
          <View style={styles.specialDateIndicator}>
            <MaterialIcons name="star-outline" size={16} color={isSelected ? "#fff" : "#1E4640"} />
          </View>
        )}
        {isSpecialType2 && !isUnavailable && (
          <View style={styles.specialDateIndicator}>
            <MaterialIcons name="star" size={16} color={isSelected ? "#fff" : "#1E4640"} />
          </View>
        )}
        {isUnavailable && (
          <View style={styles.strikethrough} />
        )}
      </TouchableOpacity>
    );
  }, [startDate, endDate, selectedDates, unavailableDates, specialDatesType1, specialDatesType2, handleDateSelection]);
  
  // Optimize month rendering with memoization
  const renderCalendarMonth = useCallback(({ item }) => {
    const { weeks, monthYear } = generateCalendarData(item);
    
    return (
      <View style={styles.monthContainer}>
        <Text style={styles.monthTitle}>{monthYear}</Text>
        <View style={styles.weekdaysHeader}>
          <Text style={styles.weekdayText}>Sun</Text>
          <Text style={styles.weekdayText}>Mon</Text>
          <Text style={styles.weekdayText}>Tue</Text>
          <Text style={styles.weekdayText}>Wed</Text>
          <Text style={styles.weekdayText}>Thu</Text>
          <Text style={styles.weekdayText}>Fri</Text>
          <Text style={styles.weekdayText}>Sat</Text>
        </View>
        
        <View style={styles.weeksContainer}>
          {weeks.map((weekDates, weekIndex) => (
            <View key={`week-${weekIndex}`} style={styles.weekRow}>
              {weekDates.map((date, dayIndex) => (
                <View key={`day-${dayIndex}`} style={styles.dayCellContainer}>
                  {date ? renderDayCell(date, dayIndex, weekDates) : <View style={styles.emptyCell} />}
                </View>
              ))}
            </View>
          ))}
        </View>
      </View>
    );
  }, [generateCalendarData, renderDayCell]);
  
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
    if (!startDate || !endDate) {
      Alert.alert('Select Dates', 'Please select both start and end dates for your booking.');
      return;
    }
    
    // Navigate to next step or submit booking
    const bookingData = {
      asset: asset._id,
      startDate,
      endDate,
      bookingType: 'Short', // Default booking type
    };
    
    Alert.alert(
      'Confirm Booking',
      `Do you want to book ${asset.name} from ${format(startDate, 'dd MMM, yyyy')} to ${format(endDate, 'dd MMM, yyyy')}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Confirm',
          onPress: () => submitBooking(bookingData)
        }
      ]
    );
  };
  
  const submitBooking = async (bookingData) => {
    try {
      setIsLoading(true);
      
      // In a real app, submit to API
      // const result = await bookingApi.createBooking(bookingData);
      
      // Simulate successful booking
      setTimeout(() => {
        setIsLoading(false);
        Alert.alert(
          'Booking Successful',
          'Your booking has been confirmed.',
          [{ 
            text: 'OK', 
            onPress: () => navigation.navigate('BookingsTab')
          }]
        );
      }, 1000);
      
    } catch (error) {
      setIsLoading(false);
      Alert.alert('Error', 'Failed to create booking. Please try again.');
      console.error('Error creating booking:', error);
    }
  };
  
  const getBookingSummary = () => {
    if (!startDate || !endDate) return '';
    
    const nightsCount = selectedDates.length - 1;
    const daysCount = selectedDates.length;
    
    return `${nightsCount} nights, ${daysCount} days`;
  };
  
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Book My Stay</Text>
          <TouchableOpacity style={styles.helpButton}>
            <MaterialIcons name="help" size={24} color="#000" />
          </TouchableOpacity>
        </View>
        
        {/* Asset Selector */}
        <TouchableOpacity style={styles.assetSelector} onPress={toggleAssetDropdown}>
          <Text style={styles.assetSelectorText}>
            {asset ? `${asset.name} ${asset.type === 'boat' ? '(T)' : '(H)'}` : 'Select an Asset'}
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
              <Text style={styles.dropdownTitle}>Select an Asset</Text>
              <FlatList
                data={availableAssets}
                renderItem={renderAssetItem}
                keyExtractor={(item) => item._id}
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
            {format(currentMonth, 'MMMM yyyy')}
          </Text>
          <TouchableOpacity onPress={handleNextMonth} style={styles.navButton}>
            <MaterialIcons name="chevron-right" size={36} color="#fff" />
          </TouchableOpacity>
        </View>
        
        {/* Calendar */}
        <View style={styles.calendarContainer}>
          <FlatList
            ref={monthListRef}
            data={months}
            renderItem={renderCalendarMonth}
            keyExtractor={(item) => item.toISOString()}
            showsVerticalScrollIndicator={false}
            initialScrollIndex={7} // Start at August 2025
            getItemLayout={getItemLayout}
            maxToRenderPerBatch={3}
            windowSize={7}
            scrollEventThrottle={16}
            removeClippedSubviews={true}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.calendarContent}
            onScrollToIndexFailed={() => {}}
            maintainVisibleContentPosition={{
              minIndexForVisible: 0
            }}
            onMomentumScrollEnd={(event) => {
              const index = Math.floor(event.nativeEvent.contentOffset.y / 340);
              if (index >= 0 && index < months.length) {
                setCurrentMonth(months[index]);
              }
            }}
          />
        </View>
        
        {/* Book Button */}
        {(startDate && endDate) && (
          <View style={styles.bookButtonContainer}>
            <TouchableOpacity 
              style={styles.bookButton}
              onPress={handleContinueToBook}
              disabled={isLoading}
            >
              <Text style={styles.bookButtonText}>
                {isLoading ? 'Processing...' : 'Continue To Book'}
              </Text>
              <Text style={styles.bookButtonSubtext}>{getBookingSummary()}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
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
    paddingBottom: 0,
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
  selectedDayText: {
    color: '#fff',
    fontWeight: 'bold'
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
    marginTop: 2
  },
  bookButtonContainer: {
    position: 'absolute',
    bottom: 70, // Increased from 60 to match new tab bar height
    left: 0,
    right: 0,
    backgroundColor: 'white',
    paddingVertical: 10,
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
});

export default CreateBookingScreen; 