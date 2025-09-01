import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  StatusBar,
  Switch,
  Image,
  Alert,
  Modal,
  Platform
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';

const UserProfileScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('GENERAL INFO');
  const [isEditing, setIsEditing] = useState(false);
  const [showImageOptions, setShowImageOptions] = useState(false);
  
  // Initialize from authenticated user; fall back to placeholders if fields are missing
  const [userData, setUserData] = useState({
    firstName: user?.name || user?.firstName || '',
    lastName: user?.lastName || '',
    userName: user?.username || user?.email?.split('@')[0] || '',
    dateOfBirth: user?.dateOfBirth || '',
    email: user?.email || '',
    phoneNumber: user?.phoneNumber || '',
    addressLine1: user?.address?.line1 || '',
    addressLine2: user?.address?.line2 || '',
    postalCode: user?.address?.postalCode || '',
    country: user?.address?.country || '',
    state: user?.address?.state || '',
    city: user?.address?.city || '',
    profileImage: user?.avatarUrl || null,
    communicationPreferences: {
      phone: !!user?.communicationPreferences?.phone,
      text: !!user?.communicationPreferences?.text,
      email: !!user?.communicationPreferences?.email
    }
  });

  // Store original data for cancel functionality
  const [originalData, setOriginalData] = useState({...userData});

  const toggleEditMode = () => {
    if (isEditing) {
      // Save changes
      setOriginalData({...userData});
      Alert.alert("Success", "Profile updated successfully!");
    } else {
      // Enter edit mode
      setOriginalData({...userData});
    }
    setIsEditing(!isEditing);
  };

  const cancelEditing = () => {
    setUserData({...originalData});
    setIsEditing(false);
  };

  const handleInputChange = (field, value) => {
    setUserData({
      ...userData,
      [field]: value
    });
  };

  const openImagePicker = () => {
    setShowImageOptions(true);
  };

  const mockSelectImage = (source) => {
    // In a real app, this would use react-native-image-picker or expo-image-picker
    let mockImage;
    
    if (source === 'camera') {
      mockImage = 'https://randomuser.me/api/portraits/men/32.jpg';
    } else {
      mockImage = 'https://randomuser.me/api/portraits/men/44.jpg';
    }
    
    setUserData({
      ...userData,
      profileImage: mockImage
    });
    
    setShowImageOptions(false);
  };

  const renderInputField = (label, field, value, keyboardType = 'default') => (
    <View style={styles.inputContainer}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        style={[styles.input, isEditing && styles.editableInput]}
        value={value}
        onChangeText={(text) => handleInputChange(field, text)}
        editable={isEditing}
        keyboardType={keyboardType}
      />
    </View>
  );

  const renderCommunicationSwitch = (label, field, value) => (
    <View style={styles.switchContainer}>
      <Text style={styles.switchLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={(newValue) => {
          setUserData({
            ...userData,
            communicationPreferences: {
              ...userData.communicationPreferences,
              [field]: newValue
            }
          });
        }}
        trackColor={{ false: "#e0e0e0", true: "#e0e0e0" }}
        thumbColor={value ? "#1E4640" : "#f5f5f5"}
        disabled={!isEditing}
      />
    </View>
  );

  const renderGeneralInfoTab = () => (
    <View style={styles.tabContent}>
      {renderInputField('First Name', 'firstName', userData.firstName)}
      {renderInputField('Last Name', 'lastName', userData.lastName)}
      {renderInputField('User Name', 'userName', userData.userName)}
      
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Date of Birth</Text>
        <View style={styles.dateInputContainer}>
          <TextInput
            style={[styles.input, isEditing && styles.editableInput]}
            value={userData.dateOfBirth}
            onChangeText={(text) => handleInputChange('dateOfBirth', text)}
            editable={isEditing}
          />
          <MaterialIcons 
            name="calendar-today" 
            size={24} 
            color={isEditing ? "#1976D2" : "#1E4640"} 
            style={styles.calendarIcon} 
          />
        </View>
      </View>
      
      {renderInputField('Email', 'email', userData.email, 'email-address')}
      
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Phone Number</Text>
        <View style={[styles.phoneInputContainer, isEditing && styles.editableInput]}>
          <Image 
            source={{ uri: 'https://flagcdn.com/w20/co.png' }} 
            style={styles.flagIcon} 
          />
          <MaterialIcons name="arrow-drop-down" size={24} color="black" />
          <TextInput
            style={styles.phoneInput}
            value={userData.phoneNumber}
            onChangeText={(text) => handleInputChange('phoneNumber', text)}
            editable={isEditing}
            keyboardType="phone-pad"
          />
        </View>
      </View>
    </View>
  );

  const renderAddressTab = () => (
    <View style={styles.tabContent}>
      {renderInputField('Address line 1', 'addressLine1', userData.addressLine1)}
      {renderInputField('Address line 2', 'addressLine2', userData.addressLine2)}
      {renderInputField('PostalCode', 'postalCode', userData.postalCode)}
      {renderInputField('Country', 'country', userData.country)}
      {renderInputField('State', 'state', userData.state)}
      {renderInputField('City', 'city', userData.city)}
    </View>
  );

  const renderCommunicationTab = () => (
    <View style={styles.tabContent}>
      {renderCommunicationSwitch('Phone', 'phone', userData.communicationPreferences.phone)}
      {renderCommunicationSwitch('Text', 'text', userData.communicationPreferences.text)}
      {renderCommunicationSwitch('Email', 'email', userData.communicationPreferences.email)}
    </View>
  );

  const renderActiveTabContent = () => {
    switch (activeTab) {
      case 'GENERAL INFO':
        return renderGeneralInfoTab();
      case 'ADDRESS':
        return renderAddressTab();
      case 'COMMUNICATION':
        return renderCommunicationTab();
      default:
        return renderGeneralInfoTab();
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => {
              if (isEditing) {
                Alert.alert(
                  "Discard Changes",
                  "Are you sure you want to go back? Your changes will be lost.",
                  [
                    {
                      text: "Cancel",
                      style: "cancel"
                    },
                    { 
                      text: "Discard", 
                      onPress: () => navigation.goBack(),
                      style: "destructive"
                    }
                  ]
                );
              } else {
                navigation.goBack();
              }
            }}
          >
            <MaterialIcons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{user?.name ? `${user.name}` : 'Profile'}</Text>
          {isEditing ? (
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={cancelEditing}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.placeholder} />
          )}
        </View>

        <View style={styles.profileImageContainer}>
          <TouchableOpacity 
            style={styles.profileImage}
            onPress={isEditing ? openImagePicker : null}
            activeOpacity={isEditing ? 0.7 : 1}
          >
            {userData.profileImage ? (
              <Image 
                source={{ uri: userData.profileImage }} 
                style={styles.userImage} 
              />
            ) : (
              <MaterialIcons name="person" size={60} color="#333" />
            )}
            
            {isEditing && (
              <View style={styles.editImageOverlay}>
                <MaterialIcons name="camera-alt" size={24} color="#fff" />
                <Text style={styles.editImageText}>Change</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[
              styles.tabButton, 
              activeTab === 'GENERAL INFO' && styles.activeTabButton
            ]}
            onPress={() => setActiveTab('GENERAL INFO')}
          >
            <Text 
              style={[
                styles.tabText, 
                activeTab === 'GENERAL INFO' && styles.activeTabText
              ]}
            >
              GENERAL INFO
            </Text>
            {activeTab === 'GENERAL INFO' && <View style={styles.activeTabIndicator} />}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.tabButton, 
              activeTab === 'ADDRESS' && styles.activeTabButton
            ]}
            onPress={() => setActiveTab('ADDRESS')}
          >
            <Text 
              style={[
                styles.tabText, 
                activeTab === 'ADDRESS' && styles.activeTabText
              ]}
            >
              ADDRESS
            </Text>
            {activeTab === 'ADDRESS' && <View style={styles.activeTabIndicator} />}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.tabButton, 
              activeTab === 'COMMUNICATION' && styles.activeTabButton
            ]}
            onPress={() => setActiveTab('COMMUNICATION')}
          >
            <Text 
              style={[
                styles.tabText, 
                activeTab === 'COMMUNICATION' && styles.activeTabText
              ]}
            >
              COMMUNICATION
            </Text>
            {activeTab === 'COMMUNICATION' && <View style={styles.activeTabIndicator} />}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollContainer}>
          {renderActiveTabContent()}
        </ScrollView>

        <TouchableOpacity 
          style={[styles.editButton, isEditing && styles.saveButton]}
          onPress={toggleEditMode}
        >
          <Text style={styles.editButtonText}>
            {isEditing ? 'Save' : 'Edit'}
          </Text>
        </TouchableOpacity>

        {/* Image Selection Modal */}
        <Modal
          visible={showImageOptions}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowImageOptions(false)}
        >
          <TouchableOpacity 
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowImageOptions(false)}
          >
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Change Profile Picture</Text>
              
              <TouchableOpacity 
                style={styles.modalOption}
                onPress={() => mockSelectImage('camera')}
              >
                <MaterialIcons name="camera-alt" size={24} color="#1E4640" />
                <Text style={styles.modalOptionText}>Take Photo</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.modalOption}
                onPress={() => mockSelectImage('gallery')}
              >
                <MaterialIcons name="photo-library" size={24} color="#1E4640" />
                <Text style={styles.modalOptionText}>Choose from Gallery</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.modalCancelButton}
                onPress={() => setShowImageOptions(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
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
    width: 60,
  },
  cancelButton: {
    padding: 8,
  },
  cancelButtonText: {
    color: '#F44336',
    fontSize: 16,
    fontWeight: '500',
  },
  profileImageContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  userImage: {
    width: '100%',
    height: '100%',
    borderRadius: 60,
  },
  editImageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editImageText: {
    color: '#fff',
    fontSize: 12,
    marginTop: 2,
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 15,
    position: 'relative',
  },
  activeTabButton: {
    borderBottomWidth: 2,
    borderBottomColor: '#000',
  },
  tabText: {
    fontSize: 14,
    color: '#888',
  },
  activeTabText: {
    color: '#000',
    fontWeight: '500',
  },
  activeTabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#000',
  },
  scrollContainer: {
    flex: 1,
  },
  tabContent: {
    padding: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#333',
  },
  editableInput: {
    borderColor: '#1976D2',
    backgroundColor: '#f9f9f9',
  },
  dateInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  calendarIcon: {
    position: 'absolute',
    right: 15,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingLeft: 15,
  },
  flagIcon: {
    width: 24,
    height: 16,
  },
  phoneInput: {
    flex: 1,
    padding: 15,
    fontSize: 16,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 20,
  },
  switchLabel: {
    fontSize: 16,
  },
  editButton: {
    backgroundColor: '#1E4640',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    margin: 20,
  },
  saveButton: {
    backgroundColor: '#1976D2',
  },
  editButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalOptionText: {
    fontSize: 16,
    marginLeft: 15,
  },
  modalCancelButton: {
    marginTop: 20,
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  modalCancelText: {
    fontSize: 16,
    color: '#F44336',
    fontWeight: '500',
  },
});

export default UserProfileScreen; 