/* ------------------------------------------------------------------
   RailRadar API client
   Docs: https://railradar.in/docs
   Free plan: 100 requests/month. Every response is cached in
   localStorage so repeated views don't burn quota.
------------------------------------------------------------------- */

const API_BASE = import.meta.env.VITE_RAILRADAR_API_BASE ?? "https://api.railradar.in/v1";
const API_KEY = import.meta.env.VITE_RAILRADAR_API_KEY ?? "";

/* The Cloudflare build proxies RailRadar through /api/railradar, so live mode
   works without shipping the key to the browser. Direct mode still supports a
   VITE_ key for local development. */
const PROXY_MODE = API_BASE.startsWith("/api/railradar");

export const HAS_API_KEY = Boolean(API_KEY) || PROXY_MODE;

export class RailRadarError extends Error {
  code: string;
  status: number;

  constructor(message: string, code = "UNKNOWN", status = 0) {
    super(message);
    this.name = "RailRadarError";
    this.code = code;
    this.status = status;
  }
}

/* ---------------- types (only the fields we use) ---------------- */

export interface StationRef {
  code: string;
  name: string;
}

export interface TrainBetween {
  train: {
    number: string;
    name: string;
    type?: string;
    runDays?: string[];
    runningDaysBitmap?: number;
  };
  from: {
    code: string;
    name: string;
    city?: string | null;
    departure: string;
    day: number;
    sequence: number;
  };
  to: {
    code: string;
    name: string;
    city?: string | null;
    arrival: string;
    day: number;
    sequence: number;
  };
  distance: number;
  duration: number;
  totalHaltsBetween: number;
}

export interface TrainsBetweenData {
  from: StationRef;
  to: StationRef;
  trains: TrainBetween[];
  count: number;
}

export interface LiveRouteStop {
  sequence: number;
  stationCode: string;
  stationName: string;
  isHalt: boolean;
  status: "departed" | "arrived" | "at-station" | "upcoming" | string;
  coachPosition?: string;
  scheduledArrival?: string;
  scheduledDeparture?: string;
  actualArrival?: string;
  actualDeparture?: string;
  delayArrival?: number;
  delayDeparture?: number;
  platform?: string;
  distance?: number;
  speedToNextStationKmph?: number;
}

export interface LiveTrainData {
  trainNumber: string;
  trainName: string;
  startDate: string;
  lastUpdatedAt: string;
  status: string;
  train: {
    number: string;
    name: string;
    type?: string;
    category?: string;
    source?: StationRef;
    destination?: StationRef;
    runDays?: string[];
    distance?: number;
    duration?: number;
    avgSpeed?: number;
    maxSpeed?: number;
    totalHalts?: number;
    coachPosition?: string;
  };
  isLive: boolean;
  trackingMode?: string;
  previousHalt?: {
    stationCode: string;
    stationName: string;
    sequence: number;
    distance?: number;
  } | null;
  nextHalt?: {
    stationCode: string;
    stationName: string;
    sequence: number;
    distance?: number;
  } | null;
  delayMinutes: number;
  currentLocation?: {
    stationCode: string;
    stationName: string;
    sequence: number;
    status: string;
    isHalt: boolean;
    distanceFromOriginKm?: number;
    speedKmh?: number;
    delayMinutes?: number;
  } | null;
  route: LiveRouteStop[];
  exceptions: Array<{
    type?: string;
    description?: string;
    stationCode?: string;
  }>;
}

export interface StationLiveTrain {
  train: {
    number: string;
    name: string;
    type?: string;
    source?: string;
    destination?: string;
    runDays?: string[];
  };
  stop: {
    sequence: number;
    arrival?: string | null;
    departure?: string | null;
    day: number;
    distance?: number;
    isHalt: boolean;
    platform?: string | null;
  };
  live: {
    type: string;
    startDate?: string;
    expectedArrivalTime?: string | null;
    expectedDepartureTime?: string | null;
    delayMinutes?: number;
  };
}

export interface StationLiveData {
  station: {
    code: string;
    name: string;
    city?: string | null;
    lat?: number;
    lng?: number;
  };
  window: {
    from: string;
    to: string;
    hoursBack: number;
    hoursAhead: number;
  };
  count: number;
  trains: StationLiveTrain[];
}

export interface CoachInfo {
  position: number;
  code: string;
  classType: string;
  className: string;
  category: string;
  totalBerths: number;
  hasSeats: boolean;
  isExtra?: boolean;
}

export interface CoachBlueprintSeat {
  number: number;
  type: string;
  name: string;
}

export interface CoachBlueprintCabin {
  cabinNumber: number;
  main: CoachBlueprintSeat[];
  side: CoachBlueprintSeat[];
}

export interface CoachBlueprint {
  classCode: string;
  className: string;
  totalBerths: number;
  hasSeats: boolean;
  cabins: CoachBlueprintCabin[];
}

export interface CoachCompositionData {
  trainNumber: string;
  trainName: string;
  sourceStation?: StationRef;
  destinationStation?: StationRef;
  totalCoaches: number;
  coachPosition: string;
  summary: Record<string, number>;
  rake: CoachInfo[];
  blueprints: Record<string, CoachBlueprint>;
  stationVariations?: {
    reversals?: string[];
    stops?: Record<string, { stationCode: string; stationName: string; platform?: string; coaches: CoachInfo[] }>;
  };
  legs?: Array<{
    legIndex: number;
    fromStation: string;
    toStation: string;
    fromStationName: string;
    toStationName: string;
    isReversed: boolean;
    coaches: CoachInfo[];
  }>;
}

/* ---------------- quota tracking ---------------- */

let quotaRemaining: number | null = null;
const quotaListeners = new Set<(value: number | null) => void>();

export function getQuotaRemaining() {
  return quotaRemaining;
}

export function subscribeQuota(listener: (value: number | null) => void) {
  quotaListeners.add(listener);
  listener(quotaRemaining);
  return () => {
    quotaListeners.delete(listener);
  };
}

function setQuota(value: number | null) {
  quotaRemaining = value;
  quotaListeners.forEach((listener) => listener(value));
}

/* ---------------- cache ---------------- */

interface CacheEntry<T> {
  expires: number;
  value: T;
}

function readCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const entry = JSON.parse(raw) as CacheEntry<T>;
    if (!entry || typeof entry.expires !== "number") return null;
    if (entry.expires < Date.now()) {
      localStorage.removeItem(key);
      return null;
    }
    return entry.value;
  } catch {
    return null;
  }
}

function writeCache<T>(key: string, value: T, ttlMs: number) {
  if (ttlMs <= 0) return;
  try {
    localStorage.setItem(key, JSON.stringify({ expires: Date.now() + ttlMs, value }));
  } catch {
    /* storage full / private mode — ignore */
  }
}

const inflight = new Map<string, Promise<unknown>>();

/* ---------------- core request ---------------- */

interface RequestOptions {
  ttlMs?: number;
  timeoutMs?: number;
  force?: boolean;
}

async function request<T>(
  path: string,
  params: Record<string, string | number | boolean | undefined> = {},
  options: RequestOptions = {}
): Promise<T> {
  if (!API_KEY && !PROXY_MODE) {
    throw new RailRadarError(
      "RailRadar live data is not configured. Add the RAILRADAR_API_KEY Worker secret (or VITE_RAILRADAR_API_KEY for local development).",
      "NO_API_KEY",
      0
    );
  }

  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") query.set(key, String(value));
  });
  const url = `${API_BASE}${path}${query.size ? `?${query.toString()}` : ""}`;
  const cacheKey = `railradar:v1:${url}`;

  if (!options.force) {
    const cached = readCache<T>(cacheKey);
    if (cached) return cached;
  }

  const pending = inflight.get(cacheKey);
  if (pending) return pending as Promise<T>;

  const run = (async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 20000);
    let response: Response;
    try {
      response = await fetch(url, {
        headers: {
          ...(API_KEY ? { Authorization: `Bearer ${API_KEY}` } : {}),
          Accept: "application/json",
        },
        signal: controller.signal,
      });
    } catch (error) {
      if ((error as Error).name === "AbortError") {
        throw new RailRadarError("The RailRadar API took too long to respond.", "TIMEOUT", 0);
      }
      throw new RailRadarError(
        "Could not reach RailRadar. Check your internet connection.",
        "NETWORK",
        0
      );
    } finally {
      clearTimeout(timer);
    }

    const remaining = response.headers.get("x-ratelimit-remaining-month");
    if (remaining !== null && !Number.isNaN(Number(remaining))) setQuota(Number(remaining));

    const text = await response.text();
    let body: any = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      throw new RailRadarError(
        `RailRadar returned an unexpected response (HTTP ${response.status}).`,
        "BAD_RESPONSE",
        response.status
      );
    }

    if (!response.ok || body?.success === false) {
      const code = body?.error?.code ?? `HTTP_${response.status}`;
      const message = body?.error?.message ?? `RailRadar request failed (HTTP ${response.status}).`;
      throw new RailRadarError(message, code, response.status);
    }

    const data = body?.data as T;
    writeCache(cacheKey, data, options.ttlMs ?? 0);
    return data;
  })();

  inflight.set(cacheKey, run);
  try {
    return await run;
  } finally {
    inflight.delete(cacheKey);
  }
}

/* ---------------- endpoints ---------------- */

const HOUR = 60 * 60 * 1000;

/** Real trains between two stations, with scheduled times and duration. */
export function getTrainsBetween(from: string, to: string, date: string) {
  return request<TrainsBetweenData>(
    `/trains/between/${encodeURIComponent(from)}/${encodeURIComponent(to)}`,
    { date },
    { ttlMs: 6 * HOUR }
  );
}

/** Live running status for a train (position, delay, platform, route). */
export function getLiveTrain(trainNumber: string, date?: string, force = false) {
  return request<LiveTrainData>(
    `/trains/${encodeURIComponent(trainNumber)}/live`,
    { date, haltsOnly: true },
    { ttlMs: 45 * 1000, force }
  );
}

/** Live arrivals/departures board for a station. */
export function getStationLive(stationCode: string, hours: 2 | 4 | 6 | 8 = 4, force = false) {
  return request<StationLiveData>(
    `/stations/${encodeURIComponent(stationCode)}/live`,
    { hours },
    { ttlMs: 90 * 1000, force }
  );
}

/** Real coach composition and berth blueprints for a train. */
export function getCoachComposition(trainNumber: string, force = false) {
  return request<CoachCompositionData>(
    `/trains/${encodeURIComponent(trainNumber)}/coaches`,
    {},
    { ttlMs: 12 * HOUR, force }
  );
}

/* ---------------- friendly errors ---------------- */

export function friendlyApiError(error: unknown): string {
  if (error instanceof RailRadarError) {
    switch (error.code) {
      case "NO_API_KEY":
        return error.message;
      case "TOO_MANY_REQUESTS":
        return "RailRadar's monthly API quota is used up. Try again after the quota resets.";
      case "TRAIN_NOT_FOUND":
        return "That train number wasn't found. Check the 5-digit number and try again.";
      case "TRAIN_NOT_RUNNING":
        return "This train isn't running on the selected date.";
      case "STATION_NOT_FOUND":
        return "One of the station codes wasn't recognised.";
      case "HISTORICAL_NOT_INCLUDED":
        return "Live tracking is only available for recent runs (last 30 days).";
      case "NETWORK":
      case "TIMEOUT":
        return error.message;
      default:
        if (error.status === 429) {
          return "RailRadar's rate limit was hit. Please wait a minute and try again.";
        }
        return error.message;
    }
  }
  return "Something went wrong while contacting RailRadar.";
}
