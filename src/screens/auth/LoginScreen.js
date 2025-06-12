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
  TextInput,
  Image
} from 'react-native';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { useAuth } from '../../context/AuthContext';
import { MaterialIcons } from '@expo/vector-icons';

// Development mode flag - should match other API files
const DEV_MODE = true;

const validationSchema = Yup.object().shape({
  email: Yup.string()
    .email('Please enter a valid email')
    .required('Email is required'),
  password: Yup.string()
    .required('Password is required')
    .min(6, 'Password must be at least 6 characters'),
});

const LoginScreen = ({ navigation }) => {
  const { login, isSigningIn } = useAuth();
  const [secureTextEntry, setSecureTextEntry] = useState(true);
  const [rememberMe, setRememberMe] = useState(false);

  const handleLogin = async (values) => {
    const result = await login(values.email, values.password);
    
    if (!result.success) {
      Alert.alert('Login Failed', result.error);
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
          <TouchableOpacity style={styles.languageButton}>
            <MaterialIcons name="language" size={20} color="#FFF" style={styles.flagIcon} />
            <Text style={styles.languageText}>English</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.headerContainer}>
          <Text style={styles.headerText}>Sign in</Text>
          <Text style={styles.subHeaderText}>
            Enter your details below
          </Text>
        </View>
        
        <Formik
          initialValues={{ email: DEV_MODE ? 'test@example.com' : '', password: DEV_MODE ? 'password' : '' }}
          validationSchema={validationSchema}
          onSubmit={handleLogin}
        >
          {({ handleChange, handleBlur, handleSubmit, values, errors, touched }) => (
            <View style={styles.formContainer}>
              <View style={styles.inputContainer}>
                <TextInput
                  placeholder="Enter Email"
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
                  placeholder="Password"
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
                  <Text style={styles.rememberMeText}>Remember me</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  onPress={() => navigation.navigate('ForgotPassword')}
                >
                  <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                </TouchableOpacity>
              </View>
              
              <TouchableOpacity
                style={styles.loginButton}
                onPress={handleSubmit}
                disabled={isSigningIn}
              >
                <Text style={styles.loginButtonText}>
                  {isSigningIn ? 'Signing in...' : 'Sign in'}
                </Text>
              </TouchableOpacity>

              {DEV_MODE && (
                <View style={styles.devModeContainer}>
                  <Text style={styles.devModeText}>DEVELOPMENT MODE</Text>
                  <Text style={styles.devModeCredentials}>
                    Using: test@example.com / password
                  </Text>
                </View>
              )}
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
  },
  languageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E4640',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  flagIcon: {
    marginRight: 8,
  },
  languageText: {
    color: '#FFFFFF',
    fontSize: 16,
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
  devModeContainer: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#F8F8F8',
    borderRadius: 5,
    alignItems: 'center',
  },
  devModeText: {
    fontWeight: 'bold',
    color: '#F57F17',
    marginBottom: 5,
  },
  devModeCredentials: {
    fontSize: 12,
    color: '#F57F17',
    textAlign: 'center',
  },
});

export default LoginScreen; 