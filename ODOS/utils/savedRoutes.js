const DEFAULT_ROUTE_IMAGE =
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400';

export function deriveCompletionStatus(completionRatio) {
  const r = Math.max(0, Math.min(1, Number(completionRatio) || 0));
  if (r >= 0.97) return 'completed';
  if (r >= 0.12) return 'partial';
  return 'abandoned';
}

function inferDifficulty(maxSlopePct) {
  if (maxSlopePct == null || !Number.isFinite(maxSlopePct)) return 'medium';
  if (maxSlopePct >= 10) return 'hard';
  if (maxSlopePct >= 5) return 'medium';
  return 'easy';
}

/** Seans özeti + isteğe bağlı notlar → POST /api/saved-routes gövdesi (sunucu rotayı yeniden hesaplamaz). */
export function buildSaveRoutePayload(summary, extras = {}) {
  if (!summary || typeof summary !== 'object') {
    throw new Error('Özet verisi yok');
  }
  const completionRatio = Math.max(0, Math.min(1, Number(summary.completionRatio) || 0));
  const polySource =
    Array.isArray(summary.fullWalkCoordinates) && summary.fullWalkCoordinates.length >= 2
      ? summary.fullWalkCoordinates
      : summary.routeCoordinates;
  const poly = (polySource || [])
    .map((p) => {
      if (!p) return null;
      const lat = typeof p.latitude === 'number' ? p.latitude : p.lat;
      const lon = typeof p.longitude === 'number' ? p.longitude : p.lon;
      return { lat, lon };
    })
    .filter((c) => c && Number.isFinite(c.lat) && Number.isFinite(c.lon));

  const status = extras.completionStatus || deriveCompletionStatus(completionRatio);
  const title = (extras.title || summary.routeTitle || 'Yürüyüş').trim().slice(0, 200);

  return {
    title,
    startLabel: summary.startLabel || null,
    endLabel: summary.endLabel || null,
    routeType: summary.routeType || null,
    difficulty: summary.difficulty || null,
    completionStatus: status,
    completionRatio,
    plannedDistanceM: summary.plannedDistanceM ?? null,
    traveledDistanceM: summary.traveledDistanceM ?? null,
    elapsedSeconds: Math.max(0, Math.round(Number(summary.elapsedSeconds) || 0)),
    avgSpeedKmh: summary.avgSpeedKmh ?? null,
    paceSecPerKm: summary.paceSecPerKm ?? null,
    caloriesKcal: summary.calories != null ? Math.round(Number(summary.calories)) : null,
    climbM: summary.climbM != null ? Math.round(Number(summary.climbM)) : null,
    rerouteCount: Math.max(0, Math.round(Number(summary.rerouteCount) || 0)),
    maxOffRouteDistanceM: summary.maxOffRouteDistanceM != null ? Number(summary.maxOffRouteDistanceM) : 0,
    avgSlopePct: summary.avgSlopePct ?? null,
    maxSlopePct: summary.maxSlopePct ?? null,
    elevationGainM:
      summary.climbM != null && Number.isFinite(Number(summary.climbM))
        ? Number(summary.climbM)
        : null,
    steps: extras.steps != null ? Math.round(Number(extras.steps)) : null,
    mood: extras.mood || null,
    weatherSummary: extras.weatherSummary || null,
    temperatureLabel: extras.temperatureLabel || null,
    notes: extras.notes != null ? String(extras.notes).trim().slice(0, 4000) || null : null,
    imageUrl: extras.imageUrl || null,
    favorite: !!extras.favorite,
    startedAt: summary.startedAt || null,
    finishedAt: summary.finishedAt || new Date().toISOString(),
    routePolyline: poly.length ? poly : null,
    elevationSeries: Array.isArray(summary.elevationSeries) ? summary.elevationSeries : null,
    sessionExtras: {
      instruction: summary.instruction || null,
      progressPercent: summary.progressPercent,
    },
  };
}

function formatRouteDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function formatRouteTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

function formatDurationHuman(seconds) {
  const s = Math.max(0, Math.round(Number(seconds) || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}s ${m}dk`;
  return `${m} dk`;
}

/**
 * Topluluk akışı öğesini (CommunityFeedItemResponse) rota detay modalı ile uyumlu karta çevirir.
 */
export function mapCommunityFeedItemToCard(item) {
  if (!item || item.routeId == null) return null;
  return mapSavedRouteListItemToCard({
    id: item.routeId,
    title: item.title,
    startLabel: item.startLabel,
    endLabel: item.endLabel,
    routeType: item.routeType,
    difficulty: item.difficulty,
    traveledDistanceM: item.traveledDistanceM,
    climbM: item.climbM,
    caloriesKcal: item.caloriesKcal,
    finishedAt: item.finishedAt,
    elapsedSeconds: 0,
    favorite: false,
  });
}

/** GET /api/saved-routes liste öğesini Rotalarım kartına çevirir. */
export function mapSavedRouteListItemToCard(route) {
  if (!route) return null;
  const traveledM = route.traveledDistanceM != null ? Number(route.traveledDistanceM) : 0;
  const distanceKm = traveledM / 1000;
  const diff = route.difficulty || inferDifficulty(route.maxSlopePct);
  const elevM =
    route.elevationGainM != null && Number.isFinite(route.elevationGainM)
      ? Math.round(route.elevationGainM)
      : route.climbM != null
        ? Math.round(Number(route.climbM))
        : 0;

  return {
    id: String(route.id),
    serverId: route.id,
    name: route.title || 'Yürüyüş',
    startLocation: route.startLabel || 'Başlangıç',
    endLocation: route.endLabel || 'Hedef',
    date: formatRouteDate(route.finishedAt),
    time: formatRouteTime(route.finishedAt),
    distance: `${distanceKm.toFixed(1)} km`,
    duration: formatDurationHuman(route.elapsedSeconds),
    calories: route.caloriesKcal != null ? Math.round(Number(route.caloriesKcal)) : 0,
    steps: route.steps != null ? Math.round(Number(route.steps)) : 0,
    avgSpeed:
      route.avgSpeedKmh != null && Number.isFinite(route.avgSpeedKmh)
        ? `${Number(route.avgSpeedKmh).toFixed(1)} km/h`
        : '—',
    difficulty: diff,
    maxSlope:
      route.maxSlopePct != null && Number.isFinite(route.maxSlopePct)
        ? `${Math.round(route.maxSlopePct)}%`
        : '—',
    avgSlope:
      route.avgSlopePct != null && Number.isFinite(route.avgSlopePct)
        ? `${Number(route.avgSlopePct).toFixed(1)}%`
        : '—',
    elevationGain: elevM > 0 ? `${elevM} m` : '—',
    image: route.imageUrl || DEFAULT_ROUTE_IMAGE,
    weather: route.weatherSummary || '—',
    temperature: route.temperatureLabel || '—',
    mood: route.mood || 'good',
    notes: route.notes || '',
    completionStatus: route.completionStatus,
    completionRatio: route.completionRatio,
    isFavorite: !!route.favorite,
    elapsedSeconds: route.elapsedSeconds != null ? Math.round(Number(route.elapsedSeconds)) : undefined,
    finishedAtIso: route.finishedAt || null,
    _raw: route,
  };
}

const MAX_CHART_POINTS = 20;

function downsampleSeries(values, maxPts) {
  if (!Array.isArray(values) || values.length <= maxPts) return values || [];
  const step = Math.ceil(values.length / maxPts);
  const out = [];
  for (let i = 0; i < values.length; i += step) {
    out.push(values[i]);
  }
  const last = values[values.length - 1];
  if (out[out.length - 1] !== last) out.push(last);
  return out;
}

/** Sunucu GET detayındaki elevationSeriesJson → sayı dizisi (graf için seyrekleştirilmiş). */
export function parseElevationSeriesFromDetail(detail) {
  if (!detail) return null;
  const raw = detail.elevationSeriesJson;
  if (raw == null) return null;
  try {
    const arr = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!Array.isArray(arr) || arr.length < 2) return null;
    const nums = arr.map((x) => Number(x)).filter((n) => Number.isFinite(n));
    if (nums.length < 2) return null;
    return downsampleSeries(nums, MAX_CHART_POINTS);
  } catch {
    return null;
  }
}

/** GET /api/saved-routes/:id yanıtını kart + graf alanlarına birleştirir. */
export function mergeSavedRouteDetailIntoCard(card, detail) {
  if (!card) return null;
  if (!detail) return card;
  const elevationSeries = parseElevationSeriesFromDetail(detail);
  const kcal = detail.caloriesKcal != null ? Math.round(Number(detail.caloriesKcal)) : card.calories;
  const steps = detail.steps != null ? Math.round(Number(detail.steps)) : card.steps;
  const avgKmh =
    detail.avgSpeedKmh != null && Number.isFinite(detail.avgSpeedKmh)
      ? Number(detail.avgSpeedKmh)
      : null;
  return {
    ...card,
    elevationSeries: elevationSeries || card.elevationSeries,
    calories: kcal,
    steps,
    notes: detail.notes != null ? detail.notes : card.notes,
    completionStatus: detail.completionStatus || card.completionStatus,
    completionRatio: detail.completionRatio != null ? detail.completionRatio : card.completionRatio,
    elapsedSeconds: detail.elapsedSeconds != null ? detail.elapsedSeconds : card.elapsedSeconds,
    avgSpeedKmh: avgKmh != null ? avgKmh : card.avgSpeedKmh,
    avgSpeed: avgKmh != null ? `${avgKmh.toFixed(1)} km/h` : card.avgSpeed,
    duration:
      detail.elapsedSeconds != null
        ? formatDurationHuman(detail.elapsedSeconds)
        : card.duration,
    rerouteCount: detail.rerouteCount != null ? detail.rerouteCount : card.rerouteCount,
    maxOffRouteDistanceM:
      detail.maxOffRouteDistanceM != null ? detail.maxOffRouteDistanceM : card.maxOffRouteDistanceM,
    _detail: detail,
  };
}

export function computeWeekDistanceKm(routes) {
  if (!Array.isArray(routes)) return 0;
  const now = Date.now();
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  let km = 0;
  for (const r of routes) {
    const t = r?.finishedAt ? new Date(r.finishedAt).getTime() : 0;
    if (!t || now - t > weekMs) continue;
    const m = r.traveledDistanceM != null ? Number(r.traveledDistanceM) : 0;
    km += m / 1000;
  }
  return km;
}
