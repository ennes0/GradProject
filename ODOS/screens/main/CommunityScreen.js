import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../../components/context/LanguageContext';
import { useAuth } from '../../components/context/AuthContext';
import { useAppAlert } from '../../components/context/AppAlertContext';
import { Colors } from '../../constants/Colors';
import { resolveUserMediaUrl } from '../../config/api';
import { getMapProvider } from '../../constants/mapProvider';
import RouteDetailsModal from '../../components/ui/RouteDetailsModal';
import { mapCommunityFeedItemToCard, mergeSavedRouteDetailIntoCard } from '../../utils/savedRoutes';

const DEFAULT_AVATAR = 'https://www.gravatar.com/avatar/?d=mp&s=200';
const NOTIFICATIONS_LAST_SEEN_KEY = 'odos.notifications.lastSeenAt';

const DISTRICT_COORDS = {
  besiktas: { lat: 41.043, lon: 29.0 },
  kadikoy: { lat: 40.992, lon: 29.028 },
  fatih: { lat: 41.017, lon: 28.949 },
  beyoglu: { lat: 41.035, lon: 28.977 },
  sisli: { lat: 41.061, lon: 28.987 },
  uskudar: { lat: 41.026, lon: 29.015 },
  bakirkoy: { lat: 40.978, lon: 28.872 },
  sariyer: { lat: 41.167, lon: 29.055 },
  atasehir: { lat: 40.993, lon: 29.124 },
  pendik: { lat: 40.875, lon: 29.241 },
  maltepe: { lat: 40.935, lon: 29.153 },
  istanbul: { lat: 41.015, lon: 28.979 },
};

function pickCoordFromLabel(label) {
  const raw = (label || '').toString().trim().toLowerCase();
  if (!raw) return DISTRICT_COORDS.istanbul;
  const key = Object.keys(DISTRICT_COORDS).find((k) => raw.includes(k));
  return key ? DISTRICT_COORDS[key] : DISTRICT_COORDS.istanbul;
}

function buildRoutePreviewGeometry(item) {
  const a = pickCoordFromLabel(item?.startLabel);
  const b = pickCoordFromLabel(item?.endLabel);
  const midLat = (a.lat + b.lat) / 2;
  const midLon = (a.lon + b.lon) / 2;
  const curveLat = midLat + 0.004;
  const curveLon = midLon - 0.003;
  const coordinates = [
    { latitude: a.lat, longitude: a.lon },
    { latitude: curveLat, longitude: curveLon },
    { latitude: b.lat, longitude: b.lon },
  ];
  const latDelta = Math.max(0.045, Math.abs(a.lat - b.lat) * 1.9);
  const lonDelta = Math.max(0.045, Math.abs(a.lon - b.lon) * 1.9);
  return {
    start: { latitude: a.lat, longitude: a.lon },
    end: { latitude: b.lat, longitude: b.lon },
    coordinates,
    region: {
      latitude: midLat,
      longitude: midLon,
      latitudeDelta: latDelta,
      longitudeDelta: lonDelta,
    },
  };
}

function parseRoutePolylineJson(raw) {
  if (!raw) return [];
  try {
    const arr = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!Array.isArray(arr)) return [];
    return arr
      .map((p) => {
        const lat = Number(p?.lat ?? p?.latitude);
        const lon = Number(p?.lon ?? p?.longitude);
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
        return { latitude: lat, longitude: lon };
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

function buildRoutePreviewGeometryFromCoords(coords, fallbackItem) {
  if (!Array.isArray(coords) || coords.length < 2) {
    return buildRoutePreviewGeometry(fallbackItem);
  }
  const start = coords[0];
  const end = coords[coords.length - 1];
  let minLat = start.latitude;
  let maxLat = start.latitude;
  let minLon = start.longitude;
  let maxLon = start.longitude;
  for (const c of coords) {
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
    coordinates: coords,
    region: {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLon + maxLon) / 2,
      latitudeDelta,
      longitudeDelta,
    },
  };
}

export default function CommunityScreen() {
  const navigation = useNavigation();
  const { tx } = useLanguage();
  const { showAlert } = useAppAlert();
  const { searchCommunityUsers, followUser, unfollowUser, fetchCommunityFeed, fetchCommunityRoutePreview, fetchCommunityNotifications } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [usersLoading, setUsersLoading] = useState(false);
  const [feedLoading, setFeedLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [feedItems, setFeedItems] = useState([]);
  const [pendingFollowIds, setPendingFollowIds] = useState([]);
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);
  const [routeModalVisible, setRouteModalVisible] = useState(false);
  const [routeModalLoading, setRouteModalLoading] = useState(false);
  const [routeForModal, setRouteForModal] = useState(null);
  const [feedRoutePolylinesById, setFeedRoutePolylinesById] = useState({});

  const openPublicProfile = useCallback((userId) => {
    if (!userId) return;
    navigation.navigate('PublicProfile', { userId });
  }, [navigation]);

  const openFeedRoutePreview = useCallback(async (item) => {
    if (!item?.routeId) return;
    const base = mapCommunityFeedItemToCard(item);
    setRouteForModal(base);
    setRouteModalVisible(true);
    setRouteModalLoading(true);
    try {
      const detail = await fetchCommunityRoutePreview(item.routeId);
      setRouteForModal(mergeSavedRouteDetailIntoCard(base, detail));
    } catch (e) {
      showAlert({
        title: tx('Rota', 'Route'),
        message: e?.message || tx('Rota detayı yüklenemedi.', 'Route details could not be loaded.'),
        type: 'warning',
      });
    } finally {
      setRouteModalLoading(false);
    }
  }, [fetchCommunityRoutePreview, showAlert, tx]);

  const closeRouteModal = useCallback(() => {
    setRouteModalVisible(false);
    setRouteForModal(null);
    setRouteModalLoading(false);
  }, []);

  const loadUsers = useCallback(async (query = searchQuery) => {
    setUsersLoading(true);
    try {
      const rows = await searchCommunityUsers(query, 30);
      setUsers(rows);
    } catch (e) {
      showAlert({
        title: tx('Topluluk', 'Community'),
        message: e?.message || tx('Kullanıcılar yüklenemedi.', 'Users could not be loaded.'),
        type: 'error',
      });
    } finally {
      setUsersLoading(false);
    }
  }, [searchCommunityUsers, searchQuery, showAlert, tx]);

  const loadFeed = useCallback(async () => {
    setFeedLoading(true);
    try {
      const rows = await fetchCommunityFeed(25);
      setFeedItems(rows);

      const missing = rows.filter((item) => item?.routeId && !feedRoutePolylinesById[String(item.routeId)]);
      if (missing.length > 0) {
        const settled = await Promise.allSettled(
          missing.map(async (item) => {
            const detail = await fetchCommunityRoutePreview(item.routeId);
            const coords = parseRoutePolylineJson(detail?.routePolylineJson);
            return { routeId: String(item.routeId), coords };
          })
        );

        const patch = {};
        for (const result of settled) {
          if (result.status !== 'fulfilled') continue;
          if (!result.value?.routeId) continue;
          patch[result.value.routeId] = result.value.coords || [];
        }

        if (Object.keys(patch).length > 0) {
          setFeedRoutePolylinesById((prev) => ({ ...prev, ...patch }));
        }
      }
    } catch (e) {
      showAlert({
        title: tx('Topluluk', 'Community'),
        message: e?.message || tx('Akış yüklenemedi.', 'Feed could not be loaded.'),
        type: 'error',
      });
    } finally {
      setFeedLoading(false);
    }
  }, [fetchCommunityFeed, fetchCommunityRoutePreview, feedRoutePolylinesById, showAlert, tx]);

  useFocusEffect(
    useCallback(() => {
      void loadUsers('');
      void loadFeed();
      void (async () => {
        try {
          const rows = await fetchCommunityNotifications(1);
          const newest = rows?.[0]?.createdAt;
          if (!newest) {
            setHasUnreadNotifications(false);
            return;
          }
          const seenAt = await AsyncStorage.getItem(NOTIFICATIONS_LAST_SEEN_KEY);
          if (!seenAt) {
            setHasUnreadNotifications(true);
            return;
          }
          setHasUnreadNotifications(new Date(newest).getTime() > new Date(seenAt).getTime());
        } catch {
          // Bildirim kontrolü başarısız olsa da ekran çalışmaya devam etsin.
        }
      })();
    }, [loadUsers, loadFeed, fetchCommunityNotifications]),
  );

  const handleSearchChange = useCallback((text) => {
    setSearchQuery(text);
  }, []);

  const handleSearchSubmit = useCallback(() => {
    void loadUsers(searchQuery);
  }, [loadUsers, searchQuery]);

  const handleToggleFollow = useCallback(async (userId, currentlyFollowing, currentlyRequested) => {
    if (!userId || pendingFollowIds.includes(userId)) return;
    setPendingFollowIds((prev) => [...prev, userId]);
    try {
      if (currentlyFollowing || currentlyRequested) {
        await unfollowUser(userId);
        const reduceFollowers = !!currentlyFollowing;
        setUsers((prev) => prev.map((u) => {
          if (u.id !== userId) return u;
          const followers = Number(u.followers || 0);
          return {
            ...u,
            following: false,
            requested: false,
            followers: reduceFollowers ? Math.max(0, followers - 1) : followers,
          };
        }));
      } else {
        const result = await followUser(userId);
        setUsers((prev) => prev.map((u) => {
          if (u.id !== userId) return u;
          const followers = Number(u.followers || 0);
          if (result?.action === 'request_sent' || result?.action === 'request_pending') {
            return {
              ...u,
              following: false,
              requested: true,
            };
          }
          return {
            ...u,
            following: true,
            requested: false,
            followers: followers + 1,
          };
        }));
      }
      void loadFeed();
    } catch (e) {
      showAlert({
        title: tx('Topluluk', 'Community'),
        message: e?.message || tx('İşlem başarısız.', 'Action failed.'),
        type: 'error',
      });
    } finally {
      setPendingFollowIds((prev) => prev.filter((id) => id !== userId));
    }
  }, [followUser, unfollowUser, pendingFollowIds, showAlert, tx, loadFeed]);

  const feedRows = useMemo(() => feedItems || [], [feedItems]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <Text style={styles.title}>{tx('Topluluk', 'Community')}</Text>
          <TouchableOpacity
            style={styles.notifBtn}
            onPress={() => {
              void (async () => {
                await AsyncStorage.setItem(NOTIFICATIONS_LAST_SEEN_KEY, new Date().toISOString());
                setHasUnreadNotifications(false);
                navigation.navigate('Notifications');
              })();
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="notifications-outline" size={20} color="#334155" />
            {hasUnreadNotifications ? <View style={styles.notifBadge} /> : null}
          </TouchableOpacity>
        </View>
        <Text style={styles.subtitle}>
          {tx('Kullanıcıları keşfet ve rota paylaşanları takip et.', 'Discover users and follow route creators.')}
        </Text>
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={18} color="#64748B" />
        <TextInput
          value={searchQuery}
          onChangeText={handleSearchChange}
          onSubmitEditing={handleSearchSubmit}
          placeholder={tx('Kullanıcı, kullanıcı adı veya şehir ara', 'Search user, username or city')}
          placeholderTextColor="#94A3B8"
          style={styles.searchInput}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => { setSearchQuery(''); void loadUsers(''); }} hitSlop={10}>
            <Ionicons name="close-circle" size={18} color="#94A3B8" />
          </TouchableOpacity>
        ) : null}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.feedHeader}>
          <Text style={styles.resultTitle}>{tx('Takip Ettiklerinin Rotaları', 'Routes from People You Follow')}</Text>
        </View>
        {feedLoading ? (
          <ActivityIndicator size="small" color={Colors.primary} style={styles.loadingInline} />
        ) : feedRows.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="trail-sign-outline" size={28} color="#94A3B8" />
            <Text style={styles.emptyTitle}>{tx('Akışta rota yok', 'No routes in feed')}</Text>
            <Text style={styles.emptyText}>
              {tx('Kullanıcıları takip ettiğinde paylaştıkları rotaları burada göreceksin.', 'When you follow users, their shared routes appear here.')}
            </Text>
          </View>
        ) : (
          feedRows.map((item) => {
            const routeKey = String(item.routeId);
            const storedCoords = feedRoutePolylinesById[routeKey];
            const preview = buildRoutePreviewGeometryFromCoords(storedCoords, item);

            return (
            <TouchableOpacity
              key={`${item.routeId}-${Array.isArray(storedCoords) ? storedCoords.length : 0}`}
              style={styles.feedCard}
              activeOpacity={0.92}
              onPress={() => void openFeedRoutePreview(item)}
            >
              <View style={styles.feedCardImageContainer}>
                <MapView
                  style={styles.feedCardImage}
                  provider={getMapProvider()}
                  initialRegion={preview.region}
                  scrollEnabled={false}
                  zoomEnabled={false}
                  rotateEnabled={false}
                  pitchEnabled={false}
                  toolbarEnabled={false}
                  liteMode
                  pointerEvents="none"
                >
                  <Polyline
                    coordinates={preview.coordinates}
                    strokeColor="#2563EB"
                    strokeWidth={4}
                    lineCap="round"
                    lineJoin="round"
                  />
                  <Marker coordinate={preview.start} tracksViewChanges={false}>
                    <View style={styles.routeStartDot} />
                  </Marker>
                  <Marker coordinate={preview.end} tracksViewChanges={false}>
                    <View style={styles.routeEndDot} />
                  </Marker>
                </MapView>
                <View style={styles.feedCardOverlay}>
                  <View style={styles.feedCardBadge}>
                    <Text style={styles.feedCardBadgeText}>{item.difficulty || tx('Dengeli', 'Balanced')}</Text>
                  </View>
                </View>
              </View>
              
              <View style={styles.feedCardContent}>
                <View style={styles.feedCardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.feedCardTitle}>{item.title}</Text>
                    <Text style={styles.feedCardPath}>
                      {(item.startLabel || tx('Başlangıç', 'Start'))} → {(item.endLabel || tx('Varış', 'Arrival'))}
                    </Text>
                  </View>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => openPublicProfile(item.authorId)}
                  >
                    <Image
                      source={{ uri: resolveUserMediaUrl(item.authorProfilePhotoUrl) || DEFAULT_AVATAR }}
                      style={styles.feedCardAuthorAvatar}
                    />
                  </TouchableOpacity>
                </View>

                <View style={styles.feedCardStats}>
                  <View style={styles.feedCardStatPill}>
                    <Ionicons name="walk-outline" size={13} color="#0F766E" />
                    <Text style={styles.feedCardStatText}>{Math.round((item.traveledDistanceM || 0) / 100) / 10} km</Text>
                  </View>
                  <View style={styles.feedCardStatPill}>
                    <Ionicons name="flame-outline" size={13} color="#B45309" />
                    <Text style={styles.feedCardStatText}>{item.caloriesKcal || 0} kcal</Text>
                  </View>
                  <View style={styles.feedCardStatPill}>
                    <Ionicons name="trending-up-outline" size={13} color="#1D4ED8" />
                    <Text style={styles.feedCardStatText}>{item.climbM || 0} m</Text>
                  </View>
                </View>

                <View style={styles.feedCardAuthorInfo}>
                  <Text style={styles.feedCardAuthorName}>{item.authorFullName || tx('Kullanıcı', 'User')}</Text>
                  <Text style={styles.feedCardAuthorHandle}>@{item.authorUsername || 'user'}</Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })
        )}

        <View style={styles.resultHeader}>
          <Text style={styles.resultTitle}>{tx('Topluluk Üyeleri', 'Community Members')}</Text>
          <Text style={styles.resultCount}>
            {users.length} {tx('sonuç', 'results')}
          </Text>
        </View>

        {usersLoading ? (
          <ActivityIndicator size="small" color={Colors.primary} style={styles.loadingInline} />
        ) : users.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="people-outline" size={28} color="#94A3B8" />
            <Text style={styles.emptyTitle}>{tx('Sonuç bulunamadı', 'No results found')}</Text>
            <Text style={styles.emptyText}>
              {tx('Farklı bir isim, kullanıcı adı veya şehir deneyin.', 'Try another name, username or city.')}
            </Text>
          </View>
        ) : (
          users.map((user) => (
            <TouchableOpacity
              key={user.id}
              style={styles.userCard}
              activeOpacity={0.92}
              onPress={() => openPublicProfile(user.id)}
            >
              <View style={styles.userRowTop}>
                <Image
                  source={{ uri: resolveUserMediaUrl(user.profilePhotoUrl) || DEFAULT_AVATAR }}
                  style={styles.userAvatar}
                />
                <View style={styles.userIdentityBlock}>
                  <View style={styles.userNameRow}>
                    <Text style={styles.userCardName}>{user.fullName}</Text>
                    <View style={styles.userInlineBadge}>
                      <Ionicons name="checkmark-circle" size={12} color="#10B981" />
                    </View>
                  </View>
                  <Text style={styles.userCardHandle}>@{user.username}</Text>
                  <Text style={styles.userCardBio} numberOfLines={2}>{tx(user.bio, user.bio)}</Text>
                </View>
              </View>

              <View style={styles.userCardContent}>
                <View style={styles.userCardStats}>
                  <View style={styles.userCardStatPill}>
                    <Ionicons name="location-outline" size={13} color="#0F766E" />
                    <Text style={styles.userCardStatText}>{user.city || tx('Bilinmiyor', 'Unknown')}</Text>
                  </View>
                  <View style={styles.userCardStatPill}>
                    <Ionicons name="map-outline" size={13} color="#2563EB" />
                    <Text style={styles.userCardStatText}>{user.routesShared}</Text>
                  </View>
                  <View style={styles.userCardStatPill}>
                    <Ionicons name="people-outline" size={13} color="#7C3AED" />
                    <Text style={styles.userCardStatText}>{user.followers}</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.userCardFollowBtn, user.following && styles.userCardFollowBtnActive, user.requested && styles.userCardFollowBtnRequested]}
                  onPress={() => handleToggleFollow(user.id, user.following, user.requested)}
                  disabled={pendingFollowIds.includes(user.id)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.userCardFollowBtnText, user.following && styles.userCardFollowBtnTextActive]}>
                    {pendingFollowIds.includes(user.id)
                      ? tx('...', '...')
                      : user.following
                        ? tx('Takiptesin', 'Following')
                        : user.requested
                          ? tx('İstek Gönderildi', 'Request Sent')
                        : tx('Takip Et', 'Follow')}
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <RouteDetailsModal
        visible={routeModalVisible}
        onClose={closeRouteModal}
        route={routeForModal}
        detailLoading={routeModalLoading}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F7FB',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 14,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  notifBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifBadge: {
    position: 'absolute',
    top: 6,
    right: 7,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  subtitle: {
    marginTop: 6,
    fontSize: 13,
    color: '#64748B',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
  },
  searchWrap: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#DFE7F1',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 8,
    height: 48,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    color: '#0F172A',
    fontSize: 14,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 110,
    gap: 12,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    marginBottom: 2,
  },
  resultTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
  },
  resultCount: {
    fontSize: 12,
    color: '#64748B',
  },
  feedHeader: {
    marginTop: 2,
    marginBottom: 2,
  },
  loadingInline: {
    marginVertical: 8,
  },
  feedCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E4EBF3',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    shadowColor: '#102A43',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
  },
  feedCardImageContainer: {
    position: 'relative',
    width: '100%',
    height: 180,
    backgroundColor: '#E2E8F0',
  },
  feedCardImage: {
    width: '100%',
    height: '100%',
  },
  routeStartDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  routeEndDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#EF4444',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  feedCardOverlay: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 10,
  },
  feedCardBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#F97316',
    borderWidth: 0,
  },
  feedCardBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'capitalize',
  },
  feedCardContent: {
    padding: 14,
    gap: 10,
  },
  feedCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    justifyContent: 'space-between',
  },
  feedCardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  feedCardPath: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
  },
  feedCardAuthorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E2E8F0',
    borderWidth: 2,
    borderColor: '#E0E7FF',
  },
  feedCardStats: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  feedCardStatPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  feedCardStatText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
  },
  feedCardAuthorInfo: {
    gap: 2,
  },
  feedCardAuthorName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  feedCardAuthorHandle: {
    fontSize: 11,
    color: '#64748B',
  },
  tapDetailHint: {
    marginTop: 2,
    fontSize: 11,
    color: '#7C8CA1',
    fontWeight: '600',
  },
  profileLinkHint: {
    marginTop: 3,
    fontSize: 11,
    color: Colors.primary,
    fontWeight: '700',
  },
  emptyCard: {
    marginTop: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 6,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
  },
  emptyText: {
    textAlign: 'center',
    color: '#64748B',
    fontSize: 13,
    lineHeight: 18,
  },
  userCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E4EBF3',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    shadowColor: '#102A43',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
    padding: 14,
  },
  userRowTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  userAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E2E8F0',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  userIdentityBlock: {
    flex: 1,
    minHeight: 56,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  userInlineBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userCardContent: {
    paddingTop: 12,
    gap: 10,
  },
  userCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    justifyContent: 'space-between',
  },
  userCardName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 3,
  },
  userCardHandle: {
    fontSize: 12,
    color: Colors.primaryDark,
    fontWeight: '600',
  },
  userCardBio: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 16,
  },
  userCardStats: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  userCardStatPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  userCardStatText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
  },
  userCardFollowBtn: {
    borderRadius: 999,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: Colors.primary,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  userCardFollowBtnActive: {
    backgroundColor: '#EEF2FF',
    borderColor: '#D4DCFF',
  },
  userCardFollowBtnRequested: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FED7AA',
  },
  userCardFollowBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  userCardFollowBtnTextActive: {
    color: '#334155',
  },
  userMainPress: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E2E8F0',
    borderWidth: 2,
    borderColor: '#E0E7FF',
  },
  userInfo: {
    flex: 1,
    gap: 3,
  },
  name: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  handle: {
    fontSize: 12,
    color: Colors.primaryDark,
    fontWeight: '600',
  },
  bio: {
    marginTop: 2,
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
  },
  metaRow: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  metaText: {
    fontSize: 11,
    color: '#475569',
  },
  metaDot: {
    fontSize: 11,
    color: '#94A3B8',
  },
  followBtn: {
    borderRadius: 999,
    minWidth: 96,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: Colors.primary,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  followBtnActive: {
    backgroundColor: '#EEF2FF',
    borderColor: '#D4DCFF',
  },
  followBtnRequested: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FED7AA',
  },
  followBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  followBtnTextActive: {
    color: '#334155',
  },
});
