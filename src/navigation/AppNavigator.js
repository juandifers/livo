import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../context/AuthContext';
import { MaterialIcons } from '@expo/vector-icons';
import { useI18n } from '../i18n';

// Import screen components (we'll create these next)
import LoginScreen from '../screens/auth/LoginScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import ResetPasswordScreen from '../screens/auth/ResetPasswordScreen';
import AccountSetupScreen from '../screens/auth/AccountSetupScreen';
import HomeScreen from '../screens/app/HomeScreen';
import AssetsScreen from '../screens/app/AssetsScreen';
import AssetDetailScreen from '../screens/app/AssetDetailScreen';
import BookingsScreen from '../screens/app/BookingsScreen';
import SchedulingRulesScreen from '../screens/app/SchedulingRulesScreen';
import BookingDetailScreen from '../screens/app/BookingDetailScreen';
import CancellationPoliciesScreen from '../screens/app/CancellationPoliciesScreen';
import CreateBookingScreen from '../screens/app/CreateBookingScreen';
import ProfileScreen from '../screens/app/ProfileScreen';
import AlertsScreen from '../screens/app/AlertsScreen';
import UserProfileScreen from '../screens/app/UserProfileScreen';
import ChangePasswordScreen from '../screens/app/ChangePasswordScreen';
import ApiTestScreen from '../screens/app/ApiTestScreen';
import LoadingScreen from '../screens/LoadingScreen';

// Create navigation stacks
const AuthStack = createNativeStackNavigator();
const MainStack = createNativeStackNavigator();
const AppTab = createBottomTabNavigator();

// Auth stack navigator
const AuthNavigator = () => (
  <AuthStack.Navigator screenOptions={{ headerShown: false }}>
    <AuthStack.Screen name="Login" component={LoginScreen} />
    <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    <AuthStack.Screen name="ResetPassword" component={ResetPasswordScreen} />
    <AuthStack.Screen name="AccountSetup" component={AccountSetupScreen} />
  </AuthStack.Navigator>
);

// Assets stack for nested navigation
const AssetsStack = createNativeStackNavigator();
const AssetsStackNavigator = () => {
  const { t } = useI18n();

  return (
    <AssetsStack.Navigator>
      <AssetsStack.Screen 
        name="AssetsList" 
        component={AssetsScreen}
        options={{ headerShown: false }}
      />
      <AssetsStack.Screen 
        name="AssetDetail" 
        component={AssetDetailScreen}
        options={({ route }) => ({ 
          title: route.params?.asset?.name || t('Asset Details'),
          headerStyle: {
            backgroundColor: '#1E4640',
          },
          headerTintColor: '#fff',
        })}
      />
      <AssetsStack.Screen 
        name="CreateBooking" 
        component={CreateBookingScreen}
        options={{ 
          headerShown: false // Hide header for the calendar booking screen
        }}
      />
    </AssetsStack.Navigator>
  );
};

// Bookings stack for nested navigation
const BookingsStack = createNativeStackNavigator();
const BookingsStackNavigator = () => {
  const { t } = useI18n();

  return (
    <BookingsStack.Navigator>
      <BookingsStack.Screen 
        name="BookingsList" 
        component={BookingsScreen}
        options={{ headerShown: false }}
      />
      <BookingsStack.Screen 
        name="BookingDetail" 
        component={BookingDetailScreen}
        options={{ 
          title: t('Booking Details'),
          headerStyle: {
            backgroundColor: '#1E4640',
          },
          headerTintColor: '#fff',
        }}
      />
      <BookingsStack.Screen 
        name="SchedulingRules" 
        component={SchedulingRulesScreen}
        options={{ 
          title: t('Scheduling Rules'),
          headerStyle: { backgroundColor: '#1E4640' },
          headerTintColor: '#fff'
        }}
      />
    </BookingsStack.Navigator>
  );
};

// Bottom tab navigator for main app screens
const TabNavigator = () => {
  const { t } = useI18n();

  return (
    <AppTab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#1E4640',
        tabBarInactiveTintColor: '#888',
        tabBarStyle: {
          height: 75,
          borderTopWidth: 1,
          borderTopColor: '#eee',
          backgroundColor: '#fff',
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          elevation: 0,
          zIndex: 8,
          paddingTop: 0,
        },
        tabBarLabelStyle: {
          fontSize: 14,
          marginTop: 0,
          paddingBottom: 10,
        },
        tabBarIconStyle: {
          marginBottom: -2,
        }
      }}
    >
      <AppTab.Screen 
        name="HomeTab" 
        component={HomeScreen} 
        options={{
          tabBarLabel: t('Home'),
          tabBarIcon: ({ color }) => (
            <MaterialIcons name="home" size={28} color={color} />
          ),
        }}
      />
      <AppTab.Screen 
        name="BookingsTab" 
        component={BookingsStackNavigator}
        options={{
          tabBarLabel: t('Stays'),
          tabBarIcon: ({ color }) => (
            <MaterialIcons name="description" size={28} color={color} />
          ),
        }}
      />
      <AppTab.Screen 
        name="BookTab" 
        component={CreateBookingScreen} 
        options={{
          tabBarLabel: t('Book'),
          tabBarIcon: ({ color }) => (
            <MaterialIcons name="calendar-today" size={28} color={color} />
          ),
        }}
      />
      <AppTab.Screen 
        name="AlertsTab" 
        component={AlertsScreen}
        options={{
          tabBarLabel: t('Alerts'),
          tabBarIcon: ({ color }) => (
            <MaterialIcons name="notifications" size={28} color={color} />
          ),
        }}
      />
      <AppTab.Screen 
        name="ProfileTab" 
        component={ProfileScreen} 
        options={{
          tabBarLabel: t('Setting'),
          tabBarIcon: ({ color }) => (
            <MaterialIcons name="settings" size={28} color={color} />
          ),
        }}
      />
    </AppTab.Navigator>
  );
};

// Main app navigator
const AppNavigator = () => {
  const { isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  const MainNavigator = () => (
    <MainStack.Navigator screenOptions={{ headerShown: false }}>
      <MainStack.Screen name="Tabs" component={TabNavigator} />
      <MainStack.Screen name="Assets" component={AssetsStackNavigator} />
      <MainStack.Screen name="BookingDetail" component={BookingDetailScreen} />
      <MainStack.Screen name="CancellationPolicies" component={CancellationPoliciesScreen} />
      <MainStack.Screen name="UserProfile" component={UserProfileScreen} />
      <MainStack.Screen name="ChangePassword" component={ChangePasswordScreen} />
      <MainStack.Screen name="ApiTest" component={ApiTestScreen} />
    </MainStack.Navigator>
  );

  return (
    <NavigationContainer>
      {isAuthenticated ? <MainNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
};

export default AppNavigator; 
