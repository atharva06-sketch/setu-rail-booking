import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Clock,
  Gauge,
  MapPin,
  Navigation,
  Radio,
  RefreshCw,
  TrainFront,
} from "lucide-react";
import {
  friendlyApiError,
  getLiveTrain,
  type LiveRouteStop,
  type LiveTrainData,
} from "@/lib/railradar";
import { AMBER, BLUE_DARK, BLUE_LIGHT, FONT_MONO, GREEN, LINE, MUTED, ORANGE, RED, TEXT } from "@/theme";

const EXAMPLES = [
  { number: "18237", label: "Chhattisgarh Express" },
  { number: "12919", label: "Malwa SF Express" },
  { number: "12441", label: "Bilaspur Rajdhani" },
  { number: "12854", label: "Raipur–Howrah SF" },
];

function isoTime(value?: string | null): string {
  if (!value) return "—";
  const match = value.match(/T(\d{2}:\d{2})/);
  return match ? match[1] : value;
}

function humanStatus(status?: string): string {
  if (!status) return "Unknown";
  return status.replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function stopTime(stop: LiveRouteStop): string {
  return isoTime(stop.actualDeparture ?? stop.scheduledDeparture ?? stop.actualArrival ?? stop.scheduledArrival);
}

function stopDelay(stop: LiveRouteStop): number {
  return stop.delayDeparture ?? stop.delayArrival ?? 0;
}

function StopRow({
  stop,
  currentSequence,
  isLast,
}: {
  stop: LiveRouteStop;
  currentSequence: number;
  isLast: boolean;
}) {
  const isCurrent = stop.sequence === currentSequence;
  const isPast = stop.sequence < currentSequence;
  const delay = stopDelay(stop);
  const dotColor = isCurrent ? "#F5821F" : isPast ? GREEN : "#fff";
  const borderColor = isCurrent ? "#F5821F" : isPast ? GREEN : LINE;
  const currentLabel =
    stop.status === "departed"
      ? "JUST DEPARTED"
      : stop.status === "at-station"
        ? "TRAIN IS HERE"
        : "CURRENT POSITION";
  const timingLabel = isPast
    ? "Departed"
    : isCurrent
      ? stop.status === "departed"
        ? "Departed"
        : stop.status === "at-station"
          ? "At station"
          : "Current"
      : "Scheduled";

  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center" style={{ width: 12 }}>
        <span
          style={{
            width: 12,
            height: 12,
            borderRadius: "50%",
            background: dotColor,
            border: `2px solid ${borderColor}`,
            flex: "0 0 auto",
            marginTop: 4,
          }}
        />
        {!isLast && <span style={{ width: 2, flex: 1, background: LINE, minHeight: 30 }} />}
      </div>

      <div style={{ paddingBottom: 14, flex: 1, minWidth: 0 }}>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span style={{ fontSize: 13, fontWeight: isCurrent ? 600 : 500 }}>{stop.stationName}</span>
          <span style={{ fontFamily: FONT_MONO, fontSize: 10, color: MUTED }}>{stop.stationCode}</span>
          {stop.platform && (
            <span
              style={{
                fontSize: 10,
                color: BLUE_DARK,
                background: BLUE_LIGHT,
                border: `1px solid ${LINE}`,
                borderRadius: 3,
                padding: "1px 5px",
              }}
            >
              PF {stop.platform}
            </span>
          )}
          {isCurrent && (
            <span style={{ fontSize: 10, fontWeight: 600, color: "#D96E12" }}>{currentLabel}</span>
          )}
        </div>
        <div style={{ fontSize: 11, color: MUTED, fontFamily: FONT_MONO, marginTop: 2 }}>
          {timingLabel} · {stopTime(stop)}
          {delay > 0 ? ` · late ${delay}m` : ""}
        </div>
      </div>

      <div style={{ fontSize: 10, color: "#9AAAB8", paddingTop: 4, whiteSpace: "nowrap" }}>
        {stop.distance != null ? `${Math.round(stop.distance)} km` : ""}
      </div>
    </div>
  );
}

export default function LiveTrainTracker() {
  const [trainNumber, setTrainNumber] = useState("18237");
  const [data, setData] = useState<LiveTrainData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [lastUpdated, setLastUpdated] = useState("");

  async function track(rawNumber: string, force = false) {
    const number = rawNumber.trim();
    if (!number) {
      setError("Enter a train number to track.");
      return;
    }
    setLoading(true);
    setError(null);
    setShowAll(false);
    try {
      const result = await getLiveTrain(number, undefined, force);
      setData(result);
      setLastUpdated(
        new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false })
      );
    } catch (err) {
      setData(null);
      setError(friendlyApiError(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void track("18237");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const route = data ? data.route.filter((stop) => stop.isHalt) : [];
  const currentSequence = data?.currentLocation?.sequence ?? 0;
  const currentIndex = Math.max(
    0,
    route.findIndex((stop) => stop.sequence >= currentSequence)
  );
  const progress = route.length > 1 ? (currentIndex / (route.length - 1)) * 100 : 0;
  const visibleStops = showAll
    ? route
    : route.slice(Math.max(0, currentIndex - 3), currentIndex + 8);

  const nextStop = data?.nextHalt
    ? route.find((stop) => stop.sequence === data.nextHalt?.sequence)
    : undefined;
  const delay = data?.delayMinutes ?? 0;
  const delayColor = delay > 0 ? AMBER : GREEN;

  return (
    <div className="card" style={{ padding: 20 }}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Radio size={16} color={BLUE_DARK} />
            <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Live train running status</h3>
          </div>
          <p style={{ fontSize: 12, color: MUTED, margin: "4px 0 0" }}>
            Real position, delay, platform and upcoming halts from RailRadar.
          </p>
        </div>
      </div>

      <form
        className="flex flex-wrap items-center gap-2"
        style={{ marginTop: 14 }}
        onSubmit={(event) => {
          event.preventDefault();
          void track(trainNumber, true);
        }}
      >
        <div style={{ position: "relative", flex: "1 1 180px", maxWidth: 260 }}>
          <TrainFront
            size={15}
            color={MUTED}
            style={{ position: "absolute", left: 10, top: 13, pointerEvents: "none" }}
          />
          <input
            className="field"
            style={{ paddingLeft: 32, fontFamily: FONT_MONO }}
            value={trainNumber}
            onChange={(event) => setTrainNumber(event.target.value)}
            placeholder="Train number (e.g. 18237)"
            aria-label="Train number"
            maxLength={20}
            autoComplete="off"
          />
        </div>
        <button
          type="submit"
          className="btn-primary flex items-center gap-2"
          style={{ padding: "10px 16px", fontSize: 13 }}
          disabled={loading}
        >
          {loading ? <span className="spinner" /> : <Navigation size={14} />}
          {loading ? "Tracking…" : "Track train"}
        </button>
        <button
          type="button"
          className="btn-ghost flex items-center gap-1"
          style={{ padding: "9px 12px", fontSize: 12 }}
          onClick={() => void track(trainNumber, true)}
          disabled={loading}
          title="Force refresh (uses one API request)"
        >
          <RefreshCw size={13} />
          Refresh
        </button>
      </form>

      <div className="flex flex-wrap gap-2" style={{ marginTop: 8 }}>
        {EXAMPLES.map((example) => (
          <button
            key={example.number}
            type="button"
            className="pill"
            style={{ padding: "4px 8px", fontSize: 11, fontFamily: FONT_MONO }}
            onClick={() => {
              setTrainNumber(example.number);
              void track(example.number);
            }}
            title={example.label}
          >
            {example.number}
          </button>
        ))}
      </div>

      {loading && !data && (
        <div className="grid gap-2" style={{ marginTop: 16 }}>
          <div className="skeleton" style={{ height: 70 }} />
          <div className="skeleton" style={{ height: 90 }} />
          <div className="skeleton" style={{ height: 150 }} />
        </div>
      )}

      {error && (
        <div
          style={{
            marginTop: 16,
            padding: 14,
            border: `1px solid ${LINE}`,
            borderRadius: 8,
            background: "#FBFCFD",
            fontSize: 13,
          }}
        >
          <div style={{ color: RED, fontWeight: 600, marginBottom: 4 }}>Live status unavailable</div>
          <div style={{ color: MUTED }}>{error}</div>
          <button
            type="button"
            className="btn-ghost"
            style={{ marginTop: 10, padding: "6px 12px", fontSize: 12 }}
            onClick={() => void track(trainNumber, true)}
          >
            Try again
          </button>
        </div>
      )}

      {data && (
        <div style={{ marginTop: 16, animation: "riseIn .3s ease" }} className="anim">
          <div
            className="flex flex-wrap items-start justify-between gap-3"
            style={{ paddingBottom: 12, borderBottom: `1px solid ${LINE}` }}
          >
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span style={{ fontWeight: 600, fontSize: 15 }}>{data.trainName}</span>
                <span style={{ fontFamily: FONT_MONO, fontSize: 11, color: MUTED }}>#{data.trainNumber}</span>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: data.isLive ? GREEN : BLUE_DARK,
                    background: data.isLive ? "#EAF5EE" : BLUE_LIGHT,
                    borderRadius: 3,
                    padding: "2px 6px",
                  }}
                >
                  {data.isLive ? "● LIVE" : "TIMETABLE"}
                </span>
              </div>
              <div style={{ fontSize: 11, color: MUTED, marginTop: 3 }}>
                {data.train.source?.name ?? "—"} → {data.train.destination?.name ?? "—"}
                {data.train.type ? ` · ${data.train.type}` : ""}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: FONT_MONO, fontSize: 11, color: MUTED }}>
                Updated {isoTime(data.lastUpdatedAt)} · {lastUpdated || "just now"}
              </div>
              <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>
                Run started {data.startDate}
              </div>
            </div>
          </div>

          <div
            className="grid gap-3"
            style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", marginTop: 14 }}
          >
            <div style={{ background: BLUE_LIGHT, borderRadius: 8, padding: 12 }}>
              <div className="flex items-center gap-1" style={{ fontSize: 10, color: MUTED, fontFamily: FONT_MONO }}>
                <MapPin size={11} /> CURRENT LOCATION
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>
                {data.currentLocation?.stationName ?? "Not reported"}
              </div>
              <div style={{ fontSize: 11, color: MUTED }}>
                {humanStatus(data.currentLocation?.status ?? data.status)}
                {data.currentLocation?.speedKmh != null ? ` · ${Math.round(data.currentLocation.speedKmh)} km/h` : ""}
              </div>
            </div>

            <div style={{ background: "#FBFCFD", border: `1px solid ${LINE}`, borderRadius: 8, padding: 12 }}>
              <div className="flex items-center gap-1" style={{ fontSize: 10, color: MUTED, fontFamily: FONT_MONO }}>
                <Navigation size={11} /> NEXT HALT
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>
                {data.nextHalt?.stationName ?? "—"}
              </div>
              <div style={{ fontSize: 11, color: MUTED }}>
                {nextStop ? `${stopTime(nextStop)}${delay > 0 ? ` · +${delay}m` : ""}` : "No further halts"}
              </div>
            </div>

            <div style={{ background: "#FBFCFD", border: `1px solid ${LINE}`, borderRadius: 8, padding: 12 }}>
              <div className="flex items-center gap-1" style={{ fontSize: 10, color: MUTED, fontFamily: FONT_MONO }}>
                <Clock size={11} /> RUNNING DELAY
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: delayColor, marginTop: 2, fontFamily: FONT_MONO }}>
                {delay > 0 ? `+${delay} min` : "On time"}
              </div>
              <div style={{ fontSize: 11, color: MUTED }}>{data.exceptions.length} active alerts</div>
            </div>

            <div style={{ background: "#FBFCFD", border: `1px solid ${LINE}`, borderRadius: 8, padding: 12 }}>
              <div className="flex items-center gap-1" style={{ fontSize: 10, color: MUTED, fontFamily: FONT_MONO }}>
                <Gauge size={11} /> ROUTE PROGRESS
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>
                {Math.max(currentIndex, 0) + 1} / {route.length || "—"} halts
              </div>
              <div style={{ height: 5, background: LINE, borderRadius: 3, marginTop: 6, overflow: "hidden" }}>
                <div
                  style={{
                    height: "100%",
                    width: `${Math.max(2, Math.min(100, progress))}%`,
                    background: ORANGE,
                    borderRadius: 3,
                    transition: "width .4s ease",
                  }}
                />
              </div>
            </div>
          </div>

          {data.exceptions.length > 0 && (
            <div
              style={{
                marginTop: 12,
                padding: 10,
                borderRadius: 6,
                background: "#FDF4E3",
                border: "1px solid #F3D9A5",
                fontSize: 12,
                color: "#7A4E00",
              }}
            >
              <div className="flex items-center gap-1" style={{ fontWeight: 600, marginBottom: 4 }}>
                <AlertTriangle size={13} /> Travel alerts
              </div>
              {data.exceptions.map((exception, index) => (
                <div key={index}>{exception.description ?? exception.type ?? "Service alert"}</div>
              ))}
            </div>
          )}

          <div style={{ marginTop: 16 }}>
            <div className="flex items-center justify-between gap-2" style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: MUTED, fontFamily: FONT_MONO }}>
                ROUTE &amp; LIVE TIMINGS
              </div>
              <span style={{ fontSize: 10, color: "#9AAAB8" }}>
                {showAll ? `${route.length} halts` : `showing ${visibleStops.length} of ${route.length}`}
              </span>
            </div>

            <div style={{ maxHeight: showAll ? 420 : undefined, overflowY: showAll ? "auto" : undefined, paddingRight: showAll ? 4 : 0 }}>
              {visibleStops.map((stop, index) => (
                <StopRow
                  key={`${stop.sequence}-${stop.stationCode}`}
                  stop={stop}
                  currentSequence={currentSequence}
                  isLast={index === visibleStops.length - 1}
                />
              ))}
            </div>

            {route.length > visibleStops.length || showAll ? (
              <button
                type="button"
                className="btn-ghost flex items-center gap-1"
                style={{ marginTop: 4, padding: "6px 10px", fontSize: 12 }}
                onClick={() => setShowAll((value) => !value)}
              >
                {showAll ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                {showAll ? "Show fewer stops" : `Show full route (${route.length} halts)`}
              </button>
            ) : null}
          </div>

          <p style={{ fontSize: 10, color: "#9AAAB8", marginTop: 12, marginBottom: 0 }}>
            Live positions come from RailRadar's crowdsourced GPS and are validated against the route.
            Timings can change — always check the platform display before boarding.
          </p>
        </div>
      )}
    </div>
  );
}
