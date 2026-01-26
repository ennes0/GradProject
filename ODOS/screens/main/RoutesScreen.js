import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../constants/Colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 40;

// Örnek rota verileri
const COMPLETED_ROUTES = [
  {
    id: '1',
    name: 'Sahil Yürüyüşü',
    startLocation: 'Kadıköy İskele',
    endLocation: 'Moda Sahili',
    date: '20 Ocak 2026',
    time: '14:30',
    distance: '3.2 km',
    duration: '45 dk',
    calories: 185,
    steps: 4250,
    avgSpeed: '4.3 km/s',
    difficulty: 'easy',
    maxSlope: '3%',
    avgSlope: '1.5%',
    elevationGain: '12 m',
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400',
    weather: 'Güneşli',
    temperature: '12°C',
    mood: 'great',
    notes: 'Harika bir yürüyüştü, manzara muhteşemdi.',
  },
  {
    id: '2',
    name: 'Park Turu',
    startLocation: 'Yoğurtçu Parkı Giriş',
    endLocation: 'Yoğurtçu Parkı Giriş',
    date: '19 Ocak 2026',
    time: '10:15',
    distance: '1.8 km',
    duration: '25 dk',
    calories: 95,
    steps: 2380,
    avgSpeed: '4.1 km/s',
    difficulty: 'easy',
    maxSlope: '5%',
    avgSlope: '2%',
    elevationGain: '8 m',
    image: 'https://images.unsplash.com/photo-1519331379826-f10be5486c6f?w=400',
    weather: 'Bulutlu',
    temperature: '9°C',
    mood: 'good',
    notes: 'Sabah yürüyüşü için ideal.',
  },
  {
    id: '3',
    name: 'Tarihi Yarımada Keşfi',
    startLocation: 'Sultanahmet Meydanı',
    endLocation: 'Eminönü',
    date: '18 Ocak 2026',
    time: '11:00',
    distance: '4.5 km',
    duration: '1s 15dk',
    calories: 245,
    steps: 5890,
    avgSpeed: '3.6 km/s',
    difficulty: 'medium',
    maxSlope: '8%',
    avgSlope: '4%',
    elevationGain: '35 m',
    image: 'https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?w=400',
    weather: 'Parçalı Bulutlu',
    temperature: '11°C',
    mood: 'great',
    notes: 'Ayasofya ve Topkapı muhteşemdi!',
  },
  {
    id: '4',
    name: 'Boğaz Yürüyüşü',
    startLocation: 'Bebek Sahil',
    endLocation: 'Rumeli Hisarı',
    date: '15 Ocak 2026',
    time: '15:45',
    distance: '5.8 km',
    duration: '1s 30dk',
    calories: 320,
    steps: 7650,
    avgSpeed: '3.9 km/s',
    difficulty: 'medium',
    maxSlope: '12%',
    avgSlope: '5%',
    elevationGain: '48 m',
    image: 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=400',
    weather: 'Güneşli',
    temperature: '8°C',
    mood: 'good',
    notes: 'Biraz yorucu ama manzara değerdi.',
  },
];

const RECENT_ROUTES = [
  {
    id: 'r1',
    name: 'Eve Dönüş',
    date: 'Bugün, 14:30',
    distance: '1.2 km',
    duration: '18 dk',
  },
  {
    id: 'r2',
    name: 'Ofise Gidiş',
    date: 'Dün, 08:45',
    distance: '2.8 km',
    duration: '35 dk',
  },
  {
    id: 'r3',
    name: 'Market Rotası',
    date: '2 gün önce',
    distance: '0.8 km',
    duration: '12 dk',
  },
];

const CATEGORIES = [
  { id: 'all', label: 'Tümü', icon: 'grid-outline' },
  { id: 'week', label: 'Bu Hafta', icon: 'calendar-outline' },
  { id: 'easy', label: 'Kolay', icon: 'leaf-outline' },
  { id: 'medium', label: 'Orta', icon: 'fitness-outline' },
  { id: 'long', label: 'Uzun', icon: 'trail-sign-outline' },
];

const getMoodConfig = (mood) => {
  switch (mood) {
    case 'great':
      return { icon: 'happy', color: '#4CAF50', label: 'Harika' };
    case 'good':
      return { icon: 'happy-outline', color: '#8BC34A', label: 'İyi' };
    case 'okay':
      return { icon: 'sad-outline', color: '#FFC107', label: 'Normal' };
    case 'tired':
      return { icon: 'sad', color: '#FF9800', label: 'Yorgun' };
    default:
      return { icon: 'happy-outline', color: '#8BC34A', label: 'İyi' };
  }
};

const getDifficultyConfig = (difficulty) => {
  switch (difficulty) {
    case 'easy':
      return { label: 'Kolay', color: Colors.slopeEasy, bg: '#E8F5E9' };
    case 'medium':
      return { label: 'Orta', color: Colors.slopeMedium, bg: '#FFF8E1' };
    case 'hard':
      return { label: 'Zor', color: Colors.slopeHard, bg: '#FBE9E7' };
    default:
      return { label: 'Kolay', color: Colors.slopeEasy, bg: '#E8F5E9' };
  }
};

export default function RoutesScreen() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [favorites, setFavorites] = useState(['1', '3']);

  const toggleFavorite = (routeId) => {
    setFavorites(prev => 
      prev.includes(routeId) 
        ? prev.filter(id => id !== routeId)
        : [...prev, routeId]
    );
  };

  const filteredRoutes = COMPLETED_ROUTES.filter(route => {
    if (selectedCategory === 'all') return true;
    if (selectedCategory === 'week') {
      // Son 7 gün içindeki rotalar
      return true; // Basitleştirilmiş
    }
    if (selectedCategory === 'easy') return route.difficulty === 'easy';
    if (selectedCategory === 'medium') return route.difficulty === 'medium';
    if (selectedCategory === 'long') return parseFloat(route.distance) >= 4;
    return true;
  });

  const renderCategoryItem = (category) => {
    const isSelected = selectedCategory === category.id;
    return (
      <TouchableOpacity
        key={category.id}
        style={[styles.categoryChip, isSelected && styles.categoryChipActive]}
        onPress={() => setSelectedCategory(category.id)}
        activeOpacity={0.7}
      >
        <Ionicons 
          name={category.icon} 
          size={16} 
          color={isSelected ? '#FFFFFF' : Colors.textSecondary} 
        />
        <Text style={[styles.categoryLabel, isSelected && styles.categoryLabelActive]}>
          {category.label}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderRouteCard = ({ item: route }) => {
    const diffConfig = getDifficultyConfig(route.difficulty);
    const moodConfig = getMoodConfig(route.mood);
    const isFav = favorites.includes(route.id);

    return (
      <TouchableOpacity style={styles.routeCard} activeOpacity={0.9}>
        {/* Kart Görseli */}
        <View style={styles.cardImageContainer}>
          <Image 
            source={{ uri: route.image }} 
            style={styles.cardImage}
            resizeMode="cover"
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.8)']}
            style={styles.imageGradient}
          />
          
          {/* Favori Butonu */}
          <TouchableOpacity 
            style={styles.favoriteButton}
            onPress={() => toggleFavorite(route.id)}
          >
            <Ionicons 
              name={isFav ? 'heart' : 'heart-outline'} 
              size={22} 
              color={isFav ? '#FF6B6B' : '#FFFFFF'} 
            />
          </TouchableOpacity>

          {/* Tarih Badge */}
          <View style={styles.dateBadge}>
            <Ionicons name="calendar" size={12} color="#FFFFFF" />
            <Text style={styles.dateText}>{route.date}</Text>
          </View>

          {/* Görsel üzerinde bilgiler */}
          <View style={styles.imageOverlayInfo}>
            <Text style={styles.routeName}>{route.name}</Text>
            <View style={styles.locationRow}>
              <Ionicons name="location" size={14} color={Colors.primary} />
              <Text style={styles.locationText}>{route.startLocation} → {route.endLocation}</Text>
            </View>
          </View>
        </View>

        {/* Kart İçeriği */}
        <View style={styles.cardContent}>
          {/* Ana İstatistikler Grid */}
          <View style={styles.mainStatsGrid}>
            <View style={styles.mainStatBox}>
              <Ionicons name="navigate" size={20} color={Colors.primary} />
              <Text style={styles.mainStatValue}>{route.distance}</Text>
              <Text style={styles.mainStatLabel}>Mesafe</Text>
            </View>
            <View style={styles.mainStatBox}>
              <Ionicons name="time" size={20} color="#667EEA" />
              <Text style={styles.mainStatValue}>{route.duration}</Text>
              <Text style={styles.mainStatLabel}>Süre</Text>
            </View>
            <View style={styles.mainStatBox}>
              <Ionicons name="flame" size={20} color="#F5576C" />
              <Text style={styles.mainStatValue}>{route.calories}</Text>
              <Text style={styles.mainStatLabel}>Kalori</Text>
            </View>
            <View style={styles.mainStatBox}>
              <Ionicons name="footsteps" size={20} color="#4ECDC4" />
              <Text style={styles.mainStatValue}>{route.steps}</Text>
              <Text style={styles.mainStatLabel}>Adım</Text>
            </View>
          </View>

          {/* Detay Bilgileri */}
          <View style={styles.detailsSection}>
            <View style={styles.detailRow}>
              <View style={styles.detailItem}>
                <Ionicons name="speedometer-outline" size={16} color={Colors.textSecondary} />
                <Text style={styles.detailLabel}>Ort. Hız</Text>
                <Text style={styles.detailValue}>{route.avgSpeed}</Text>
              </View>
              <View style={styles.detailItem}>
                <Ionicons name="trending-up" size={16} color={Colors.textSecondary} />
                <Text style={styles.detailLabel}>Maks. Eğim</Text>
                <Text style={styles.detailValue}>{route.maxSlope}</Text>
              </View>
              <View style={styles.detailItem}>
                <Ionicons name="arrow-up" size={16} color={Colors.textSecondary} />
                <Text style={styles.detailLabel}>Yükseliş</Text>
                <Text style={styles.detailValue}>{route.elevationGain}</Text>
              </View>
            </View>
          </View>

          {/* Hava Durumu ve Ruh Hali */}
          <View style={styles.conditionsRow}>
            <View style={styles.conditionBadge}>
              <Ionicons name="partly-sunny" size={14} color="#FFA726" />
              <Text style={styles.conditionText}>{route.weather}, {route.temperature}</Text>
            </View>
            <View style={[styles.conditionBadge, { backgroundColor: `${moodConfig.color}15` }]}>
              <Ionicons name={moodConfig.icon} size={14} color={moodConfig.color} />
              <Text style={[styles.conditionText, { color: moodConfig.color }]}>{moodConfig.label}</Text>
            </View>
            <View style={[styles.conditionBadge, { backgroundColor: diffConfig.bg }]}>
              <View style={[styles.difficultyDot, { backgroundColor: diffConfig.color }]} />
              <Text style={[styles.conditionText, { color: diffConfig.color }]}>{diffConfig.label}</Text>
            </View>
          </View>

          {/* Not */}
          {route.notes && (
            <View style={styles.notesSection}>
              <Ionicons name="chatbubble-outline" size={14} color={Colors.textSecondary} />
              <Text style={styles.notesText} numberOfLines={2}>{route.notes}</Text>
            </View>
          )}

          {/* Butonlar */}
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.secondaryButton} activeOpacity={0.8}>
              <Ionicons name="share-outline" size={18} color={Colors.primary} />
              <Text style={styles.secondaryButtonText}>Paylaş</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryButton} activeOpacity={0.8}>
              <Ionicons name="repeat" size={18} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>Tekrar Yürü</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderRecentRoute = ({ item }) => (
    <TouchableOpacity style={styles.recentCard} activeOpacity={0.8}>
      <View style={styles.recentIconContainer}>
        <Ionicons name="time" size={20} color={Colors.primary} />
      </View>
      <View style={styles.recentInfo}>
        <Text style={styles.recentName}>{item.name}</Text>
        <Text style={styles.recentDate}>{item.date}</Text>
      </View>
      <View style={styles.recentStats}>
        <Text style={styles.recentDistance}>{item.distance}</Text>
        <Text style={styles.recentDuration}>{item.duration}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={Colors.textLight} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Rotalarım</Text>
          <Text style={styles.headerSubtitle}>Keşfet ve yürüyüşe başla</Text>
        </View>
        <TouchableOpacity style={styles.searchButton}>
          <Ionicons name="search" size={22} color={Colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Hızlı İstatistikler */}
        <View style={styles.quickStats}>
          <View style={styles.quickStatCard}>
            <LinearGradient
              colors={[Colors.primary, '#3BA99C']}
              style={styles.quickStatGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="footsteps" size={24} color="#FFFFFF" />
              <Text style={styles.quickStatValue}>23.5 km</Text>
              <Text style={styles.quickStatLabel}>Bu Hafta</Text>
            </LinearGradient>
          </View>
          <View style={styles.quickStatCard}>
            <LinearGradient
              colors={['#3BA99C', '#2D8A7E']}
              style={styles.quickStatGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="trophy" size={24} color="#FFFFFF" />
              <Text style={styles.quickStatValue}>12</Text>
              <Text style={styles.quickStatLabel}>Tamamlanan</Text>
            </LinearGradient>
          </View>
          <View style={styles.quickStatCard}>
            <LinearGradient
              colors={['#2D8A7E', '#226B61']}
              style={styles.quickStatGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="heart" size={24} color="#FFFFFF" />
              <Text style={styles.quickStatValue}>{favorites.length}</Text>
              <Text style={styles.quickStatLabel}>Favori</Text>
            </LinearGradient>
          </View>
        </View>

        {/* Son Rotalar */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Son Rotalar</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>Tümünü Gör</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={RECENT_ROUTES}
            renderItem={renderRecentRoute}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.recentList}
          />
        </View>

        {/* Kategoriler */}
        <View style={styles.categoriesContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {CATEGORIES.map(renderCategoryItem)}
          </ScrollView>
        </View>

        {/* Tamamlanan Rotalar */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Tamamlanan Rotalar</Text>
            <TouchableOpacity style={styles.filterButton}>
              <Ionicons name="options-outline" size={18} color={Colors.primary} />
            </TouchableOpacity>
          </View>
          
          {filteredRoutes.map((route) => (
            <View key={route.id}>
              {renderRouteCard({ item: route })}
            </View>
          ))}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  searchButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingTop: 16,
  },
  
  // Quick Stats
  quickStats: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 24,
  },
  quickStatCard: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  quickStatGradient: {
    padding: 16,
    alignItems: 'center',
  },
  quickStatValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 8,
  },
  quickStatLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },

  // Sections
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
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
  filterButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(78, 205, 196, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Recent Routes
  recentList: {
    paddingHorizontal: 20,
    gap: 12,
  },
  recentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    width: 280,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  recentIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(78, 205, 196, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentInfo: {
    flex: 1,
    marginLeft: 12,
  },
  recentName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  recentDate: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  recentStats: {
    alignItems: 'flex-end',
    marginRight: 8,
  },
  recentDistance: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  recentDuration: {
    fontSize: 12,
    color: Colors.textSecondary,
  },

  // Categories
  categoriesContainer: {
    paddingLeft: 20,
    marginBottom: 20,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  categoryChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  categoryLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textSecondary,
    marginLeft: 6,
  },
  categoryLabelActive: {
    color: '#FFFFFF',
  },

  // Route Cards
  routeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginHorizontal: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
    overflow: 'hidden',
  },
  cardImageContainer: {
    height: 180,
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  imageGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  favoriteButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  difficultyBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  difficultyDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  difficultyText: {
    fontSize: 12,
    fontWeight: '600',
  },
  dateBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  dateText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  imageOverlayInfo: {
    position: 'absolute',
    bottom: 12,
    left: 16,
    right: 16,
  },
  routeName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  locationText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
  },
  cardContent: {
    padding: 16,
  },
  
  // Ana istatistikler grid
  mainStatsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  mainStatBox: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    marginHorizontal: 4,
  },
  mainStatValue: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 6,
  },
  mainStatLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  
  // Detay bilgileri
  detailsSection: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  detailItem: {
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 2,
  },
  
  // Durum badge'leri
  conditionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  conditionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  conditionText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#F57C00',
  },
  
  // Notlar
  notesSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  notesText: {
    flex: 1,
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  
  // Butonlar
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(78, 205, 196, 0.1)',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
