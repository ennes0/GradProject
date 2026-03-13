import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  TextInput,
  Alert,
  Dimensions,
  Platform,
  Modal,
  ScrollView,
  Animated,
  Image,
  StatusBar,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import RouteSelectionModal from '../../components/ui/RouteSelectionModal';
import NavigationView from '../../components/ui/NavigationView';
import { useMapPreload } from '../../components/context/MapPreloadContext';
import { getRouteUrl, getRoutesUrl } from '../../config/api';
import Svg, { Path, Circle, Ellipse } from 'react-native-svg';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

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

export default function MapScreen() {
  const { initialLocation, locationPermission } = useMapPreload();
  const [location, setLocation] = useState(initialLocation);
  const [showSlopeHeatmap, setShowSlopeHeatmap] = useState(false);
  const [startPoint, setStartPoint] = useState(initialLocation);
  const [endPoint, setEndPoint] = useState(null);
  const [showRouteSelection, setShowRouteSelection] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [startAddress, setStartAddress] = useState('');
  const [endAddress, setEndAddress] = useState('');
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [routeStatsFromApi, setRouteStatsFromApi] = useState(null); // ODOS API'den gelen rotalar (modal + harita)
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);   // Haritada hangi rota vurgulu (0, 1, 2)
  
  // Arama state'leri
  const [activeSearchField, setActiveSearchField] = useState(null); // 'start' veya 'end'
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchAnim = useRef(new Animated.Value(0)).current;
  
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
  
  // Son aramalar (mock)
  const recentSearches = [
    { id: 'r1', name: 'Ev', address: 'Şişli, İstanbul', latitude: 41.0600, longitude: 28.9870, icon: 'home' },
    { id: 'r2', name: 'İş', address: 'Levent, İstanbul', latitude: 41.0794, longitude: 29.0117, icon: 'briefcase' },
  ];
  
  // Harita özelleştirme state'leri
  const [mapType, setMapType] = useState('standard');
  const [mapStyle, setMapStyle] = useState('standard');
  const [showLayersMenu, setShowLayersMenu] = useState(false);
  const [showStyleMenu, setShowStyleMenu] = useState(false);
  const [layers, setLayers] = useState({
    traffic: false,
    buildings3D: false,
    slopes: false,
    bikeRoutes: false,
  });
  const [pitch, setPitch] = useState(0);
  
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

  const getCurrentLocation = async () => {
    try {
      // Konum izni zaten varsa direkt konum al
      let status = locationPermission;
      if (status !== 'granted') {
        const { status: newStatus } = await Location.requestForegroundPermissionsAsync();
        status = newStatus;
        if (status !== 'granted') {
          Alert.alert('İzin Gerekli', 'Konum izni verilmedi');
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

  const handleSearchPress = () => {
    Alert.alert('Arama', 'Hedef seçme özelliği eklenecek');
  };

  // Arama fonksiyonu
  const handleSearch = (text, field) => {
    if (field === 'start') {
      setStartAddress(text);
    } else {
      setEndAddress(text);
    }
    
    if (text.length > 0) {
      setIsSearching(true);
      // Mock arama - gerçek uygulamada API kullanılır
      const filtered = mockLocations.filter(loc => 
        loc.name.toLowerCase().includes(text.toLowerCase()) ||
        loc.address.toLowerCase().includes(text.toLowerCase())
      );
      setSearchResults(filtered.slice(0, 5));
      
      // Animasyonu başlat
      Animated.spring(searchAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 100,
        friction: 10,
      }).start();
    } else {
      setSearchResults([]);
      Animated.timing(searchAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  };

  // Benim Konumum seçildiğinde
  const handleSelectMyLocation = async () => {
    if (!location) {
      Alert.alert('Konum Bulunamadı', 'Lütfen konum izni verin ve tekrar deneyin.');
      return;
    }
    
    const coordinate = { latitude: location.latitude, longitude: location.longitude };
    
    if (activeSearchField === 'start') {
      setStartAddress('Benim Konumum');
      setStartPoint(coordinate);
    } else {
      setEndAddress('Benim Konumum');
      setEndPoint(coordinate);
      
      // Eğer başlangıç noktası varsa rotayı hesapla
      if (startPoint) {
        await fetchRouteFromAPI(startPoint, coordinate);
        if (mapRef.current) {
          mapRef.current.fitToCoordinates(
            [startPoint, coordinate],
            { edgePadding: { top: 150, right: 50, bottom: 300, left: 50 }, animated: true }
          );
        }
        setTimeout(() => setShowRouteSelection(true), 500);
      }
    }
    
    // Aramayı kapat
    setSearchResults([]);
    setActiveSearchField(null);
    Animated.timing(searchAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  // Lokasyon seçildiğinde
  const handleSelectLocation = async (location) => {
    const coordinate = { latitude: location.latitude, longitude: location.longitude };
    
    if (activeSearchField === 'start') {
      setStartAddress(location.name);
      setStartPoint(coordinate);
    } else {
      setEndAddress(location.name);
      setEndPoint(coordinate);
      
      // Eğer başlangıç noktası varsa rotayı hesapla
      if (startPoint) {
        await fetchRouteFromAPI(startPoint, coordinate);
        if (mapRef.current) {
          mapRef.current.fitToCoordinates(
            [startPoint, coordinate],
            { edgePadding: { top: 150, right: 50, bottom: 300, left: 50 }, animated: true }
          );
        }
        setTimeout(() => setShowRouteSelection(true), 500);
      }
    }
    
    // Aramayı kapat
    setSearchResults([]);
    setActiveSearchField(null);
    Animated.timing(searchAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  // Arama alanına focus olduğunda
  const handleSearchFocus = (field) => {
    setActiveSearchField(field);
    // Son aramaları göster
    if (field === 'start' && !startAddress) {
      setSearchResults(recentSearches);
    } else if (field === 'end' && !endAddress) {
      setSearchResults(recentSearches);
    }
    
    Animated.spring(searchAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 100,
      friction: 10,
    }).start();
  };

  // Aramayı kapat
  const closeSearch = () => {
    setActiveSearchField(null);
    setSearchResults([]);
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
    } else if (!endPoint) {
      setEndPoint(coordinate);
      await fetchRouteFromAPI(startPoint, coordinate);
      if (mapRef.current) {
        mapRef.current.fitToCoordinates(
          [startPoint, coordinate],
          {
            edgePadding: { top: 100, right: 50, bottom: 300, left: 50 },
            animated: true,
          }
        );
      }
      setTimeout(() => setShowRouteSelection(true), 500);
    } else {
      setStartPoint(coordinate);
      setEndPoint(null);
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
    setSelectedRoute(null);
    setRouteCoordinates([]);
    setRouteStatsFromApi(null);
    setSelectedRouteIndex(0);
    setShowRouteSelection(false);
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
      difficulty: route.type === 'easiest' ? 'easy' : route.type === 'fastest' ? 'hard' : 'medium',
      maxSlope: route.avgSlope || (route.type === 'easiest' ? '%2' : route.type === 'fastest' ? '%12' : '%5'),
      estimatedEffort: route.type === 'easiest' ? 'Low' : route.type === 'fastest' ? 'High' : 'Medium',
    });
    setShowRouteSelection(false);
    setIsNavigating(true);
  };

  const handleStartNavigation = (route) => {
    setIsNavigating(true);
  };

  const handleCloseNavigation = () => {
    setIsNavigating(false);
  };

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

  // ODOS backend API: 3 rota önerisi (En Kısa, En Hızlı, En Kolay)
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

      const routeColors = { fastest: '#D32F2F', balanced: '#00897B', easiest: '#43A047' };
      const routeIcons = { fastest: 'flash', balanced: 'fitness', easiest: 'leaf' };
      const descriptions = {
        fastest: 'Tobler ile tahmini en kısa süre.',
        balanced: 'Süre ve yokuş dengesi. Günlük yürüyüş için uygun.',
        easiest: 'Eğim değişimi az, olabildiğince düz rota.',
      };
      const cards = data.routes.map((r, idx) => {
        const coords = (r.coordinates || []).map(([lat, lon]) => ({ latitude: lat, longitude: lon }));
        const hasElev = r.elevationProfile && r.elevationProfile.length > 0;
        const elevationData = hasElev
          ? r.elevationProfile.map((p) => Math.round(p.elevM))
          : [0, Math.round((r.totalClimbM || 0) * 0.5)];
        return {
          id: idx + 1,
          type: r.type || 'fastest',
          label: r.label || 'Rota',
          description: descriptions[r.type] || r.label || 'Rota',
          totalClimb: `${Math.round(r.totalClimbM || 0)}m`,
          distance: `${(r.distanceKm != null ? r.distanceKm : 0).toFixed(1)} km`,
          duration: `${Math.round(r.durationMin != null ? r.durationMin : 0)} dk`,
          calories: '—',
          avgSlope: '—',
          color: routeColors[r.type] || '#4ECDC4',
          icon: routeIcons[r.type] || 'fitness',
          elevationData,
          elevationProfile: r.elevationProfile || null,
          coordinates: coords,
          recommended: r.type === 'balanced',
        };
      });

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

  return (
    <View style={styles.container}>
      <StatusBar hidden={true} />
      {/* Map View */}
      {!isNavigating && (
        <>
          <MapView
            ref={mapRef}
            style={styles.map}
            provider={PROVIDER_GOOGLE}
            initialRegion={initialRegion}
            showsUserLocation={true}
            showsMyLocationButton={false}
            showsCompass={true}
            showsTraffic={layers.traffic}
            showsBuildings={layers.buildings3D}
            mapType={mapType}
            customMapStyle={MAP_STYLES[mapStyle]}
            pitch={pitch}
            rotateEnabled={true}
            pitchEnabled={true}
            onPress={handleMapPress}
          >
            {layers.slopes && slopeRoads.map((road) => (
              <Polyline
                key={road.id}
                coordinates={road.coordinates}
                strokeColor={getSlopeColor(road.slope)}
                strokeWidth={6}
              />
            ))}

            {startPoint && (
              <Marker 
                coordinate={startPoint} 
                anchor={{ x: 0.5, y: 0.9 }}
                tracksViewChanges={false}
              >
                <StartMarker />
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

            {/* Rota çizgileri: API'den gelen tüm seçenekler (Google Maps tarzı) */}
            {routeStatsFromApi && routeStatsFromApi.length > 0 && !selectedRoute && (
              <>
                {routeStatsFromApi.map((route, index) => {
                  const coords = route.coordinates || [];
                  if (coords.length === 0) return null;
                  const isSelected = index === selectedRouteIndex;
                  const strokeWidth = isSelected ? 6 : 3;
                  return (
                    <Polyline
                      key={`route-opt-${route.id}-${index}`}
                      coordinates={coords}
                      strokeColor={route.color || '#00897B'}
                      strokeWidth={strokeWidth}
                      lineCap="round"
                      lineJoin="round"
                      tappable
                      onPress={() => {
                        setSelectedRouteIndex(index);
                        setRouteCoordinates(coords);
                      }}
                    />
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
                {/* Gölge */}
                <Polyline
                  coordinates={selectedRoute.coordinates}
                  strokeColor="rgba(0, 0, 0, 0.1)"
                  strokeWidth={8}
                  lineCap="round"
                  lineJoin="round"
                />
                {/* Ana çizgi */}
                <Polyline
                  coordinates={selectedRoute.coordinates}
                  strokeColor="#1A1A2E"
                  strokeWidth={4}
                  lineCap="round"
                  lineJoin="round"
                />
                {/* Yön göstergesi - kesikli iç çizgi */}
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
          </MapView>

          {/* Loading indicator for route */}
          {isLoadingRoute && (
            <View style={styles.loadingOverlay}>
              <View style={styles.loadingBox}>
                <Text style={styles.loadingText}>Rota hesaplanıyor...</Text>
              </View>
            </View>
          )}

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
                  placeholder="Nereden?"
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
                  placeholder="Nereye gitmek istiyorsun?"
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
                  setStartAddress(endAddress);
                  setStartPoint(endPoint);
                  setEndAddress(tempAddress);
                  setEndPoint(tempPoint);
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
                    <Text style={styles.myLocationTitle}>Benim Konumum</Text>
                    <Text style={styles.myLocationSubtitle}>Mevcut konumunu kullan</Text>
                  </View>
                  <View style={styles.myLocationBadge}>
                    <Ionicons name="locate" size={14} color="#4ECDC4" />
                  </View>
                </TouchableOpacity>
                
                {/* Ayırıcı */}
                <View style={styles.searchDivider} />
                
                {/* Başlık */}
                {searchResults.length > 0 && !startAddress && !endAddress && (
                  <View style={styles.searchResultsHeader}>
                    <Ionicons name="time-outline" size={16} color="#999" />
                    <Text style={styles.searchResultsTitle}>Son Aramalar</Text>
                  </View>
                )}
                
                {searchResults.length > 0 && (startAddress || endAddress) && (
                  <View style={styles.searchResultsHeader}>
                    <Ionicons name="search-outline" size={16} color="#999" />
                    <Text style={styles.searchResultsTitle}>Önerilen Yerler</Text>
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
                  <Text style={styles.selectFromMapText}>Haritadan seç</Text>
                </TouchableOpacity>
              </Animated.View>
            )}
            
            {/* Arka Plan Overlay */}
            {activeSearchField && (
              <TouchableOpacity 
                style={styles.searchOverlay}
                activeOpacity={1}
                onPress={closeSearch}
              />
            )}
          </SafeAreaView>

          {/* Katman Menüsü */}
          {showLayersMenu && (
            <View style={styles.layersMenu}>
              <View style={styles.menuHeader}>
                <Text style={styles.menuTitle}>Katmanlar</Text>
                <TouchableOpacity onPress={() => setShowLayersMenu(false)}>
                  <Ionicons name="close" size={24} color="#333" />
                </TouchableOpacity>
              </View>
              
              <TouchableOpacity 
                style={styles.layerItem}
                onPress={() => setLayers({...layers, traffic: !layers.traffic})}
              >
                <Ionicons 
                  name={layers.traffic ? "car" : "car-outline"} 
                  size={22} 
                  color={layers.traffic ? "#4ECDC4" : "#666"} 
                />
                <Text style={styles.layerText}>Trafik</Text>
                <View style={[styles.layerToggle, layers.traffic && styles.layerToggleActive]} />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.layerItem}
                onPress={() => {
                  setLayers({...layers, buildings3D: !layers.buildings3D});
                  setPitch(layers.buildings3D ? 0 : 45);
                }}
              >
                <Ionicons 
                  name={layers.buildings3D ? "business" : "business-outline"} 
                  size={22} 
                  color={layers.buildings3D ? "#4ECDC4" : "#666"} 
                />
                <Text style={styles.layerText}>3D Binalar</Text>
                <View style={[styles.layerToggle, layers.buildings3D && styles.layerToggleActive]} />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.layerItem}
                onPress={() => setLayers({...layers, slopes: !layers.slopes})}
              >
                <Ionicons 
                  name={layers.slopes ? "trending-up" : "trending-up-outline"} 
                  size={22} 
                  color={layers.slopes ? "#4ECDC4" : "#666"} 
                />
                <Text style={styles.layerText}>Eğim Haritası</Text>
                <View style={[styles.layerToggle, layers.slopes && styles.layerToggleActive]} />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.layerItem}
                onPress={() => setLayers({...layers, bikeRoutes: !layers.bikeRoutes})}
              >
                <Ionicons 
                  name={layers.bikeRoutes ? "bicycle" : "bicycle-outline"} 
                  size={22} 
                  color={layers.bikeRoutes ? "#4ECDC4" : "#666"} 
                />
                <Text style={styles.layerText}>Bisiklet Yolları</Text>
                <View style={[styles.layerToggle, layers.bikeRoutes && styles.layerToggleActive]} />
              </TouchableOpacity>
            </View>
          )}

          {/* Stil Menüsü */}
          {showStyleMenu && (
            <View style={styles.styleMenu}>
              <Text style={styles.menuTitle}>Harita Stili</Text>
              
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.styleScroll}>
                <TouchableOpacity 
                  style={[styles.styleCard, mapType === 'standard' && mapStyle === 'standard' && styles.styleCardActive]}
                  onPress={() => {
                    setMapType('standard');
                    setMapStyle('standard');
                    setShowStyleMenu(false);
                  }}
                >
                  <View style={[styles.stylePreview, { backgroundColor: '#E8E4D9' }]} />
                  <Text style={styles.styleLabel}>Standart</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.styleCard, mapStyle === 'dark' && styles.styleCardActive]}
                  onPress={() => {
                    setMapType('standard');
                    setMapStyle('dark');
                    setShowStyleMenu(false);
                  }}
                >
                  <View style={[styles.stylePreview, { backgroundColor: '#242f3e' }]} />
                  <Text style={styles.styleLabel}>Karanlık</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.styleCard, mapType === 'satellite' && styles.styleCardActive]}
                  onPress={() => {
                    setMapType('satellite');
                    setMapStyle('standard');
                    setShowStyleMenu(false);
                  }}
                >
                  <View style={[styles.stylePreview, { backgroundColor: '#4A7C59' }]} />
                  <Text style={styles.styleLabel}>Uydu</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.styleCard, mapType === 'terrain' && styles.styleCardActive]}
                  onPress={() => {
                    setMapType('terrain');
                    setMapStyle('standard');
                    setShowStyleMenu(false);
                  }}
                >
                  <View style={[styles.stylePreview, { backgroundColor: '#C8B895' }]} />
                  <Text style={styles.styleLabel}>Arazi</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.styleCard, mapStyle === 'minimal' && styles.styleCardActive]}
                  onPress={() => {
                    setMapType('standard');
                    setMapStyle('minimal');
                    setShowStyleMenu(false);
                  }}
                >
                  <View style={[styles.stylePreview, { backgroundColor: '#f5f5f5' }]} />
                  <Text style={styles.styleLabel}>Minimal</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          )}

          {/* Rota seçenekleri - modal kapatıldıktan sonra tekrar açmak için; Rota iptal */}
          {routeStatsFromApi && routeStatsFromApi.length > 0 && !isNavigating && (
            <View style={styles.routeOptionsPillWrap}>
              <TouchableOpacity
                style={[styles.routeOptionsPill, styles.routeOptionsPillSecondary]}
                onPress={handleCancelRoute}
                activeOpacity={0.8}
              >
                <Ionicons name="close-circle-outline" size={20} color="#666" />
                <Text style={styles.routeOptionsPillTextSecondary}>Rota iptal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.routeOptionsPill}
                onPress={() => setShowRouteSelection(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="options-outline" size={20} color="#FFF" />
                <Text style={styles.routeOptionsPillText}>
                  Rota seçenekleri {routeStatsFromApi.length > 1 ? `(${routeStatsFromApi.length})` : ''}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Harita Kontrolleri */}
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
            
            {/* Katman Menüsü */}
            <TouchableOpacity 
              style={[styles.controlButton, (layers.slopes || layers.traffic || layers.buildings3D) && styles.controlButtonActive]}
              onPress={() => setShowLayersMenu(true)}
            >
              <Ionicons name="layers-outline" size={24} color={(layers.slopes || layers.traffic || layers.buildings3D) ? "#4ECDC4" : "#333"} />
            </TouchableOpacity>
            
            {/* Stil Menüsü */}
            <TouchableOpacity 
              style={styles.controlButton}
              onPress={() => setShowStyleMenu(!showStyleMenu)}
            >
              <Ionicons name="color-palette-outline" size={24} color="#333" />
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Modals */}
      <RouteSelectionModal
        visible={showRouteSelection}
        onClose={() => setShowRouteSelection(false)}
        onSelectRoute={handleRouteSelect}
        routes={routeStatsFromApi}
        startLocation={startAddress || 'Konumunuz'}
        endLocation={endAddress || 'Hedef'}
      />

      <NavigationView
        visible={isNavigating}
        route={selectedRoute}
        onClose={handleCloseNavigation}
        userLocation={location}
        startPoint={startPoint}
        endPoint={endPoint}
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
    backgroundColor: 'white',
    borderRadius: 16,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
    position: 'relative',
  },
  searchCardExpanded: {
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 12,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  searchIconWrapper: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
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
  connectionLine: {
    position: 'absolute',
    left: 27,
    top: 38,
    bottom: 38,
    width: 2,
    alignItems: 'center',
  },
  dashedLine: {
    flex: 1,
    width: 2,
    backgroundColor: '#E8E8E8',
    borderRadius: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1A1A2E',
    fontWeight: '500',
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
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchOverlay: {
    position: 'absolute',
    top: 200,
    left: -16,
    right: -16,
    bottom: -1000,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    zIndex: -1,
  },
  searchResultsContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
    maxHeight: 350,
    overflow: 'hidden',
  },
  searchResultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
    gap: 8,
  },
  searchResultsTitle: {
    fontSize: 13,
    color: '#999',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  searchResultsList: {
    maxHeight: 250,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  searchResultItemLast: {
    borderBottomWidth: 0,
  },
  searchResultIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F0FAF9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  searchResultContent: {
    flex: 1,
  },
  searchResultName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A2E',
    marginBottom: 2,
  },
  searchResultAddress: {
    fontSize: 13,
    color: '#888',
  },
  // Benim Konumum Seçeneği
  myLocationOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
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
    backgroundColor: '#F0FAF9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchDivider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginHorizontal: 16,
  },
  selectFromMapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    gap: 8,
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
  routeOptionsPillWrap: {
    position: 'absolute',
    bottom: 128,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  routeOptionsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#4ECDC4',
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  routeOptionsPillSecondary: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#DDD',
  },
  routeOptionsPillText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFF',
  },
  routeOptionsPillTextSecondary: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666',
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
