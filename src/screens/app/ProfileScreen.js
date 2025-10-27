import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Alert,
  Switch,
  SafeAreaView,
  StatusBar
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';

const ProfileScreen = ({ navigation }) => {
  const { user, logout } = useAuth();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const handleLogout = () => {
    Alert.alert(
      'Confirm Logout',
      'Are you sure you want to log out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          onPress: async () => {
            await logout();
          },
        },
      ]
    );
  };

  const toggleNotifications = () => {
    setNotificationsEnabled(!notificationsEnabled);
  };

  const renderSettingItem = (title, onPress, rightElement = null) => (
    <TouchableOpacity 
      style={styles.settingItem} 
      onPress={onPress}
      activeOpacity={0.6}
    >
      <Text style={styles.settingText}>{title}</Text>
      {rightElement || (
        <MaterialIcons name="chevron-right" size={24} color="#888" />
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.container}>
        <Text style={styles.headerTitle}>Settings</Text>
        
        <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.contentContainer}>
          {renderSettingItem('Profile', () => navigation.navigate('UserProfile'))}
          
          {renderSettingItem('Change Password', () => console.log('Change Password pressed'))}
          
          {renderSettingItem('Notifications', () => toggleNotifications(), 
            <Switch 
              value={notificationsEnabled}
              onValueChange={toggleNotifications}
              trackColor={{ false: "#c4c4c4", true: "#6d6d6d" }}
              thumbColor="#000"
            />
          )}
          
          {renderSettingItem('FAQ', () => console.log('FAQ pressed'))}
          
          {renderSettingItem('Contact Us', () => console.log('Contact Us pressed'))}
          
          {renderSettingItem('Terms & Conditions', () => console.log('Terms pressed'))}
          
          {renderSettingItem('Privacy Policy', () => console.log('Privacy pressed'))}
          
          {renderSettingItem('API Test Console', () => navigation.navigate('ApiTest'))}
          
          {renderSettingItem('Logout', handleLogout)}
        </ScrollView>
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
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    padding: 20,
  },
  scrollContainer: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 20,
    borderWidth: 1,
    borderColor: '#e1e1e1',
    borderRadius: 10,
    marginBottom: 15,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
  },
  settingText: {
    fontSize: 18,
    color: '#333',
    fontWeight: '500',
  },
});

export default ProfileScreen; 