import React, { useMemo, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  KeyboardAvoidingView, 
  Platform, 
  ScrollView,
  Alert 
} from 'react-native';
import { TextInput, Button } from 'react-native-paper';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { authApi } from '../../api';
import { useI18n } from '../../i18n';

const ResetPasswordScreen = ({ route, navigation }) => {
  const { token } = route.params || {};
  const { t, mapApiError } = useI18n();
  const [isLoading, setIsLoading] = useState(false);
  const [secureTextEntry, setSecureTextEntry] = useState(true);
  const [secureConfirmTextEntry, setSecureConfirmTextEntry] = useState(true);
  const validationSchema = useMemo(
    () =>
      Yup.object().shape({
        password: Yup.string()
          .required(t('Password is required'))
          .min(6, t('Password must be at least 6 characters')),
        confirmPassword: Yup.string()
          .required(t('Confirm password is required'))
          .oneOf([Yup.ref('password')], t('Passwords must match')),
      }),
    [t]
  );

  const handleResetPassword = async (values) => {
    if (!token) {
      Alert.alert(t('Error'), t('Reset token is missing'));
      return;
    }

    setIsLoading(true);
    const result = await authApi.resetPassword(
      token, 
      values.password, 
      values.confirmPassword
    );
    setIsLoading(false);
    
    if (result.success) {
      Alert.alert(
        t('Password Reset Successful'),
        t('Your password has been reset successfully. You can now log in with your new password.'),
        [{ text: t('OK'), onPress: () => navigation.navigate('Login') }]
      );
    } else {
      Alert.alert(t('Error'), mapApiError(result.error || 'Failed to reset password', 'Failed to reset password'));
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
          <Text style={styles.backButtonText}>{t('← Back to Login')}</Text>
        </TouchableOpacity>
        
        <View style={styles.headerContainer}>
          <Text style={styles.headerText}>{t('Reset Password')}</Text>
          <Text style={styles.subHeaderText}>
            {t('Please enter your new password below.')}
          </Text>
        </View>
        
        <Formik
          initialValues={{ password: '', confirmPassword: '' }}
          validationSchema={validationSchema}
          onSubmit={handleResetPassword}
        >
          {({ handleChange, handleBlur, handleSubmit, values, errors, touched }) => (
            <View style={styles.formContainer}>
              <TextInput
                label={t('New Password')}
                value={values.password}
                onChangeText={handleChange('password')}
                onBlur={handleBlur('password')}
                secureTextEntry={secureTextEntry}
                style={styles.input}
                error={touched.password && errors.password}
                right={
                  <TextInput.Icon 
                    icon={secureTextEntry ? "eye" : "eye-off"} 
                    onPress={() => setSecureTextEntry(!secureTextEntry)} 
                  />
                }
              />
              {touched.password && errors.password && (
                <Text style={styles.errorText}>{errors.password}</Text>
              )}
              
              <TextInput
                label={t('Confirm New Password')}
                value={values.confirmPassword}
                onChangeText={handleChange('confirmPassword')}
                onBlur={handleBlur('confirmPassword')}
                secureTextEntry={secureConfirmTextEntry}
                style={styles.input}
                error={touched.confirmPassword && errors.confirmPassword}
                right={
                  <TextInput.Icon 
                    icon={secureConfirmTextEntry ? "eye" : "eye-off"} 
                    onPress={() => setSecureConfirmTextEntry(!secureConfirmTextEntry)} 
                  />
                }
              />
              {touched.confirmPassword && errors.confirmPassword && (
                <Text style={styles.errorText}>{errors.confirmPassword}</Text>
              )}
              
              <Button
                mode="contained"
                onPress={handleSubmit}
                style={styles.button}
                loading={isLoading}
                disabled={isLoading}
              >
                {t('Reset Password')}
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
    color: '#1976D2',
    fontSize: 16,
  },
  headerContainer: {
    marginBottom: 30,
  },
  headerText: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
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
    backgroundColor: '#1976D2',
  },
  errorText: {
    color: 'red',
    fontSize: 12,
    marginBottom: 10,
    marginLeft: 5,
  },
});

export default ResetPasswordScreen; 
