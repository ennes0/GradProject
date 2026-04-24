import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  StatusBar,
  ImageBackground,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../components/context/AuthContext';
import { useLanguage } from '../../components/context/LanguageContext';
import { Colors } from '../../constants/Colors';
import { resolveUserMediaUrl } from '../../config/api';
import { mapSavedRouteListItemToCard } from '../../utils/savedRoutes';
import UserListModal from '../../components/ui/UserListModal';

const DEFAULT_PROFILE_IMAGE = 'https://www.gravatar.com/avatar/?d=mp&s=200';
const DEFAULT_BANNER_IMAGE = 'https://images.unsplash.com/photo-1605224095400-f925b422a578?auto=format&fit=crop&q=80&w=800';

export default function ProfileScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const {
    user,
    isAuthenticated,
    fetchSavedRoutes,
    fetchPublicUserProfile,
    fetchUserFollowers,
    fetchUserFollowing,
  } = useAuth();
  const { tx } = useLanguage();
  const [activeTab, setActiveTab] = useState('routes');
  const [savedRouteRows, setSavedRouteRows] = useState([]);
  const [routesLoading, setRoutesLoading] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [listModal, setListModal] = useState(null);
  const [listUsers, setListUsers] = useState([]);
  const [listLoading, setListLoading] = useState(false);

  const loadSavedRoutes = useCallback(async () => {
    if (!isAuthenticated) {
      setSavedRouteRows([]);
      return;
    }
    setRoutesLoading(true);
    try {
      const rows = await fetchSavedRoutes(80);
      setSavedRouteRows(Array.isArray(rows) ? rows : []);
    } finally {
      setRoutesLoading(false);
    }
  }, [isAuthenticated, fetchSavedRoutes]);

  const loadSocialCounts = useCallback(async () => {
    if (!isAuthenticated || !user?.id) {
      setFollowersCount(0);
      setFollowingCount(0);
      return;
    }
    try {
      const profile = await fetchPublicUserProfile(user.id);
      setFollowersCount(Number(profile?.followers || 0));
      setFollowingCount(Number(profile?.followingCount || 0));
    } catch {
      setFollowersCount(0);
      setFollowingCount(0);
    }
  }, [isAuthenticated, user?.id, fetchPublicUserProfile]);

  useFocusEffect(
    useCallback(() => {
      void loadSavedRoutes();
      void loadSocialCounts();
    }, [loadSavedRoutes, loadSocialCounts]),
  );

  const routeCards = useMemo(
    () => savedRouteRows.map(mapSavedRouteListItemToCard).filter(Boolean),
    [savedRouteRows],
  );

  const listRows = useMemo(() => {
    if (activeTab === 'saved') {
      return routeCards.filter((r) => !!r?.isFavorite);
    }
    return routeCards;
  }, [activeTab, routeCards]);

  // Custom tab bar absolute konumda çizildiği için içerikte güvenli alt boşluk bırak.
  const scrollBottomPadding = 120 + insets.bottom;

  const openFollowers = useCallback(async () => {
    if (!user?.id) return;
    setListModal('followers');
    setListLoading(true);
    setListUsers([]);
    try {
      const rows = await fetchUserFollowers(user.id, 100);
      setListUsers(Array.isArray(rows) ? rows : []);
    } finally {
      setListLoading(false);
    }
  }, [user?.id, fetchUserFollowers]);

  const openFollowing = useCallback(async () => {
    if (!user?.id) return;
    setListModal('following');
    setListLoading(true);
    setListUsers([]);
    try {
      const rows = await fetchUserFollowing(user.id, 100);
      setListUsers(Array.isArray(rows) ? rows : []);
    } finally {
      setListLoading(false);
    }
  }, [user?.id, fetchUserFollowing]);

  const handleSelectUser = useCallback((selected) => {
    if (!selected?.id) return;
    navigation.navigate('PublicProfile', { userId: selected.id });
  }, [navigation]);

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: scrollBottomPadding }]}
      >
        {/* Cover Image */}
        <View style={styles.coverWrapper}>
          <ImageBackground
            source={{ uri: resolveUserMediaUrl(user?.bannerPhotoUrl) || DEFAULT_BANNER_IMAGE }}
            style={styles.coverImage}
            imageStyle={styles.coverImageRadius}
          />
        </View>

        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            <Image
              source={{ uri: resolveUserMediaUrl(user?.profilePhotoUrl) || DEFAULT_PROFILE_IMAGE }}
              style={styles.avatarImage}
            />
          </View>

          {isAuthenticated ? (
            <>
              <Text style={styles.userName}>{user?.fullName || tx('ODOS Kullanıcısı', 'ODOS User')}</Text>
              <Text style={styles.userBio}>
                {user?.bio || tx('Henüz profil açıklaması eklenmedi.', 'No profile description yet.')}
              </Text>

              <View style={styles.userMetaRow}>
                <View style={styles.metaItem}>
                  <Ionicons name="location-outline" size={14} color="#94A3B8" />
                  <Text style={styles.metaText}>{user?.city || tx('Konum eklenmedi', 'Location not set')}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Ionicons name="footsteps-outline" size={14} color="#94A3B8" />
                  <Text style={styles.metaText}>{`@${user?.username || 'odos'}`}</Text>
                </View>
              </View>

              <View style={styles.followStatsRow}>
                <TouchableOpacity style={styles.followStatItem} activeOpacity={0.8} onPress={() => void openFollowers()}>
                  <Text style={styles.followStatNum}>{followersCount}</Text>
                  <Text style={styles.followStatLabel}>{tx('Takipçi', 'Followers')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.followStatItem} activeOpacity={0.8} onPress={() => void openFollowing()}>
                  <Text style={styles.followStatNum}>{followingCount}</Text>
                  <Text style={styles.followStatLabel}>{tx('Takip', 'Following')}</Text>
                </TouchableOpacity>
                <View style={styles.followStatItem}>
                  <Text style={styles.followStatNum}>{routeCards.length}</Text>
                  <Text style={styles.followStatLabel}>{tx('Rota', 'Routes')}</Text>
                </View>
              </View>

              <View style={styles.actionButtonsRow}>
                <TouchableOpacity
                  style={styles.followButton}
                  onPress={() => navigation.navigate('EditProfile')}
                >
                  <Text style={styles.followButtonText}>{tx('Profili Düzenle', 'Edit Profile')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={() => navigation.navigate('Settings')}
                >
                  <Ionicons name="settings-outline" size={20} color="#334155" />
                </TouchableOpacity>
              </View>

              <View style={styles.infoCard}>
                <Text style={styles.infoCardTitle}>{tx('Profilin hazır', 'Your profile is ready')}</Text>
                <Text style={styles.infoCardText}>
                  {tx(
                    'Sosyal rotalar, puanlamalar ve sağlık istatistikleri eklendikçe burada gerçek verilerin görünecek.',
                    'As social routes, ratings, and health stats are added, your real data will appear here.',
                  )}
                </Text>
              </View>

              <View style={styles.tabsRow}>
                <TouchableOpacity
                  style={[styles.tabItem, activeTab === 'routes' && styles.tabItemActive]}
                  onPress={() => setActiveTab('routes')}
                >
                  <Ionicons name="map-outline" size={20} color={activeTab === 'routes' ? '#0F172A' : '#94A3B8'} />
                  <Text style={[styles.tabText, activeTab === 'routes' && styles.tabTextActive]}>{tx('Rotalarım', 'My Routes')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.tabItem, activeTab === 'saved' && styles.tabItemActive]}
                  onPress={() => setActiveTab('saved')}
                >
                  <Ionicons name="bookmark-outline" size={20} color={activeTab === 'saved' ? '#0F172A' : '#94A3B8'} />
                  <Text style={[styles.tabText, activeTab === 'saved' && styles.tabTextActive]}>{tx('Kaydedilenler', 'Saved')}</Text>
                </TouchableOpacity>
              </View>

              {routesLoading ? (
                <ActivityIndicator size="small" color={Colors.primary} style={{ marginTop: 20 }} />
              ) : listRows.length > 0 ? (
                <View style={styles.routeList}>
                  {listRows.map((route) => (
                    <TouchableOpacity key={route.id} style={styles.routeCard} activeOpacity={0.9}>
                      <View style={styles.routeTopRow}>
                        <View style={styles.routeTitleWrap}>
                          <Text style={styles.routeName} numberOfLines={1}>{route.name}</Text>
                          <Text style={styles.routeDate}>{route.date || ''} {route.time ? `· ${route.time}` : ''}</Text>
                        </View>
                        <View style={styles.routeChevron}>
                          <Ionicons name="chevron-forward" size={16} color="#64748B" />
                        </View>
                      </View>

                      <View style={styles.routePathWrap}>
                        <Ionicons name="navigate-outline" size={14} color="#475569" />
                        <Text style={styles.routePath} numberOfLines={1}>
                          {route.startLocation} {'->'} {route.endLocation}
                        </Text>
                      </View>

                      <View style={styles.routeStatsGrid}>
                        <View style={styles.routeStatPill}>
                          <Ionicons name="walk-outline" size={13} color={Colors.primaryDark} />
                          <Text style={styles.routeMeta}>{route.distance}</Text>
                        </View>
                        <View style={styles.routeStatPill}>
                          <Ionicons name="time-outline" size={13} color="#2563EB" />
                          <Text style={styles.routeMeta}>{route.duration}</Text>
                        </View>
                        <View style={styles.routeStatPill}>
                          <Ionicons name="flame-outline" size={13} color="#DC2626" />
                          <Text style={styles.routeMeta}>{route.calories} kcal</Text>
                        </View>
                      </View>

                      <View style={styles.routeBottomHint}>
                        <Text style={styles.routeHintText}>{tx('Detay için dokun', 'Tap for details')}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <View style={styles.emptyStateCard}>
                  <Ionicons name={activeTab === 'routes' ? 'trail-sign-outline' : 'bookmark-outline'} size={28} color={Colors.primary} />
                  <Text style={styles.emptyStateTitle}>
                    {activeTab === 'routes'
                      ? tx('Henüz rota yok', 'No routes yet')
                      : tx('Henüz kayıtlı rota yok', 'No saved routes yet')}
                  </Text>
                  <Text style={styles.emptyStateText}>
                    {activeTab === 'routes'
                      ? tx(
                        'Kaydettiğin rotalar bu alanda listelenecek.',
                        'Routes you save will be listed here.',
                      )
                      : tx(
                        'Favorilediğin rotaları burada göreceksin.',
                        'You will see your favorited routes here.',
                      )}
                  </Text>
                </View>
              )}
            </>
          ) : (
            <>
              <Text style={styles.userName}>{tx('Profil', 'Profile')}</Text>
              <Text style={styles.userBio}>
                {tx(
                  'Haritayı giriş yapmadan kullanabilirsin. Sosyal, sağlık ve kişisel profil özellikleri için giriş yapman gerekir.',
                  'You can use the map without signing in. Sign in to access social, health, and personal profile features.',
                )}
              </Text>

              <View style={styles.actionButtonsRow}>
                <TouchableOpacity
                  style={styles.primaryAuthButton}
                  onPress={() => navigation.navigate('Login')}
                >
                  <Text style={styles.primaryAuthButtonText}>{tx('Giriş Yap', 'Log In')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.secondaryAuthButton}
                  onPress={() => navigation.navigate('Register')}
                >
                  <Text style={styles.secondaryAuthButtonText}>{tx('Kayıt Ol', 'Sign Up')}</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.guestFeatureCard}>
                <View style={styles.guestFeatureHeader}>
                  <Ionicons name="lock-closed-outline" size={18} color="#D97706" />
                  <Text style={styles.guestFeatureTitle}>{tx('Giriş sonrası açılacak özellikler', 'Features unlocked after sign in')}</Text>
                </View>
                <Text style={styles.guestFeatureItem}>{tx('Profilini düzenleme ve kişiselleştirme', 'Profile editing and personalization')}</Text>
                <Text style={styles.guestFeatureItem}>{tx('Sosyal rota paylaşımı ve puanlama', 'Social route sharing and ratings')}</Text>
                <Text style={styles.guestFeatureItem}>{tx('Kalori, adım ve yürüyüş geçmişi takibi', 'Calorie, step, and walking history tracking')}</Text>
              </View>
            </>
          )}
        </View>
      </ScrollView>
      <UserListModal
        visible={listModal === 'followers'}
        title={tx('Takipçiler', 'Followers')}
        loading={listLoading}
        users={listUsers}
        onClose={() => setListModal(null)}
        onSelectUser={handleSelectUser}
      />
      <UserListModal
        visible={listModal === 'following'}
        title={tx('Takip edilenler', 'Following')}
        loading={listLoading}
        users={listUsers}
        onClose={() => setListModal(null)}
        onSelectUser={handleSelectUser}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  coverWrapper: {
    width: '100%',
    height: 180,
    backgroundColor: '#F1F5F9',
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    overflow: 'hidden',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverImageRadius: {
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  profileSection: {
    alignItems: 'center',
    paddingHorizontal: 24,
    marginTop: -45, // Pull up to overlap cover image
  },
  avatarContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#FFFFFF',
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
    marginBottom: 16,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 45,
  },
  userName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
  },
  userBio: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 12,
  },
  userMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 24,
  },
  followStatsRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 28,
    marginBottom: 20,
  },
  followStatItem: {
    alignItems: 'center',
    minWidth: 86,
  },
  followStatNum: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  followStatLabel: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    marginBottom: 24,
  },
  followButton: {
    flex: 1,
    height: 48,
    backgroundColor: '#F1F5F9', // As per mockup light gray rounded
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  followButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  secondaryButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryAuthButton: {
    flex: 1,
    height: 48,
    backgroundColor: Colors.primary,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryAuthButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  secondaryAuthButton: {
    flex: 1,
    height: 48,
    backgroundColor: '#F8FAFC',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  secondaryAuthButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  tabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  tabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomColor: '#0F172A',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94A3B8',
  },
  tabTextActive: {
    color: '#0F172A',
  },
  infoCard: {
    width: '100%',
    padding: 18,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 24,
  },
  infoCardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  infoCardText: {
    fontSize: 14,
    lineHeight: 21,
    color: '#64748B',
  },
  emptyStateCard: {
    width: '100%',
    marginTop: 20,
    padding: 28,
    borderRadius: 24,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  emptyStateTitle: {
    marginTop: 12,
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  emptyStateText: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    color: '#64748B',
    textAlign: 'center',
  },
  routeList: {
    width: '100%',
    marginTop: 16,
    gap: 10,
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
  guestFeatureCard: {
    width: '100%',
    padding: 20,
    borderRadius: 20,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  guestFeatureHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  guestFeatureTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#92400E',
  },
  guestFeatureItem: {
    fontSize: 14,
    lineHeight: 22,
    color: '#7C5A10',
    marginTop: 4,
  },
});
