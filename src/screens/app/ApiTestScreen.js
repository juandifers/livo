import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  StatusBar
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { 
  logApiConfig, 
  testAuthentication, 
  testGetAssets, 
  testGetUserBookings 
} from '../../utils/apiTester';
import { TEST_CREDENTIALS } from '../../config';
import { showCalendarSelection, requestCalendarPermissions } from '../../utils/calendarUtils';

const ApiTestScreen = ({ navigation }) => {
  const [logs, setLogs] = useState([]);
  const [logCounter, setLogCounter] = useState(0);
  const [email, setEmail] = useState(TEST_CREDENTIALS.email);
  const [password, setPassword] = useState(TEST_CREDENTIALS.password);
  const [isLoading, setIsLoading] = useState(false);

  // Function to add log entries
  const addLog = (message, type = 'info') => {
    setLogCounter(prev => prev + 1);
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prevLogs => [
      { id: `${Date.now()}-${logCounter}`, message, timestamp, type },
      ...prevLogs
    ]);
  };

  // Clear logs
  const clearLogs = () => {
    setLogs([]);
  };

  // Run configuration log
  const runConfigTest = () => {
    clearLogs();
    addLog('Testing API Configuration...', 'info');
    
    try {
      logApiConfig();
      const config = require('../../config');
      
      addLog(`DEV_MODE: ${config.DEV_MODE}`, 'info');
      addLog(`Environment: ${config.ENVIRONMENT}`, 'info');
      
      const apiConfig = config.getCurrentApiConfig();
      addLog(`API URL: ${apiConfig.baseURL}`, 'success');
      addLog(`Timeout: ${apiConfig.timeout}ms`, 'info');
      
      addLog('Configuration test completed', 'success');
    } catch (error) {
      addLog(`Error: ${error.message}`, 'error');
    }
  };

  // Run authentication test
  const runAuthTest = async () => {
    setIsLoading(true);
    addLog('Testing authentication...', 'info');
    
    try {
      const result = await testAuthentication(email, password);
      
      if (result.success) {
        addLog('Authentication successful', 'success');
        addLog(`User: ${result.data.user.name}`, 'info');
      } else {
        addLog(`Authentication failed: ${result.error}`, 'error');
      }
    } catch (error) {
      addLog(`Error: ${error.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Test assets API
  const runAssetsTest = async () => {
    setIsLoading(true);
    addLog('Testing assets API...', 'info');
    
    try {
      const result = await testGetAssets();
      
      if (result.success) {
        addLog(`Successfully fetched ${result.data.length} assets`, 'success');
        
        if (result.data.length > 0) {
          const firstAsset = result.data[0];
          addLog(`First asset: ${firstAsset.name} (${firstAsset._id})`, 'info');
        }
      } else {
        addLog(`Assets fetch failed: ${result.error}`, 'error');
      }
    } catch (error) {
      addLog(`Error: ${error.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Test bookings API
  const runBookingsTest = async () => {
    setIsLoading(true);
    addLog('Testing bookings API...', 'info');
    
    try {
      const result = await testGetUserBookings();
      
      if (result.success) {
        addLog(`Successfully fetched ${result.data.length} bookings`, 'success');
        
        if (result.data.length > 0) {
          const firstBooking = result.data[0];
          addLog(`First booking: ${firstBooking._id}`, 'info');
          addLog(`Asset: ${firstBooking.asset.name}`, 'info');
        }
      } else {
        addLog(`Bookings fetch failed: ${result.error}`, 'error');
      }
    } catch (error) {
      addLog(`Error: ${error.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Run all tests
  const runAllTests = async () => {
    clearLogs();
    setIsLoading(true);
    
    addLog('Running all tests...', 'info');
    
    // Configuration test
    runConfigTest();
    
    // Authentication test
    addLog('Starting authentication test', 'info');
    try {
      const authResult = await testAuthentication(email, password);
      
      if (authResult.success) {
        addLog('Authentication successful', 'success');
        
        // Only run other tests if authentication succeeds
        addLog('Starting assets test', 'info');
        await runAssetsTest();
        
        addLog('Starting bookings test', 'info');
        await runBookingsTest();
        
        addLog('All tests completed', 'success');
      } else {
        addLog(`Authentication failed: ${authResult.error}`, 'error');
        addLog('Stopping tests', 'info');
      }
    } catch (error) {
      addLog(`Error: ${error.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const testCalendar = async () => {
    setLogCounter(prev => prev + 1);
    
    // Create a test booking
    const testBooking = {
      _id: '648c4a221caa172d00ebec4a',
      startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      endDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),  // 10 days from now
      status: 'confirmed',
      notes: 'Test booking from Livo app'
    };
    
    const testAsset = {
      name: 'Serenity Dreams',
      location: 'Marina del Rey, California',
      type: 'boat'
    };
    
    try {
      console.log(`[${logCounter + 1}] Testing calendar integration...`);
      addLog(`[${logCounter + 1}] Testing calendar integration...`, 'info');
      
      await showCalendarSelection(testBooking, testAsset);
      
      console.log(`[${logCounter + 1}] Calendar test completed`);
      addLog(`[${logCounter + 1}] Calendar test completed`, 'success');
    } catch (error) {
      console.error(`[${logCounter + 1}] Calendar test error:`, error);
      addLog(`[${logCounter + 1}] Calendar test error: ${error.message}`, 'error');
    }
  };

  const testCalendarPermissions = async () => {
    setLogCounter(prev => prev + 1);
    
    try {
      console.log(`[${logCounter + 1}] Testing calendar permissions...`);
      addLog(`[${logCounter + 1}] Testing calendar permissions...`, 'info');
      
      const hasPermission = await requestCalendarPermissions();
      
      console.log(`[${logCounter + 1}] Calendar permission granted: ${hasPermission}`);
      addLog(`[${logCounter + 1}] Calendar permission granted: ${hasPermission}`, 'success');
    } catch (error) {
      console.error(`[${logCounter + 1}] Permission test error:`, error);
      addLog(`[${logCounter + 1}] Permission test error: ${error.message}`, 'error');
    }
  };

  // Log entry component
  const LogEntry = ({ log }) => {
    const getLogColor = () => {
      switch (log.type) {
        case 'success': return '#4CAF50';
        case 'error': return '#F44336';
        case 'warning': return '#FF9800';
        default: return '#2196F3';
      }
    };
    
    return (
      <View style={styles.logEntry}>
        <Text style={styles.logTimestamp}>{log.timestamp}</Text>
        <Text style={[styles.logMessage, { color: getLogColor() }]}>
          {log.message}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <MaterialIcons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>API Test Console</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.credentialsContainer}>
          <Text style={styles.sectionTitle}>Test Credentials</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="Email"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Password"
            secureTextEntry
          />
        </View>

        <View style={styles.actionsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TouchableOpacity 
              style={[styles.actionButton, isLoading && styles.disabledButton]}
              onPress={runConfigTest}
              disabled={isLoading}
            >
              <Text style={styles.actionButtonText}>Test Config</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionButton, isLoading && styles.disabledButton]}
              onPress={runAuthTest}
              disabled={isLoading}
            >
              <Text style={styles.actionButtonText}>Test Auth</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionButton, isLoading && styles.disabledButton]}
              onPress={runAssetsTest}
              disabled={isLoading}
            >
              <Text style={styles.actionButtonText}>Test Assets</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionButton, isLoading && styles.disabledButton]}
              onPress={runBookingsTest}
              disabled={isLoading}
            >
              <Text style={styles.actionButtonText}>Test Bookings</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionButton, styles.runAllButton, isLoading && styles.disabledButton]}
              onPress={runAllTests}
              disabled={isLoading}
            >
              <Text style={styles.actionButtonText}>Run All Tests</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        <View style={styles.logsContainer}>
          <View style={styles.logsHeader}>
            <Text style={styles.sectionTitle}>Logs</Text>
            <TouchableOpacity onPress={clearLogs}>
              <Text style={styles.clearText}>Clear</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.logsList}>
            {logs.length === 0 ? (
              <Text style={styles.emptyLogs}>No logs yet. Run a test to see results here.</Text>
            ) : (
              logs.map(log => <LogEntry key={log.id} log={log} />)
            )}
          </ScrollView>
        </View>

        <View style={styles.calendarContainer}>
          <Text style={styles.sectionTitle}>Calendar Integration</Text>
          
          <TouchableOpacity style={[styles.button, styles.warningButton]} onPress={testCalendarPermissions}>
            <Text style={styles.buttonText}>Test Calendar Permissions</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.button, styles.successButton]} onPress={testCalendar}>
            <Text style={styles.buttonText}>Test Add to Calendar</Text>
          </TouchableOpacity>
        </View>
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
    paddingBottom: 75, // Match tab bar height
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  placeholder: {
    width: 40,
  },
  credentialsContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    marginBottom: 10,
  },
  actionsContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  actionButton: {
    backgroundColor: '#1E4640',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginRight: 10,
    minWidth: 100,
    alignItems: 'center',
  },
  runAllButton: {
    backgroundColor: '#2196F3',
  },
  disabledButton: {
    opacity: 0.5,
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  logsContainer: {
    flex: 1,
    padding: 16,
  },
  logsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  clearText: {
    color: '#F44336',
    fontWeight: 'bold',
  },
  logsList: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 10,
  },
  emptyLogs: {
    textAlign: 'center',
    color: '#999',
    marginTop: 20,
  },
  logEntry: {
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  logTimestamp: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  logMessage: {
    fontSize: 14,
  },
  calendarContainer: {
    padding: 16,
  },
  button: {
    backgroundColor: '#1E4640',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginRight: 10,
    minWidth: 100,
    alignItems: 'center',
  },
  warningButton: {
    backgroundColor: '#FF9800',
  },
  successButton: {
    backgroundColor: '#4CAF50',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default ApiTestScreen; 