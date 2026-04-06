import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated, Easing, Modal, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '../../constants/Colors';

const ROUTE_MODES = ['En Kolay', 'Dengeli', 'Hizli'];
const STORY_VIEW_DURATION = 4200;
const TEMP_STORY_IMAGE_URL = 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=1200&q=80';

const POPULAR_ROUTE_STORIES = [
  {
    id: 'story1',
    userName: 'Mert',
    userInitial: 'M',
    districtName: 'Besiktas',
    timeAgo: '12 dk',
    isNew: true,
    routeName: 'Besiktas Sahil Kacamagi',
    from: 'Besiktas',
    to: 'Ortakoy',
    distance: '3.1 km',
    duration: '39 dk',
    avgSlope: '%3.2',
    elevation: '42 m',
    likes: '1.2k',
    difficulty: 'Kolay',
    summary: 'Sahil boyunca golgelik ve duz hat. Gun batiminda manzara guclu.',
  },
  {
    id: 'story2',
    userName: 'Zeynep',
    userInitial: 'Z',
    districtName: 'Nisantasi',
    timeAgo: '26 dk',
    isNew: true,
    routeName: 'Nisantasi - Macka Hatti',
    from: 'Nisantasi',
    to: 'Macka Parki',
    distance: '2.8 km',
    duration: '34 dk',
    avgSlope: '%4.8',
    elevation: '57 m',
    likes: '940',
    difficulty: 'Orta',
    summary: 'Kisa ama keyifli bir rota. Ara sokaklarda egim dengeli ilerliyor.',
  },
  {
    id: 'story3',
    userName: 'Kerem',
    userInitial: 'K',
    districtName: 'Kadikoy',
    timeAgo: '1 sa',
    isNew: false,
    routeName: 'Kadikoy Park Turu',
    from: 'Kadikoy Iskele',
    to: 'Yogurtcu Parki',
    distance: '4.4 km',
    duration: '52 dk',
    avgSlope: '%2.1',
    elevation: '35 m',
    likes: '1.8k',
    difficulty: 'Kolay',
    summary: 'Yeni baslayanlar icin ideal, genis kaldirimlar ve dusuk egim.',
  },
  {
    id: 'story4',
    userName: 'Elif',
    userInitial: 'E',
    districtName: 'Galata',
    timeAgo: '2 sa',
    isNew: false,
    routeName: 'Galata Merdiven Challenge',
    from: 'Galata Kulesi',
    to: 'Karakoy',
    distance: '2.1 km',
    duration: '29 dk',
    avgSlope: '%7.9',
    elevation: '86 m',
    likes: '2.1k',
    difficulty: 'Zor',
    summary: 'Yokuslu ama cok populer bir rota. Kisa surede guclu kondisyon etkisi.',
  },
  {
    id: 'story5',
    userName: 'Can',
    userInitial: 'C',
    districtName: 'Bebek',
    timeAgo: '3 sa',
    isNew: false,
    routeName: 'Bebek - Rumeli Hisari',
    from: 'Bebek',
    to: 'Rumeli Hisari',
    distance: '5.2 km',
    duration: '68 dk',
    avgSlope: '%3.9',
    elevation: '74 m',
    likes: '3.4k',
    difficulty: 'Orta',
    summary: 'Uzun ve ritmik bir sahil yuruyusu. Manzara puani yuksek.',
  },
];

export default function HomeScreen({ navigation }) {
  const userName = 'Enes';
  const [selectedMode, setSelectedMode] = useState('Dengeli');
  const [isStoryViewerVisible, setIsStoryViewerVisible] = useState(false);
  const [activeStoryIndex, setActiveStoryIndex] = useState(0);

  const heroAnim = useRef(new Animated.Value(0)).current;
  const cardAnim = useRef(new Animated.Value(0)).current;
  const storyProgressAnims = useRef(
    POPULAR_ROUTE_STORIES.map(() => new Animated.Value(0))
  ).current;

  useEffect(() => {
    Animated.stagger(100, [
      Animated.timing(heroAnim, {
        toValue: 1,
        duration: 420,
        useNativeDriver: true,
      }),
      Animated.timing(cardAnim, {
        toValue: 1,
        duration: 420,
        useNativeDriver: true,
      }),
    ]).start();
  }, [heroAnim, cardAnim]);

  useEffect(() => {
    if (!isStoryViewerVisible) {
      return;
    }

    storyProgressAnims.forEach((anim, index) => {
      anim.stopAnimation();
      anim.setValue(index < activeStoryIndex ? 1 : 0);
    });

    const activeAnimation = storyProgressAnims[activeStoryIndex];
    Animated.timing(activeAnimation, {
      toValue: 1,
      duration: STORY_VIEW_DURATION,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (!finished) {
        return;
      }

      if (activeStoryIndex < POPULAR_ROUTE_STORIES.length - 1) {
        setActiveStoryIndex((prev) => prev + 1);
      } else {
        setIsStoryViewerVisible(false);
      }
    });

    return () => {
      activeAnimation.stopAnimation();
    };
  }, [isStoryViewerVisible, activeStoryIndex, storyProgressAnims]);

  const heroTranslate = heroAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [18, 0],
  });

  const cardTranslate = cardAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [22, 0],
  });

  const openStoryViewer = (index) => {
    storyProgressAnims.forEach((anim, storyIndex) => {
      anim.stopAnimation();
      anim.setValue(storyIndex < index ? 1 : 0);
    });
    setActiveStoryIndex(index);
    setIsStoryViewerVisible(true);
  };

  const closeStoryViewer = () => {
    storyProgressAnims[activeStoryIndex]?.stopAnimation();
    storyProgressAnims.forEach((anim) => {
      anim.stopAnimation();
      anim.setValue(0);
    });
    setIsStoryViewerVisible(false);
    setActiveStoryIndex(0);
  };

  const goToNextStory = () => {
    storyProgressAnims[activeStoryIndex]?.stopAnimation();
    storyProgressAnims[activeStoryIndex].setValue(1);
    if (activeStoryIndex < POPULAR_ROUTE_STORIES.length - 1) {
      setActiveStoryIndex((prev) => prev + 1);
    } else {
      closeStoryViewer();
    }
  };

  const goToPreviousStory = () => {
    storyProgressAnims[activeStoryIndex]?.stopAnimation();
    if (activeStoryIndex === 0) {
      storyProgressAnims[0].setValue(0);
      return;
    }

    const previousIndex = activeStoryIndex - 1;
    storyProgressAnims.forEach((anim, index) => {
      anim.stopAnimation();
      anim.setValue(index < previousIndex ? 1 : 0);
    });
    setActiveStoryIndex(previousIndex);
  };

  const activeStory = POPULAR_ROUTE_STORIES[activeStoryIndex];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Animated.View
          style={[
            styles.instagramTopSection,
            {
              opacity: heroAnim,
              transform: [{ translateY: heroTranslate }],
            },
          ]}
        >
          <View style={styles.instagramHeaderRow}>
            <View style={styles.headerUserRow}>
              <View style={styles.headerAvatar}>
                <Ionicons name="person" size={20} color={Colors.primaryDark} />
              </View>
              <Text style={styles.headerUserName}>{userName}</Text>
            </View>

            <TouchableOpacity
              style={styles.instagramHeaderIconButton}
              activeOpacity={0.8}
              onPress={() => navigation?.navigate('Map')}
            >
              <Ionicons name="search-outline" size={24} color="#111111" />
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.storyRailContent}
          >
            {POPULAR_ROUTE_STORIES.map((story, index) => (
              <TouchableOpacity
                key={story.id}
                style={styles.storyItem}
                activeOpacity={0.85}
                onPress={() => openStoryViewer(index)}
              >
                <LinearGradient
                  colors={
                    story.isNew
                      ? [Colors.primary, Colors.primaryDark]
                      : [Colors.border, Colors.primaryLight]
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.storyRing}
                >
                  <View style={styles.storyAvatarInner}>
                    <Ionicons name="navigate" size={26} color={Colors.primaryDark} />
                  </View>
                </LinearGradient>
                <Text style={styles.storyName} numberOfLines={1}>
                  {story.districtName}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Animated.View>

        <Animated.View
          style={[
            styles.todayPlannerCard,
            {
              opacity: cardAnim,
              transform: [{ translateY: cardTranslate }],
            },
          ]}
        >
          <View style={styles.plannerHeaderRow}>
            <View style={styles.plannerHeaderTitleRow}>
              <View style={styles.plannerIconWrap}>
                <Ionicons name="map" size={20} color={Colors.primary} />
              </View>
              <View>
                <Text style={styles.heroTitle}>Yeni Rota Planla</Text>
                <Text style={styles.heroSubtitle}>Eğime duyarlı, konforlu bir yolculuk.</Text>
              </View>
            </View>
          </View>

          <View style={styles.routeInputContainer}>
            <View style={styles.routeTimeline}>
              <View style={styles.timelineDotStart} />
              <View style={styles.timelineLine} />
              <View style={styles.timelineDotEnd} />
            </View>
            
            <View style={styles.routeInputs}>
              <View style={styles.routeInputBox}>
                <Text style={styles.routeInputLabel}>Nereden</Text>
                <Text style={styles.routeInputValue}>Mevcut Konumum</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.routeInputBox}>
                <Text style={styles.routeInputLabel}>Nereye</Text>
                <Text style={styles.routeInputValuePlaceholder}>Hedef seçin...</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.swapButton} activeOpacity={0.8}>
              <Ionicons name="swap-vertical" size={18} color="#64748B" />
            </TouchableOpacity>
          </View>

          <Text style={styles.modeSectionTitle}>Rota Tercihi</Text>
          <View style={styles.modeList}>
            {ROUTE_MODES.map((mode) => {
              const isActive = selectedMode === mode;
              return (
                <TouchableOpacity
                  key={mode}
                  style={[styles.modeChip, isActive && styles.modeChipActive]}
                  activeOpacity={0.8}
                  onPress={() => setSelectedMode(mode)}
                >
                  <Ionicons 
                    name={mode === 'En Kolay' ? 'leaf' : mode === 'Hizli' ? 'flash' : 'options'} 
                    size={14} 
                    color={isActive ? '#FFFFFF' : '#64748B'} 
                  />
                  <Text style={[styles.modeChipText, isActive && styles.modeChipTextActive]}>{mode}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            style={styles.plannerPrimaryButtonWrap}
            activeOpacity={0.88}
            onPress={() => navigation?.navigate('Map')}
          >
            <LinearGradient
              colors={[Colors.primary, Colors.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.plannerPrimaryButton}
            >
              <Text style={styles.plannerPrimaryButtonText}>Haritaya Geç</Text>
              <View style={styles.plannerPrimaryButtonIcon}>
                <Ionicons name="arrow-forward" size={16} color={Colors.primaryDark} />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        {/* Günlük Aktivite & Sağlık Özeti (Modern UI) */}
        <Animated.View
          style={[
            styles.healthCard,
            {
              opacity: cardAnim,
              transform: [{ translateY: cardTranslate }],
            },
          ]}
        >
          <View style={styles.healthHeader}>
            <View style={styles.healthHeaderLeft}>
              <View style={styles.healthIconWrap}>
                <Ionicons name="fitness" size={20} color="#10B981" />
              </View>
              <Text style={styles.healthTitle}>Günlük Aktivite</Text>
            </View>
            <View style={styles.healthBadge}>
              <Text style={styles.healthBadgeText}>Bugün</Text>
            </View>
          </View>

          <View style={styles.stepContainer}>
            <View style={styles.stepHeader}>
              <View style={styles.stepValueRow}>
                <Text style={styles.stepValue}>6.432</Text>
                <Text style={styles.stepTarget}>/ 10.000 adım</Text>
              </View>
              <Ionicons name="footsteps" size={20} color="#10B981" />
            </View>
            <View style={styles.progressBarBg}>
              <LinearGradient
                colors={['#34D399', '#059669']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.progressBarFill, { width: '64%' }]}
              />
            </View>
          </View>

          <View style={styles.healthGrid}>
            <View style={styles.healthMetric}>
              <View style={[styles.healthMetricIcon, { backgroundColor: '#FEF2F2' }]}>
                <Ionicons name="flame" size={16} color="#EF4444" />
              </View>
              <View>
                <Text style={styles.healthMetricValue}>320</Text>
                <Text style={styles.healthMetricLabel}>kcal</Text>
              </View>
            </View>
            
            <View style={styles.healthMetric}>
              <View style={[styles.healthMetricIcon, { backgroundColor: '#EFF6FF' }]}>
                <Ionicons name="time" size={16} color="#3B82F6" />
              </View>
              <View>
                <Text style={styles.healthMetricValue}>45</Text>
                <Text style={styles.healthMetricLabel}>dk</Text>
              </View>
            </View>
            
            <View style={styles.healthMetric}>
              <View style={[styles.healthMetricIcon, { backgroundColor: '#F5F3FF' }]}>
                <Ionicons name="map" size={16} color="#8B5CF6" />
              </View>
              <View>
                <Text style={styles.healthMetricValue}>4.2</Text>
                <Text style={styles.healthMetricLabel}>km</Text>
              </View>
            </View>
          </View>
        </Animated.View>
      </ScrollView>

      <Modal
        visible={isStoryViewerVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={closeStoryViewer}
      >
        <View style={styles.storyModalBackdrop}>
          <Image source={{ uri: TEMP_STORY_IMAGE_URL }} style={styles.storyFullscreenImage} />
          <LinearGradient
            colors={['rgba(10,16,25,0.28)', 'rgba(10,16,25,0.86)']}
            style={StyleSheet.absoluteFillObject}
          />
          <SafeAreaView style={styles.storyModalSafe} edges={['top', 'bottom']}>
            <View style={styles.storyProgressRow}>
              {POPULAR_ROUTE_STORIES.map((story, index) => {
                const width = storyProgressAnims[index].interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                });

                return (
                  <View key={story.id} style={styles.storyProgressTrack}>
                    <Animated.View style={[styles.storyProgressFill, { width }]} />
                  </View>
                );
              })}
            </View>

            <View style={styles.storyModalHeader}>
              <View style={styles.storyModalUserRow}>
                <LinearGradient colors={[Colors.accent, Colors.primaryDark]} style={styles.storyModalAvatar}>
                  <Text style={styles.storyModalAvatarText}>{activeStory.userInitial}</Text>
                </LinearGradient>
                <View>
                  <Text style={styles.storyModalUserName}>{activeStory.userName}</Text>
                  <Text style={styles.storyModalTime}>{activeStory.timeAgo} once</Text>
                </View>
              </View>

              <TouchableOpacity style={styles.storyCloseButton} onPress={closeStoryViewer}>
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <View style={styles.storyDetailCard}>
              <Text style={styles.storyBadge}>{activeStory.difficulty} Rota</Text>
              <Text style={styles.storyRouteTitle}>{activeStory.routeName}</Text>
              <Text style={styles.storyRoutePath}>
                {activeStory.from} - {activeStory.to}
              </Text>

              <View style={styles.storyMetricRow}>
                <View style={styles.storyMetricBox}>
                  <Ionicons name="walk-outline" size={15} color={Colors.primaryDark} />
                  <Text style={styles.storyMetricLabel}>Mesafe</Text>
                  <Text style={styles.storyMetricValue}>{activeStory.distance}</Text>
                </View>
                <View style={styles.storyMetricBox}>
                  <Ionicons name="time-outline" size={15} color={Colors.primaryDark} />
                  <Text style={styles.storyMetricLabel}>Sure</Text>
                  <Text style={styles.storyMetricValue}>{activeStory.duration}</Text>
                </View>
                <View style={styles.storyMetricBox}>
                  <Ionicons name="trending-up-outline" size={15} color={Colors.primaryDark} />
                  <Text style={styles.storyMetricLabel}>Egim</Text>
                  <Text style={styles.storyMetricValue}>{activeStory.avgSlope}</Text>
                </View>
              </View>

              <View style={styles.storyMetaLine}>
                <Ionicons name="heart" size={14} color={Colors.accent} />
                <Text style={styles.storyMetaText}>{activeStory.likes} begeni</Text>
                <Ionicons name="analytics-outline" size={14} color={Colors.primaryDark} />
                <Text style={styles.storyMetaText}>Yukselis {activeStory.elevation}</Text>
              </View>

              <Text style={styles.storySummaryText}>{activeStory.summary}</Text>

              <TouchableOpacity
                style={styles.storyOpenRouteButton}
                activeOpacity={0.88}
                onPress={() => {
                  closeStoryViewer();
                  navigation?.navigate('Map');
                }}
              >
                <Text style={styles.storyOpenRouteText}>Bu Rotayi Ac</Text>
                <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.storyTapLeft} activeOpacity={1} onPress={goToPreviousStory} />
            <TouchableOpacity style={styles.storyTapRight} activeOpacity={1} onPress={goToNextStory} />
          </SafeAreaView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 128,
  },
  instagramTopSection: {
    paddingTop: 4,
    paddingBottom: 20,
  },
  instagramHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EFF6FD',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#D5E6F6',
  },
  headerUserName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1B2B3B',
  },
  instagramHeaderIconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storyRailContent: {
    gap: 14,
    paddingRight: 10,
    paddingBottom: 8,
    paddingTop: 2,
  },
  storyItem: {
    width: 94,
    alignItems: 'center',
  },
  yourStoryRing: {
    width: 86,
    height: 86,
    borderRadius: 43,
    borderWidth: 2.2,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  yourStoryInner: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#F1F7FD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  yourStoryPlusBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primaryDark,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  storyRing: {
    width: 86,
    height: 86,
    borderRadius: 43,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2.2,
  },
  storyAvatarInner: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  storyInitial: {
    color: Colors.primaryDark,
    fontSize: 20,
    fontWeight: '800',
  },
  storyName: {
    marginTop: 7,
    fontSize: 11,
    fontWeight: '600',
    color: Colors.text,
    width: '100%',
    textAlign: 'center',
  },
  todayPlannerCard: {
    marginTop: 24,
    borderRadius: 28,
    paddingHorizontal: 20,
    paddingVertical: 22,
    backgroundColor: '#FFFFFF',
    shadowColor: '#102A43',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  plannerHeaderRow: {
    marginBottom: 20,
  },
  plannerHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  plannerIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    fontSize: 22,
    color: '#0F172A',
    fontWeight: '800',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  routeInputContainer: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
    position: 'relative',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  routeTimeline: {
    width: 24,
    alignItems: 'center',
    marginRight: 12,
    paddingVertical: 6,
  },
  timelineDotStart: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.primary,
    borderWidth: 3,
    borderColor: '#DCFCE7',
  },
  timelineLine: {
    flex: 1,
    width: 2,
    backgroundColor: '#E2E8F0',
    marginVertical: 4,
    borderStyle: 'dashed',
  },
  timelineDotEnd: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.accent,
    borderWidth: 3,
    borderColor: '#FEF3C7',
  },
  routeInputs: {
    flex: 1,
    justifyContent: 'space-between',
  },
  routeInputBox: {
    paddingVertical: 2,
  },
  routeInputLabel: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  routeInputValue: {
    fontSize: 15,
    color: '#0F172A',
    fontWeight: '700',
  },
  routeInputValuePlaceholder: {
    fontSize: 15,
    color: '#94A3B8',
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 12,
  },
  swapButton: {
    position: 'absolute',
    right: 16,
    top: '50%',
    marginTop: -18,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  modeSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 12,
    marginLeft: 4,
  },
  modeList: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  modeChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modeChipActive: {
    backgroundColor: Colors.primaryDark,
    borderColor: Colors.primaryDark,
  },
  modeChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  modeChipTextActive: {
    color: '#FFFFFF',
  },
  plannerPrimaryButtonWrap: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: Colors.primaryDark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 6,
  },
  plannerPrimaryButton: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 20,
  },
  plannerPrimaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  plannerPrimaryButtonIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  storyModalBackdrop: {
    flex: 1,
    backgroundColor: '#101625',
  },
  storyFullscreenImage: {
    ...StyleSheet.absoluteFillObject,
  },
  storyModalSafe: {
    flex: 1,
    paddingHorizontal: 14,
    paddingTop: 8,
  },
  storyProgressRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  storyProgressTrack: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  storyProgressFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
  },
  storyModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  storyModalUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  storyModalAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storyModalAvatarText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  storyModalUserName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  storyModalTime: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 11,
    marginTop: 1,
  },
  storyCloseButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storyDetailCard: {
    marginTop: 'auto',
    marginBottom: 28,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
    padding: 16,
    zIndex: 3,
  },
  storyBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#EAF5FF',
    color: Colors.primaryDark,
    fontSize: 11,
    fontWeight: '700',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 10,
  },
  storyRouteTitle: {
    fontSize: 23,
    fontWeight: '800',
    color: '#112439',
  },
  storyRoutePath: {
    marginTop: 4,
    fontSize: 13,
    color: '#4F657A',
    marginBottom: 12,
  },
  storyMetricRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 11,
  },
  storyMetricBox: {
    flex: 1,
    borderRadius: 10,
    backgroundColor: '#F1F8FF',
    borderWidth: 1,
    borderColor: '#DDEBFA',
    paddingVertical: 9,
    alignItems: 'center',
  },
  storyMetricLabel: {
    marginTop: 4,
    fontSize: 10,
    fontWeight: '600',
    color: '#6A7D90',
  },
  storyMetricValue: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: '800',
    color: '#173B59',
  },
  storyMetaLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  storyMetaText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#425C74',
    marginRight: 6,
  },
  storySummaryText: {
    fontSize: 13,
    lineHeight: 19,
    color: '#1D3349',
    marginBottom: 14,
  },
  storyOpenRouteButton: {
    height: 42,
    borderRadius: 12,
    backgroundColor: Colors.primaryDark,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  storyOpenRouteText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  storyTapLeft: {
    position: 'absolute',
    left: 0,
    top: 96,
    width: '35%',
    height: '56%',
    zIndex: 2,
  },
  storyTapRight: {
    position: 'absolute',
    right: 0,
    top: 96,
    width: '35%',
    height: '56%',
    zIndex: 2,
  },
  // Health & Activity Section
  healthCard: {
    marginTop: 24,
    borderRadius: 28,
    paddingHorizontal: 20,
    paddingVertical: 22,
    backgroundColor: '#FFFFFF',
    shadowColor: '#102A43',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  healthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  healthHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  healthIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  healthTitle: {
    fontSize: 18,
    color: '#0F172A',
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  healthBadge: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  healthBadgeText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  stepContainer: {
    marginBottom: 24,
  },
  stepHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 10,
  },
  stepValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  stepValue: {
    fontSize: 32,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -1,
  },
  stepTarget: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '600',
    marginBottom: 4,
  },
  progressBarBg: {
    height: 10,
    backgroundColor: '#F1F5F9',
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 5,
  },
  healthGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  healthMetric: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  healthMetricIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  healthMetricValue: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
  },
  healthMetricLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    textAlign: 'center',
    marginTop: 2,
  },
  verticalDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E2E8F0',
  },
});
