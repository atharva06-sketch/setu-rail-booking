/**
 * Regenerates src/data/stations.ts from RailRadar's station directory.
 *
 * Usage:
 *   node scripts/fetch-stations.mjs
 *
 * Reads VITE_RAILRADAR_API_KEY from the environment or from .env.
 * This costs exactly one API request, and the generated file means
 * station search in the app costs zero requests.
 */
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const envPath = path.join(root, '.env');

function readEnvFile(file) {
  if (!fs.existsSync(file)) return {};
  return Object.fromEntries(
    fs
      .readFileSync(file, 'utf8')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#') && line.includes('='))
      .map((line) => {
        const index = line.indexOf('=');
        return [line.slice(0, index).trim(), line.slice(index + 1).trim()];
      })
  );
}

const env = readEnvFile(envPath);
const key = process.env.VITE_RAILRADAR_API_KEY || env.VITE_RAILRADAR_API_KEY;
const base = process.env.VITE_RAILRADAR_API_BASE || env.VITE_RAILRADAR_API_BASE || 'https://api.railradar.in/v1';

if (!key) {
  console.error('Missing VITE_RAILRADAR_API_KEY. Add it to .env or export it first.');
  process.exit(1);
}

console.log('Fetching station directory from RailRadar…');
const response = await fetch(`${base}/lookup/stations/compressed`, {
  headers: { Authorization: `Bearer ${key}`, Accept: 'application/json' },
});

const remaining = response.headers.get('x-ratelimit-remaining-month');
if (!response.ok) {
  console.error(`Request failed: HTTP ${response.status}`);
  console.error(await response.text());
  process.exit(1);
}

const body = await response.json();
if (!body.success || typeof body.data !== 'string') {
  console.error('Unexpected response shape:', body);
  process.exit(1);
}

const lines = body.data.split('\n').filter((line) => line.includes('|'));
const activeCount = Number(body.meta?.activeStationCount ?? lines.length);
const active = lines.slice(0, activeCount);

const seen = new Set();
const stations = active
  .map((line) => {
    const index = line.indexOf('|');
    return { code: line.slice(0, index).trim(), name: line.slice(index + 1).trim() };
  })
  .filter((station) => {
    if (!/^[A-Z0-9]{1,10}$/.test(station.code) || !station.name || seen.has(station.code)) return false;
    seen.add(station.code);
    return true;
  })
  .sort((a, b) => a.code.localeCompare(b.code));

const header = `// Auto-generated from the RailRadar station directory on ${new Date().toISOString().slice(0, 10)}.
// Contains every active Indian Railways station (${stations.length} stations).
// This file is bundled with the app so station search costs zero API requests.
// Regenerate with: node scripts/fetch-stations.mjs

export interface StationInfo {
  code: string;
  name: string;
}

export const ALL_STATIONS: StationInfo[] = `;

const bodyText = JSON.stringify(stations)
  .replace(/},{/g, '},\n  {')
  .replace(/^\[/, '[\n  ')
  .replace(/\]$/, ',\n];');

fs.mkdirSync(path.join(root, 'src', 'data'), { recursive: true });
fs.writeFileSync(path.join(root, 'src', 'data', 'stations.ts'), `${header}${bodyText}\n`);

console.log(`Wrote src/data/stations.ts with ${stations.length} stations.`);
console.log(`File size: ${Math.round(fs.statSync(path.join(root, 'src', 'data', 'stations.ts')).size / 1024)} KB`);
if (remaining !== null) console.log(`RailRadar requests left this month: ${remaining}`);
