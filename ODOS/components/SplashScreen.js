import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet, Dimensions } from 'react-native';
import { useMapPreload } from './context/MapPreloadContext';
import { useLanguage } from './context/LanguageContext';

export default function SplashScreen({ onFinish }) {
  const { tx } = useLanguage();
  const pinOpacity    = useRef(new Animated.Value(0)).current;
  const pinY          = useRef(new Animated.Value(-80)).current;
  const pinScale      = useRef(new Animated.Value(0.7)).current;
  const shadowScale   = useRef(new Animated.Value(0)).current;
  const titleOpacity  = useRef(new Animated.Value(0)).current;
  const titleY        = useRef(new Animated.Value(8)).current;
  const lineWidth     = useRef(new Animated.Value(0)).current;
  const subOpacity    = useRef(new Animated.Value(0)).current;
  const subY          = useRef(new Animated.Value(8)).current;
  const screenOpacity = useRef(new Animated.Value(1)).current;

  const { isMapReady } = useMapPreload();
  const animationFinished = useRef(false);

  const smooth = { tension: 60, friction: 12, useNativeDriver: true };

  const checkFinish = () => {
    if (animationFinished.current) {
      Animated.timing(screenOpacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start(() => {
        if (onFinish) onFinish();
      });
    }
  };

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(pinY,     { toValue: 0, tension: 100, friction: 10, useNativeDriver: true }),
        Animated.spring(pinScale, { toValue: 1, tension: 100, friction: 10, useNativeDriver: true }),
        Animated.timing(pinOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]),
      Animated.spring(shadowScale, { toValue: 1, tension: 100, friction: 10, useNativeDriver: true }),
      Animated.delay(50),
      Animated.parallel([
        Animated.spring(titleY,      { toValue: 0, tension: 100, friction: 10, useNativeDriver: true }),
        Animated.timing(titleOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]),
      Animated.delay(50),
      Animated.parallel([
        Animated.timing(lineWidth,  { toValue: 48, duration: 250, useNativeDriver: false }),
        Animated.spring(subY,       { toValue: 0, tension: 100, friction: 10, useNativeDriver: true }),
        Animated.timing(subOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]),
      Animated.delay(300)
    ]).start(() => {
      animationFinished.current = true;
      checkFinish();
    });

    // Her ihtimale karşı 3 saniye sonra zorla ekranı geç (Eğer animasyon takılırsa)
    const fallbackTimer = setTimeout(() => {
        if (!animationFinished.current) {
            animationFinished.current = true;
            checkFinish();
        }
    }, 3000);

    return () => clearTimeout(fallbackTimer);
  }, []);

  useEffect(() => {
    // Harita erken hazır olursa animasyon bitince zaten geçecek
    if (isMapReady && animationFinished.current) {
      checkFinish();
    }
  }, [isMapReady]);

  return (
    <Animated.View style={[styles.container, { opacity: screenOpacity }]}>
      <View style={styles.content}>
        {/* Pin Container */}
        <View style={styles.pinWrapper}>
          <Animated.View style={{
            opacity: pinOpacity,
            transform: [{ translateY: pinY }, { scale: pinScale }],
            alignItems: 'center'
          }}>
            <View style={styles.pinBody}>
              <View style={styles.pinHole} />
            </View>
            <View style={styles.pinPoint} />
          </Animated.View>
          
          <Animated.View style={[styles.shadow, {
            transform: [{ scale: shadowScale }]
          }]} />
        </View>

        {/* Text Container */}
        <View style={styles.textContainer}>
          <Animated.View style={{
            opacity: titleOpacity,
            transform: [{ translateY: titleY }]
          }}>
            <Text style={styles.title}>ODOS</Text>
          </Animated.View>

          <Animated.View style={[styles.line, { width: lineWidth }]} />

          <Animated.View style={{
            opacity: subOpacity,
            transform: [{ translateY: subY }]
          }}>
            <Text style={styles.subtitle}>{tx('Eğime Duyarlı Rota', 'Slope-Aware Routing')}</Text>
          </Animated.View>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  content: {
    alignItems: 'center',
  },
  pinWrapper: {
    alignItems: 'center',
    height: 100,
    marginBottom: 20,
    justifyContent: 'flex-end',
  },
  pinBody: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  pinHole: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#0F172A',
  },
  pinPoint: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 12,
    borderRightWidth: 12,
    borderTopWidth: 20,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#10B981',
    marginTop: -4,
    zIndex: 1,
  },
  shadow: {
    width: 24,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(0,0,0,0.3)',
    marginTop: 4,
  },
  textContainer: {
    alignItems: 'center',
  },
  title: {
    fontSize: 42,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  line: {
    height: 3,
    backgroundColor: '#10B981',
    borderRadius: 2,
    marginVertical: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#94A3B8',
    fontWeight: '500',
    letterSpacing: 1,
  },
});
