import { Platform } from 'react-native';
import { PROVIDER_GOOGLE } from 'react-native-maps';

/**
 * Harita sağlayıcısı: Android’de Google, iOS’ta varsayılan (Apple MapKit).
 * react-native-maps + Google Maps iOS SDK’da Polyline strokeColor’ın tek renge (mavi) düşmesi
 * veya çoklu segmentte aynı renk görünmesi sık raporlanıyor; eğim renkleri MapKit’te tutarlı.
 */
export function getMapProvider() {
  return Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined;
}
