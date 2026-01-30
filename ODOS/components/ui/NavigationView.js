import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Modal,
  Dimensions,
  Animated,
  Platform,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import Svg, { Path, Circle, Ellipse } from 'react-native-svg';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// User Location Marker with pulse animation
const UserLocationMarker = () => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.5,
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
    <View style={styles.userMarkerContainer}>
      <Animated.View 
        style={[
          styles.userMarkerPulse,
          { transform: [{ scale: pulseAnim }] }
        ]} 
      />
      <View style={styles.userMarkerDot}>
        <Ionicons name="navigate" size={14} color="#FFF" />
      </View>
    </View>
  );
};

// Destination Marker
const DestinationMarker = () => (
  <View style={styles.destinationContainer}>
    <Svg width="36" height="44" viewBox="0 0 24 32">
      <Path
        d="M12 0C7.03 0 3 4.03 3 9c0 6.75 9 23 9 23s9-16.25 9-23c0-4.97-4.03-9-9-9z"
        fill="#FF6B6B"
      />
      <Path
        d="M12 5l1.5 4.5H18l-3.75 2.73L15.75 17 12 14.27 8.25 17l1.5-4.77L6 9.5h4.5z"
        fill="#FFFFFF"
      />
    </Svg>
  </View>
);

export default function NavigationView({ visible, route, onClose, userLocation, startPoint, endPoint }) {
  const progressAnim = useRef(new Animated.Value(0)).current;
  const mapRef = useRef(null);
  
  const [currentStep, setCurrentStep] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [is3DMode, setIs3DMode] = useState(true);
  const [heading, setHeading] = useState(0);
  const [showFullMap, setShowFullMap] = useState(false);
  
  // Simulated navigation data
  const navigationData = {
    totalDistance: route?.distance || '2.4 km',
    totalClimb: route?.totalClimb || '45m',
    estimatedTime: route?.duration || '18 dk',
    currentSpeed: '4.8 km/s',
    calories: '0',
    steps: '0',
  };

  const instructions = [
    { action: 'straight', distance: '200m', text: '200m düz devam edin', street: 'Atatürk Caddesi' },
    { action: 'left', distance: '150m', text: '150m sonra sola dönün', street: 'Cumhuriyet Sokak' },
    { action: 'right', distance: '300m', text: '300m sonra sağa dönün', street: 'Bağdat Caddesi' },
    { action: 'straight', distance: '400m', text: 'Hedefinize ulaştınız', street: '' },
  ];

  const currentInstruction = instructions[currentStep] || instructions[0];

  // Upcoming slope warning
  const upcomingWarning = {
    type: 'slope',
    distance: '80m',
    value: '%12 eğim',
    severity: 'medium', // low, medium, high
  };

  useEffect(() => {
    if (visible) {
      // Progress animation
      Animated.timing(progressAnim, {
        toValue: 0.35,
        duration: 2000,
        useNativeDriver: false,
      }).start();
    } else {
      progressAnim.setValue(0);
      setElapsedTime(0);
    }
  }, [visible]);

  // Timer
  useEffect(() => {
    let interval;
    if (visible && !isPaused) {
      interval = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [visible, isPaused]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getDirectionIcon = (action) => {
    switch (action) {
      case 'left': return 'arrow-back';
      case 'right': return 'arrow-forward';
      case 'straight': return 'arrow-up';
      case 'uturn': return 'return-down-back';
      default: return 'arrow-up';
    }
  };

  const getDirectionText = (action) => {
    switch (action) {
      case 'left': return 'Sola Dön';
      case 'right': return 'Sağa Dön';
      case 'straight': return 'Düz Git';
      case 'uturn': return 'Geri Dön';
      default: return 'Devam Et';
    }
  };

  const handleEndNavigation = () => {
    setElapsedTime(0);
    setCurrentStep(0);
    setIsPaused(false);
    setIs3DMode(true);
    setShowFullMap(false);
    onClose();
  };

  // Center map on user location
  const centerOnUser = () => {
    if (mapRef.current && userLocation) {
      mapRef.current.animateCamera({
        center: userLocation,
        pitch: is3DMode ? 60 : 0,
        heading: heading,
        zoom: 18,
      }, { duration: 500 });
    }
  };

  // Toggle 3D mode
  const toggle3DMode = () => {
    const newMode = !is3DMode;
    setIs3DMode(newMode);
    if (mapRef.current) {
      mapRef.current.animateCamera({
        pitch: newMode ? 60 : 0,
        zoom: newMode ? 18 : 16,
      }, { duration: 500 });
    }
  };

  // Get map region from route
  const getMapRegion = () => {
    if (userLocation) {
      return {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      };
    }
    if (startPoint) {
      return {
        latitude: startPoint.latitude,
        longitude: startPoint.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
    }
    return {
      latitude: 41.0082,
      longitude: 28.9784,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    };
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={handleEndNavigation}
    >
      <View style={styles.container}>
        {/* 3D Map View */}
        <MapView
          ref={mapRef}
          style={[styles.map, showFullMap && styles.fullMap]}
          provider={PROVIDER_GOOGLE}
          initialRegion={getMapRegion()}
          showsUserLocation={false}
          showsMyLocationButton={false}
          showsCompass={false}
          showsBuildings={true}
          showsTraffic={false}
          mapType="standard"
          pitchEnabled={true}
          rotateEnabled={true}
          scrollEnabled={true}
          zoomEnabled={true}
          initialCamera={{
            center: getMapRegion(),
            pitch: is3DMode ? 60 : 0,
            heading: heading,
            zoom: 18,
            altitude: 1000,
          }}
        >
          {/* User Location Marker */}
          {userLocation && (
            <Marker
              coordinate={userLocation}
              anchor={{ x: 0.5, y: 0.5 }}
              flat={true}
              rotation={heading}
            >
              <UserLocationMarker />
            </Marker>
          )}

          {/* Destination Marker */}
          {endPoint && (
            <Marker
              coordinate={endPoint}
              anchor={{ x: 0.5, y: 0.9 }}
            >
              <DestinationMarker />
            </Marker>
          )}

          {/* Route Polyline */}
          {route?.coordinates && (
            <Polyline
              coordinates={route.coordinates}
              strokeColor={route.color || Colors.primary}
              strokeWidth={6}
              lineCap="round"
              lineJoin="round"
            />
          )}
        </MapView>

        {/* Map Controls Overlay */}
        <View style={styles.mapControlsContainer}>
          <SafeAreaView edges={['top']} style={styles.topControlsSafe}>
            {/* Top Bar */}
            <View style={styles.topBar}>
              <TouchableOpacity onPress={handleEndNavigation} style={styles.controlButton}>
                <Ionicons name="close" size={22} color="#333" />
              </TouchableOpacity>
              
              <View style={styles.timerContainer}>
                <Ionicons name="time-outline" size={16} color={Colors.primary} />
                <Text style={styles.timerText}>{formatTime(elapsedTime)}</Text>
              </View>
              
              <TouchableOpacity 
                style={styles.controlButton}
                onPress={() => setIsPaused(!isPaused)}
              >
                <Ionicons name={isPaused ? "play" : "pause"} size={22} color="#333" />
              </TouchableOpacity>
            </View>
          </SafeAreaView>

          {/* Map Action Buttons */}
          <View style={styles.mapActionButtons}>
            <TouchableOpacity 
              style={[styles.mapActionButton, is3DMode && styles.mapActionButtonActive]}
              onPress={toggle3DMode}
            >
              <Ionicons name="cube-outline" size={22} color={is3DMode ? "#FFF" : "#333"} />
              <Text style={[styles.mapActionText, is3DMode && styles.mapActionTextActive]}>3D</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.mapActionButton}
              onPress={centerOnUser}
            >
              <Ionicons name="locate" size={22} color="#333" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.mapActionButton}
              onPress={() => setShowFullMap(!showFullMap)}
            >
              <Ionicons name={showFullMap ? "contract" : "expand"} size={22} color="#333" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Bottom Navigation Panel */}
        {!showFullMap && (
          <View style={styles.bottomPanel}>
            {/* Direction Instruction */}
            <View style={styles.directionCard}>
              <View style={styles.directionIconWrapper}>
                <View style={styles.directionIconBg}>
                  <Ionicons 
                    name={getDirectionIcon(currentInstruction.action)} 
                    size={32} 
                    color="#FFF" 
                  />
                </View>
              </View>
              <View style={styles.directionInfo}>
                <Text style={styles.directionDistance}>{currentInstruction.distance}</Text>
                <Text style={styles.directionText}>{currentInstruction.text}</Text>
                {currentInstruction.street && (
                  <Text style={styles.streetName}>{currentInstruction.street}</Text>
                )}
              </View>
            </View>

            {/* Progress Bar */}
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <Animated.View 
                  style={[
                    styles.progressFill,
                    { 
                      width: progressAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0%', '100%']
                      })
                    }
                  ]} 
                />
              </View>
              <View style={styles.progressLabels}>
                <Text style={styles.progressText}>0.8 km</Text>
                <Text style={styles.progressText}>{navigationData.totalDistance}</Text>
              </View>
            </View>

            {/* Warning Card */}
            {upcomingWarning && (
              <View style={styles.warningCard}>
                <View style={[
                  styles.warningIconBg,
                  upcomingWarning.severity === 'high' && { backgroundColor: '#FF6B6B' },
                  upcomingWarning.severity === 'medium' && { backgroundColor: '#FFB347' },
                ]}>
                  <Ionicons 
                    name={upcomingWarning.type === 'slope' ? 'trending-up' : 'warning'} 
                    size={18} 
                    color="#FFF" 
                  />
                </View>
                <View style={styles.warningContent}>
                  <Text style={styles.warningTitle}>Dikkat: {upcomingWarning.distance} sonra</Text>
                  <Text style={styles.warningValue}>{upcomingWarning.value}</Text>
                </View>
              </View>
            )}

            {/* Stats Row */}
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Ionicons name="speedometer-outline" size={18} color={Colors.primary} />
                <Text style={styles.statValue}>{navigationData.currentSpeed}</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Ionicons name="trending-up-outline" size={18} color={Colors.primary} />
                <Text style={styles.statValue}>{navigationData.totalClimb}</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Ionicons name="flame-outline" size={18} color={Colors.primary} />
                <Text style={styles.statValue}>{Math.floor(elapsedTime * 0.1)} kcal</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Ionicons name="time-outline" size={18} color={Colors.primary} />
                <Text style={styles.statValue}>{navigationData.estimatedTime}</Text>
              </View>
            </View>

            {/* Bottom Actions */}
            <View style={styles.bottomActions}>
              <TouchableOpacity style={styles.actionButton}>
                <Ionicons name="volume-high" size={20} color="#666" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton}>
                <Ionicons name="list-outline" size={20} color="#666" />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.endButton}
                onPress={handleEndNavigation}
              >
                <Ionicons name="flag" size={18} color="#FFF" />
                <Text style={styles.endButtonText}>Bitir</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton}>
                <Ionicons name="share-outline" size={20} color="#666" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton}>
                <Ionicons name="settings-outline" size={20} color="#666" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Minimal Bottom Bar for Full Map Mode */}
        {showFullMap && (
          <View style={styles.minimalBottomBar}>
            <View style={styles.minimalDirection}>
              <View style={styles.minimalDirectionIcon}>
                <Ionicons 
                  name={getDirectionIcon(currentInstruction.action)} 
                  size={24} 
                  color="#FFF" 
                />
              </View>
              <View>
                <Text style={styles.minimalDistanceText}>{currentInstruction.distance}</Text>
                <Text style={styles.minimalStreetText} numberOfLines={1}>{currentInstruction.street}</Text>
              </View>
            </View>
            <TouchableOpacity 
              style={styles.minimalEndButton}
              onPress={handleEndNavigation}
            >
              <Ionicons name="flag" size={18} color="#FFF" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  map: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.55,
  },
  fullMap: {
    height: SCREEN_HEIGHT,
  },
  
  // User Location Marker
  userMarkerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 50,
    height: 50,
  },
  userMarkerPulse: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(78, 205, 196, 0.3)',
  },
  userMarkerDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  destinationContainer: {
    alignItems: 'center',
  },

  // Map Controls
  mapControlsContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  topControlsSafe: {
    backgroundColor: 'transparent',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  controlButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 22,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  timerText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A2E',
  },

  // Map Action Buttons
  mapActionButtons: {
    position: 'absolute',
    right: 16,
    top: SCREEN_HEIGHT * 0.35,
    gap: 10,
  },
  mapActionButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  mapActionButtonActive: {
    backgroundColor: Colors.primary,
  },
  mapActionText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#333',
    marginTop: 2,
  },
  mapActionTextActive: {
    color: '#FFF',
  },

  // Bottom Panel
  bottomPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },

  // Direction Card
  directionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  directionIconWrapper: {
    marginRight: 16,
  },
  directionIconBg: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  directionInfo: {
    flex: 1,
  },
  directionDistance: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1A1A2E',
  },
  directionText: {
    fontSize: 15,
    color: '#666',
    marginTop: 2,
  },
  streetName: {
    fontSize: 13,
    color: '#999',
    marginTop: 2,
  },

  // Progress
  progressContainer: {
    marginBottom: 14,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#E8E8E8',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 3,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  progressText: {
    fontSize: 12,
    color: '#888',
    fontWeight: '500',
  },

  // Warning Card
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E7',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#FFE4B3',
  },
  warningIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FFB347',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  warningContent: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 12,
    color: '#666',
  },
  warningValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A2E',
  },

  // Stats Row
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#F8F8F8',
    borderRadius: 14,
    paddingVertical: 12,
    marginBottom: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A2E',
  },
  statDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#E0E0E0',
  },

  // Bottom Actions
  bottomActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  actionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  endButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
  },
  endButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFF',
  },

  // Minimal Bottom Bar (Full Map Mode)
  minimalBottomBar: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 34 : 20,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF',
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  minimalDirection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  minimalDirectionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  minimalDistanceText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A2E',
  },
  minimalStreetText: {
    fontSize: 13,
    color: '#666',
  },
  minimalEndButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FF6B6B',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
