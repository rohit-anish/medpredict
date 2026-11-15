import { useState, useEffect } from "react";
import Login from "./Login";
import Home from "./Home";
import { api, session } from "./api";
import { Brand } from "./ui";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

// ── Palette (mirrors CSS vars in index.css) ─────────────────────────────────
const C = {
  ink: "#0d1417",
  paper: "#ffffff",
  muted: "#5d6970",
  line: "#e2e7e9",
  soft: "#f5f7f7",
  alert: "#c4291f",
  accent: "#0f766e",
};

const AXIS_TICK = { fill: C.muted, fontSize: 11, fontFamily: "IBM Plex Mono, monospace" };
const TOOLTIP_STYLE = {
  background: C.paper,
  border: `2px solid ${C.ink}`,
  borderRadius: 8,
  fontFamily: "IBM Plex Mono, monospace",
  fontSize: 12,
};

// ── Default form values ──────────────────────────────────────────────────────
const DEFAULTS = {
  heart_rate: 75,
  respiratory_rate: 16,
  body_temperature: 36.6,
  oxygen_saturation: 98,
  systolic_bp: 118,
  diastolic_bp: 76,
  age: 35,
  weight_kg: 70,
  height_m: 1.72,
  ecg_qt_interval_ms: 380,
};

const FIELD_META = [
  {
    key: "heart_rate",
    label: "Heart Rate",
    unit: "bpm",
    min: 30,
    max: 200,
    step: 1,
  },
  {
    key: "respiratory_rate",
    label: "Resp. Rate",
    unit: "/min",
    min: 5,
    max: 60,
    step: 1,
  },
  {
    key: "body_temperature",
    label: "Temperature",
    unit: "°C",
    min: 34,
    max: 42,
    step: 0.1,
  },
  {
    key: "oxygen_saturation",
    label: "SpO₂",
    unit: "%",
    min: 70,
    max: 100,
    step: 0.1,
  },
  {
    key: "systolic_bp",
    label: "Systolic BP",
    unit: "mmHg",
    min: 70,
    max: 200,
    step: 1,
  },
  {
    key: "diastolic_bp",
    label: "Diastolic BP",
    unit: "mmHg",
    min: 40,
    max: 130,
    step: 1,
  },
  { key: "age", label: "Age", unit: "yrs", min: 0, max: 120, step: 1 },
  {
    key: "weight_kg",
    label: "Weight",
    unit: "kg",
    min: 20,
    max: 300,
    step: 0.5,
  },
  {
    key: "height_m",
    label: "Height",
    unit: "m",
    min: 0.5,
    max: 2.5,
    step: 0.01,
  },
  {
    key: "ecg_qt_interval_ms",
    label: "ECG QT Interval",
    unit: "ms",
    min: 200,
    max: 600,
    step: 1,
  },
];

const NORMAL = {
  heart_rate: [60, 100],
  respiratory_rate: [12, 20],
  body_temperature: [36.1, 37.2],
  oxygen_saturation: [95, 100],
  systolic_bp: [90, 120],
  diastolic_bp: [60, 80],
  ecg_qt_interval_ms: [350, 440],
};

// ── Simulated ECG waveform data ──────────────────────────────────────────────
function generateECG(qt = 380, hr = 75) {
  const pts = [];
  const rr = 60000 / hr;
  for (let i = 0; i < 200; i++) {
    const t = (i / 200) * rr;
    let v = 0;
    const p = t % rr;
    if (p < 50) v = 0.1 * Math.sin((p / 50) * Math.PI);
    else if (p < 80) v = 0;
    else if (p < 90) v = -0.15;
    else if (p < 100) v = 1.2;
    else if (p < 110) v = -0.3;
    else if (p < 120) v = 0;
    else if (p < 120 + qt * 0.4)
      v = 0.2 * Math.sin(((p - 120) / (qt * 0.4)) * Math.PI);
    pts.push({ t: i, v: parseFloat(v.toFixed(3)) });
  }
  return pts;
}

const fmt = (v) => (typeof v === "number" ? v.toFixed(v % 1 === 0 ? 0 : 1) : v);
const isOut = (v, [lo, hi]) => v < lo || v > hi;

// ── Sub-components ───────────────────────────────────────────────────────────
function VitalCard({ label, value, unit, range }) {
  const [lo, hi] = range || [null, null];
  const ok = lo === null || (value >= lo && value <= hi);
  const low = lo !== null && value < lo;
  return (
    <div className={`vital${ok ? "" : " bad"}`}>
      <div className="vital-top">
        <span className="vital-label">{label}</span>
        <span className={`pill ${ok ? "soft" : "bad"}`}>{ok ? "Normal" : low ? "↓ Low" : "↑ High"}</span>
      </div>
      <div className="vital-value">
        {fmt(value)}
        <small>{unit}</small>
      </div>
      {range && <div className="vital-sub">ref {lo}–{hi}</div>}
    </div>
  );
}

function AlertRow({ alert }) {
  const critical = alert.severity === "critical";
  return (
    <div className="alert-row">
      <span className={`pill ${critical ? "bad" : "warn"}`}>{critical ? "Critical" : "Warning"}</span>
      <div>
        <div className="alert-param">{alert.param}</div>
        <div className="alert-msg">{alert.message}</div>
      </div>
    </div>
  );
}

function Meter({ label, value, alert }) {
  const pct = Math.max(0, Math.min(value, 1)) * 100;
  return (
    <div className="meter">
      <div className="meter-top">
        <span>{label}</span>
        <span className="mono">{pct.toFixed(0)}%</span>
      </div>
      <div className="meter-track">
        <div className={`meter-fill${alert ? " alert" : ""}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Box({ title, meta, children, className = "", bodyClass = "box-body" }) {
  return (
    <div className={`box ${className}`}>
      {title && (
        <div className="box-head">
          <span>{title}</span>
          {meta !== undefined && <span className="meta">{meta}</span>}
        </div>
      )}
      <div className={bodyClass}>{children}</div>
    </div>
  );
}

function PageHead({ eyebrow, title, sub, children }) {
  return (
    <div className="page-head">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1 className="page-title">{title}</h1>
        {sub && <p className="page-sub">{sub}</p>}
      </div>
      {children}
    </div>
  );
}

function EmptyState({ title, sub, onAction }) {
  return (
    <div className="box empty">
      <div className="empty-icon">+</div>
      <div className="empty-title">{title}</div>
      <div className="empty-sub">{sub}</div>
      <button className="btn sm" onClick={onAction}>
        Go to vitals <span className="arrow">→</span>
      </button>
    </div>
  );
}

// ── Main App ─────────────────────────────────────────────────────────────────
export default function VitalDashboard() {
  const [form, setForm] = useState(DEFAULTS);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  // Signed-in username (null = signed out). The stored token is re-validated on load.
  const [user, setUser] = useState(() => (session.token ? session.username || "user" : null));
  const [view, setView] = useState("home"); // signed-out screens: home | login | register
  const [history, setHistory] = useState([]);
  const [tab, setTab] = useState("input"); // input | results | history
  const [error, setError] = useState(null);
  const [demoMode, setDemoMode] = useState(true);
  const [pdfBusy, setPdfBusy] = useState(false);

  const ecgData = generateECG(form.ecg_qt_interval_ms, form.heart_rate);

  // Demo mode: simulate API response locally
  function simulatePredict(vals) {
    const bmi = vals.weight_kg / vals.height_m ** 2;
    const pp = vals.systolic_bp - vals.diastolic_bp;
    const map = vals.diastolic_bp + pp / 3;
    const alerts = [];
    Object.entries(NORMAL).forEach(([key, [lo, hi]]) => {
      const v = vals[key];
      if (v === undefined) return;
      if (v < lo)
        alerts.push({
          param: key.replace(/_/g, " "),
          value: v,
          status: "low",
          severity: v < lo * 0.85 ? "critical" : "warning",
          message: `${key} below normal (${lo}–${hi})`,
        });
      if (v > hi)
        alerts.push({
          param: key.replace(/_/g, " "),
          value: v,
          status: "high",
          severity: v > hi * 1.15 ? "critical" : "warning",
          message: `${key} above normal (${lo}–${hi})`,
        });
    });
    // Simple heuristic risk score
    let risk = 0;
    if (bmi > 30) risk += 0.3;
    if (vals.heart_rate > 90) risk += 0.2;
    if (vals.oxygen_saturation < 95) risk += 0.3;
    if (vals.systolic_bp > 130) risk += 0.2;
    const isHigh = risk > 0.3;
    return {
      risk_category: isHigh ? "High Risk" : "Low Risk",
      confidence: isHigh ? 0.72 + risk * 0.1 : 0.85,
      probabilities: {
        "High Risk": isHigh ? 0.72 : 0.15,
        "Low Risk": isHigh ? 0.28 : 0.85,
      },
      alerts,
      derived_values: {
        Derived_BMI: parseFloat(bmi.toFixed(2)),
        Derived_MAP: parseFloat(map.toFixed(2)),
        Derived_Pulse_Pressure: pp,
        Derived_HRV: parseFloat((50 - (vals.heart_rate - 60) * 0.3).toFixed(2)),
      },
      model_info: { type: "RandomForest [DEMO]", accuracy: 1.0 },
    };
  }

  async function handlePredict() {
    setLoading(true);
    setError(null);
    try {
      let data;
      if (demoMode) {
        await new Promise((r) => setTimeout(r, 800));
        data = simulatePredict(form);
      } else {
        data = await api("/predict", { method: "POST", body: form });
      }
      setResult(data);
      setHistory((h) =>
        [
          {
            time: new Date().toLocaleTimeString(),
            risk: data.risk_category,
            confidence: data.confidence,
            hr: form.heart_rate,
            spo2: form.oxygen_saturation,
            temp: form.body_temperature,
            sbp: form.systolic_bp,
          },
          ...h,
        ].slice(0, 20),
      );
      setTab("results");
    } catch (e) {
      if (e.status === 401) return signOut({ remote: false });
      setError(e.status === 0 ? `${e.message} — or switch Demo mode on.` : e.message);
    } finally {
      setLoading(false);
    }
  }

  function generatePdfFromData() {
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const date = new Date().toLocaleString();

    let y = 18;
    pdf.setTextColor("#000000");
    pdf.setFontSize(18);
    pdf.setFont(undefined, "bold");
    pdf.text("MEDPREDICT — HEALTH RISK REPORT", 14, y);
    pdf.setFont(undefined, "normal");

    y += 7;
    pdf.setFontSize(9);
    pdf.setTextColor("#6b6b6b");
    pdf.text(`Generated: ${date}`, 14, y);

    const sectionHeader = (label) => {
      pdf.setFillColor("#000000");
      pdf.rect(12, y - 5, 186, 8, "F");
      pdf.setTextColor("#ffffff");
      pdf.setFontSize(10);
      pdf.setFont(undefined, "bold");
      pdf.text(label.toUpperCase(), 14, y);
      pdf.setFont(undefined, "normal");
      pdf.setTextColor("#000000");
    };

    y += 12;
    sectionHeader("Patient input parameters");
    y += 10;
    pdf.setFontSize(10);

    const fields = [
      ["Heart Rate", `${form.heart_rate} bpm`],
      ["Resp Rate", `${form.respiratory_rate} /min`],
      ["Systolic BP", `${form.systolic_bp} mmHg`],
      ["Diastolic BP", `${form.diastolic_bp} mmHg`],
      ["SpO2", `${form.oxygen_saturation} %`],
      ["Temperature", `${form.body_temperature} C`],
      ["Height", `${form.height_m} m`],
      ["Weight", `${form.weight_kg} kg`],
      ["ECG QT", `${form.ecg_qt_interval_ms} ms`],
      ["Age", `${form.age} yrs`],
    ];

    fields.forEach(([label, value]) => {
      pdf.text(`${label}`, 14, y);
      pdf.text(`${value}`, 90, y);
      y += 6;
      if (y > 260) {
        pdf.addPage();
        y = 15;
      }
    });

    y += 8;
    sectionHeader("Model prediction");

    y += 11;
    pdf.setFontSize(14);
    pdf.setFont(undefined, "bold");
    pdf.setTextColor(result.risk_category === "High Risk" ? "#e10600" : "#000000");
    pdf.text(`${result.risk_category.toUpperCase()} (${(result.confidence * 100).toFixed(1)}%)`, 14, y);
    pdf.setFont(undefined, "normal");

    y += 7;
    pdf.setFontSize(10);
    pdf.setTextColor("#000000");
    pdf.text(`Model: ${result.model_info.type} · Accuracy: ${(result.model_info.accuracy * 100).toFixed(1)}%`, 14, y);

    y += 12;
    sectionHeader("Clinical alerts");
    y += 10;
    const alerts = result.alerts.length ? result.alerts : [{ param: "All vitals within normal range", message: "No alerts" }];
    alerts.forEach((a) => {
      if (y > 280) {
        pdf.addPage();
        y = 18;
      }
      pdf.text(`- ${a.param}: ${a.message}`, 14, y);
      y += 6;
    });

    pdf.save(`MedPredict-Report-${new Date().toISOString().split("T")[0]}.pdf`);
  }

  const downloadPDF = async () => {
    if (!result) return;
    setPdfBusy(true);
    try {
      try {
        const element = document.getElementById("prediction-report");
        if (!element) throw new Error("Report element not found");

        const canvas = await html2canvas(element, {
          scale: 2,
          backgroundColor: "#ffffff",
          useCORS: true,
          logging: false,
        });

        const imgData = canvas.toDataURL("image/png");
        const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
        const pageWidth = pdf.internal.pageSize.getWidth();
        const imgWidth = pageWidth - 16;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        pdf.addImage(imgData, "PNG", 8, 8, imgWidth, imgHeight);
        pdf.save(`MedPredict-Report-${new Date().toISOString().split("T")[0]}.pdf`);
        return;
      } catch (captureError) {
        console.warn("html2canvas capture failed, using data-only PDF", captureError);
      }
      generatePdfFromData();
    } catch (err) {
      console.error("Failed to generate PDF", err);
      setError("Failed to generate PDF. Check the console for details.");
    } finally {
      setPdfBusy(false);
    }
  };

  // Validate a stored session once on load; drop it if the server rejects it.
  useEffect(() => {
    if (!session.token) return;
    api("/me")
      .then((me) => setUser(me.username))
      .catch((e) => {
        if (e.status === 401) signOut({ remote: false });
        // status 0 = backend offline: keep the session so Demo mode still works.
      });
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [view, user]);

  function signOut({ remote = true } = {}) {
    if (remote) api("/logout", { method: "POST" }).catch(() => {});
    session.clear();
    setUser(null);
    setView("home");
    // Don't leak one user's session data to the next person who signs in.
    setResult(null);
    setHistory([]);
    setForm(DEFAULTS);
    setTab("input");
    setError(null);
    setLoading(false);
  }

  function handleSignedIn(username) {
    setUser(username);
    setTab("input");
  }

  const radarData = result
    ? [
        { axis: "Heart Rate", value: Math.min((form.heart_rate / 100) * 100, 100) },
        { axis: "SpO₂", value: form.oxygen_saturation },
        { axis: "Temp", value: Math.min(((form.body_temperature - 34) / 8) * 100, 100) },
        { axis: "Systolic", value: Math.min((form.systolic_bp / 180) * 100, 100) },
        { axis: "ECG QT", value: Math.min((form.ecg_qt_interval_ms / 500) * 100, 100) },
      ]
    : [];

  const importanceData = [
    { name: "BMI", value: 51.3 },
    { name: "HR", value: 25.7 },
    { name: "Weight", value: 9.9 },
    { name: "Height", value: 6.7 },
    { name: "ECG QT", value: 5.8 },
    { name: "SpO₂", value: 0.6 },
  ];

  const liveVitals = [
    { label: "Heart Rate", value: form.heart_rate, unit: "bpm", range: NORMAL.heart_rate },
    { label: "SpO₂", value: form.oxygen_saturation, unit: "%", range: NORMAL.oxygen_saturation },
    { label: "Temperature", value: form.body_temperature, unit: "°C", range: NORMAL.body_temperature },
    { label: "Systolic BP", value: form.systolic_bp, unit: "mmHg", range: NORMAL.systolic_bp },
    { label: "Diastolic BP", value: form.diastolic_bp, unit: "mmHg", range: NORMAL.diastolic_bp },
    { label: "ECG QT", value: form.ecg_qt_interval_ms, unit: "ms", range: NORMAL.ecg_qt_interval_ms },
  ];

  const derivedLive = [
    { label: "BMI", value: (form.weight_kg / form.height_m ** 2).toFixed(1) },
    { label: "MAP mmHg", value: (form.diastolic_bp + (form.systolic_bp - form.diastolic_bp) / 3).toFixed(1) },
    { label: "PP mmHg", value: (form.systolic_bp - form.diastolic_bp).toFixed(0) },
    { label: "HRV ms", value: Math.max(0, 50 - (form.heart_rate - 60) * 0.3).toFixed(1) },
  ];

  const setField = (key, v) => setForm((p) => ({ ...p, [key]: v }));
  const isHigh = result?.risk_category === "High Risk";

  if (!user) {
    if (view === "home") {
      return <Home onSignIn={() => setView("login")} onGetStarted={() => setView("register")} />;
    }
    return (
      <Login
        key={view}
        initialMode={view}
        onLogin={handleSignedIn}
        onBack={() => setView("home")}
      />
    );
  }

  const TABS = [
    { id: "input", label: "Vitals" },
    { id: "results", label: "Prediction" },
    { id: "history", label: "History" },
  ];
  const username = user;
  const outCount = liveVitals.filter((v) => isOut(v.value, v.range)).length;
  const today = new Date().toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });

  return (
    <div className="app">
      {/* Floating header */}
      <header className="header">
        <div className="wrap">
          <div className="header-bar">
            <Brand onClick={() => setTab("input")} />

            <nav className="segmented" aria-label="Sections">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  className={`seg${tab === t.id ? " active" : ""}`}
                  onClick={() => setTab(t.id)}
                  aria-current={tab === t.id ? "page" : undefined}
                >
                  <span className="lbl">{t.label}</span>
                  {t.id === "history" && history.length > 0 && <span className="count">{history.length}</span>}
                </button>
              ))}
            </nav>

            <div className="header-actions">
              <button
                className={`toggle${demoMode ? " on" : ""}`}
                onClick={() => setDemoMode((d) => !d)}
                aria-pressed={demoMode}
                title="Use local simulation instead of the API"
              >
                Demo
                <span className="toggle-track">
                  <span className="toggle-thumb" />
                </span>
              </button>
              <span className="pill dark">
                <span className="dot" /> {demoMode ? "Local" : "API"}
              </span>
              <div className="user" title={username}>
                <span className="avatar">{username.slice(0, 2)}</span>
              </div>
              <button className="btn ghost sm" onClick={() => signOut()}>
                Log out
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="main">
        <div className="wrap page" key={tab}>
          {/* ── INPUT TAB ─────────────────────────────────────────────── */}
          {tab === "input" && (
            <>
              <PageHead
                eyebrow={today}
                title={
                  <>
                    Patient <em>assessment</em>
                  </>
                }
                sub="Adjust the vital signs below. The preview updates live — run the model when you're ready."
              >
                <div className="summary">
                  <span className={`pill ${outCount ? "bad" : "ok"}`}>
                    {outCount ? `${outCount} out of range` : "All vitals normal"}
                  </span>
                  <button className="pill soft" style={{ cursor: "pointer", font: "inherit", fontSize: 12, fontWeight: 600 }} onClick={() => setForm(DEFAULTS)}>
                    ↺ Reset
                  </button>
                </div>
              </PageHead>

              <div className="grid-2">
                {/* Form */}
                <div>
                  <div className="section-title">
                    <span>Vital parameters</span>
                    <span className="mono" style={{ fontSize: 12, fontWeight: 500, color: C.muted }}>
                      {FIELD_META.length} inputs
                    </span>
                  </div>
                  <div className="fields">
                    {FIELD_META.map((f) => {
                      const p = ((form[f.key] - f.min) / (f.max - f.min)) * 100;
                      return (
                        <label key={f.key} className="field">
                          <div className="field-top">
                            <span className="field-label">{f.label}</span>
                            <span className="field-unit">{f.unit}</span>
                          </div>
                          <input
                            type="number"
                            className="field-num"
                            min={f.min}
                            max={f.max}
                            step={f.step}
                            value={form[f.key]}
                            onChange={(e) => setField(f.key, parseFloat(e.target.value) || 0)}
                            aria-label={`${f.label} value`}
                          />
                          <input
                            type="range"
                            min={f.min}
                            max={f.max}
                            step={f.step}
                            value={form[f.key]}
                            onChange={(e) => setField(f.key, parseFloat(e.target.value))}
                            aria-label={f.label}
                            style={{ "--p": `${Math.max(0, Math.min(100, p))}%` }}
                          />
                          <div className="field-range">
                            <span>{f.min}</span>
                            <span>{f.max}</span>
                          </div>
                        </label>
                      );
                    })}
                  </div>

                  {error && <div className="error">{error}</div>}

                  <button
                    className="btn lg"
                    onClick={handlePredict}
                    disabled={loading}
                    style={{ marginTop: 24 }}
                  >
                    {loading ? "Analyzing…" : "Predict health risk"}
                    {!loading && <span className="arrow">→</span>}
                  </button>
                </div>

                {/* Live preview */}
                <div className="stack">
                  <div>
                    <div className="section-title">
                      <span>Live vitals</span>
                      <span className="pill dark" style={{ fontSize: 11, padding: "3px 10px" }}>
                        <span className="dot" /> Live
                      </span>
                    </div>
                    <div className="vitals">
                      {liveVitals.map((v) => (
                        <VitalCard key={v.label} {...v} />
                      ))}
                    </div>
                  </div>

                  <Box
                    className="lift"
                    bodyClass="box-body ecg-paper"
                    title="ECG simulation"
                    meta={`QT ${form.ecg_qt_interval_ms}ms · ${form.heart_rate}bpm`}
                  >
                    <ResponsiveContainer width="100%" height={120}>
                      <LineChart data={ecgData}>
                        <Line
                          type="linear"
                          dataKey="v"
                          stroke={C.ink}
                          strokeWidth={2}
                          dot={false}
                          isAnimationActive={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </Box>

                  <Box className="lift" title="Derived metrics" bodyClass="stats">
                    {derivedLive.map((m) => (
                      <div key={m.label} className="stat">
                        <div className="stat-value">{m.value}</div>
                        <div className="stat-label">{m.label}</div>
                      </div>
                    ))}
                  </Box>
                </div>
              </div>
            </>
          )}

          {/* ── RESULTS TAB ───────────────────────────────────────────── */}
          {tab === "results" && (
            <>
              <PageHead
                eyebrow="Model output"
                title={
                  <>
                    Risk <em>prediction</em>
                  </>
                }
                sub={result ? `${result.model_info.type} · ${result.alerts.length} clinical alert${result.alerts.length === 1 ? "" : "s"}` : undefined}
              >
                {result && (
                  <button className="btn ghost sm" onClick={downloadPDF} disabled={pdfBusy}>
                    {pdfBusy ? "Generating…" : "Download PDF"} <span className="arrow">↓</span>
                  </button>
                )}
              </PageHead>

              {!result ? (
                <EmptyState
                  title="No prediction yet"
                  sub="Enter patient vitals to run an analysis."
                  onAction={() => setTab("input")}
                />
              ) : (
                <div id="prediction-report" className="grid-2 even" style={{ background: C.paper, padding: 4 }}>
                  {/* Verdict */}
                  <div className="box">
                    <div className={`verdict ${isHigh ? "high" : "low"}`}>
                      <div className="verdict-label">Prediction result</div>
                      <div className="verdict-title">{result.risk_category}</div>
                      <div className="verdict-sub">
                        {(result.confidence * 100).toFixed(1)}% confidence
                      </div>
                    </div>
                    <div className="box-body">
                      <Meter label="High risk" value={result.probabilities["High Risk"]} alert />
                      <Meter label="Low risk" value={result.probabilities["Low Risk"]} />
                    </div>
                    <div className="footnote">
                      {result.model_info.type} · accuracy {(result.model_info.accuracy * 100).toFixed(1)}%
                    </div>
                  </div>

                  {/* Alerts */}
                  <Box title="Clinical alerts" meta={result.alerts.length} bodyClass="">
                    {result.alerts.length === 0 ? (
                      <div className="empty" style={{ padding: "56px 24px" }}>
                        <div className="empty-icon">✓</div>
                        <div className="empty-title" style={{ fontSize: 20 }}>All clear</div>
                        <div className="empty-sub" style={{ marginBottom: 0 }}>
                          All vitals within normal range.
                        </div>
                      </div>
                    ) : (
                      <div className="alert-list" style={{ maxHeight: 340, overflowY: "auto" }}>
                        {result.alerts.map((a, i) => (
                          <AlertRow key={i} alert={a} />
                        ))}
                      </div>
                    )}
                  </Box>

                  {/* Radar */}
                  <Box className="lift" title="Vital parameters" meta="normalised">
                    <ResponsiveContainer width="100%" height={250}>
                      <RadarChart data={radarData}>
                        <PolarGrid stroke={C.line} />
                        <PolarAngleAxis dataKey="axis" tick={AXIS_TICK} />
                        <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                        <Radar
                          dataKey="value"
                          stroke={C.accent}
                          strokeWidth={2}
                          fill={C.accent}
                          fillOpacity={0.15}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </Box>

                  {/* Feature importance */}
                  <Box className="lift" title="Feature importance" meta="%">
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={importanceData} layout="vertical" margin={{ left: 0, right: 16 }}>
                        <CartesianGrid horizontal={false} stroke={C.line} />
                        <XAxis type="number" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                        <YAxis
                          type="category"
                          dataKey="name"
                          tick={AXIS_TICK}
                          width={60}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: C.soft }} />
                        <Bar dataKey="value" fill={C.accent} barSize={14} radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </Box>

                  {/* Derived values */}
                  <Box title="Derived clinical metrics" className="span" bodyClass="stats">
                    {Object.entries(result.derived_values).map(([k, v]) => (
                      <div key={k} className="stat">
                        <div className="stat-value">{v}</div>
                        <div className="stat-label">
                          {k.replace("Derived_", "").replace(/_/g, " ")}
                        </div>
                      </div>
                    ))}
                  </Box>
                </div>
              )}
            </>
          )}

          {/* ── HISTORY TAB ───────────────────────────────────────────── */}
          {tab === "history" && (
            <>
              <PageHead
                eyebrow="This session"
                title={
                  <>
                    Prediction <em>history</em>
                  </>
                }
                sub={history.length ? `${history.length} of the last 20 runs are kept for this session.` : undefined}
              />

              {history.length === 0 ? (
                <EmptyState
                  title="No history"
                  sub="Run your first analysis to start a record."
                  onAction={() => setTab("input")}
                />
              ) : (
                <div className="stack">
                  <Box title="HR & SpO₂ trend" meta={`${history.length} records`}>
                    <ResponsiveContainer width="100%" height={220}>
                      <LineChart data={[...history].reverse()}>
                        <CartesianGrid vertical={false} stroke={C.line} />
                        <XAxis dataKey="time" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                        <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={TOOLTIP_STYLE} />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                        <Line dataKey="hr" stroke={C.alert} strokeWidth={2} dot={{ r: 3, fill: C.alert }} name="Heart rate" />
                        <Line
                          dataKey="spo2"
                          stroke={C.accent}
                          strokeWidth={2}
                          dot={{ r: 3, fill: C.accent }}
                          name="SpO₂"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </Box>

                  <div className="box">
                    <table className="table">
                      <thead>
                        <tr>
                          {["Time", "Risk", "Confidence", "HR", "SpO₂", "Temp", "SBP"].map((h) => (
                            <th key={h}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {history.map((row, i) => (
                          <tr key={i}>
                            <td className="mono">{row.time}</td>
                            <td>
                              <span className={`pill ${row.risk === "High Risk" ? "bad" : "ok"}`}>{row.risk}</span>
                            </td>
                            <td>{(row.confidence * 100).toFixed(1)}%</td>
                            <td>{row.hr}</td>
                            <td>{row.spo2}</td>
                            <td>{row.temp}</td>
                            <td>{row.sbp}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
