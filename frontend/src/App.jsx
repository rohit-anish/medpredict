import { useState, useEffect, useRef } from "react";
import Login from "./Login";
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
  ReferenceLine,
  Cell,
} from "recharts";

// ── Colour palette ──────────────────────────────────────────────────────────
const C = {
  bg: "#0d1117",
  surface: "#161b22",
  border: "#21262d",
  accent: "#58a6ff",
  green: "#3fb950",
  red: "#f85149",
  yellow: "#d29922",
  purple: "#bc8cff",
  text: "#e6edf3",
  muted: "#8b949e",
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

// ── Sub-components ───────────────────────────────────────────────────────────
function VitalCard({ label, value, unit, range, trend }) {
  const [lo, hi] = range || [null, null];
  const ok = lo === null || (value >= lo && value <= hi);
  const low = lo !== null && value < lo;
  const color = ok ? C.green : low ? C.accent : C.red;
  return (
    <div
      style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 8,
        padding: "14px 18px",
        borderLeft: `3px solid ${color}`,
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: C.muted,
          marginBottom: 4,
          letterSpacing: 1,
        }}
      >
        {label.toUpperCase()}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
        <span
          style={{
            fontSize: 26,
            fontWeight: 700,
            color,
            fontFamily: "Poppins, sans-serif",
          }}
        >
          {typeof value === "number"
            ? value.toFixed(value % 1 === 0 ? 0 : 1)
            : value}
        </span>
        <span style={{ fontSize: 12, color: C.muted }}>{unit}</span>
      </div>
      {range && (
        <div style={{ fontSize: 10, color: C.muted, marginTop: 4 }}>
          Normal: {lo}–{hi} {unit}
          {!ok && (
            <span style={{ color, marginLeft: 6 }}>
              ● {low ? "LOW" : "HIGH"}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function AlertBadge({ alert }) {
  const color = alert.severity === "critical" ? C.red : C.yellow;
  return (
    <div
      style={{
        background: `${color}15`,
        border: `1px solid ${color}40`,
        borderRadius: 6,
        padding: "10px 14px",
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        marginBottom: 8,
      }}
    >
      <span style={{ fontSize: 16 }}>
        {alert.severity === "critical" ? "🚨" : "⚠️"}
      </span>
      <div>
        <div style={{ fontSize: 12, fontWeight: 600, color }}>
          {alert.param}
        </div>
        <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
          {alert.message}
        </div>
      </div>
    </div>
  );
}

function Gauge({ value, max = 1, label, color }) {
  const pct = Math.max(0, Math.min(value / max, 1));
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const arcLength = (270 / 360) * circumference; // 270-degree visible arc
  const offset = arcLength - pct * arcLength;

  return (
    <div style={{ textAlign: "center" }}>
      <svg viewBox="0 0 120 120" width={120} height={120}>
        {/* Background track */}
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke={C.border}
          strokeWidth={10}
          strokeDasharray={`${arcLength} ${circumference}`}
          strokeDashoffset={0}
          strokeLinecap="round"
          transform="rotate(-135 60 60)"
        />
        {/* Progress arc */}
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={10}
          strokeDasharray={`${arcLength} ${circumference}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-135 60 60)"
          style={{ transition: "stroke-dashoffset 0.4s ease" }}
        />
        {/* Percentage text */}
        <text
          x="60"
          y="68"
          textAnchor="middle"
          fill={color}
          fontSize={24}
          fontWeight="700"
          fontFamily="Poppins, sans-serif"
        >
          {Math.round(pct * 100)}%
        </text>
      </svg>
      <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{label}</div>
    </div>
  );
}

// ── Main App ─────────────────────────────────────────────────────────────────
export default function VitalDashboard() {
  const [form, setForm] = useState(DEFAULTS);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(
    !!localStorage.getItem("token"),
  );
  const [history, setHistory] = useState([]);
  const [tab, setTab] = useState("input"); // input | results | history
  const [error, setError] = useState(null);
  const [demoMode, setDemoMode] = useState(true);

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
        const res = await fetch("http://localhost:8000/predict", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (!res.ok) throw new Error(`API error ${res.status}`);
        data = await res.json();
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
      setError("Could not reach API. Enable Demo Mode or start the backend.");
    } finally {
      setLoading(false);
    }
  }

  function generatePdfFromData() {
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const title = "MedPredict Health Risk Report";
    const date = new Date().toLocaleString();

    let y = 15;
    pdf.setFontSize(16);
    pdf.setTextColor("#28a745");
    pdf.text(title, 14, y);

    y += 8;
    pdf.setFontSize(10);
    pdf.setTextColor("#b0b8c1");
    pdf.text(`Generated: ${date}`, 14, y);

    y += 10;
    pdf.setDrawColor("#28314e");
    pdf.setFillColor("#0f172a");
    pdf.rect(12, y - 4, 186, 6, "F");
    pdf.setTextColor("#9ca3af");
    pdf.setFontSize(11);
    pdf.text("Patient Input Parameters", 14, y + 1);

    y += 10;
    pdf.setFontSize(10);
    pdf.setTextColor("#e5e7eb");

    const fields = [
      ["Heart Rate", `${form.heart_rate} bpm`],
      ["Resp Rate", `${form.resp_rate} /min`],
      ["Systolic BP", `${form.systolic_bp} mmHg`],
      ["Diastolic BP", `${form.diastolic_bp} mmHg`],
      ["SpO2", `${form.oxygen_saturation} %`],
      ["Temperature", `${form.body_temperature} °C`],
      ["Height", `${form.height_m} m`],
      ["Weight", `${form.weight_kg} kg`],
      ["ECG QT", `${form.ecg_qt_interval_ms} ms`],
      ["Age", `${form.age} yrs`],
    ];

    fields.forEach(([label, value]) => {
      pdf.text(`${label}:`, 14, y);
      pdf.text(`${value}`, 90, y);
      y += 6;
      if (y > 260) {
        pdf.addPage();
        y = 15;
      }
    });

    y += 6;
    pdf.setDrawColor("#28314e");
    pdf.setFillColor("#0f172a");
    pdf.rect(12, y - 4, 186, 6, "F");
    pdf.setTextColor("#9ca3af");
    pdf.text("Model Prediction", 14, y + 1);

    y += 10;
    pdf.setFontSize(12);
    pdf.setTextColor(result.risk_category === "High Risk" ? "#f87171" : "#34d399");
    pdf.text(`${result.risk_category} (${(result.confidence * 100).toFixed(1)}%)`, 14, y);

    y += 8;
    pdf.setFontSize(10);
    pdf.setTextColor("#e5e7eb");
    pdf.text(`Model: ${result.model_info.type} · Accuracy: ${(result.model_info.accuracy * 100).toFixed(1)}%`, 14, y);

    y += 10;
    const alerts = result.alerts.length ? result.alerts : [{ param: "All vitals within normal range", message: "No alerts" }];
    pdf.text("Clinical Alerts:", 14, y);
    y += 6;
    alerts.forEach((a) => {
      if (y > 280) {
        pdf.addPage();
        y = 18;
      }
      pdf.text(`- ${a.param}: ${a.message}`, 14, y);
      y += 6;
    });

    const filename = `MedPredict-Report-${new Date().toISOString().split("T")[0]}.pdf`;
    pdf.save(filename);
  }

  const downloadPDF = async (event) => {
    const button = event?.currentTarget;
    const originalText = button?.textContent;
    if (button) {
      button.textContent = "⏳ Generating PDF...";
      button.disabled = true;
    }

    if (!result) {
      alert("Please run prediction before downloading a report.");
      if (button) {
        button.textContent = originalText || "📥 Download as PDF";
        button.disabled = false;
      }
      return;
    }

    try {
      if (typeof html2canvas === "function") {
        try {
          const element = document.getElementById("prediction-report");
          if (!element) {
            throw new Error("Report element not found");
          }

          const canvas = await html2canvas(element, {
            scale: 2,
            backgroundColor: "#0d1117",
            useCORS: true,
            logging: false,
          });

          if (canvas) {
            const imgData = canvas.toDataURL("image/png");
            const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
            const pageWidth = pdf.internal.pageSize.getWidth();
            const imgWidth = pageWidth - 16;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            pdf.addImage(imgData, "PNG", 8, 8, imgWidth, imgHeight);
            pdf.save(`MedPredict-Report-${new Date().toISOString().split("T")[0]}.pdf`);
            return;
          }

          throw new Error("html2canvas produced no canvas");
        } catch (captureError) {
          console.warn("html2canvas capture failed, using data-only PDF", captureError);
        }
      } else {
        console.warn("html2canvas is unavailable, using data-only PDF");
      }

      generatePdfFromData();
    } catch (error) {
      console.error("Failed to generate PDF", error);
      alert("Failed to generate PDF. Please check console for details and try again.");
    } finally {
      if (button) {
        button.textContent = originalText || "📥 Download as PDF";
        button.disabled = false;
      }
    }
  };

  const radarData = result
    ? [
        {
          axis: "Heart Rate",
          value: Math.min((form.heart_rate / 100) * 100, 100),
        },
        { axis: "SpO₂", value: form.oxygen_saturation },
        {
          axis: "Temperature",
          value: Math.min(((form.body_temperature - 34) / 8) * 100, 100),
        },
        {
          axis: "Systolic BP",
          value: Math.min((form.systolic_bp / 180) * 100, 100),
        },
        {
          axis: "ECG QT",
          value: Math.min((form.ecg_qt_interval_ms / 500) * 100, 100),
        },
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

  const riskColor = result?.risk_category === "High Risk" ? C.red : C.green;
  if (!isAuthenticated) {
    return <Login onLogin={() => setIsAuthenticated(true)} />;
  }
  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-[#0d1117] via-[#0f172a] to-[#020617] text-white">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="text-2xl">🫀</div>
            <div>
              <h1 className="text-lg font-semibold">MedPredict</h1>
              <p className="text-xs text-gray-400">
                AI-powered health risk prediction
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-400">Demo Mode</span>

            <div className="w-10 h-5 bg-blue-500 rounded-full relative">
              <div className="w-4 h-4 bg-white rounded-full absolute top-0.5 right-0.5" />
            </div>

            <div className="px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-medium border border-green-500/30">
              ● READY
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div
          className="w-full max-w-6xl mx-auto mt-6"
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 2,
            padding: "0 24px",
            background: C.surface,
            borderBottom: `1px solid ${C.border}`,
          }}
        >
          {["input", "results", "history"].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                background: "none",
                border: "none",
                color: tab === t ? C.accent : C.muted,
                borderBottom:
                  tab === t ? `2px solid ${C.accent}` : "2px solid transparent",
                padding: "10px 18px",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 500,
                textTransform: "capitalize",
              }}
            >
              {t === "input"
                ? "📋 Vitals Input"
                : t === "results"
                  ? "🔬 Prediction"
                  : "📈 History"}
            </button>
          ))}
        </div>

        <div className="max-w-7xl mx-auto px-6 py-10 flex flex-col items-center">
          {/* ── INPUT TAB ─────────────────────────────────────────────────── */}
          {tab === "input" && (
            <div className="w-full flex justify-center pt-8">
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 24,
                  justifyContent: "center",
                }}
              >
                {/* Form */}
                <div>
                  <div
                    style={{
                      fontSize: 13,
                      color: C.muted,
                      marginBottom: 18,
                      letterSpacing: 2,
                      fontWeight: 600,
                      textTransform: "uppercase",
                      marginTop: 24,
                    }}
                  >
                    PATIENT VITAL PARAMETERS
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 10,
                    }}
                  >
                    {FIELD_META.map((f) => (
                      <div
                        key={f.key}
                        style={{
                          background:
                            "linear-gradient(145deg, #161b22, #0d1117)",
                          border: "1px solid #21262d",
                          borderRadius: 12,
                          padding: "16px",
                          boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
                          transition: "all 0.2s ease",
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.transform = "translateY(-3px)")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.transform = "translateY(0)")
                        }
                      >
                        <div
                          style={{
                            fontSize: 10,
                            color: C.muted,
                            marginBottom: 6,
                            letterSpacing: 0.8,
                          }}
                        >
                          {f.label.toUpperCase()} ({f.unit})
                        </div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: 6,
                              width: "100%",
                            }}
                          >
                            <input
                              type="range"
                              min={f.min}
                              max={f.max}
                              step={f.step}
                              value={form[f.key]}
                              onChange={(e) =>
                                setForm((p) => ({
                                  ...p,
                                  [f.key]: parseFloat(e.target.value),
                                }))
                              }
                              className="custom-slider"
                            />

                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                              }}
                            >
                              <span style={{ fontSize: 10, color: "#8b949e" }}>
                                {f.min}
                              </span>

                              <span
                                style={{
                                  fontSize: 13,
                                  fontWeight: 600,
                                  color: "#58a6ff",
                                  fontFamily: "Poppins, sans-serif",
                                }}
                              >
                                {form[f.key]} {f.unit}
                              </span>

                              <span style={{ fontSize: 10, color: "#8b949e" }}>
                                {f.max}
                              </span>
                            </div>
                          </div>

                          <input
                            type="number"
                            min={f.min}
                            max={f.max}
                            step={f.step}
                            value={form[f.key]}
                            onChange={(e) =>
                              setForm((p) => ({
                                ...p,
                                [f.key]: parseFloat(e.target.value) || 0,
                              }))
                            }
                            style={{
                              width: 60,
                              background: C.bg,
                              border: `1px solid ${C.border}`,
                              color: C.text,
                              borderRadius: 4,
                              padding: "4px 6px",
                              fontSize: 12,
                              textAlign: "right",
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  {error && (
                    <div
                      style={{
                        background: C.red + "15",
                        border: `1px solid ${C.red}40`,
                        borderRadius: 6,
                        padding: "10px 14px",
                        marginTop: 12,
                        color: C.red,
                        fontSize: 12,
                      }}
                    >
                      ⚠️ {error}
                    </div>
                  )}
                  <button
                    onClick={handlePredict}
                    disabled={loading}
                    className="w-full py-3 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 hover:opacity-90 font-semibold transition"
                    style={{
                      marginTop: 14,
                      width: "100%",
                      color: "#0d1117",
                      border: "none",
                      borderRadius: 8,
                      padding: "13px 0",
                      fontSize: 14,
                      fontWeight: 700,
                      cursor: loading ? "not-allowed" : "pointer",
                      opacity: loading ? 0.7 : 1,
                      letterSpacing: 0.5,
                    }}
                  >
                    {loading ? "🔄 Analyzing..." : "🔬 Predict Health Risk"}
                  </button>
                </div>

                {/* Live vitals preview + ECG */}
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 12 }}
                >
                  <div
                    style={{
                      fontSize: 13,
                      color: C.muted,
                      letterSpacing: 2,
                      marginBottom: 16,
                      fontWeight: 600,
                      textTransform: "uppercase",
                      marginTop: 24,
                    }}
                  >
                    LIVE VITALS PREVIEW
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 8,
                    }}
                  >
                    {[
                      {
                        label: "Heart Rate",
                        value: form.heart_rate,
                        unit: "bpm",
                        range: NORMAL.heart_rate,
                      },
                      {
                        label: "SpO₂",
                        value: form.oxygen_saturation,
                        unit: "%",
                        range: NORMAL.oxygen_saturation,
                      },
                      {
                        label: "Temperature",
                        value: form.body_temperature,
                        unit: "°C",
                        range: NORMAL.body_temperature,
                      },
                      {
                        label: "Systolic BP",
                        value: form.systolic_bp,
                        unit: "mmHg",
                        range: NORMAL.systolic_bp,
                      },
                      {
                        label: "Diastolic BP",
                        value: form.diastolic_bp,
                        unit: "mmHg",
                        range: NORMAL.diastolic_bp,
                      },
                      {
                        label: "ECG QT",
                        value: form.ecg_qt_interval_ms,
                        unit: "ms",
                        range: NORMAL.ecg_qt_interval_ms,
                      },
                    ].map((v) => (
                      <VitalCard key={v.label} {...v} />
                    ))}
                  </div>

                  {/* ECG preview */}
                  <div className="bg-white/5 border border-white/10 rounded-xl p-5 backdrop-blur-md shadow-lg">
                    <div
                      style={{
                        fontSize: 12,
                        color: C.green,
                        marginBottom: 10,
                        letterSpacing: 1.2,
                        fontWeight: 600,
                        textTransform: "uppercase",
                      }}
                    >
                      ● ECG WAVEFORM SIMULATION (QT={form.ecg_qt_interval_ms}ms,
                      HR={form.heart_rate}bpm)
                    </div>
                    <ResponsiveContainer width="100%" height={100}>
                      <LineChart data={ecgData}>
                        <Line
                          type="monotone"
                          dataKey="v"
                          stroke={C.green}
                          strokeWidth={1.5}
                          dot={false}
                        />
                        <ReferenceLine
                          y={0}
                          stroke={C.border}
                          strokeDasharray="2 2"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  {/* BMI display */}
                  <div className="bg-white/5 border border-white/10 rounded-xl p-5 backdrop-blur-md shadow-lg">
                    <div
                      style={{
                        fontSize: 12,
                        color: C.muted,
                        marginBottom: 8,
                        letterSpacing: 1.2,
                        fontWeight: 600,
                        textTransform: "uppercase",
                      }}
                    >
                      DERIVED METRICS
                    </div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr 1fr 1fr",
                        gap: 10,
                      }}
                    >
                      {[
                        {
                          label: "BMI",
                          value: (form.weight_kg / form.height_m ** 2).toFixed(
                            1,
                          ),
                          unit: "",
                        },
                        {
                          label: "MAP",
                          value: (
                            form.diastolic_bp +
                            (form.systolic_bp - form.diastolic_bp) / 3
                          ).toFixed(1),
                          unit: "mmHg",
                        },
                        {
                          label: "PP",
                          value: (form.systolic_bp - form.diastolic_bp).toFixed(
                            0,
                          ),
                          unit: "mmHg",
                        },
                        {
                          label: "HRV",
                          value: Math.max(
                            0,
                            50 - (form.heart_rate - 60) * 0.3,
                          ).toFixed(1),
                          unit: "ms",
                        },
                      ].map((m) => (
                        <div key={m.label} style={{ textAlign: "center" }}>
                          <div
                            style={{
                              fontSize: 18,
                              fontWeight: 700,
                              color: C.accent,
                              fontFamily: "Poppins, sans-serif",
                            }}
                          >
                            {m.value}
                          </div>
                          <div style={{ fontSize: 10, color: C.muted }}>
                            {m.label} {m.unit}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── RESULTS TAB ───────────────────────────────────────────────── */}
          {tab === "results" && (
            <div style={{ paddingTop: "32px" }}>
              {!result ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "60px 0",
                    color: C.muted,
                  }}
                >
                  <div style={{ fontSize: 40, marginBottom: 16 }}>🔬</div>
                  <div>Submit vitals to see prediction results</div>
                  <button
                    onClick={() => setTab("input")}
                    className="w-full py-3 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 hover:opacity-90 font-semibold transition"
                    style={{
                      marginTop: 16,
                      color: C.bg,
                      border: "none",
                      borderRadius: 6,
                      padding: "10px 24px",
                      cursor: "pointer",
                      fontWeight: 600,
                    }}
                  >
                    Go to Input
                  </button>
                </div>
              ) : (
                <>
                  {/* Download PDF Button - Outside report div */}
                  <div style={{ marginBottom: 16 }}>
                    <button
                      onClick={(e) => downloadPDF(e)}
                      className="w-full py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 hover:opacity-90 font-semibold transition"
                      style={{
                        color: "white",
                        border: "none",
                        fontSize: 14,
                        fontWeight: 600,
                        cursor: "pointer",
                        padding: "10px 16px",
                      }}
                    >
                      📥 Download as PDF
                    </button>
                  </div>

                  <div
                    id="prediction-report"
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 20,
                    }}
                  >

                  {/* Risk result */}
                  <div
                    style={{
                      background: C.surface,
                      border: `1px solid ${riskColor}40`,
                      borderRadius: 10,
                      padding: 24,
                      borderTop: `4px solid ${riskColor}`,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 11,
                        color: C.muted,
                        letterSpacing: 1,
                        marginBottom: 12,
                      }}
                    >
                      PREDICTION RESULT
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 16,
                        marginBottom: 20,
                      }}
                    >
                      <span style={{ fontSize: 44 }}>
                        {result.risk_category === "High Risk" ? "⚠️" : "✅"}
                      </span>
                      <div>
                        <div
                          style={{
                            fontSize: 28,
                            fontWeight: 800,
                            color: riskColor,
                          }}
                        >
                          {result.risk_category}
                        </div>
                        <div style={{ fontSize: 12, color: C.muted }}>
                          Confidence: {(result.confidence * 100).toFixed(1)}%
                        </div>
                      </div>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "center",
                        gap: 24,
                        marginBottom: 16,
                      }}
                    >
                      <Gauge
                        value={result.probabilities["High Risk"]}
                        max={1}
                        label="High Risk"
                        color={C.red}
                      />
                      <Gauge
                        value={result.probabilities["Low Risk"]}
                        max={1}
                        label="Low Risk"
                        color={C.green}
                      />
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: C.muted,
                        textAlign: "center",
                      }}
                    >
                      Model: {result.model_info.type} · Accuracy:{" "}
                      {(result.model_info.accuracy * 100).toFixed(1)}%
                    </div>
                  </div>

                  {/* Alerts */}
                  <div className="bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur-md shadow-lg">
                    <div
                      style={{
                        fontSize: 12,
                        color: C.muted,
                        letterSpacing: 1.2,
                        marginBottom: 16,
                        marginTop: 4,
                        fontWeight: 600,
                        textTransform: "uppercase",
                      }}
                    >
                      CLINICAL ALERTS ({result.alerts.length})
                    </div>
                    {result.alerts.length === 0 ? (
                      <div
                        style={{
                          textAlign: "center",
                          padding: "30px 0",
                          color: C.green,
                        }}
                      >
                        <div style={{ fontSize: 28, marginBottom: 8 }}>✅</div>
                        <div style={{ fontWeight: 600 }}>
                          All vitals within normal range
                        </div>
                      </div>
                    ) : (
                      <div style={{ maxHeight: 240, overflowY: "auto" }}>
                        {result.alerts.map((a, i) => (
                          <AlertBadge key={i} alert={a} />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Radar chart */}
                  <div className="bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur-md shadow-lg">
                    <div
                      style={{
                        fontSize: 12,
                        color: C.muted,
                        letterSpacing: 1.2,
                        marginBottom: 14,
                        marginTop: 4,
                        fontWeight: 600,
                        textTransform: "uppercase",
                      }}
                    >
                      VITAL PARAMETERS RADAR
                    </div>
                    <ResponsiveContainer width="100%" height={220}>
                      <RadarChart data={radarData}>
                        <PolarGrid stroke={C.border} />
                        <PolarAngleAxis
                          dataKey="axis"
                          tick={{ fill: C.muted, fontSize: 11 }}
                        />
                        <PolarRadiusAxis domain={[0, 100]} tick={false} />
                        <Radar
                          dataKey="value"
                          stroke={C.accent}
                          fill={C.accent}
                          fillOpacity={0.2}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Feature importance */}
                  <div className="bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur-md shadow-lg">
                    <div
                      style={{
                        fontSize: 12,
                        color: C.muted,
                        letterSpacing: 1.2,
                        marginBottom: 14,
                        marginTop: 4,
                        fontWeight: 600,
                        textTransform: "uppercase",
                      }}
                    >
                      MODEL FEATURE IMPORTANCE
                    </div>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={importanceData} layout="vertical">
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke={C.border}
                        />
                        <XAxis
                          type="number"
                          tick={{ fill: C.muted, fontSize: 10 }}
                        />
                        <YAxis
                          type="category"
                          dataKey="name"
                          tick={{ fill: C.muted, fontSize: 11 }}
                          width={50}
                        />
                        <Tooltip
                          contentStyle={{
                            background: C.surface,
                            border: `1px solid ${C.border}`,
                            color: C.text,
                          }}
                        />
                        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                          {importanceData.map((_, i) => (
                            <Cell
                              key={i}
                              fill={
                                i === 0
                                  ? C.accent
                                  : i === 1
                                    ? C.purple
                                    : C.muted
                              }
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Derived values */}
                  <div
                    style={{
                      background: C.surface,
                      border: `1px solid ${C.border}`,
                      borderRadius: 10,
                      padding: 24,
                      gridColumn: "1 / -1",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 11,
                        color: C.muted,
                        letterSpacing: 1,
                        marginBottom: 14,
                      }}
                    >
                      DERIVED CLINICAL METRICS
                    </div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(4, 1fr)",
                        gap: 14,
                      }}
                    >
                      {Object.entries(result.derived_values).map(([k, v]) => (
                        <div
                          key={k}
                          style={{
                            background: C.bg,
                            border: `1px solid ${C.border}`,
                            borderRadius: 8,
                            padding: "14px 16px",
                            textAlign: "center",
                          }}
                        >
                          <div
                            style={{
                              fontSize: 22,
                              fontWeight: 700,
                              color: C.accent,
                              fontFamily: "Poppins, sans-serif",
                            }}
                          >
                            {v}
                          </div>
                          <div
                            style={{
                              fontSize: 11,
                              color: C.muted,
                              marginTop: 4,
                            }}
                          >
                            {k.replace("Derived_", "").replace(/_/g, " ")}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                </>
              )}
            </div>
          )}

          {/* ── HISTORY TAB ───────────────────────────────────────────────── */}
          {tab === "history" && (
            <div style={{ paddingTop: "32px" }}>
              <div
                style={{
                  fontSize: 12,
                  color: C.muted,
                  letterSpacing: 1,
                  marginBottom: 14,
                }}
              >
                PREDICTION HISTORY ({history.length} records)
              </div>
              {history.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "60px 0",
                    color: C.muted,
                  }}
                >
                  No predictions yet. Run your first analysis.
                </div>
              ) : (
                <>
                  {/* Trend chart */}
                  <div
                    style={{
                      background: C.surface,
                      border: `1px solid ${C.border}`,
                      borderRadius: 10,
                      padding: 20,
                      marginBottom: 16,
                    }}
                  >
                    <div
                      style={{ fontSize: 11, color: C.muted, marginBottom: 10 }}
                    >
                      HR & SpO₂ TRENDS
                    </div>
                    <ResponsiveContainer width="100%" height={160}>
                      <LineChart data={[...history].reverse()}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke={C.border}
                        />
                        <XAxis
                          dataKey="time"
                          tick={{ fill: C.muted, fontSize: 10 }}
                        />
                        <YAxis tick={{ fill: C.muted, fontSize: 10 }} />
                        <Tooltip
                          contentStyle={{
                            background: C.surface,
                            border: `1px solid ${C.border}`,
                            color: C.text,
                          }}
                        />
                        <Line
                          dataKey="hr"
                          stroke={C.red}
                          strokeWidth={2}
                          dot={false}
                          name="Heart Rate"
                        />
                        <Line
                          dataKey="spo2"
                          stroke={C.accent}
                          strokeWidth={2}
                          dot={false}
                          name="SpO₂"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Table */}
                  <div
                    style={{
                      background: C.surface,
                      border: `1px solid ${C.border}`,
                      borderRadius: 10,
                      overflow: "hidden",
                    }}
                  >
                    <table
                      style={{ width: "100%", borderCollapse: "collapse" }}
                    >
                      <thead>
                        <tr style={{ background: C.bg }}>
                          {[
                            "Time",
                            "Risk",
                            "Confidence",
                            "HR",
                            "SpO₂",
                            "Temp",
                            "SBP",
                          ].map((h) => (
                            <th
                              key={h}
                              style={{
                                padding: "10px 14px",
                                textAlign: "left",
                                fontSize: 11,
                                color: C.muted,
                                fontWeight: 500,
                                letterSpacing: 0.8,
                                borderBottom: `1px solid ${C.border}`,
                              }}
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {history.map((row, i) => (
                          <tr
                            key={i}
                            style={{ borderBottom: `1px solid ${C.border}` }}
                          >
                            <td
                              style={{
                                padding: "10px 14px",
                                color: C.muted,
                                fontFamily: "Poppins, sans-serif",
                                fontSize: 12,
                              }}
                            >
                              {row.time}
                            </td>
                            <td style={{ padding: "10px 14px" }}>
                              <span
                                style={{
                                  background:
                                    (row.risk === "High Risk"
                                      ? C.red
                                      : C.green) + "20",
                                  color:
                                    row.risk === "High Risk" ? C.red : C.green,
                                  border: `1px solid ${row.risk === "High Risk" ? C.red : C.green}40`,
                                  borderRadius: 4,
                                  padding: "2px 8px",
                                  fontSize: 11,
                                  fontWeight: 600,
                                }}
                              >
                                {row.risk}
                              </span>
                            </td>
                            <td
                              style={{
                                padding: "10px 14px",
                                color: C.text,
                                fontFamily: "Poppins, sans-serif",
                              }}
                            >
                              {(row.confidence * 100).toFixed(1)}%
                            </td>
                            <td style={{ padding: "10px 14px", color: C.text }}>
                              {row.hr}
                            </td>
                            <td style={{ padding: "10px 14px", color: C.text }}>
                              {row.spo2}
                            </td>
                            <td style={{ padding: "10px 14px", color: C.text }}>
                              {row.temp}
                            </td>
                            <td style={{ padding: "10px 14px", color: C.text }}>
                              {row.sbp}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
