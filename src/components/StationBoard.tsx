import { useCallback, useEffect, useState } from "react";
import { Clock, RefreshCw, TrainFront } from "lucide-react";
import {
  friendlyApiError,
  getStationLive,
  type StationLiveData,
  type StationLiveTrain,
} from "@/lib/railradar";
import { AMBER, BLUE_DARK, BLUE_LIGHT, FONT_MONO, GREEN, LINE, MUTED, RED, TEXT } from "@/theme";

function isoTime(value?: string | null): string {
  if (!value) return "—";
  const match = value.match(/T(\d{2}:\d{2})/);
  return match ? match[1] : value;
}

function statusBadge(train: StationLiveTrain) {
  const delay = train.live.delayMinutes ?? 0;
  const type = train.live.type;

  if (type === "cancelled") {
    return { label: "Cancelled", color: RED, background: "#FDECEC" };
  }
  if (type === "at-station") {
    return { label: "At platform", color: BLUE_DARK, background: BLUE_LIGHT };
  }
  if (type === "departed") {
    return { label: "Departed", color: MUTED, background: "#F1F4F7" };
  }
  if (type === "not-started") {
    return { label: "Not started", color: "#6B4FA0", background: "#F3EFFA" };
  }
  if (delay > 0) {
    return { label: `Late ${delay}m`, color: AMBER, background: "#FDF4E3" };
  }
  return { label: "On time", color: GREEN, background: "#EAF5EE" };
}

export default function StationBoard({
  stationCode = "R",
  stationName = "Raipur Jn",
}: {
  stationCode?: string;
  stationName?: string;
}) {
  const [hours, setHours] = useState<2 | 4 | 6 | 8>(4);
  const [data, setData] = useState<StationLiveData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string>("");

  const load = useCallback(
    async (force = false) => {
      setLoading(true);
      setError(null);
      try {
        const result = await getStationLive(stationCode, hours, force);
        setData(result);
        setUpdatedAt(
          new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false })
        );
      } catch (err) {
        setError(friendlyApiError(err));
      } finally {
        setLoading(false);
      }
    },
    [hours, stationCode]
  );

  useEffect(() => {
    void load(false);
  }, [load]);

  return (
    <div className="card" style={{ padding: 20 }}>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-1">
        <div>
          <div className="flex items-center gap-2">
            <span className="live-dot" />
            <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Live station board</h3>
          </div>
          <p style={{ fontSize: 12, color: MUTED, margin: "4px 0 0" }}>
            {stationName} ({stationCode}) · arrivals &amp; departures · times in IST
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            className="field"
            style={{ width: "auto", padding: "6px 8px", fontSize: 12 }}
            value={hours}
            onChange={(event) => setHours(Number(event.target.value) as 2 | 4 | 6 | 8)}
            aria-label="Board time window"
          >
            {[2, 4, 6, 8].map((value) => (
              <option key={value} value={value}>
                Next {value}h
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn-ghost flex items-center gap-1"
            style={{ padding: "6px 10px", fontSize: 12 }}
            onClick={() => void load(true)}
            disabled={loading}
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : undefined} />
            Refresh
          </button>
        </div>
      </div>

      {data && !error && (
        <div style={{ fontSize: 11, color: "#8A99A8", margin: "10px 0 4px", fontFamily: FONT_MONO }}>
          Window {data.window.from}–{data.window.to} · {data.count} trains · updated {updatedAt || "just now"}
        </div>
      )}

      {loading && !data && (
        <div className="grid gap-2" style={{ marginTop: 14 }}>
          {[0, 1, 2, 3].map((row) => (
            <div key={row} className="skeleton" style={{ height: 58 }} />
          ))}
        </div>
      )}

      {error && (
        <div
          style={{
            marginTop: 14,
            padding: 14,
            borderRadius: 8,
            border: `1px solid ${LINE}`,
            background: "#FBFCFD",
            fontSize: 13,
            color: MUTED,
          }}
        >
          <div style={{ color: RED, fontWeight: 600, marginBottom: 4 }}>Couldn’t load the live board</div>
          <div>{error}</div>
          <button
            type="button"
            className="btn-ghost"
            style={{ marginTop: 10, padding: "6px 12px", fontSize: 12 }}
            onClick={() => void load(true)}
          >
            Try again
          </button>
        </div>
      )}

      {!loading && !error && data && data.trains.length === 0 && (
        <div style={{ padding: "24px 0", textAlign: "center", color: MUTED, fontSize: 13 }}>
          No trains in the next {hours} hours. Try a larger window.
        </div>
      )}

      {!error && data && data.trains.length > 0 && (
        <div style={{ marginTop: 8 }}>
          {data.trains.map((item, index) => {
            const badge = statusBadge(item);
            const hasDeparture = Boolean(item.stop.departure);
            const scheduled = hasDeparture ? item.stop.departure : item.stop.arrival;
            const expected = hasDeparture
              ? item.live.expectedDepartureTime
              : item.live.expectedArrivalTime;
            const delay = item.live.delayMinutes ?? 0;

            return (
              <div
                key={`${item.train.number}-${item.stop.sequence}-${index}`}
                style={{
                  display: "grid",
                  gridTemplateColumns: "58px minmax(0, 1fr) auto",
                  gap: 12,
                  alignItems: "center",
                  padding: "10px 0",
                  borderTop: index === 0 ? "none" : `1px solid ${LINE}`,
                }}
              >
                <div>
                  <div style={{ fontFamily: FONT_MONO, fontSize: 15, fontWeight: 600 }}>{scheduled ?? "—"}</div>
                  {delay > 0 && expected && (
                    <div style={{ fontFamily: FONT_MONO, fontSize: 11, color: AMBER }}>
                      {isoTime(expected)}
                    </div>
                  )}
                  <div style={{ fontSize: 10, color: "#9AAAB8", marginTop: 2 }}>
                    {hasDeparture ? "Dep" : "Arr"}
                  </div>
                </div>

                <div style={{ minWidth: 0 }}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <TrainFront size={13} color={BLUE_DARK} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: TEXT }}>{item.train.name}</span>
                    <span style={{ fontFamily: FONT_MONO, fontSize: 11, color: MUTED }}>
                      #{item.train.number}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>
                    {item.train.source ?? "—"} → {item.train.destination ?? "—"}
                    {item.stop.platform ? ` · Platform ${item.stop.platform}` : ""}
                  </div>
                </div>

                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: badge.color,
                    background: badge.background,
                    padding: "4px 8px",
                    borderRadius: 4,
                    whiteSpace: "nowrap",
                  }}
                >
                  {badge.label}
                </span>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex items-center gap-1" style={{ marginTop: 12, fontSize: 10, color: "#9AAAB8" }}>
        <Clock size={11} />
        Live data from RailRadar · auto-refreshes when you reopen this page
      </div>
    </div>
  );
}
