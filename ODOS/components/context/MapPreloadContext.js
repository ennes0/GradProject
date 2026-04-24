import React, { createContext, useContext, useState, useEffect } from 'react';
import * as Location from 'expo-location';

const MapPreloadContext = createContext();

export const useMapPreload = () => {
  const context = useContext(MapPreloadContext);
  if (!context) {
    throw new Error('useMapPreload must be used within MapPreloadProvider');
  }
  return context;
};

export const MapPreloadProvider = ({ children }) => {
  const [isMapReady, setIsMapReady] = useState(false);
  const [initialLocation, setInitialLocation] = useState(null);
  const [locationPermission, setLocationPermission] = useState(null);

  useEffect(() => {
    preloadMapData();
  }, []);

  const preloadMapData = async () => {
    try {
      // Konum izni iste
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(status);

      if (status === 'granted') {
        // Mevcut konumu al
        const currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced, // Hızlı başlatma için Balanced kullan
        });

        const { latitude, longitude } = currentLocation.coords;
        setInitialLocation({ latitude, longitude });
      }

      // Harita hazır
      setIsMapReady(true);
    } catch (error) {
      console.error('Harita ön yükleme hatası:', error);
      // Hata olsa bile devam et
      setIsMapReady(true);
    }
  };

  const value = {
    isMapReady,
    initialLocation,
    locationPermission,
  };

  return (
    <MapPreloadContext.Provider value={value}>
      {children}
    </MapPreloadContext.Provider>
  );
};
