import React, { useMemo, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  KeyboardAvoidingView, 
  Platform,
  ScrollView,
  Alert,
  TextInput
} from 'react-native';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { useAuth } from '../../context/AuthContext';
import { MaterialIcons } from '@expo/vector-icons';
import { DEV_MODE, TEST_CREDENTIALS } from '../../config';
import { useI18n } from '../../i18n';

const LoginScreen = ({ navigation }) => {
  const { login, isSigningIn } = useAuth();
  const { t, locale, setLocale, mapApiError } = useI18n();
  const [secureTextEntry, setSecureTextEntry] = useState(true);
  const [rememberMe, setRememberMe] = useState(false);
  const validationSchema = useMemo(
    () =>
      Yup.object().shape({
        email: Yup.string()
          .email(t('Please enter a valid email'))
          .required(t('Email is required')),
        password: Yup.string()
          .required(t('Password is required'))
          .min(6, t('Password must be at least 6 characters')),
      }),
    [t]
  );

  const handleLogin = async (values) => {
    const result = await login(values.email, values.password);
    
    if (!result.success) {
      Alert.alert(t('Login Failed'), mapApiError(result.error, 'Login Failed'));
    }
  };

  const toggleRememberMe = () => {
    setRememberMe(!rememberMe);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Language Selector */}
        <View style={styles.languageContainer}>
          <TouchableOpacity
            style={[styles.languageButton, locale === 'en' && styles.languageButtonActive]}
            onPress={() => setLocale('en')}
          >
            <MaterialIcons
              name="language"
              size={20}
              color={locale === 'en' ? '#FFF' : '#1E4640'}
              style={styles.flagIcon}
            />
            <Text style={[styles.languageText, locale === 'en' ? styles.languageTextActive : styles.languageTextInactive]}>
              EN
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.languageButton, locale === 'es' && styles.languageButtonActive]}
            onPress={() => setLocale('es')}
          >
            <MaterialIcons
              name="language"
              size={20}
              color={locale === 'es' ? '#FFF' : '#1E4640'}
              style={styles.flagIcon}
            />
            <Text style={[styles.languageText, locale === 'es' ? styles.languageTextActive : styles.languageTextInactive]}>
              ES
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.headerContainer}>
          <Text style={styles.headerText}>{t('Sign in')}</Text>
          <Text style={styles.subHeaderText}>
            {t('Enter your details below')}
          </Text>
        </View>
        
        <Formik
          initialValues={{ 
            email: DEV_MODE ? TEST_CREDENTIALS.email : '', 
            password: DEV_MODE ? TEST_CREDENTIALS.password : '' 
          }}
          validationSchema={validationSchema}
          onSubmit={handleLogin}
        >
          {({ handleChange, handleBlur, handleSubmit, values, errors, touched }) => (
            <View style={styles.formContainer}>
              <View style={styles.inputContainer}>
                <TextInput
                  placeholder={t('Enter Email')}
                  value={values.email}
                  onChangeText={handleChange('email')}
                  onBlur={handleBlur('email')}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={styles.input}
                />
                {touched.email && errors.email && (
                  <Text style={styles.errorText}>{errors.email}</Text>
                )}
              </View>
              
              <View style={styles.inputContainer}>
                <TextInput
                  placeholder={t('Password')}
                  value={values.password}
                  onChangeText={handleChange('password')}
                  onBlur={handleBlur('password')}
                  secureTextEntry={secureTextEntry}
                  style={styles.input}
                />
                <TouchableOpacity 
                  style={styles.eyeIcon}
                  onPress={() => setSecureTextEntry(!secureTextEntry)}
                >
                  <MaterialIcons 
                    name={secureTextEntry ? "visibility-off" : "visibility"} 
                    size={24} 
                    color="#999"
                  />
                </TouchableOpacity>
                {touched.password && errors.password && (
                  <Text style={styles.errorText}>{errors.password}</Text>
                )}
              </View>
              
              <View style={styles.rememberForgotContainer}>
                <TouchableOpacity 
                  style={styles.rememberMeContainer}
                  onPress={toggleRememberMe}
                >
                  <View style={styles.checkbox}>
                    {rememberMe && (
                      <MaterialIcons name="check" size={18} color="#000" />
                    )}
                  </View>
                  <Text style={styles.rememberMeText}>{t('Remember me')}</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  onPress={() => navigation.navigate('ForgotPassword')}
                >
                  <Text style={styles.forgotPasswordText}>{t('Forgot Password?')}</Text>
                </TouchableOpacity>
              </View>
              
              <TouchableOpacity
                style={styles.loginButton}
                onPress={handleSubmit}
                disabled={isSigningIn}
              >
                <Text style={styles.loginButtonText}>
                  {isSigningIn ? t('Signing in...') : t('Sign in')}
                </Text>
              </TouchableOpacity>
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
  },
  languageContainer: {
    alignItems: 'flex-end',
    marginTop: 10,
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  languageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E5F2EF',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  languageButtonActive: {
    backgroundColor: '#1E4640',
  },
  flagIcon: {
    marginRight: 8,
  },
  languageText: {
    fontSize: 16,
  },
  languageTextActive: {
    color: '#FFFFFF',
  },
  languageTextInactive: {
    color: '#1E4640',
  },
  headerContainer: {
    marginTop: 40,
    marginBottom: 40,
  },
  headerText: {
    fontSize: 36,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#000',
  },
  subHeaderText: {
    fontSize: 16,
    color: '#777',
  },
  formContainer: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: 20,
    position: 'relative',
  },
  input: {
    height: 55,
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: 16,
    backgroundColor: '#FFF',
  },
  eyeIcon: {
    position: 'absolute',
    right: 15,
    top: 15,
  },
  rememberForgotContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  rememberMeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 1,
    borderColor: '#999',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 4,
    marginRight: 8,
  },
  rememberMeText: {
    fontSize: 16,
    color: '#000',
  },
  forgotPasswordText: {
    fontSize: 16,
    color: '#000',
  },
  loginButton: {
    backgroundColor: '#1E4640',
    borderRadius: 8,
    height: 55,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  errorText: {
    color: 'red',
    fontSize: 12,
    marginTop: 5,
    marginLeft: 5,
  },
});

export default LoginScreen; 
