import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Image,
  Animated,
  Dimensions,
  ActivityIndicator,
  Text,
} from 'react-native';
import { useMapPreload } from './context/MapPreloadContext';
import { Colors } from '../constants/Colors';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function SplashScreen({ onFinish }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const { isMapReady } = useMapPreload();

  useEffect(() => {
    // Fade in ve scale animasyonu
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 20,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  useEffect(() => {
    // Harita hazır olduğunda ve minimum süre geçtiğinde bitir
    if (isMapReady) {
      const timer = setTimeout(() => {
        if (onFinish) onFinish();
      }, 1500); // Minimum splash süresini 1.5 saniyeye düşür

      return () => clearTimeout(timer);
    }
  }, [isMapReady]);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.logoContainer,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <Image
          source={require('../assets/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </Animated.View>
      
      {/* Yükleme göstergesi */}
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#4A90E2" />
        <Text style={styles.loadingText}>
          {isMapReady ? 'Başlatılıyor...' : 'Harita hazırlanıyor...'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a2332',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: SCREEN_WIDTH * 0.85,
    height: SCREEN_HEIGHT * 0.45,
  },
  loadingContainer: {
    position: 'absolute',
    bottom: 80,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#8A9BA8',
    fontSize: 14,
    fontWeight: '500',
  },
});
