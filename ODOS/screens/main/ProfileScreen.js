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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../constants/Colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function ProfileScreen() {
  const [activeTab, setActiveTab] = useState('stats');

  const userStats = [
    { icon: 'footsteps', value: '127.5', label: 'km', color: Colors.primary },
    { icon: 'trophy', value: '42', label: 'Rota', color: '#667EEA' },
    { icon: 'flame', value: '3.2k', label: 'Kalori', color: '#F5576C' },
  ];

  const achievements = [
    { id: 1, icon: 'star', title: '10 Rota', color: '#FFD700' },
    { id: 2, icon: 'rocket', title: '100 km', color: '#FF6B6B' },
    { id: 3, icon: 'trophy', title: 'Haftalık', color: '#4ECDC4' },
  ];

  const preferences = [
    { icon: 'leaf-outline', label: 'Kolay rotaları tercih et', value: true },
    { icon: 'walk-outline', label: 'Yürüyüş modunu kaydet', value: true },
    { icon: 'notifications-outline', label: 'Bildirimler', value: false },
  ];

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <StatusBar hidden={true} />
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profil Header */}
        <LinearGradient
          colors={[Colors.primary, '#3BA99C']}
          style={styles.headerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity style={styles.settingsButton}>
              <Ionicons name="settings-outline" size={22} color="#FFFFFF" />
            </TouchableOpacity>

            <View style={styles.profileImageContainer}>
              <View style={styles.profileImage}>
                <Ionicons name="person" size={40} color={Colors.primary} />
              </View>
            </View>

            <Text style={styles.userName}>Ahmet Yılmaz</Text>
            <Text style={styles.userLocation}>
              <Ionicons name="location" size={12} color="rgba(255,255,255,0.9)" />
              {' '}İstanbul, Türkiye
            </Text>
          </View>
        </LinearGradient>

        {/* İstatistikler */}
        <View style={styles.statsSection}>
          {userStats.map((stat, index) => (
            <View key={index} style={styles.statCard}>
              <View style={[styles.statIconContainer, { backgroundColor: `${stat.color}15` }]}>
                <Ionicons name={stat.icon} size={24} color={stat.color} />
              </View>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Başarılar */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Başarılar</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>Tümü</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.achievementsRow}>
            {achievements.map((achievement) => (
              <View key={achievement.id} style={styles.achievementBadge}>
                <LinearGradient
                  colors={[achievement.color, `${achievement.color}CC`]}
                  style={styles.achievementGradient}
                >
                  <Ionicons name={achievement.icon} size={24} color="#FFFFFF" />
                </LinearGradient>
                <Text style={styles.achievementTitle}>{achievement.title}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Tercihler */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tercihler</Text>
          
          {preferences.map((pref, index) => (
            <View key={index} style={styles.preferenceItem}>
              <View style={styles.preferenceLeft}>
                <View style={styles.preferenceIconContainer}>
                  <Ionicons name={pref.icon} size={20} color={Colors.primary} />
                </View>
                <Text style={styles.preferenceLabel}>{pref.label}</Text>
              </View>
              <View style={[styles.toggle, pref.value && styles.toggleActive]}>
                <View style={[styles.toggleThumb, pref.value && styles.toggleThumbActive]} />
              </View>
            </View>
          ))}
        </View>

        {/* Menü Öğeleri */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuLeft}>
              <Ionicons name="help-circle-outline" size={22} color={Colors.textSecondary} />
              <Text style={styles.menuText}>Yardım & Destek</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.textLight} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuLeft}>
              <Ionicons name="information-circle-outline" size={22} color={Colors.textSecondary} />
              <Text style={styles.menuText}>Hakkında</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.textLight} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuLeft}>
              <Ionicons name="log-out-outline" size={22} color="#F44336" />
              <Text style={[styles.menuText, { color: '#F44336' }]}>Çıkış Yap</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Alt boşluk */}
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  
  // Header
  headerGradient: {
    paddingTop: 50,
    paddingBottom: 40,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerContent: {
    alignItems: 'center',
  },
  settingsButton: {
    position: 'absolute',
    top: 0,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileImageContainer: {
    marginBottom: 12,
  },
  profileImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  userLocation: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
  },

  // Stats
  statsSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    marginTop: -25,
    marginBottom: 24,
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },

  // Sections
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  seeAllText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500',
  },

  // Achievements
  achievementsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  achievementBadge: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 6,
  },
  achievementGradient: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  achievementTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.textSecondary,
    textAlign: 'center',
  },

  // Preferences
  preferenceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  preferenceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  preferenceIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: `${Colors.primary}10`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  preferenceLabel: {
    fontSize: 15,
    color: Colors.text,
    fontWeight: '500',
  },
  toggle: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E0E0E0',
    padding: 2,
    justifyContent: 'center',
  },
  toggleActive: {
    backgroundColor: Colors.primary,
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
  },

  // Menu Items
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuText: {
    fontSize: 15,
    color: Colors.text,
    fontWeight: '500',
    marginLeft: 12,
  },
});
