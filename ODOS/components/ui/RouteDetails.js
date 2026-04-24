import React, { useEffect, useMemo, useRef } from 'react';
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
  ActivityIndicator,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { LineChart } from 'react-native-chart-kit';
import { Colors } from '../../constants/Colors';
import { useLanguage } from '../context/LanguageContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - 64;

function safeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function formatKcal(value) {
  const n = Math.max(0, Math.round(safeNumber(value, 0)));
  return `${n} kcal`;
}

function formatSteps(value) {
  const n = Math.max(0, Math.round(safeNumber(value, 0)));
  return n.toLocaleString('tr-TR');
}

function completionChip(route, tx) {
  const status = route?.completionStatus;
  if (status === 'partial') {
    return { label: tx('Kısmi seans', 'Partial session'), color: '#D97706', bg: '#FEF3C7', icon: 'hourglass-outline' };
  }
  if (status === 'abandoned') {
    return { label: tx('Erken kaydedildi', 'Saved early'), color: '#64748B', bg: '#F1F5F9', icon: 'bookmark-outline' };
  }
  return { label: tx('Tamamlandı', 'Completed'), color: '#0F766E', bg: '#CCFBF1', icon: 'checkmark-circle-outline' };
}

function parseAverageSpeed(route) {
  if (route?.avgSpeedKmh != null && Number.isFinite(route.avgSpeedKmh)) {
    return Math.max(0, Number(route.avgSpeedKmh));
  }
  const match = String(route?.avgSpeed || '').match(/(\d+[.,]?\d*)/);
  return match ? Math.max(0, Number(match[1].replace(',', '.'))) : 4;
}

function buildElevationChartData(route) {
  const series = route?.elevationSeries;
  if (Array.isArray(series) && series.length >= 2) {
    const data = series.map((value) => Math.round(Number(value)));
    const count = data.length;
    const labels = data.map((_, index) => {
      if (index === 0) return '0';
      if (index === count - 1) return '100%';
      return index % 2 === 0 ? `${Math.round((100 * index) / (count - 1))}%` : '';
    });
    return {
      labels,
      datasets: [
        {
          data,
          color: (opacity = 1) => `rgba(78, 205, 196, ${opacity})`,
          strokeWidth: 2,
        },
      ],
    };
  }

  return null;
}

function buildShareMessage(route, tx) {
  const parts = [
    `${tx('Rota', 'Route')}: ${route?.name || tx('Rotam', 'My route')}`,
    `${tx('Başlangıç', 'Start')}: ${route?.startLocation || '-'}`,
    `${tx('Hedef', 'Destination')}: ${route?.endLocation || '-'}`,
    `${tx('Mesafe', 'Distance')}: ${route?.distance || '-'}`,
    `${tx('Süre', 'Duration')}: ${route?.duration || '-'}`,
    `${tx('Kalori', 'Calories')}: ${route?.calories != null ? route.calories : '-'}`,
  ];

  if (route?.notes) {
    parts.push(`${tx('Not', 'Note')}: ${route.notes}`);
  }

  return parts.join('\n');
}

function RouteMetricCard({ icon, label, value, accent = Colors.primary, tone = 'light' }) {
  const isDark = tone === 'dark';
  return (
    <View style={[styles.metricCard, isDark && styles.metricCardDark]}>
      <View style={[styles.metricIconWrap, { backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : `${accent}15` }]}>
        <Ionicons name={icon} size={20} color={isDark ? '#FFFFFF' : accent} />
      </View>
      <Text style={[styles.metricValue, isDark && styles.metricValueDark]} numberOfLines={1}>
        {value}
      </Text>
      <Text style={[styles.metricLabel, isDark && styles.metricLabelDark]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function PremiumChartCard({
  title,
  subtitle,
  accent,
  chartConfig,
  chartData,
  chartKey,
  chartHeight = 170,
  detailLoading = false,
  hasRealData = false,
  introAnim,
  loadingLabel = 'Loading details…',
  emptyLabel = 'No data available',
}) {
  const scale = introAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.985, 1],
  });

  const chartOpacity = introAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const chartTranslateY = introAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [14, 0],
  });

  return (
    <Animated.View
      style={[
        styles.chartShell,
        {
          opacity: chartOpacity,
          transform: [{ translateY: chartTranslateY }, { scale }],
        },
      ]}
    >
      <LinearGradient
        colors={['#FFFFFF', '#F8FAFC', `${accent}08`]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.chartSurface}
      >
        <View style={styles.chartHeader}>
          <View style={styles.chartHeaderLeft}>
            <View style={styles.chartKickerRow}>
              <View style={[styles.chartKickerDot, { backgroundColor: accent }]} />
              <Text style={[styles.chartKicker, { color: accent }]}>{subtitle ? subtitle.toUpperCase?.() : ''}</Text>
            </View>
            <Text style={styles.chartTitle}>{title}</Text>
            {subtitle ? <Text style={styles.chartSubtitle}>{subtitle}</Text> : null}
          </View>
          <View style={[styles.chartIcon, { backgroundColor: `${accent}12` }]}>
            <Ionicons name="analytics" size={16} color={accent} />
          </View>
        </View>

        <View style={styles.chartMetaRow}>
          <View style={[styles.chartMetaPill, { backgroundColor: `${accent}10` }]}>
            <Ionicons name={hasRealData ? 'pulse-outline' : 'sparkles-outline'} size={13} color={accent} />
            <Text style={[styles.chartMetaText, { color: accent }]}>
              {hasRealData ? 'Live data' : 'Smart preview'}
            </Text>
          </View>
          <View style={styles.chartMetaPillSoft}>
            <Ionicons name="water-outline" size={13} color="#64748B" />
            <Text style={styles.chartMetaTextSoft}>{detailLoading ? 'Updating…' : 'Smooth reveal'}</Text>
          </View>
        </View>

        <View style={styles.chartAccentRail}>
          <Animated.View
            style={[
              styles.chartAccentPulse,
              {
                backgroundColor: accent,
                opacity: introAnim.interpolate({ inputRange: [0, 1], outputRange: [0.2, 0.65] }),
              },
            ]}
          />
        </View>

        <View style={styles.chartContainer}>
          {!chartData ? (
            <View style={styles.chartEmptyState}>
              <View style={[styles.chartEmptyIcon, { backgroundColor: `${accent}10` }]}>
                <Ionicons name="analytics-outline" size={20} color={accent} />
              </View>
              <Text style={styles.chartEmptyTitle}>{emptyLabel}</Text>
              <Text style={styles.chartEmptyText}>{loadingLabel}</Text>
            </View>
          ) : null}

          {detailLoading && !hasRealData ? (
            <View style={styles.chartLoadingOverlay}>
              <ActivityIndicator size="large" color={accent} />
              <Text style={styles.chartLoadingText}>{loadingLabel}</Text>
            </View>
          ) : null}

          {chartData ? (
            <LineChart
              key={chartKey}
              data={chartData}
              width={CHART_WIDTH}
              height={chartHeight}
              chartConfig={chartConfig}
              bezier
              style={styles.chart}
              withInnerLines={false}
              withOuterLines={false}
              withVerticalLines={false}
              withHorizontalLines
              withDots={hasRealData || true}
              withShadow
              segments={4}
              formatYLabel={(y) => `${y}`}
            />
          ) : null}
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

export default function RouteDetails({
  visible,
  onClose,
  route,
  onStartNavigation,
  onShareRoute,
  detailLoading = false,
}) {
  const { tx } = useLanguage();
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const dragY = useRef(new Animated.Value(0)).current;
  const isClosingRef = useRef(false);
  const chartIntroAnim1 = useRef(new Animated.Value(0)).current;
  const chartIntroAnim2 = useRef(new Animated.Value(0)).current;
  const chartIntroAnim3 = useRef(new Animated.Value(0)).current;

  const accent = route?.color || Colors.primary;
  const accentSoft = `${accent}15`;
  const chip = useMemo(() => completionChip(route, tx), [route?.completionStatus, tx]);
  const elevationData = useMemo(() => buildElevationChartData(route), [route?.elevationSeries, route?.id]);
  const hasRealElevation = useMemo(
    () => Array.isArray(route?.elevationSeries) && route.elevationSeries.length >= 2,
    [route?.elevationSeries],
  );
  const avgSpeed = useMemo(() => parseAverageSpeed(route), [route?.avgSpeedKmh, route?.avgSpeed]);
  const routeDistance = route?.distance || '0 km';
  const routeDuration = route?.duration || '0 dk';
  const routeCalories = route?.calories != null ? formatKcal(route.calories) : '0 kcal';
  const routeSteps = route?.steps != null ? formatSteps(route.steps) : '0';

  const chartConfig = {
    backgroundColor: '#FFFFFF',
    backgroundGradientFrom: '#FFFFFF',
    backgroundGradientTo: '#FFFFFF',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(15, 23, 42, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
    style: { borderRadius: 16 },
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: accent,
    },
    propsForBackgroundLines: {
      strokeDasharray: '',
      stroke: '#E2E8F0',
      strokeWidth: 1,
    },
    fillShadowGradient: accent,
    fillShadowGradientOpacity: 0.12,
  };

  const handleShare = async () => {
    if (onShareRoute) {
      await onShareRoute(route);
      return;
    }

    try {
      await Share.share({
        title: route?.name || tx('Rota Detayı', 'Route Detail'),
        message: buildShareMessage(route, tx),
      });
    } catch {
      // native share sheet failed or dismissed
    }
  };

  const handleWalkAgain = () => {
    if (onStartNavigation) {
      onStartNavigation(route);
    }
    onClose?.();
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 5 && gestureState.dy > 0,
      onPanResponderGrant: () => {
        dragY.setValue(0);
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          dragY.setValue(gestureState.dy);
          fadeAnim.setValue(Math.max(0, 1 - gestureState.dy / 360));
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 120 || gestureState.vy > 0.5) {
          isClosingRef.current = true;
          Animated.parallel([
            Animated.timing(dragY, {
              toValue: SCREEN_HEIGHT,
              duration: 220,
              useNativeDriver: true,
            }),
            Animated.timing(fadeAnim, {
              toValue: 0,
              duration: 180,
              useNativeDriver: true,
            }),
          ]).start(() => onClose?.());
        } else {
          Animated.parallel([
            Animated.spring(dragY, {
              toValue: 0,
              tension: 95,
              friction: 10,
              useNativeDriver: true,
            }),
            Animated.timing(fadeAnim, {
              toValue: 1,
              duration: 140,
              useNativeDriver: true,
            }),
          ]).start();
        }
      },
    }),
  ).current;

  useEffect(() => {
    if (visible) {
      isClosingRef.current = false;
      slideAnim.setValue(SCREEN_HEIGHT);
      fadeAnim.setValue(0);
      dragY.setValue(0);
      chartIntroAnim1.setValue(0);
      chartIntroAnim2.setValue(0);
      chartIntroAnim3.setValue(0);
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 65,
          friction: 11,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.stagger(90, [
          Animated.timing(chartIntroAnim1, {
            toValue: 1,
            duration: 260,
            useNativeDriver: true,
          }),
          Animated.timing(chartIntroAnim2, {
            toValue: 1,
            duration: 260,
            useNativeDriver: true,
          }),
          Animated.timing(chartIntroAnim3, {
            toValue: 1,
            duration: 260,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
      return;
    }

    if (!isClosingRef.current) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 240,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, dragY, fadeAnim, slideAnim, chartIntroAnim1, chartIntroAnim2, chartIntroAnim3]);

  if (!route) return null;

  return (
    <Modal visible={visible} animationType="none" transparent onRequestClose={onClose}>
      <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
        <TouchableOpacity style={styles.backdropTouch} onPress={onClose} activeOpacity={1} />
      </Animated.View>

      <Animated.View
        style={[
          styles.sheet,
          {
            transform: [{ translateY: Animated.add(slideAnim, dragY) }],
          },
        ]}
      >
        <View {...panResponder.panHandlers} style={styles.handleArea}>
          <View style={styles.handle} />
        </View>

        <View style={styles.heroWrap}>
          <LinearGradient
            colors={[accent, '#0F172A']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}
          >
            <View style={[styles.heroOrb, styles.heroOrbTop]} />
            <View style={[styles.heroOrb, styles.heroOrbBottom]} />

            <View style={styles.heroTopRow}>
              <View style={{ flex: 1 }}>
                <View style={styles.heroBadgeRow}>
                  <View style={[styles.heroBadge, { backgroundColor: 'rgba(255,255,255,0.16)' }]}>
                    <Ionicons name={chip.icon} size={12} color="#FFFFFF" />
                    <Text style={styles.heroBadgeText}>{chip.label}</Text>
                  </View>
                  <View style={styles.heroBadgeMuted}>
                    <Ionicons name="map-outline" size={12} color="#FFFFFF" />
                    <Text style={styles.heroBadgeTextMuted}>{route.type || tx('Rota', 'Route')}</Text>
                  </View>
                </View>

                <Text style={styles.heroTitle} numberOfLines={2}>
                  {route.name || tx('Rota Detayı', 'Route Detail')}
                </Text>
                <View style={styles.heroLocationRow}>
                  <Ionicons name="location" size={14} color="rgba(255,255,255,0.9)" />
                  <Text style={styles.heroLocationText} numberOfLines={2}>
                    {route.startLocation ? `${route.startLocation} → ${route.endLocation}` : tx('Harita üzerinde gösterilen rota', 'Route shown on map')}
                  </Text>
                </View>
              </View>

              <TouchableOpacity onPress={onClose} style={styles.closeButton} activeOpacity={0.8}>
                <Ionicons name="close" size={22} color="#0F172A" />
              </TouchableOpacity>
            </View>

            <View style={styles.heroMetrics}>
              <View style={styles.heroMetricBlock}>
                <Text style={styles.heroMetricValue}>{routeDistance}</Text>
                <Text style={styles.heroMetricLabel}>{tx('Mesafe', 'Distance')}</Text>
              </View>
              <View style={styles.heroDivider} />
              <View style={styles.heroMetricBlock}>
                <Text style={styles.heroMetricValue}>{routeDuration}</Text>
                <Text style={styles.heroMetricLabel}>{tx('Süre', 'Duration')}</Text>
              </View>
              <View style={styles.heroDivider} />
              <View style={styles.heroMetricBlock}>
                <Text style={styles.heroMetricValue}>{routeCalories}</Text>
                <Text style={styles.heroMetricLabel}>{tx('Kalori', 'Calories')}</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <View style={styles.sectionShell}>
            <Text style={styles.sectionTitle}>{tx('Özet', 'Snapshot')}</Text>
            <View style={styles.statsGrid}>
              <RouteMetricCard icon="navigate" label={tx('Mesafe', 'Distance')} value={routeDistance} accent={accent} />
              <RouteMetricCard icon="time" label={tx('Süre', 'Duration')} value={routeDuration} accent={accent} />
              <RouteMetricCard icon="flame" label={tx('Kalori', 'Calories')} value={routeCalories} accent={accent} />
              <RouteMetricCard icon="footsteps" label={tx('Adım', 'Steps')} value={routeSteps} accent={accent} />
            </View>
          </View>

          <View style={styles.sectionShell}>
            <Text style={styles.sectionTitle}>{tx('Rota Hikayesi', 'Route Story')}</Text>
            <View style={styles.timelineCard}>
              <View style={styles.timelineRow}>
                <View style={[styles.timelineDot, { backgroundColor: accent }]} />
                <View style={styles.timelineTextWrap}>
                  <Text style={styles.timelineLabel}>{tx('Başlangıç', 'Start')}</Text>
                  <Text style={styles.timelineValue}>{route.startLocation || '—'}</Text>
                </View>
              </View>

              <View style={styles.timelineConnector} />

              <View style={styles.timelineRow}>
                <View style={[styles.timelineDot, { backgroundColor: '#FF6B6B' }]} />
                <View style={styles.timelineTextWrap}>
                  <Text style={styles.timelineLabel}>{tx('Hedef', 'Destination')}</Text>
                  <Text style={styles.timelineValue}>{route.endLocation || '—'}</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.sectionShell}>
            <PremiumChartCard
              title={tx('Yükselti Profili', 'Elevation Profile')}
              subtitle={
                hasRealElevation
                  ? `${tx('Kayıtlı profil', 'Saved profile')} · ${tx('Çıkış', 'Climb')}: ${route.elevationGain || '—'}`
                  : tx('Bu kart yalnızca veritabanındaki yükseklik profili varsa gösterilir.', 'This card appears only when a real elevation profile exists.')
              }
              accent={accent}
              chartConfig={chartConfig}
              chartData={elevationData}
              chartKey={`elev-${route?.id ?? 'x'}-${(route?.elevationSeries || []).length}`}
              detailLoading={detailLoading}
              hasRealData={hasRealElevation}
              introAnim={chartIntroAnim1}
              chartHeight={182}
              loadingLabel={tx('Detay yükleniyor…', 'Loading details…')}
              emptyLabel={tx('Yükseklik verisi yok', 'No elevation data')}
            />
          </View>

          <View style={styles.sectionShell}>
            <View style={styles.infoPanel}>
              <View style={styles.infoPanelHeader}>
                <Text style={styles.sectionTitle}>{tx('Hız Bilgisi', 'Speed Info')}</Text>
                <View style={[styles.sectionPill, { backgroundColor: accentSoft }]}>
                  <Ionicons name="speedometer-outline" size={12} color={accent} />
                  <Text style={[styles.sectionPillText, { color: accent }]}>{route.avgSpeed || `${avgSpeed.toFixed(1)} km/h`}</Text>
                </View>
              </View>
              <View style={styles.infoPanelBody}>
                <Text style={styles.infoPanelText}>
                  {tx('Bu değer veritabanındaki kayıtlı seans özetinden geliyor.', 'This value comes from the saved session summary in the database.')}
                </Text>
                <View style={styles.infoInlineMetricRow}>
                  <View style={styles.infoInlineMetric}>
                    <Text style={styles.infoInlineMetricLabel}>{tx('Ort. Hız', 'Avg. Speed')}</Text>
                    <Text style={styles.infoInlineMetricValue}>{route.avgSpeed || `${avgSpeed.toFixed(1)} km/h`}</Text>
                  </View>
                  <View style={styles.infoInlineMetricDivider} />
                  <View style={styles.infoInlineMetric}>
                    <Text style={styles.infoInlineMetricLabel}>{tx('Adım', 'Steps')}</Text>
                    <Text style={styles.infoInlineMetricValue}>{routeSteps}</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.sectionShell}>
            <View style={styles.infoPanel}>
              <View style={styles.infoPanelHeader}>
                <Text style={styles.sectionTitle}>{tx('Kalori Bilgisi', 'Calorie Info')}</Text>
                <View style={[styles.sectionPill, { backgroundColor: accentSoft }]}>
                  <Ionicons name="flame-outline" size={12} color={accent} />
                  <Text style={[styles.sectionPillText, { color: accent }]}>{routeCalories}</Text>
                </View>
              </View>
              <View style={styles.infoPanelBody}>
                <Text style={styles.infoPanelText}>
                  {tx('Kalori değeri de kayıtlı seans özetinden geliyor; burada uydurma grafik yok.', 'Calories also come from the saved session summary; no synthetic chart is used here.')}
                </Text>
                <View style={styles.infoInlineMetricRow}>
                  <View style={styles.infoInlineMetric}>
                    <Text style={styles.infoInlineMetricLabel}>{tx('Kalori', 'Calories')}</Text>
                    <Text style={styles.infoInlineMetricValue}>{routeCalories}</Text>
                  </View>
                  <View style={styles.infoInlineMetricDivider} />
                  <View style={styles.infoInlineMetric}>
                    <Text style={styles.infoInlineMetricLabel}>{tx('Mesafe', 'Distance')}</Text>
                    <Text style={styles.infoInlineMetricValue}>{routeDistance}</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.sectionShell}>
            <Text style={styles.sectionTitle}>{tx('Detaylar', 'Details')}</Text>
            <View style={styles.detailGrid}>
              <View style={styles.detailTile}>
                <Text style={styles.detailTileLabel}>{tx('Tarih', 'Date')}</Text>
                <Text style={styles.detailTileValue}>{route.date || '—'}</Text>
              </View>
              <View style={styles.detailTile}>
                <Text style={styles.detailTileLabel}>{tx('Saat', 'Time')}</Text>
                <Text style={styles.detailTileValue}>{route.time || '—'}</Text>
              </View>
              <View style={styles.detailTile}>
                <Text style={styles.detailTileLabel}>{tx('Ort. Hız', 'Avg. Speed')}</Text>
                <Text style={styles.detailTileValue}>{route.avgSpeed || `${avgSpeed.toFixed(1)} km/h`}</Text>
              </View>
              <View style={styles.detailTile}>
                <Text style={styles.detailTileLabel}>{tx('Ortalama Eğim', 'Avg. Slope')}</Text>
                <Text style={styles.detailTileValue}>{route.avgSlope || '—'}</Text>
              </View>
              <View style={styles.detailTile}>
                <Text style={styles.detailTileLabel}>{tx('Maks. Eğim', 'Max Slope')}</Text>
                <Text style={styles.detailTileValue}>{route.maxSlope || '—'}</Text>
              </View>
              <View style={styles.detailTile}>
                <Text style={styles.detailTileLabel}>{tx('Hava', 'Weather')}</Text>
                <Text style={styles.detailTileValue}>{route.weather && route.temperature ? `${route.weather}, ${route.temperature}` : '—'}</Text>
              </View>
            </View>
          </View>

          {route.notes ? (
            <View style={styles.sectionShell}>
              <Text style={styles.sectionTitle}>{tx('Notlar', 'Notes')}</Text>
              <View style={styles.notesCard}>
                <Ionicons name="chatbubble-ellipses-outline" size={16} color={accent} />
                <Text style={styles.notesText}>{route.notes}</Text>
              </View>
            </View>
          ) : null}

          <View style={{ height: 110 }} />
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.shareButton} onPress={handleShare} activeOpacity={0.85}>
            <Ionicons name="share-outline" size={18} color={accent} />
            <Text style={styles.shareButtonText}>{tx('Paylaş', 'Share')}</Text>
          </TouchableOpacity>

          {onStartNavigation ? (
            <TouchableOpacity style={styles.primaryButton} onPress={handleWalkAgain} activeOpacity={0.9}>
              <LinearGradient colors={[accent, '#0F172A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.primaryButtonGradient}>
                <Ionicons name="repeat" size={18} color="#FFFFFF" />
                <Text style={styles.primaryButtonText}>{tx('Tekrar Yürü', 'Walk Again')}</Text>
              </LinearGradient>
            </TouchableOpacity>
          ) : null}
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(2, 6, 23, 0.58)',
  },
  backdropTouch: {
    flex: 1,
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: SCREEN_HEIGHT * 0.94,
    backgroundColor: '#F8FAFC',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 24,
    overflow: 'hidden',
  },
  handleArea: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 12,
    backgroundColor: '#F8FAFC',
  },
  handle: {
    width: 48,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#CBD5E1',
  },
  heroWrap: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  hero: {
    borderRadius: 28,
    padding: 18,
    overflow: 'hidden',
    position: 'relative',
  },
  heroOrb: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  heroOrbTop: {
    width: 120,
    height: 120,
    right: -40,
    top: -30,
  },
  heroOrbBottom: {
    width: 160,
    height: 160,
    right: 10,
    bottom: -80,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    zIndex: 1,
  },
  heroBadgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  heroBadgeMuted: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  heroBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  heroBadgeTextMuted: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  heroTitle: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  heroLocationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  heroLocationText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
    color: 'rgba(255,255,255,0.88)',
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 5,
  },
  heroMetrics: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 10,
    zIndex: 1,
  },
  heroMetricBlock: {
    flex: 1,
    alignItems: 'center',
  },
  heroMetricValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  heroMetricLabel: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.82)',
  },
  heroDivider: {
    width: 1,
    height: 26,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  sectionShell: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metricCard: {
    width: (SCREEN_WIDTH - 42) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  metricCardDark: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  metricIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  metricValueDark: {
    color: '#FFFFFF',
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  metricLabelDark: {
    color: '#CBD5E1',
  },
  timelineCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  timelineDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginTop: 4,
  },
  timelineTextWrap: {
    flex: 1,
  },
  timelineLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 3,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  timelineValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  timelineConnector: {
    width: 2,
    height: 22,
    backgroundColor: '#E2E8F0',
    marginLeft: 6,
    marginVertical: 8,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  sectionPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  chartShell: {
    borderRadius: 26,
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 4,
  },
  chartSurface: {
    borderRadius: 26,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    position: 'relative',
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
    gap: 12,
  },
  chartHeaderLeft: {
    flex: 1,
  },
  chartKickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  chartKickerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  chartKicker: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 3,
  },
  chartSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    lineHeight: 18,
  },
  chartMetaRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  chartMetaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
  },
  chartMetaPillSoft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chartMetaText: {
    fontSize: 12,
    fontWeight: '700',
  },
  chartMetaTextSoft: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  chartAccentRail: {
    height: 4,
    borderRadius: 999,
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
    marginBottom: 10,
  },
  chartAccentPulse: {
    width: '42%',
    height: '100%',
    borderRadius: 999,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.16,
    shadowRadius: 8,
  },
  chartContainer: {
    alignItems: 'center',
    paddingBottom: 4,
  },
  chart: {
    borderRadius: 18,
  },
  chartEmptyState: {
    minHeight: 160,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 20,
  },
  chartEmptyIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  chartEmptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  chartEmptyText: {
    fontSize: 13,
    lineHeight: 19,
    color: '#64748B',
    textAlign: 'center',
    fontWeight: '600',
  },
  chartLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.78)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    gap: 8,
    borderRadius: 18,
  },
  chartLoadingText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  detailTile: {
    width: (SCREEN_WIDTH - 42) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  detailTileLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 6,
  },
  detailTileValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 20,
  },
  infoPanel: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 3,
  },
  infoPanelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  infoPanelBody: {
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  infoPanelText: {
    fontSize: 13,
    lineHeight: 20,
    color: '#475569',
    fontWeight: '600',
    marginBottom: 12,
  },
  infoInlineMetricRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoInlineMetric: {
    flex: 1,
  },
  infoInlineMetricDivider: {
    width: 1,
    height: 34,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 12,
  },
  infoInlineMetricLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 3,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  infoInlineMetricValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  notesCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    flexDirection: 'row',
    gap: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  notesText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 21,
    color: '#334155',
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  shareButton: {
    flex: 0.9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 18,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D9E3EE',
  },
  shareButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  primaryButton: {
    flex: 1.25,
    borderRadius: 18,
    overflow: 'hidden',
  },
  primaryButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
