import React, { useMemo, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { useLanguage } from '../../components/context/LanguageContext';
import { useAuth } from '../../components/context/AuthContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function OnboardingScreen() {
  const route = useRoute();
  const { onComplete } = route.params || {};
  const insets = useSafeAreaInsets();
  const { tx } = useLanguage();
  const { markOnboardingComplete } = useAuth();
  const flatListRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  const slides: Slide[] = useMemo(
    () => [
      {
        id: '1',
        bgColor: '#EFF6FF',
        heroAccent: '#DBEAFE',
        illustrationUri: require('../../assets/onboarding/898659875860Route_Planner.gif'),
        title: tx('Rotanı Planla ve Takip Et', 'Plan & Track Your Routes'),
        titleColor: '#0F172A',
        subtitle: tx(
          'Her yürüyüşü kaydedip, mesafe, kalori ve eğim verilerini otomatik olarak takip et.',
          'Record every walk, automatically track distance, calories, and elevation data.'
        ),
        subtitleColor: '#475569',
        cta: tx('Devam Et', 'Next'),
        accentIcon: 'navigate',
      },
      {
        id: '2',
        bgColor: '#FFF7ED',
        heroAccent: '#FECDBA',
        illustrationUri: require('../../assets/onboarding/679472163730Location.gif'),
        title: tx('İstanbul\'u Keşfet', 'Discover Istanbul'),
        titleColor: '#7C2D12',
        subtitle: tx(
          'Belirlenen lokasyonlarda yürüyüşlerini başlat, rotaları öğren ve sağlık hedefine ulaş.',
          'Start walks at specific locations, discover routes, and reach your health goals.'
        ),
        subtitleColor: '#92400E',
        cta: tx('Devam Et', 'Next'),
        accentIcon: 'location',
      },
      {
        id: '3',
        bgColor: '#F0FDF4',
        heroAccent: '#BBFBBB',
        illustrationUri: require('../../assets/onboarding/501724102956Liking.gif'),
        title: tx('Komuniteyi Keşfet', 'Explore Community'),
        titleColor: '#14532D',
        subtitle: tx(
          'Rotaları paylaş, insanlardan ilham al, yürüyüş yaklaşmanı geliştir ve sosyal destek bul.',
          'Share routes, get inspired, improve your walking, and find social support.'
        ),
        subtitleColor: '#15803D',
        cta: tx('Başla!', 'Get Started!'),
        accentIcon: 'people',
      },
    ],
    [tx],
  );

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setActiveIndex(viewableItems[0].index);
      }
    },
    [],
  );

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const handleNext = useCallback(async () => {
    if (activeIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: activeIndex + 1, animated: true });
    } else {
      setIsProcessing(true);
      try {
        console.log('[OnboardingScreen] Marking onboarding complete...');
        await markOnboardingComplete();
        console.log('[OnboardingScreen] Onboarding marked complete, calling onComplete');
        console.log('[OnboardingScreen] onComplete exists?', !!onComplete, 'is function?', typeof onComplete === 'function');
        setTimeout(() => {
          if (onComplete && typeof onComplete === 'function') {
            console.log('[OnboardingScreen] Executing onComplete callback');
            onComplete();
          } else {
            console.error('[OnboardingScreen] onComplete not available!');
            setIsProcessing(false);
          }
        }, 300);
      } catch (e) {
        console.error('[OnboardingScreen] Onboarding completion error:', e);
        setIsProcessing(false);
      }
    }
  }, [activeIndex, slides.length, markOnboardingComplete, onComplete]);

  const handleSkip = useCallback(async () => {
    setIsProcessing(true);
    try {
      console.log('[OnboardingScreen] Skipping - marking onboarding complete...');
      await markOnboardingComplete();
      console.log('[OnboardingScreen] Onboarding marked complete via skip, calling onComplete');
      console.log('[OnboardingScreen] onComplete exists?', !!onComplete, 'is function?', typeof onComplete === 'function');
      setTimeout(() => {
        if (onComplete && typeof onComplete === 'function') {
          console.log('[OnboardingScreen] Executing onComplete callback');
          onComplete();
        } else {
          console.error('[OnboardingScreen] onComplete not available!');
          setIsProcessing(false);
        }
      }, 300);
    } catch (e) {
      console.error('[OnboardingScreen] Onboarding skip error:', e);
      setIsProcessing(false);
    }
  }, [markOnboardingComplete, onComplete]);

  const renderSlide = ({ item }) => {
    const isLast = activeIndex === slides.length - 1;

    return (
      <View
        style={[
          styles.slide,
          {
            width: SCREEN_WIDTH,
            backgroundColor: item.bgColor,
            minHeight: SCREEN_HEIGHT,
          },
        ]}
      >
        {/* Hero Zone */}
        <View style={[styles.heroZone, { paddingTop: insets.top + 8 }]}> 
          <View style={[styles.accentCircle, { backgroundColor: item.heroAccent }]} />
          <View style={[styles.heroWrap, { backgroundColor: item.bgColor }]}> 
            <Image
              source={item.illustrationUri}
              style={[styles.illustration, { backgroundColor: item.bgColor }]}
              resizeMode="contain"
            />
          </View>
          <View style={[styles.accentBadge, { backgroundColor: item.heroAccent }]}>
            <Ionicons name={item.accentIcon} size={20} color={item.titleColor} />
          </View>
        </View>

        {/* Text Zone */}
        <View style={styles.textZone}>
          <Text style={[styles.slideTitle, { color: item.titleColor }]}>
            {item.title}
          </Text>
          <Text style={[styles.slideSubtitle, { color: item.subtitleColor }]}>
            {item.subtitle}
          </Text>
        </View>

        {/* Bottom Controls */}
        <View style={[styles.bottomControls, { paddingBottom: insets.bottom + 14 }]}> 
          <View style={styles.indicators}>
            {slides.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.indicator,
                  {
                    width: i === activeIndex ? 22 : 7,
                    backgroundColor: item.titleColor,
                    opacity: i === activeIndex ? 1 : 0.28,
                  },
                ]}
              />
            ))}
          </View>

          <TouchableOpacity
            style={[
              styles.primaryButton,
              {
                backgroundColor:
                  item.id === '1'
                    ? '#2563EB'
                    : item.id === '2'
                      ? '#F97316'
                      : '#16A34A',
              },
            ]}
            onPress={handleNext}
            disabled={isProcessing}
            activeOpacity={0.85}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.primaryButtonText}>{item.cta}</Text>
                <Ionicons
                  name={isLast ? 'checkmark' : 'arrow-forward'}
                  size={16}
                  color="#FFFFFF"
                />
              </>
            )}
          </TouchableOpacity>

          {!isLast ? (
            <TouchableOpacity
              onPress={handleSkip}
              disabled={isProcessing}
              activeOpacity={0.7}
            >
              <Text style={[styles.skipText, { color: item.subtitleColor }]}>
                {tx('Atla', 'Skip')}
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.skipPlaceholder} />
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: slides[activeIndex]?.bgColor || '#FFFFFF' },
      ]}
      edges={[]}
    >
      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderSlide}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        bounces={false}
        scrollEventThrottle={16}
        style={styles.list}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    flex: 1,
  },
  slide: {
    flex: 1,
    justifyContent: 'space-between',
    paddingBottom: 8,
  },

  // Hero Zone
  heroZone: {
    flex: 0.54,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  accentCircle: {
    position: 'absolute',
    width: SCREEN_WIDTH * 0.9,
    height: SCREEN_WIDTH * 0.9,
    borderRadius: 999,
    top: SCREEN_WIDTH * 0.02,
    opacity: 0.72,
  },
  heroWrap: {
    width: SCREEN_WIDTH * 0.96,
    height: SCREEN_HEIGHT * 0.44,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    overflow: 'hidden',
  },
  illustration: {
    width: '112%',
    height: '112%',
  },
  accentBadge: {
    position: 'absolute',
    bottom: 8,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },

  // Text Zone
  textZone: {
    flex: 0.2,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  slideTitle: {
    fontSize: 32,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 40,
    letterSpacing: -0.5,
  },
  slideSubtitle: {
    fontSize: 15,
    lineHeight: 24,
    textAlign: 'center',
    maxWidth: 330,
    fontWeight: '500',
  },

  // Bottom Controls
  bottomControls: {
    flex: 0.26,
    paddingHorizontal: 22,
    justifyContent: 'flex-end',
  },
  indicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  indicator: {
    height: 6,
    borderRadius: 3,
  },
  primaryButton: {
    minHeight: 52,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  skipText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    paddingVertical: 8,
  },
  skipPlaceholder: {
    height: 24,
  },
});
