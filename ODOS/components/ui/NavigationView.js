import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Modal,
  Dimensions,
  Animated,
  Platform,
  PanResponder,
  ScrollView,
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import { getMapProvider } from '../../constants/mapProvider';
import Svg, { Path, Circle, Ellipse } from 'react-native-svg';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const PROFILE_CHART_WIDTH = SCREEN_WIDTH - 88;
const PROFILE_CHART_HEIGHT = 64;
const PANEL_HIDE_OFFSET = Math.max(320, Math.round(SCREEN_HEIGHT * 0.52));
const PANEL_COLLAPSED_PEEK = 16;

const toRad = (v) => (v * Math.PI) / 180;
const toDeg = (v) => (v * 180) / Math.PI;
const haversineMeters = (a, b) => {
  const R = 6371000;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const la1 = toRad(a.latitude);
  const la2 = toRad(b.latitude);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
};
const bearingDeg = (a, b) => {
  const y = Math.sin(toRad(b.longitude - a.longitude)) * Math.cos(toRad(b.latitude));
  const x = Math.cos(toRad(a.latitude)) * Math.sin(toRad(b.latitude))
    - Math.sin(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.cos(toRad(b.longitude - a.longitude));
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
};
const normalizeTurnDelta = (d) => {
  let v = d;
  while (v > 180) v -= 360;
  while (v < -180) v += 360;
  return v;
};
const projectPointToSegment = (p, a, b) => {
  const lat0 = toRad((a.latitude + b.latitude + p.latitude) / 3);
  const ax = toRad(a.longitude) * Math.cos(lat0);
  const ay = toRad(a.latitude);
  const bx = toRad(b.longitude) * Math.cos(lat0);
  const by = toRad(b.latitude);
  const px = toRad(p.longitude) * Math.cos(lat0);
  const py = toRad(p.latitude);
  const abx = bx - ax;
  const aby = by - ay;
  const apx = px - ax;
  const apy = py - ay;
  const ab2 = abx * abx + aby * aby;
  const t = ab2 > 0 ? Math.max(0, Math.min(1, (apx * abx + apy * aby) / ab2)) : 0;
  const cx = ax + t * abx;
  const cy = ay + t * aby;
  const dx = px - cx;
  const dy = py - cy;
  return { t, distanceM: Math.sqrt(dx * dx + dy * dy) * 6371000 };
};
const fmtDistance = (m) => (m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.max(0, Math.round(m))} m`);
const sampleCoordinates = (coords, maxPoints = 140) => {
  if (!Array.isArray(coords) || coords.length <= maxPoints) return coords || [];
  const step = Math.ceil(coords.length / maxPoints);
  return coords.filter((_, index) => index % step === 0 || index === coords.length - 1);
};

// User Location Marker with pulse animation
const UserLocationMarker = () => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.5,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <View style={styles.userMarkerContainer}>
      <Animated.View 
        style={[
          styles.userMarkerPulse,
          { transform: [{ scale: pulseAnim }] }
        ]} 
      />
      <View style={styles.userMarkerDot}>
        <Ionicons name="navigate" size={14} color="#FFF" />
      </View>
    </View>
  );
};

// Destination Marker
const DestinationMarker = () => (
  <View style={styles.destinationContainer}>
    <Svg width="36" height="44" viewBox="0 0 24 32">
      <Path
        d="M12 0C7.03 0 3 4.03 3 9c0 6.75 9 23 9 23s9-16.25 9-23c0-4.97-4.03-9-9-9z"
        fill="#FF6B6B"
      />
      <Path
        d="M12 5l1.5 4.5H18l-3.75 2.73L15.75 17 12 14.27 8.25 17l1.5-4.77L6 9.5h4.5z"
        fill="#FFFFFF"
      />
    </Svg>
  </View>
);

export default function NavigationView({ visible, route, onClose, userLocation, startPoint, endPoint, onRerouteRequest }) {
  const progressAnim = useRef(new Animated.Value(0)).current;
  const panelTranslateY = useRef(new Animated.Value(0)).current;
  const mapRef = useRef(null);
  const initialFitDoneRef = useRef(false);
  const fitTimeoutRef = useRef(null);
  
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [is3DMode, setIs3DMode] = useState(true); // 3D varsayılan olsun
  const [heading, setHeading] = useState(0);
  const [showFullMap, setShowFullMap] = useState(false);
  const [isSummaryCollapsed, setIsSummaryCollapsed] = useState(false);
  const [isMapReady, setIsMapReady] = useState(false);
  const [panelHeight, setPanelHeight] = useState(0);
  const [summaryPage, setSummaryPage] = useState(0);
  const [summaryPagerWidth, setSummaryPagerWidth] = useState(Math.max(220, SCREEN_WIDTH - 76));
  const [currentProgressM, setCurrentProgressM] = useState(0);
  const [isOffRoute, setIsOffRoute] = useState(false);
  const [isRerouting, setIsRerouting] = useState(false);
  const [offRouteDistanceM, setOffRouteDistanceM] = useState(0);
  const [maxOffRouteDistanceM, setMaxOffRouteDistanceM] = useState(0);
  const [rerouteCount, setRerouteCount] = useState(0);
  const [sessionStartAt, setSessionStartAt] = useState(null);
  const offRouteHitsRef = useRef(0);
  const lastRerouteAtRef = useRef(0);
  const speedSmoothingRef = useRef([]);
  
  const routeCoords = useMemo(() => {
    if (Array.isArray(route?.shapePoints) && route.shapePoints.length > 1) {
      return route.shapePoints.map((p) => ({
        latitude: Number(p.lat),
        longitude: Number(p.lon),
      })).filter((p) => Number.isFinite(p.latitude) && Number.isFinite(p.longitude));
    }
    return Array.isArray(route?.coordinates)
      ? route.coordinates.filter((p) => Number.isFinite(p?.latitude) && Number.isFinite(p?.longitude))
      : [];
  }, [route?.shapePoints, route?.coordinates]);
  const routeAnalysis = useMemo(() => {
    if (routeCoords.length < 2) {
      return { cumulative: [0], totalM: 0, instructions: [{ action: 'straight', atM: 0 }] };
    }
    const cumulative = [0];
    for (let i = 0; i < routeCoords.length - 1; i++) {
      cumulative.push(cumulative[i] + haversineMeters(routeCoords[i], routeCoords[i + 1]));
    }
    const rawInstructions = [];
    for (let i = 1; i < routeCoords.length - 1; i++) {
      const b1 = bearingDeg(routeCoords[i - 1], routeCoords[i]);
      const b2 = bearingDeg(routeCoords[i], routeCoords[i + 1]);
      const delta = normalizeTurnDelta(b2 - b1);
      const abs = Math.abs(delta);
      const segM = cumulative[i + 1] - cumulative[i - 1];
      if (segM < 20) continue;
      if (abs > 150) rawInstructions.push({ action: 'uturn', atM: cumulative[i], severity: 3 });
      else if (abs > 55) rawInstructions.push({ action: delta > 0 ? 'right' : 'left', atM: cumulative[i], severity: 2 });
      else if (abs > 28) rawInstructions.push({ action: delta > 0 ? 'right' : 'left', atM: cumulative[i], severity: 1 });
    }
    rawInstructions.sort((a, b) => a.atM - b.atM);
    const instructions = [];
    for (const ins of rawInstructions) {
      if (!instructions.length) {
        instructions.push(ins);
        continue;
      }
      const prev = instructions[instructions.length - 1];
      if (ins.atM - prev.atM < 35) {
        if ((ins.severity || 0) >= (prev.severity || 0)) {
          instructions[instructions.length - 1] = ins;
        }
      } else {
        instructions.push(ins);
      }
    }
    instructions.push({ action: 'arrive', atM: cumulative[cumulative.length - 1] });
    return { cumulative, totalM: cumulative[cumulative.length - 1], instructions };
  }, [routeCoords]);
  const progressRatio = routeAnalysis.totalM > 0 ? Math.max(0, Math.min(1, currentProgressM / routeAnalysis.totalM)) : 0;
  const nextInstruction = useMemo(() => {
    const upcoming = routeAnalysis.instructions.find((x) => x.atM > currentProgressM + 3);
    return upcoming || routeAnalysis.instructions[routeAnalysis.instructions.length - 1] || { action: 'arrive', atM: 0 };
  }, [routeAnalysis.instructions, currentProgressM]);
  const secondInstruction = useMemo(() => {
    const idx = routeAnalysis.instructions.findIndex((x) => x.atM > currentProgressM + 3);
    if (idx < 0) return null;
    return routeAnalysis.instructions[idx + 1] || null;
  }, [routeAnalysis.instructions, currentProgressM]);
  const distanceToNextInstructionM = Math.max(0, nextInstruction.atM - currentProgressM);
  const currentInstruction = {
    action: nextInstruction.action,
    distance: fmtDistance(distanceToNextInstructionM),
    text: nextInstruction.action === 'arrive'
      ? 'Hedefinize ulaştınız'
      : `${fmtDistance(distanceToNextInstructionM)} sonra ${getDirectionText(nextInstruction.action).toLowerCase()}`,
    street: secondInstruction ? `Ardından ${getDirectionText(secondInstruction.action).toLowerCase()}` : '',
  };
  const plannedDurationMin = useMemo(() => {
    const s = route?.duration;
    if (typeof s !== 'string') return null;
    const m = s.match(/(\d+(\.\d+)?)/);
    return m ? Number(m[1]) : null;
  }, [route?.duration]);
  const plannedAvgMps = routeAnalysis.totalM > 0 && plannedDurationMin && plannedDurationMin > 0
    ? routeAnalysis.totalM / (plannedDurationMin * 60)
    : null;
  const smoothedUserSpeedMps = useMemo(() => {
    if (userLocation?.speed != null && Number.isFinite(userLocation.speed) && userLocation.speed > 0.3) {
      const arr = speedSmoothingRef.current;
      arr.push(userLocation.speed);
      if (arr.length > 5) arr.shift();
      return arr.reduce((a, b) => a + b, 0) / arr.length;
    }
    return null;
  }, [userLocation?.speed]);
  const effectiveSpeedMps = Math.max(0.7, smoothedUserSpeedMps || plannedAvgMps || 1.25);
  const etaMin = Math.max(0, ((routeAnalysis.totalM - currentProgressM) / effectiveSpeedMps) / 60);
  const navigationData = {
    totalDistance: route?.distance || fmtDistance(routeAnalysis.totalM),
    totalClimb: route?.totalClimb || '0m',
    estimatedTime: `${Math.round(etaMin)} dk`,
    currentSpeed: `${(effectiveSpeedMps * 3.6).toFixed(1)} km/h`,
  };
  const elevationSeries = useMemo(() => {
    if (Array.isArray(route?.elevationData) && route.elevationData.length >= 2) {
      return route.elevationData.map((v) => Number(v) || 0);
    }
    if (Array.isArray(route?.elevationProfile) && route.elevationProfile.length >= 2) {
      return route.elevationProfile.map((p) => Number(p?.elevM) || 0);
    }
    return [2, 4, 8, 12, 17, 21, 19, 24, 22, 16, 11, 8];
  }, [route?.elevationData, route?.elevationProfile]);
  const elevationMin = Math.min(...elevationSeries);
  const elevationMax = Math.max(...elevationSeries);
  const elevationRange = Math.max(1, elevationMax - elevationMin);
  const chartLinePath = useMemo(() => {
    const stepX = PROFILE_CHART_WIDTH / (elevationSeries.length - 1 || 1);
    return elevationSeries
      .map((value, index) => {
        const x = index * stepX;
        const y = PROFILE_CHART_HEIGHT - ((value - elevationMin) / elevationRange) * PROFILE_CHART_HEIGHT;
        return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
      })
      .join(' ');
  }, [elevationSeries, elevationMin, elevationRange]);
  const chartAreaPath = `${chartLinePath} L ${PROFILE_CHART_WIDTH} ${PROFILE_CHART_HEIGHT} L 0 ${PROFILE_CHART_HEIGHT} Z`;
  const totalKm = routeAnalysis.totalM > 0 ? routeAnalysis.totalM / 1000 : 0;
  const chartEndLabel = totalKm > 0 ? `${totalKm.toFixed(1)} km` : navigationData.totalDistance;
  const chartMidLabel = totalKm > 0 ? `${(totalKm / 2).toFixed(1)} km` : '--';
  const summaryPageCount = 3;
  const compactChartWidth = Math.max(180, summaryPagerWidth - 30);
  const compactChartPathData = useMemo(() => {
    const stepX = compactChartWidth / (elevationSeries.length - 1 || 1);
    return elevationSeries
      .map((value, index) => {
        const x = index * stepX;
        const y = 46 - ((value - elevationMin) / elevationRange) * 46;
        return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
      })
      .join(' ');
  }, [compactChartWidth, elevationSeries, elevationMin, elevationRange]);
  const compactChartAreaPath = `${compactChartPathData} L ${compactChartWidth} 46 L 0 46 Z`;
  const panelCollapseDistance = useMemo(() => {
    if (panelHeight > 0) {
      return Math.max(PANEL_HIDE_OFFSET, panelHeight + PANEL_COLLAPSED_PEEK);
    }
    return PANEL_HIDE_OFFSET;
  }, [panelHeight]);

  useEffect(() => {
    if (visible) {
      Animated.timing(progressAnim, { toValue: progressRatio, duration: 200, useNativeDriver: false }).start();
    } else {
      progressAnim.setValue(0);
      setElapsedTime(0);
      setCurrentProgressM(0);
    }
  }, [visible, progressRatio, progressAnim]);

  useEffect(() => {
    if (visible) {
      initialFitDoneRef.current = false;
      setIsSummaryCollapsed(false);
      panelTranslateY.setValue(0);
      setShowFullMap(false);
      setSessionStartAt(new Date().toISOString());
      setMaxOffRouteDistanceM(0);
      setRerouteCount(0);
      return;
    }
    setIsMapReady(false);
    if (fitTimeoutRef.current) {
      clearTimeout(fitTimeoutRef.current);
      fitTimeoutRef.current = null;
    }
  }, [visible, panelTranslateY]);

  // Timer
  useEffect(() => {
    let interval;
    if (visible && !isPaused) {
      interval = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [visible, isPaused]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  function getDirectionIcon(action) {
    switch (action) {
      case 'left': return 'arrow-back';
      case 'right': return 'arrow-forward';
      case 'straight': return 'arrow-up';
      case 'uturn': return 'return-down-back';
      case 'arrive': return 'flag';
      default: return 'arrow-up';
    }
  }

  function getDirectionText(action) {
    switch (action) {
      case 'left': return 'Sola Dön';
      case 'right': return 'Sağa Dön';
      case 'straight': return 'Düz Git';
      case 'uturn': return 'Geri Dön';
      case 'arrive': return 'Hedefe var';
      default: return 'Devam Et';
    }
  }

  const parseDistanceKm = (distanceText) => {
    if (typeof distanceText !== 'string') return null;
    const match = distanceText.match(/(\d+(?:\.\d+)?)/);
    return match ? Number(match[1]) : null;
  };

  const parseNumericValue = (rawValue) => {
    if (rawValue == null) return null;
    if (typeof rawValue === 'number' && Number.isFinite(rawValue)) return rawValue;
    if (typeof rawValue === 'string') {
      const match = rawValue.replace(',', '.').match(/(\d+(?:\.\d+)?)/);
      if (match) return Number(match[1]);
    }
    return null;
  };

  const buildSessionSummary = useCallback(() => {
    const distanceKmFromRoute = parseDistanceKm(route?.distance);
    const plannedDistanceM = Math.max(
      routeAnalysis.totalM || 0,
      distanceKmFromRoute != null ? distanceKmFromRoute * 1000 : 0,
    );
    const traveledDistanceM = Math.max(0, currentProgressM);
    const boundedTraveledM = plannedDistanceM > 0
      ? Math.min(traveledDistanceM, plannedDistanceM)
      : traveledDistanceM;
    const completionRatio = plannedDistanceM > 0
      ? Math.max(0, Math.min(1, boundedTraveledM / plannedDistanceM))
      : 0;
    const elapsedSeconds = Math.max(1, elapsedTime);
    const avgSpeedKmh = boundedTraveledM > 0 ? ((boundedTraveledM / elapsedSeconds) * 3.6) : 0;
    const paceSecPerKm = boundedTraveledM > 0 ? elapsedSeconds / (boundedTraveledM / 1000) : 0;
    const calorieFromRoute = parseNumericValue(route?.calories);
    const calculatedCalories = Math.max(0, Math.round((elapsedSeconds / 60) * 4.5));
    const calories = calorieFromRoute != null ? Math.round(calorieFromRoute) : calculatedCalories;
    const climbM = Math.max(0, Math.round(parseNumericValue(route?.totalClimb) || 0));

    return {
      routeTitle: route?.label || 'Yuruyus rotasi',
      routeType: route?.type || 'balanced',
      completionRatio,
      plannedDistanceM,
      traveledDistanceM: boundedTraveledM,
      remainingDistanceM: Math.max(0, plannedDistanceM - boundedTraveledM),
      elapsedSeconds,
      avgSpeedKmh,
      paceSecPerKm,
      calories,
      climbM,
      rerouteCount,
      maxOffRouteDistanceM,
      progressPercent: Math.round(completionRatio * 100),
      startedAt: sessionStartAt,
      finishedAt: new Date().toISOString(),
      startPoint,
      endPoint,
      elevationSeries,
      instruction: currentInstruction,
    };
  }, [
    route,
    routeAnalysis.totalM,
    currentProgressM,
    elapsedTime,
    rerouteCount,
    maxOffRouteDistanceM,
    sessionStartAt,
    startPoint,
    endPoint,
    elevationSeries,
    currentInstruction,
  ]);

  const resetSessionState = () => {
    setElapsedTime(0);
    setIsPaused(false);
    setIs3DMode(false);
    setShowFullMap(false);
    setIsSummaryCollapsed(false);
    panelTranslateY.setValue(0);
    setCurrentProgressM(0);
    setIsOffRoute(false);
    setIsRerouting(false);
    setOffRouteDistanceM(0);
    setMaxOffRouteDistanceM(0);
    setRerouteCount(0);
    setSessionStartAt(null);
    offRouteHitsRef.current = 0;
    lastRerouteAtRef.current = 0;
  };

  const handleDismissNavigation = () => {
    resetSessionState();
    if (onClose) onClose();
  };

  const handleFinishNavigation = () => {
    const summary = buildSessionSummary();
    resetSessionState();
    if (onClose) {
      onClose({
        showSummary: true,
        summary,
      });
    }
  };

  const collapseSummaryPanel = useCallback(() => {
    setIsSummaryCollapsed(true);
    Animated.spring(panelTranslateY, {
      toValue: panelCollapseDistance,
      useNativeDriver: true,
      bounciness: 0,
      speed: 18,
    }).start();
  }, [panelTranslateY, panelCollapseDistance]);

  const expandSummaryPanel = useCallback(() => {
    setIsSummaryCollapsed(false);
    Animated.spring(panelTranslateY, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 0,
      speed: 18,
    }).start();
  }, [panelTranslateY]);

  const summaryPanResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onStartShouldSetPanResponderCapture: () => false,
    onMoveShouldSetPanResponder: (_, gesture) => (
      !isSummaryCollapsed
      && Math.abs(gesture.dy) > 3
      && Math.abs(gesture.dy) > Math.abs(gesture.dx) * 0.75
    ),
    onMoveShouldSetPanResponderCapture: (_, gesture) => (
      !isSummaryCollapsed
      && Math.abs(gesture.dy) > 4
      && Math.abs(gesture.dy) > Math.abs(gesture.dx) * 0.75
    ),
    onPanResponderMove: (_, gesture) => {
      const next = Math.max(0, Math.min(panelCollapseDistance, gesture.dy));
      panelTranslateY.setValue(next);
    },
    onPanResponderRelease: (_, gesture) => {
      if (gesture.dy > 90 || gesture.vy > 0.9) {
        collapseSummaryPanel();
        return;
      }
      expandSummaryPanel();
    },
    onPanResponderTerminate: () => {
      expandSummaryPanel();
    },
    onPanResponderTerminationRequest: () => true,
  }), [isSummaryCollapsed, panelTranslateY, panelCollapseDistance, collapseSummaryPanel, expandSummaryPanel]);

  const indicatorPanResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => isSummaryCollapsed,
    onMoveShouldSetPanResponder: (_, gesture) => (
      isSummaryCollapsed
      && Math.abs(gesture.dy) > 4
      && Math.abs(gesture.dy) > Math.abs(gesture.dx)
    ),
    onPanResponderMove: (_, gesture) => {
      if (gesture.dy < 0) {
        const next = Math.max(0, panelCollapseDistance + gesture.dy);
        panelTranslateY.setValue(next);
      }
    },
    onPanResponderRelease: (_, gesture) => {
      if (gesture.dy < -24 || gesture.vy < -0.5) {
        expandSummaryPanel();
      } else {
        collapseSummaryPanel();
      }
    },
    onPanResponderTerminate: () => {
      collapseSummaryPanel();
    },
  }), [isSummaryCollapsed, panelTranslateY, panelCollapseDistance, expandSummaryPanel, collapseSummaryPanel]);

  const handleSummaryScrollEnd = useCallback((event) => {
    const offsetX = event?.nativeEvent?.contentOffset?.x || 0;
    const page = Math.round(offsetX / Math.max(1, summaryPagerWidth));
    setSummaryPage(Math.max(0, Math.min(summaryPageCount - 1, page)));
  }, [summaryPagerWidth, summaryPageCount]);

  useEffect(() => {
    if (!visible || !isMapReady || !mapRef.current || initialFitDoneRef.current) return;
    const hasUser = !!(userLocation && Number.isFinite(userLocation.latitude) && Number.isFinite(userLocation.longitude));
    const hasRoute = routeCoords.length > 1;
    const hasStart = !!(startPoint && Number.isFinite(startPoint.latitude) && Number.isFinite(startPoint.longitude));
    if (!hasUser && !hasRoute && !hasStart) return;

    if (fitTimeoutRef.current) {
      clearTimeout(fitTimeoutRef.current);
      fitTimeoutRef.current = null;
    }

    fitTimeoutRef.current = setTimeout(() => {
      if (!mapRef.current || initialFitDoneRef.current) return;

      if (hasUser) {
        // En başta rotanın tamamını göstermek yerine sadece kullanıcıya yakın (3D, zoom: 19.5, pitch: 60) şekilde göster.
        mapRef.current.animateCamera({
          center: { latitude: userLocation.latitude, longitude: userLocation.longitude },
          pitch: 60,
          heading: heading || 0,
          zoom: 19.5,
          altitude: 400,
        }, { duration: 600 });
      } else if (hasRoute) {
        // Eğer user location ulaşılamadıysa ama rota varsa başa odaklan
        mapRef.current.animateCamera({
          center: startPoint || routeCoords[0],
          pitch: 60,
          heading: heading || 0,
          zoom: 19.5,
          altitude: 400,
        }, { duration: 600 });
      }

      initialFitDoneRef.current = true;
    }, 220);

    return () => {
      if (fitTimeoutRef.current) {
        clearTimeout(fitTimeoutRef.current);
        fitTimeoutRef.current = null;
      }
    };
  }, [
    visible,
    isMapReady,
    routeCoords,
    userLocation,
    endPoint,
    startPoint,
  ]);

  useEffect(() => {
    if (!visible || !userLocation || routeCoords.length < 2 || isPaused) return;
    let bestDist = Number.POSITIVE_INFINITY;
    let bestProgress = 0;
    for (let i = 0; i < routeCoords.length - 1; i++) {
      const a = routeCoords[i];
      const b = routeCoords[i + 1];
      const proj = projectPointToSegment(userLocation, a, b);
      if (proj.distanceM < bestDist) {
        bestDist = proj.distanceM;
        const segLen = haversineMeters(a, b);
        const base = routeAnalysis.cumulative[i] || 0;
        bestProgress = base + segLen * proj.t;
      }
    }
    setCurrentProgressM(bestProgress);
    setOffRouteDistanceM(bestDist);
    setMaxOffRouteDistanceM((prev) => Math.max(prev, bestDist));
    const offRouteThresholdM = 35;
    const recoverThresholdM = 22;
    if (bestDist > offRouteThresholdM) {
      offRouteHitsRef.current += 1;
    } else if (bestDist < recoverThresholdM) {
      offRouteHitsRef.current = 0;
      setIsOffRoute(false);
    }
    if (offRouteHitsRef.current >= 3) {
      setIsOffRoute(true);
      const now = Date.now();
      const cooldownMs = 15000;
      if (!isRerouting && onRerouteRequest && (now - lastRerouteAtRef.current > cooldownMs)) {
        setIsRerouting(true);
        lastRerouteAtRef.current = now;
        Promise.resolve(onRerouteRequest({ latitude: userLocation.latitude, longitude: userLocation.longitude }))
          .then((rerouteApplied) => {
            if (rerouteApplied) {
              setRerouteCount((prev) => prev + 1);
            }
          })
          .finally(() => {
            setIsRerouting(false);
            offRouteHitsRef.current = 0;
          });
      }
    }
    if (userLocation.heading != null && Number.isFinite(userLocation.heading)) {
      setHeading(userLocation.heading);
    } else {
      const remaining = routeAnalysis.cumulative[routeAnalysis.cumulative.length - 1] - bestProgress;
      if (remaining > 5) {
        const next = routeCoords.find((_, idx) => (routeAnalysis.cumulative[idx] || 0) >= bestProgress);
        if (next) {
          const here = { latitude: userLocation.latitude, longitude: userLocation.longitude };
          setHeading(bearingDeg(here, next));
        }
      }
    }
  }, [visible, userLocation, routeCoords, routeAnalysis.cumulative, isPaused, isRerouting, onRerouteRequest]);

  // Center map on user location
  const centerOnUser = () => {
    if (mapRef.current && userLocation) {
      mapRef.current.animateCamera({
        center: userLocation,
        pitch: is3DMode ? 60 : 0,
        heading: heading,
        zoom: is3DMode ? 19.5 : 17,
        altitude: is3DMode ? 400 : 1000,
      }, { duration: 500 });
    }
  };

  // Toggle 3D mode
  const toggle3DMode = () => {
    const newMode = !is3DMode;
    setIs3DMode(newMode);
    if (mapRef.current && userLocation) {
      mapRef.current.animateCamera({
        center: userLocation,
        pitch: newMode ? 60 : 0,
        heading: heading,
        zoom: newMode ? 19.5 : 17,
        altitude: newMode ? 400 : 1000,
      }, { duration: 500 });
    }
  };

  // Get map region from route
  const getMapRegion = () => {
    if (userLocation) {
      return {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      };
    }
    if (startPoint) {
      return {
        latitude: startPoint.latitude,
        longitude: startPoint.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
    }
    return {
      latitude: 41.0082,
      longitude: 28.9784,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    };
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={handleDismissNavigation}
    >
      <View style={styles.container}>
        {/* 3D Map View */}
        <MapView
          ref={mapRef}
          style={[styles.map, showFullMap && styles.fullMap]}
          provider={getMapProvider()}
          onMapReady={() => setIsMapReady(true)}
          initialRegion={getMapRegion()}
          showsUserLocation={false}
          showsMyLocationButton={false}
          showsCompass={false}
          showsBuildings={true}
          showsTraffic={false}
          mapType="standard"
          pitchEnabled={true}
          rotateEnabled={true}
          scrollEnabled={true}
          zoomEnabled={true}
          initialCamera={{
            center: getMapRegion(),
            pitch: is3DMode ? 60 : 0,
            heading: heading,
            zoom: 18,
            altitude: 1000,
          }}
        >
          {/* User Location Marker */}
          {userLocation && (
            <Marker
              coordinate={userLocation}
              anchor={{ x: 0.5, y: 0.5 }}
              flat={true}
              rotation={heading}
            >
              <UserLocationMarker />
            </Marker>
          )}

          {/* Destination Marker */}
          {endPoint && (
            <Marker
              coordinate={endPoint}
              anchor={{ x: 0.5, y: 0.9 }}
            >
              <DestinationMarker />
            </Marker>
          )}

          {/* Route Polyline */}
          {routeCoords.length > 1 && (
            <>
              <Polyline
                coordinates={routeCoords}
                strokeColor="rgba(255,255,255,0.88)"
                strokeWidth={10}
                lineCap="round"
                lineJoin="round"
              />
              <Polyline
                coordinates={routeCoords}
                strokeColor={route.color || Colors.primaryDark || Colors.primary}
                strokeWidth={6}
                lineCap="round"
                lineJoin="round"
              />
            </>
          )}
        </MapView>

        {/* Map Controls Overlay */}
        <View style={styles.mapControlsContainer}>
          <SafeAreaView edges={['top']} style={styles.topControlsSafe}>
            {/* Top Bar */}
            <View style={styles.topBar}>
              <TouchableOpacity onPress={handleDismissNavigation} style={styles.controlButton}>
                <Ionicons name="close" size={22} color="#333" />
              </TouchableOpacity>
              
              <View style={styles.timerContainer}>
                <Ionicons name="time-outline" size={16} color={Colors.primary} />
                <Text style={styles.timerText}>{formatTime(elapsedTime)}</Text>
              </View>
              
              <TouchableOpacity 
                style={styles.controlButton}
                onPress={() => setIsPaused(!isPaused)}
              >
                <Ionicons name={isPaused ? "play" : "pause"} size={22} color="#333" />
              </TouchableOpacity>
            </View>
          </SafeAreaView>

          {/* Map Action Buttons */}
          <View style={styles.mapActionButtons}>
            <TouchableOpacity 
              style={[styles.mapActionButton, is3DMode && styles.mapActionButtonActive]}
              onPress={toggle3DMode}
            >
              <Ionicons name="cube-outline" size={22} color={is3DMode ? "#FFF" : "#333"} />
              <Text style={[styles.mapActionText, is3DMode && styles.mapActionTextActive]}>3D</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.mapActionButton}
              onPress={centerOnUser}
            >
              <Ionicons name="locate" size={22} color="#333" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.mapActionButton}
              onPress={() => setShowFullMap(!showFullMap)}
            >
              <Ionicons name={showFullMap ? "contract" : "expand"} size={22} color="#333" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Bottom Navigation Panel */}
        {!showFullMap && (
          <>
          <Animated.View
            style={[styles.bottomPanel, { transform: [{ translateY: panelTranslateY }] }]}
            onLayout={(event) => {
              const nextHeight = event.nativeEvent.layout.height;
              if (nextHeight && Math.abs(nextHeight - panelHeight) > 2) {
                setPanelHeight(nextHeight);
              }
            }}
            pointerEvents={isSummaryCollapsed ? 'none' : 'auto'}
          >
            <View {...summaryPanResponder.panHandlers}>
              <View style={styles.panelGrabberTouch}>
                <View style={styles.panelGrabber} />
              </View>

              <View style={styles.panelHeaderRow}>
                <View style={styles.panelLiveBadge}>
                  <View style={styles.panelLiveDot} />
                  <Text style={styles.panelLiveText}>Canli navigasyon</Text>
                </View>
                <View style={styles.panelProgressBadge}>
                  <Ionicons name="walk" size={12} color={Colors.primaryDark || Colors.primary} />
                  <Text style={styles.panelProgressText}>{Math.round(progressRatio * 100)}%</Text>
                </View>
              </View>

              <View style={styles.heroRowCompact}>
                <View style={styles.directionIconPillCompact}>
                  <View style={styles.directionIconBgCompact}>
                    <Ionicons
                      name={getDirectionIcon(currentInstruction.action)}
                      size={32}
                      color="#FFF"
                    />
                  </View>
                </View>
                <View style={styles.heroCopyWrap}>
                  <Text style={styles.directionDistanceCompact}>{currentInstruction.distance}</Text>
                  <Text style={styles.directionTextCompact} numberOfLines={1}>
                    {currentInstruction.street ? currentInstruction.street : currentInstruction.text}
                  </Text>
                </View>
              </View>
            </View>

            <View
              style={styles.summarySliderWrap}
              onLayout={(event) => {
                const w = event.nativeEvent.layout.width;
                if (w && Math.abs(w - summaryPagerWidth) > 2) {
                  setSummaryPagerWidth(w);
                }
              }}
            >
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                decelerationRate="fast"
                bounces={false}
                directionalLockEnabled
                nestedScrollEnabled
                onMomentumScrollEnd={handleSummaryScrollEnd}
                contentContainerStyle={styles.summarySlidesContent}
              >
                <View style={[styles.summarySlide, { width: summaryPagerWidth }]}>
                  <View style={styles.summarySlideHeader}>
                    <Text style={styles.summarySlideTitle}>Rota Ozeti</Text>
                    <View style={styles.summarySlideBadge}>
                      <Text style={styles.summarySlideBadgeText}>01</Text>
                    </View>
                  </View>
                  <View style={styles.clusterGrid}>
                    <View style={styles.clusterItem}>
                      <Text style={styles.clusterLabel}>Toplam</Text>
                      <Text style={styles.clusterValue}>{navigationData.totalDistance}</Text>
                    </View>
                    <View style={styles.clusterItem}>
                      <Text style={styles.clusterLabel}>Kalan Sure</Text>
                      <Text style={styles.clusterValue}>{navigationData.estimatedTime}</Text>
                    </View>
                    <View style={styles.clusterItem}>
                      <Text style={styles.clusterLabel}>Tirmanis</Text>
                      <Text style={styles.clusterValue}>{navigationData.totalClimb}</Text>
                    </View>
                    <View style={styles.clusterItem}>
                      <Text style={styles.clusterLabel}>Ilerleme</Text>
                      <Text style={styles.clusterValue}>{Math.round(progressRatio * 100)}%</Text>
                    </View>
                  </View>

                  <View style={styles.progressContainerCompact}>
                    <View style={styles.progressBar}>
                      <Animated.View 
                        style={[
                          styles.progressFill,
                          { 
                            width: progressAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: ['0%', '100%']
                            })
                          }
                        ]} 
                      />
                    </View>
                    <View style={styles.progressLabelsCompact}>
                      <Text style={styles.progressText}>{fmtDistance(currentProgressM)}</Text>
                      <Text style={styles.progressText}>{navigationData.totalDistance}</Text>
                    </View>
                  </View>
                </View>

                <View style={[styles.summarySlide, { width: summaryPagerWidth }]}>
                  <View style={styles.summarySlideHeader}>
                    <Text style={styles.summarySlideTitle}>Yukseklik Profili</Text>
                    <View style={styles.summarySlideBadge}>
                      <Text style={styles.summarySlideBadgeText}>02</Text>
                    </View>
                  </View>
                  <View style={styles.profileCardCompact}>
                    <View style={styles.profileTopRowCompact}>
                      <View>
                        <Text style={styles.profileDistanceText}>{navigationData.totalDistance}</Text>
                        <Text style={styles.profileElevationText}>{navigationData.totalClimb}</Text>
                      </View>
                      <TouchableOpacity style={styles.profilePauseButton} onPress={() => setIsPaused(!isPaused)}>
                        <Ionicons name={isPaused ? 'play' : 'pause'} size={15} color="#0F1A2B" />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.chartWrapCompact}>
                      <Svg width={compactChartWidth} height={48}>
                        <Path d={compactChartAreaPath} fill="rgba(78,205,196,0.14)" />
                        <Path d={compactChartPathData} stroke={Colors.primaryDark} strokeWidth={2} fill="none" />
                      </Svg>
                    </View>

                    <View style={styles.chartLabelsRow}>
                      <Text style={styles.chartLabel}>0.0 km</Text>
                      <Text style={styles.chartLabel}>{chartMidLabel}</Text>
                      <Text style={styles.chartLabel}>{chartEndLabel}</Text>
                    </View>
                  </View>
                </View>

                <View style={[styles.summarySlide, { width: summaryPagerWidth }]}>
                  <View style={styles.summarySlideHeader}>
                    <Text style={styles.summarySlideTitle}>Canli Durum</Text>
                    <View style={styles.summarySlideBadge}>
                      <Text style={styles.summarySlideBadgeText}>03</Text>
                    </View>
                  </View>
                  <View style={styles.clusterGrid}>
                    <View style={styles.clusterItem}>
                      <Text style={styles.clusterLabel}>Hiz</Text>
                      <Text style={styles.clusterValue}>{navigationData.currentSpeed}</Text>
                    </View>
                    <View style={styles.clusterItem}>
                      <Text style={styles.clusterLabel}>Kalori</Text>
                      <Text style={styles.clusterValue}>{route?.calories || `${Math.floor(elapsedTime * 0.1)} kcal`}</Text>
                    </View>
                    <View style={styles.clusterItem}>
                      <Text style={styles.clusterLabel}>Gecen Sure</Text>
                      <Text style={styles.clusterValue}>{formatTime(elapsedTime)}</Text>
                    </View>
                    <View style={styles.clusterItem}>
                      <Text style={styles.clusterLabel}>Durum</Text>
                      <Text style={[styles.clusterValue, isOffRoute ? styles.clusterValueWarn : null]}>
                        {isRerouting ? 'Yeniden rota' : (isOffRoute ? 'Rota disi' : 'Rota ustunde')}
                      </Text>
                    </View>
                  </View>

                  {(isOffRoute || isRerouting) && (
                    <View style={styles.warningCardCompact}>
                      <Ionicons name={isRerouting ? 'sync' : 'warning'} size={14} color="#FFF" />
                      <Text style={styles.warningCompactText}>
                        {isRerouting ? 'Rota yeniden hesaplaniyor...' : `Rotadan ${Math.round(offRouteDistanceM)}m uzaktasiniz`}
                      </Text>
                    </View>
                  )}
                </View>
              </ScrollView>

              <View style={styles.summaryDotsRow}>
                {[...Array(summaryPageCount)].map((_, index) => (
                  <View
                    key={`dot-${index}`}
                    style={[styles.summaryDot, summaryPage === index && styles.summaryDotActive]}
                  />
                ))}
              </View>
            </View>

            <View style={styles.bottomActionsCompact} {...summaryPanResponder.panHandlers}>
              <TouchableOpacity style={styles.actionButtonCompact}>
                <Ionicons name="volume-high" size={20} color="#475569" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButtonCompact} onPress={() => setShowFullMap(!showFullMap)}>
                <Ionicons name="expand" size={20} color="#475569" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.endButtonCompact} onPress={handleFinishNavigation}>
                <Ionicons name="flag" size={18} color="#FFF" />
                <Text style={styles.endButtonTextCompact}>Rotayı Bitir</Text>
              </TouchableOpacity>
            </View>

          </Animated.View>

          {isSummaryCollapsed && (
            <View style={styles.summaryIndicatorWrap} {...indicatorPanResponder.panHandlers}>
              <TouchableOpacity
                style={styles.summaryIndicatorButton}
                onPress={expandSummaryPanel}
                activeOpacity={0.9}
              >
                <View style={styles.summaryIndicatorLine} />
                <Text style={styles.summaryIndicatorText}>Ozeti Ac</Text>
              </TouchableOpacity>
            </View>
          )}
          </>
        )}

        {/* Minimal Bottom Bar for Full Map Mode */}
        {showFullMap && (
          <View style={styles.minimalBottomBar}>
            <View style={styles.minimalDirection}>
              <View style={styles.minimalDirectionIcon}>
                <Ionicons
                  name={getDirectionIcon(currentInstruction.action)}
                  size={24}
                  color="#FFF"
                />
              </View>
              <View>
                <Text style={styles.minimalDistanceText}>{currentInstruction.distance}</Text>
                <Text style={styles.minimalStreetText} numberOfLines={1}>{currentInstruction.street}</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.minimalEndButton}
              onPress={handleFinishNavigation}
            >
              <Ionicons name="flag" size={18} color="#FFF" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  fullMap: {
    height: SCREEN_HEIGHT,
  },
  
  // User Location Marker
  userMarkerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 50,
    height: 50,
  },
  userMarkerPulse: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(78, 205, 196, 0.3)',
  },
  userMarkerDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  destinationContainer: {
    alignItems: 'center',
  },

  // Map Controls
  mapControlsContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  topControlsSafe: {
    backgroundColor: 'transparent',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  controlButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 22,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  timerText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A2E',
  },

  // Map Action Buttons
  mapActionButtons: {
    position: 'absolute',
    right: 16,
    top: SCREEN_HEIGHT * 0.17,
    gap: 10,
  },
  mapActionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  mapActionButtonActive: {
    backgroundColor: Colors.primary,
  },
  mapActionText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#333',
    marginTop: 2,
  },
  mapActionTextActive: {
    color: '#FFF',
  },

  // Bottom Panel
  bottomPanel: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 24 : 16,
    left: 14,
    right: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 20 : 16,
    paddingHorizontal: 14,
    maxHeight: Math.round(SCREEN_HEIGHT * 0.48), 
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 30,
    elevation: 20,
  },
  summaryIndicatorWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: Platform.OS === 'ios' ? 20 : 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryIndicatorButton: {
    minWidth: 92,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.93)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 10,
    elevation: 8,
    gap: 4,
  },
  summaryIndicatorLine: {
    width: 28,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#B8C3D1',
  },
  summaryIndicatorText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2A3F57',
    letterSpacing: 0.2,
  },
  panelGrabber: {
    width: 48,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#E2E8F0',
    alignSelf: 'center',
    marginBottom: 8,
  },
  panelGrabberTouch: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 2,
  },
  panelHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  panelLiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#DEF7EC',
  },
  panelLiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#059669',
  },
  panelLiveText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.1,
    color: '#047857',
  },
  panelProgressBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  panelProgressText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  heroRowCompact: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 4,
    gap: 12,
  },
  heroCopyWrap: {
    flex: 1,
    justifyContent: 'center',
  },
  directionDistanceCompact: {
    fontSize: 24,
    fontWeight: '900',
    color: '#111827',
    letterSpacing: -0.5,
  },
  directionTextCompact: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 0,
  },
  streetNameCompact: {
    fontSize: 12,
    color: '#73869A',
    marginTop: 1,
    maxWidth: SCREEN_WIDTH * 0.56,
  },
  directionIconPillCompact: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  directionIconBgCompact: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  summarySliderWrap: {
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    paddingTop: 10,
    paddingBottom: 6,
    marginBottom: 8,
    overflow: 'hidden',
  },
  summarySlidesContent: {
    alignItems: 'stretch',
  },
  summarySlide: {
    paddingHorizontal: 10,
  },
  summarySlideHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  summarySlideTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 0.3,
  },
  summarySlideBadge: {
    minWidth: 26,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 8,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summarySlideBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#334155',
  },
  clusterGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 6,
    marginBottom: 8,
  },
  clusterItem: {
    width: '48%',
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    paddingHorizontal: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  clusterLabel: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  clusterValue: {
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '800',
    marginTop: 3,
  },
  clusterValueWarn: {
    color: '#C55A2A',
  },
  progressContainerCompact: {
    marginTop: 2,
  },
  progressLabelsCompact: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 5,
  },
  profileCardCompact: {
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5ECF3',
    padding: 8,
  },
  profileTopRowCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  chartWrapCompact: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  summaryDotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 3,
    marginBottom: 1,
    gap: 6,
  },
  summaryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#C6D2DF',
  },
  summaryDotActive: {
    width: 14,
    borderRadius: 4,
    backgroundColor: Colors.primaryDark,
  },
  warningCardCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderRadius: 10,
    paddingVertical: 7,
    paddingHorizontal: 9,
    backgroundColor: '#FF9447',
    marginTop: 2,
  },
  warningCompactText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  bottomActionsCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 2,
    marginBottom: 4,
  },
  actionButtonCompact: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  endButtonCompact: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EF4444',
    height: 44,
    borderRadius: 22,
    gap: 6,
  },
  endButtonTextCompact: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  heroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  directionIconPill: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: '#F2F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Direction Card
  directionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  directionIconWrapper: {
    marginRight: 16,
  },
  directionIconBg: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  directionInfo: {
    flex: 1,
  },
  directionDistance: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0F1A2B',
  },
  directionText: {
    fontSize: 14,
    color: '#4D6178',
    marginTop: 2,
  },
  streetName: {
    fontSize: 12,
    color: '#73869A',
    marginTop: 2,
  },
  profileCard: {
    borderRadius: 18,
    backgroundColor: '#F7FAFD',
    borderWidth: 1,
    borderColor: '#E0E7F0',
    padding: 12,
    marginBottom: 10,
  },
  profileTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  profileDistanceText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F1A2B',
  },
  profileElevationText: {
    fontSize: 13,
    color: '#5E7288',
    marginTop: 2,
  },
  profilePauseButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EAF0F7',
  },
  chartWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 3,
  },
  chartLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  chartLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#7A8B9D',
  },

  // Progress
  progressContainer: {
    marginBottom: 10,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#E3EAF3',
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 999,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  progressText: {
    fontSize: 11,
    color: '#74869A',
    fontWeight: '500',
  },

  // Warning Card
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E7',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#FFE4B3',
  },
  warningIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FFB347',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  warningContent: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 12,
    color: '#666',
  },
  warningValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A2E',
  },

  // Stats Row
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#F4F8FC',
    borderRadius: 14,
    paddingVertical: 10,
    marginBottom: 10,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F344A',
  },
  statDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#E0E0E0',
  },

  quickTabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  quickTab: {
    fontSize: 12,
    color: '#708296',
    fontWeight: '600',
  },
  quickTabActive: {
    backgroundColor: '#243A52',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  quickTabActiveText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  // Bottom Actions
  bottomActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  actionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EEF3F8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  endButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
  },
  endButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFF',
  },

  // Minimal Bottom Bar (Full Map Mode)
  minimalBottomBar: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 34 : 20,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF',
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  minimalDirection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  minimalDirectionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  minimalDistanceText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A2E',
  },
  minimalStreetText: {
    fontSize: 13,
    color: '#666',
  },
  minimalEndButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FF6B6B',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
