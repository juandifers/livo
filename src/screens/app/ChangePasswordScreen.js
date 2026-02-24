import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { TextInput, Button } from 'react-native-paper';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { authApi } from '../../api';

const validationSchema = Yup.object().shape({
  currentPassword: Yup.string().required('Current password is required'),
  newPassword: Yup.string()
    .required('New password is required')
    .min(6, 'New password must be at least 6 characters'),
  confirmNewPassword: Yup.string()
    .required('Confirm new password is required')
    .oneOf([Yup.ref('newPassword')], 'Passwords must match'),
});

const ChangePasswordScreen = ({ navigation }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [secureCurrent, setSecureCurrent] = useState(true);
  const [secureNew, setSecureNew] = useState(true);
  const [secureConfirm, setSecureConfirm] = useState(true);

  const handleChangePassword = async (values) => {
    setIsLoading(true);
    const result = await authApi.changePassword(
      values.currentPassword,
      values.newPassword,
      values.confirmNewPassword
    );
    setIsLoading(false);

    if (result.success) {
      Alert.alert(
        'Password Updated',
        'Your password has been changed successfully.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } else {
      Alert.alert('Error', result.error || 'Failed to change password');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>← Back to Settings</Text>
        </TouchableOpacity>

        <View style={styles.headerContainer}>
          <Text style={styles.headerText}>Change Password</Text>
          <Text style={styles.subHeaderText}>
            Enter your current password and choose a new one.
          </Text>
        </View>

        <Formik
          initialValues={{
            currentPassword: '',
            newPassword: '',
            confirmNewPassword: '',
          }}
          validationSchema={validationSchema}
          onSubmit={handleChangePassword}
        >
          {({ handleChange, handleBlur, handleSubmit, values, errors, touched }) => (
            <View style={styles.formContainer}>
              <TextInput
                label="Current Password"
                value={values.currentPassword}
                onChangeText={handleChange('currentPassword')}
                onBlur={handleBlur('currentPassword')}
                secureTextEntry={secureCurrent}
                style={styles.input}
                error={touched.currentPassword && !!errors.currentPassword}
                right={
                  <TextInput.Icon
                    icon={secureCurrent ? 'eye' : 'eye-off'}
                    onPress={() => setSecureCurrent(!secureCurrent)}
                  />
                }
              />
              {touched.currentPassword && errors.currentPassword && (
                <Text style={styles.errorText}>{errors.currentPassword}</Text>
              )}

              <TextInput
                label="New Password"
                value={values.newPassword}
                onChangeText={handleChange('newPassword')}
                onBlur={handleBlur('newPassword')}
                secureTextEntry={secureNew}
                style={styles.input}
                error={touched.newPassword && !!errors.newPassword}
                right={
                  <TextInput.Icon
                    icon={secureNew ? 'eye' : 'eye-off'}
                    onPress={() => setSecureNew(!secureNew)}
                  />
                }
              />
              {touched.newPassword && errors.newPassword && (
                <Text style={styles.errorText}>{errors.newPassword}</Text>
              )}

              <TextInput
                label="Confirm New Password"
                value={values.confirmNewPassword}
                onChangeText={handleChange('confirmNewPassword')}
                onBlur={handleBlur('confirmNewPassword')}
                secureTextEntry={secureConfirm}
                style={styles.input}
                error={touched.confirmNewPassword && !!errors.confirmNewPassword}
                right={
                  <TextInput.Icon
                    icon={secureConfirm ? 'eye' : 'eye-off'}
                    onPress={() => setSecureConfirm(!secureConfirm)}
                  />
                }
              />
              {touched.confirmNewPassword && errors.confirmNewPassword && (
                <Text style={styles.errorText}>{errors.confirmNewPassword}</Text>
              )}

              <Button
                mode="contained"
                onPress={handleSubmit}
                style={styles.button}
                loading={isLoading}
                disabled={isLoading}
              >
                Update Password
              </Button>
            </View>
          )}
        </Formik>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 20,
    paddingTop: 60,
  },
  backButton: {
    marginBottom: 30,
  },
  backButtonText: {
    color: '#1E4640',
    fontSize: 16,
  },
  headerContainer: {
    marginBottom: 30,
  },
  headerText: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#1E4640',
  },
  subHeaderText: {
    fontSize: 16,
    color: '#666',
  },
  formContainer: {
    width: '100%',
  },
  input: {
    marginBottom: 10,
    backgroundColor: '#f5f5f5',
  },
  button: {
    marginTop: 20,
    paddingVertical: 8,
    backgroundColor: '#1E4640',
  },
  errorText: {
    color: 'red',
    fontSize: 12,
    marginBottom: 10,
    marginLeft: 5,
  },
});

export default ChangePasswordScreen;
