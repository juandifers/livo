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
  StatusBar,
  Modal,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../i18n';
import { SHOW_API_TEST_TOOLS } from '../../config';

const DELETE_CONFIRMATION_WORD = 'DELETE';

const ProfileScreen = ({ navigation }) => {
  const { logout, deleteAccount } = useAuth();
  const { t, locale, setLocale, mapApiError } = useI18n();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

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

  const resetDeleteState = () => {
    setDeletePassword('');
    setDeleteConfirmationText('');
    setIsDeleting(false);
    setIsDeleteModalVisible(false);
  };

  const handleDeleteAccountStepOne = () => {
    Alert.alert(
      t('Delete Account'),
      t('This action is permanent and cannot be undone.'),
      [
        {
          text: t('Cancel'),
          style: 'cancel',
        },
        {
          text: t('Continue'),
          style: 'destructive',
          onPress: () => setIsDeleteModalVisible(true),
        },
      ]
    );
  };

  const handleDeleteAccountStepTwo = async () => {
    if (!deletePassword.trim()) {
      Alert.alert(t('Error'), t('Current password is required'));
      return;
    }

    if (deleteConfirmationText.trim().toUpperCase() !== DELETE_CONFIRMATION_WORD) {
      Alert.alert(t('Error'), t('Please type {{word}} to confirm', { word: DELETE_CONFIRMATION_WORD }));
      return;
    }

    setIsDeleting(true);
    const result = await deleteAccount(deletePassword, DELETE_CONFIRMATION_WORD);
    setIsDeleting(false);

    if (result.success) {
      resetDeleteState();
      Alert.alert(t('Account Deleted'), t('Your account has been deleted successfully.'));
      return;
    }

    Alert.alert(
      t('Error'),
      mapApiError(result.error || 'Failed to delete account', 'Failed to delete account')
    );
  };

  const renderSettingItem = (title, onPress, rightElement = null, options = {}) => (
    <TouchableOpacity 
      style={[styles.settingItem, options.destructive && styles.settingItemDanger]} 
      onPress={onPress}
      activeOpacity={0.6}
    >
      <Text style={[styles.settingText, options.destructive && styles.settingTextDanger]}>{title}</Text>
      {rightElement || (
        <MaterialIcons name="chevron-right" size={24} color={options.destructive ? '#b91c1c' : '#888'} />
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
          
          {renderSettingItem(t('Terms & Conditions'), () => navigation.navigate('TermsAndConditions'))}
          
          {renderSettingItem(t('Privacy Policy'), () => navigation.navigate('PrivacyPolicy'))}
          
          {SHOW_API_TEST_TOOLS &&
            renderSettingItem(t('API Test Console'), () => navigation.navigate('ApiTest'))}

          {renderSettingItem(t('Delete Account'), handleDeleteAccountStepOne, null, { destructive: true })}
          
          {renderSettingItem(t('Logout'), handleLogout)}
        </ScrollView>

        <Modal
          visible={isDeleteModalVisible}
          transparent
          animationType="fade"
          onRequestClose={resetDeleteState}
        >
          <KeyboardAvoidingView
            style={styles.modalBackdrop}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>{t('Delete Account')}</Text>
              <Text style={styles.modalDescription}>
                {t('Type {{word}} and enter your current password to permanently delete your account.', {
                  word: DELETE_CONFIRMATION_WORD
                })}
              </Text>

              <Text style={styles.modalLabel}>{t('Current Password')}</Text>
              <TextInput
                value={deletePassword}
                onChangeText={setDeletePassword}
                secureTextEntry
                autoCapitalize="none"
                style={styles.modalInput}
                editable={!isDeleting}
                placeholder={t('Current Password')}
              />

              <Text style={styles.modalLabel}>{t('Type {{word}}', { word: DELETE_CONFIRMATION_WORD })}</Text>
              <TextInput
                value={deleteConfirmationText}
                onChangeText={setDeleteConfirmationText}
                autoCapitalize="characters"
                style={styles.modalInput}
                editable={!isDeleting}
                placeholder={DELETE_CONFIRMATION_WORD}
              />

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalCancelButton]}
                  onPress={resetDeleteState}
                  disabled={isDeleting}
                >
                  <Text style={styles.modalCancelText}>{t('Cancel')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalButton, styles.modalDeleteButton, isDeleting && styles.modalButtonDisabled]}
                  onPress={handleDeleteAccountStepTwo}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.modalDeleteText}>{t('Delete My Account')}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
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
  settingItemDanger: {
    borderColor: '#fecaca',
    backgroundColor: '#fff7f7',
  },
  settingText: {
    fontSize: 18,
    color: '#333',
    fontWeight: '500',
  },
  settingTextDanger: {
    color: '#b91c1c',
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  modalDescription: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 16,
    lineHeight: 20,
  },
  modalLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    color: '#111827',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 6,
  },
  modalButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 116,
    alignItems: 'center',
  },
  modalCancelButton: {
    backgroundColor: '#f3f4f6',
  },
  modalDeleteButton: {
    backgroundColor: '#b91c1c',
  },
  modalButtonDisabled: {
    opacity: 0.7,
  },
  modalCancelText: {
    color: '#111827',
    fontWeight: '600',
  },
  modalDeleteText: {
    color: '#fff',
    fontWeight: '700',
  },
});

export default ProfileScreen; 
