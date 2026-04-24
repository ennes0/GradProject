import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';

import { AppNavigator } from './components/navigation';
import { Colors } from './constants/Colors';
import SplashScreen from './components/SplashScreen';
import { AuthProvider } from './components/context/AuthContext';
import { MapPreloadProvider } from './components/context/MapPreloadContext';
import { AppAlertProvider } from './components/context/AppAlertContext';
import { LanguageProvider } from './components/context/LanguageContext';

export default function App() {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <AuthProvider>
          <LanguageProvider>
            <AppAlertProvider>
              <MapPreloadProvider>
                {isLoading ? (
                  <SplashScreen onFinish={() => setIsLoading(false)} />
                ) : (
                  <>
                    <StatusBar style="dark" backgroundColor={Colors.background} />
                    <AppNavigator />
                  </>
                )}
              </MapPreloadProvider>
            </AppAlertProvider>
          </LanguageProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
