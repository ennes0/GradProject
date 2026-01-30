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

  const handleMapPress = (e) => {
    if (isNavigating) return; // Navigasyon sırasında disable
    
    const coordinate = e.nativeEvent.coordinate;
    
    if (!startPoint) {
      setStartPoint(coordinate);
    } else if (!endPoint) {
      setEndPoint(coordinate);
      // Route Selection modal'ını aç
      setTimeout(() => setShowRouteSelection(true), 300);
    } else {
      // Reset
      setStartPoint(coordinate);
      setEndPoint(null);
      setSelectedRoute(null);
    }
  };

  const handleRouteSelect = (route) => {
    setSelectedRoute({
      ...route,
      coordinates: generateRouteCoordinates(startPoint, endPoint),
      difficulty: route.type === 'easiest' ? 'Easy' : 
                  route.type === 'balanced' ? 'Medium' : 'Hard',
      maxSlope: route.avgSlope || (route.type === 'easiest' ? '%2' : 
                route.type === 'balanced' ? '%5' : '%12'),
      estimatedEffort: route.type === 'easiest' ? 'Low' : 
                       route.type === 'balanced' ? 'Medium' : 'High',
    });
    // Doğrudan navigasyonu başlat
    setIsNavigating(true);
  };

  const handleStartNavigation = (route) => {
    setIsNavigating(true);
  };

  const handleCloseNavigation = () => {
    setIsNavigating(false);
  };

  const generateRouteCoordinates = (start, end) => {
    if (!start || !end) return [];
    
    // Basit bir rota oluştur (gerçek uygulamada API'den gelecek)
    const steps = 20;
    const coordinates = [];
    
    for (let i = 0; i <= steps; i++) {
      const ratio = i / steps;
      coordinates.push({
        latitude: start.latitude + (end.latitude - start.latitude) * ratio,
        longitude: start.longitude + (end.longitude - start.longitude) * ratio,
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

            {selectedRoute && selectedRoute.coordinates && (
              <Polyline
                coordinates={selectedRoute.coordinates}
                strokeColor={selectedRoute.color}
                strokeWidth={5}
              />
            )}
          </MapView>

          <SafeAreaView style={styles.searchContainerSafe} edges={['top']}>
            <View style={styles.searchCard}>
              <View style={styles.searchRow}>
                <Ionicons name="ellipse" size={12} color="#4ECDC4" style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Nereden?"
                  placeholderTextColor="#999"
                  value={startAddress}
                  onChangeText={setStartAddress}
                />
              </View>
              <View style={styles.divider} />
              <View style={styles.searchRow}>
                <Ionicons name="location-sharp" size={16} color="#F44336" style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Nereye?"
                  placeholderTextColor="#999"
                  value={endAddress}
                  onChangeText={setEndAddress}
                />
              </View>
            </View>
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
        startLocation={startAddress || 'Konumunuz'}
        endLocation={endAddress || 'Hedef'}
      />

      <NavigationView
        visible={isNavigating}
        route={selectedRoute}
        onClose={handleCloseNavigation}
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
    zIndex: 1,
    paddingHorizontal: 16,
  },
  searchCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 16,
  },
  mapControls: {
    position: 'absolute',
    bottom: 120,
    right: 20,
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
});
