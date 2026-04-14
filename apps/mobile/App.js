import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider as PaperProvider } from 'react-native-paper';
import { LogBox } from 'react-native';
import { AuthProvider } from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import { I18nProvider } from './src/i18n';

// Ignore specific LogBox warnings
LogBox.ignoreLogs([
  'Possible Unhandled Promise Rejection',
  'VirtualizedLists should never be nested',
  'Warning: Failed prop type: Invalid prop `textStyle` of type `array` supplied to `Cell`',
]);

export default function App() {
  return (
    <SafeAreaProvider>
      <PaperProvider>
        <I18nProvider>
          <AuthProvider>
            <AppNavigator />
          </AuthProvider>
        </I18nProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
