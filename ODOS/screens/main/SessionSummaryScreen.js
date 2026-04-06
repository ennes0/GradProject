import React, { useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { Colors } from '../../constants/Colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const formatDuration = (seconds) => {
  const s = Math.max(0, Math.round(Number(seconds) || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) {
    return `${h}sa ${m.toString().padStart(2, '0')}dk`;
  }
  return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
};

const formatDistance = (meters) => {
  const m = Math.max(0, Number(meters) || 0);
  if (m >= 1000) return `${(m / 1000).toFixed(2)} km`;
  return `${Math.round(m)} m`;
};

const formatSpeed = (kmh) => `${(Math.max(0, Number(kmh) || 0)).toFixed(1)} km/h`;

const formatPace = (secPerKm) => {
  const totalSec = Math.max(0, Math.round(Number(secPerKm) || 0));
  if (!totalSec) return '--';
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, '0')} /km`;
};

const formatDateTime = (isoDate) => {
  if (!isoDate) return '--';
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return '--';
  return d.toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getRouteBadge = (type) => {
  switch (type) {
    case 'shortest':
      return { label: 'En Kisa', color: Colors.primaryDark || '#2E4BA8' };
    case 'easiest':
      return { label: 'En Kolay', color: Colors.nature || '#2E7D32' };
    default:
      return { label: 'Dengeli', color: Colors.primary || '#4ECDC4' };
  }
};

const getChartPaths = (series, width, height) => {
  if (!Array.isArray(series) || series.length < 2) {
    return {
      linePath: `M 0 ${height * 0.7} L ${width} ${height * 0.35}`,
      areaPath: `M 0 ${height * 0.7} L ${width} ${height * 0.35} L ${width} ${height} L 0 ${height} Z`,
    };
  }

  const min = Math.min(...series);
  const max = Math.max(...series);
  const range = Math.max(1, max - min);
  const stepX = width / (series.length - 1);

  const linePath = series
    .map((value, index) => {
      const x = stepX * index;
      const y = height - ((value - min) / range) * height;
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');

  const areaPath = `${linePath} L ${width} ${height} L 0 ${height} Z`;

  return { linePath, areaPath };
};

export default function SessionSummaryScreen({ visible, summary, onClose, onStartNewSession }) {
  const completion = clamp(summary?.completionRatio || 0, 0, 1);
  const completionPct = Math.round(completion * 100);
  const plannedDistanceM = Math.max(summary?.plannedDistanceM || 0, summary?.traveledDistanceM || 0);
  const traveledDistanceM = Math.max(0, summary?.traveledDistanceM || 0);
  const remainingDistanceM = Math.max(0, summary?.remainingDistanceM || 0);
  const elapsedSeconds = Math.max(0, summary?.elapsedSeconds || 0);
  const rerouteCount = Math.max(0, summary?.rerouteCount || 0);
  const maxOffRouteDistanceM = Math.max(0, summary?.maxOffRouteDistanceM || 0);
  const calories = Math.max(0, Math.round(summary?.calories || 0));
  const climbM = Math.max(0, Math.round(summary?.climbM || 0));
  const avgSpeedKmh = Math.max(0, summary?.avgSpeedKmh || 0);
  const paceSecPerKm = Math.max(0, summary?.paceSecPerKm || 0);
  const elevationSeries = Array.isArray(summary?.elevationSeries) && summary.elevationSeries.length >= 2
    ? summary.elevationSeries
    : [12, 18, 11, 22, 19, 24, 17, 14, 16, 13];

  const routeBadge = getRouteBadge(summary?.routeType);
  const ringSize = 152;
  const ringRadius = 61;
  const circumference = 2 * Math.PI * ringRadius;
  const ringOffset = circumference * (1 - completion);
  const chartWidth = SCREEN_WIDTH - 64;
  const chartHeight = 126;
  const { linePath, areaPath } = useMemo(
    () => getChartPaths(elevationSeries, chartWidth, chartHeight),
    [elevationSeries, chartWidth, chartHeight],
  );

  const efficiencyScore = clamp(Math.round((completion * 72) + (avgSpeedKmh * 4) - (rerouteCount * 3)), 0, 100);
  const stabilityScore = clamp(Math.round(100 - Math.min(60, maxOffRouteDistanceM / 2) - (rerouteCount * 4)), 0, 100);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          easing: Easing.out(Easing.poly(4)),
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 600,
          easing: Easing.out(Easing.poly(4)),
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 6,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      slideAnim.setValue(30);
      scaleAnim.setValue(0.9);
    }
  }, [visible, fadeAnim, slideAnim, scaleAnim]);

  if (!visible) return null;

  return (
    <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.glowOne} />
        <View style={styles.glowTwo} />

        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.pageTitle}>Seans Özeti</Text>
            <Text style={styles.pageSubtitle}>Bitirdiğin yürüyüşün detaylı analizi</Text>
          </View>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color="#12203A" />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Animated.View 
            style={[
              styles.heroCard, 
              { transform: [{ translateY: slideAnim }, { scale: scaleAnim }] }
            ]}
          >
            <View style={styles.heroTopRow}>
              <View style={[styles.routeTypeBadge, { backgroundColor: `${routeBadge.color}1A` }]}>
                <View style={[styles.routeTypeDot, { backgroundColor: routeBadge.color }]} />
                <Text style={[styles.routeTypeText, { color: routeBadge.color }]}>{routeBadge.label}</Text>
              </View>
              <Text style={styles.routeNameText}>{summary?.routeTitle || 'Yuruyus Rotasi'}</Text>
            </View>

            <View style={styles.ringRow}>
              <View style={styles.ringWrap}>
                <Svg width={ringSize} height={ringSize}>
                  <Defs>
                    <LinearGradient id="ringGradient" x1="0" y1="0" x2="1" y2="1">
                      <Stop offset="0%" stopColor={Colors.primary} />
                      <Stop offset="100%" stopColor={Colors.primaryDark} />
                    </LinearGradient>
                  </Defs>
                  <Circle
                    cx={ringSize / 2}
                    cy={ringSize / 2}
                    r={ringRadius}
                    stroke="#F1F5F9"
                    strokeWidth={12}
                    fill="none"
                  />
                  <Circle
                    cx={ringSize / 2}
                    cy={ringSize / 2}
                    r={ringRadius}
                    stroke="url(#ringGradient)"
                    strokeWidth={12}
                    strokeLinecap="round"
                    strokeDasharray={`${circumference} ${circumference}`}
                    strokeDashoffset={ringOffset}
                    fill="none"
                    transform={`rotate(-90 ${ringSize / 2} ${ringSize / 2})`}
                  />
                </Svg>
                <View style={styles.ringCenter}>
                  <Text style={styles.ringPercent}>{completionPct}%</Text>
                  <Text style={styles.ringCaption}>Tamamlandi</Text>
                </View>
              </View>

              <View style={styles.heroStatsColumn}>
                <View style={styles.heroStatCard}>
                  <Text style={styles.heroStatLabel}>Katedilen</Text>
                  <Text style={styles.heroStatValue}>{formatDistance(traveledDistanceM)}</Text>
                </View>
                <View style={styles.heroStatCard}>
                  <Text style={styles.heroStatLabel}>Kalan</Text>
                  <Text style={styles.heroStatValue}>{formatDistance(remainingDistanceM)}</Text>
                </View>
                <View style={styles.heroStatCard}>
                  <Text style={styles.heroStatLabel}>Sure</Text>
                  <Text style={styles.heroStatValue}>{formatDuration(elapsedSeconds)}</Text>
                </View>
              </View>
            </View>

            <View style={styles.timeRow}>
              <View style={styles.timeChip}>
                <Ionicons name="play" size={14} color="#1B2B46" />
                <Text style={styles.timeChipText}>Baslangic: {formatDateTime(summary?.startedAt)}</Text>
              </View>
              <View style={styles.timeChip}>
                <Ionicons name="flag" size={14} color="#1B2B46" />
                <Text style={styles.timeChipText}>Bitis: {formatDateTime(summary?.finishedAt)}</Text>
              </View>
            </View>
          </Animated.View>

          <Animated.View 
            style={[
              styles.sectionCard,
              { transform: [{ translateY: slideAnim }, { scale: scaleAnim }] }
            ]}
          >
            <Text style={styles.sectionTitle}>Detaylı Metrikler</Text>
            <View style={styles.metricGrid}>
              <View style={styles.metricItem}>
                <View style={styles.metricIconWrap}>
                  <Ionicons name="analytics" size={16} color={Colors.primaryDark} />
                </View>
                <Text style={styles.metricLabel}>Toplam Mesafe</Text>
                <Text style={styles.metricValue}>{formatDistance(plannedDistanceM)}</Text>
              </View>
              <View style={styles.metricItem}>
                <View style={styles.metricIconWrap}>
                  <Ionicons name="speedometer" size={16} color="#FF6B6B" />
                </View>
                <Text style={styles.metricLabel}>Ortalama Hız</Text>
                <Text style={styles.metricValue}>{formatSpeed(avgSpeedKmh)}</Text>
              </View>
              <View style={styles.metricItem}>
                <View style={styles.metricIconWrap}>
                  <Ionicons name="footsteps" size={16} color="#10B981" />
                </View>
                <Text style={styles.metricLabel}>Tempo</Text>
                <Text style={styles.metricValue}>{formatPace(paceSecPerKm)}</Text>
              </View>
              <View style={styles.metricItem}>
                <View style={styles.metricIconWrap}>
                  <Ionicons name="flame" size={16} color="#F59E0B" />
                </View>
                <Text style={styles.metricLabel}>Kalori</Text>
                <Text style={styles.metricValue}>{calories} kcal</Text>
              </View>
              <View style={styles.metricItem}>
                <View style={styles.metricIconWrap}>
                  <Ionicons name="trending-up" size={16} color="#6366F1" />
                </View>
                <Text style={styles.metricLabel}>Tırmanış</Text>
                <Text style={styles.metricValue}>{climbM} m</Text>
              </View>
              <View style={styles.metricItem}>
                <View style={styles.metricIconWrap}>
                  <Ionicons name="sync" size={16} color="#8B5CF6" />
                </View>
                <Text style={styles.metricLabel}>Yeniden Rota</Text>
                <Text style={styles.metricValue}>{rerouteCount}</Text>
              </View>
            </View>
          </Animated.View>

          <Animated.View 
            style={[
              styles.sectionCard,
              { transform: [{ translateY: slideAnim }, { scale: scaleAnim }] }
            ]}
          >
            <Text style={styles.sectionTitle}>Yükseklik Akışı</Text>
            <View style={styles.chartWrap}>
              <Svg width={chartWidth} height={chartHeight}>
                <Defs>
                  <LinearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0%" stopColor={Colors.primary} stopOpacity="0.4" />
                    <Stop offset="100%" stopColor={Colors.primary} stopOpacity="0.05" />
                  </LinearGradient>
                </Defs>
                <Path d={areaPath} fill="url(#areaGradient)" />
                <Path d={linePath} stroke={Colors.primaryDark} strokeWidth={4} strokeLinecap="round" fill="none" />
              </Svg>
              <View style={styles.chartLegendRow}>
                <Text style={styles.chartLegendText}>0 km</Text>
                <Text style={styles.chartLegendText}>Orta Nokta</Text>
                <Text style={styles.chartLegendText}>{formatDistance(plannedDistanceM)}</Text>
              </View>
            </View>
          </Animated.View>

          <Animated.View 
            style={[
              styles.sectionCard,
              { transform: [{ translateY: slideAnim }, { scale: scaleAnim }] }
            ]}
          >
            <Text style={styles.sectionTitle}>Seans Analizi</Text>
            <View style={styles.insightRow}>
              <View style={[styles.insightIconWrap, { backgroundColor: '#E0F2FE' }]}>
                <Ionicons name="analytics" size={20} color="#0284C7" />
              </View>
              <Text style={styles.insightText}>Verim Skoru: <Text style={styles.insightTextBold}>%{efficiencyScore}</Text></Text>
            </View>
            <View style={styles.insightRow}>
              <View style={[styles.insightIconWrap, { backgroundColor: '#DCFCE7' }]}>
                <Ionicons name="pulse" size={20} color="#059669" />
              </View>
              <Text style={styles.insightText}>Rota İstikrarı: <Text style={styles.insightTextBold}>%{stabilityScore}</Text></Text>
            </View>
            <View style={styles.insightRow}>
              <View style={[styles.insightIconWrap, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="navigate" size={20} color="#D97706" />
              </View>
              <Text style={styles.insightText}>Maksimum Sapma: <Text style={styles.insightTextBold}>{Math.round(maxOffRouteDistanceM)} m</Text></Text>
            </View>
            <View style={styles.insightRowBordered}>
              <View style={[styles.insightIconWrap, { backgroundColor: '#F1F5F9' }]}>
                <Ionicons name="checkmark-done-circle" size={20} color="#475569" />
              </View>
              <Text style={styles.insightText}>{summary?.instruction?.text || 'Seans başarıyla tamamlandı.'}</Text>
            </View>
          </Animated.View>

          <Animated.View 
            style={[
              styles.actionsRow,
              { transform: [{ translateY: slideAnim }], opacity: fadeAnim }
            ]}
          >
            <TouchableOpacity style={styles.secondaryAction} onPress={onClose} activeOpacity={0.8}>
              <Ionicons name="map" size={18} color="#475569" />
              <Text style={styles.secondaryActionText}>Haritaya Dön</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryAction} onPress={onStartNewSession} activeOpacity={0.8}>
              <Ionicons name="walk" size={20} color="#FFF" />
              <Text style={styles.primaryActionText}>Yeni Seans</Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#F8FAFC', // Çok açık modern slate arka plan
    zIndex: 999,
  },
  safeArea: {
    flex: 1,
  },
  glowOne: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: Colors.primary + '18', // ODOS marka rengi parlaması
    top: -80,
    left: -100,
  },
  glowTwo: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: Colors.primaryDark + '12',
    top: 60,
    right: -80,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 16,
  },
  headerLeft: {
    flex: 1,
    paddingRight: 16,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  pageSubtitle: {
    marginTop: 4,
    fontSize: 14,
    color: '#64748B',
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 16,
  },
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    padding: 20,
    shadowColor: Colors.primaryDark,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 8,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 12,
  },
  routeTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 6,
  },
  routeTypeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  routeTypeText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  routeNameText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'right',
  },
  ringRow: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
  },
  ringWrap: {
    width: 164,
    height: 164,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringCenter: {
    position: 'absolute',
    alignItems: 'center',
  },
  ringPercent: {
    fontSize: 32,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  ringCaption: {
    marginTop: 2,
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  heroStatsColumn: {
    flex: 1,
    gap: 10,
  },
  heroStatCard: {
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  heroStatLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  heroStatValue: {
    marginTop: 4,
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  timeRow: {
    marginTop: 16,
    gap: 8,
  },
  timeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  timeChipText: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '600',
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    padding: 24,
    shadowColor: Colors.primaryDark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
  },
  metricItem: {
    width: '48%',
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  metricIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  metricLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  metricValue: {
    marginTop: 4,
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  chartWrap: {
    borderRadius: 24,
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  chartLegendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  chartLegendText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  insightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  insightRowBordered: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  insightIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightText: {
    flex: 1,
    fontSize: 14,
    color: '#334155',
    lineHeight: 20,
  },
  insightTextBold: {
    fontWeight: '800',
    color: '#0F172A',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  secondaryAction: {
    flex: 1,
    height: 56,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryActionText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#475569',
  },
  primaryAction: {
    flex: 1,
    height: 56,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  primaryActionText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
