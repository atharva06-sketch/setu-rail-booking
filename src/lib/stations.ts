import { ALL_STATIONS, type StationInfo } from "@/data/stations";

export type { StationInfo };

export const STATION_BY_CODE = new Map<string, StationInfo>(
  ALL_STATIONS.map((station) => [station.code, station])
);

const SEARCH_INDEX = ALL_STATIONS.map((station) => ({
  station,
  code: station.code.toLowerCase(),
  name: station.name.toLowerCase(),
}));

const POPULAR_CODES = [
  "R",
  "NDLS",
  "CSMT",
  "HWH",
  "MAS",
  "SBC",
  "BSP",
  "DURG",
  "NGP",
  "VSKP",
  "PUNE",
  "ADI",
  "JP",
  "LKO",
  "BPL",
  "CNB",
];

export const POPULAR_STATIONS: StationInfo[] = POPULAR_CODES.map((code) =>
  STATION_BY_CODE.get(code)
).filter((station): station is StationInfo => Boolean(station));

export function getStation(code: string | null | undefined): StationInfo | undefined {
  if (!code) return undefined;
  return STATION_BY_CODE.get(code.toUpperCase());
}

export function stationTitle(code: string | null | undefined): string {
  const station = getStation(code);
  return station ? `${station.name} (${station.code})` : code ?? "";
}

/**
 * Fast local station search across all 8,670 active Indian Railways stations.
 * Ranking: exact code, code prefix, name prefix, code substring, name substring.
 */
export function searchStations(rawQuery: string, limit = 8): StationInfo[] {
  const query = rawQuery.trim().toLowerCase();
  if (!query) return POPULAR_STATIONS.slice(0, limit);

  const scored: Array<{ station: StationInfo; score: number }> = [];

  for (const entry of SEARCH_INDEX) {
    let score = -1;
    if (entry.code === query) score = 0;
    else if (entry.code.startsWith(query)) score = 1;
    else if (entry.name.startsWith(query)) score = 2;
    else if (entry.code.includes(query)) score = 3;
    else if (entry.name.includes(query)) score = 4;

    if (score >= 0) scored.push({ station: entry.station, score });
    if (scored.length > 400) break;
  }

  scored.sort((a, b) => {
    if (a.score !== b.score) return a.score - b.score;
    const aName = a.station.name;
    const bName = b.station.name;
    if (aName.length !== bName.length) return aName.length - bName.length;
    return aName.localeCompare(bName);
  });

  return scored.slice(0, limit).map((item) => item.station);
}
