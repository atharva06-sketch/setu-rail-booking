import { useState, useMemo } from "react";
import {
  ArrowLeftRight,
  MapPin,
  Check,
  Ticket,
  Smartphone,
  CreditCard,
  Building2,
  ChevronLeft,
  TrainFront,
  Clock,
  Search,
} from "lucide-react";

/* ---------- Theme tokens: official blue-and-white ---------- */
const BLUE_DARK = "#0B3C6B";
const BLUE = "#14588F";
const BLUE_LIGHT = "#EAF1F8";
const WHITE = "#FFFFFF";
const TEXT = "#1B2733";
const MUTED = "#5B6B7A";
const LINE = "#D7E1EA";
const ORANGE = "#F5821F";
const ORANGE_DARK = "#D96E12";
const GREEN = "#2E7D46";
const RED = "#C1272D";
const AMBER = "#C97A0A";

const FONT_MONO = "'IBM Plex Mono', ui-monospace, monospace";
const FONT_BODY = "'IBM Plex Sans', system-ui, sans-serif";

const STATIONS = [
  { name: "Raipur Junction", code: "R" },
  { name: "Durg", code: "DURG" },
  { name: "Bhilai Power House", code: "BPHB" },
  { name: "Bilaspur Junction", code: "BSP" },
  { name: "Rajnandgaon", code: "RJN" },
  { name: "Nagpur", code: "NGP" },
  { name: "Howrah Junction", code: "HWH" },
  { name: "Mumbai CST", code: "CSTM" },
  { name: "New Delhi", code: "NDLS" },
  { name: "Visakhapatnam", code: "VSKP" },
];

const QUOTAS = [
  { id: "general", label: "General" },
  { id: "tatkal", label: "Tatkal" },
  { id: "premium", label: "Premium Tatkal" },
  { id: "ladies", label: "Ladies" },
];

const CLASS_LABELS = [
  { code: "SL", label: "Sleeper" },
  { code: "3A", label: "AC 3 Tier" },
  { code: "2A", label: "AC 2 Tier" },
  { code: "1A", label: "AC First" },
  { code: "CC", label: "Chair Car" },
];

const TRAIN_TEMPLATES = [
  { number: "18237", name: "Chhattisgarh Express", toName: "New Delhi", toCode: "NDLS", base: 1.1 },
  { number: "20825", name: "Vande Bharat Express", toName: "Visakhapatnam", toCode: "VSKP", base: 1.6 },
  { number: "18111", name: "Hirakud Express", toName: "Mumbai CST", toCode: "CSTM", base: 1.0 },
  { number: "12854", name: "Raipur–Howrah SF Express", toName: "Howrah Junction", toCode: "HWH", base: 1.2 },
  { number: "18201", name: "Chhattisgarh SF Express", toName: "Bilaspur Junction", toCode: "BSP", base: 0.5 },
];

const STATUS_STYLES = {
  Available: { color: GREEN },
  RAC: { color: AMBER },
  Waitlist: { color: RED },
};

const BAY_PATTERN = ["Lower", "Middle", "Upper", "Lower", "Middle", "Upper", "Side Lower", "Side Upper"];

function pad(n) {
  return n < 10 ? "0" + n : "" + n;
}
function addMinutes(hh, mm, add) {
  const total = hh * 60 + mm + add;
  const d = Math.floor(total / 1440);
  const rem = ((total % 1440) + 1440) % 1440;
  return { hh: Math.floor(rem / 60), mm: rem % 60, dayOffset: d };
}
function formatDuration(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}h ${pad(m)}m`;
}
function stationLabel(s) {
  return `${s.name} (${s.code})`;
}
function findStation(str) {
  return STATIONS.find((s) => stationLabel(s).toLowerCase() === str.trim().toLowerCase()) || null;
}

function generateTrains(fromLabel, toLabel, quota) {
  const seed = (fromLabel + toLabel).split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const tatkalMult = quota === "tatkal" ? 1.25 : quota === "premium" ? 1.5 : 1;
  return TRAIN_TEMPLATES.map((t, i) => {
    const depH = (5 + i * 4 + (seed % 3)) % 24;
    const depM = (i * 17 + seed) % 60;
    const durMin = 240 + ((seed + i * 53) % 420);
    const arr = addMinutes(depH, depM, durMin);
    const classes = {};
    CLASS_LABELS.forEach((c, ci) => {
      const priceBase = [420, 980, 1450, 2350, 650][ci] * t.base * tatkalMult;
      const roll = (seed + i * 31 + ci * 13) % 10;
      let status = "Available";
      let count = 40 - roll * 3;
      if (roll > 7) {
        status = "Waitlist";
        count = roll * 4;
      } else if (roll > 4) {
        status = "RAC";
        count = roll * 2;
      }
      classes[c.code] = { price: Math.round(priceBase / 5) * 5, status, count };
    });
    return {
      id: t.number + "-" + i,
      number: t.number,
      name: t.name,
      dep: `${pad(depH)}:${pad(depM)}`,
      arr: `${pad(arr.hh)}:${pad(arr.mm)}`,
      dayOffset: arr.dayOffset,
      durMin,
      classes,
    };
  });
}

/* seat grid: 72 seats per coach, bays of 8 */
function generateSeatMap(coachId) {
  const seed = coachId.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return Array.from({ length: 72 }, (_, i) => {
    const bayPos = i % 8;
    const booked = (seed + i * 7) % 5 === 0;
    return {
      num: i + 1,
      type: BAY_PATTERN[bayPos],
      booked,
    };
  });
}

function runningStatusTimeline(trainId) {
  const stops = ["Bilaspur Jn", "Raipur Jn", "Durg", "Rajnandgaon", "Nagpur"];
  const seed = trainId.split("-")[0].split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const currentIdx = seed % stops.length;
  return stops.map((name, i) => ({
    name,
    status: i < currentIdx ? "Departed" : i === currentIdx ? "Arrived" : "Upcoming",
    time: `${pad((6 + i * 2) % 24)}:${pad((seed + i * 11) % 60)}`,
    platform: i === currentIdx ? 1 + ((seed + i) % 6) : null,
    delay: i === currentIdx ? (seed % 20) : 0,
  }));
}

function TearLine() {
  return (
    <div style={{ position: "relative", height: 1, margin: "0 -20px" }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, borderTop: `2px dashed ${LINE}` }} />
      <div style={{ position: "absolute", left: -10, top: -9, width: 18, height: 18, borderRadius: "50%", background: WHITE }} />
      <div style={{ position: "absolute", right: -10, top: -9, width: 18, height: 18, borderRadius: "50%", background: WHITE }} />
    </div>
  );
}

function StepTrail({ step }) {
  const steps = ["Search", "Select train", "Seats", "Details", "Payment", "Ticket"];
  const idx = { search: 0, results: 1, seats: 2, passengers: 3, payment: 4, confirm: 5 }[step];
  return (
    <div className="flex items-center gap-1 flex-wrap" style={{ fontFamily: FONT_MONO }}>
      {steps.map((s, i) => (
        <div key={s} className="flex items-center gap-1">
          <span
            className="flex items-center justify-center"
            style={{
              width: 20, height: 20, fontSize: 11, borderRadius: "50%",
              background: i <= idx ? BLUE_DARK : "transparent",
              color: i <= idx ? "#fff" : "#9AAAB8",
              border: `1px solid ${i <= idx ? BLUE_DARK : LINE}`,
            }}
          >
            {i < idx ? "✓" : i + 1}
          </span>
          <span style={{ fontSize: 11, color: i <= idx ? TEXT : "#9AAAB8" }}>{s}</span>
          {i < steps.length - 1 && <span style={{ width: 12, height: 1, background: LINE, display: "inline-block", margin: "0 2px" }} />}
        </div>
      ))}
    </div>
  );
}

export default function TrainBooking() {
  const [step, setStep] = useState("search");
  const [form, setForm] = useState({
    from: stationLabel(STATIONS[0]),
    to: stationLabel(STATIONS[1]),
    date: "",
    cls: "SL",
    quota: "general",
    count: 1,
  });
  const [search, setSearch] = useState(null);
  const [trains, setTrains] = useState([]);
  const [selectedTrain, setSelectedTrain] = useState(null);
  const [selectedClass, setSelectedClass] = useState(null);
  const [coach, setCoach] = useState("S1");
  const [seatMaps, setSeatMaps] = useState({});
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [passengers, setPassengers] = useState([]);
  const [contact, setContact] = useState({ email: "", phone: "" });
  const [payMethod, setPayMethod] = useState("upi");
  const [processing, setProcessing] = useState(false);
  const [pnr, setPnr] = useState("");
  const [errors, setErrors] = useState({});
  const [statusTrainId, setStatusTrainId] = useState(null);

  const popularTrains = useMemo(() => generateTrains("Raipur Junction (R)", "Popular", "general"), []);
  const statusOptions = popularTrains;
  const activeStatusId = statusTrainId || statusOptions[0]?.id;
  const timeline = useMemo(() => runningStatusTimeline(activeStatusId || "seed"), [activeStatusId]);

  function todayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }
  function swapCities() {
    setForm((f) => ({ ...f, from: f.to, to: f.from }));
  }
  function runSearch(overrides = {}) {
    const f = { ...form, ...overrides };
    const errs = {};
    if (!findStation(f.from)) errs.from = "Pick a valid station";
    if (!findStation(f.to)) errs.to = "Pick a valid station";
    if (f.from.trim().toLowerCase() === f.to.trim().toLowerCase()) errs.to = "Destination must differ from origin";
    if (!f.date) errs.date = "Pick a date of travel";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setForm(f);
    setSearch(f);
    setTrains(generateTrains(f.from, f.to, f.quota));
    setStep("results");
  }
  function handleSearch(e) {
    e.preventDefault();
    runSearch();
  }
  function bookPopular(t) {
    runSearch({ from: stationLabel(STATIONS[0]), to: `${t.toName} (${t.toCode})`, date: form.date || todayStr() });
  }

  function chooseClass(train, classCode) {
    setSelectedTrain(train);
    setSelectedClass(classCode);
    setCoach("S1");
    setSeatMaps({ S1: generateSeatMap(train.number + "S1") });
    setSelectedSeats([]);
    setStep("seats");
  }

  function ensureCoachMap(id) {
    setSeatMaps((m) => (m[id] ? m : { ...m, [id]: generateSeatMap(selectedTrain.number + id) }));
  }
  function switchCoach(id) {
    setCoach(id);
    ensureCoachMap(id);
  }

  function toggleSeat(seat) {
    if (seat.booked) return;
    const key = `${coach}-${seat.num}`;
    setSelectedSeats((prev) => {
      const exists = prev.find((s) => s.key === key);
      if (exists) return prev.filter((s) => s.key !== key);
      if (prev.length >= form.count) return prev;
      return [...prev, { key, coach, num: seat.num, type: seat.type }];
    });
  }

  function seatFare() {
    if (!selectedTrain || !selectedClass) return 0;
    return selectedTrain.classes[selectedClass].price * selectedSeats.length;
  }

  function proceedFromSeats() {
    setPassengers(
      selectedSeats.map(() => ({ name: "", age: "", gender: "Male" }))
    );
    setStep("passengers");
  }

  function updatePassenger(i, field, value) {
    setPassengers((arr) => arr.map((p, idx) => (idx === i ? { ...p, [field]: value } : p)));
  }

  function totalFare() {
    if (!selectedTrain || !selectedClass) return 0;
    return selectedTrain.classes[selectedClass].price * selectedSeats.length + 40;
  }

  function handlePassengerSubmit(e) {
    e.preventDefault();
    const errs = {};
    passengers.forEach((p, i) => {
      if (!p.name.trim()) errs[`name${i}`] = "Required";
      if (!p.age || p.age < 1 || p.age > 120) errs[`age${i}`] = "Enter a valid age";
    });
    if (!contact.email.trim() || !contact.email.includes("@")) errs.email = "Enter a valid email";
    if (!contact.phone.trim() || contact.phone.trim().length < 10) errs.phone = "Enter a 10-digit number";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setStep("payment");
  }

  function handlePay() {
    setProcessing(true);
    setTimeout(() => {
      const rand = Math.random().toString(36).slice(2, 8).toUpperCase().replace(/[^A-Z0-9]/g, "4");
      setPnr(rand.padEnd(6, "7"));
      setProcessing(false);
      setStep("confirm");
    }, 1100);
  }

  function resetAll() {
    setStep("search");
    setSearch(null);
    setSelectedTrain(null);
    setSelectedClass(null);
    setSelectedSeats([]);
    setPassengers([]);
    setContact({ email: "", phone: "" });
    setPnr("");
    setErrors({});
  }

  const coaches = ["S1", "S2", "S3", "B1", "B2"];

  return (
    <div style={{ background: BLUE_LIGHT, color: TEXT, fontFamily: FONT_BODY, minHeight: "100%", width: "100%" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        input, select { font-family: ${FONT_BODY}; }
        input:focus, select:focus, button:focus { outline: 2px solid ${BLUE_DARK}; outline-offset: 2px; }
        @media (prefers-reduced-motion: reduce) { .anim { animation: none !important; transition: none !important; } }
        @keyframes riseIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .pill { border: 1px solid ${LINE}; background: #fff; cursor: pointer; transition: background .15s, border-color .15s, color .15s; border-radius: 6px; }
        .pill.active { background: ${BLUE_DARK}; border-color: ${BLUE_DARK}; color: #fff; }
        .btn-primary { background: ${ORANGE}; color: #fff; border: none; cursor: pointer; transition: background .15s; border-radius: 6px; font-weight: 600; }
        .btn-primary:hover { background: ${ORANGE_DARK}; }
        .btn-primary:disabled { opacity: .55; cursor: not-allowed; }
        .btn-ghost { background: transparent; border: 1px solid ${BLUE_DARK}; color: ${BLUE_DARK}; cursor: pointer; border-radius: 6px; }
        .field { border: 1px solid ${LINE}; background: #fff; padding: 10px 12px; width: 100%; font-size: 14px; color: ${TEXT}; border-radius: 6px; }
        .card { background: #fff; border: 1px solid ${LINE}; border-radius: 8px; box-shadow: 0 1px 2px rgba(11,60,107,0.06); }
        .card-hover:hover { border-color: ${BLUE}; }
        .seat-btn { width: 34px; height: 34px; border-radius: 6px; font-family: ${FONT_MONO}; font-size: 11px; display:flex; align-items:center; justify-content:center; cursor:pointer; border: 1px solid ${LINE}; background:#fff; }
        .seat-btn.booked { background: #EDEFF2; color: #A6AEB6; border-color: #E1E4E8; cursor: not-allowed; }
        .seat-btn.selected { background: ${GREEN}; color: #fff; border-color: ${GREEN}; }
        .scroll-row { display: flex; gap: 12px; overflow-x: auto; padding-bottom: 6px; }
        .scroll-row::-webkit-scrollbar { height: 6px; }
        .scroll-row::-webkit-scrollbar-thumb { background: ${LINE}; border-radius: 3px; }
      `}</style>

      {/* Header */}
      <header style={{ background: BLUE_DARK, color: "#fff" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", padding: "14px 20px" }} className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrainFront size={24} color={ORANGE} />
            <span style={{ fontFamily: FONT_MONO, fontWeight: 600, fontSize: 18 }}>Setu Rail</span>
          </div>
          <span style={{ fontSize: 12, color: "#BFD3E6" }}>Raipur Division</span>
        </div>
        <div style={{ height: 4, background: ORANGE }} />
      </header>

      <main style={{ maxWidth: 1000, margin: "0 auto", padding: "0 0 60px" }}>
        {step !== "search" && (
          <div style={{ padding: "20px 20px 0" }}>
            <StepTrail step={step} />
          </div>
        )}

        {/* SEARCH / HOME */}
        {step === "search" && (
          <div>
            <div style={{ background: BLUE_DARK, backgroundImage: `linear-gradient(160deg, ${BLUE_DARK}, ${BLUE})`, padding: "36px 20px 90px" }}>
              <div style={{ maxWidth: 960, margin: "0 auto" }}>
                <h1 style={{ color: "#fff", fontSize: 28, fontWeight: 600, margin: "0 0 4px" }}>Book your train ticket</h1>
                <p style={{ color: "#CFE0EE", fontSize: 14, margin: 0 }}>Raipur Junction and beyond — search, select seats, and pay in minutes.</p>
              </div>
            </div>

            <div style={{ maxWidth: 960, margin: "-60px auto 0", padding: "0 20px" }}>
              <form onSubmit={handleSearch} className="card" style={{ padding: 20 }}>
                <div className="flex flex-wrap gap-2 mb-4">
                  {QUOTAS.map((q) => (
                    <button
                      type="button"
                      key={q.id}
                      onClick={() => setForm({ ...form, quota: q.id })}
                      className={"pill" + (form.quota === q.id ? " active" : "")}
                      style={{ padding: "6px 12px", fontSize: 12 }}
                    >
                      {q.label}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end mb-4">
                  <div>
                    <label style={{ fontSize: 12, color: MUTED }}>From station</label>
                    <select className="field" value={form.from} onChange={(e) => setForm({ ...form, from: e.target.value })}>
                      {STATIONS.map((s) => (
                        <option value={stationLabel(s)} key={s.code}>{stationLabel(s)}</option>
                      ))}
                    </select>
                    {errors.from && <div style={{ color: RED, fontSize: 12, marginTop: 4 }}>{errors.from}</div>}
                  </div>
                  <div className="flex items-end gap-2">
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: 12, color: MUTED }}>To station</label>
                      <select className="field" value={form.to} onChange={(e) => setForm({ ...form, to: e.target.value })}>
                        {STATIONS.map((s) => (
                          <option value={stationLabel(s)} key={s.code}>{stationLabel(s)}</option>
                        ))}
                      </select>
                      {errors.to && <div style={{ color: RED, fontSize: 12, marginTop: 4 }}>{errors.to}</div>}
                    </div>
                    <button type="button" onClick={swapCities} className="btn-ghost" aria-label="Swap stations" style={{ padding: 10, height: 42 }}>
                      <ArrowLeftRight size={16} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label style={{ fontSize: 12, color: MUTED }}>Date of journey</label>
                    <input className="field" type="date" min={todayStr()} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                    {errors.date && <div style={{ color: RED, fontSize: 12, marginTop: 4 }}>{errors.date}</div>}
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: MUTED }}>Class</label>
                    <select className="field" value={form.cls} onChange={(e) => setForm({ ...form, cls: e.target.value })}>
                      {CLASS_LABELS.map((c) => (
                        <option value={c.code} key={c.code}>{c.label} ({c.code})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: MUTED }}>Passengers</label>
                    <select className="field" value={form.count} onChange={(e) => setForm({ ...form, count: Number(e.target.value) })}>
                      {[1, 2, 3, 4, 5, 6].map((n) => (
                        <option value={n} key={n}>{n}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <button type="submit" className="btn-primary flex items-center justify-center gap-2" style={{ padding: "12px 20px", fontSize: 15, width: "100%" }}>
                  <Search size={16} /> Search trains
                </button>
              </form>

              {/* Popular Trains from Raipur */}
              <div style={{ marginTop: 32 }}>
                <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>Popular trains from Raipur</h2>
                <div className="scroll-row">
                  {popularTrains.map((t) => (
                    <div key={t.id} className="card card-hover" style={{ minWidth: 220, padding: 16, flex: "0 0 auto" }}>
                      <div style={{ fontFamily: FONT_MONO, fontSize: 11, color: MUTED }}>#{t.number}</div>
                      <div style={{ fontWeight: 600, fontSize: 14, margin: "2px 0 8px" }}>{t.name}</div>
                      <div style={{ fontSize: 12, color: MUTED, marginBottom: 10 }}>
                        Raipur Jn (R) → {TRAIN_TEMPLATES.find((x) => x.number === t.number)?.toCode}
                      </div>
                      <div className="flex justify-between items-center">
                        <span style={{ fontFamily: FONT_MONO, fontSize: 13 }}>{t.dep}</span>
                        <button onClick={() => bookPopular(t)} className="btn-ghost" style={{ padding: "6px 10px", fontSize: 12 }}>
                          Book
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Live Train Running Status */}
              <div style={{ marginTop: 32, marginBottom: 40 }}>
                <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>Live train running status</h2>
                <div className="card" style={{ padding: 20 }}>
                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    <label style={{ fontSize: 12, color: MUTED }}>Train:</label>
                    <select
                      className="field"
                      style={{ width: "auto", minWidth: 200 }}
                      value={activeStatusId}
                      onChange={(e) => setStatusTrainId(e.target.value)}
                    >
                      {statusOptions.map((t) => (
                        <option value={t.id} key={t.id}>{t.number} · {t.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-0">
                    {timeline.map((s, i) => (
                      <div key={s.name} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <span
                            style={{
                              width: 12, height: 12, borderRadius: "50%",
                              background: s.status === "Upcoming" ? "#fff" : s.status === "Arrived" ? ORANGE : GREEN,
                              border: `2px solid ${s.status === "Upcoming" ? LINE : s.status === "Arrived" ? ORANGE : GREEN}`,
                            }}
                          />
                          {i < timeline.length - 1 && <span style={{ width: 2, flex: 1, background: LINE, minHeight: 28 }} />}
                        </div>
                        <div style={{ paddingBottom: 20 }}>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>
                            {s.name} {s.status === "Arrived" && s.platform && <span style={{ fontWeight: 400, color: MUTED }}>· Platform {s.platform}</span>}
                          </div>
                          <div style={{ fontSize: 12, color: MUTED, fontFamily: FONT_MONO }}>
                            {s.status} · {s.time}{s.status === "Arrived" && s.delay > 0 ? ` · running late by ${s.delay} min` : ""}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p style={{ fontSize: 11, color: "#9AAAB8", marginTop: 4 }}>Sample status for demonstration — not live data.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div style={{ padding: step === "search" ? 0 : "20px" }}>
          {/* RESULTS */}
          {step === "results" && search && (
            <div>
              <button onClick={() => setStep("search")} className="btn-ghost flex items-center gap-1 mb-4" style={{ padding: "6px 10px", fontSize: 13, border: "none" }}>
                <ChevronLeft size={16} /> Modify search
              </button>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <MapPin size={16} color={BLUE_DARK} />
                <span style={{ fontWeight: 600 }}>{search.from}</span>
                <ArrowLeftRight size={13} color={MUTED} />
                <span style={{ fontWeight: 600 }}>{search.to}</span>
              </div>
              <p style={{ color: MUTED, fontSize: 13, marginBottom: 20 }}>
                {search.date} · {QUOTAS.find((q) => q.id === search.quota)?.label} · {search.count} passenger{search.count > 1 ? "s" : ""} · {trains.length} trains found
              </p>

              <div className="grid gap-4">
                {trains.map((t) => (
                  <div key={t.id} className="card card-hover" style={{ padding: 18 }}>
                    <div className="flex flex-wrap justify-between gap-3 mb-3">
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 15 }}>{t.name}</div>
                        <div style={{ fontFamily: FONT_MONO, fontSize: 12, color: MUTED }}>#{t.number}</div>
                      </div>
                      <div style={{ fontFamily: FONT_MONO, fontSize: 12, color: MUTED }}>{formatDuration(t.durMin)}</div>
                    </div>
                    <div className="flex items-center gap-3 mb-4 flex-wrap">
                      <div style={{ fontFamily: FONT_MONO, fontSize: 22, fontWeight: 600 }}>{t.dep}</div>
                      <div style={{ flex: "1 1 60px", minWidth: 40, borderTop: `1px dashed ${LINE}`, position: "relative", top: -6 }} />
                      <div style={{ fontFamily: FONT_MONO, fontSize: 22, fontWeight: 600 }}>
                        {t.arr}{t.dayOffset > 0 && <sup style={{ fontSize: 11, color: ORANGE_DARK }}> +{t.dayOffset}d</sup>}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {CLASS_LABELS.map((c) => {
                        const info = t.classes[c.code];
                        const st = STATUS_STYLES[info.status];
                        return (
                          <button key={c.code} onClick={() => chooseClass(t, c.code)} className="pill" style={{ padding: "8px 12px", textAlign: "left", minWidth: 96 }}>
                            <div style={{ fontSize: 12, fontWeight: 600 }}>{c.code}</div>
                            <div style={{ fontFamily: FONT_MONO, fontSize: 13 }}>₹{info.price}</div>
                            <div style={{ fontSize: 10, color: st.color }}>
                              {info.status === "Available" ? `${info.count} left` : `${info.status} ${info.count}`}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SEAT SELECTION */}
          {step === "seats" && selectedTrain && (
            <div style={{ paddingBottom: 80 }}>
              <button onClick={() => setStep("results")} className="btn-ghost flex items-center gap-1 mb-4" style={{ padding: "6px 10px", fontSize: 13, border: "none" }}>
                <ChevronLeft size={16} /> Back to trains
              </button>
              <div className="card" style={{ padding: 16, marginBottom: 16 }} className="flex flex-wrap justify-between gap-2 card">
                <div>
                  <div style={{ fontWeight: 600 }}>{selectedTrain.name} · #{selectedTrain.number}</div>
                  <div style={{ fontSize: 13, color: MUTED }}>{search.from} {selectedTrain.dep} → {search.to} {selectedTrain.arr}</div>
                </div>
                <div style={{ fontFamily: FONT_MONO, fontSize: 13, alignSelf: "center" }}>
                  {CLASS_LABELS.find((c) => c.code === selectedClass)?.label}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                {coaches.map((c) => (
                  <button key={c} onClick={() => switchCoach(c)} className={"pill" + (coach === c ? " active" : "")} style={{ padding: "6px 12px", fontSize: 13, fontFamily: FONT_MONO }}>
                    {c}
                  </button>
                ))}
              </div>

              <div className="card" style={{ padding: 20 }}>
                <p style={{ fontSize: 12, color: MUTED, marginBottom: 14 }}>
                  Tap a seat to select ({selectedSeats.length}/{form.count} chosen). Grey seats are already booked.
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 34px)", gap: 8, justifyContent: "start" }}>
                  {(seatMaps[coach] || []).map((seat) => {
                    const key = `${coach}-${seat.num}`;
                    const isSelected = selectedSeats.some((s) => s.key === key);
                    return (
                      <button
                        key={seat.num}
                        title={`Seat ${seat.num} · ${seat.type}`}
                        onClick={() => toggleSeat(seat)}
                        className={"seat-btn" + (seat.booked ? " booked" : isSelected ? " selected" : "")}
                      >
                        {seat.num}
                      </button>
                    );
                  })}
                </div>
                <div className="flex flex-wrap gap-4 mt-5" style={{ fontSize: 12, color: MUTED }}>
                  <span className="flex items-center gap-1"><span style={{ width: 12, height: 12, borderRadius: 3, background: "#fff", border: `1px solid ${LINE}`, display: "inline-block" }} /> Available</span>
                  <span className="flex items-center gap-1"><span style={{ width: 12, height: 12, borderRadius: 3, background: GREEN, display: "inline-block" }} /> Selected</span>
                  <span className="flex items-center gap-1"><span style={{ width: 12, height: 12, borderRadius: 3, background: "#EDEFF2", border: "1px solid #E1E4E8", display: "inline-block" }} /> Booked</span>
                </div>
              </div>

              {/* Sticky price bar */}
              <div
                className="card"
                style={{
                  position: "sticky", bottom: 12, marginTop: 16, padding: 14,
                  display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10,
                }}
              >
                <div style={{ fontSize: 13 }}>
                  {selectedSeats.length} seat{selectedSeats.length !== 1 ? "s" : ""} selected ·{" "}
                  <span style={{ fontFamily: FONT_MONO, fontWeight: 600 }}>₹{seatFare()}</span>
                </div>
                <button
                  disabled={selectedSeats.length !== form.count}
                  onClick={proceedFromSeats}
                  className="btn-primary"
                  style={{ padding: "10px 18px", fontSize: 14 }}
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* PASSENGER DETAILS */}
          {step === "passengers" && selectedTrain && (
            <div>
              <button onClick={() => setStep("seats")} className="btn-ghost flex items-center gap-1 mb-4" style={{ padding: "6px 10px", fontSize: 13, border: "none" }}>
                <ChevronLeft size={16} /> Back to seats
              </button>
              <form onSubmit={handlePassengerSubmit} className="grid gap-4">
                {passengers.map((p, i) => (
                  <div key={i} className="card" style={{ padding: 16 }}>
                    <div style={{ fontSize: 12, color: MUTED, marginBottom: 10, fontFamily: FONT_MONO }}>
                      Passenger {i + 1} · Coach {selectedSeats[i].coach}, Seat {selectedSeats[i].num} ({selectedSeats[i].type})
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label style={{ fontSize: 12, color: MUTED }}>Full name</label>
                        <input className="field" value={p.name} onChange={(e) => updatePassenger(i, "name", e.target.value)} />
                        {errors[`name${i}`] && <div style={{ color: RED, fontSize: 12 }}>{errors[`name${i}`]}</div>}
                      </div>
                      <div>
                        <label style={{ fontSize: 12, color: MUTED }}>Age</label>
                        <input className="field" type="number" min="1" max="120" value={p.age} onChange={(e) => updatePassenger(i, "age", e.target.value)} />
                        {errors[`age${i}`] && <div style={{ color: RED, fontSize: 12 }}>{errors[`age${i}`]}</div>}
                      </div>
                      <div>
                        <label style={{ fontSize: 12, color: MUTED }}>Gender</label>
                        <select className="field" value={p.gender} onChange={(e) => updatePassenger(i, "gender", e.target.value)}>
                          <option>Male</option><option>Female</option><option>Other</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
                <div className="card" style={{ padding: 16 }}>
                  <div style={{ fontSize: 12, color: MUTED, marginBottom: 10, fontFamily: FONT_MONO }}>Contact for ticket updates</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label style={{ fontSize: 12, color: MUTED }}>Email</label>
                      <input className="field" type="email" value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} />
                      {errors.email && <div style={{ color: RED, fontSize: 12 }}>{errors.email}</div>}
                    </div>
                    <div>
                      <label style={{ fontSize: 12, color: MUTED }}>Phone</label>
                      <input className="field" type="tel" value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} />
                      {errors.phone && <div style={{ color: RED, fontSize: 12 }}>{errors.phone}</div>}
                    </div>
                  </div>
                </div>
                <button type="submit" className="btn-primary" style={{ padding: "12px 20px", fontSize: 15, justifySelf: "start" }}>
                  Continue to payment
                </button>
              </form>
            </div>
          )}

          {/* PAYMENT */}
          {step === "payment" && selectedTrain && (
            <div>
              <button onClick={() => setStep("passengers")} className="btn-ghost flex items-center gap-1 mb-4" style={{ padding: "6px 10px", fontSize: 13, border: "none" }}>
                <ChevronLeft size={16} /> Back to details
              </button>
              <div className="grid gap-4" style={{ maxWidth: 480 }}>
                <div className="card" style={{ padding: 16 }}>
                  <div style={{ fontSize: 12, color: MUTED, marginBottom: 10, fontFamily: FONT_MONO }}>Fare summary</div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{CLASS_LABELS.find((c) => c.code === selectedClass)?.label} × {selectedSeats.length}</span>
                    <span style={{ fontFamily: FONT_MONO }}>₹{seatFare()}</span>
                  </div>
                  <div className="flex justify-between text-sm mb-2" style={{ color: MUTED }}>
                    <span>Convenience fee</span>
                    <span style={{ fontFamily: FONT_MONO }}>₹40</span>
                  </div>
                  <TearLine />
                  <div className="flex justify-between mt-2" style={{ fontWeight: 600 }}>
                    <span>Total</span>
                    <span style={{ fontFamily: FONT_MONO }}>₹{totalFare()}</span>
                  </div>
                </div>
                <div className="card" style={{ padding: 16 }}>
                  <div style={{ fontSize: 12, color: MUTED, marginBottom: 10, fontFamily: FONT_MONO }}>Pay with</div>
                  <div className="grid gap-2">
                    {[
                      { id: "upi", label: "UPI", icon: Smartphone },
                      { id: "card", label: "Debit / Credit card", icon: CreditCard },
                      { id: "netbanking", label: "Net banking", icon: Building2 },
                    ].map(({ id, label, icon: Icon }) => (
                      <label key={id} className="flex items-center gap-3" style={{ border: `1px solid ${payMethod === id ? BLUE_DARK : LINE}`, padding: 12, cursor: "pointer", borderRadius: 6 }}>
                        <input type="radio" name="pay" checked={payMethod === id} onChange={() => setPayMethod(id)} />
                        <Icon size={18} color={BLUE_DARK} />
                        <span style={{ fontSize: 14 }}>{label}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <button onClick={handlePay} disabled={processing} className="btn-primary" style={{ padding: "12px 20px", fontSize: 15 }}>
                  {processing ? "Processing payment…" : `Pay ₹${totalFare()}`}
                </button>
                <p style={{ fontSize: 11, color: "#9AAAB8" }}>Demo checkout — no real payment is made.</p>
              </div>
            </div>
          )}

          {/* CONFIRMATION */}
          {step === "confirm" && selectedTrain && (
            <div style={{ animation: "riseIn 0.4s ease" }} className="anim">
              <div className="flex items-center gap-2 mb-4" style={{ color: GREEN }}>
                <Check size={20} /><span style={{ fontWeight: 600 }}>Booking confirmed</span>
              </div>
              <div className="card">
                <div style={{ padding: 20 }} className="flex justify-between items-start flex-wrap gap-3">
                  <div>
                    <div style={{ fontSize: 12, color: MUTED, fontFamily: FONT_MONO }}>PNR</div>
                    <div style={{ fontSize: 26, fontFamily: FONT_MONO, fontWeight: 700, letterSpacing: 2 }}>{pnr}</div>
                  </div>
                  <Ticket size={26} color={ORANGE_DARK} />
                </div>
                <div style={{ padding: "0 20px 20px" }}>
                  <div style={{ fontWeight: 600, marginBottom: 2 }}>{selectedTrain.name} · #{selectedTrain.number}</div>
                  <div style={{ fontSize: 13, color: MUTED }}>{search.date} · {CLASS_LABELS.find((c) => c.code === selectedClass)?.label} · {QUOTAS.find((q) => q.id === search.quota)?.label}</div>
                </div>
                <div style={{ padding: "0 20px 20px" }} className="flex items-center gap-3">
                  <div>
                    <div style={{ fontFamily: FONT_MONO, fontSize: 22, fontWeight: 600 }}>{selectedTrain.dep}</div>
                    <div style={{ fontSize: 12, color: MUTED }}>{search.from}</div>
                  </div>
                  <div style={{ flex: 1, borderTop: `1px dashed ${LINE}` }} />
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontFamily: FONT_MONO, fontSize: 22, fontWeight: 600 }}>{selectedTrain.arr}</div>
                    <div style={{ fontSize: 12, color: MUTED }}>{search.to}</div>
                  </div>
                </div>
                <div style={{ padding: "0 20px" }}><TearLine /></div>
                <div style={{ padding: 20 }}>
                  <div style={{ fontSize: 12, color: MUTED, fontFamily: FONT_MONO, marginBottom: 10 }}>Passengers &amp; seats</div>
                  <div className="grid gap-2">
                    {passengers.map((p, i) => (
                      <div key={i} className="flex justify-between text-sm flex-wrap gap-1">
                        <span>{p.name} <span style={{ color: "#9AAAB8" }}>· {p.age}, {p.gender}</span></span>
                        <span style={{ fontFamily: FONT_MONO, fontSize: 12, color: MUTED }}>{selectedSeats[i].coach}-{selectedSeats[i].num} ({selectedSeats[i].type})</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between mt-4 pt-3" style={{ borderTop: `1px solid ${LINE}`, fontWeight: 600 }}>
                    <span>Amount paid</span>
                    <span style={{ fontFamily: FONT_MONO }}>₹{totalFare()}</span>
                  </div>
                </div>
              </div>
              <button onClick={resetAll} className="btn-ghost mt-5" style={{ padding: "10px 18px", fontSize: 14 }}>
                Book another journey
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
