import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Easing,
  Modal,
  Image,
  Platform,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';

import { Colors } from '../../constants/Colors';
import { useAuth } from '../../components/context/AuthContext';
import { useLanguage } from '../../components/context/LanguageContext';
import { buildDailySnapshotsForSync } from '../../health/buildDailySnapshotsForSync';
import { useDailyActivityFromDevice } from '../../hooks/useDailyActivityFromDevice';
import {
  resolveUserMediaUrl,
  getGooglePlacesAutocompleteUrl,
  getGooglePlaceDetailsUrl,
} from '../../config/api';

const ROUTE_MODES = ['En Kolay', 'Dengeli', 'Hizli'];
const ROUTE_MODE_THEME = {
  'En Kolay': { activeBg: '#43A047', activeBorder: '#43A047' },
  Dengeli: { activeBg: Colors.primaryDark, activeBorder: Colors.primaryDark },
  Hizli: { activeBg: Colors.routeShortest, activeBorder: Colors.routeShortestDeep || Colors.routeShortest },
};
const STORY_VIEW_DURATION = 4200;
const TEMP_STORY_IMAGE_URL = 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=1200&q=80';
const DEFAULT_PROFILE_IMAGE = 'https://www.gravatar.com/avatar/?d=mp&s=200';

const HOME_SEARCH_FALLBACKS = [
  { id: 'f1', name: 'Taksim Meydani', address: 'Beyoglu, Istanbul', latitude: 41.037, longitude: 28.985, icon: 'location' },
  { id: 'f2', name: 'Kadikoy Iskele', address: 'Kadikoy, Istanbul', latitude: 40.991, longitude: 29.0235, icon: 'boat' },
  { id: 'f3', name: 'Besiktas Meydani', address: 'Besiktas, Istanbul', latitude: 41.0422, longitude: 29.0067, icon: 'location' },
  { id: 'f4', name: 'Levent Metro', address: 'Besiktas, Istanbul', latitude: 41.0794, longitude: 29.0117, icon: 'subway' },
  { id: 'f5', name: 'Ortakoy Meydani', address: 'Besiktas, Istanbul', latitude: 41.0477, longitude: 29.0266, icon: 'cafe' },
];

function createPlacesSessionToken() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeGooglePrediction(prediction) {
  const mainText = prediction?.structured_formatting?.main_text || prediction?.description || '';
  const secondaryText = prediction?.structured_formatting?.secondary_text || '';
  return {
    id: prediction?.place_id,
    placeId: prediction?.place_id,
    name: mainText,
    address: secondaryText || prediction?.description || '',
    icon: 'location',
    source: 'google',
  };
}

const POPULAR_ROUTE_STORIES = [
  {
    id: 'story1',
    userName: 'Mert',
    userInitial: 'M',
    districtName: 'Besiktas',
    timeAgo: '12 dk',
    isNew: true,
    routeName: 'Besiktas Sahil Kacamagi',
    from: 'Besiktas',
    to: 'Ortakoy',
    distance: '3.1 km',
    duration: '39 dk',
    avgSlope: '%3.2',
    elevation: '42 m',
    likes: '1.2k',
    difficulty: 'Kolay',
    summary: 'Sahil boyunca golgelik ve duz hat. Gun batiminda manzara guclu.',
  },
  {
    id: 'story2',
    userName: 'Zeynep',
    userInitial: 'Z',
    districtName: 'Nisantasi',
    timeAgo: '26 dk',
    isNew: true,
    routeName: 'Nisantasi - Macka Hatti',
    from: 'Nisantasi',
    to: 'Macka Parki',
    distance: '2.8 km',
    duration: '34 dk',
    avgSlope: '%4.8',
    elevation: '57 m',
    likes: '940',
    difficulty: 'Orta',
    summary: 'Kısa ama keyifli bir rota. Ara sokaklarda eğim dengeli ilerliyor.',
  },
  {
    id: 'story3',
    userName: 'Kerem',
    userInitial: 'K',
    districtName: 'Kadikoy',
    timeAgo: '1 sa',
    isNew: false,
    routeName: 'Kadikoy Park Turu',
    from: 'Kadikoy Iskele',
    to: 'Yogurtcu Parki',
    distance: '4.4 km',
    duration: '52 dk',
    avgSlope: '%2.1',
    elevation: '35 m',
    likes: '1.8k',
    difficulty: 'Kolay',
    summary: 'Yeni başlayanlar için ideal, geniş kaldırımlar ve düşük eğim.',
  },
  {
    id: 'story4',
    userName: 'Elif',
    userInitial: 'E',
    districtName: 'Galata',
    timeAgo: '2 sa',
    isNew: false,
    routeName: 'Galata Merdiven Challenge',
    from: 'Galata Kulesi',
    to: 'Karakoy',
    distance: '2.1 km',
    duration: '29 dk',
    avgSlope: '%7.9',
    elevation: '86 m',
    likes: '2.1k',
    difficulty: 'Zor',
    summary: 'Yokuşlu ama çok popüler bir rota. Kısa sürede güçlü kondisyon etkisi.',
  },
  {
    id: 'story5',
    userName: 'Can',
    userInitial: 'C',
    districtName: 'Bebek',
    timeAgo: '3 sa',
    isNew: false,
    routeName: 'Bebek - Rumeli Hisari',
    from: 'Bebek',
    to: 'Rumeli Hisari',
    distance: '5.2 km',
    duration: '68 dk',
    avgSlope: '%3.9',
    elevation: '74 m',
    likes: '3.4k',
    difficulty: 'Orta',
    summary: 'Uzun ve ritmik bir sahil yürüyüşü. Manzara puanı yüksek.',
  },
];

function getUserInitial(name) {
  if (!name || typeof name !== 'string') return 'U';
  const trimmed = name.trim();
  if (!trimmed) return 'U';
  return trimmed.charAt(0).toUpperCase();
}

function formatTimeAgo(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return 'simdi';
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.max(1, Math.floor(diffMs / 60000));
  if (diffMin < 60) return `${diffMin} dk`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} sa`;
  const diffDay = Math.floor(diffHour / 24);
  return `${diffDay} gun`;
}

function toStoryItem(item) {
  const distanceM = Number(item?.traveledDistanceM || 0);
  const elapsedSeconds = Number(item?.elapsedSeconds || 0);
  const distanceKm = distanceM > 0 ? `${(distanceM / 1000).toFixed(1)} km` : '0.0 km';
  const minutes = elapsedSeconds > 0 ? Math.max(1, Math.round(elapsedSeconds / 60)) : 0;
  const slope = Number(item?.avgSlopePct || 0);
  const elevation = Number(item?.elevationGainM || 0);
  const finishedAt = item?.finishedAt ? new Date(item.finishedAt).getTime() : 0;

  return {
    id: String(item?.routeId || Math.random()),
    routeId: item?.routeId,
    userName: item?.authorFullName || item?.authorUsername || 'Kullanici',
    userInitial: getUserInitial(item?.authorFullName || item?.authorUsername),
    districtName: item?.authorCity || item?.startLabel || 'Topluluk',
    timeAgo: formatTimeAgo(item?.finishedAt),
    isNew: finishedAt > 0 ? (Date.now() - finishedAt) < 24 * 60 * 60 * 1000 : false,
    routeName: item?.routeName || 'Paylasilan Rota',
    from: item?.startLabel || 'Baslangic',
    to: item?.endLabel || 'Varis',
    distance: distanceKm,
    duration: `${minutes} dk`,
    avgSlope: `%${slope.toFixed(1)}`,
    elevation: `${Math.round(elevation)} m`,
    calories: Number(item?.caloriesKcal || 0),
    difficulty: item?.difficulty || 'Dengeli',
    summary: `${distanceKm} mesafe, ${minutes} dk sureli paylasilan rota.`,
    imageUrl: item?.imageUrl,
    authorProfilePhotoUrl: item?.authorProfilePhotoUrl,
  };
}

export default function HomeScreen({ navigation }) {
  const { user, isAuthenticated, isAuthLoading, syncDailyHealth, fetchPopularRouteStories } = useAuth();
  const { language, tx } = useLanguage();
  const dailyActivity = useDailyActivityFromDevice(10000);
  const lastDailyHealthSyncRef = useRef(0);
  const dailyHealthSyncInFlightRef = useRef(false);
  const [selectedMode, setSelectedMode] = useState('Dengeli');
  const [isStoryViewerVisible, setIsStoryViewerVisible] = useState(false);
  const [activeStoryIndex, setActiveStoryIndex] = useState(0);
  const [storiesLoading, setStoriesLoading] = useState(false);
  const [popularRouteStories, setPopularRouteStories] = useState(POPULAR_ROUTE_STORIES);
  const [startAddress, setStartAddress] = useState(tx('Mevcut Konumum', 'My Current Location'));
  const [endAddress, setEndAddress] = useState('');
  const [startPoint, setStartPoint] = useState(null);
  const [endPoint, setEndPoint] = useState(null);
  const [activePlannerField, setActivePlannerField] = useState(null);
  const [plannerSearchResults, setPlannerSearchResults] = useState([]);
  const [isPlannerSearching, setIsPlannerSearching] = useState(false);

  const heroAnim = useRef(new Animated.Value(0)).current;
  const cardAnim = useRef(new Animated.Value(0)).current;
  const storyProgressAnimsRef = useRef(POPULAR_ROUTE_STORIES.map(() => new Animated.Value(0)));
  const plannerSearchDebounceRef = useRef(null);
  const plannerPlacesRequestIdRef = useRef(0);
  const plannerPlacesSessionTokenRef = useRef(null);
  const plannerPlacesCacheRef = useRef(new Map());
  const plannerPlaceDetailsCacheRef = useRef(new Map());

  const ensureStoryProgressAnim = useCallback((index) => {
    if (!Number.isInteger(index) || index < 0) {
      return new Animated.Value(0);
    }
    while (storyProgressAnimsRef.current.length <= index) {
      storyProgressAnimsRef.current.push(new Animated.Value(0));
    }
    return storyProgressAnimsRef.current[index];
  }, []);

  useEffect(() => {
    const targetCount = Math.max(1, popularRouteStories.length);
    if (storyProgressAnimsRef.current.length === targetCount) {
      return;
    }
    storyProgressAnimsRef.current = Array.from({ length: targetCount }, () => new Animated.Value(0));
  }, [popularRouteStories.length]);

  const loadPopularStories = useCallback(async () => {
    setStoriesLoading(true);
    try {
      const rows = await fetchPopularRouteStories(12);
      if (Array.isArray(rows) && rows.length > 0) {
        setPopularRouteStories(rows.map(toStoryItem));
      }
    } catch (e) {
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.warn('[popular-route-stories]', e?.message);
      }
    } finally {
      setStoriesLoading(false);
    }
  }, [fetchPopularRouteStories]);

  useEffect(() => {
    void loadPopularStories();
  }, [loadPopularStories]);

  useEffect(() => {
    const unsub = navigation?.addListener?.('focus', () => {
      void loadPopularStories();
    });
    return unsub;
  }, [navigation, loadPopularStories]);

  useEffect(() => {
    Animated.stagger(100, [
      Animated.timing(heroAnim, {
        toValue: 1,
        duration: 420,
        useNativeDriver: true,
      }),
      Animated.timing(cardAnim, {
        toValue: 1,
        duration: 420,
        useNativeDriver: true,
      }),
    ]).start();
  }, [heroAnim, cardAnim]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        if (!mounted || !current?.coords) return;
        const point = {
          latitude: current.coords.latitude,
          longitude: current.coords.longitude,
        };
        setStartPoint(point);
      } catch (e) {
        if (__DEV__) {
          // eslint-disable-next-line no-console
          console.warn('[home-search-location]', e?.message);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const clearPlannerSearchDebounce = useCallback(() => {
    if (plannerSearchDebounceRef.current) {
      clearTimeout(plannerSearchDebounceRef.current);
      plannerSearchDebounceRef.current = null;
    }
  }, []);

  const resolvePlannerPlaceCoordinate = useCallback(async (place) => {
    if (!place?.placeId) {
      return Number.isFinite(place?.latitude) && Number.isFinite(place?.longitude)
        ? { latitude: place.latitude, longitude: place.longitude }
        : null;
    }

    const cached = plannerPlaceDetailsCacheRef.current.get(place.placeId);
    if (cached) return cached;

    const sessionToken = plannerPlacesSessionTokenRef.current || createPlacesSessionToken();
    plannerPlacesSessionTokenRef.current = sessionToken;
    const requestId = ++plannerPlacesRequestIdRef.current;

    const response = await fetch(getGooglePlaceDetailsUrl({ placeId: place.placeId, sessionToken }));
    const data = await response.json();
    if (requestId !== plannerPlacesRequestIdRef.current) return null;
    if (!response.ok || data?.status !== 'OK') {
      throw new Error(data?.error_message || data?.status || 'Place details failed');
    }

    const loc = data?.result?.geometry?.location;
    if (!loc || !Number.isFinite(loc.lat) || !Number.isFinite(loc.lng)) {
      return null;
    }

    const coord = { latitude: loc.lat, longitude: loc.lng };
    plannerPlaceDetailsCacheRef.current.set(place.placeId, coord);
    return coord;
  }, []);

  useEffect(() => {
    clearPlannerSearchDebounce();

    if (!activePlannerField) {
      setIsPlannerSearching(false);
      return undefined;
    }

    const query = activePlannerField === 'start' ? startAddress : endAddress;
    const trimmed = query.trim();

    if (!trimmed) {
      plannerPlacesRequestIdRef.current += 1;
      setPlannerSearchResults([]);
      setIsPlannerSearching(false);
      return undefined;
    }

    if (trimmed.length < 3) {
      setPlannerSearchResults([]);
      setIsPlannerSearching(false);
      return undefined;
    }

    const cacheKey = `${activePlannerField}:${trimmed.toLowerCase()}`;
    const cached = plannerPlacesCacheRef.current.get(cacheKey);
    if (cached) {
      setPlannerSearchResults(cached);
      setIsPlannerSearching(false);
      return undefined;
    }

    setIsPlannerSearching(true);
    const requestId = ++plannerPlacesRequestIdRef.current;

    plannerSearchDebounceRef.current = setTimeout(async () => {
      try {
        const sessionToken = plannerPlacesSessionTokenRef.current || createPlacesSessionToken();
        plannerPlacesSessionTokenRef.current = sessionToken;

        const url = getGooglePlacesAutocompleteUrl({
          input: trimmed,
          sessionToken,
          latitude: startPoint?.latitude,
          longitude: startPoint?.longitude,
          radius: 40000,
        });

        const response = await fetch(url);
        const data = await response.json();
        if (requestId !== plannerPlacesRequestIdRef.current) return;
        if (!response.ok || (data?.status && data.status !== 'OK' && data.status !== 'ZERO_RESULTS')) {
          throw new Error(data?.error_message || data?.status || 'Autocomplete failed');
        }

        const predictions = Array.isArray(data?.predictions) ? data.predictions.slice(0, 5) : [];
        const normalized = predictions.map(normalizeGooglePrediction).filter((item) => item.id);
        const fallback = HOME_SEARCH_FALLBACKS.filter((item) => {
          const haystack = `${item.name} ${item.address}`.toLowerCase();
          return haystack.includes(trimmed.toLowerCase());
        }).slice(0, 5);
        const results = normalized.length ? normalized : fallback;
        plannerPlacesCacheRef.current.set(cacheKey, results);
        setPlannerSearchResults(results);
      } catch (e) {
        if (requestId !== plannerPlacesRequestIdRef.current) return;
        const fallback = HOME_SEARCH_FALLBACKS.filter((item) => {
          const haystack = `${item.name} ${item.address}`.toLowerCase();
          return haystack.includes(trimmed.toLowerCase());
        }).slice(0, 5);
        setPlannerSearchResults(fallback);
      } finally {
        if (requestId === plannerPlacesRequestIdRef.current) {
          setIsPlannerSearching(false);
        }
      }
    }, 420);

    return () => clearPlannerSearchDebounce();
  }, [
    activePlannerField,
    startAddress,
    endAddress,
    startPoint?.latitude,
    startPoint?.longitude,
    clearPlannerSearchDebounce,
  ]);

  useEffect(() => {
    if (isAuthLoading || !isAuthenticated) {
      return;
    }
    if (dailyActivity.loading || dailyActivity.permissionDenied || dailyActivity.unavailable) {
      return;
    }
    const now = Date.now();
    if (now - lastDailyHealthSyncRef.current < 60_000) {
      return;
    }
    if (dailyHealthSyncInFlightRef.current) {
      return;
    }
    let cancelled = false;
    (async () => {
      dailyHealthSyncInFlightRef.current = true;
      try {
        const days = await buildDailySnapshotsForSync({
          stepsToday: dailyActivity.steps,
          mode: dailyActivity.mode,
        });
        if (cancelled || !days?.length) {
          return;
        }
        await syncDailyHealth(days);
        lastDailyHealthSyncRef.current = Date.now();
      } catch (e) {
        if (__DEV__) {
          // eslint-disable-next-line no-console
          console.warn('[daily-health-sync]', e?.message);
        }
      } finally {
        dailyHealthSyncInFlightRef.current = false;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    isAuthLoading,
    isAuthenticated,
    dailyActivity.loading,
    dailyActivity.permissionDenied,
    dailyActivity.unavailable,
    dailyActivity.steps,
    dailyActivity.mode,
    syncDailyHealth,
  ]);

  useEffect(() => {
    if (!isStoryViewerVisible) {
      return;
    }

    const storyProgressAnims = storyProgressAnimsRef.current;
    if (!popularRouteStories.length || activeStoryIndex >= popularRouteStories.length) {
      setIsStoryViewerVisible(false);
      setActiveStoryIndex(0);
      return;
    }

    storyProgressAnims.forEach((anim, index) => {
      anim.stopAnimation();
      anim.setValue(index < activeStoryIndex ? 1 : 0);
    });

    const activeAnimation = ensureStoryProgressAnim(activeStoryIndex);
    Animated.timing(activeAnimation, {
      toValue: 1,
      duration: STORY_VIEW_DURATION,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (!finished) {
        return;
      }

      if (activeStoryIndex < popularRouteStories.length - 1) {
        setActiveStoryIndex((prev) => prev + 1);
      } else {
        setIsStoryViewerVisible(false);
      }
    });

    return () => {
      activeAnimation?.stopAnimation?.();
    };
  }, [isStoryViewerVisible, activeStoryIndex, popularRouteStories.length, ensureStoryProgressAnim]);

  const heroTranslate = heroAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [18, 0],
  });

  const cardTranslate = cardAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [22, 0],
  });

  const openStoryViewer = (index) => {
    if (!popularRouteStories.length) {
      return;
    }
    const storyProgressAnims = storyProgressAnimsRef.current;
    storyProgressAnims.forEach((anim, storyIndex) => {
      anim.stopAnimation();
      anim.setValue(storyIndex < index ? 1 : 0);
    });
    setActiveStoryIndex(index);
    setIsStoryViewerVisible(true);
  };

  const closeStoryViewer = () => {
    const storyProgressAnims = storyProgressAnimsRef.current;
    storyProgressAnims[activeStoryIndex]?.stopAnimation();
    storyProgressAnims.forEach((anim) => {
      anim.stopAnimation();
      anim.setValue(0);
    });
    setIsStoryViewerVisible(false);
    setActiveStoryIndex(0);
  };

  const goToNextStory = () => {
    const storyProgressAnims = storyProgressAnimsRef.current;
    storyProgressAnims[activeStoryIndex]?.stopAnimation();
    if (storyProgressAnims[activeStoryIndex]) {
      storyProgressAnims[activeStoryIndex].setValue(1);
    }
    if (activeStoryIndex < popularRouteStories.length - 1) {
      setActiveStoryIndex((prev) => prev + 1);
    } else {
      closeStoryViewer();
    }
  };

  const goToPreviousStory = () => {
    const storyProgressAnims = storyProgressAnimsRef.current;
    storyProgressAnims[activeStoryIndex]?.stopAnimation();
    if (activeStoryIndex === 0) {
      storyProgressAnims[0].setValue(0);
      return;
    }

    const previousIndex = activeStoryIndex - 1;
    storyProgressAnims.forEach((anim, index) => {
      anim.stopAnimation();
      anim.setValue(index < previousIndex ? 1 : 0);
    });
    setActiveStoryIndex(previousIndex);
  };

  const resetPlannerSearchState = useCallback(() => {
    clearPlannerSearchDebounce();
    plannerPlacesSessionTokenRef.current = null;
    plannerPlacesRequestIdRef.current += 1;
    setActivePlannerField(null);
    setPlannerSearchResults([]);
    setIsPlannerSearching(false);
  }, [clearPlannerSearchDebounce]);

  const handlePlannerSelectMyLocation = useCallback(async () => {
    let point = startPoint;
    try {
      if (!point) {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        if (!current?.coords) return;
        point = { latitude: current.coords.latitude, longitude: current.coords.longitude };
        setStartPoint(point);
      }
    } catch {
      return;
    }

    if (!point) return;

    if (activePlannerField === 'end') {
      setEndAddress(tx('Mevcut Konumum', 'My Current Location'));
      setEndPoint(point);
    } else {
      setStartAddress(tx('Mevcut Konumum', 'My Current Location'));
      setStartPoint(point);
    }

    resetPlannerSearchState();
  }, [activePlannerField, resetPlannerSearchState, startPoint, tx]);

  const handlePlannerSelectLocation = useCallback(async (item) => {
    const coordinate = await resolvePlannerPlaceCoordinate(item);
    if (!coordinate) return;

    if (activePlannerField === 'end') {
      setEndAddress(item?.name || '');
      setEndPoint(coordinate);
    } else {
      setStartAddress(item?.name || '');
      setStartPoint(coordinate);
    }

    resetPlannerSearchState();
  }, [activePlannerField, resolvePlannerPlaceCoordinate, resetPlannerSearchState]);

  const openMapWithPlannerRoute = useCallback(() => {
    navigation?.navigate('Map', {
      plannerPrefill: {
        requestId: Date.now(),
        startAddress: startAddress?.trim() || tx('Mevcut Konumum', 'My Current Location'),
        endAddress: endAddress?.trim() || '',
        startPoint: startPoint || null,
        endPoint: endPoint || null,
      },
    });
  }, [navigation, startAddress, endAddress, startPoint, endPoint, tx]);

  useEffect(() => {
    return () => clearPlannerSearchDebounce();
  }, [clearPlannerSearchDebounce]);

  const activeStory = popularRouteStories[activeStoryIndex] || null;
  const storyProgressAnims = storyProgressAnimsRef.current;
  const headerUserName = user?.fullName || user?.username || tx('Misafir', 'Guest');
  const headerUserPhoto = resolveUserMediaUrl(user?.profilePhotoUrl) || DEFAULT_PROFILE_IMAGE;
  const activeStoryImage = resolveUserMediaUrl(activeStory?.imageUrl) || TEMP_STORY_IMAGE_URL;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Animated.View
          style={[
            styles.instagramTopSection,
            {
              opacity: heroAnim,
              transform: [{ translateY: heroTranslate }],
            },
          ]}
        >
          <View style={styles.instagramHeaderRow}>
            <View style={styles.headerUserRow}>
              <Image source={{ uri: headerUserPhoto }} style={styles.headerAvatarImage} />
              <Text style={styles.headerUserName}>{headerUserName}</Text>
            </View>

            <TouchableOpacity
              style={styles.instagramHeaderIconButton}
              activeOpacity={0.8}
              onPress={() => navigation?.navigate('Map')}
            >
              <Ionicons name="search-outline" size={24} color="#111111" />
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.storyRailContent}
          >
            {popularRouteStories.map((story, index) => (
              <TouchableOpacity
                key={story.id}
                style={styles.storyItem}
                activeOpacity={0.85}
                onPress={() => openStoryViewer(index)}
              >
                <LinearGradient
                  colors={
                    story.isNew
                      ? [Colors.primary, Colors.primaryDark]
                      : [Colors.border, Colors.primaryLight]
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.storyRing}
                >
                  <View style={styles.storyAvatarInner}>
                    <Image
                      source={{ uri: resolveUserMediaUrl(story.authorProfilePhotoUrl) || DEFAULT_PROFILE_IMAGE }}
                      style={styles.storyAvatarImage}
                    />
                  </View>
                </LinearGradient>
                <Text style={styles.storyName} numberOfLines={1}>
                  {story.districtName}
                </Text>
              </TouchableOpacity>
            ))}
            {storiesLoading ? <ActivityIndicator size="small" color={Colors.primary} style={styles.storyLoading} /> : null}
          </ScrollView>
        </Animated.View>

        <Animated.View
          style={[
            styles.todayPlannerCard,
            {
              opacity: cardAnim,
              transform: [{ translateY: cardTranslate }],
            },
          ]}
        >
          <View style={styles.plannerHeaderRow}>
            <View style={styles.plannerHeaderTitleRow}>
              <View style={styles.plannerIconWrap}>
                <Ionicons name="map" size={20} color={Colors.primary} />
              </View>
              <View>
                <Text style={styles.heroTitle}>{tx('Yeni Rota Planla', 'Plan New Route')}</Text>
                <Text style={styles.heroSubtitle}>{tx('Eğime duyarlı, konforlu bir yolculuk.', 'A slope-aware and comfortable journey.')}</Text>
              </View>
            </View>
          </View>

          <View style={styles.plannerSearchCard}>
            <View style={styles.plannerSearchRow}>
              <View style={styles.plannerSearchIconWrapper}>
                <View style={[styles.plannerSearchDot, styles.plannerSearchDotStart]} />
              </View>
              <TextInput
                style={styles.plannerInput}
                value={startAddress}
                onChangeText={setStartAddress}
                onFocus={() => {
                  setActivePlannerField('start');
                  plannerPlacesSessionTokenRef.current = createPlacesSessionToken();
                }}
                placeholder={tx('Nereden?', 'From?')}
                placeholderTextColor="#94A3B8"
              />
            </View>

            <View style={styles.plannerSearchRowDivider} />

            <View style={styles.plannerConnectionLine}>
              <View style={styles.plannerDashedLine} />
            </View>

            <View style={styles.plannerSearchRow}>
              <View style={styles.plannerSearchIconWrapper}>
                <View style={[styles.plannerSearchDot, styles.plannerSearchDotEnd]} />
              </View>
              <TextInput
                style={styles.plannerInput}
                value={endAddress}
                onChangeText={setEndAddress}
                onFocus={() => {
                  setActivePlannerField('end');
                  plannerPlacesSessionTokenRef.current = createPlacesSessionToken();
                }}
                placeholder={tx('Hedef seçin...', 'Select destination...')}
                placeholderTextColor="#94A3B8"
              />
            </View>

            <TouchableOpacity
              style={styles.plannerSwapButton}
              activeOpacity={0.8}
              onPress={() => {
                const prevStartAddress = startAddress;
                const prevStartPoint = startPoint;
                setStartAddress(endAddress);
                setStartPoint(endPoint);
                setEndAddress(prevStartAddress);
                setEndPoint(prevStartPoint);
              }}
            >
              <Ionicons name="swap-vertical" size={18} color="#666" />
            </TouchableOpacity>
          </View>

          {activePlannerField ? (
            <View style={styles.plannerResultsCard}>
              <TouchableOpacity
                style={styles.plannerResultItem}
                activeOpacity={0.75}
                onPress={handlePlannerSelectMyLocation}
              >
                <View style={styles.plannerResultIconWrap}>
                  <Ionicons name="locate" size={16} color={Colors.primaryDark} />
                </View>
                <View style={styles.plannerResultTextWrap}>
                  <Text style={styles.plannerResultTitle}>{tx('Mevcut Konumum', 'My Current Location')}</Text>
                  <Text style={styles.plannerResultSubtitle}>{tx('Anlık konumunu kullan', 'Use your live location')}</Text>
                </View>
              </TouchableOpacity>

              {isPlannerSearching ? (
                <View style={styles.plannerStatusRow}>
                  <ActivityIndicator size="small" color={Colors.primaryDark} />
                  <Text style={styles.plannerStatusText}>{tx('Yerler aranıyor...', 'Searching places...')}</Text>
                </View>
              ) : null}

              {!isPlannerSearching && plannerSearchResults.length > 0 ? (
                <ScrollView style={styles.plannerResultsScroll} keyboardShouldPersistTaps="handled">
                  {plannerSearchResults.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.plannerResultItem}
                      activeOpacity={0.75}
                      onPress={() => handlePlannerSelectLocation(item)}
                    >
                      <View style={styles.plannerResultIconWrap}>
                        <Ionicons name={item.icon || 'location'} size={16} color={Colors.primaryDark} />
                      </View>
                      <View style={styles.plannerResultTextWrap}>
                        <Text style={styles.plannerResultTitle}>{item.name}</Text>
                        <Text style={styles.plannerResultSubtitle}>{item.address}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              ) : null}

              {!isPlannerSearching && (activePlannerField === 'start' ? startAddress : endAddress).trim().length >= 3 && plannerSearchResults.length === 0 ? (
                <View style={styles.plannerStatusRow}>
                  <Ionicons name="search-outline" size={15} color="#94A3B8" />
                  <Text style={styles.plannerStatusText}>{tx('Sonuç bulunamadı', 'No results found')}</Text>
                </View>
              ) : null}
            </View>
          ) : null}

          <Text style={styles.modeSectionTitle}>{tx('Rota Tercihi', 'Route Preference')}</Text>
          <View style={styles.modeList}>
            {ROUTE_MODES.map((mode) => {
              const isActive = selectedMode === mode;
              const theme = ROUTE_MODE_THEME[mode] || ROUTE_MODE_THEME.Dengeli;
              return (
                <TouchableOpacity
                  key={mode}
                  style={[
                    styles.modeChip,
                    isActive && {
                      backgroundColor: theme.activeBg,
                      borderColor: theme.activeBorder,
                    },
                  ]}
                  activeOpacity={0.8}
                  onPress={() => setSelectedMode(mode)}
                >
                  <Ionicons
                    name={mode === 'En Kolay' ? 'leaf' : mode === 'Hizli' ? 'flash' : 'options'}
                    size={14} 
                    color={isActive ? '#FFFFFF' : '#64748B'} 
                  />
                  <Text style={[styles.modeChipText, isActive && styles.modeChipTextActive]}>
                    {mode === 'En Kolay'
                      ? tx('En Kolay', 'Easiest')
                      : mode === 'Hizli'
                        ? tx('Hizli', 'Fast')
                        : tx('Dengeli', 'Balanced')}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            style={styles.plannerPrimaryButtonWrap}
            activeOpacity={0.88}
            onPress={openMapWithPlannerRoute}
          >
            <LinearGradient
              colors={[Colors.primary, Colors.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.plannerPrimaryButton}
            >
              <Text style={styles.plannerPrimaryButtonText}>{tx('Haritaya Geç', 'Go to Map')}</Text>
              <View style={styles.plannerPrimaryButtonIcon}>
                <Ionicons name="arrow-forward" size={16} color={Colors.primaryDark} />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        {/* Günlük Aktivite & Sağlık Özeti (Modern UI) */}
        <Animated.View
          style={[
            styles.healthCard,
            {
              opacity: cardAnim,
              transform: [{ translateY: cardTranslate }],
            },
          ]}
        >
          <View style={styles.healthHeader}>
            <View style={styles.healthHeaderLeft}>
              <View style={styles.healthIconWrap}>
                <Ionicons name="fitness" size={20} color="#10B981" />
              </View>
              <Text style={styles.healthTitle}>{tx('Günlük Aktivite', 'Daily Activity')}</Text>
            </View>
            <View style={styles.healthBadge}>
              <Text style={styles.healthBadgeText}>
                {dailyActivity.mode === 'session' ? tx('Canlı', 'Live') : tx('Bugün', 'Today')}
              </Text>
            </View>
          </View>

          <View style={styles.stepContainer}>
            <View style={styles.stepHeader}>
              <View style={styles.stepValueRow}>
                <Text style={styles.stepValue}>
                  {dailyActivity.loading
                    ? '…'
                    : dailyActivity.permissionDenied || dailyActivity.unavailable
                      ? '—'
                      : Math.round(dailyActivity.steps).toLocaleString(language === 'tr' ? 'tr-TR' : 'en-US')}
                </Text>
                <Text style={styles.stepTarget}>
                  / {dailyActivity.stepGoal.toLocaleString(language === 'tr' ? 'tr-TR' : 'en-US')} {tx('adım', 'steps')}
                </Text>
              </View>
              <Ionicons name="footsteps" size={20} color="#10B981" />
            </View>
            <View style={styles.progressBarBg}>
              <LinearGradient
                colors={['#34D399', '#059669']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[
                  styles.progressBarFill,
                  {
                    width: `${Math.round(
                      Math.min(1, dailyActivity.loading ? 0 : dailyActivity.progressRatio) * 100,
                    )}%`,
                  },
                ]}
              />
            </View>
            {dailyActivity.permissionDenied ? (
              <View style={styles.healthPermissionBlock}>
                <Text style={styles.healthPermissionHint}>
                  {Platform.OS === 'ios'
                    ? tx(
                      'Expo Go kullanıyorsan izin Ayarlar > Expo Go > Hareket ve Fitness altındadır. Reddettiysen tekrar sorulmaz; Ayarlar\'ı aç.',
                      'If you use Expo Go, permission is under Settings > Expo Go > Motion & Fitness. If denied, it may not be asked again; open Settings.',
                    )
                    : tx(
                      'İzin reddedildiyse tekrar sorulmayabilir. Ayarlar\'dan uygulama izinlerini aç.',
                      'If permission was denied, it may not be requested again. Enable app permissions from Settings.',
                    )}
                </Text>
                <TouchableOpacity
                  style={styles.healthPermissionCta}
                  onPress={dailyActivity.openSystemSettings}
                  activeOpacity={0.85}
                >
                  <Ionicons name="settings-outline" size={16} color="#059669" />
                  <Text style={styles.healthPermissionCtaText}>{tx('Ayarları aç', 'Open settings')}</Text>
                </TouchableOpacity>
                {dailyActivity.permissionCanAskAgain ? (
                  <TouchableOpacity
                    style={styles.healthPermissionSecondary}
                    onPress={() => dailyActivity.refresh()}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.healthPermissionSecondaryText}>{tx('Tekrar izin iste', 'Request permission again')}</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : null}
            {dailyActivity.unavailable && !dailyActivity.loading ? (
              <Text style={styles.healthSource}>
                {tx('Bu cihazda adım özeti şu an kullanılamıyor.', 'Step summary is currently unavailable on this device.')}
              </Text>
            ) : (
              <Text style={styles.healthSource}>{dailyActivity.sourceLabel}</Text>
            )}
            {Platform.OS === 'android' && dailyActivity.mode === 'session' && !dailyActivity.loading ? (
              <Text style={styles.healthHint}>
                {tx(
                  'Android cihazlarda bazı modeller günlük toplam adımı sistemden vermeyebilir. Bu durumda adım sayısı cihaz sensöründen uygulama açıkken canlı olarak güncellenir.',
                  'On some Android devices, the system may not provide daily total steps. In this case, step count is updated live from the device sensor while the app is open.',
                )}
              </Text>
            ) : null}
          </View>

          <View style={styles.healthGrid}>
            <View style={styles.healthMetric}>
              <View style={[styles.healthMetricIcon, { backgroundColor: '#FEF2F2' }]}>
                <Ionicons name="flame" size={16} color="#EF4444" />
              </View>
              <View>
                <Text style={styles.healthMetricValue}>
                  {dailyActivity.loading || dailyActivity.permissionDenied || dailyActivity.unavailable
                    ? '—'
                    : String(dailyActivity.kcal)}
                </Text>
                <Text style={styles.healthMetricLabel}>{tx('kcal (yakl.)', 'kcal (est.)')}</Text>
              </View>
            </View>
            
            <View style={styles.healthMetric}>
              <View style={[styles.healthMetricIcon, { backgroundColor: '#EFF6FF' }]}>
                <Ionicons name="time" size={16} color="#3B82F6" />
              </View>
              <View>
                <Text style={styles.healthMetricValue}>
                  {dailyActivity.loading || dailyActivity.permissionDenied || dailyActivity.unavailable
                    ? '—'
                    : String(dailyActivity.activeMin)}
                </Text>
                <Text style={styles.healthMetricLabel}>{tx('dk (yakl.)', 'min (est.)')}</Text>
              </View>
            </View>
            
            <View style={styles.healthMetric}>
              <View style={[styles.healthMetricIcon, { backgroundColor: '#F5F3FF' }]}>
                <Ionicons name="map" size={16} color="#8B5CF6" />
              </View>
              <View>
                <Text style={styles.healthMetricValue}>
                  {dailyActivity.loading || dailyActivity.permissionDenied || dailyActivity.unavailable
                    ? '—'
                    : String(dailyActivity.distanceKm).replace('.', ',')}
                </Text>
                <Text style={styles.healthMetricLabel}>{tx('km (yakl.)', 'km (est.)')}</Text>
              </View>
            </View>
          </View>
        </Animated.View>
      </ScrollView>

      <Modal
        visible={isStoryViewerVisible && !!activeStory}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={closeStoryViewer}
      >
        <View style={styles.storyModalBackdrop}>
          <Image source={{ uri: activeStoryImage }} style={styles.storyFullscreenImage} />
          <LinearGradient
            colors={['rgba(10,16,25,0.28)', 'rgba(10,16,25,0.86)']}
            style={StyleSheet.absoluteFillObject}
          />
          <SafeAreaView style={styles.storyModalSafe} edges={['top', 'bottom']}>
            <View style={styles.storyProgressRow}>
              {popularRouteStories.map((story, index) => {
                const width = ensureStoryProgressAnim(index).interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                });

                return (
                  <View key={story.id} style={styles.storyProgressTrack}>
                    <Animated.View style={[styles.storyProgressFill, { width }]} />
                  </View>
                );
              })}
            </View>

            <View style={styles.storyModalHeader}>
              <View style={styles.storyModalUserRow}>
                <LinearGradient colors={[Colors.accent, Colors.primaryDark]} style={styles.storyModalAvatar}>
                  <Text style={styles.storyModalAvatarText}>{activeStory?.userInitial || 'U'}</Text>
                </LinearGradient>
                <View>
                  <Text style={styles.storyModalUserName}>{activeStory?.userName || 'Kullanici'}</Text>
                  <Text style={styles.storyModalTime}>{activeStory?.timeAgo || 'simdi'} once</Text>
                </View>
              </View>

              <TouchableOpacity style={styles.storyCloseButton} onPress={closeStoryViewer}>
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <View style={styles.storyDetailCard}>
              <Text style={styles.storyBadge}>{activeStory?.difficulty} Rota</Text>
              <Text style={styles.storyRouteTitle}>{activeStory?.routeName}</Text>
              <Text style={styles.storyRoutePath}>
                {activeStory?.from} - {activeStory?.to}
              </Text>

              <View style={styles.storyMetricRow}>
                <View style={styles.storyMetricBox}>
                  <Ionicons name="walk-outline" size={15} color={Colors.primaryDark} />
                  <Text style={styles.storyMetricLabel}>Mesafe</Text>
                  <Text style={styles.storyMetricValue}>{activeStory?.distance}</Text>
                </View>
                <View style={styles.storyMetricBox}>
                  <Ionicons name="time-outline" size={15} color={Colors.primaryDark} />
                  <Text style={styles.storyMetricLabel}>Sure</Text>
                  <Text style={styles.storyMetricValue}>{activeStory?.duration}</Text>
                </View>
                <View style={styles.storyMetricBox}>
                  <Ionicons name="trending-up-outline" size={15} color={Colors.primaryDark} />
                  <Text style={styles.storyMetricLabel}>Egim</Text>
                  <Text style={styles.storyMetricValue}>{activeStory?.avgSlope}</Text>
                </View>
              </View>

              <View style={styles.storyMetaLine}>
                <Ionicons name="flame" size={14} color={Colors.accent} />
                <Text style={styles.storyMetaText}>{activeStory?.calories || 0} kcal</Text>
                <Ionicons name="analytics-outline" size={14} color={Colors.primaryDark} />
                <Text style={styles.storyMetaText}>Yukselis {activeStory?.elevation}</Text>
              </View>

              <Text style={styles.storySummaryText}>{activeStory?.summary}</Text>

              <TouchableOpacity
                style={styles.storyOpenRouteButton}
                activeOpacity={0.88}
                onPress={() => {
                  closeStoryViewer();
                  navigation?.navigate('Map');
                }}
              >
                <Text style={styles.storyOpenRouteText}>Bu Rotayi Ac</Text>
                <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.storyTapLeft} activeOpacity={1} onPress={goToPreviousStory} />
            <TouchableOpacity style={styles.storyTapRight} activeOpacity={1} onPress={goToNextStory} />
          </SafeAreaView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 128,
  },
  instagramTopSection: {
    paddingTop: 4,
    paddingBottom: 20,
  },
  instagramHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EFF6FD',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#D5E6F6',
  },
  headerAvatarImage: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EFF6FD',
    borderWidth: 1,
    borderColor: '#D5E6F6',
  },
  headerUserName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1B2B3B',
  },
  instagramHeaderIconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storyRailContent: {
    gap: 14,
    paddingRight: 10,
    paddingBottom: 8,
    paddingTop: 2,
  },
  storyItem: {
    width: 94,
    alignItems: 'center',
  },
  yourStoryRing: {
    width: 86,
    height: 86,
    borderRadius: 43,
    borderWidth: 2.2,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  yourStoryInner: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#F1F7FD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  yourStoryPlusBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primaryDark,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  storyRing: {
    width: 86,
    height: 86,
    borderRadius: 43,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2.2,
  },
  storyAvatarInner: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  storyAvatarImage: {
    width: '100%',
    height: '100%',
  },
  storyLoading: {
    alignSelf: 'center',
    marginLeft: 2,
    marginRight: 8,
  },
  storyInitial: {
    color: Colors.primaryDark,
    fontSize: 20,
    fontWeight: '800',
  },
  storyName: {
    marginTop: 7,
    fontSize: 11,
    fontWeight: '600',
    color: Colors.text,
    width: '100%',
    textAlign: 'center',
  },
  todayPlannerCard: {
    marginTop: 24,
    borderRadius: 28,
    paddingHorizontal: 20,
    paddingVertical: 22,
    backgroundColor: '#FFFFFF',
    shadowColor: '#102A43',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  plannerHeaderRow: {
    marginBottom: 20,
  },
  plannerHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  plannerIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    fontSize: 22,
    color: '#0F172A',
    fontWeight: '800',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  plannerSearchCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    position: 'relative',
  },
  plannerSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    position: 'relative',
    zIndex: 1,
  },
  plannerSearchIconWrapper: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
  },
  plannerSearchDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  plannerSearchDotStart: {
    backgroundColor: '#4ECDC4',
    borderWidth: 2,
    borderColor: '#3DB9B1',
  },
  plannerSearchDotEnd: {
    backgroundColor: '#FF6B6B',
    borderWidth: 2,
    borderColor: '#E85555',
  },
  plannerSearchTextWrap: {
    flex: 1,
    paddingRight: 44,
  },
  plannerInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A2E',
    paddingRight: 44,
    paddingVertical: 0,
  },
  plannerSearchInputText: {
    fontSize: 16,
    color: '#1A1A2E',
    fontWeight: '600',
  },
  plannerSearchInputPlaceholder: {
    fontSize: 16,
    color: '#94A3B8',
    fontWeight: '500',
  },
  plannerSearchRowDivider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 50,
    marginRight: 14,
    backgroundColor: '#E8E8E8',
    zIndex: 1,
  },
  plannerConnectionLine: {
    position: 'absolute',
    left: 25,
    top: 34,
    bottom: 34,
    width: 2,
    alignItems: 'center',
    zIndex: 0,
  },
  plannerDashedLine: {
    flex: 1,
    width: 2,
    backgroundColor: '#E8E8E8',
    borderRadius: 1,
  },
  plannerSwapButton: {
    position: 'absolute',
    right: 12,
    top: '50%',
    marginTop: -16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    zIndex: 2,
  },
  plannerResultsCard: {
    marginTop: 10,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    maxHeight: 240,
    overflow: 'hidden',
  },
  plannerResultsScroll: {
    maxHeight: 150,
  },
  plannerResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F7',
  },
  plannerResultIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#EAF4FB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  plannerResultTextWrap: {
    flex: 1,
  },
  plannerResultTitle: {
    fontSize: 13,
    color: '#1E293B',
    fontWeight: '700',
  },
  plannerResultSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  plannerStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  plannerStatusText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  modeSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 12,
    marginLeft: 4,
  },
  modeList: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  modeChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modeChipActive: {
    backgroundColor: Colors.primaryDark,
    borderColor: Colors.primaryDark,
  },
  modeChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  modeChipTextActive: {
    color: '#FFFFFF',
  },
  plannerPrimaryButtonWrap: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: Colors.primaryDark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 6,
  },
  plannerPrimaryButton: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 20,
  },
  plannerPrimaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  plannerPrimaryButtonIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  storyModalBackdrop: {
    flex: 1,
    backgroundColor: '#101625',
  },
  storyFullscreenImage: {
    ...StyleSheet.absoluteFillObject,
  },
  storyModalSafe: {
    flex: 1,
    paddingHorizontal: 14,
    paddingTop: 8,
  },
  storyProgressRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  storyProgressTrack: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  storyProgressFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
  },
  storyModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  storyModalUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  storyModalAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storyModalAvatarText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  storyModalUserName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  storyModalTime: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 11,
    marginTop: 1,
  },
  storyCloseButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storyDetailCard: {
    marginTop: 'auto',
    marginBottom: 28,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
    padding: 16,
    zIndex: 3,
  },
  storyBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#EAF5FF',
    color: Colors.primaryDark,
    fontSize: 11,
    fontWeight: '700',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 10,
  },
  storyRouteTitle: {
    fontSize: 23,
    fontWeight: '800',
    color: '#112439',
  },
  storyRoutePath: {
    marginTop: 4,
    fontSize: 13,
    color: '#4F657A',
    marginBottom: 12,
  },
  storyMetricRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 11,
  },
  storyMetricBox: {
    flex: 1,
    borderRadius: 10,
    backgroundColor: '#F1F8FF',
    borderWidth: 1,
    borderColor: '#DDEBFA',
    paddingVertical: 9,
    alignItems: 'center',
  },
  storyMetricLabel: {
    marginTop: 4,
    fontSize: 10,
    fontWeight: '600',
    color: '#6A7D90',
  },
  storyMetricValue: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: '800',
    color: '#173B59',
  },
  storyMetaLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  storyMetaText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#425C74',
    marginRight: 6,
  },
  storySummaryText: {
    fontSize: 13,
    lineHeight: 19,
    color: '#1D3349',
    marginBottom: 14,
  },
  storyOpenRouteButton: {
    height: 42,
    borderRadius: 12,
    backgroundColor: Colors.primaryDark,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  storyOpenRouteText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  storyTapLeft: {
    position: 'absolute',
    left: 0,
    top: 96,
    width: '35%',
    height: '56%',
    zIndex: 2,
  },
  storyTapRight: {
    position: 'absolute',
    right: 0,
    top: 96,
    width: '35%',
    height: '56%',
    zIndex: 2,
  },
  // Health & Activity Section
  healthCard: {
    marginTop: 24,
    borderRadius: 28,
    paddingHorizontal: 20,
    paddingVertical: 22,
    backgroundColor: '#FFFFFF',
    shadowColor: '#102A43',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  healthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  healthHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  healthIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  healthTitle: {
    fontSize: 18,
    color: '#0F172A',
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  healthBadge: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  healthBadgeText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  stepContainer: {
    marginBottom: 24,
  },
  stepHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 10,
  },
  stepValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  stepValue: {
    fontSize: 32,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -1,
  },
  stepTarget: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '600',
    marginBottom: 4,
  },
  progressBarBg: {
    height: 10,
    backgroundColor: '#F1F5F9',
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 5,
  },
  healthSource: {
    marginTop: 10,
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
    lineHeight: 15,
  },
  healthHint: {
    marginTop: 6,
    fontSize: 11,
    color: '#64748B',
    lineHeight: 15,
  },
  healthPermissionBlock: {
    marginTop: 12,
    gap: 10,
  },
  healthPermissionHint: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 17,
  },
  healthPermissionCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  healthPermissionCtaText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#047857',
  },
  healthPermissionSecondary: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  healthPermissionSecondaryText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2563EB',
  },
  healthGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  healthMetric: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  healthMetricIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  healthMetricValue: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
  },
  healthMetricLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    textAlign: 'center',
    marginTop: 2,
  },
  verticalDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E2E8F0',
  },
});
