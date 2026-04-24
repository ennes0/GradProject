import { Platform } from 'react-native';
import { Pedometer } from 'expo-sensors';

function pad2(n) {
  return String(n).padStart(2, '0');
}

export function formatLocalYmd(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function startOfLocalDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfLocalDay(d) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function estimatesFromSteps(steps) {
  const s = Math.max(0, Math.round(steps));
  return {
    distanceKm: Math.round(s * 0.00078 * 10) / 10,
    caloriesKcal: Math.round(s * 0.044 * 10) / 10,
    walkMinutes: Math.max(0, Math.round(s / 100)),
  };
}

/**
 * Backend POST /api/auth/me/health/daily-sync için en fazla 7 gün.
 * @param {{ stepsToday: number, mode: 'today'|'session' }} params
 */
export async function buildDailySnapshotsForSync(params) {
  const { stepsToday, mode } = params;
  const now = new Date();
  const days = [];

  if (Platform.OS === 'ios') {
    for (let i = 0; i < 7; i += 1) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const start = startOfLocalDay(d);
      const end = i === 0 ? now : endOfLocalDay(d);
      let steps = 0;
      try {
        const r = await Pedometer.getStepCountAsync(start, end);
        steps = Math.max(0, Math.round(r?.steps ?? 0));
      } catch {
        steps = 0;
      }
      const est = estimatesFromSteps(steps);
      days.push({
        date: formatLocalYmd(d),
        steps,
        distanceKm: est.distanceKm,
        caloriesKcal: est.caloriesKcal,
        walkMinutes: est.walkMinutes,
      });
    }
    return days;
  }

  // Android: tarih aralığı adımı Expo'da yok; bugünü dene, olmazsa oturum adımı.
  const d = new Date(now);
  const start = startOfLocalDay(d);
  let steps = 0;
  try {
    const r = await Pedometer.getStepCountAsync(start, now);
    steps = Math.max(0, Math.round(r?.steps ?? 0));
  } catch {
    steps = mode === 'session' ? Math.max(0, Math.round(stepsToday)) : 0;
  }
  const est = estimatesFromSteps(steps);
  days.push({
    date: formatLocalYmd(d),
    steps,
    distanceKm: est.distanceKm,
    caloriesKcal: est.caloriesKcal,
    walkMinutes: est.walkMinutes,
  });
  return days;
}
