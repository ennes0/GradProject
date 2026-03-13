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
import Svg, { Path, Defs, LinearGradient, Stop, Circle, Line, Text as SvgText } from 'react-native-svg';
import { Colors } from '../../constants/Colors';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function RouteSelectionModal({ visible, onClose, onSelectRoute, routes, startLocation, endLocation }) {
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const dragY = useRef(new Animated.Value(0)).current;
  const isClosingRef = useRef(false);

  // Pan Responder for drag to dismiss
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return gestureState.dy > 5;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          dragY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 100 || gestureState.vy > 0.5) {
          handleClose();
        } else {
          Animated.spring(dragY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 100,
            friction: 10,
          }).start();
        }
      },
    })
  ).current;

  useEffect(() => {
    if (visible) {
      isClosingRef.current = false;
      slideAnim.setValue(SCREEN_HEIGHT);
      fadeAnim.setValue(0);
      dragY.setValue(0);
      
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 11,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleClose = (selectedRoute = null) => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;
    const routeToSelect = selectedRoute && typeof selectedRoute === 'object' && selectedRoute.id != null ? selectedRoute : null;
    Animated.parallel([
      Animated.timing(slideAnim, {
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
      dragY.setValue(0);
      onClose();
      if (routeToSelect && onSelectRoute) {
        setTimeout(() => onSelectRoute(routeToSelect), 50);
      }
    });
  };

  const defaultRoutes = [
    {
      id: 1,
      type: 'fastest',
      label: 'En Hızlı',
      description: 'Tobler ile tahmini en kısa süre.',
      totalClimb: '86m',
      distance: '1.9 km',
      duration: '15 dk',
      calories: '220 kcal',
      avgSlope: '%12',
      color: '#FF6B6B',
      icon: 'flash',
      elevationData: [2, 10, 25, 40, 55, 65, 72, 78, 82, 86],
    },
    {
      id: 2,
      type: 'balanced',
      label: 'Dengeli',
      description: 'Süre ve yokuş dengesi. Günlük yürüyüş için uygun.',
      totalClimb: '45m',
      distance: '2.4 km',
      duration: '18 dk',
      calories: '185 kcal',
      avgSlope: '%5',
      color: Colors.primary,
      icon: 'fitness',
      elevationData: [2, 5, 10, 15, 20, 28, 35, 40, 43, 45],
      recommended: true,
    },
    {
      id: 3,
      type: 'easiest',
      label: 'En Kolay',
      description: 'Eğim değişimi az, olabildiğince düz rota.',
      totalClimb: '15m',
      distance: '2.8 km',
      duration: '22 dk',
      calories: '145 kcal',
      avgSlope: '%2',
      color: '#4CAF50',
      icon: 'leaf',
      elevationData: [2, 3, 4, 5, 7, 9, 10, 12, 14, 15],
    },
  ];

  const routeData = (routes && Array.isArray(routes) && routes.length > 0) ? routes : defaultRoutes;

  const renderElevationChart = (data, color, routeId) => {
    const safeData = (data && Array.isArray(data) && data.length >= 2) ? data : [0, 10];
    const chartWidth = SCREEN_WIDTH - 100;
    const chartHeight = 50;
    const padding = 4;
    const leftLabelWidth = 32;
    const graphLeft = leftLabelWidth + padding;
    const graphWidth = chartWidth - graphLeft - padding;
    
    const maxValue = Math.max(...safeData);
    const minValue = Math.min(...safeData);
    const range = maxValue - minValue || 1;
    
    const valueToY = (value) =>
      chartHeight - padding - ((value - minValue) / range) * (chartHeight - padding * 2);
    
    const points = safeData.map((value, index) => {
      const x = graphLeft + (index / (safeData.length - 1 || 1)) * graphWidth;
      const y = valueToY(value);
      return { x, y, value };
    });
    
    let pathD = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cpx = (prev.x + curr.x) / 2;
      pathD += ` Q ${cpx} ${prev.y} ${cpx} ${(prev.y + curr.y) / 2}`;
      pathD += ` Q ${cpx} ${curr.y} ${curr.x} ${curr.y}`;
    }
    
    const areaPath = pathD + ` L ${points[points.length - 1].x} ${chartHeight} L ${points[0].x} ${chartHeight} Z`;
    const highestPoint = points.reduce((max, p) => p.y < max.y ? p : max, points[0]);
    
    const yLabels = [];
    const steps = 4;
    for (let i = 0; i <= steps; i++) {
      const val = minValue + (range * i) / steps;
      yLabels.push({ value: Math.round(val), y: valueToY(val) });
    }
    
    return (
      <View style={styles.chartWrapper}>
        <Svg width={chartWidth} height={chartHeight + 16}>
          <Defs>
            <LinearGradient id={`gradient-${routeId}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor={color} stopOpacity="0.4" />
              <Stop offset="100%" stopColor={color} stopOpacity="0.05" />
            </LinearGradient>
          </Defs>
          
          {/* Grid lines */}
          <Line x1={graphLeft} y1={chartHeight * 0.25} x2={chartWidth - padding} y2={chartHeight * 0.25} stroke="#E5E5E5" strokeWidth="1" strokeDasharray="4,4" />
          <Line x1={graphLeft} y1={chartHeight * 0.5} x2={chartWidth - padding} y2={chartHeight * 0.5} stroke="#E5E5E5" strokeWidth="1" strokeDasharray="4,4" />
          <Line x1={graphLeft} y1={chartHeight * 0.75} x2={chartWidth - padding} y2={chartHeight * 0.75} stroke="#E5E5E5" strokeWidth="1" strokeDasharray="4,4" />
          
          <Path d={areaPath} fill={`url(#gradient-${routeId})`} />
          <Path d={pathD} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          
          <Circle cx={points[0].x} cy={points[0].y} r="3" fill="#FFF" stroke={color} strokeWidth="2" />
          <Circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r="3" fill="#FFF" stroke={color} strokeWidth="2" />
          <Circle cx={highestPoint.x} cy={highestPoint.y} r="4" fill={color} />
          <SvgText x={highestPoint.x} y={highestPoint.y - 8} fontSize="9" fontWeight="600" fill={color} textAnchor="middle">
            {highestPoint.value}m
          </SvgText>
          
          {/* Y ekseni: yükselti değerleri (m) */}
          {yLabels.map(({ value, y }, i) => (
            <SvgText key={`y-${i}-${value}`} x={leftLabelWidth - 4} y={y + 3} fontSize="9" fill="#888" textAnchor="end">
              {value}m
            </SvgText>
          ))}
          
          {/* X ekseni: sadece başlangıç/bitiş (sayı yok) */}
          <SvgText x={graphLeft} y={chartHeight + 12} fontSize="9" fill="#AAA" textAnchor="start">Başlangıç</SvgText>
          <SvgText x={chartWidth - padding} y={chartHeight + 12} fontSize="9" fill="#AAA" textAnchor="end">Bitiş</SvgText>
        </Svg>
      </View>
    );
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent={true}
      onRequestClose={handleClose}
    >
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <TouchableOpacity style={styles.overlayTouch} onPress={handleClose} activeOpacity={1} />
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
        {/* Handle Bar */}
        <View {...panResponder.panHandlers} style={styles.handleContainer}>
          <View style={styles.handle} />
        </View>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Rota Seçin</Text>
            <Text style={styles.headerSubtitle}>
              {startLocation || 'Başlangıç'} → {endLocation || 'Varış'}
            </Text>
          </View>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={22} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Route Options */}
        <ScrollView 
          style={styles.routesContainer} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.routesContent}
        >
          {routeData.map((route) => (
            <TouchableOpacity
              key={route.id}
              style={[
                styles.routeCard,
                route.recommended && styles.recommendedCard
              ]}
              onPress={() => handleClose(route)}
              activeOpacity={0.7}
            >
              {route.recommended && (
                <View style={styles.recommendedBadge}>
                  <Ionicons name="star" size={12} color="#FFF" />
                  <Text style={styles.recommendedText}>Önerilen</Text>
                </View>
              )}
              
              <View style={styles.routeHeader}>
                <View style={[styles.routeIconBg, { backgroundColor: route.color + '15' }]}>
                  <Ionicons name={route.icon} size={22} color={route.color} />
                </View>
                <View style={styles.routeInfo}>
                  <Text style={[styles.routeLabel, { color: route.color }]}>
                    {route.label}
                  </Text>
                  <Text style={styles.routeDescription} numberOfLines={2}>
                    {route.description}
                  </Text>
                </View>
              </View>

              {/* Stats Row */}
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Ionicons name="navigate-outline" size={16} color="#888" />
                  <Text style={styles.statValue}>{route.distance}</Text>
                </View>
                <View style={styles.statItem}>
                  <Ionicons name="time-outline" size={16} color="#888" />
                  <Text style={styles.statValue}>{route.duration}</Text>
                </View>
                <View style={styles.statItem}>
                  <Ionicons name="trending-up-outline" size={16} color="#888" />
                  <Text style={styles.statValue}>{route.totalClimb}</Text>
                </View>
                <View style={styles.statItem}>
                  <Ionicons name="flame-outline" size={16} color="#888" />
                  <Text style={styles.statValue}>{route.calories}</Text>
                </View>
              </View>
              
              {/* Elevation Chart */}
              <View style={styles.elevationSection}>
                <View style={styles.elevationHeader}>
                  <Text style={styles.elevationLabel}>Yükselti Profili</Text>
                  <Text style={styles.slopeText}>Ort. Eğim: {route.avgSlope}</Text>
                </View>
                {renderElevationChart(route.elevationData ?? [0, 10], route.color, route.id)}
              </View>

              {/* Select Button */}
              <View style={[styles.selectButton, { backgroundColor: route.color }]}>
                <Ionicons name="arrow-forward" size={18} color="#FFF" />
                <Text style={styles.selectButtonText}>Bu Rotayı Seç</Text>
              </View>
            </TouchableOpacity>
          ))}
          
          <View style={{ height: 40 }} />
        </ScrollView>
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
    maxHeight: SCREEN_HEIGHT * 0.85,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 25,
  },
  handleContainer: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 8,
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
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    backgroundColor: '#FFF',
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#888',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  routesContainer: {
    flex: 1,
  },
  routesContent: {
    padding: 16,
  },
  routeCard: {
    backgroundColor: '#FFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
  },
  recommendedCard: {
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  recommendedBadge: {
    position: 'absolute',
    top: -1,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    gap: 4,
  },
  recommendedText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFF',
  },
  routeHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  routeIconBg: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  routeInfo: {
    flex: 1,
  },
  routeLabel: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  routeDescription: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A1A2E',
  },
  elevationSection: {
    marginBottom: 14,
  },
  elevationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  elevationLabel: {
    fontSize: 12,
    color: '#888',
    fontWeight: '500',
  },
  slopeText: {
    fontSize: 12,
    color: '#888',
    fontWeight: '500',
  },
  chartWrapper: {
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    padding: 8,
    alignItems: 'center',
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  selectButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
});
