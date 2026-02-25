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
import { useI18n } from '../../i18n';

const ProfileScreen = ({ navigation }) => {
  const { user, logout } = useAuth();
  const { t, locale, setLocale } = useI18n();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const handleLogout = () => {
    Alert.alert(
      t('Confirm Logout'),
      t('Are you sure you want to log out?'),
      [
        {
          text: t('Cancel'),
          style: 'cancel',
        },
        {
          text: t('Logout'),
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
        <Text style={styles.headerTitle}>{t('Settings')}</Text>
        
        <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.contentContainer}>
          {renderSettingItem(t('Profile'), () => navigation.navigate('UserProfile'))}
          
          {renderSettingItem(t('Change Password'), () => navigation.navigate('ChangePassword'))}

          {renderSettingItem(
            t('Language'),
            () => setLocale(locale === 'en' ? 'es' : 'en'),
            <View style={styles.languageSwitchRow}>
              <TouchableOpacity
                onPress={() => setLocale('en')}
                style={[styles.languageOption, locale === 'en' && styles.languageOptionActive]}
              >
                <Text style={[styles.languageOptionText, locale === 'en' && styles.languageOptionTextActive]}>EN</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setLocale('es')}
                style={[styles.languageOption, locale === 'es' && styles.languageOptionActive]}
              >
                <Text style={[styles.languageOptionText, locale === 'es' && styles.languageOptionTextActive]}>ES</Text>
              </TouchableOpacity>
            </View>
          )}
          
          {renderSettingItem(t('Notifications'), () => toggleNotifications(), 
            <Switch 
              value={notificationsEnabled}
              onValueChange={toggleNotifications}
              trackColor={{ false: "#c4c4c4", true: "#6d6d6d" }}
              thumbColor="#000"
            />
          )}
          
          {renderSettingItem(t('FAQ'), () => console.log('FAQ pressed'))}
          
          {renderSettingItem(t('Contact Us'), () => console.log('Contact Us pressed'))}
          
          {renderSettingItem(t('Terms & Conditions'), () => console.log('Terms pressed'))}
          
          {renderSettingItem(t('Privacy Policy'), () => console.log('Privacy pressed'))}
          
          {renderSettingItem(t('API Test Console'), () => navigation.navigate('ApiTest'))}
          
          {renderSettingItem(t('Logout'), handleLogout)}
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
  languageSwitchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  languageOption: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#fff',
  },
  languageOptionActive: {
    backgroundColor: '#1E4640',
    borderColor: '#1E4640',
  },
  languageOptionText: {
    color: '#1E4640',
    fontWeight: '600',
  },
  languageOptionTextActive: {
    color: '#fff',
  },
});

export default ProfileScreen; 
