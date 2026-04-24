import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Linking, Platform } from 'react-native';
import { Pedometer } from 'expo-sensors';

/** Yaklaşık yürüyüş: kcal (adım başına, literatür aralığına yakın). */
function estimateKcalFromSteps(steps) {
  return Math.round(Math.max(0, steps) * 0.044);
}

/** Yaklaşık mesafe (m → km), ~0,78 m/adım. */
function estimateDistanceKmFromSteps(steps) {
  return Math.round((Math.max(0, steps) * 0.00078) * 10) / 10;
}

/** Yaklaşık aktif yürüyüş süresi (dk), ~100 adım/dk. */
function estimateActiveMinutesFromSteps(steps) {
  return Math.max(0, Math.round(Math.max(0, steps) / 100));
}

function startOfLocalDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/**
 * Telefonun hareket / adım verisini okur (backend yok).
 * - iOS: Bugünkü adım sayısı (Core Motion; Sağlık uygulamasıyla aynı kaynaklara dayanır).
 * - Android: Expo henüz günlük tarih aralığı vermediği için oturum adımı (uygulama ön plandayken sensör).
 */
export function useDailyActivityFromDevice(stepGoal = 10000) {
  const [loading, setLoading] = useState(true);
  const [permissionDenied, setPermissionDenied] = useState(false);
  /** iOS: bir kez reddedildiyse requestPermissions tekrar pencere açmaz; Ayarlar gerekir. */
  const [permissionCanAskAgain, setPermissionCanAskAgain] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  /** 'today' | 'session' */
  const [mode, setMode] = useState('today');
  const [steps, setSteps] = useState(0);
  const sessionSubRef = useRef(null);
  const refreshInFlightRef = useRef(false);
  const lastRefreshAtRef = useRef(0);
  const appStateRef = useRef(AppState.currentState);
  const hasResolvedOnceRef = useRef(false);

  const clearSessionSubscription = useCallback(() => {
    if (sessionSubRef.current) {
      sessionSubRef.current.remove();
      sessionSubRef.current = null;
    }
  }, []);

  const loadTodayIos = useCallback(async () => {
    const end = new Date();
    const start = startOfLocalDay(end);
    const result = await Pedometer.getStepCountAsync(start, end);
    const n = typeof result?.steps === 'number' ? result.steps : 0;
    setSteps(Math.max(0, n));
    setMode('today');
  }, []);

  const openSystemSettings = useCallback(async () => {
    try {
      await Linking.openSettings();
    } catch {
      // bazı ortamlarda app-settings kullanılabilir
      if (Platform.OS === 'ios') {
        try {
          await Linking.openURL('app-settings:');
        } catch {
          /* ignore */
        }
      }
    }
  }, []);

  const refresh = useCallback(async ({ force = false } = {}) => {
    if (refreshInFlightRef.current) return;
    const now = Date.now();
    if (!force && now - lastRefreshAtRef.current < 10_000) return;
    refreshInFlightRef.current = true;
    if (!hasResolvedOnceRef.current) {
      setLoading(true);
    }

    try {
      const available = await Pedometer.isAvailableAsync();
      if (!available) {
        setUnavailable(true);
        setPermissionDenied(false);
        setSteps(0);
        return;
      }

      const perm = await Pedometer.getPermissionsAsync();
      let granted = perm.granted;
      setPermissionCanAskAgain(perm.canAskAgain !== false);
      if (!granted && Platform.OS === 'ios') {
        const req = await Pedometer.requestPermissionsAsync();
        granted = req.granted;
        setPermissionCanAskAgain(req.canAskAgain !== false);
      }
      if (!granted) {
        if (Platform.OS === 'android') {
          // Android'de otomatik izin isteme döngüsü stabilite sorunlarına yol açabildiği için
          // kullanıcıyı doğrudan sistem ayarlarına yönlendiriyoruz.
          setPermissionCanAskAgain(false);
        }
        setPermissionDenied(true);
        setUnavailable(false);
        setSteps(0);
        return;
      }
      setPermissionDenied(false);
      setUnavailable(false);

      if (Platform.OS === 'ios') {
        clearSessionSubscription();
        await loadTodayIos();
      } else {
        const end = new Date();
        const start = startOfLocalDay(end);
        const result = await Pedometer.getStepCountAsync(start, end);
        const n = typeof result?.steps === 'number' ? result.steps : 0;
        setSteps(Math.max(0, n));
        setMode('today');
      }
    } catch {
      setUnavailable(true);
      setPermissionDenied(false);
      setMode('today');
    } finally {
      lastRefreshAtRef.current = Date.now();
      refreshInFlightRef.current = false;
      hasResolvedOnceRef.current = true;
      setLoading(false);
    }
  }, [clearSessionSubscription, loadTodayIos]);

  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  useEffect(() => {
    void refreshRef.current({ force: true });
    return () => clearSessionSubscription();
  }, [clearSessionSubscription]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      const prevState = appStateRef.current;
      appStateRef.current = state;
      if (/inactive|background/.test(prevState) && state === 'active') {
        void refreshRef.current();
      }
    });
    return () => sub.remove();
  }, []);

  const kcal = estimateKcalFromSteps(steps);
  const distanceKm = estimateDistanceKmFromSteps(steps);
  const activeMin = estimateActiveMinutesFromSteps(steps);
  const progressRatio = stepGoal > 0 ? Math.min(1, steps / stepGoal) : 0;

  const sourceLabel =
    Platform.OS === 'ios'
      ? 'Kaynak: Apple Hareket ve Fitness (bugün)'
      : mode === 'today'
        ? 'Kaynak: cihaz (bugün)'
        : 'Kaynak: cihaz adım sensörü (uygulama açıkken, yaklaşık)';

  return {
    loading,
    permissionDenied,
    permissionCanAskAgain,
    unavailable,
    mode,
    steps,
    kcal,
    distanceKm,
    activeMin,
    stepGoal,
    progressRatio,
    sourceLabel,
    refresh,
    openSystemSettings,
  };
}
