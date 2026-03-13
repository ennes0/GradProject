/**
 * ODOS rota API base URL.
 * Geliştirmede: Metro ile aynı makine (Expo hostUri); fiziksel cihaz da backend'e erişir.
 */
import { Platform } from 'react-native';

function getApiBase() {
  if (__DEV__) {
    try {
      const Constants = require('expo-constants').default;
      const hostUri = Constants.expoConfig?.hostUri ?? Constants.manifest?.hostUri;
      if (hostUri && typeof hostUri === 'string') {
        const host = hostUri.split(':')[0];
        if (host) {
          const base = `http://${host}:8080`;
          console.log('[ODOS API] Base URL:', base);
          return base;
        }
      }
    } catch (e) {
      console.warn('[ODOS API] hostUri okunamadı:', e?.message);
    }
    const fallback = Platform.OS === 'android' ? 'http://10.0.2.2:8080' : 'http://localhost:8080';
    console.log('[ODOS API] Base URL (fallback):', fallback);
    return fallback;
  }
  return 'https://your-production-api.com';
}

export const getRouteUrl = (originLat, originLon, destLat, destLon) =>
  `${getApiBase()}/v1/route?origin_lat=${originLat}&origin_lon=${originLon}&dest_lat=${destLat}&dest_lon=${destLon}`;

export const getRoutesUrl = (originLat, originLon, destLat, destLon) =>
  `${getApiBase()}/v1/routes?origin_lat=${originLat}&origin_lon=${originLon}&dest_lat=${destLat}&dest_lon=${destLon}`;
