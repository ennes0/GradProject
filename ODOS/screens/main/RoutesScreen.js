import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  FlatList,
  ActivityIndicator,
  Animated,
  Easing,
  Share,
  Modal,
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../constants/Colors';
import RouteDetailsModal from '../../components/ui/RouteDetailsModal';
import { useAuth } from '../../components/context/AuthContext';
import { useAppAlert } from '../../components/context/AppAlertContext';
import { useLanguage } from '../../components/context/LanguageContext';
import {
  mapSavedRouteListItemToCard,
  mergeSavedRouteDetailIntoCard,
} from '../../utils/savedRoutes';
import { GOOGLE_PLACES_API_KEY } from '../../config/api';
import { getMapProvider } from '../../constants/mapProvider';

// Demo (giriş yokken kart tasarımını göstermek için)
const DEMO_COMPLETED_ROUTES = [
  {
    id: '1',
    name: 'Sahil Yürüyüşü',
    startLocation: 'Kadıköy İskele',
    endLocation: 'Moda Sahili',
    date: '20 Ocak 2026',
    time: '14:30',
    distance: '3.2 km',
    duration: '45 dk',
    calories: 185,
    steps: 4250,
    avgSpeed: '4.3 km/h',
    difficulty: 'easy',
    maxSlope: '3%',
    avgSlope: '1.5%',
    elevationGain: '12 m',
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400',
    weather: 'Güneşli',
    temperature: '12°C',
    mood: 'great',
    notes: 'Harika bir yürüyüştü, manzara muhteşemdi.',
  },
  {
    id: '2',
    name: 'Park Turu',
    startLocation: 'Yoğurtçu Parkı Giriş',
    endLocation: 'Yoğurtçu Parkı Giriş',
    date: '19 Ocak 2026',
    time: '10:15',
    distance: '1.8 km',
    duration: '25 dk',
    calories: 95,
    steps: 2380,
    avgSpeed: '4.1 km/h',
    difficulty: 'easy',
    maxSlope: '5%',
    avgSlope: '2%',
    elevationGain: '8 m',
    image: 'https://images.unsplash.com/photo-1519331379826-f10be5486c6f?w=400',
    weather: 'Bulutlu',
    temperature: '9°C',
    mood: 'good',
    notes: 'Sabah yürüyüşü için ideal.',
  },
  {
    id: '3',
    name: 'Tarihi Yarımada Keşfi',
    startLocation: 'Sultanahmet Meydanı',
    endLocation: 'Eminönü',
    date: '18 Ocak 2026',
    time: '11:00',
    distance: '4.5 km',
    duration: '1s 15dk',
    calories: 245,
    steps: 5890,
    avgSpeed: '3.6 km/h',
    difficulty: 'medium',
    maxSlope: '8%',
    avgSlope: '4%',
    elevationGain: '35 m',
    image: 'https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?w=400',
    weather: 'Parçalı Bulutlu',
    temperature: '11°C',
    mood: 'great',
    notes: 'Ayasofya ve Topkapı muhteşemdi!',
  },
  {
    id: '4',
    name: 'Boğaz Yürüyüşü',
    startLocation: 'Bebek Sahil',
    endLocation: 'Rumeli Hisarı',
    date: '15 Ocak 2026',
    time: '15:45',
    distance: '5.8 km',
    duration: '1s 30dk',
    calories: 320,
    steps: 7650,
    avgSpeed: '3.9 km/h',
    difficulty: 'medium',
    maxSlope: '12%',
    avgSlope: '5%',
    elevationGain: '48 m',
    image: 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=400',
    weather: 'Güneşli',
    temperature: '8°C',
    mood: 'good',
    notes: 'Biraz yorucu ama manzara değerdi.',
  },
];

const RECENT_ROUTES = [
  {
    id: 'r1',
    name: 'Eve Dönüş',
    date: 'Bugün, 14:30',
    distance: '1.2 km',
    duration: '18 dk',
  },
  {
    id: 'r2',
    name: 'Ofise Gidiş',
    date: 'Dün, 08:45',
    distance: '2.8 km',
    duration: '35 dk',
  },
  {
    id: 'r3',
    name: 'Market Rotası',
    date: '2 gün önce',
    distance: '0.8 km',
    duration: '12 dk',
  },
];

const CATEGORIES = [
  { id: 'all', label: 'Tümü', icon: 'grid-outline' },
  { id: 'week', label: 'Bu Hafta', icon: 'calendar-outline' },
  { id: 'easy', label: 'Kolay', icon: 'leaf-outline' },
  { id: 'medium', label: 'Orta', icon: 'fitness-outline' },
  { id: 'long', label: 'Uzun', icon: 'trail-sign-outline' },
];

const getMoodConfig = (mood) => {
  switch (mood) {
    case 'great':
      return { icon: 'happy', color: '#4CAF50', label: 'Harika' };
    case 'good':
      return { icon: 'happy-outline', color: '#8BC34A', label: 'İyi' };
    case 'okay':
      return { icon: 'sad-outline', color: '#FFC107', label: 'Normal' };
    case 'tired':
      return { icon: 'sad', color: '#FF9800', label: 'Yorgun' };
    default:
      return { icon: 'happy-outline', color: '#8BC34A', label: 'İyi' };
  }
};

const getDifficultyConfig = (difficulty) => {
  switch (difficulty) {
    case 'easy':
      return { label: 'Kolay', color: Colors.slopeEasy, bg: '#E8F5E9' };
    case 'medium':
      return { label: 'Orta', color: Colors.slopeMedium, bg: '#FFF8E1' };
    case 'hard':
      return { label: 'Zor', color: Colors.slopeHard, bg: '#FBE9E7' };
    default:
      return { label: 'Kolay', color: Colors.slopeEasy, bg: '#E8F5E9' };
  }
};

export default function RoutesScreen() {
  const { isAuthenticated, isAuthLoading, fetchSavedRoutes, fetchSavedRouteById, patchSavedRoute } = useAuth();
  const { showAlert } = useAppAlert();
  const { tx } = useLanguage();
  const navigation = useNavigation();
  const screenRoute = useRoute();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [favorites, setFavorites] = useState(['1', '3']);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [routeDetailMerge, setRouteDetailMerge] = useState(null);
  const [routeDetailLoading, setRouteDetailLoading] = useState(false);
  const [showRouteDetails, setShowRouteDetails] = useState(false);
  const [apiRows, setApiRows] = useState([]);
  const [routesLoading, setRoutesLoading] = useState(false);
  const [isPreparingShare, setIsPreparingShare] = useState(false);
  const [showSharePreview, setShowSharePreview] = useState(false);
  const [sharePreviewData, setSharePreviewData] = useState(null);
  const handledSharedRouteRef = useRef(null);
  const cardAnimValuesRef = useRef(new Map());
  const hasPlayedCardsIntroRef = useRef(false);

  const displayRouteForModal = useMemo(() => {
    if (!selectedRoute) return null;
    return { ...selectedRoute, ...routeDetailMerge };
  }, [selectedRoute, routeDetailMerge]);

  const openRouteDetails = useCallback(
    (route) => {
      setSelectedRoute(route);
      setRouteDetailMerge(null);
      setShowRouteDetails(true);
      if (route?.serverId) {
        setRouteDetailLoading(true);
        void (async () => {
          try {
            const detail = await fetchSavedRouteById(route.serverId);
            setRouteDetailMerge(mergeSavedRouteDetailIntoCard(route, detail));
          } catch (e) {
            showAlert({
              title: tx('Detay', 'Detail'),
              message: e?.message || tx('Rota detayı alınamadı; liste bilgileri gösteriliyor.', 'Route details could not be loaded; showing list data.'),
              type: 'warning',
            });
          } finally {
            setRouteDetailLoading(false);
          }
        })();
      } else {
        setRouteDetailLoading(false);
      }
    },
    [fetchSavedRouteById, showAlert],
  );

  const closeRouteDetails = useCallback(() => {
    setShowRouteDetails(false);
    setSelectedRoute(null);
    setRouteDetailMerge(null);
    setRouteDetailLoading(false);
  }, []);

  const loadSavedRoutes = useCallback(async () => {
    if (!isAuthenticated) return;
    setRoutesLoading(true);
    try {
      const rows = await fetchSavedRoutes(80);
      setApiRows(rows);
      setFavorites(rows.filter((r) => r.favorite).map((r) => String(r.id)));
    } catch (e) {
      showAlert({
        title: tx('Rotalar', 'Routes'),
        message: e?.message || tx('Kayıtlı rotalar yüklenemedi', 'Saved routes could not be loaded'),
        type: 'error',
      });
    } finally {
      setRoutesLoading(false);
    }
  }, [isAuthenticated, fetchSavedRoutes, showAlert]);

  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated && !isAuthLoading) {
        void loadSavedRoutes();
      }
    }, [isAuthenticated, isAuthLoading, loadSavedRoutes]),
  );

  const completedRoutes = useMemo(() => {
    if (isAuthenticated) {
      return apiRows.map(mapSavedRouteListItemToCard).filter(Boolean);
    }
    return DEMO_COMPLETED_ROUTES;
  }, [isAuthenticated, apiRows]);

  const recentListData = useMemo(() => {
    if (isAuthenticated && completedRoutes.length > 0) {
      return completedRoutes.slice(0, 3).map((r) => ({
        id: `recent-${r.id}`,
        name: r.name,
        date: `${r.date}, ${r.time}`,
        distance: r.distance,
        duration: r.duration,
      }));
    }
    return RECENT_ROUTES;
  }, [isAuthenticated, completedRoutes]);

  const toggleFavorite = async (routeId) => {
    const card = completedRoutes.find((r) => r.id === routeId);
    if (isAuthenticated && card?.serverId) {
      const nowFav = favorites.includes(routeId);
      try {
        await patchSavedRoute(card.serverId, { favorite: !nowFav });
        setApiRows((prev) =>
          prev.map((row) =>
            String(row.id) === String(card.serverId) ? { ...row, favorite: !nowFav } : row,
          ),
        );
        setFavorites((prev) =>
          nowFav ? prev.filter((id) => id !== routeId) : [...prev, routeId],
        );
      } catch (e) {
        showAlert({
          title: tx('Favori', 'Favorite'),
          message: e?.message || tx('Güncellenemedi', 'Could not update'),
          type: 'error',
        });
      }
      return;
    }
    setFavorites((prev) =>
      prev.includes(routeId) ? prev.filter((id) => id !== routeId) : [...prev, routeId],
    );
  };

  const filteredRoutes = completedRoutes.filter(route => {
    if (selectedCategory === 'all') return true;
    if (selectedCategory === 'week') {
      if (!route.finishedAtIso) return true;
      const t = new Date(route.finishedAtIso).getTime();
      if (Number.isNaN(t)) return true;
      return Date.now() - t <= 7 * 24 * 60 * 60 * 1000;
    }
    if (selectedCategory === 'easy') return route.difficulty === 'easy';
    if (selectedCategory === 'medium') return route.difficulty === 'medium';
    if (selectedCategory === 'long') return parseFloat(route.distance) >= 4;
    return true;
  });

  const normalizePolylineCoordinates = useCallback((polylineInput) => {
    if (!polylineInput) return [];
    let parsed = polylineInput;
    if (typeof parsed === 'string') {
      try {
        parsed = JSON.parse(parsed);
      } catch {
        return [];
      }
    }
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((p) => {
        if (Array.isArray(p) && p.length >= 2) {
          const lat = Number(p[0]);
          const lon = Number(p[1]);
          if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
          return { latitude: lat, longitude: lon };
        }
        if (p && typeof p === 'object') {
          const lat = Number(p.latitude ?? p.lat);
          const lon = Number(p.longitude ?? p.lon ?? p.lng);
          if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
          return { latitude: lat, longitude: lon };
        }
        return null;
      })
      .filter(Boolean);
  }, []);

  const resolveRouteCoordinatesForReplay = useCallback(
    async (route) => {
      const fromRaw = normalizePolylineCoordinates(route?._raw?.routePolylineJson);
      if (fromRaw.length >= 2) return fromRaw;

      const fromDetailCache = normalizePolylineCoordinates(route?._detail?.routePolylineJson);
      if (fromDetailCache.length >= 2) return fromDetailCache;

      if (isAuthenticated && route?.serverId) {
        const detail = await fetchSavedRouteById(route.serverId);
        const fromDetail = normalizePolylineCoordinates(detail?.routePolylineJson);
        if (fromDetail.length >= 2) return fromDetail;
      }

      return [];
    },
    [fetchSavedRouteById, isAuthenticated, normalizePolylineCoordinates],
  );

  const buildStaticMapUrlFromCoordinates = useCallback((coordinates) => {
    if (!Array.isArray(coordinates) || coordinates.length < 2 || !GOOGLE_PLACES_API_KEY) {
      return null;
    }

    const maxPoints = 24;
    const step = Math.max(1, Math.ceil(coordinates.length / maxPoints));
    const sampled = [];
    for (let i = 0; i < coordinates.length; i += step) {
      sampled.push(coordinates[i]);
    }
    const last = coordinates[coordinates.length - 1];
    if (sampled[sampled.length - 1] !== last) sampled.push(last);

    const start = sampled[0];
    const end = sampled[sampled.length - 1];
    if (!start || !end) return null;

    const pathPoints = sampled
      .map((p) => `${Number(p.latitude).toFixed(6)},${Number(p.longitude).toFixed(6)}`)
      .join('|');

    const pathParam = `path=${encodeURIComponent(`color:0x2563EB|weight:6|${pathPoints}`)}`;
    const startMarker = `markers=${encodeURIComponent(`color:0x10B981|label:S|${Number(start.latitude).toFixed(6)},${Number(start.longitude).toFixed(6)}`)}`;
    const endMarker = `markers=${encodeURIComponent(`color:0xEF4444|label:E|${Number(end.latitude).toFixed(6)},${Number(end.longitude).toFixed(6)}`)}`;

    return `https://maps.googleapis.com/maps/api/staticmap?size=1200x700&scale=2&maptype=roadmap&${pathParam}&${startMarker}&${endMarker}&key=${encodeURIComponent(GOOGLE_PLACES_API_KEY)}`;
  }, []);

  const buildSharePreviewGeometry = useCallback((coordinates) => {
    if (!Array.isArray(coordinates) || coordinates.length < 2) {
      return null;
    }

    const start = coordinates[0];
    const end = coordinates[coordinates.length - 1];
    let minLat = start.latitude;
    let maxLat = start.latitude;
    let minLon = start.longitude;
    let maxLon = start.longitude;

    for (const c of coordinates) {
      if (c.latitude < minLat) minLat = c.latitude;
      if (c.latitude > maxLat) maxLat = c.latitude;
      if (c.longitude < minLon) minLon = c.longitude;
      if (c.longitude > maxLon) maxLon = c.longitude;
    }

    const latitudeDelta = Math.max(0.012, (maxLat - minLat) * 1.6);
    const longitudeDelta = Math.max(0.012, (maxLon - minLon) * 1.6);

    return {
      start,
      end,
      coordinates,
      region: {
        latitude: (minLat + maxLat) / 2,
        longitude: (minLon + maxLon) / 2,
        latitudeDelta,
        longitudeDelta,
      },
    };
  }, []);

  const buildRouteShareLink = useCallback((route) => {
    const routeId = route?.serverId || route?._raw?.id || route?.id;
    if (!routeId) return null;
    return `https://odos.app/shared-route/${encodeURIComponent(String(routeId))}`;
  }, []);

  const handleWalkAgain = useCallback(
    async (route) => {
      try {
        const coordinates = await resolveRouteCoordinatesForReplay(route);
        if (coordinates.length < 2) {
          showAlert({
            title: tx('Tekrar Yürü', 'Walk Again'),
            message: tx(
              'Bu kayıt için rota izi bulunamadı. Lütfen haritadan yeniden rota oluştur.',
              'Route polyline is not available for this entry. Please create a new route on the map.',
            ),
            type: 'warning',
          });
          return;
        }

        const startPoint = coordinates[0];
        const endPoint = coordinates[coordinates.length - 1];
        navigation.navigate('Map', {
          replaySession: {
            requestId: `replay-${route.id}-${Date.now()}`,
            title: route.name,
            routeType: route?._raw?.routeType || null,
            difficulty: route?.difficulty || null,
            startAddress: route.startLocation || '',
            endAddress: route.endLocation || '',
            startPoint,
            endPoint,
            coordinates,
            distanceLabel: route.distance || '',
            durationLabel: route.duration || '',
            caloriesLabel:
              route.calories != null && Number.isFinite(Number(route.calories))
                ? `${Math.round(Number(route.calories))} kcal`
                : '—',
            elevationGainLabel: route.elevationGain || '—',
          },
        });
      } catch (e) {
        showAlert({
          title: tx('Tekrar Yürü', 'Walk Again'),
          message: e?.message || tx('Rota tekrar başlatılamadı', 'Could not restart this route'),
          type: 'error',
        });
      }
    },
    [navigation, resolveRouteCoordinatesForReplay, showAlert, tx],
  );

  const handleShareRoute = useCallback(
    async (route) => {
      try {
        setIsPreparingShare(true);
        const coordinates = await resolveRouteCoordinatesForReplay(route);
        const previewGeometry = buildSharePreviewGeometry(coordinates);
        const staticMapUrl = buildStaticMapUrlFromCoordinates(coordinates) || route.image || null;
        const shareLink = buildRouteShareLink(route);

        const summaryLine = [
          route.distance || null,
          route.duration || null,
          route.calories != null ? `${route.calories} kcal` : null,
          route.elevationGain || null,
        ]
          .filter(Boolean)
          .join(' • ');

        const shareMessage = [
          `${route.name}`,
          `${tx('Başlangıç', 'Start')}: ${route.startLocation || '-'}`,
          `${tx('Bitiş', 'Finish')}: ${route.endLocation || '-'}`,
          summaryLine,
          route.notes ? `${tx('Not', 'Note')}: ${route.notes}` : null,
          shareLink ? `${tx('Rota Linki', 'Route Link')}: ${shareLink}` : null,
          '#ODOS #Route #Walking',
        ]
          .filter(Boolean)
          .join('\n');

        setSharePreviewData({
          route,
          coordinates,
          previewGeometry,
          staticMapUrl,
          shareLink,
          shareMessage,
        });
        setShowSharePreview(true);
      } catch (e) {
        showAlert({
          title: tx('Paylaş', 'Share'),
          message: e?.message || tx('Paylaşım önizlemesi hazırlanamadı', 'Could not prepare share preview'),
          type: 'error',
        });
      } finally {
        setIsPreparingShare(false);
      }
    },
    [buildStaticMapUrlFromCoordinates, resolveRouteCoordinatesForReplay, showAlert, tx],
  );

  const handleConfirmShare = useCallback(async () => {
    const route = sharePreviewData?.route;
    if (!route) return;

    try {
      const fallbackUrl = sharePreviewData?.shareLink || undefined;
      await Share.share({
        title: route.name,
        message: sharePreviewData?.shareMessage || route.name,
        url: fallbackUrl,
      });
    } catch (e) {
      showAlert({
        title: tx('Paylaş', 'Share'),
        message: e?.message || tx('Paylaşım başlatılamadı', 'Could not open share sheet'),
        type: 'error',
      });
    }
  }, [sharePreviewData, showAlert, tx]);

  useFocusEffect(
    useCallback(() => {
      const sharedRouteId = screenRoute?.params?.routeId;
      if (!sharedRouteId) return;

      const routeIdString = String(sharedRouteId);
      if (handledSharedRouteRef.current === routeIdString) return;

      const target = completedRoutes.find((r) => String(r.serverId || r.id) === routeIdString);
      if (!target) return;

      handledSharedRouteRef.current = routeIdString;
      openRouteDetails(target);
      navigation.setParams({ routeId: undefined });
    }, [completedRoutes, navigation, openRouteDetails, screenRoute?.params?.routeId]),
  );

  useFocusEffect(
    useCallback(() => {
      // Ekran her odaklandığında giriş animasyonu yeniden oynatılabilsin
      hasPlayedCardsIntroRef.current = false;
    }, []),
  );

  useEffect(() => {
    if (routesLoading || filteredRoutes.length === 0 || hasPlayedCardsIntroRef.current) return;

    const animatableCount = Math.min(filteredRoutes.length, 8);
    const animations = [];

    filteredRoutes.forEach((route, index) => {
      const key = String(route.id);
      let value = cardAnimValuesRef.current.get(key);
      if (!value) {
        value = new Animated.Value(index < animatableCount ? 0 : 1);
        cardAnimValuesRef.current.set(key, value);
      }

      if (index < animatableCount) {
        value.setValue(0);
        animations.push(
          Animated.timing(value, {
            toValue: 1,
            duration: 260,
            delay: index * 40,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          })
        );
      } else {
        value.setValue(1);
      }
    });

    if (animations.length > 0) {
      Animated.parallel(animations).start();
    }
    hasPlayedCardsIntroRef.current = true;
  }, [filteredRoutes, routesLoading]);

  const renderCategoryItem = (category) => {
    const isSelected = selectedCategory === category.id;
    return (
      <TouchableOpacity
        key={category.id}
        style={[styles.categoryChip, isSelected && styles.categoryChipActive]}
        onPress={() => setSelectedCategory(category.id)}
        activeOpacity={0.7}
      >
        <Ionicons 
          name={category.icon} 
          size={16} 
          color={isSelected ? '#FFFFFF' : Colors.textSecondary} 
        />
        <Text style={[styles.categoryLabel, isSelected && styles.categoryLabelActive]}>
          {category.id === 'all'
            ? tx('Tümü', 'All')
            : category.id === 'week'
              ? tx('Bu Hafta', 'This Week')
              : category.id === 'easy'
                ? tx('Kolay', 'Easy')
                : category.id === 'medium'
                  ? tx('Orta', 'Medium')
                  : tx('Uzun', 'Long')}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderRouteCard = ({ item: route }) => {
    const diffConfig = getDifficultyConfig(route.difficulty);
    const moodConfig = getMoodConfig(route.mood);
    const isFav = favorites.includes(route.id);
    const routeAnim = cardAnimValuesRef.current.get(String(route.id)) || new Animated.Value(1);

    return (
      <Animated.View
        style={[
          styles.routeCardAnimated,
          {
            opacity: routeAnim,
            transform: [
              {
                translateY: routeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [14, 0],
                }),
              },
            ],
          },
        ]}
      >
        <TouchableOpacity 
          style={styles.routeCard}
          activeOpacity={0.9}
          onPress={() => openRouteDetails(route)}
        >
          {/* Kart Görseli */}
          <View style={styles.cardImageContainer}>
            <Image 
              source={{ uri: route.image }} 
              style={styles.cardImage}
              resizeMode="cover"
            />
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.8)']}
              style={styles.imageGradient}
            />
            
            {/* Favori Butonu */}
            <TouchableOpacity 
              style={styles.favoriteButton}
              onPress={() => toggleFavorite(route.id)}
            >
              <Ionicons 
                name={isFav ? 'heart' : 'heart-outline'} 
                size={22} 
                color={isFav ? '#FF6B6B' : '#FFFFFF'} 
              />
            </TouchableOpacity>

            {/* Tarih Badge */}
            <View style={styles.dateBadge}>
              <Ionicons name="calendar" size={12} color="#FFFFFF" />
              <Text style={styles.dateText}>{route.date}</Text>
            </View>

            {/* Görsel üzerinde bilgiler */}
            <View style={styles.imageOverlayInfo}>
              <Text style={styles.routeName}>{route.name}</Text>
              <View style={styles.locationRow}>
                <Ionicons name="location" size={14} color={Colors.primary} />
                <Text style={styles.locationText}>{route.startLocation} → {route.endLocation}</Text>
              </View>
            </View>
          </View>

          {/* Kart İçeriği */}
          <View style={styles.cardContent}>
            {/* Ana İstatistikler Grid */}
            <View style={styles.mainStatsGrid}>
              <View style={styles.mainStatBox}>
                <Ionicons name="navigate" size={20} color={Colors.primary} />
                <Text style={styles.mainStatValue}>{route.distance}</Text>
                <Text style={styles.mainStatLabel}>{tx('Mesafe', 'Distance')}</Text>
              </View>
              <View style={styles.mainStatBox}>
                <Ionicons name="time" size={20} color="#667EEA" />
                <Text style={styles.mainStatValue}>{route.duration}</Text>
                <Text style={styles.mainStatLabel}>{tx('Süre', 'Duration')}</Text>
              </View>
              <View style={styles.mainStatBox}>
                <Ionicons name="flame" size={20} color="#F5576C" />
                <Text style={styles.mainStatValue}>{route.calories}</Text>
                <Text style={styles.mainStatLabel}>{tx('Kalori', 'Calories')}</Text>
              </View>
              <View style={styles.mainStatBox}>
                <Ionicons name="footsteps" size={20} color="#4ECDC4" />
                <Text style={styles.mainStatValue}>{route.steps}</Text>
                <Text style={styles.mainStatLabel}>{tx('Adım', 'Steps')}</Text>
              </View>
            </View>

            {/* Detay Bilgileri */}
            <View style={styles.detailsSection}>
              <View style={styles.detailRow}>
                <View style={styles.detailItem}>
                  <Ionicons name="speedometer-outline" size={16} color={Colors.textSecondary} />
                  <Text style={styles.detailLabel}>{tx('Ort. Hız', 'Avg. Speed')}</Text>
                  <Text style={styles.detailValue}>{route.avgSpeed}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Ionicons name="trending-up" size={16} color={Colors.textSecondary} />
                  <Text style={styles.detailLabel}>{tx('Maks. Eğim', 'Max Slope')}</Text>
                  <Text style={styles.detailValue}>{route.maxSlope}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Ionicons name="arrow-up" size={16} color={Colors.textSecondary} />
                  <Text style={styles.detailLabel}>{tx('Yükseliş', 'Elevation')}</Text>
                  <Text style={styles.detailValue}>{route.elevationGain}</Text>
                </View>
              </View>
            </View>

            {/* Hava Durumu ve Ruh Hali */}
            <View style={styles.conditionsRow}>
              <View style={styles.conditionBadge}>
                <Ionicons name="partly-sunny" size={14} color="#FFA726" />
                <Text style={styles.conditionText}>{route.weather}, {route.temperature}</Text>
              </View>
              <View style={[styles.conditionBadge, { backgroundColor: `${moodConfig.color}15` }]}>
                <Ionicons name={moodConfig.icon} size={14} color={moodConfig.color} />
                <Text style={[styles.conditionText, { color: moodConfig.color }]}>
                  {moodConfig.label === 'Harika'
                    ? tx('Harika', 'Great')
                    : moodConfig.label === 'İyi'
                      ? tx('İyi', 'Good')
                      : moodConfig.label === 'Normal'
                        ? tx('Normal', 'Okay')
                        : tx('Yorgun', 'Tired')}
                </Text>
              </View>
              <View style={[styles.conditionBadge, { backgroundColor: diffConfig.bg }]}> 
                <View style={[styles.difficultyDot, { backgroundColor: diffConfig.color }]} />
                <Text style={[styles.conditionText, { color: diffConfig.color }]}> 
                  {diffConfig.label === 'Kolay'
                    ? tx('Kolay', 'Easy')
                    : diffConfig.label === 'Orta'
                      ? tx('Orta', 'Medium')
                      : tx('Zor', 'Hard')}
                </Text>
              </View>
            </View>

            {/* Not */}
            {route.notes && (
              <View style={styles.notesSection}>
                <Ionicons name="chatbubble-outline" size={14} color={Colors.textSecondary} />
                <Text style={styles.notesText} numberOfLines={2}>{route.notes}</Text>
              </View>
            )}

            {/* Butonlar */}
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.secondaryButton}
                activeOpacity={0.8}
                onPress={() => handleShareRoute(route)}
              >
                <Ionicons name="share-outline" size={18} color={Colors.primary} />
                <Text style={styles.secondaryButtonText}>{tx('Paylaş', 'Share')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.primaryButton}
                activeOpacity={0.8}
                onPress={() => handleWalkAgain(route)}
              >
                <Ionicons name="repeat" size={18} color="#FFFFFF" />
                <Text style={styles.primaryButtonText}>{tx('Tekrar Yürü', 'Walk Again')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderRecentRoute = ({ item }) => (
    <TouchableOpacity style={styles.recentCard} activeOpacity={0.8}>
      <View style={styles.recentIconContainer}>
        <Ionicons name="time" size={20} color={Colors.primary} />
      </View>
      <View style={styles.recentInfo}>
        <Text style={styles.recentName}>{item.name}</Text>
        <Text style={styles.recentDate}>{item.date}</Text>
      </View>
      <View style={styles.recentStats}>
        <Text style={styles.recentDistance}>{item.distance}</Text>
        <Text style={styles.recentDuration}>{item.duration}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={Colors.textLight} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>{tx('Rotalarım', 'My Routes')}</Text>
          <Text style={styles.headerSubtitle}>{tx('Keşfet ve yürüyüşe başla', 'Discover and start walking')}</Text>
        </View>
        <TouchableOpacity style={styles.searchButton}>
          <Ionicons name="search" size={22} color={Colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Son Rotalar */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{tx('Son Rotalar', 'Recent Routes')}</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>{tx('Tümünü Gör', 'See All')}</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={recentListData}
            renderItem={renderRecentRoute}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.recentList}
          />
        </View>

        {/* Kategoriler */}
        <View style={styles.categoriesContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {CATEGORIES.map(renderCategoryItem)}
          </ScrollView>
        </View>

        {/* Tamamlanan Rotalar */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{tx('Tamamlanan Rotalar', 'Completed Routes')}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {routesLoading ? <ActivityIndicator size="small" color={Colors.primary} /> : null}
              <TouchableOpacity style={styles.filterButton}>
                <Ionicons name="options-outline" size={18} color={Colors.primary} />
              </TouchableOpacity>
            </View>
          </View>

          {isAuthenticated && !routesLoading && completedRoutes.length === 0 ? (
            <View style={styles.emptyHint}>
              <Ionicons name="map-outline" size={40} color="#CBD5E1" />
              <Text style={styles.emptyHintTitle}>{tx('Henüz kayıtlı rota yok', 'No saved routes yet')}</Text>
              <Text style={styles.emptyHintText}>
                {tx(
                  'Haritada yürüyüşü bitirince açılan özette "Sunucuya kaydet" ile rotanı buraya ekleyebilirsin.',
                  'After ending a walk on the map, you can add routes here from the summary with "Save to server".',
                )}
              </Text>
            </View>
          ) : null}

          {filteredRoutes.map((route) => (
            <View key={route.id}>
              {renderRouteCard({ item: route })}
            </View>
          ))}
        </View>

        {/* Alt boşluk */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Route Details Modal */}
      <RouteDetailsModal
        visible={showRouteDetails}
        onClose={closeRouteDetails}
        route={displayRouteForModal}
        detailLoading={routeDetailLoading}
        onShareRoute={handleShareRoute}
        onStartNavigation={handleWalkAgain}
      />

      <Modal
        visible={showSharePreview}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSharePreview(false)}
      >
        <View style={styles.shareModalBackdrop}>
          <TouchableOpacity style={styles.shareModalBackdropTouch} activeOpacity={1} onPress={() => setShowSharePreview(false)} />
          <View style={styles.shareModalCard}>
            <View style={styles.shareModalHeader}>
              <Text style={styles.shareModalTitle}>{tx('Paylaşım Önizlemesi', 'Share Preview')}</Text>
              <TouchableOpacity onPress={() => setShowSharePreview(false)} style={styles.shareCloseButton}>
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {sharePreviewData?.previewGeometry ? (
              <View style={styles.shareMapFrame}>
                <MapView
                  style={styles.shareMapImage}
                  provider={getMapProvider()}
                  initialRegion={sharePreviewData.previewGeometry.region}
                  scrollEnabled={false}
                  zoomEnabled={false}
                  rotateEnabled={false}
                  pitchEnabled={false}
                  toolbarEnabled={false}
                  liteMode
                  pointerEvents="none"
                >
                  <Polyline
                    coordinates={sharePreviewData.previewGeometry.coordinates}
                    strokeColor="#2563EB"
                    strokeWidth={4}
                    lineCap="round"
                    lineJoin="round"
                  />
                  <Marker coordinate={sharePreviewData.previewGeometry.start} tracksViewChanges={false}>
                    <View style={styles.shareStartDot} />
                  </Marker>
                  <Marker coordinate={sharePreviewData.previewGeometry.end} tracksViewChanges={false}>
                    <View style={styles.shareEndDot} />
                  </Marker>
                </MapView>
                <View style={styles.shareMapOverlayPill}>
                  <Ionicons name="navigate-outline" size={12} color="#FFFFFF" />
                  <Text style={styles.shareMapOverlayText}>{tx('Canlı Rota Önizlemesi', 'Live Route Preview')}</Text>
                </View>
              </View>
            ) : sharePreviewData?.staticMapUrl ? (
              <Image source={{ uri: sharePreviewData.staticMapUrl }} style={styles.shareMapImage} resizeMode="cover" />
            ) : (
              <View style={styles.shareMapPlaceholder}>
                <Ionicons name="map-outline" size={28} color="#94A3B8" />
                <Text style={styles.shareMapPlaceholderText}>{tx('Harita önizlemesi yok', 'No map preview')}</Text>
              </View>
            )}

            <View style={styles.shareRouteBody}>
              <Text style={styles.shareRouteTitle}>{sharePreviewData?.route?.name || '-'}</Text>
              <Text style={styles.shareRoutePath} numberOfLines={1}>
                {`${sharePreviewData?.route?.startLocation || '-'} → ${sharePreviewData?.route?.endLocation || '-'}`}
              </Text>

              <View style={styles.shareHighlightBox}>
                <Text style={styles.shareHighlightTitle}>{tx('Paylaşım Özeti', 'Share Summary')}</Text>
                <Text style={styles.shareHighlightText} numberOfLines={2}>
                  {tx('Bu rotayı tamamladım. Mesafe, süre ve yükseliş değerleri ODOS kaydından geliyor.', 'I completed this route. Distance, duration and elevation values come from my ODOS record.')}
                </Text>
              </View>

              <View style={styles.shareStatsRow}>
                <View style={styles.shareStatPill}>
                  <Ionicons name="walk-outline" size={13} color="#0F766E" />
                  <Text style={styles.shareStatText}>{sharePreviewData?.route?.distance || '-'}</Text>
                </View>
                <View style={styles.shareStatPill}>
                  <Ionicons name="time-outline" size={13} color="#1D4ED8" />
                  <Text style={styles.shareStatText}>{sharePreviewData?.route?.duration || '-'}</Text>
                </View>
                <View style={styles.shareStatPill}>
                  <Ionicons name="flame-outline" size={13} color="#B45309" />
                  <Text style={styles.shareStatText}>{`${sharePreviewData?.route?.calories ?? '-'} kcal`}</Text>
                </View>
                <View style={styles.shareStatPill}>
                  <Ionicons name="trending-up-outline" size={13} color="#7C3AED" />
                  <Text style={styles.shareStatText}>{sharePreviewData?.route?.elevationGain || '-'}</Text>
                </View>
              </View>

              {sharePreviewData?.route?.notes ? (
                <View style={styles.shareQuoteBox}>
                  <Ionicons name="chatbubble-ellipses-outline" size={14} color="#475569" />
                  <Text style={styles.shareQuoteText} numberOfLines={2}>{sharePreviewData.route.notes}</Text>
                </View>
              ) : null}

              {sharePreviewData?.shareLink ? (
                <View style={styles.shareLinkBox}>
                  <Ionicons name="link-outline" size={14} color="#2563EB" />
                  <Text style={styles.shareLinkText} numberOfLines={1}>{sharePreviewData.shareLink}</Text>
                </View>
              ) : null}
            </View>

            <TouchableOpacity style={styles.sharePrimaryButton} activeOpacity={0.9} onPress={handleConfirmShare}>
              <Ionicons name="share-social-outline" size={18} color="#FFFFFF" />
              <Text style={styles.sharePrimaryButtonText}>{tx('Sosyalde Paylaş', 'Share to Social')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {isPreparingShare ? (
        <View style={styles.sharePreparingOverlay}>
          <View style={styles.sharePreparingBox}>
            <ActivityIndicator size="small" color={Colors.primary} />
            <Text style={styles.sharePreparingText}>{tx('Paylaşım hazırlanıyor...', 'Preparing share...')}</Text>
          </View>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  searchButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingTop: 16,
  },
  
  // Sections
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  seeAllText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500',
  },
  filterButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(78, 205, 196, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Recent Routes
  recentList: {
    paddingHorizontal: 20,
    gap: 12,
  },
  recentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    width: 280,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  recentIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(78, 205, 196, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentInfo: {
    flex: 1,
    marginLeft: 12,
  },
  recentName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  recentDate: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  recentStats: {
    alignItems: 'flex-end',
    marginRight: 8,
  },
  recentDistance: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  recentDuration: {
    fontSize: 12,
    color: Colors.textSecondary,
  },

  // Categories
  categoriesContainer: {
    paddingLeft: 20,
    marginBottom: 20,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  categoryChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  categoryLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textSecondary,
    marginLeft: 6,
  },
  categoryLabelActive: {
    color: '#FFFFFF',
  },

  // Route Cards
  routeCardAnimated: {
    marginHorizontal: 20,
    marginBottom: 16,
  },
  routeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
    overflow: 'hidden',
  },
  cardImageContainer: {
    height: 180,
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  imageGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  favoriteButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  difficultyBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  difficultyDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  difficultyText: {
    fontSize: 12,
    fontWeight: '600',
  },
  dateBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  dateText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  imageOverlayInfo: {
    position: 'absolute',
    bottom: 12,
    left: 16,
    right: 16,
  },
  routeName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  locationText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
  },
  cardContent: {
    padding: 16,
  },
  
  // Ana istatistikler grid
  mainStatsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  mainStatBox: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    marginHorizontal: 4,
  },
  mainStatValue: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 6,
  },
  mainStatLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  
  // Detay bilgileri
  detailsSection: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  detailItem: {
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 2,
  },
  
  // Durum badge'leri
  conditionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  conditionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  conditionText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#F57C00',
  },
  
  // Notlar
  notesSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  notesText: {
    flex: 1,
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  
  // Butonlar
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(78, 205, 196, 0.1)',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  emptyHint: {
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 20,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EEF2F6',
  },
  emptyHintTitle: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  emptyHintText: {
    marginTop: 8,
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  shareModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  shareModalBackdropTouch: {
    ...StyleSheet.absoluteFillObject,
  },
  shareModalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 12,
  },
  shareModalHeader: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F7',
  },
  shareModalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  shareCloseButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareMapImage: {
    width: '100%',
    height: 180,
    backgroundColor: '#E2E8F0',
  },
  shareMapFrame: {
    width: '100%',
    height: 190,
    backgroundColor: '#E2E8F0',
  },
  shareStartDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  shareEndDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#EF4444',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  shareMapOverlayPill: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  shareMapOverlayText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  shareMapPlaceholder: {
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    gap: 8,
  },
  shareMapPlaceholderText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  shareRouteBody: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  shareRouteTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  shareRoutePath: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
    marginBottom: 12,
  },
  shareHighlightBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  shareHighlightTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  shareHighlightText: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 17,
    fontWeight: '600',
  },
  shareStatsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  shareStatPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  shareStatText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  shareQuoteBox: {
    marginTop: 10,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  shareQuoteText: {
    flex: 1,
    fontSize: 12,
    color: '#334155',
    lineHeight: 17,
    fontWeight: '600',
  },
  shareLinkBox: {
    marginTop: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  shareLinkText: {
    flex: 1,
    fontSize: 11,
    color: '#1D4ED8',
    fontWeight: '700',
  },
  sharePrimaryButton: {
    marginHorizontal: 16,
    marginBottom: 16,
    marginTop: 2,
    backgroundColor: Colors.primaryDark,
    borderRadius: 14,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  sharePrimaryButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  sharePreparingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sharePreparingBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sharePreparingText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
});
