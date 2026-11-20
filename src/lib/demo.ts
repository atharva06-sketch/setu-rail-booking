/* ------------------------------------------------------------------
   Bundled demo data.

   The app must run on a fresh clone with no .env and no API keys.
   When RailRadar is not configured, these functions provide realistic,
   clearly labelled sample data for the train search, live station board
   and live train tracker. Booking fares, availability and payments are
   already simulated elsewhere.

   Nothing here contacts the network.
------------------------------------------------------------------- */

import type {
  LiveRouteStop,
  LiveTrainData,
  StationLiveData,
  StationLiveTrain,
  StationRef,
  TrainBetween,
} from "./railradar";

/* ---------------- time helpers (IST) ---------------- */

const IST_OFFSET_MINUTES = 330;

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function istParts(date: Date) {
  const shifted = new Date(date.getTime() + IST_OFFSET_MINUTES * 60_000);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hours: shifted.getUTCHours(),
    minutes: shifted.getUTCMinutes(),
  };
}

function istClock(offsetMinutes = 0): string {
  const parts = istParts(new Date(Date.now() + offsetMinutes * 60_000));
  return `${pad(parts.hours)}:${pad(parts.minutes)}`;
}

function istDate(offsetDays = 0): string {
  const parts = istParts(new Date(Date.now() + offsetDays * 86_400_000));
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
}

function istIso(offsetMinutes = 0): string {
  const parts = istParts(new Date(Date.now() + offsetMinutes * 60_000));
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hours)}:${pad(parts.minutes)}:00+05:30`;
}

function addClockMinutes(clock: string | null, delta: number): string | undefined {
  if (!clock) return undefined;
  const [hours, minutes] = clock.split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return undefined;
  const total = (((hours * 60 + minutes + delta) % 1440) + 1440) % 1440;
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
}

/* ---------------- demo train search ---------------- */

export interface DemoTrainTemplate {
  number: string;
  name: string;
  type: string;
  dep: string;
  arr: string;
  dayOffset: number;
  duration: number;
  distance: number;
  halts: number;
}

export const DEMO_TRAIN_TEMPLATES: DemoTrainTemplate[] = [
  {
    number: "18237",
    name: "Chhattisgarh Express",
    type: "Superfast Express",
    dep: "14:30",
    arr: "11:20",
    dayOffset: 1,
    duration: 1250,
    distance: 1245,
    halts: 38,
  },
  {
    number: "12441",
    name: "Bilaspur - New Delhi Rajdhani Express",
    type: "Rajdhani Express",
    dep: "15:35",
    arr: "10:40",
    dayOffset: 1,
    duration: 1145,
    distance: 1393,
    halts: 8,
  },
  {
    number: "18239",
    name: "Shivnath Express",
    type: "Mail/Express",
    dep: "18:10",
    arr: "22:05",
    dayOffset: 0,
    duration: 235,
    distance: 305,
    halts: 14,
  },
  {
    number: "20825",
    name: "Vande Bharat Express",
    type: "Vande Bharat",
    dep: "06:15",
    arr: "12:40",
    dayOffset: 0,
    duration: 385,
    distance: 560,
    halts: 6,
  },
];

/** Builds a TrainBetween object for the demo list using the chosen route/date. */
export function demoTrainBetween(
  template: DemoTrainTemplate,
  fromCode: string,
  fromName: string,
  toCode: string,
  toName: string
): TrainBetween {
  return {
    train: {
      number: template.number,
      name: template.name,
      type: template.type,
      runDays: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
    },
    from: {
      code: fromCode,
      name: fromName,
      departure: template.dep,
      day: 1,
      sequence: 1,
    },
    to: {
      code: toCode,
      name: toName,
      arrival: template.arr,
      day: 1 + template.dayOffset,
      sequence: 2,
    },
    distance: template.distance,
    duration: template.duration,
    totalHaltsBetween: template.halts,
  };
}

/* ---------------- demo station board ---------------- */

interface BoardSpec {
  number: string;
  name: string;
  type: string;
  source: string;
  destination: string;
  minutesFromNow: number;
  platform: string;
  delay: number;
  liveType: string;
  distance: number;
}

const BOARD_TRAINS: BoardSpec[] = [
  {
    number: "18239",
    name: "Shivnath Express",
    type: "Mail/Express",
    source: "Raipur Jn",
    destination: "NSCB Jabalpur",
    minutesFromNow: 2,
    platform: "4",
    delay: 0,
    liveType: "at-station",
    distance: 0,
  },
  {
    number: "18237",
    name: "Chhattisgarh Express",
    type: "Superfast Express",
    source: "Raipur Jn",
    destination: "New Delhi",
    minutesFromNow: 12,
    platform: "3",
    delay: 0,
    liveType: "not-started",
    distance: 0,
  },
  {
    number: "12854",
    name: "Raipur - Howrah SF Express",
    type: "Superfast Express",
    source: "Raipur Jn",
    destination: "Howrah Jn",
    minutesFromNow: 38,
    platform: "2",
    delay: 0,
    liveType: "not-started",
    distance: 0,
  },
  {
    number: "12441",
    name: "Bilaspur - New Delhi Rajdhani Express",
    type: "Rajdhani Express",
    source: "Bilaspur Jn",
    destination: "New Delhi",
    minutesFromNow: 67,
    platform: "1",
    delay: 12,
    liveType: "running",
    distance: 111,
  },
  {
    number: "18239",
    name: "Shivnath Express",
    type: "Mail/Express",
    source: "Raipur Jn",
    destination: "NSCB Jabalpur",
    minutesFromNow: 109,
    platform: "4",
    delay: 0,
    liveType: "not-started",
    distance: 0,
  },
  {
    number: "20825",
    name: "Vande Bharat Express",
    type: "Vande Bharat",
    source: "Raipur Jn",
    destination: "Nagpur Jn",
    minutesFromNow: 156,
    platform: "5",
    delay: 0,
    liveType: "not-started",
    distance: 0,
  },
  {
    number: "12919",
    name: "Malwa SF Express",
    type: "Superfast Express",
    source: "Indore Jn",
    destination: "New Delhi",
    minutesFromNow: 205,
    platform: "3",
    delay: 35,
    liveType: "running",
    distance: 415,
  },
];

export function buildDemoStationBoard(
  stationCode: string,
  stationName: string,
  hours: 2 | 4 | 6 | 8
): StationLiveData {
  const windowMinutes = hours * 60;
  const trains: StationLiveTrain[] = BOARD_TRAINS.filter(
    (item) => item.minutesFromNow <= windowMinutes
  ).map((item, index) => ({
    train: {
      number: item.number,
      name: item.name,
      type: item.type,
      source: item.source,
      destination: item.destination,
      runDays: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
    },
    stop: {
      sequence: index + 1,
      arrival: null,
      departure: istClock(item.minutesFromNow),
      day: 1,
      distance: item.distance,
      isHalt: true,
      platform: item.platform,
    },
    live: {
      type: item.liveType,
      startDate: istDate(0),
      expectedArrivalTime: null,
      expectedDepartureTime: istIso(item.minutesFromNow + item.delay),
      delayMinutes: item.delay,
    },
  }));

  return {
    station: { code: stationCode, name: stationName, city: "Raipur" },
    window: {
      from: istClock(0),
      to: istClock(windowMinutes),
      hoursBack: 0,
      hoursAhead: hours,
    },
    count: trains.length,
    trains,
  };
}

/* ---------------- demo live train ---------------- */

interface DemoStop {
  code: string;
  name: string;
  distance: number;
  arrival: string | null;
  departure: string | null;
  platform: string;
}

interface DemoRoute {
  number: string;
  name: string;
  type: string;
  source: StationRef;
  destination: StationRef;
  distance: number;
  duration: number;
  stops: DemoStop[];
  currentSequence: number;
  delayMinutes: number;
}

const ROUTE_18237: DemoRoute = {
  number: "18237",
  name: "Chhattisgarh Express",
  type: "Superfast Express",
  source: { code: "R", name: "Raipur Jn" },
  destination: { code: "NDLS", name: "New Delhi" },
  distance: 1447,
  duration: 1250,
  currentSequence: 4,
  delayMinutes: 12,
  stops: [
    { code: "R", name: "Raipur Jn", distance: 0, arrival: null, departure: "14:30", platform: "3" },
    { code: "BSP", name: "Bilaspur Jn", distance: 111, arrival: "16:05", departure: "16:15", platform: "2" },
    { code: "NGP", name: "Nagpur Jn", distance: 415, arrival: "21:10", departure: "21:20", platform: "1" },
    { code: "BPL", name: "Bhopal Jn", distance: 806, arrival: "03:25", departure: "03:35", platform: "4" },
    { code: "JHS", name: "Jhansi Jn", distance: 1098, arrival: "07:20", departure: "07:30", platform: "2" },
    { code: "AGC", name: "Agra Cantt", distance: 1305, arrival: "09:40", departure: "09:45", platform: "3" },
    { code: "MTJ", name: "Mathura Jn", distance: 1361, arrival: "10:25", departure: "10:30", platform: "1" },
    { code: "NDLS", name: "New Delhi", distance: 1447, arrival: "11:20", departure: null, platform: "16" },
  ],
};

const ROUTE_12441: DemoRoute = {
  number: "12441",
  name: "Bilaspur - New Delhi Rajdhani Express",
  type: "Rajdhani Express",
  source: { code: "BSP", name: "Bilaspur Jn" },
  destination: { code: "NDLS", name: "New Delhi" },
  distance: 1447,
  duration: 1145,
  currentSequence: 3,
  delayMinutes: 0,
  stops: [
    { code: "BSP", name: "Bilaspur Jn", distance: 0, arrival: null, departure: "15:35", platform: "1" },
    { code: "R", name: "Raipur Jn", distance: 111, arrival: "17:45", departure: "17:50", platform: "3" },
    { code: "NGP", name: "Nagpur Jn", distance: 415, arrival: "21:50", departure: "22:00", platform: "2" },
    { code: "BPL", name: "Bhopal Jn", distance: 806, arrival: "03:45", departure: "03:55", platform: "1" },
    { code: "JHS", name: "Jhansi Jn", distance: 1098, arrival: "07:35", departure: "07:45", platform: "2" },
    { code: "AGC", name: "Agra Cantt", distance: 1305, arrival: "09:50", departure: "09:55", platform: "3" },
    { code: "NDLS", name: "New Delhi", distance: 1447, arrival: "10:40", departure: null, platform: "16" },
  ],
};

const ROUTE_12919: DemoRoute = {
  number: "12919",
  name: "Malwa SF Express",
  type: "Superfast Express",
  source: { code: "INDB", name: "Indore Jn" },
  destination: { code: "NDLS", name: "New Delhi" },
  distance: 1013,
  duration: 930,
  currentSequence: 3,
  delayMinutes: 35,
  stops: [
    { code: "INDB", name: "Indore Jn", distance: 0, arrival: null, departure: "12:25", platform: "4" },
    { code: "UJN", name: "Ujjain Jn", distance: 55, arrival: "13:35", departure: "13:40", platform: "2" },
    { code: "BPL", name: "Bhopal Jn", distance: 246, arrival: "17:25", departure: "17:35", platform: "1" },
    { code: "JHS", name: "Jhansi Jn", distance: 538, arrival: "21:35", departure: "21:45", platform: "2" },
    { code: "AGC", name: "Agra Cantt", distance: 745, arrival: "00:35", departure: "00:40", platform: "3" },
    { code: "NDLS", name: "New Delhi", distance: 1013, arrival: "03:55", departure: null, platform: "12" },
  ],
};

const ROUTE_12854: DemoRoute = {
  number: "12854",
  name: "Raipur - Howrah SF Express",
  type: "Superfast Express",
  source: { code: "R", name: "Raipur Jn" },
  destination: { code: "HWH", name: "Howrah Jn" },
  distance: 797,
  duration: 660,
  currentSequence: 2,
  delayMinutes: 0,
  stops: [
    { code: "R", name: "Raipur Jn", distance: 0, arrival: null, departure: "18:10", platform: "2" },
    { code: "BSP", name: "Bilaspur Jn", distance: 111, arrival: "20:05", departure: "20:15", platform: "1" },
    { code: "ROU", name: "Rourkela", distance: 413, arrival: "23:50", departure: "23:58", platform: "3" },
    { code: "KGP", name: "Kharagpur Jn", distance: 672, arrival: "03:10", departure: "03:20", platform: "2" },
    { code: "HWH", name: "Howrah Jn", distance: 797, arrival: "05:10", departure: null, platform: "8" },
  ],
};

const DEMO_ROUTES: Record<string, DemoRoute> = {
  "18237": ROUTE_18237,
  "12441": ROUTE_12441,
  "12919": ROUTE_12919,
  "12854": ROUTE_12854,
};

function buildLiveRoute(route: DemoRoute): LiveTrainData {
  const routeStops: LiveRouteStop[] = route.stops.map((stop, index) => {
    const sequence = index + 1;
    const isPast = sequence < route.currentSequence;
    const isCurrent = sequence === route.currentSequence;
    const travelled = isPast || isCurrent;
    const delay = travelled ? route.delayMinutes : 0;

    return {
      sequence,
      stationCode: stop.code,
      stationName: stop.name,
      isHalt: true,
      status: isCurrent ? "at-station" : isPast ? "departed" : "upcoming",
      scheduledArrival: stop.arrival ?? undefined,
      scheduledDeparture: stop.departure ?? undefined,
      actualArrival: travelled ? addClockMinutes(stop.arrival, route.delayMinutes) : undefined,
      actualDeparture: travelled ? addClockMinutes(stop.departure, route.delayMinutes) : undefined,
      delayArrival: delay,
      delayDeparture: delay,
      platform: stop.platform,
      distance: stop.distance,
    };
  });

  const currentIndex = Math.max(0, route.currentSequence - 1);
  const currentStop = route.stops[currentIndex];
  const previousStop = currentIndex > 0 ? route.stops[currentIndex - 1] : null;
  const nextStop = currentIndex < route.stops.length - 1 ? route.stops[currentIndex + 1] : null;

  return {
    trainNumber: route.number,
    trainName: route.name,
    startDate: istDate(0),
    lastUpdatedAt: new Date().toISOString(),
    status: "running",
    train: {
      number: route.number,
      name: route.name,
      type: route.type,
      category: route.type,
      source: route.source,
      destination: route.destination,
      runDays: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
      distance: route.distance,
      duration: route.duration,
      avgSpeed: 58,
      maxSpeed: 110,
      totalHalts: route.stops.length,
    },
    isLive: false,
    trackingMode: "demo",
    previousHalt: previousStop
      ? {
          stationCode: previousStop.code,
          stationName: previousStop.name,
          sequence: currentIndex,
          distance: previousStop.distance,
        }
      : null,
    nextHalt: nextStop
      ? {
          stationCode: nextStop.code,
          stationName: nextStop.name,
          sequence: currentIndex + 2,
          distance: nextStop.distance,
        }
      : null,
    delayMinutes: route.delayMinutes,
    currentLocation: {
      stationCode: currentStop.code,
      stationName: currentStop.name,
      sequence: route.currentSequence,
      status: "at-station",
      isHalt: true,
      distanceFromOriginKm: currentStop.distance,
      speedKmh: 0,
      delayMinutes: route.delayMinutes,
    },
    route: routeStops,
    exceptions: [],
  };
}

/** Returns bundled running-status data for the requested train number. */
export function buildDemoLiveTrain(trainNumber: string): LiveTrainData {
  const number = trainNumber.trim() || "18237";
  const known = DEMO_ROUTES[number];
  if (known) return buildLiveRoute(known);

  return buildLiveRoute({
    ...ROUTE_18237,
    number,
    name: `Demo Express #${number}`,
    type: "Express (demo)",
  });
}
