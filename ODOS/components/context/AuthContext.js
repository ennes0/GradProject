import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  getCommunityAcceptFollowRequestUrl,
  getCommunityFeedUrl,
  getCommunityFollowUrl,
  getCommunityIncomingFollowRequestsUrl,
  getCommunityNotificationsUrl,
  getCommunityPopularRouteStoriesUrl,
  getCommunityRejectFollowRequestUrl,
  getCommunityRoutePreviewUrl,
  getCommunityUserFollowersUrl,
  getCommunityUserFollowingUrl,
  getCommunityUserRoutesUrl,
  getCommunityUserProfileUrl,
  getCommunityUsersUrl,
  getBannerPhotoUploadUrl,
  getHealthDailySyncUrl,
  getLoginUrl,
  getLogoutUrl,
  getMeUrl,
  getProfilePhotoUploadUrl,
  getRefreshUrl,
  getRegisterUrl,
  getSavedRoutesUrl,
  getSavedRouteByIdUrl,
} from '../../config/api';

const STORAGE_KEYS = {
  accessToken: 'odos.auth.accessToken',
  refreshToken: 'odos.auth.refreshToken',
  user: 'odos.auth.user',
  onboardingCompleted: 'odos.auth.onboardingCompleted',
};

const AuthContext = createContext(null);

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  const raw = await response.text();
  let data = null;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = null;
  }

  if (!response.ok) {
    const message = data?.error || data?.message || 'İstek başarısız oldu';
    throw new Error(message);
  }
  return data;
}

async function parseJsonResponse(response) {
  const raw = await response.text();
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [refreshToken, setRefreshToken] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  const persistSession = useCallback(async (session) => {
    const nextUser = session?.user ?? null;
    const nextAccess = session?.accessToken ?? null;
    const nextRefresh = session?.refreshToken ?? null;

    setUser(nextUser);
    setAccessToken(nextAccess);
    setRefreshToken(nextRefresh);

    if (nextAccess && nextRefresh && nextUser) {
      await AsyncStorage.multiSet([
        [STORAGE_KEYS.accessToken, nextAccess],
        [STORAGE_KEYS.refreshToken, nextRefresh],
        [STORAGE_KEYS.user, JSON.stringify(nextUser)],
      ]);
    } else {
      await AsyncStorage.multiRemove(Object.values(STORAGE_KEYS));
    }
  }, []);

  const clearSession = useCallback(async () => {
    setUser(null);
    setAccessToken(null);
    setRefreshToken(null);
    await AsyncStorage.multiRemove(Object.values(STORAGE_KEYS));
  }, []);

  const refreshSession = useCallback(async (token) => {
    const data = await requestJson(getRefreshUrl(), {
      method: 'POST',
      body: JSON.stringify({ refreshToken: token }),
    });
    await persistSession(data);
    return data;
  }, [persistSession]);

  const restoreSession = useCallback(async () => {
    try {
      const entries = await AsyncStorage.multiGet(Object.values(STORAGE_KEYS));
      const store = Object.fromEntries(entries);
      const storedAccess = store[STORAGE_KEYS.accessToken];
      const storedRefresh = store[STORAGE_KEYS.refreshToken];
      const storedUser = store[STORAGE_KEYS.user];

      if (!storedRefresh) {
        await clearSession();
        return;
      }

      if (storedAccess && storedUser) {
        try {
          const me = await requestJson(getMeUrl(), {
            headers: { Authorization: `Bearer ${storedAccess}` },
          });
          await persistSession({
            accessToken: storedAccess,
            refreshToken: storedRefresh,
            user: me,
          });
          return;
        } catch {
          // access token expired olabilir; refresh deneyelim
        }
      }

      await refreshSession(storedRefresh);
    } catch {
      await clearSession();
    } finally {
      setIsAuthLoading(false);
    }
  }, [clearSession, persistSession, refreshSession]);

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  const login = useCallback(async ({ identifier, password }) => {
    const data = await requestJson(getLoginUrl(), {
      method: 'POST',
      body: JSON.stringify({ identifier, password }),
    });
    await persistSession(data);
    return data;
  }, [persistSession]);

  const register = useCallback(async ({ email, username, password, fullName, preferredLanguage }) => {
    const data = await requestJson(getRegisterUrl(), {
      method: 'POST',
      body: JSON.stringify({ email, username, password, fullName, preferredLanguage }),
    });
    await persistSession(data);
    return data;
  }, [persistSession]);

  const logout = useCallback(async () => {
    try {
      if (refreshToken) {
        await requestJson(getLogoutUrl(), {
          method: 'POST',
          headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
          body: JSON.stringify({ refreshToken }),
        });
      }
    } catch {
      // local session temizliği yeterli
    } finally {
      await clearSession();
    }
  }, [accessToken, clearSession, refreshToken]);

  const fetchWithAuth = useCallback(async (url, options = {}) => {
    let token = accessToken;
    if (!token && refreshToken) {
      const session = await refreshSession(refreshToken);
      token = session.accessToken;
    }

    const perform = async (bearerToken) => fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
        ...(bearerToken ? { Authorization: `Bearer ${bearerToken}` } : {}),
      },
    });

    let response = await perform(token);
    if (response.status === 401 && refreshToken) {
      const session = await refreshSession(refreshToken);
      response = await perform(session.accessToken);
    }
    return response;
  }, [accessToken, refreshSession, refreshToken]);

  /** multipart vb. için Content-Type verme (boundary otomatik). */
  const fetchWithAuthRaw = useCallback(async (url, options = {}) => {
    let token = accessToken;
    if (!token && refreshToken) {
      const session = await refreshSession(refreshToken);
      token = session.accessToken;
    }

    const perform = async (bearerToken) => fetch(url, {
      ...options,
      headers: {
        ...(options.headers || {}),
        ...(bearerToken ? { Authorization: `Bearer ${bearerToken}` } : {}),
      },
    });

    let response = await perform(token);
    if (response.status === 401 && refreshToken) {
      const session = await refreshSession(refreshToken);
      response = await perform(session.accessToken);
    }
    return response;
  }, [accessToken, refreshSession, refreshToken]);

  const uploadProfilePhoto = useCallback(async (localUri) => {
    const isPng = /\.png($|\?)/i.test(localUri);
    const form = new FormData();
    form.append('file', {
      uri: localUri,
      name: isPng ? 'upload.png' : 'upload.jpg',
      type: isPng ? 'image/png' : 'image/jpeg',
    });
    const response = await fetchWithAuthRaw(getProfilePhotoUploadUrl(), {
      method: 'POST',
      body: form,
    });
    const data = await parseJsonResponse(response);
    if (!response.ok) {
      throw new Error(data?.error || data?.message || 'Profil fotoğrafı yüklenemedi');
    }
    if (!data) {
      throw new Error('Sunucudan profil verisi dönmedi');
    }
    setUser(data);
    await AsyncStorage.setItem(STORAGE_KEYS.user, JSON.stringify(data));
    return data;
  }, [fetchWithAuthRaw]);

  const uploadBannerPhoto = useCallback(async (localUri) => {
    const isPng = /\.png($|\?)/i.test(localUri);
    const form = new FormData();
    form.append('file', {
      uri: localUri,
      name: isPng ? 'upload.png' : 'upload.jpg',
      type: isPng ? 'image/png' : 'image/jpeg',
    });
    const response = await fetchWithAuthRaw(getBannerPhotoUploadUrl(), {
      method: 'POST',
      body: form,
    });
    const data = await parseJsonResponse(response);
    if (!response.ok) {
      throw new Error(data?.error || data?.message || 'Banner yüklenemedi');
    }
    if (!data) {
      throw new Error('Sunucudan profil verisi dönmedi');
    }
    setUser(data);
    await AsyncStorage.setItem(STORAGE_KEYS.user, JSON.stringify(data));
    return data;
  }, [fetchWithAuthRaw]);

  const updateMe = useCallback(async (payload) => {
    const response = await fetchWithAuth(getMeUrl(), {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    const data = await parseJsonResponse(response);
    if (!response.ok) {
      throw new Error(data?.error || data?.message || 'Profil güncellenemedi');
    }
    if (!data) {
      throw new Error('Profil güncellendi ancak sunucudan geçerli veri dönmedi');
    }
    setUser(data);
    await AsyncStorage.setItem(STORAGE_KEYS.user, JSON.stringify(data));
    return data;
  }, [fetchWithAuth]);

  const markOnboardingComplete = useCallback(async () => {
    try {
      if (user && accessToken) {
        await updateMe({ onboarding_completed: true });
      }
      await AsyncStorage.setItem(STORAGE_KEYS.onboardingCompleted, 'true');
    } catch (e) {
      console.error('Onboarding completion error:', e);
      await AsyncStorage.setItem(STORAGE_KEYS.onboardingCompleted, 'true');
    }
  }, [user, accessToken, updateMe]);

  const syncDailyHealth = useCallback(async (days) => {
    const response = await fetchWithAuth(getHealthDailySyncUrl(), {
      method: 'POST',
      body: JSON.stringify({ days }),
    });
    const data = await parseJsonResponse(response);
    if (!response.ok) {
      throw new Error(data?.error || data?.message || 'Günlük aktivite senkronu başarısız');
    }
    return data;
  }, [fetchWithAuth]);

  const fetchSavedRoutes = useCallback(async (limit = 80) => {
    const url = `${getSavedRoutesUrl()}?limit=${encodeURIComponent(String(limit))}`;
    const response = await fetchWithAuth(url, { method: 'GET' });
    const data = await parseJsonResponse(response);
    if (!response.ok) {
      throw new Error(data?.error || data?.message || 'Kayıtlı rotalar yüklenemedi');
    }
    return Array.isArray(data) ? data : [];
  }, [fetchWithAuth]);

  const createSavedRoute = useCallback(async (payload) => {
    const response = await fetchWithAuth(getSavedRoutesUrl(), {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    const data = await parseJsonResponse(response);
    if (!response.ok) {
      throw new Error(data?.error || data?.message || 'Rota kaydedilemedi');
    }
    return data;
  }, [fetchWithAuth]);

  const patchSavedRoute = useCallback(async (id, body) => {
    const response = await fetchWithAuth(getSavedRouteByIdUrl(id), {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
    const data = await parseJsonResponse(response);
    if (!response.ok) {
      throw new Error(data?.error || data?.message || 'Rota güncellenemedi');
    }
    return data;
  }, [fetchWithAuth]);

  const deleteSavedRoute = useCallback(async (id) => {
    const response = await fetchWithAuth(getSavedRouteByIdUrl(id), { method: 'DELETE' });
    if (!response.ok) {
      const data = await parseJsonResponse(response);
      throw new Error(data?.error || data?.message || 'Rota silinemedi');
    }
  }, [fetchWithAuth]);

  const fetchSavedRouteById = useCallback(async (id) => {
    const response = await fetchWithAuth(getSavedRouteByIdUrl(id), { method: 'GET' });
    const data = await parseJsonResponse(response);
    if (!response.ok) {
      throw new Error(data?.error || data?.message || 'Rota detayı yüklenemedi');
    }
    return data;
  }, [fetchWithAuth]);

  const searchCommunityUsers = useCallback(async (query = '', limit = 20) => {
    const url = `${getCommunityUsersUrl()}?q=${encodeURIComponent(query)}&limit=${encodeURIComponent(String(limit))}`;
    const response = await fetchWithAuth(url, { method: 'GET' });
    const data = await parseJsonResponse(response);
    if (!response.ok) {
      throw new Error(data?.error || data?.message || 'Kullanıcılar yüklenemedi');
    }
    return Array.isArray(data) ? data : [];
  }, [fetchWithAuth]);

  const followUser = useCallback(async (userId) => {
    const response = await fetchWithAuth(getCommunityFollowUrl(userId), { method: 'POST' });
    const data = await parseJsonResponse(response);
    if (!response.ok) {
      throw new Error(data?.error || data?.message || 'Takip işlemi başarısız');
    }
    return data || { action: 'followed' };
  }, [fetchWithAuth]);

  const unfollowUser = useCallback(async (userId) => {
    const response = await fetchWithAuth(getCommunityFollowUrl(userId), { method: 'DELETE' });
    const data = await parseJsonResponse(response);
    if (!response.ok) {
      throw new Error(data?.error || data?.message || 'Takipten çıkma başarısız');
    }
    return data || { action: 'unfollowed' };
  }, [fetchWithAuth]);

  const fetchCommunityFeed = useCallback(async (limit = 30) => {
    const url = `${getCommunityFeedUrl()}?limit=${encodeURIComponent(String(limit))}`;
    const response = await fetchWithAuth(url, { method: 'GET' });
    const data = await parseJsonResponse(response);
    if (!response.ok) {
      throw new Error(data?.error || data?.message || 'Topluluk akışı yüklenemedi');
    }
    return Array.isArray(data) ? data : [];
  }, [fetchWithAuth]);

  const fetchPublicUserProfile = useCallback(async (userId) => {
    const response = await fetchWithAuth(getCommunityUserProfileUrl(userId), { method: 'GET' });
    const data = await parseJsonResponse(response);
    if (!response.ok) {
      throw new Error(data?.error || data?.message || 'Profil yüklenemedi');
    }
    return data;
  }, [fetchWithAuth]);

  const fetchUserFollowers = useCallback(async (userId, limit = 50) => {
    const response = await fetchWithAuth(getCommunityUserFollowersUrl(userId, limit), { method: 'GET' });
    const data = await parseJsonResponse(response);
    if (!response.ok) {
      throw new Error(data?.error || data?.message || 'Takipçi listesi yüklenemedi');
    }
    return Array.isArray(data) ? data : [];
  }, [fetchWithAuth]);

  const fetchUserFollowing = useCallback(async (userId, limit = 50) => {
    const response = await fetchWithAuth(getCommunityUserFollowingUrl(userId, limit), { method: 'GET' });
    const data = await parseJsonResponse(response);
    if (!response.ok) {
      throw new Error(data?.error || data?.message || 'Takip listesi yüklenemedi');
    }
    return Array.isArray(data) ? data : [];
  }, [fetchWithAuth]);

  const fetchPublicUserRoutes = useCallback(async (userId, limit = 40) => {
    const response = await fetchWithAuth(getCommunityUserRoutesUrl(userId, limit), { method: 'GET' });
    const data = await parseJsonResponse(response);
    if (!response.ok) {
      throw new Error(data?.error || data?.message || 'Kullanıcı rotaları yüklenemedi');
    }
    return Array.isArray(data) ? data : [];
  }, [fetchWithAuth]);

  const fetchCommunityRoutePreview = useCallback(async (routeId) => {
    const response = await fetchWithAuth(getCommunityRoutePreviewUrl(routeId), { method: 'GET' });
    const data = await parseJsonResponse(response);
    if (!response.ok) {
      throw new Error(data?.error || data?.message || 'Rota önizlemesi yüklenemedi');
    }
    return data;
  }, [fetchWithAuth]);

  const fetchIncomingFollowRequests = useCallback(async (limit = 50) => {
    const response = await fetchWithAuth(getCommunityIncomingFollowRequestsUrl(limit), { method: 'GET' });
    const data = await parseJsonResponse(response);
    if (!response.ok) {
      throw new Error(data?.error || data?.message || 'Takip istekleri yüklenemedi');
    }
    return Array.isArray(data) ? data : [];
  }, [fetchWithAuth]);

  const acceptFollowRequest = useCallback(async (requestId) => {
    const response = await fetchWithAuth(getCommunityAcceptFollowRequestUrl(requestId), { method: 'POST' });
    const data = await parseJsonResponse(response);
    if (!response.ok) {
      throw new Error(data?.error || data?.message || 'Takip isteği kabul edilemedi');
    }
    return data || { action: 'request_accepted' };
  }, [fetchWithAuth]);

  const rejectFollowRequest = useCallback(async (requestId) => {
    const response = await fetchWithAuth(getCommunityRejectFollowRequestUrl(requestId), { method: 'POST' });
    const data = await parseJsonResponse(response);
    if (!response.ok) {
      throw new Error(data?.error || data?.message || 'Takip isteği reddedilemedi');
    }
    return data || { action: 'request_rejected' };
  }, [fetchWithAuth]);

  const fetchCommunityNotifications = useCallback(async (limit = 80) => {
    const response = await fetchWithAuth(getCommunityNotificationsUrl(limit), { method: 'GET' });
    const data = await parseJsonResponse(response);
    if (!response.ok) {
      throw new Error(data?.error || data?.message || 'Bildirimler yüklenemedi');
    }
    return Array.isArray(data) ? data : [];
  }, [fetchWithAuth]);

  const fetchPopularRouteStories = useCallback(async (limit = 12) => {
    const response = await fetchWithAuth(getCommunityPopularRouteStoriesUrl(limit), { method: 'GET' });
    const data = await parseJsonResponse(response);
    if (!response.ok) {
      throw new Error(data?.error || data?.message || 'Popüler rota hikayeleri yüklenemedi');
    }
    return Array.isArray(data) ? data : [];
  }, [fetchWithAuth]);

  const value = useMemo(() => ({
    user,
    accessToken,
    refreshToken,
    isAuthenticated: !!accessToken && !!user,
    isAuthLoading,
    login,
    register,
    logout,
    updateMe,
    markOnboardingComplete,
    uploadProfilePhoto,
    uploadBannerPhoto,
    syncDailyHealth,
    fetchSavedRoutes,
    createSavedRoute,
    patchSavedRoute,
    deleteSavedRoute,
    fetchSavedRouteById,
    searchCommunityUsers,
    followUser,
    unfollowUser,
    fetchCommunityFeed,
    fetchPublicUserProfile,
    fetchUserFollowers,
    fetchUserFollowing,
    fetchPublicUserRoutes,
    fetchCommunityRoutePreview,
    fetchIncomingFollowRequests,
    acceptFollowRequest,
    rejectFollowRequest,
    fetchCommunityNotifications,
    fetchPopularRouteStories,
    fetchWithAuth,
  }), [user, accessToken, refreshToken, isAuthLoading, login, register, logout, updateMe, markOnboardingComplete, uploadProfilePhoto, uploadBannerPhoto, syncDailyHealth, fetchSavedRoutes, createSavedRoute, patchSavedRoute, deleteSavedRoute, fetchSavedRouteById, searchCommunityUsers, followUser, unfollowUser, fetchCommunityFeed, fetchPublicUserProfile, fetchUserFollowers, fetchUserFollowing, fetchPublicUserRoutes, fetchCommunityRoutePreview, fetchIncomingFollowRequests, acceptFollowRequest, rejectFollowRequest, fetchCommunityNotifications, fetchPopularRouteStories, fetchWithAuth]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
