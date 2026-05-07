/**
 * ODOS rota API base URL.
 * Geliştirmede: Metro ile aynı makine (Expo hostUri); fiziksel cihaz da backend'e erişir.
 */
function getApiBase() {
  return 'https://odosproject.duckdns.org';
}

export const getApiBaseUrl = () => getApiBase();

export const getRouteUrl = (originLat, originLon, destLat, destLon) =>
  `${getApiBase()}/v1/route?origin_lat=${originLat}&origin_lon=${originLon}&dest_lat=${destLat}&dest_lon=${destLon}`;

export const getRoutesUrl = (originLat, originLon, destLat, destLon) =>
  `${getApiBase()}/v1/routes?origin_lat=${originLat}&origin_lon=${originLon}&dest_lat=${destLat}&dest_lon=${destLon}`;

export const GOOGLE_PLACES_API_KEY = 'AIzaSyDw2tqWxldIJgur7Iuw8ErU3J5DIO8h0yA';

export const getGooglePlacesAutocompleteUrl = ({ input, sessionToken, latitude, longitude, radius = 50000 }) => {
  const params = new URLSearchParams({
    input: String(input || ''),
    key: GOOGLE_PLACES_API_KEY,
    language: 'tr',
    region: 'tr',
    components: 'country:tr',
  });

  if (sessionToken) {
    params.set('sessiontoken', String(sessionToken));
  }

  if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
    params.set('locationbias', `circle:${Math.max(1000, Math.round(radius))}@${latitude},${longitude}`);
  }

  return `https://maps.googleapis.com/maps/api/place/autocomplete/json?${params.toString()}`;
};

export const getGooglePlaceDetailsUrl = ({ placeId, sessionToken }) => {
  const params = new URLSearchParams({
    place_id: String(placeId || ''),
    key: GOOGLE_PLACES_API_KEY,
    language: 'tr',
    fields: 'geometry,name,formatted_address',
  });

  if (sessionToken) {
    params.set('sessiontoken', String(sessionToken));
  }

  return `https://maps.googleapis.com/maps/api/place/details/json?${params.toString()}`;
};

export const getGoogleGeocodingUrl = ({ latitude, longitude }) => {
  const params = new URLSearchParams({
    latlng: `${latitude},${longitude}`,
    key: GOOGLE_PLACES_API_KEY,
    language: 'tr',
    region: 'tr',
    result_type: 'street_address|route|neighborhood|sublocality|locality|administrative_area_level_2',
  });
  return `https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`;
};

export const getRegisterUrl = () => `${getApiBase()}/api/auth/register`;
export const getLoginUrl = () => `${getApiBase()}/api/auth/login`;
export const getRefreshUrl = () => `${getApiBase()}/api/auth/refresh`;
export const getLogoutUrl = () => `${getApiBase()}/api/auth/logout`;
export const getMeUrl = () => `${getApiBase()}/api/auth/me`;
export const getHealthDailySyncUrl = () => `${getApiBase()}/api/auth/me/health/daily-sync`;
export const getProfilePhotoUploadUrl = () => `${getApiBase()}/api/auth/me/profile-photo`;
export const getBannerPhotoUploadUrl = () => `${getApiBase()}/api/auth/me/banner-photo`;

export const getSavedRoutesUrl = () => `${getApiBase()}/api/saved-routes`;

export const getSavedRouteByIdUrl = (id) =>
  `${getApiBase()}/api/saved-routes/${encodeURIComponent(String(id))}`;

export const getCommunityUsersUrl = () => `${getApiBase()}/api/community/users`;
export const getCommunityFeedUrl = () => `${getApiBase()}/api/community/feed`;
export const getCommunityFollowUrl = (userId) =>
  `${getApiBase()}/api/community/follow/${encodeURIComponent(String(userId))}`;

export const getCommunityUserProfileUrl = (userId) =>
  `${getApiBase()}/api/community/users/${encodeURIComponent(String(userId))}/profile`;

export const getCommunityUserFollowersUrl = (userId, limit = 50) =>
  `${getApiBase()}/api/community/users/${encodeURIComponent(String(userId))}/followers?limit=${encodeURIComponent(String(limit))}`;

export const getCommunityUserFollowingUrl = (userId, limit = 50) =>
  `${getApiBase()}/api/community/users/${encodeURIComponent(String(userId))}/following?limit=${encodeURIComponent(String(limit))}`;

export const getCommunityUserRoutesUrl = (userId, limit = 40) =>
  `${getApiBase()}/api/community/users/${encodeURIComponent(String(userId))}/routes?limit=${encodeURIComponent(String(limit))}`;

export const getCommunityRoutePreviewUrl = (routeId) =>
  `${getApiBase()}/api/community/routes/${encodeURIComponent(String(routeId))}/preview`;

export const getCommunityIncomingFollowRequestsUrl = (limit = 50) =>
  `${getApiBase()}/api/community/follow-requests/incoming?limit=${encodeURIComponent(String(limit))}`;

export const getCommunityAcceptFollowRequestUrl = (requestId) =>
  `${getApiBase()}/api/community/follow-requests/${encodeURIComponent(String(requestId))}/accept`;

export const getCommunityRejectFollowRequestUrl = (requestId) =>
  `${getApiBase()}/api/community/follow-requests/${encodeURIComponent(String(requestId))}/reject`;

export const getCommunityNotificationsUrl = (limit = 80) =>
  `${getApiBase()}/api/community/notifications?limit=${encodeURIComponent(String(limit))}`;

export const getCommunityPopularRouteStoriesUrl = (limit = 12) =>
  `${getApiBase()}/api/community/stories/popular-routes?limit=${encodeURIComponent(String(limit))}`;

/**
 * Sunucunun döndüğü göreli medya yolunu (/api/media/...) tam URL'ye çevirir.
 * DB'de kalmış file:// veya content:// değerlerini güvenli biçimde yok sayar.
 */
export function resolveUserMediaUrl(url) {
  if (url == null || typeof url !== 'string') {
    return null;
  }
  const t = url.trim();
  if (!t) {
    return null;
  }
  const low = t.toLowerCase();
  if (low.startsWith('file:') || low.startsWith('content:')) {
    return null;
  }
  if (low.startsWith('http://') || low.startsWith('https://')) {
    return t;
  }
  if (t.startsWith('/')) {
    const base = getApiBaseUrl().replace(/\/$/, '');
    return `${base}${t}`;
  }
  return t;
}
