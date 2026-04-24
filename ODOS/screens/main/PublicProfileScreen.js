import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ImageBackground,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../components/context/AuthContext';
import { useLanguage } from '../../components/context/LanguageContext';
import { useAppAlert } from '../../components/context/AppAlertContext';
import { Colors } from '../../constants/Colors';
import { resolveUserMediaUrl } from '../../config/api';
import UserListModal from '../../components/ui/UserListModal';
import RouteDetailsModal from '../../components/ui/RouteDetailsModal';
import { mapSavedRouteListItemToCard, mergeSavedRouteDetailIntoCard } from '../../utils/savedRoutes';

const DEFAULT_PROFILE_IMAGE = 'https://www.gravatar.com/avatar/?d=mp&s=200';
const DEFAULT_BANNER_IMAGE = 'https://images.unsplash.com/photo-1605224095400-f925b422a578?auto=format&fit=crop&q=80&w=800';

export default function PublicProfileScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { tx } = useLanguage();
  const { showAlert } = useAppAlert();
  const {
    user: me,
    fetchPublicUserProfile,
    followUser,
    unfollowUser,
    fetchUserFollowers,
    fetchUserFollowing,
    fetchPublicUserRoutes,
    fetchCommunityRoutePreview,
  } = useAuth();

  const userId = route.params?.userId;
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pendingFollow, setPendingFollow] = useState(false);
  const [routesLoading, setRoutesLoading] = useState(false);
  const [routeRows, setRouteRows] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [routeDetailLoading, setRouteDetailLoading] = useState(false);

  const [listModal, setListModal] = useState(null);
  const [listLoading, setListLoading] = useState(false);
  const [listUsers, setListUsers] = useState([]);

  const loadProfile = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const p = await fetchPublicUserProfile(userId);
      setProfile(p);
      if (!p?.profileHidden) {
        setRoutesLoading(true);
        try {
          const routes = await fetchPublicUserRoutes(userId, 40);
          setRouteRows(routes.map(mapSavedRouteListItemToCard).filter(Boolean));
        } finally {
          setRoutesLoading(false);
        }
      } else {
        setRouteRows([]);
      }
    } catch (e) {
      showAlert({
        title: tx('Profil', 'Profile'),
        message: e?.message || tx('Profil yüklenemedi.', 'Profile could not be loaded.'),
        type: 'error',
      });
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }, [userId, fetchPublicUserProfile, fetchPublicUserRoutes, showAlert, tx, navigation]);

  useFocusEffect(
    useCallback(() => {
      void loadProfile();
    }, [loadProfile]),
  );

  const openFollowers = useCallback(async () => {
    if (!profile?.id) return;
    setListModal('followers');
    setListLoading(true);
    setListUsers([]);
    try {
      const rows = await fetchUserFollowers(profile.id, 80);
      setListUsers(rows);
    } catch (e) {
      setListModal(null);
      showAlert({
        title: tx('Takipçiler', 'Followers'),
        message: e?.message || tx('Liste yüklenemedi.', 'List could not be loaded.'),
        type: 'error',
      });
    } finally {
      setListLoading(false);
    }
  }, [profile, fetchUserFollowers, showAlert, tx]);

  const openFollowing = useCallback(async () => {
    if (!profile?.id) return;
    setListModal('following');
    setListLoading(true);
    setListUsers([]);
    try {
      const rows = await fetchUserFollowing(profile.id, 80);
      setListUsers(rows);
    } catch (e) {
      setListModal(null);
      showAlert({
        title: tx('Takip edilenler', 'Following'),
        message: e?.message || tx('Liste yüklenemedi.', 'List could not be loaded.'),
        type: 'error',
      });
    } finally {
      setListLoading(false);
    }
  }, [profile, fetchUserFollowing, showAlert, tx]);

  const handleFollowToggle = useCallback(async () => {
    if (!profile?.id || profile.viewerIsSelf || pendingFollow) return;
    setPendingFollow(true);
    const wasFollowing = profile.viewerFollows;
    const wasRequested = !!profile.viewerRequested;
    try {
      if (wasFollowing || wasRequested) {
        await unfollowUser(profile.id);
        setProfile((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            viewerFollows: false,
            viewerRequested: false,
            followers: wasFollowing ? Math.max(0, Number(prev.followers || 0) - 1) : Number(prev.followers || 0),
          };
        });
      } else {
        const result = await followUser(profile.id);
        if (result?.action === 'request_sent' || result?.action === 'request_pending') {
          setProfile((prev) => prev ? { ...prev, viewerRequested: true } : prev);
          return;
        }
        try {
          const refreshed = await fetchPublicUserProfile(profile.id);
          setProfile(refreshed);
        } catch {
          setProfile((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              viewerFollows: true,
              viewerRequested: false,
              followers: Number(prev.followers || 0) + 1,
              profileHidden: false,
            };
          });
        }
      }
    } catch (e) {
      showAlert({
        title: tx('Profil', 'Profile'),
        message: e?.message || tx('İşlem başarısız.', 'Action failed.'),
        type: 'error',
      });
    } finally {
      setPendingFollow(false);
    }
  }, [profile, followUser, unfollowUser, pendingFollow, showAlert, tx, fetchPublicUserProfile]);

  const onPickUserFromList = useCallback(
    (u) => {
      if (!u?.id || String(u.id) === String(me?.id)) {
        navigation.navigate('MainTabs', { screen: 'Profile' });
        return;
      }
      navigation.push('PublicProfile', { userId: u.id });
    },
    [navigation, me?.id],
  );

  const openRoutePreview = useCallback(async (routeCard) => {
    if (!routeCard?.serverId) return;
    setSelectedRoute(routeCard);
    setRouteDetailLoading(true);
    try {
      const detail = await fetchCommunityRoutePreview(routeCard.serverId);
      setSelectedRoute((prev) => mergeSavedRouteDetailIntoCard(prev || routeCard, detail));
    } catch (e) {
      showAlert({
        title: tx('Rota', 'Route'),
        message: e?.message || tx('Rota detayı yüklenemedi.', 'Route details could not be loaded.'),
        type: 'warning',
      });
    } finally {
      setRouteDetailLoading(false);
    }
  }, [fetchCommunityRoutePreview, showAlert, tx]);

  const closeRoutePreview = useCallback(() => {
    setSelectedRoute(null);
    setRouteDetailLoading(false);
  }, []);

  if (loading || !profile) {
    return (
      <SafeAreaView style={styles.centered} edges={['top']}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#0F172A" />
        </TouchableOpacity>
        <ActivityIndicator size="large" color={Colors.primary} />
      </SafeAreaView>
    );
  }

  const hidden = profile.profileHidden;
  const bannerUri = resolveUserMediaUrl(profile.bannerPhotoUrl) || DEFAULT_BANNER_IMAGE;
  const avatarUri = resolveUserMediaUrl(profile.profilePhotoUrl) || DEFAULT_PROFILE_IMAGE;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={10}>
          <Ionicons name="arrow-back" size={22} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.topTitle}>{tx('Profil', 'Profile')}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.coverWrapper}>
          <ImageBackground source={{ uri: bannerUri }} style={styles.coverImage} imageStyle={styles.coverImageRadius} />
        </View>

        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
          </View>

          <Text style={styles.userName}>{profile.fullName || profile.username}</Text>
          <Text style={styles.handle}>@{profile.username}</Text>

          {hidden ? (
            <View style={styles.hiddenWrap}>
              <Ionicons name="lock-closed" size={15} color="#64748B" />
              <Text style={styles.hiddenNote}>
                {tx(
                  'Bu kullanıcı profilini gizledi. Detayları görmek için takip etmen gerekir.',
                  'This user has a private profile. Follow them to see more details.',
                )}
              </Text>
            </View>
          ) : (
            <Text style={styles.userBio}>
              {profile.bio || tx('Açıklama yok.', 'No description.')}
            </Text>
          )}

          {!hidden ? (
            <View style={styles.userMetaRow}>
              <View style={styles.metaItem}>
                <Ionicons name="location-outline" size={14} color="#94A3B8" />
                <Text style={styles.metaText}>{profile.city || tx('Konum yok', 'No location')}</Text>
              </View>
            </View>
          ) : null}

          <View style={styles.statsRow}>
            <TouchableOpacity style={styles.statBox} onPress={openFollowers} activeOpacity={0.8}>
              <Text style={styles.statNum}>{profile.followers ?? 0}</Text>
              <Text style={styles.statLabel}>{tx('Takipçi', 'Followers')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.statBox} onPress={openFollowing} activeOpacity={0.8}>
              <Text style={styles.statNum}>{profile.followingCount ?? 0}</Text>
              <Text style={styles.statLabel}>{tx('Takip', 'Following')}</Text>
            </TouchableOpacity>
            <View style={styles.statBox}>
              <Text style={styles.statNum}>{profile.routesShared ?? 0}</Text>
              <Text style={styles.statLabel}>{tx('Rota', 'Routes')}</Text>
            </View>
          </View>

          {!profile.viewerIsSelf ? (
            <TouchableOpacity
              style={[styles.followBtn, profile.viewerFollows && styles.followBtnActive]}
              onPress={handleFollowToggle}
              disabled={pendingFollow}
              activeOpacity={0.85}
            >
              <Text style={[styles.followBtnText, profile.viewerFollows && styles.followBtnTextActive]}>
                {pendingFollow
                  ? tx('...', '...')
                  : profile.viewerFollows
                    ? tx('Takiptesin', 'Following')
                    : profile.viewerRequested
                      ? tx('İstek Gönderildi (geri al)', 'Request Sent (undo)')
                    : tx('Takip Et', 'Follow')}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.editHint}
              onPress={() => navigation.navigate('EditProfile')}
              activeOpacity={0.85}
            >
              <Text style={styles.editHintText}>{tx('Kendi profilini düzenle', 'Edit your profile')}</Text>
            </TouchableOpacity>
          )}

          {!hidden ? (
            <View style={styles.routesSection}>
              <Text style={styles.routesTitle}>{tx('Paylaşılan Rotalar', 'Shared Routes')}</Text>
              {routesLoading ? (
                <ActivityIndicator size="small" color={Colors.primary} style={{ marginTop: 10 }} />
              ) : routeRows.length === 0 ? (
                <Text style={styles.routesEmpty}>
                  {tx('Henüz paylaşılan rota yok.', 'No shared routes yet.')}
                </Text>
              ) : (
                routeRows.map((r) => (
                  <TouchableOpacity
                    key={r.id}
                    style={styles.routeCard}
                    activeOpacity={0.9}
                    onPress={() => void openRoutePreview(r)}
                  >
                    <View style={styles.routeTopRow}>
                      <View style={styles.routeTitleWrap}>
                        <Text style={styles.routeName} numberOfLines={1}>{r.name}</Text>
                        <Text style={styles.routeDate}>{r.date || ''} {r.time ? `· ${r.time}` : ''}</Text>
                      </View>
                      <View style={styles.routeChevron}>
                        <Ionicons name="chevron-forward" size={16} color="#64748B" />
                      </View>
                    </View>

                    <View style={styles.routePathWrap}>
                      <Ionicons name="navigate-outline" size={14} color="#475569" />
                      <Text style={styles.routePath} numberOfLines={1}>
                        {r.startLocation} {'->'} {r.endLocation}
                      </Text>
                    </View>

                    <View style={styles.routeStatsGrid}>
                      <View style={styles.routeStatPill}>
                        <Ionicons name="walk-outline" size={13} color={Colors.primaryDark} />
                        <Text style={styles.routeMeta}>{r.distance}</Text>
                      </View>
                      <View style={styles.routeStatPill}>
                        <Ionicons name="time-outline" size={13} color="#2563EB" />
                        <Text style={styles.routeMeta}>{r.duration}</Text>
                      </View>
                      <View style={styles.routeStatPill}>
                        <Ionicons name="flame-outline" size={13} color="#DC2626" />
                        <Text style={styles.routeMeta}>{r.calories} kcal</Text>
                      </View>
                    </View>

                    <View style={styles.routeBottomHint}>
                      <Text style={styles.routeHintText}>{tx('Detay için dokun', 'Tap for details')}</Text>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </View>
          ) : null}
        </View>
      </ScrollView>

      <UserListModal
        visible={listModal === 'followers'}
        title={tx('Takipçiler', 'Followers')}
        loading={listLoading}
        users={listUsers}
        onClose={() => setListModal(null)}
        onSelectUser={onPickUserFromList}
      />
      <UserListModal
        visible={listModal === 'following'}
        title={tx('Takip edilenler', 'Following')}
        loading={listLoading}
        users={listUsers}
        onClose={() => setListModal(null)}
        onSelectUser={onPickUserFromList}
      />
      <RouteDetailsModal
        visible={!!selectedRoute}
        onClose={closeRoutePreview}
        route={selectedRoute}
        detailLoading={routeDetailLoading}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  centered: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  topTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  coverWrapper: {
    width: '100%',
    height: 160,
    backgroundColor: '#F1F5F9',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverImageRadius: {
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  profileSection: {
    alignItems: 'center',
    paddingHorizontal: 24,
    marginTop: -48,
  },
  avatarContainer: {
    borderRadius: 48,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#E2E8F0',
  },
  userName: {
    marginTop: 12,
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
  },
  handle: {
    marginTop: 4,
    fontSize: 14,
    color: Colors.primaryDark,
    fontWeight: '600',
  },
  userBio: {
    marginTop: 10,
    fontSize: 14,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 20,
  },
  hiddenNote: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
  },
  hiddenWrap: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: 320,
  },
  userMetaRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 13,
    color: '#64748B',
  },
  statsRow: {
    marginTop: 18,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    width: '100%',
  },
  statBox: {
    alignItems: 'center',
    minWidth: 72,
  },
  statNum: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  statLabel: {
    marginTop: 2,
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  followBtn: {
    marginTop: 20,
    alignSelf: 'stretch',
    borderRadius: 12,
    paddingVertical: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  followBtnActive: {
    backgroundColor: '#E2E8F0',
  },
  followBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  followBtnTextActive: {
    color: '#334155',
  },
  editHint: {
    marginTop: 20,
    paddingVertical: 10,
  },
  editHintText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
  },
  routesSection: {
    width: '100%',
    marginTop: 18,
    gap: 8,
    paddingBottom: 22,
  },
  routesTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
  },
  routesEmpty: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  routeCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#DCE8F5',
    backgroundColor: '#F8FBFF',
    padding: 12,
    gap: 8,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  routeTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  routeTitleWrap: {
    flex: 1,
    gap: 2,
  },
  routeName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  routeDate: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
  routeChevron: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  routePathWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  routePath: {
    fontSize: 12,
    color: '#475569',
    flex: 1,
  },
  routeStatsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  routeStatPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  routeMeta: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
  },
  routeBottomHint: {
    marginTop: 2,
    alignItems: 'flex-end',
  },
  routeHintText: {
    fontSize: 11,
    color: '#94A3B8',
  },
});
