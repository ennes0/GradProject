import React, { useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Modal,
  Dimensions,
  ScrollView,
  Animated,
  PanResponder,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import { Colors } from '../../constants/Colors';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - 64;

export default function RouteDetailsModal({ visible, onClose, route, onStartNavigation }) {
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const dragY = useRef(new Animated.Value(0)).current;
  const isClosingRef = useRef(false);

  // Pan Responder for drag to dismiss
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only respond to vertical drags
        return Math.abs(gestureState.dy) > 5 && gestureState.dy > 0;
      },
      onPanResponderGrant: () => {
        dragY.setValue(0);
      },
      onPanResponderMove: (_, gestureState) => {
        // Only allow dragging down
        if (gestureState.dy > 0) {
          dragY.setValue(gestureState.dy);
          // Fade overlay as user drags
          const opacity = Math.max(0, 1 - gestureState.dy / 400);
          fadeAnim.setValue(opacity);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 120 || gestureState.vy > 0.5) {
          // Mark as closing to prevent useEffect animation
          isClosingRef.current = true;
          // Dismiss modal
          Animated.parallel([
            Animated.timing(dragY, {
              toValue: SCREEN_HEIGHT,
              duration: 250,
              useNativeDriver: true,
            }),
            Animated.timing(fadeAnim, {
              toValue: 0,
              duration: 200,
              useNativeDriver: true,
            }),
          ]).start(() => {
            onClose();
          });
        } else {
          // Snap back
          Animated.parallel([
            Animated.spring(dragY, {
              toValue: 0,
              tension: 100,
              friction: 10,
              useNativeDriver: true,
            }),
            Animated.timing(fadeAnim, {
              toValue: 1,
              duration: 150,
              useNativeDriver: true,
            }),
          ]).start();
        }
      },
    })
  ).current;

  useEffect(() => {
    if (visible) {
      // Reset closing flag and values before animating in
      isClosingRef.current = false;
      slideAnim.setValue(SCREEN_HEIGHT);
      fadeAnim.setValue(0);
      dragY.setValue(0);
      
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 65,
          friction: 11,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Only animate close if not already closing via drag
      if (!isClosingRef.current) {
        Animated.parallel([
          Animated.timing(slideAnim, {
            toValue: SCREEN_HEIGHT,
            duration: 280,
            useNativeDriver: true,
          }),
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start();
      }
    }
  }, [visible]);

  if (!route) return null;

  // Elevation data
  const elevationData = {
    labels: ['0', '1', '2', '3', '4', '5km'],
    datasets: [{
      data: [10, 22, 35, 42, 32, 15],
      color: (opacity = 1) => `rgba(78, 205, 196, ${opacity})`,
      strokeWidth: 2,
    }],
  };

  // Kalori yakma verisi (zaman bazlı)
  const caloriesData = {
    labels: ['0', '10', '20', '30', '40', '45dk'],
    datasets: [{
      data: [0, 45, 95, 140, 170, parseInt(route.calories) || 185],
      color: (opacity = 1) => `rgba(78, 205, 196, ${opacity})`,
      strokeWidth: 2,
    }],
  };

  // Hız verisi
  const speedData = {
    labels: ['0', '10', '20', '30', '40dk'],
    datasets: [{
      data: [0, 4.2, 4.8, 4.1, 3.9],
      color: (opacity = 1) => `rgba(78, 205, 196, ${opacity})`,
      strokeWidth: 2,
    }],
  };

  const getDifficultyConfig = () => {
    switch (route.difficulty) {
      case 'hard': return { label: 'Zor', color: '#E57373', icon: 'trending-up' };
      case 'medium': return { label: 'Orta', color: '#FFB74D', icon: 'swap-horizontal' };
      case 'easy': return { label: 'Kolay', color: '#81C784', icon: 'leaf' };
      default: return { label: 'Orta', color: Colors.primary, icon: 'walk' };
    }
  };

  const diffConfig = getDifficultyConfig();

  const chartConfig = {
    backgroundColor: '#FFFFFF',
    backgroundGradientFrom: '#FFFFFF',
    backgroundGradientTo: '#FFFFFF',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(15, 23, 42, ${opacity})`, // #0F172A
    labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`, // #64748B
    style: { borderRadius: 16 },
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: Colors.primary,
    },
    propsForBackgroundLines: {
      strokeDasharray: '',
      stroke: '#F1F5F9',
      strokeWidth: 1,
    },
    fillShadowGradient: Colors.primary,
    fillShadowGradientOpacity: 0.1,
  };

  const StatCard = ({ icon, label, value }) => (
    <View style={styles.statCard}>
      <View style={styles.statIconWrap}>
        <Ionicons name={icon} size={22} color={Colors.primary} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  const ChartCard = ({ title, subtitle, children }) => (
    <View style={styles.chartCard}>
      <View style={styles.chartHeader}>
        <View style={styles.chartHeaderLeft}>
          <Text style={styles.chartTitle}>{title}</Text>
          {subtitle && <Text style={styles.chartSubtitle}>{subtitle}</Text>}
        </View>
        <View style={styles.chartIcon}>
          <Ionicons name="analytics" size={16} color={Colors.primary} />
        </View>
      </View>
      <View style={styles.chartContainer}>
        {children}
      </View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent={true}
      onRequestClose={onClose}
    >
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <TouchableOpacity style={styles.overlayTouch} onPress={onClose} activeOpacity={1} />
      </Animated.View>
      
      <Animated.View 
        style={[
          styles.modalContent,
          { 
            transform: [{ 
              translateY: Animated.add(slideAnim, dragY) 
            }] 
          }
        ]}
      >
        {/* Handle Bar - Draggable */}
        <View {...panResponder.panHandlers} style={styles.handleContainer}>
          <View style={styles.handle} />
        </View>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle} numberOfLines={1}>{route.name || 'Rota Detayı'}</Text>
            <View style={styles.locationRow}>
              <Ionicons name="location" size={14} color={Colors.primary} />
              <Text style={styles.locationText} numberOfLines={1}>
                {route.startLocation ? `${route.startLocation} → ${route.endLocation}` : 'Harita üzerinde gösterilen rota'}
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#64748B" />
          </TouchableOpacity>
        </View>

        <ScrollView 
          style={styles.content} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Difficulty & Info Row */}
          <View style={styles.infoRow}>
            <View style={[styles.infoBadge, { backgroundColor: diffConfig.color + '15' }]}>
              <Ionicons name={diffConfig.icon} size={16} color={diffConfig.color} />
              <Text style={[styles.infoBadgeText, { color: diffConfig.color }]}>{diffConfig.label}</Text>
            </View>
            <View style={styles.infoBadge}>
              <Ionicons name="trending-up" size={16} color="#64748B" />
              <Text style={styles.infoBadgeText}>Maks. Eğim {route.maxSlope || '%8'}</Text>
            </View>
            <View style={styles.infoBadge}>
              <Ionicons name="arrow-up" size={16} color="#64748B" />
              <Text style={styles.infoBadgeText}>{route.elevationGain || '48m'} Çıkış</Text>
            </View>
          </View>

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            <StatCard icon="navigate" label="Mesafe" value={route.distance || '0 km'} />
            <StatCard icon="time" label="Tahmini Süre" value={route.duration || '0 dk'} />
            <StatCard icon="flame" label="Yakılacak" value={`${route.calories || '0'} kcal`} />
            <StatCard icon="footsteps" label="Tahmini Adım" value={route.steps?.toLocaleString() || '0'} />
          </View>

          {/* Elevation Chart */}
          <ChartCard 
            title="Yükselti Profili" 
            subtitle={`Toplam Tırmanış: ${route.elevationGain || '48m'}`}
          >
            <LineChart
              data={elevationData}
              width={CHART_WIDTH}
              height={140}
              chartConfig={chartConfig}
              bezier
              style={styles.chart}
              withInnerLines={true}
              withOuterLines={false}
              withVerticalLines={false}
              withHorizontalLines={true}
              withDots={true}
              withShadow={true}
              segments={4}
              formatYLabel={(y) => `${y}m`}
            />
          </ChartCard>

          {/* Calories Chart */}
          <ChartCard 
            title="Kalori Yakımı" 
            subtitle={`Toplam: ${route.calories} kcal`}
          >
            <LineChart
              data={caloriesData}
              width={CHART_WIDTH}
              height={130}
              chartConfig={chartConfig}
              bezier
              style={styles.chart}
              withInnerLines={true}
              withOuterLines={false}
              withVerticalLines={false}
              withDots={true}
              withShadow={true}
              segments={4}
            />
          </ChartCard>

          {/* Speed Chart */}
          <ChartCard 
            title="Hız Analizi" 
            subtitle={`Ortalama: ${route.avgSpeed}`}
          >
            <LineChart
              data={speedData}
              width={CHART_WIDTH}
              height={130}
              chartConfig={chartConfig}
              bezier
              style={styles.chart}
              withInnerLines={true}
              withOuterLines={false}
              withVerticalLines={false}
              withDots={true}
              withShadow={true}
              segments={4}
            />
          </ChartCard>

          {/* Details Card */}
          <View style={styles.detailsCard}>
            <Text style={styles.detailsTitle}>Detaylar</Text>
            
            <View style={styles.detailRow}>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Tarih</Text>
                <Text style={styles.detailValue}>{route.date}</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Saat</Text>
                <Text style={styles.detailValue}>{route.time}</Text>
              </View>
            </View>
            
            <View style={styles.detailRow}>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Ort. Eğim</Text>
                <Text style={styles.detailValue}>{route.avgSlope}</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Hava</Text>
                <Text style={styles.detailValue}>{route.weather}, {route.temperature}</Text>
              </View>
            </View>
          </View>

          {/* Notes */}
          {route.notes && (
            <View style={styles.notesCard}>
              <Text style={styles.notesTitle}>Notlar</Text>
              <Text style={styles.notesText}>{route.notes}</Text>
            </View>
          )}

          <View style={{ height: 120 }} />
        </ScrollView>

        {/* Footer Actions */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.iconButton} activeOpacity={0.7}>
            <Ionicons name="share-outline" size={22} color="#666" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} activeOpacity={0.7}>
            <Ionicons name="heart-outline" size={22} color="#666" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.primaryButton} 
            activeOpacity={0.8}
            onPress={() => {
              if (onStartNavigation) {
                onStartNavigation(route);
              }
              onClose();
            }}
          >
            <Ionicons name="repeat" size={18} color="#FFF" />
            <Text style={styles.primaryButtonText}>Tekrar Yürü</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  overlayTouch: {
    flex: 1,
  },
  modalContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#F8F9FA',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: SCREEN_HEIGHT * 0.92,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 25,
  },
  handleContainer: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: '#FFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  handle: {
    width: 44,
    height: 5,
    backgroundColor: '#DDDDDD',
    borderRadius: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    backgroundColor: '#FFF',
  },
  headerLeft: {
    flex: 1,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: 13,
    color: '#888',
    flex: 1,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },

  // Info Row
  infoRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  infoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  infoBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },

  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    width: (SCREEN_WIDTH - 52) / 2,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  statIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },

  // Chart Cards
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 3,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  chartHeaderLeft: {
    flex: 1,
  },
  chartIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  chartSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 2,
  },
  chartContainer: {
    alignItems: 'center',
    marginLeft: -10, // Chart.js negative margin fix
  },
  chart: {
    borderRadius: 16,
  },

  // Details Card
  detailsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  detailsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#334155',
  },

  // Notes Card
  notesCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FEF3C7',
    marginBottom: 16,
  },
  notesTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#D97706',
    marginBottom: 8,
  },
  notesText: {
    fontSize: 14,
    color: '#92400E',
    lineHeight: 22,
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 28,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 12,
  },
  iconButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    height: 52,
    backgroundColor: Colors.primaryDark,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primaryDark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginRight: 8,
  },
  primaryButtonIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
