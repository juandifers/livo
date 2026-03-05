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

const ForgotPasswordScreen = ({ navigation }) => {
  const { t, mapApiError } = useI18n();
  const [isLoading, setIsLoading] = useState(false);
  const validationSchema = useMemo(
    () =>
      Yup.object().shape({
        email: Yup.string()
          .email(t('Please enter a valid email'))
          .required(t('Email is required')),
      }),
    [t]
  );

  const handleForgotPassword = async (values) => {
    setIsLoading(true);
    const result = await authApi.forgotPassword(values.email);
    setIsLoading(false);
    
    if (result.success) {
      Alert.alert(
        t('Reset Link Sent'),
        t('If an account exists with this email, you will receive a password reset link.'),
        [{ text: t('OK'), onPress: () => navigation.navigate('Login') }]
      );
    } else {
      Alert.alert(t('Error'), mapApiError(result.error));
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
          <Text style={styles.headerText}>{t('Forgot Password')}</Text>
          <Text style={styles.subHeaderText}>
            {t('Enter your email address and we will send you a link to reset your password.')}
          </Text>
        </View>
        
        <Formik
          initialValues={{ email: '' }}
          validationSchema={validationSchema}
          onSubmit={handleForgotPassword}
        >
          {({ handleChange, handleBlur, handleSubmit, values, errors, touched }) => (
            <View style={styles.formContainer}>
              <TextInput
                label={t('Email')}
                value={values.email}
                onChangeText={handleChange('email')}
                onBlur={handleBlur('email')}
                style={styles.input}
                autoCapitalize="none"
                keyboardType="email-address"
                error={touched.email && errors.email}
              />
              {touched.email && errors.email && (
                <Text style={styles.errorText}>{errors.email}</Text>
              )}
              
              <Button
                mode="contained"
                onPress={handleSubmit}
                style={styles.button}
                loading={isLoading}
                disabled={isLoading}
              >
                {t('Send Reset Link')}
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

export default ForgotPasswordScreen; 
