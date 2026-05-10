import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  TextInput,
  ActivityIndicator,
  Dimensions,
  Platform,
  Modal,
  ScrollView,
  Animated,
  Image,
  StatusBar,
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import RouteSelectionModal from '../../components/ui/RouteSelectionModal';
import NavigationView from '../../components/ui/NavigationView';
import SessionSummaryScreen from './SessionSummaryScreen';
import { useMapPreload } from '../../components/context/MapPreloadContext';
import { useAppAlert } from '../../components/context/AppAlertContext';
import { useAuth } from '../../components/context/AuthContext';
import { useLanguage } from '../../components/context/LanguageContext';
import {
  getRouteUrl,
  getRoutesUrl,
  getGooglePlacesAutocompleteUrl,
  getGooglePlaceDetailsUrl,
  getGoogleGeocodingUrl,
} from '../../config/api';
import { buildSaveRoutePayload } from '../../utils/savedRoutes';
import { getMapProvider } from '../../constants/mapProvider';
import { Colors } from '../../constants/Colors';
import Svg, { Path, Circle, Ellipse } from 'react-native-svg';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const toRad = (v) => (v * Math.PI) / 180;
const haversineMetersMap = (a, b) => {
  if (!a || !b) return 0;
  const R = 6371000;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const la1 = toRad(a.latitude);
  const la2 = toRad(b.latitude);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
};

/** API blok ortalaması |eğim| (%) — yeşil → sarı → turuncu → kırmızı (ara değerler RGB lerp) */
function slopeAvgAbsPctToColor(pct) {
  const p = Math.max(0, Number(pct) || 0);
  const stops = [
    [0, [0x43, 0xa0, 0x47]],
    [4, [0xcd, 0xdc, 0x39]],
    [8, [0xff, 0xeb, 0x3b]],
    [12, [0xff, 0x98, 0x00]],
    [18, [0xe5, 0x39, 0x35]],
  ];
  const last = stops[stops.length - 1];
  if (p >= last[0]) {
    const c = last[1];
    const h = (n) => n.toString(16).padStart(2, '0');
    return `#${h(c[0])}${h(c[1])}${h(c[2])}`;
  }
  for (let i = 0; i < stops.length - 1; i++) {
    const [p0, c0] = stops[i];
    const [p1, c1] = stops[i + 1];
    if (p <= p1) {
      const t = p <= p0 ? 0 : (p - p0) / (p1 - p0);
      const r = Math.round(c0[0] + (c1[0] - c0[0]) * t);
      const g = Math.round(c0[1] + (c1[1] - c0[1]) * t);
      const b = Math.round(c0[2] + (c1[2] - c0[2]) * t);
      const h = (n) => n.toString(16).padStart(2, '0');
      return `#${h(r)}${h(g)}${h(b)}`;
    }
  }
  return '#43A047';
}

function chunkCoordsToMapFormat(chunkCoords) {
  if (!chunkCoords || !Array.isArray(chunkCoords)) return [];
  return chunkCoords
    .map((pt) => {
      if (Array.isArray(pt) && pt.length >= 2) {
        return { latitude: pt[0], longitude: pt[1] };
      }
      if (pt && typeof pt === 'object' && pt.latitude != null && pt.longitude != null) {
        return { latitude: Number(pt.latitude), longitude: Number(pt.longitude) };
      }
      return null;
    })
    .filter(Boolean);
}

function chunkAvgAbsSlopePct(chunk) {
  if (!chunk || typeof chunk !== 'object') return 0;
  const v = chunk.avgAbsSlopePct ?? chunk.avg_abs_slope_pct;
  return Number(v) || 0;
}

function routeTypeToColor(type) {
  const t = String(type || '').toLowerCase();
  if (t === 'shortest') return Colors.routeShortest;
  if (t === 'balanced') return Colors.routeBalanced || '#7DC3FF';
  if (t === 'easiest') return '#43A047';
  return Colors.primary;
}

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
    description: prediction?.description || '',
    icon: 'location',
    source: 'google',
  };
}

function normalizeRouteReplayCoordinates(polylineInput) {
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
}

// Modern Marker Bileşeni - Kullanıcı Konumu (Küçük)
const UserLocationMarker = () => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.4,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <View style={styles.userLocationContainer}>
      <Animated.View 
        style={[
          styles.userLocationPulse,
          {
            transform: [{ scale: pulseAnim }],
          }
        ]} 
      />
      <View style={styles.userLocationDot}>
        <View style={styles.userLocationInner} />
      </View>
    </View>
  );
};

// Flaticon Stil Pin - Başlangıç (Küçük)
const StartMarker = () => (
  <View style={styles.pinContainer}>
    <Svg width="32" height="40" viewBox="0 0 24 32">
      <Path
        d="M12 0C7.03 0 3 4.03 3 9c0 6.75 9 23 9 23s9-16.25 9-23c0-4.97-4.03-9-9-9z"
        fill="#4ECDC4"
      />
      <Circle cx="12" cy="9" r="4" fill="#FFFFFF" />
    </Svg>
    <Ellipse 
      cx="16" 
      cy="36" 
      rx="8" 
      ry="2" 
      fill="#00000015" 
      style={styles.pinShadow}
    />
  </View>
);

// Flaticon Stil Pin - Hedef (Küçük)
const EndMarker = () => (
  <View style={styles.pinContainer}>
    <Svg width="32" height="40" viewBox="0 0 24 32">
      <Path
        d="M12 0C7.03 0 3 4.03 3 9c0 6.75 9 23 9 23s9-16.25 9-23c0-4.97-4.03-9-9-9z"
        fill="#FF6B6B"
      />
      <Path
        d="M12 5l1.5 4.5H18l-3.75 2.73L15.75 17 12 14.27 8.25 17l1.5-4.77L6 9.5h4.5z"
        fill="#FFFFFF"
      />
    </Svg>
    <Ellipse 
      cx="16" 
      cy="36" 
      rx="8" 
      ry="2" 
      fill="#00000015" 
      style={styles.pinShadow}
    />
  </View>
);

// Özel harita stilleri
const MAP_STYLES = {
  standard: [],
  dark: [
    { elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#38414e' }] },
    { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#212a37' }] },
    { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#9ca5b3' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#17263c' }] },
  ],
  minimal: [
    { elementType: 'labels', stylers: [{ visibility: 'off' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
    { featureType: 'landscape', stylers: [{ color: '#f5f5f5' }] },
    { featureType: 'water', stylers: [{ color: '#c9e5f7' }] },
  ],
};

export default function MapScreen({ route }) {
  const { initialLocation, locationPermission } = useMapPreload();
  const { showAlert } = useAppAlert();
  const { isAuthenticated, createSavedRoute } = useAuth();
  const { tx } = useLanguage();
  const [isSavingRoute, setIsSavingRoute] = useState(false);
  const [location, setLocation] = useState(initialLocation);
  const [showSlopeHeatmap, setShowSlopeHeatmap] = useState(false);
  const [startPoint, setStartPoint] = useState(initialLocation);
  const [endPoint, setEndPoint] = useState(null);
  const [showRouteSelection, setShowRouteSelection] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [showSessionSummary, setShowSessionSummary] = useState(false);
  const [sessionSummaryData, setSessionSummaryData] = useState(null);
  const sessionSummaryRef = useRef(null);
  const [startAddress, setStartAddress] = useState('');
  const [endAddress, setEndAddress] = useState('');
  const [startResolvedAddress, setStartResolvedAddress] = useState('');
  const [endResolvedAddress, setEndResolvedAddress] = useState('');
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [routeStatsFromApi, setRouteStatsFromApi] = useState(null); // ODOS API'den gelen rotalar (modal + harita)
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);   // Haritada hangi rota vurgulu (0, 1, 2)
  const [profileMapPoint, setProfileMapPoint] = useState(null);      // Profil grafiğinde seçilen konumun harita noktası
  
  // Arama state'leri
  const [activeSearchField, setActiveSearchField] = useState(null); // 'start' veya 'end'
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchAnim = useRef(new Animated.Value(0)).current;
  const searchDebounceRef = useRef(null);
  const placesRequestIdRef = useRef(0);
  const placesSessionTokenRef = useRef(null);
  const placesCacheRef = useRef(new Map());
  const placeDetailsCacheRef = useRef(new Map());
  const reverseGeocodeCacheRef = useRef(new Map());
  const consumedPlannerPrefillRef = useRef(null);
  const consumedReplaySessionRef = useRef(null);
  const navLocationSmoothRef = useRef(null);
  const rerouteInFlightRef = useRef(false);
  
  // Mock lokasyon verileri - İstanbul
  const mockLocations = [
    { id: 1, name: 'Taksim Meydanı', address: 'Beyoğlu, İstanbul', latitude: 41.0370, longitude: 28.9850, icon: 'location' },
    { id: 2, name: 'Galata Kulesi', address: 'Beyoğlu, İstanbul', latitude: 41.0256, longitude: 28.9741, icon: 'business' },
    { id: 3, name: 'Kadıköy İskele', address: 'Kadıköy, İstanbul', latitude: 40.9910, longitude: 29.0235, icon: 'boat' },
    { id: 4, name: 'Beşiktaş Meydanı', address: 'Beşiktaş, İstanbul', latitude: 41.0422, longitude: 29.0067, icon: 'location' },
    { id: 5, name: 'Eminönü', address: 'Fatih, İstanbul', latitude: 41.0177, longitude: 28.9712, icon: 'storefront' },
    { id: 6, name: 'Sultanahmet Camii', address: 'Fatih, İstanbul', latitude: 41.0054, longitude: 28.9768, icon: 'business' },
    { id: 7, name: 'Dolmabahçe Sarayı', address: 'Beşiktaş, İstanbul', latitude: 41.0391, longitude: 29.0005, icon: 'business' },
    { id: 8, name: 'İstanbul Havalimanı', address: 'Arnavutköy, İstanbul', latitude: 41.2753, longitude: 28.7519, icon: 'airplane' },
    { id: 9, name: 'Sabiha Gökçen Havalimanı', address: 'Pendik, İstanbul', latitude: 40.8986, longitude: 29.3092, icon: 'airplane' },
    { id: 10, name: 'Levent Metro', address: 'Beşiktaş, İstanbul', latitude: 41.0794, longitude: 29.0117, icon: 'subway' },
    { id: 11, name: 'Nişantaşı', address: 'Şişli, İstanbul', latitude: 41.0480, longitude: 28.9945, icon: 'cart' },
    { id: 12, name: 'Bağdat Caddesi', address: 'Kadıköy, İstanbul', latitude: 40.9631, longitude: 29.0642, icon: 'walk' },
    { id: 13, name: 'Maçka Parkı', address: 'Şişli, İstanbul', latitude: 41.0455, longitude: 28.9940, icon: 'leaf' },
    { id: 14, name: 'Bebek Sahili', address: 'Beşiktaş, İstanbul', latitude: 41.0768, longitude: 29.0435, icon: 'water' },
    { id: 15, name: 'Ortaköy Meydanı', address: 'Beşiktaş, İstanbul', latitude: 41.0477, longitude: 29.0266, icon: 'cafe' },
  ];
  
  // Üst arama kartı ve harita kontrolleri: yalnızca kullanıcı modalden bir rota seçip navigasyona geçince gizlenir (hedef varken de düzeltilebilir)
  const shouldShowPreRouteUI = !selectedRoute;
  
  const mapRef = useRef(null);
  
  const initialRegion = initialLocation ? {
    latitude: initialLocation.latitude,
    longitude: initialLocation.longitude,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  } : {
    latitude: 41.0082,
    longitude: 28.9784,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };

  useEffect(() => {
    // Eğer splash screen sırasında konum alınmadıysa tekrar dene
    if (!initialLocation) {
      getCurrentLocation();
    } else {
      setLocation(initialLocation);
      setStartPoint(initialLocation);
    }
  }, [initialLocation]);

  useEffect(() => {
    if (!isNavigating) {
      navLocationSmoothRef.current = null;
    }
  }, [isNavigating]);

  useEffect(() => {
    let sub = null;
    const startWatch = async () => {
      if (!isNavigating) return;
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 1000,
          distanceInterval: 5,
        },
        (pos) => {
          const c = pos?.coords;
          if (!c) return;
          if (c.accuracy != null && Number.isFinite(c.accuracy) && c.accuracy > 130) {
            return;
          }
          const raw = {
            latitude: c.latitude,
            longitude: c.longitude,
            speed: c.speed,
            heading: c.heading >= 0 && Number.isFinite(c.heading) ? c.heading : undefined,
          };
          const prev = navLocationSmoothRef.current;
          if (!prev) {
            navLocationSmoothRef.current = raw;
            setLocation(raw);
            return;
          }
          const d = haversineMetersMap(prev, raw);
          if (d > 130) {
            navLocationSmoothRef.current = raw;
            setLocation({
              ...raw,
              heading: raw.heading ?? prev.heading,
            });
            return;
          }
          const alpha = d > 35 ? 0.42 : d > 10 ? 0.26 : 0.14;
          const blended = {
            latitude: prev.latitude * (1 - alpha) + raw.latitude * alpha,
            longitude: prev.longitude * (1 - alpha) + raw.longitude * alpha,
            speed: raw.speed,
            heading: raw.heading ?? prev.heading,
          };
          navLocationSmoothRef.current = blended;
          setLocation(blended);
        }
      );
    };
    startWatch();
    return () => {
      if (sub) sub.remove();
    };
  }, [isNavigating]);

  useEffect(() => {
    if (!profileMapPoint?.coordinate || !mapRef.current || isNavigating) return;
    mapRef.current.animateToRegion(
      {
        latitude: profileMapPoint.coordinate.latitude,
        longitude: profileMapPoint.coordinate.longitude,
        latitudeDelta: 0.008,
        longitudeDelta: 0.008,
      },
      220
    );
  }, [profileMapPoint, isNavigating]);

  const getCurrentLocation = async () => {
    try {
      // Konum izni zaten varsa direkt konum al
      let status = locationPermission;
      if (status !== 'granted') {
        const { status: newStatus } = await Location.requestForegroundPermissionsAsync();
        status = newStatus;
        if (status !== 'granted') {
          showAlert({
            title: tx('İzin gerekli', 'Permission required'),
            message: tx('Konum izni verilmedi.', 'Location permission was not granted.'),
            type: 'warning',
          });
          return;
        }
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const { latitude, longitude } = currentLocation.coords;
      setLocation({ latitude, longitude });
      
      if (!startPoint) {
        setStartPoint({ latitude, longitude });
      }
    } catch (error) {
      console.error('Konum alınamadı:', error);
    }
  };

  const clearSearchDebounce = () => {
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
      searchDebounceRef.current = null;
    }
  };

  const resolveGooglePlaceCoordinate = async (place) => {
    if (!place?.placeId) return null;

    const cached = placeDetailsCacheRef.current.get(place.placeId);
    if (cached) return cached;

    const sessionToken = placesSessionTokenRef.current || createPlacesSessionToken();
    placesSessionTokenRef.current = sessionToken;
    const requestId = ++placesRequestIdRef.current;

    const response = await fetch(
      getGooglePlaceDetailsUrl({
        placeId: place.placeId,
        sessionToken,
      })
    );
    const data = await response.json();

    if (requestId !== placesRequestIdRef.current) {
      return null;
    }

    if (!response.ok || data?.status !== 'OK') {
      throw new Error(data?.error_message || data?.status || 'Place details failed');
    }

    const locationData = data?.result?.geometry?.location;
    if (!locationData || !Number.isFinite(locationData.lat) || !Number.isFinite(locationData.lng)) {
      throw new Error('Place coordinate unavailable');
    }

    const resolved = {
      latitude: locationData.lat,
      longitude: locationData.lng,
      name: data?.result?.name || place.name,
      address: data?.result?.formatted_address || place.address || '',
    };

    placeDetailsCacheRef.current.set(place.placeId, resolved);
    return resolved;
  };

  const resolveAddressFromCoordinate = useCallback(async (coordinate, fallbackLabel = '') => {
    if (!coordinate || !Number.isFinite(coordinate.latitude) || !Number.isFinite(coordinate.longitude)) {
      return fallbackLabel || tx('Bilinmeyen Konum', 'Unknown location');
    }

    const cacheKey = `${coordinate.latitude.toFixed(5)},${coordinate.longitude.toFixed(5)}`;
    const cached = reverseGeocodeCacheRef.current.get(cacheKey);
    if (cached) return cached;

    const normalizeGoogleGeocodeResult = (result) => {
      if (!result || typeof result !== 'object') return null;
      const components = Array.isArray(result.address_components) ? result.address_components : [];
      const pick = (type) => components.find((c) => Array.isArray(c.types) && c.types.includes(type))?.long_name;
      const streetNumber = pick('street_number');
      const routeName = pick('route');
      const neighborhood = pick('neighborhood') || pick('sublocality') || pick('sublocality_level_1');
      const locality = pick('locality') || pick('administrative_area_level_2');

      const line = [routeName, streetNumber].filter(Boolean).join(' ').trim();
      return (
        line ||
        neighborhood ||
        locality ||
        (typeof result.formatted_address === 'string' ? result.formatted_address.split(',')[0]?.trim() : null) ||
        null
      );
    };

    try {
      const rows = await Location.reverseGeocodeAsync({
        latitude: coordinate.latitude,
        longitude: coordinate.longitude,
      });
      const row = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;

      const streetLine = [row?.street, row?.streetNumber].filter(Boolean).join(' ').trim();
      const primary =
        row?.name ||
        streetLine ||
        row?.district ||
        row?.subregion ||
        row?.city ||
        row?.region ||
        fallbackLabel ||
        tx('Seçilen Konum', 'Selected Location');

      const normalized = String(primary).trim();
      reverseGeocodeCacheRef.current.set(cacheKey, normalized);
      return normalized;
    } catch {
      try {
        const response = await fetch(
          getGoogleGeocodingUrl({
            latitude: coordinate.latitude,
            longitude: coordinate.longitude,
          }),
        );
        const data = await response.json();
        const first = Array.isArray(data?.results) && data.results.length > 0 ? data.results[0] : null;
        const googleLabel = normalizeGoogleGeocodeResult(first);
        if (googleLabel) {
          reverseGeocodeCacheRef.current.set(cacheKey, googleLabel);
          return googleLabel;
        }
      } catch {
        // fallback below
      }
      return fallbackLabel || tx('Seçilen Konum', 'Selected Location');
    }
  }, [tx]);

  const fitRouteOnMap = async (origin, destination) => {
    if (!origin || !destination) return false;

    await fetchRouteFromAPI(origin, destination);

    if (mapRef.current) {
      mapRef.current.fitToCoordinates([origin, destination], {
        edgePadding: { top: 150, right: 50, bottom: 300, left: 50 },
        animated: true,
      });
    }

    setTimeout(() => setShowRouteSelection(true), 500);
    return true;
  };

  useEffect(() => {
    const prefill = route?.params?.plannerPrefill;
    const prefillId = prefill?.requestId;
    if (!prefill || !prefillId || consumedPlannerPrefillRef.current === prefillId) {
      return;
    }

    consumedPlannerPrefillRef.current = prefillId;

    const applyPrefill = async () => {
      if (prefill.startAddress) {
        setStartAddress(prefill.startAddress);
        setStartResolvedAddress(prefill.startAddress);
      }
      if (prefill.endAddress) {
        setEndAddress(prefill.endAddress);
        setEndResolvedAddress(prefill.endAddress);
      }
      if (prefill.startPoint && Number.isFinite(prefill.startPoint.latitude) && Number.isFinite(prefill.startPoint.longitude)) {
        setStartPoint(prefill.startPoint);
      }
      if (prefill.endPoint && Number.isFinite(prefill.endPoint.latitude) && Number.isFinite(prefill.endPoint.longitude)) {
        setEndPoint(prefill.endPoint);
      }

      const hasStart = prefill.startPoint && Number.isFinite(prefill.startPoint.latitude) && Number.isFinite(prefill.startPoint.longitude);
      const hasEnd = prefill.endPoint && Number.isFinite(prefill.endPoint.latitude) && Number.isFinite(prefill.endPoint.longitude);
      if (hasStart && hasEnd) {
        await fitRouteOnMap(prefill.startPoint, prefill.endPoint);
      }
    };

    void applyPrefill();
  }, [route?.params?.plannerPrefill]);

  useEffect(() => {
    const replay = route?.params?.replaySession;
    const replayId = replay?.requestId;
    if (!replay || !replayId || consumedReplaySessionRef.current === replayId) {
      return;
    }

    consumedReplaySessionRef.current = replayId;

    const coordinates = normalizeRouteReplayCoordinates(replay.coordinates);
    if (coordinates.length < 2) {
      showAlert({
        title: tx('Tekrar Yürü', 'Walk Again'),
        message: tx('Kayıtlı rotanın izi bulunamadı.', 'Saved route polyline is unavailable.'),
        type: 'warning',
      });
      return;
    }

    const start = Number.isFinite(replay?.startPoint?.latitude) && Number.isFinite(replay?.startPoint?.longitude)
      ? replay.startPoint
      : coordinates[0];
    const end = Number.isFinite(replay?.endPoint?.latitude) && Number.isFinite(replay?.endPoint?.longitude)
      ? replay.endPoint
      : coordinates[coordinates.length - 1];

    setShowSessionSummary(false);
    setSessionSummaryData(null);
    sessionSummaryRef.current = null;

    setStartAddress(replay.startAddress || '');
    setEndAddress(replay.endAddress || '');
    setStartResolvedAddress(replay.startAddress || '');
    setEndResolvedAddress(replay.endAddress || '');
    setStartPoint(start);
    setEndPoint(end);
    setRouteCoordinates(coordinates);
    setRouteStatsFromApi(null);
    setSelectedRouteIndex(0);
    setShowRouteSelection(false);
    setProfileMapPoint(null);
    setActiveSearchField(null);
    setSearchResults([]);
    setIsSearching(false);

    setSelectedRoute({
      id: replayId,
      type: replay.routeType || 'balanced',
      label: replay.title || 'Kaydedilen Rota',
      coordinates,
      color: routeTypeToColor(replay.routeType || 'balanced'),
      difficulty: replay.difficulty || 'medium',
      estimatedEffort: 'Medium',
      distance: replay.distanceLabel || '—',
      duration: replay.durationLabel || '—',
      calories: replay.caloriesLabel || '—',
      totalClimb: replay.elevationGainLabel || '—',
    });
    setIsNavigating(true);
  }, [route?.params?.replaySession, showAlert, tx]);

  const handleSearchPress = () => {
    showAlert({
      title: tx('Arama', 'Search'),
      message: tx('Hedef seçme özelliği yakında eklenecek.', 'Destination selection will be added soon.'),
      type: 'info',
    });
  };

  useEffect(() => {
    clearSearchDebounce();

    if (!activeSearchField) {
      setIsSearching(false);
      return undefined;
    }

    const query = activeSearchField === 'start' ? startAddress : endAddress;
    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      placesRequestIdRef.current += 1;
      setIsSearching(false);
      setSearchResults([]);
      return undefined;
    }

    if (trimmedQuery.length < 3) {
      setIsSearching(false);
      setSearchResults([]);
      return undefined;
    }

    const cacheKey = `${activeSearchField}:${trimmedQuery.toLowerCase()}`;
    const cachedResults = placesCacheRef.current.get(cacheKey);
    if (cachedResults) {
      setIsSearching(false);
      setSearchResults(cachedResults);
      return undefined;
    }

    setIsSearching(true);
    const requestId = ++placesRequestIdRef.current;

    searchDebounceRef.current = setTimeout(async () => {
      try {
        const sessionToken = placesSessionTokenRef.current || createPlacesSessionToken();
        placesSessionTokenRef.current = sessionToken;
        const url = getGooglePlacesAutocompleteUrl({
          input: trimmedQuery,
          sessionToken,
          latitude: location?.latitude,
          longitude: location?.longitude,
          radius: 40000,
        });

        const response = await fetch(url);
        const data = await response.json();

        if (requestId !== placesRequestIdRef.current) {
          return;
        }

        if (!response.ok || (data?.status && data.status !== 'OK' && data.status !== 'ZERO_RESULTS')) {
          throw new Error(data?.error_message || data?.status || 'Autocomplete failed');
        }

        const predictions = Array.isArray(data?.predictions) ? data.predictions.slice(0, 5) : [];
        const normalized = predictions.map(normalizeGooglePrediction).filter((item) => item.id);
        const results = normalized.length > 0
          ? normalized
          : mockLocations
              .filter((item) => {
                const haystack = `${item.name} ${item.address}`.toLowerCase();
                return haystack.includes(trimmedQuery.toLowerCase());
              })
              .slice(0, 5);

        placesCacheRef.current.set(cacheKey, results);
        setSearchResults(results);
      } catch (error) {
        if (requestId !== placesRequestIdRef.current) {
          return;
        }

        const fallbackResults = mockLocations
          .filter((item) => {
            const haystack = `${item.name} ${item.address}`.toLowerCase();
            return haystack.includes(trimmedQuery.toLowerCase());
          })
          .slice(0, 5);

        setSearchResults(fallbackResults);
      } finally {
        if (requestId === placesRequestIdRef.current) {
          setIsSearching(false);
        }
      }
    }, 420);

    return () => clearSearchDebounce();
  }, [activeSearchField, endAddress, location?.latitude, location?.longitude, startAddress]);

  // Arama fonksiyonu
  const handleSearch = (text, field) => {
    if (field === 'start') {
      setStartAddress(text);
    } else {
      setEndAddress(text);
    }
  };

  // Benim Konumum seçildiğinde
  const handleSelectMyLocation = async () => {
    if (!location) {
      showAlert({
        title: tx('Konum bulunamadı', 'Location unavailable'),
        message: tx('Lütfen konum izni verin ve tekrar deneyin.', 'Please allow location access and try again.'),
        type: 'error',
      });
      return;
    }
    
    const coordinate = { latitude: location.latitude, longitude: location.longitude };
    const nextStart = activeSearchField === 'start' ? coordinate : startPoint;
    const nextEnd = activeSearchField === 'end' ? coordinate : endPoint;
    
    const resolvedLabel = await resolveAddressFromCoordinate(
      coordinate,
      tx('Benim Konumum', 'My Location'),
    );

    if (activeSearchField === 'start') {
      setStartAddress(tx('Benim Konumum', 'My Location'));
      setStartResolvedAddress(resolvedLabel);
      setStartPoint(coordinate);
    } else {
      setEndAddress(tx('Benim Konumum', 'My Location'));
      setEndResolvedAddress(resolvedLabel);
      setEndPoint(coordinate);
    }

    if (nextStart && nextEnd) {
      await fitRouteOnMap(nextStart, nextEnd);
    }
    
    // Aramayı kapat
    clearSearchDebounce();
    placesSessionTokenRef.current = null;
    placesRequestIdRef.current += 1;
    setSearchResults([]);
    setActiveSearchField(null);
    setIsSearching(false);
    Animated.timing(searchAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  // Lokasyon seçildiğinde
  const handleSelectLocation = async (location) => {
    const coordinate = Number.isFinite(location?.latitude) && Number.isFinite(location?.longitude)
      ? { latitude: location.latitude, longitude: location.longitude }
      : await resolveGooglePlaceCoordinate(location);

    if (!coordinate) {
      showAlert({
        title: tx('Konum alınamadı', 'Location unavailable'),
        message: tx('Seçilen yerin koordinatları alınamadı.', 'Could not resolve the selected place coordinates.'),
        type: 'error',
      });
      return;
    }
    const nextStart = activeSearchField === 'start' ? coordinate : startPoint;
    const nextEnd = activeSearchField === 'end' ? coordinate : endPoint;
    
    if (activeSearchField === 'start') {
      setStartAddress(location.name);
      setStartResolvedAddress(location.name || location.address || '');
      setStartPoint(coordinate);
    } else {
      setEndAddress(location.name);
      setEndResolvedAddress(location.name || location.address || '');
      setEndPoint(coordinate);
    }

    if (nextStart && nextEnd) {
      await fitRouteOnMap(nextStart, nextEnd);
    }
    
    // Aramayı kapat
    clearSearchDebounce();
    placesSessionTokenRef.current = null;
    placesRequestIdRef.current += 1;
    setSearchResults([]);
    setActiveSearchField(null);
    setIsSearching(false);
    Animated.timing(searchAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  // Arama alanına focus olduğunda
  const handleSearchFocus = (field) => {
    setActiveSearchField(field);
    placesSessionTokenRef.current = createPlacesSessionToken();
    setSearchResults([]);
    
    Animated.spring(searchAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 100,
      friction: 10,
    }).start();
  };

  // Aramayı kapat
  const closeSearch = () => {
    clearSearchDebounce();
    setActiveSearchField(null);
    setSearchResults([]);
    setIsSearching(false);
    placesSessionTokenRef.current = null;
    placesRequestIdRef.current += 1;
    Animated.timing(searchAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const handleMapPress = async (e) => {
    if (isNavigating) return; // Navigasyon sırasında disable

    // Rota çiziliyken harita tıklaması yeni nokta/reset yapmasın; sadece rota iptal edildikten sonra yeni rota seçilebilsin
    const hasRouteDrawn = (routeStatsFromApi && routeStatsFromApi.length > 0) || (endPoint && routeCoordinates.length > 0);
    if (hasRouteDrawn) return;

    const coordinate = e.nativeEvent.coordinate;

    if (!startPoint) {
      setStartPoint(coordinate);
      setRouteCoordinates([]);
      const startLabel = await resolveAddressFromCoordinate(
        coordinate,
        tx('Başlangıç Noktası', 'Start Point'),
      );
      setStartAddress(tx('Benim Konumum', 'My Location'));
      setStartResolvedAddress(startLabel);
    } else if (!endPoint) {
      setEndPoint(coordinate);
      const endLabel = await resolveAddressFromCoordinate(
        coordinate,
        tx('Seçilen Hedef', 'Selected Destination'),
      );
      setEndAddress(tx('Hedef', 'Destination'));
      setEndResolvedAddress(endLabel);
      await fitRouteOnMap(startPoint, coordinate);
    } else {
      setStartPoint(coordinate);
      const startLabel = await resolveAddressFromCoordinate(
        coordinate,
        tx('Başlangıç Noktası', 'Start Point'),
      );
      setStartAddress(tx('Benim Konumum', 'My Location'));
      setStartResolvedAddress(startLabel);
      setEndPoint(null);
      setEndAddress('');
      setEndResolvedAddress('');
      setSelectedRoute(null);
      setRouteCoordinates([]);
      setRouteStatsFromApi(null);
      setSelectedRouteIndex(0);
    }
  };

  /** Rota seçimini iptal et; ardından haritaya tıklayarak yeni hedef seçilebilir */
  const handleCancelRoute = () => {
    setEndPoint(null);
    setEndAddress('');
    setEndResolvedAddress('');
    setSelectedRoute(null);
    setRouteCoordinates([]);
    setRouteStatsFromApi(null);
    setSelectedRouteIndex(0);
    setShowRouteSelection(false);
    setProfileMapPoint(null);
  };

  const handleRouteSelect = (route) => {
    if (!route || typeof route !== 'object' || route.nativeEvent != null) return;
    if (route.id == null && route.label == null) return;
    if (route.coordinates && route.coordinates.length > 0) {
      setRouteCoordinates(route.coordinates);
    }
    const idx = routeStatsFromApi?.findIndex((r) => r.id === route.id || (r.type === route.type && r.label === route.label));
    if (typeof idx === 'number' && idx >= 0) setSelectedRouteIndex(idx);
    setSelectedRoute({
      ...route,
      coordinates: route.coordinates || routeCoordinates,
      difficulty: route.type === 'easiest' ? 'easy' : 'medium',
      estimatedEffort: route.type === 'easiest' ? 'Low' : route.type === 'shortest' ? 'Medium' : 'Medium',
    });
    setShowRouteSelection(false);
    setIsNavigating(true);
    setProfileMapPoint(null);
  };

  const handleStartNavigation = (route) => {
    setIsNavigating(true);
  };

  /** Navigasyon bittikten veya yeni oturum başlatılınca haritayı tekrar planlama moduna alır */
  const resetMapToPlanningMode = useCallback(() => {
    setShowRouteSelection(false);
    setSelectedRoute(null);
    setEndPoint(null);
    setEndAddress('');
    setEndResolvedAddress('');
    setRouteCoordinates([]);
    setRouteStatsFromApi(null);
    setSelectedRouteIndex(0);
    setProfileMapPoint(null);
    if (location && Number.isFinite(location.latitude) && Number.isFinite(location.longitude)) {
      setStartPoint({ latitude: location.latitude, longitude: location.longitude });
      setStartAddress('Benim Konumum');
      setStartResolvedAddress('');
    }
  }, [location, tx]);

  const handleCloseNavigation = (payload) => {
    setIsNavigating(false);
    if (payload?.showSummary && payload?.summary) {
      setSessionSummaryData(payload.summary);
      setShowSessionSummary(true);
    }
    // "Rotayı Bitir" (özetli) ve sol üst X ile çıkış (özetsiz) akışlarının ikisinde de
    // haritayı planlama moduna döndür; aksi halde rota çizgileri kalıp inputlar gizli kalıyor.
    resetMapToPlanningMode();
  };

  const handleCloseSessionSummary = () => {
    setShowSessionSummary(false);
    setSessionSummaryData(null);
    sessionSummaryRef.current = null;
  };

  const handleStartNewSession = () => {
    setShowSessionSummary(false);
    setSessionSummaryData(null);
    sessionSummaryRef.current = null;
    resetMapToPlanningMode();
  };

  useEffect(() => {
    sessionSummaryRef.current = sessionSummaryData;
  }, [sessionSummaryData]);

  const handleSaveRoute = useCallback(
    async (extras) => {
      const summary = sessionSummaryRef.current;
      if (!summary) return;
      setIsSavingRoute(true);
      try {
        const body = buildSaveRoutePayload(summary, extras || {});
        await createSavedRoute(body);
        showAlert({
          title: tx('Kaydedildi', 'Saved'),
          message: tx('Rotanı Rotalarım sekmesinde görebilirsin.', 'You can view your route in the My Routes tab.'),
          type: 'success',
          buttons: [{ text: 'Tamam' }],
        });
      } catch (err) {
        showAlert({
          title: tx('Kayıt', 'Save'),
          message: err?.message || 'Rota kaydedilemedi',
          type: 'error',
        });
      } finally {
        setIsSavingRoute(false);
      }
    },
    [createSavedRoute, showAlert],
  );

  /** İki rotanın koordinat dizisi aynı/çok benzer mi kontrol eder */
  const routesAreSame = (a, b) => {
    if (!a?.coordinates?.length || !b?.coordinates?.length) return false;
    if (a.coordinates.length !== b.coordinates.length) return false;
    const eps = 1e-5;
    for (let i = 0; i < a.coordinates.length; i++) {
      const p = a.coordinates[i];
      const q = b.coordinates[i];
      const latA = typeof p.latitude === 'number' ? p.latitude : p[0];
      const lonA = typeof p.longitude === 'number' ? p.longitude : p[1];
      const latB = typeof q.latitude === 'number' ? q.latitude : q[0];
      const lonB = typeof q.longitude === 'number' ? q.longitude : q[1];
      if (Math.abs(latA - latB) > eps || Math.abs(lonA - lonB) > eps) return false;
    }
    return true;
  };

  /** Aynı gelen rota seçeneklerini tekilleştirir; kullanıcıya sadece farklı rotalar gösterilir */
  const deduplicateRoutesByPath = (cards) => {
    const out = [];
    for (const card of cards) {
      if (!out.some((existing) => routesAreSame(existing, card))) out.push(card);
    }
    return out.map((r, i) => ({ ...r, id: i + 1 }));
  };

  const mapApiRoutesToCards = (apiRoutes) => {
    const routeColors = {
      shortest: routeTypeToColor('shortest'),
      balanced: routeTypeToColor('balanced'),
      easiest: routeTypeToColor('easiest'),
    };
    const routeIcons = { shortest: 'map-outline', balanced: 'fitness', easiest: 'leaf' };
    const descriptions = {
      shortest: 'Toplam yol uzunluğu en kısa (graf mesafesi, A*).',
      balanced: 'Tobler + hafif tırmanış cezası; süre ve yokuş dengesi.',
      easiest: 'Eğim değişimi az, olabildiğince düz rota.',
    };
    return (apiRoutes || []).map((r, idx) => {
      const coords = (r.coordinates || []).map(([lat, lon]) => ({ latitude: lat, longitude: lon }));
      const hasElev = r.elevationProfile && r.elevationProfile.length > 0;
      const elevationData = hasElev
        ? r.elevationProfile.map((p) => Math.round(p.elevM))
        : [0, Math.round((r.totalClimbM || 0) * 0.5)];
      const kcal =
        r.estimatedCaloriesKcal != null && Number.isFinite(r.estimatedCaloriesKcal)
          ? `${Math.round(r.estimatedCaloriesKcal)} kcal`
          : '—';
      const avgSlopeStr =
        r.avgSlopePct != null && Number.isFinite(r.avgSlopePct)
          ? `~${Math.round(r.avgSlopePct)}% ort.`
          : null;
      return {
        id: idx + 1,
        type: r.type || 'shortest',
        label: r.label || 'Rota',
        description: descriptions[r.type] || r.label || 'Rota',
        totalClimb: `${Math.round(r.totalClimbM || 0)}m`,
        distance: `${(r.distanceKm != null ? r.distanceKm : 0).toFixed(1)} km`,
        distanceKm: r.distanceKm != null && Number.isFinite(r.distanceKm) ? r.distanceKm : 0,
        duration: `${Math.round(r.durationMin != null ? r.durationMin : 0)} dk`,
        calories: kcal,
        avgSlope: avgSlopeStr,
        maxSlopePct: r.maxSlopePct != null && Number.isFinite(r.maxSlopePct) ? r.maxSlopePct : null,
        avgSlopePct: r.avgSlopePct != null && Number.isFinite(r.avgSlopePct) ? r.avgSlopePct : null,
        segments: r.segments || null,
        color: routeColors[r.type] || Colors.primary,
        icon: routeIcons[r.type] || 'fitness',
        elevationData,
        elevationProfile: r.elevationProfile || null,
        shapePoints: Array.isArray(r.shapePoints) ? r.shapePoints : null,
        coordinates: coords,
        recommended: r.type === 'balanced',
        slopePolylineChunks: Array.isArray(r.slopePolylineChunks) ? r.slopePolylineChunks : null,
      };
    });
  };

  // ODOS backend API: 3 rota önerisi (En Kısa mesafe, Dengeli, En Kolay)
  const fetchRouteFromAPI = async (start, end) => {
    if (!start || !end) return [];

    setIsLoadingRoute(true);
    setRouteStatsFromApi(null);

    const url = getRoutesUrl(start.latitude, start.longitude, end.latitude, end.longitude);
    console.log('[ODOS API] Request (3 routes):', url);

    try {
      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok) {
        console.warn('[ODOS API] HTTP', response.status, data?.error || response.statusText);
        const fallbackCoords = generateFallbackRoute(start, end);
        setRouteCoordinates(fallbackCoords);
        setRouteStatsFromApi(null);
        return fallbackCoords;
      }

      if (data.error || !Array.isArray(data.routes) || data.routes.length === 0) {
        console.warn('[ODOS API] Empty or error:', data.error);
        const fallbackCoords = generateFallbackRoute(start, end);
        setRouteCoordinates(fallbackCoords);
        setRouteStatsFromApi(null);
        return fallbackCoords;
      }

      const cards = mapApiRoutesToCards(data.routes);

      const uniqueCards = deduplicateRoutesByPath(cards);
      setRouteStatsFromApi(uniqueCards);
      const defaultRoute = uniqueCards.find((c) => c.recommended) || uniqueCards[0];
      const defaultIndex = uniqueCards.findIndex((c) => c.recommended);
      setSelectedRouteIndex(defaultIndex >= 0 ? defaultIndex : 0);
      const coordsToShow = defaultRoute.coordinates && defaultRoute.coordinates.length > 0
        ? defaultRoute.coordinates
        : (uniqueCards[0].coordinates && uniqueCards[0].coordinates.length > 0 ? uniqueCards[0].coordinates : []);
      setRouteCoordinates(coordsToShow);
      console.log('[ODOS API] OK: unique routes', uniqueCards.length, 'default points:', coordsToShow.length);
      return coordsToShow;
    } catch (error) {
      console.error('[ODOS API] Network error:', error?.message || error);
      const fallbackCoords = generateFallbackRoute(start, end);
      setRouteCoordinates(fallbackCoords);
      return fallbackCoords;
    } finally {
      setIsLoadingRoute(false);
    }
  };

  const handleRerouteRequest = async (currentCoord) => {
    if (!currentCoord || !endPoint) return false;
    if (rerouteInFlightRef.current || isLoadingRoute) return false;
    rerouteInFlightRef.current = true;
    setIsLoadingRoute(true);
    try {
      const url = getRoutesUrl(currentCoord.latitude, currentCoord.longitude, endPoint.latitude, endPoint.longitude);
      const response = await fetch(url);
      const data = await response.json();
      if (!response.ok || data?.error || !Array.isArray(data?.routes) || data.routes.length === 0) {
        return false;
      }
      const cards = deduplicateRoutesByPath(mapApiRoutesToCards(data.routes));
      setRouteStatsFromApi(cards);
      const wantedType = selectedRoute?.type || 'balanced';
      const picked = cards.find((c) => c.type === wantedType) || cards[0];
      if (!picked) return false;
      setSelectedRoute({
        ...picked,
        coordinates: picked.coordinates || [],
        difficulty: picked.type === 'easiest' ? 'easy' : 'medium',
        estimatedEffort: picked.type === 'easiest' ? 'Low' : 'Medium',
      });
      setRouteCoordinates(picked.coordinates || []);
      setSelectedRouteIndex(Math.max(0, cards.findIndex((c) => c.id === picked.id)));
      return true;
    } catch (e) {
      console.warn('[ODOS API] Reroute failed:', e?.message || e);
      return false;
    } finally {
      rerouteInFlightRef.current = false;
      setIsLoadingRoute(false);
    }
  };

  // Google Polyline decode fonksiyonu
  const decodePolyline = (encoded) => {
    const points = [];
    let index = 0;
    let lat = 0;
    let lng = 0;

    while (index < encoded.length) {
      let shift = 0;
      let result = 0;
      let byte;

      do {
        byte = encoded.charCodeAt(index++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20);

      const dlat = (result & 1) ? ~(result >> 1) : (result >> 1);
      lat += dlat;

      shift = 0;
      result = 0;

      do {
        byte = encoded.charCodeAt(index++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20);

      const dlng = (result & 1) ? ~(result >> 1) : (result >> 1);
      lng += dlng;

      points.push({
        latitude: lat / 1e5,
        longitude: lng / 1e5,
      });
    }

    return points;
  };

  // Fallback: Daha gerçekçi görünen kıvrımlı rota
  const generateFallbackRoute = (start, end) => {
    if (!start || !end) return [];
    
    const coordinates = [];
    const steps = 30;
    
    // Ana yön hesapla
    const latDiff = end.latitude - start.latitude;
    const lngDiff = end.longitude - start.longitude;
    
    for (let i = 0; i <= steps; i++) {
      const ratio = i / steps;
      
      // Sokak benzeri kıvrımlar ekle
      let latOffset = 0;
      let lngOffset = 0;
      
      // Her 5-7 adımda bir "dönüş" simüle et
      if (i > 0 && i < steps) {
        const segment = Math.floor(i / 6);
        const isHorizontalSegment = segment % 2 === 0;
        
        if (isHorizontalSegment) {
          // Yatay hareket - sadece longitude değiştir
          latOffset = Math.sin(ratio * Math.PI) * 0.0008 * (segment % 3 - 1);
        } else {
          // Dikey hareket - sadece latitude değiştir  
          lngOffset = Math.cos(ratio * Math.PI) * 0.0008 * (segment % 3 - 1);
        }
      }
      
      coordinates.push({
        latitude: start.latitude + latDiff * ratio + latOffset,
        longitude: start.longitude + lngDiff * ratio + lngOffset,
      });
    }
    
    return coordinates;
  };

  const handleMyLocation = () => {
    if (location && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 1000);
    }
  };

  const slopeRoads = [
    {
      id: 1,
      coordinates: [
        { latitude: 41.0082, longitude: 28.9784 },
        { latitude: 41.0092, longitude: 28.9794 },
        { latitude: 41.0102, longitude: 28.9804 },
      ],
      slope: 'flat',
    },
    {
      id: 2,
      coordinates: [
        { latitude: 41.0102, longitude: 28.9804 },
        { latitude: 41.0112, longitude: 28.9814 },
        { latitude: 41.0122, longitude: 28.9824 },
      ],
      slope: 'moderate',
    },
    {
      id: 3,
      coordinates: [
        { latitude: 41.0062, longitude: 28.9764 },
        { latitude: 41.0072, longitude: 28.9774 },
        { latitude: 41.0082, longitude: 28.9784 },
      ],
      slope: 'steep',
    },
  ];

  const getSlopeColor = (slope) => {
    switch (slope) {
      case 'flat': return '#4CAF50';
      case 'moderate': return '#FFC107';
      case 'steep': return '#F44336';
      default: return '#2196F3';
    }
  };

  const activeSearchQuery = activeSearchField === 'start'
    ? startAddress
    : activeSearchField === 'end'
      ? endAddress
      : '';
  const activeSearchQueryTrimmed = activeSearchQuery.trim();

  return (
    <View style={styles.container}>
      <StatusBar hidden={true} />
      {/* Map View */}
      {!isNavigating && (
        <>
          <MapView
            ref={mapRef}
            style={styles.map}
            provider={getMapProvider()}
            initialRegion={initialRegion}
            showsUserLocation={true}
            showsMyLocationButton={false}
            showsCompass={true}
            showsTraffic={false}
            showsBuildings={false}
            mapType="standard"
            customMapStyle={MAP_STYLES.standard}
            pitch={0}
            rotateEnabled={true}
            pitchEnabled={true}
            onPress={handleMapPress}
          >
            {startPoint && (
              <Marker 
                coordinate={startPoint} 
                anchor={{ x: 0.5, y: 0.9 }}
                tracksViewChanges={false}
              >
                <StartMarker />
              </Marker>
            )}

            {profileMapPoint?.coordinate && !selectedRoute && (
              <Marker
                coordinate={profileMapPoint.coordinate}
                anchor={{ x: 0.5, y: 0.5 }}
              >
                <View style={styles.profileMarkerContainer}>
                  <View style={styles.profileMarkerBadge}>
                    <Text style={styles.profileMarkerText}>
                      {`${(profileMapPoint.distKm ?? 0).toFixed(2)} km`}
                      {profileMapPoint.elevM != null ? ` · ${Math.round(profileMapPoint.elevM)}m` : ''}
                    </Text>
                  </View>
                  <View style={styles.profileMarkerOuter}>
                    <View style={styles.profileMarkerInner} />
                  </View>
                </View>
              </Marker>
            )}

            {endPoint && (
              <Marker 
                coordinate={endPoint} 
                anchor={{ x: 0.5, y: 0.9 }}
                tracksViewChanges={false}
              >
                <EndMarker />
              </Marker>
            )}

            {/* Rota çizgileri: API'den gelen tüm seçenekler (planlama ekranında tema rengi) */}
            {routeStatsFromApi && routeStatsFromApi.length > 0 && !selectedRoute && (
              <>
                {routeStatsFromApi.map((route, index) => {
                  const coords = route.coordinates || [];
                  const isSelected = index === selectedRouteIndex;
                  if (coords.length === 0) return null;
                  const routeColor = route.color || routeTypeToColor(route.type);
                  return (
                    <React.Fragment key={`route-opt-${route.id}-${index}`}>
                      <Polyline
                        coordinates={coords}
                        strokeColor="rgba(0,0,0,0.10)"
                        strokeWidth={isSelected ? 8 : 5}
                        lineCap="round"
                        lineJoin="round"
                        zIndex={700}
                        tappable
                        onPress={() => {
                          setSelectedRouteIndex(index);
                          setRouteCoordinates(coords);
                        }}
                      />
                      <Polyline
                        coordinates={coords}
                        strokeColor={routeColor}
                        strokeWidth={isSelected ? 5 : 3}
                        lineCap="round"
                        lineJoin="round"
                        zIndex={800}
                        tappable
                        onPress={() => {
                          setSelectedRouteIndex(index);
                          setRouteCoordinates(coords);
                        }}
                      />
                    </React.Fragment>
                  );
                })}
              </>
            )}

            {/* Tek rota (fallback / API yok): iki nokta seçildiğinde */}
            {routeCoordinates.length > 0 && !routeStatsFromApi?.length && !selectedRoute && (
              <>
                <Polyline
                  coordinates={routeCoordinates}
                  strokeColor="rgba(0, 0, 0, 0.08)"
                  strokeWidth={8}
                  lineCap="round"
                  lineJoin="round"
                />
                <Polyline
                  coordinates={routeCoordinates}
                  strokeColor="#1A1A2E"
                  strokeWidth={4}
                  lineCap="round"
                  lineJoin="round"
                />
                <Polyline
                  coordinates={routeCoordinates}
                  strokeColor="rgba(255, 255, 255, 0.3)"
                  strokeWidth={1.5}
                  lineCap="round"
                  lineJoin="round"
                />
              </>
            )}

            {/* Seçili rota - navigasyon için */}
            {selectedRoute && selectedRoute.coordinates && (
              <>
                {selectedRoute.slopePolylineChunks && selectedRoute.slopePolylineChunks.length > 0 ? (
                  <>
                    {selectedRoute.slopePolylineChunks.map((chunk, ci) => {
                      const pts = chunkCoordsToMapFormat(chunk.coordinates);
                      if (pts.length < 2) return null;
                      const strokeColor = slopeAvgAbsPctToColor(chunkAvgAbsSlopePct(chunk));
                      return (
                        <React.Fragment key={`nav-chunk-${ci}`}>
                          <Polyline
                            coordinates={pts}
                            strokeColor="rgba(0, 0, 0, 0.12)"
                            strokeWidth={9}
                            lineCap="round"
                            lineJoin="round"
                            zIndex={900 + ci}
                          />
                          <Polyline
                            coordinates={pts}
                            strokeColor={strokeColor}
                            strokeWidth={5}
                            lineCap="round"
                            lineJoin="round"
                            zIndex={900 + ci + 1}
                          />
                        </React.Fragment>
                      );
                    })}
                    <Polyline
                      coordinates={selectedRoute.coordinates}
                      strokeColor={selectedRoute.color || '#4ECDC4'}
                      strokeWidth={2}
                      lineCap="round"
                      lineJoin="round"
                      lineDashPattern={[1, 12]}
                    />
                  </>
                ) : (
                  <>
                    <Polyline
                      coordinates={selectedRoute.coordinates}
                      strokeColor="rgba(0, 0, 0, 0.1)"
                      strokeWidth={8}
                      lineCap="round"
                      lineJoin="round"
                    />
                    <Polyline
                      coordinates={selectedRoute.coordinates}
                      strokeColor="#1A1A2E"
                      strokeWidth={4}
                      lineCap="round"
                      lineJoin="round"
                    />
                    <Polyline
                      coordinates={selectedRoute.coordinates}
                      strokeColor={selectedRoute.color || '#4ECDC4'}
                      strokeWidth={2}
                      lineCap="round"
                      lineJoin="round"
                      lineDashPattern={[1, 12]}
                    />
                  </>
                )}
              </>
            )}
          </MapView>

          {shouldShowPreRouteUI && activeSearchField && (
            <TouchableOpacity
              style={styles.searchOverlay}
              activeOpacity={1}
              onPress={closeSearch}
            />
          )}

          {/* Loading indicator for route */}
          {isLoadingRoute && (
            <View style={styles.loadingOverlay}>
              <View style={styles.loadingBox}>
                <Text style={styles.loadingText}>{tx('Rota hesaplanıyor...', 'Calculating route...')}</Text>
              </View>
            </View>
          )}

          {shouldShowPreRouteUI && (
          <SafeAreaView style={styles.searchContainerSafe} edges={['top']}>
            {/* Modern Arama Kartı */}
            <View style={[styles.searchCard, activeSearchField && styles.searchCardExpanded]}>
              {/* Başlangıç Noktası */}
              <View style={styles.searchRow}>
                <View style={styles.searchIconWrapper}>
                  <View style={[styles.searchDot, styles.searchDotStart]} />
                </View>
                <TextInput
                  style={styles.searchInput}
                  placeholder={tx('Nereden?', 'From?')}
                  placeholderTextColor="#AAA"
                  value={startAddress}
                  onChangeText={(text) => handleSearch(text, 'start')}
                  onFocus={() => handleSearchFocus('start')}
                />
                {startAddress.length > 0 && (
                  <TouchableOpacity 
                    style={styles.clearButton}
                    onPress={() => {
                      setStartAddress('');
                      setStartResolvedAddress('');
                      setStartPoint(null);
                      setRouteCoordinates([]);
                      setRouteStatsFromApi(null);
                      setSelectedRouteIndex(0);
                    }}
                  >
                    <Ionicons name="close-circle" size={18} color="#CCC" />
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.searchRowDivider} />
              
              {/* Bağlantı Çizgisi */}
              <View style={styles.connectionLine}>
                <View style={styles.dashedLine} />
              </View>
              
              {/* Bitiş Noktası */}
              <View style={styles.searchRow}>
                <View style={styles.searchIconWrapper}>
                  <View style={[styles.searchDot, styles.searchDotEnd]} />
                </View>
                <TextInput
                  style={styles.searchInput}
                  placeholder={tx('Nereye gitmek istiyorsun?', 'Where do you want to go?')}
                  placeholderTextColor="#AAA"
                  value={endAddress}
                  onChangeText={(text) => handleSearch(text, 'end')}
                  onFocus={() => handleSearchFocus('end')}
                />
                {endAddress.length > 0 && (
                  <TouchableOpacity 
                    style={styles.clearButton}
                    onPress={() => {
                      setEndAddress('');
                      setEndResolvedAddress('');
                      setEndPoint(null);
                      setRouteCoordinates([]);
                      setSelectedRoute(null);
                      setRouteStatsFromApi(null);
                      setSelectedRouteIndex(0);
                    }}
                  >
                    <Ionicons name="close-circle" size={18} color="#CCC" />
                  </TouchableOpacity>
                )}
              </View>
              
              {/* Swap Butonu */}
              <TouchableOpacity 
                style={styles.swapButton}
                onPress={() => {
                  const tempAddress = startAddress;
                  const tempPoint = startPoint;
                  const tempResolvedAddress = startResolvedAddress;
                  setStartAddress(endAddress);
                  setStartPoint(endPoint);
                  setStartResolvedAddress(endResolvedAddress);
                  setEndAddress(tempAddress);
                  setEndPoint(tempPoint);
                  setEndResolvedAddress(tempResolvedAddress);
                }}
              >
                <Ionicons name="swap-vertical" size={18} color="#666" />
              </TouchableOpacity>
            </View>
            
            {/* Arama Sonuçları */}
            {activeSearchField && (
              <Animated.View 
                style={[
                  styles.searchResultsContainer,
                  {
                    opacity: searchAnim,
                    transform: [{
                      translateY: searchAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-10, 0],
                      })
                    }]
                  }
                ]}
              >
                {/* Benim Konumum Seçeneği */}
                <TouchableOpacity 
                  style={styles.myLocationOption}
                  onPress={handleSelectMyLocation}
                  activeOpacity={0.7}
                >
                  <View style={styles.myLocationIcon}>
                    <Ionicons name="navigate" size={20} color="#FFF" />
                  </View>
                  <View style={styles.myLocationContent}>
                    <Text style={styles.myLocationTitle}>{tx('Benim Konumum', 'My Location')}</Text>
                    <Text style={styles.myLocationSubtitle}>{tx('Mevcut konumunu kullan', 'Use your current location')}</Text>
                  </View>
                  <View style={styles.myLocationBadge}>
                    <Ionicons name="locate" size={14} color="#4ECDC4" />
                  </View>
                </TouchableOpacity>
                
                {/* Ayırıcı */}
                {(isSearching || activeSearchQueryTrimmed.length >= 3 || searchResults.length > 0) && (
                  <View style={styles.searchDivider} />
                )}

                {isSearching && (
                  <View style={styles.searchStatusRow}>
                    <ActivityIndicator size="small" color="#4ECDC4" />
                    <Text style={styles.searchStatusText}>{tx('Yerler aranıyor...', 'Searching places...')}</Text>
                  </View>
                )}

                {!isSearching && activeSearchField && activeSearchQueryTrimmed.length >= 3 && searchResults.length === 0 && (
                  <View style={styles.searchEmptyState}>
                    <Ionicons name="search-outline" size={16} color="#9AA0A6" />
                    <Text style={styles.searchEmptyText}>{tx('Sonuç bulunamadı', 'No results found')}</Text>
                  </View>
                )}
                
                {/* Sonuç Listesi */}
                {searchResults.length > 0 && (
                  <ScrollView 
                    style={styles.searchResultsList}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                  >
                    {searchResults.map((item, index) => (
                      <TouchableOpacity 
                        key={item.id}
                        style={[
                          styles.searchResultItem,
                          index === searchResults.length - 1 && styles.searchResultItemLast
                        ]}
                        onPress={() => handleSelectLocation(item)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.searchResultIcon}>
                          <Ionicons name={item.icon || 'location'} size={18} color="#4ECDC4" />
                        </View>
                        <View style={styles.searchResultContent}>
                          <Text style={styles.searchResultName}>{item.name}</Text>
                          <Text style={styles.searchResultAddress}>{item.address}</Text>
                        </View>
                        <Ionicons name="arrow-forward" size={16} color="#DDD" />
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
                
                {/* Haritadan Seç Butonu */}
                <TouchableOpacity 
                  style={styles.selectFromMapButton}
                  onPress={closeSearch}
                >
                  <Ionicons name="map-outline" size={18} color="#4ECDC4" />
                  <Text style={styles.selectFromMapText}>{tx('Haritadan seç', 'Select on map')}</Text>
                </TouchableOpacity>
              </Animated.View>
            )}
          </SafeAreaView>
          )}

          {/* Rota seçenekleri: seçili rota özeti (modal kapalıyken) + iptal / tekrar aç */}
          {routeStatsFromApi && routeStatsFromApi.length > 0 && !isNavigating && !showRouteSelection && !selectedRoute && (
            <View style={styles.floatingRouteContainer}>
              {(() => {
                const idx = Math.min(
                  Math.max(0, selectedRouteIndex),
                  routeStatsFromApi.length - 1
                );
                const r = routeStatsFromApi[idx];
                const routeColor = r.color || '#4ECDC4';
                
                const getIconForLabel = (label) => {
                  if (!label) return 'map-outline';
                  const l = label.toLowerCase();
                  if (l.includes('kolay')) return 'leaf';
                  if (l.includes('hızlı')) return 'flash';
                  if (l.includes('dengeli')) return 'walk';
                  return 'analytics';
                };

                return (
                  <TouchableOpacity
                    style={styles.floatingRouteCard}
                    onPress={() => setShowRouteSelection(true)}
                    activeOpacity={0.95}
                  >
                    <View style={styles.cardHeaderRow}>
                      <View style={[styles.routeBadge, { backgroundColor: routeColor + '15' }]}>
                        <Ionicons name={getIconForLabel(r.label)} size={14} color={routeColor} />
                        <Text style={[styles.routeBadgeText, { color: routeColor }]}>{r.label || 'Rota Seçeneği'}</Text>
                      </View>
                      <View style={styles.cardTimeDistance}>
                        <Text style={styles.cardTime}>{r.duration?.replace('dk', '').trim() || '--'} dk</Text>
                        <Text style={styles.cardDistance}>{r.distance || '--'}</Text>
                      </View>
                    </View>

                    <View style={styles.cardMetricsRow}>
                      <View style={styles.metricItemFull}>
                        <View style={styles.metricIconWrap}>
                          <Ionicons name="trending-up" size={14} color="#64748B" />
                        </View>
                        <Text style={styles.metricText}>{r.avgSlope || '%0'}</Text>
                      </View>
                      <View style={styles.metricItemFull}>
                        <View style={styles.metricIconWrap}>
                          <Ionicons name="flame" size={14} color="#F59E0B" />
                        </View>
                        <Text style={styles.metricText}>{r.calories || '0 kcal'}</Text>
                      </View>
                      <View style={styles.metricItemFull}>
                        <View style={styles.metricIconWrap}>
                          <MaterialCommunityIcons name="stairs-up" size={15} color="#64748B" />
                        </View>
                        <Text style={styles.metricText}>{r.totalClimb || '0m'} Çıkış</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })()}
              
              <View style={styles.actionButtonsRow}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={handleCancelRoute}
                  activeOpacity={0.8}
                >
                  <Ionicons name="close" size={24} color="#64748B" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.primaryActionBtn}
                  onPress={() => setShowRouteSelection(true)}
                  activeOpacity={0.9}
                >
                  <Text style={styles.primaryActionBtnText}>{tx('Tüm Rotaları İncele', 'View All Routes')}</Text>
                  <View style={styles.badgeWrap}>
                    <Text style={styles.badgeText}>{routeStatsFromApi.length}</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Harita Kontrolleri */}
          {shouldShowPreRouteUI && (
          <View style={styles.mapControls}>
            {/* Konum Butonu */}
            <TouchableOpacity style={styles.controlButton} onPress={handleMyLocation}>
              <Ionicons name="locate" size={24} color="#4ECDC4" />
            </TouchableOpacity>
            
            {/* Zoom + */}
            <TouchableOpacity 
              style={styles.controlButton}
              onPress={() => {
                if (mapRef.current) {
                  mapRef.current.getCamera().then(camera => {
                    mapRef.current.animateCamera({
                      ...camera,
                      zoom: (camera.zoom || 15) + 1
                    });
                  });
                }
              }}
            >
              <Ionicons name="add" size={24} color="#333" />
            </TouchableOpacity>
            
            {/* Zoom - */}
            <TouchableOpacity 
              style={styles.controlButton}
              onPress={() => {
                if (mapRef.current) {
                  mapRef.current.getCamera().then(camera => {
                    mapRef.current.animateCamera({
                      ...camera,
                      zoom: Math.max((camera.zoom || 15) - 1, 0)
                    });
                  });
                }
              }}
            >
              <Ionicons name="remove" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          )}
        </>
      )}

      {/* Modals */}
      <RouteSelectionModal
        visible={showRouteSelection}
        onClose={() => {
          setShowRouteSelection(false);
          setProfileMapPoint(null);
        }}
        onSelectRoute={handleRouteSelect}
        routes={routeStatsFromApi}
        startLocation={startAddress || 'Konumunuz'}
        endLocation={endAddress || 'Hedef'}
        onProfilePointChange={setProfileMapPoint}
      />

      <NavigationView
        visible={isNavigating}
        route={selectedRoute}
        onClose={handleCloseNavigation}
        userLocation={location}
        startPoint={startPoint}
        endPoint={endPoint}
        onRerouteRequest={handleRerouteRequest}
        startLabel={startResolvedAddress || startAddress || ''}
        endLabel={endResolvedAddress || endAddress || ''}
      />

      <SessionSummaryScreen
        visible={showSessionSummary}
        summary={sessionSummaryData}
        onClose={handleCloseSessionSummary}
        onStartNewSession={handleStartNewSession}
        canSaveRoute={isAuthenticated}
        isSavingRoute={isSavingRoute}
        onSaveRoute={handleSaveRoute}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  searchContainerSafe: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: 16,
  },
  searchCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
    elevation: 10,
    position: 'relative',
    borderWidth: 1,
    borderColor: '#EEF2F7',
  },
  searchCardExpanded: {
    shadowOpacity: 0.16,
    shadowRadius: 20,
    elevation: 14,
    borderColor: '#DDE7F2',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 15,
    position: 'relative',
    zIndex: 1,
  },
  searchIconWrapper: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  searchDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  searchDotStart: {
    backgroundColor: '#4ECDC4',
    borderWidth: 2,
    borderColor: '#3DB9B1',
  },
  searchDotEnd: {
    backgroundColor: '#FF6B6B',
    borderWidth: 2,
    borderColor: '#E85555',
  },
  /** Nereden / Nereye satırlarını ayırır; sol nokta sütununda dikey bağlantıyı kesmez */
  searchRowDivider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 52,
    marginRight: 16,
    backgroundColor: '#E4EAF2',
    zIndex: 1,
  },
  connectionLine: {
    position: 'absolute',
    left: 27,
    top: 38,
    bottom: 38,
    width: 2,
    alignItems: 'center',
    zIndex: 0,
  },
  dashedLine: {
    flex: 1,
    width: 2,
    backgroundColor: '#E4EAF2',
    borderRadius: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#0F172A',
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  clearButton: {
    padding: 4,
  },
  swapButton: {
    position: 'absolute',
    right: 12,
    top: '50%',
    marginTop: -16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  /** Tam ekran karartma; SafeAreaView (zIndex 10) içindeki arama kartının altında kalmaması için kart dışında, harita üstünde */
  searchOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    zIndex: 5,
  },
  searchResultsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
    elevation: 10,
    maxHeight: 340,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#EEF2F7',
  },
  searchResultsList: {
    maxHeight: 210,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  searchResultItemLast: {
    borderBottomWidth: 0,
  },
  searchResultIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#ECFEFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  searchResultContent: {
    flex: 1,
  },
  searchResultName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  searchResultAddress: {
    fontSize: 13,
    color: '#64748B',
  },
  // Benim Konumum Seçeneği
  myLocationOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  myLocationIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#4ECDC4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    shadowColor: '#4ECDC4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  myLocationContent: {
    flex: 1,
  },
  myLocationTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 2,
  },
  myLocationSubtitle: {
    fontSize: 13,
    color: '#888',
  },
  myLocationBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ECFEFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchDivider: {
    height: 1,
    backgroundColor: '#EAF0F6',
    marginHorizontal: 16,
  },
  searchStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
  },
  searchStatusText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  searchEmptyState: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  searchEmptyText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  selectFromMapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderTopWidth: 1,
    borderTopColor: '#EAF0F6',
    gap: 8,
    backgroundColor: '#FCFDFE',
  },
  selectFromMapText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4ECDC4',
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginHorizontal: 16,
  },
  mapControls: {
    position: 'absolute',
    bottom: 120,
    right: 20,
  },
  floatingRouteContainer: {
    position: 'absolute',
    bottom: 128,
    left: 16,
    right: 88,
    gap: 12,
  },
  floatingRouteCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  routeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  routeBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  cardTimeDistance: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  cardTime: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  cardDistance: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 2,
  },
  cardMetricsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'flex-start',
    flexWrap: 'wrap',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 8,
    gap: 6,
  },
  metricItemFull: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 7,
    paddingHorizontal: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    minHeight: 38,
  },
  metricIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  metricText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    flexShrink: 1,
  },
  metricDivider: {
    width: 1,
    height: 16,
    backgroundColor: '#E2E8F0',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  primaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 28,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  primaryActionBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginRight: 10,
  },
  badgeWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  controlButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  // Küçültülmüş Kullanıcı Konumu Marker
  profileMarkerOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(78, 205, 196, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileMarkerContainer: {
    alignItems: 'center',
  },
  profileMarkerBadge: {
    backgroundColor: '#1A1A2E',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    marginBottom: 6,
  },
  profileMarkerText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '600',
  },
  profileMarkerInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
    borderWidth: 2,
    borderColor: '#FFF',
  },
  userLocationContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  userLocationPulse: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#4ECDC4',
    opacity: 0.25,
  },
  userLocationDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 4,
  },
  userLocationInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#4ECDC4',
  },
  // Flaticon Stil Pin Marker (Küçük)
  pinContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinShadow: {
    position: 'absolute',
    bottom: -2,
  },
  markerA: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFF',
  },
  markerB: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFF',
  },
  markerText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  // Katman Menüsü Stilleri
  layersMenu: {
    position: 'absolute',
    bottom: 180,
    left: 20,
    right: 80,
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  menuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  menuTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  layerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  layerText: {
    flex: 1,
    fontSize: 15,
    color: '#333',
    marginLeft: 12,
  },
  layerToggle: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#DDD',
  },
  layerToggleActive: {
    backgroundColor: '#4ECDC4',
  },
  // Stil Menüsü Stilleri
  styleMenu: {
    position: 'absolute',
    bottom: 180,
    left: 20,
    right: 20,
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  styleScroll: {
    marginTop: 12,
  },
  styleCard: {
    alignItems: 'center',
    marginRight: 16,
    padding: 8,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  styleCardActive: {
    borderColor: '#4ECDC4',
    backgroundColor: '#4ECDC410',
  },
  stylePreview: {
    width: 70,
    height: 70,
    borderRadius: 12,
    marginBottom: 8,
  },
  styleLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  controlButtonActive: {
    backgroundColor: '#4ECDC410',
    borderWidth: 2,
    borderColor: '#4ECDC4',
  },
  // Loading Overlay
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingBox: {
    backgroundColor: '#FFF',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  loadingText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
});
