import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Image,
  StatusBar,
  ImageBackground,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../constants/Colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const MOCK_ROUTES = [
  {
    id: '1',
    image: 'https://images.unsplash.com/photo-1551632811-561732d1e306?auto=format&fit=crop&w=400&q=80',
    title: 'Beşiktaş Sahil',
    distance: '3.1 km',
    likes: '1.2k',
  },
  {
    id: '2',
    image: 'https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=400&q=80',
    title: 'Maçka Parkı',
    distance: '2.8 km',
    likes: '940',
  },
  {
    id: '3',
    image: 'https://images.unsplash.com/photo-1518098268026-4e89f1a2cd8e?auto=format&fit=crop&w=400&q=80',
    title: 'Galata Kulesi',
    distance: '1.5 km',
    likes: '2.1k',
  },
  {
    id: '4',
    image: 'https://images.unsplash.com/photo-1613388484128-4ce6601bfaee?auto=format&fit=crop&w=400&q=80',
    title: 'Bebek Sahil',
    distance: '5.2 km',
    likes: '3.4k',
  },
];

export default function ProfileScreen() {
  const [activeTab, setActiveTab] = useState('routes');

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Cover Image */}
        <View style={styles.coverWrapper}>
          <ImageBackground
            source={{ uri: 'https://images.unsplash.com/photo-1605224095400-f925b422a578?auto=format&fit=crop&q=80&w=800' }}
            style={styles.coverImage}
            imageStyle={styles.coverImageRadius}
          >
            {/* Header Icons */}
            <View style={styles.headerIconsRow}>
              <View style={styles.headerPlaceholder} />
              <TouchableOpacity style={styles.iconButton}>
                <Ionicons name="settings-outline" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </ImageBackground>
        </View>

        {/* Profile Info Section */}
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            <Image
              source={{ uri: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80' }}
              style={styles.avatarImage}
            />
          </View>

          <Text style={styles.userName}>Enes</Text>
          <Text style={styles.userBio}>
            Doğa ve Yürüyüş Tutkunu{'\n'}Yeni rotalar keşfetmeyi sever
          </Text>

          <View style={styles.userMetaRow}>
            <View style={styles.metaItem}>
              <Ionicons name="location-outline" size={14} color="#94A3B8" />
              <Text style={styles.metaText}>İstanbul, TR</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="footsteps-outline" size={14} color="#94A3B8" />
              <Text style={styles.metaText}>Yürüyüşçü - Seviye 3</Text>
            </View>
          </View>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>128</Text>
              <Text style={styles.statLabel}>Takipçi</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statValue}>45</Text>
              <Text style={styles.statLabel}>Takip</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statValue}>12</Text>
              <Text style={styles.statLabel}>Rotalarım</Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtonsRow}>
            <TouchableOpacity style={styles.followButton}>
              <Text style={styles.followButtonText}>Profili Düzenle</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.secondaryButton}>
              <Ionicons name="share-social-outline" size={20} color="#334155" />
            </TouchableOpacity>
          </View>

          {/* Tabs */}
          <View style={styles.tabsRow}>
            <TouchableOpacity 
              style={[styles.tabItem, activeTab === 'routes' && styles.tabItemActive]}
              onPress={() => setActiveTab('routes')}
            >
              <Ionicons name="map-outline" size={20} color={activeTab === 'routes' ? '#0F172A' : '#94A3B8'} />
              <Text style={[styles.tabText, activeTab === 'routes' && styles.tabTextActive]}>Paylaşılan Rotalar</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.tabItem, activeTab === 'saved' && styles.tabItemActive]}
              onPress={() => setActiveTab('saved')}
            >
              <Ionicons name="bookmark-outline" size={20} color={activeTab === 'saved' ? '#0F172A' : '#94A3B8'} />
              <Text style={[styles.tabText, activeTab === 'saved' && styles.tabTextActive]}>Kaydedilenler</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Route Cards (Photos Grid in Mockup) */}
        <View style={styles.gridContainer}>
          {MOCK_ROUTES.map((route, index) => (
            <TouchableOpacity key={route.id} style={styles.gridItem} activeOpacity={0.9}>
              <Image source={{ uri: route.image }} style={styles.gridItemImage} />
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.7)']}
                style={styles.gridItemGradient}
              >
                <Text style={styles.gridItemTitle} numberOfLines={1}>{route.title}</Text>
                <View style={styles.gridItemMetaRow}>
                  <Text style={styles.gridItemMetaText}>{route.distance}</Text>
                  <View style={styles.gridItemLikes}>
                    <Ionicons name="heart" size={12} color="#FFFFFF" />
                    <Text style={styles.gridItemMetaText}>{route.likes}</Text>
                  </View>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
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
  headerIconsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
  },
  headerPlaceholder: {
    width: 40,
    height: 40,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
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
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginBottom: 24,
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E2E8F0',
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
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
    justifyContent: 'space-between',
  },
  gridItem: {
    width: (SCREEN_WIDTH - 44) / 2, // 2 columns with gaps
    height: 220,
    borderRadius: 20,
    overflow: 'hidden',
  },
  gridItemImage: {
    width: '100%',
    height: '100%',
  },
  gridItemGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    justifyContent: 'flex-end',
    padding: 12,
  },
  gridItemTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  gridItemMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  gridItemMetaText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
  },
  gridItemLikes: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});
