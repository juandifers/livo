import React, { useMemo, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
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

const AccountSetupScreen = ({ route, navigation }) => {
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

  const handleSetup = async (values) => {
    if (!token) {
      Alert.alert(t('Error'), t('Setup token is missing'));
      return;
    }

    setIsLoading(true);
    const result = await authApi.completeAccountSetup(
      token, 
      values.password, 
      values.confirmPassword
    );
    setIsLoading(false);
    
    if (result.success) {
      Alert.alert(
        t('Account Setup Complete'),
        t('Your account has been successfully set up. You can now log in.'),
        [{ text: t('OK'), onPress: () => navigation.navigate('Login') }]
      );
    } else {
      Alert.alert(
        t('Error'),
        mapApiError(result.error || 'Failed to complete account setup', 'Failed to complete account setup')
      );
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.headerContainer}>
          <Text style={styles.headerText}>{t('Complete Your Account Setup')}</Text>
          <Text style={styles.subHeaderText}>
            {t('Please set a password to activate your account.')}
          </Text>
        </View>
        
        <Formik
          initialValues={{ password: '', confirmPassword: '' }}
          validationSchema={validationSchema}
          onSubmit={handleSetup}
        >
          {({ handleChange, handleBlur, handleSubmit, values, errors, touched }) => (
            <View style={styles.formContainer}>
              <TextInput
                label={t('Password')}
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
                label={t('Confirm Password')}
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
                {t('Complete Setup')}
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
  headerContainer: {
    marginBottom: 30,
    alignItems: 'center',
  },
  headerText: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  subHeaderText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
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

export default AccountSetupScreen; 
