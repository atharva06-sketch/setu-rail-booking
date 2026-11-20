import type { AvailabilityStatus, ClassCode, FareBreakupRow } from "./booking";

/* ------------------------------------------------------------------
   Client for the local backend proxy (/api), which talks to the real
   IRCTC API (https://irctc.dev). The proxy keeps the API key server-side.

   Everything here degrades gracefully: if the backend or IRCTC key is
   missing, callers fall back to the simulated fares/availability.
------------------------------------------------------------------- */

const API_BASE = "/api";

export class IrctcError extends Error {
  code: string;
  status: number;

  constructor(message: string, code = "IRCTC_ERROR", status = 0) {
    super(message);
    this.name = "IrctcError";
    this.code = code;
    this.status = status;
  }
}

export interface BackendHealth {
  ok: boolean;
  irctc: boolean;
  email: boolean;
  emailMode: "smtp" | "emailjs" | "ethereal" | "none" | string;
  offline?: boolean;
}

const HEALTH_TTL = 5 * 60 * 1000;
const FARE_TTL = 12 * 60 * 60 * 1000;
const AVAILABILITY_TTL = 2 * 60 * 1000;

let healthCache: { value: BackendHealth; expires: number } | null = null;

function readCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const entry = JSON.parse(raw) as { expires: number; value: T };
    if (!entry || entry.expires < Date.now()) {
      localStorage.removeItem(key);
      return null;
    }
    return entry.value;
  } catch {
    return null;
  }
}

function writeCache<T>(key: string, value: T, ttlMs: number) {
  try {
    localStorage.setItem(key, JSON.stringify({ expires: Date.now() + ttlMs, value }));
  } catch {
    /* ignore quota errors */
  }
}

async function request<T>(
  path: string,
  params: Record<string, string | undefined>,
  ttlMs: number,
  force = false
): Promise<T> {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") query.set(key, value);
  });
  const url = `${API_BASE}${path}${query.size ? `?${query.toString()}` : ""}`;
  const cacheKey = `irctc:v1:${url}`;

  if (!force) {
    const cached = readCache<T>(cacheKey);
    if (cached) return cached;
  }

  let response: Response;
  try {
    response = await fetch(url, { headers: { accept: "application/json" } });
  } catch {
    throw new IrctcError(
      "The local booking API is offline. Start it with `npm run dev:api` (or `npm run dev:all`).",
      "BACKEND_OFFLINE",
      0
    );
  }

  const text = await response.text();
  let body: any = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    throw new IrctcError("The local booking API returned an unexpected response.", "BAD_RESPONSE", response.status);
  }

  if (!response.ok || body?.success === false) {
    throw new IrctcError(
      body?.message || `IRCTC request failed (HTTP ${response.status}).`,
      body?.code || `HTTP_${response.status}`,
      response.status
    );
  }

  writeCache(cacheKey, body, ttlMs);
  return body as T;
}

/* ---------------- health ---------------- */

export async function getBackendHealth(force = false): Promise<BackendHealth> {
  if (!force && healthCache && healthCache.expires > Date.now()) return healthCache.value;

  try {
    const response = await fetch(`${API_BASE}/health`, { headers: { accept: "application/json" } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const value = (await response.json()) as BackendHealth;
    healthCache = { value, expires: Date.now() + HEALTH_TTL };
    return value;
  } catch {
    const value: BackendHealth = {
      ok: false,
      irctc: false,
      email: false,
      emailMode: "none",
      offline: true,
    };
    healthCache = { value, expires: Date.now() + HEALTH_TTL };
    return value;
  }
}

/* ---------------- fares ---------------- */

export interface IrctcFareBreakup {
  baseFare: number;
  reservationCharge: number;
  superfastCharge: number;
  gst: number;
  cateringCharge: number;
}

export interface IrctcFareClass {
  class: string;
  className: string;
  totalFare: number;
  breakup: IrctcFareBreakup;
}

export interface IrctcFareData {
  success: boolean;
  trainNumber: string;
  trainName: string;
  from: string;
  to: string;
  quota: string;
  fares: IrctcFareClass[];
  source?: string;
}

export function getRealFares(
  trainNumber: string,
  from: string,
  to: string,
  quotaCode: string,
  force = false
) {
  return request<IrctcFareData>(
    "/fare",
    { train: trainNumber, from, to, quota: quotaCode, class: "all" },
    FARE_TTL,
    force
  );
}

export function fareBreakupRows(breakup: IrctcFareBreakup): FareBreakupRow[] {
  return [
    { label: "Base fare", amount: breakup.baseFare },
    { label: "Reservation charge", amount: breakup.reservationCharge },
    { label: "Superfast charge", amount: breakup.superfastCharge },
    { label: "GST", amount: breakup.gst },
    { label: "Catering", amount: breakup.cateringCharge },
  ].filter((row) => row.amount > 0);
}

/* ---------------- availability ---------------- */

export interface IrctcAvailabilityRow {
  date: string;
  status: string;
  type: string;
  currentBooking?: string;
}

export interface IrctcAvailabilityData {
  success: boolean;
  trainNumber: string;
  trainName: string;
  from: string;
  to: string;
  date: string;
  class: string;
  quota: string;
  availability: IrctcAvailabilityRow[];
  source?: string;
}

export function isoToDdMmYyyy(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  if (!year || !month || !day) return isoDate;
  return `${day}-${month}-${year}`;
}

export function getRealAvailability(
  trainNumber: string,
  from: string,
  to: string,
  isoDate: string,
  classCode: ClassCode | string,
  quotaCode: string,
  force = false
) {
  return request<IrctcAvailabilityData>(
    "/availability",
    {
      train: trainNumber,
      from,
      to,
      date: isoToDdMmYyyy(isoDate),
      class: classCode,
      quota: quotaCode,
    },
    AVAILABILITY_TTL,
    force
  );
}

export interface ParsedAvailability {
  status: AvailabilityStatus;
  count: number;
  label: string;
  raw: string;
}

/**
 * Turns IRCTC strings like "AVAILABLE-0042", "RAC 12",
 * "GNWL271/WL140" and "REGRET" into a UI-friendly status.
 */
export function parseAvailability(row: IrctcAvailabilityRow | undefined): ParsedAvailability | null {
  if (!row) return null;
  const raw = (row.status || "").toUpperCase().trim();
  if (!raw) return null;

  const available = raw.match(/AVAILABLE\s*[-:]?\s*(\d+)/);
  if (available) {
    return { status: "Available", count: Number(available[1]), label: row.status, raw: row.status };
  }

  const rac = raw.match(/RAC\s*[-:]?\s*(\d+)/);
  if (rac) {
    return { status: "RAC", count: Number(rac[1]), label: row.status, raw: row.status };
  }

  if (raw.includes("REGRET") || raw.includes("NO ROOM") || raw.includes("NOT AVAILABLE")) {
    return { status: "Waitlist", count: 0, label: row.status, raw: row.status };
  }

  const waitlist = raw.match(/WL\s*[-:]?\s*(\d+)/) ?? raw.match(/GNWL\s*(\d+)/);
  if (waitlist) {
    return { status: "Waitlist", count: Number(waitlist[1]), label: row.status, raw: row.status };
  }

  if (row.type === "AVAILABLE") {
    return { status: "Available", count: 1, label: row.status, raw: row.status };
  }
  if (row.type === "WAITLIST") {
    return { status: "Waitlist", count: 0, label: row.status, raw: row.status };
  }
  if (row.type === "RAC") {
    return { status: "RAC", count: 0, label: row.status, raw: row.status };
  }

  return { status: "Waitlist", count: 0, label: row.status, raw: row.status };
}

/** Accepts DD-MM-YYYY or ISO and returns ISO (YYYY-MM-DD). */
function normalizeAvailabilityDate(value: string): string {
  const dmy = value.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2]}-${dmy[1]}`;
  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return iso ? iso[0] : value;
}

/** Picks the row for the journey date, or the first row in the 14-day calendar. */
export function availabilityForDate(
  data: IrctcAvailabilityData,
  isoDate: string
): IrctcAvailabilityRow | undefined {
  return (
    data.availability.find((row) => normalizeAvailabilityDate(row.date) === isoDate) ??
    data.availability[0]
  );
}
