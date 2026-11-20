import type { TrainBetween } from "./railradar";

/* ------------------------------------------------------------------
   Booking domain logic.
   Trains, timings and distances are real (RailRadar).
   Fares, seat availability, seat maps and payments are simulated
   because IRCTC's reservation APIs are not publicly available.
------------------------------------------------------------------- */

export type ClassCode = "SL" | "3A" | "3E" | "2A" | "1A" | "CC" | "EC" | "2S";

export interface ClassMeta {
  code: ClassCode;
  label: string;
  short: string;
  perKm: number;
  reservationFee: number;
  minFare: number;
  coaches: string[];
  seatCount: number;
  columns: number;
  seatTypes: string[];
}

export const CLASS_META: Record<ClassCode, ClassMeta> = {
  SL: {
    code: "SL",
    label: "Sleeper",
    short: "SL",
    perKm: 0.55,
    reservationFee: 20,
    minFare: 120,
    coaches: ["S1", "S2", "S3", "S4", "S5"],
    seatCount: 72,
    columns: 8,
    seatTypes: ["Lower", "Middle", "Upper", "Lower", "Middle", "Upper", "Side Lower", "Side Upper"],
  },
  "3A": {
    code: "3A",
    label: "AC 3 Tier",
    short: "3A",
    perKm: 1.35,
    reservationFee: 40,
    minFare: 400,
    coaches: ["B1", "B2", "B3", "B4"],
    seatCount: 64,
    columns: 8,
    seatTypes: ["Lower", "Middle", "Upper", "Lower", "Middle", "Upper", "Side Lower", "Side Upper"],
  },
  "3E": {
    code: "3E",
    label: "AC 3 Economy",
    short: "3E",
    perKm: 1.15,
    reservationFee: 40,
    minFare: 350,
    coaches: ["M1", "M2"],
    seatCount: 83,
    columns: 8,
    seatTypes: ["Lower", "Middle", "Upper", "Lower", "Middle", "Upper", "Side Lower", "Side Upper"],
  },
  "2A": {
    code: "2A",
    label: "AC 2 Tier",
    short: "2A",
    perKm: 1.95,
    reservationFee: 50,
    minFare: 600,
    coaches: ["A1", "A2"],
    seatCount: 46,
    columns: 6,
    seatTypes: ["Lower", "Upper", "Lower", "Upper", "Side Lower", "Side Upper"],
  },
  "1A": {
    code: "1A",
    label: "AC First Class",
    short: "1A",
    perKm: 3.1,
    reservationFee: 60,
    minFare: 900,
    coaches: ["H1"],
    seatCount: 24,
    columns: 4,
    seatTypes: ["Cabin", "Coupe", "Cabin", "Coupe"],
  },
  CC: {
    code: "CC",
    label: "AC Chair Car",
    short: "CC",
    perKm: 1.0,
    reservationFee: 30,
    minFare: 250,
    coaches: ["C1", "C2", "C3"],
    seatCount: 78,
    columns: 6,
    seatTypes: ["Window", "Middle", "Aisle", "Aisle", "Middle", "Window"],
  },
  EC: {
    code: "EC",
    label: "Executive Chair Car",
    short: "EC",
    perKm: 1.8,
    reservationFee: 50,
    minFare: 500,
    coaches: ["E1"],
    seatCount: 56,
    columns: 4,
    seatTypes: ["Window", "Aisle", "Aisle", "Window"],
  },
  "2S": {
    code: "2S",
    label: "Second Sitting",
    short: "2S",
    perKm: 0.3,
    reservationFee: 15,
    minFare: 60,
    coaches: ["D1", "D2", "D3"],
    seatCount: 90,
    columns: 6,
    seatTypes: ["Window", "Middle", "Aisle", "Aisle", "Middle", "Window"],
  },
};

/* ---------------- quotas ---------------- */

export type QuotaId =
  | "general"
  | "tatkal"
  | "premium"
  | "ladies"
  | "senior"
  | "defence"
  | "divyangjan"
  | "lower";

export interface QuotaMeta {
  id: QuotaId;
  label: string;
  code: string;
  description: string;
  multiplier: number;
}

export const QUOTAS: QuotaMeta[] = [
  {
    id: "general",
    label: "General",
    code: "GN",
    description: "Open to all passengers.",
    multiplier: 1,
  },
  {
    id: "tatkal",
    label: "Tatkal",
    code: "TQ",
    description: "Last-minute booking, opens one day before departure.",
    multiplier: 1.25,
  },
  {
    id: "premium",
    label: "Premium Tatkal",
    code: "PT",
    description: "Dynamic-priced last-minute quota.",
    multiplier: 1.5,
  },
  {
    id: "ladies",
    label: "Ladies",
    code: "LD",
    description: "For female passengers and children under 12.",
    multiplier: 1,
  },
  {
    id: "senior",
    label: "Senior Citizens",
    code: "SS",
    description: "For passengers aged 60+ (58+ for women).",
    multiplier: 1,
  },
  {
    id: "defence",
    label: "Defence",
    code: "DF",
    description: "For serving and retired defence personnel.",
    multiplier: 1,
  },
  {
    id: "divyangjan",
    label: "Divyangjan",
    code: "DP",
    description: "For passengers with disabilities; ID required while travelling.",
    multiplier: 1,
  },
  {
    id: "lower",
    label: "Lower Berth",
    code: "LB",
    description: "Lower-berth preference for seniors, women and children.",
    multiplier: 1,
  },
];

export function quotaById(id: string): QuotaMeta {
  return QUOTAS.find((quota) => quota.id === id) ?? QUOTAS[0];
}

export function quotaCodeFor(id: string): string {
  return quotaById(id).code;
}

/* ---------------- fares / availability ---------------- */

export type AvailabilityStatus = "Available" | "RAC" | "Waitlist";

export interface FareBreakupRow {
  label: string;
  amount: number;
}

export interface ClassOption {
  code: ClassCode;
  label: string;
  price: number;
  status: AvailabilityStatus;
  count: number;
  source?: "simulated" | "irctc";
  realStatus?: string;
  breakup?: FareBreakupRow[];
}

export interface TrainResult {
  id: string;
  number: string;
  name: string;
  type: string;
  dep: string;
  arr: string;
  dayOffset: number;
  durMin: number;
  distance: number;
  halts: number;
  runDays: string[];
  classes: ClassOption[];
}

/* ---------------- deterministic pseudo-randomness ---------------- */

function hashString(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------------- classes, fares, availability ---------------- */

export function classesForTrain(train: TrainBetween): ClassCode[] {
  const name = train.train.name.toLowerCase();
  const type = (train.train.type ?? "").toLowerCase();

  if (name.includes("vande bharat")) return ["CC", "EC"];
  if (name.includes("rajdhani") || name.includes("duronto")) return ["1A", "2A", "3A"];
  if (name.includes("shatabdi")) return ["CC", "EC"];
  if (name.includes("garib rath")) return ["3A", "CC"];
  if (name.includes("jan shatabdi")) return ["CC", "2S"];
  if (name.includes("passenger") || type.includes("passenger") || type.includes("memu") || type.includes("demu")) {
    return ["2S"];
  }
  if (name.includes("intercity")) return ["CC", "2S", "3A"];
  return ["SL", "3A", "2A", "1A"];
}

function quotaMultiplier(quota: string): number {
  return quotaById(quota).multiplier;
}

export function fareFor(distance: number, classCode: ClassCode, quota: string): number {
  const meta = CLASS_META[classCode];
  const raw = distance * meta.perKm * quotaMultiplier(quota) + meta.reservationFee;
  return Math.round(Math.max(meta.minFare, raw) / 5) * 5;
}

function availabilityFor(
  trainNumber: string,
  date: string,
  classCode: ClassCode
): { status: AvailabilityStatus; count: number } {
  const random = seededRandom(hashString(`${trainNumber}|${date}|${classCode}`));
  const roll = random() * 10;

  if (roll < 6.4) {
    return { status: "Available", count: 8 + Math.floor(random() * 48) };
  }
  if (roll < 8.1) {
    return { status: "RAC", count: 3 + Math.floor(random() * 14) };
  }
  return { status: "Waitlist", count: 1 + Math.floor(random() * 26) };
}

export function buildTrainResult(train: TrainBetween, date: string, quota: string): TrainResult {
  const classes = classesForTrain(train).map((code) => {
    const availability = availabilityFor(train.train.number, date, code);
    return {
      code,
      label: CLASS_META[code].label,
      price: fareFor(train.distance, code, quota),
      status: availability.status,
      count: availability.count,
      source: "simulated" as const,
    };
  });

  return {
    id: `${train.train.number}-${train.from.departure}-${train.from.sequence}`,
    number: train.train.number,
    name: train.train.name,
    type: train.train.type ?? "Express",
    dep: train.from.departure,
    arr: train.to.arrival,
    dayOffset: Math.max(0, (train.to.day ?? 1) - (train.from.day ?? 1)),
    durMin: train.duration,
    distance: train.distance,
    halts: train.totalHaltsBetween,
    runDays: train.train.runDays ?? [],
    classes,
  };
}

/* ---------------- seat maps ---------------- */

export interface Seat {
  num: number;
  type: string;
  booked: boolean;
}

export interface SeatMap {
  coach: string;
  classCode: ClassCode;
  columns: number;
  seats: Seat[];
}

export function generateSeatMap(
  coachId: string,
  classCode: ClassCode,
  options: { seatCount?: number; seatTypes?: string[]; bookedRatio?: number } = {}
): SeatMap {
  const meta = CLASS_META[classCode];
  const seed = hashString(`${coachId}|${classCode}`);
  const random = seededRandom(seed);

  const seatCount = Math.max(1, Math.round(options.seatCount ?? meta.seatCount));
  const seatTypes =
    options.seatTypes && options.seatTypes.length > 0 ? options.seatTypes : meta.seatTypes;
  const bookedRatio = Math.min(0.95, Math.max(0.05, options.bookedRatio ?? 0.2));

  const seats: Seat[] = Array.from({ length: seatCount }, (_, index) => ({
    num: index + 1,
    type: seatTypes[index % seatTypes.length],
    booked: random() < bookedRatio,
  }));

  return { coach: coachId, classCode, columns: meta.columns, seats };
}

/* ---------------- formatting helpers ---------------- */

export function formatDuration(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.round(totalMinutes % 60);
  return `${hours}h ${minutes.toString().padStart(2, "0")}m`;
}

export function formatINR(amount: number): string {
  return `₹${new Intl.NumberFormat("en-IN").format(amount)}`;
}

export function formatJourneyDate(isoDate: string): string {
  if (!isoDate) return "";
  const date = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return isoDate;
  return date.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function runDaysLabel(days: string[] | undefined): string {
  if (!days || days.length === 0) return "Check schedule";
  if (days.length === 7) return "Daily";
  const labels: Record<string, string> = {
    mon: "Mon",
    tue: "Tue",
    wed: "Wed",
    thu: "Thu",
    fri: "Fri",
    sat: "Sat",
    sun: "Sun",
  };
  return days.map((day) => labels[day.toLowerCase()] ?? day).join(", ");
}

/* ---------------- ids / receipts ---------------- */

export function makePnr(): string {
  return String(Math.floor(1000000000 + Math.random() * 9000000000));
}

export function makeTransactionId(): string {
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `SPAY${Date.now().toString(36).toUpperCase()}${random}`;
}

export function makeAuthCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function makeBookingTime(): string {
  return new Date().toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function maskCardNumber(digits: string): string {
  const last4 = digits.replace(/\D/g, "").slice(-4);
  return `•••• •••• •••• ${last4}`;
}

export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 10 ? `••••••${digits.slice(-4)}` : phone;
}

export interface PaymentReceipt {
  method: "upi" | "card" | "netbanking" | "wallet";
  methodLabel: string;
  detail: string;
  txnId: string;
  authCode: string;
  paidAt: string;
  amount: number;
}
