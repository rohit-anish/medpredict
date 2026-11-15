import { Brand, Icon, EcgLine } from "./ui";

const STEPS = [
  {
    title: "Record vital signs",
    body: "Enter heart rate, SpO₂, blood pressure, temperature, respiratory rate, ECG QT interval and body measurements.",
  },
  {
    title: "Review in real time",
    body: "Each value is checked against adult reference ranges as you type, alongside a simulated ECG trace and derived metrics.",
  },
  {
    title: "Receive a risk assessment",
    body: "A Random Forest model trained on 100,000 records returns a risk category, probabilities and graded clinical alerts.",
  },
];

const FEATURES = [
  { icon: "heart", title: "Reference-range checks", body: "Every reading is flagged normal, low or high against standard adult reference ranges." },
  { icon: "alert", title: "Graded clinical alerts", body: "Out-of-range values are graded as a warning or critical, depending on how far they deviate." },
  { icon: "pulse", title: "ECG visualisation", body: "A simulated ECG trace on grid paper that responds to heart rate and QT interval." },
  { icon: "sigma", title: "Derived metrics", body: "BMI, mean arterial pressure, pulse pressure and an HRV estimate, calculated automatically." },
  { icon: "file", title: "Printable reports", body: "Export the inputs, assessment and alerts as a PDF for your records." },
  { icon: "trend", title: "Session history", body: "Review previous assessments and heart-rate and SpO₂ trends across a session." },
];

const STATS = [
  { value: "100,000", label: "patient records in training" },
  { value: "14", label: "clinical features analysed" },
  { value: "7", label: "reference ranges monitored" },
  { value: "< 1 s", label: "time to assessment" },
];

const RANGES = [
  ["Heart rate", "60 – 100", "bpm"],
  ["Respiratory rate", "12 – 20", "breaths/min"],
  ["Body temperature", "36.1 – 37.2", "°C"],
  ["Oxygen saturation (SpO₂)", "95 – 100", "%"],
  ["Systolic blood pressure", "90 – 120", "mmHg"],
  ["Diastolic blood pressure", "60 – 80", "mmHg"],
  ["ECG QT interval", "350 – 440", "ms"],
];

const SAMPLE = [
  ["Heart rate", "72", "bpm", "ok"],
  ["Blood pressure", "118/76", "mmHg", "ok"],
  ["SpO₂", "93", "%", "bad"],
  ["Temperature", "36.8", "°C", "ok"],
];

function SampleReport() {
  return (
    <div className="box report-card" aria-label="Sample assessment preview">
      <div className="box-head">
        <span>Sample assessment</span>
        <span className="pill dark">Illustrative</span>
      </div>
      <div className="report-ecg ecg-paper">
        <EcgLine />
      </div>
      {SAMPLE.map(([label, value, unit, status]) => (
        <div key={label} className="report-row">
          <span>{label}</span>
          <span className="val">
            {value}
            <small>{unit}</small>
          </span>
          <span className={`pill ${status}`}>{status === "ok" ? "Normal" : "Low"}</span>
        </div>
      ))}
      <div className="report-result">
        <div>
          <div className="r-sub">Assessment</div>
          <div className="r-title">Low risk</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="r-sub">Confidence</div>
          <div className="r-title">85%</div>
        </div>
      </div>
    </div>
  );
}

export default function Home({ onSignIn, onGetStarted }) {
  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <div className="home">
      <div className="notice-strip">
        <div className="wrap">
          <span>
            <strong>Educational tool.</strong> Not for diagnosis.
          </span>
          <span className="hide-sm">In a medical emergency, call your local emergency number.</span>
        </div>
      </div>

      <header className="header">
        <div className="wrap header-bar">
          <Brand />
          <nav className="home-links" aria-label="Page sections">
            <button onClick={() => scrollTo("how")}>How it works</button>
            <button onClick={() => scrollTo("features")}>Features</button>
            <button onClick={() => scrollTo("ranges")}>Reference ranges</button>
          </nav>
          <div className="header-actions">
            <button className="btn ghost sm" onClick={onSignIn}>
              Sign in
            </button>
            <button className="btn sm hide-sm" onClick={onGetStarted}>
              Create account
            </button>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="wrap hero page">
          <div>
            <div className="eyebrow">Vital-sign risk assessment</div>
            <h1 className="hero-title">
              Understand health risk from <em>routine vital signs.</em>
            </h1>
            <p className="hero-sub">
              MedPredict checks ten common measurements against reference ranges and uses a machine-learning
              model to estimate overall health risk, with clear alerts and a report you can keep.
            </p>
            <div className="hero-ctas">
              <button className="btn lg" onClick={onGetStarted}>
                Start an assessment <span className="arrow">→</span>
              </button>
              <button className="btn ghost lg" onClick={() => scrollTo("how")}>
                How it works
              </button>
            </div>
            <div className="trust">
              <span><Icon name="check" size={18} /> Free to use</span>
              <span><Icon name="shield" size={18} /> Private account</span>
              <span><Icon name="file" size={18} /> PDF reports</span>
            </div>
          </div>
          <SampleReport />
        </section>

        {/* Stats */}
        <section className="wrap">
          <div className="box stats-band">
            {STATS.map((s) => (
              <div key={s.label} className="band-stat">
                <div className="band-value">{s.value}</div>
                <div className="band-label">{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="wrap section">
          <div className="section-head">
            <div className="eyebrow">How it works</div>
            <h2 className="section-h2">Three steps to an assessment</h2>
            <p>No setup and no special equipment — just the readings you already take.</p>
          </div>
          <div className="steps">
            {STEPS.map((s, i) => (
              <div key={s.title} className="box step">
                <div className="step-num">{i + 1}</div>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section id="features" className="wrap section">
          <div className="section-head">
            <div className="eyebrow">Features</div>
            <h2 className="section-h2">Clinical clarity, in one place</h2>
          </div>
          <div className="features">
            {FEATURES.map((f) => (
              <div key={f.title} className="box feature">
                <div className="feature-icon">
                  <Icon name={f.icon} size={22} />
                </div>
                <h3>{f.title}</h3>
                <p>{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Reference ranges + disclaimer */}
        <section id="ranges" className="wrap section">
          <div className="section-head">
            <div className="eyebrow">Reference ranges</div>
            <h2 className="section-h2">What MedPredict checks against</h2>
            <p>Typical resting values for healthy adults. Ranges vary with age, health conditions and medication.</p>
          </div>
          <div className="ranges-grid">
            <div className="box">
              <table className="table">
                <thead>
                  <tr>
                    <th>Measurement</th>
                    <th>Normal range</th>
                    <th>Unit</th>
                  </tr>
                </thead>
                <tbody>
                  {RANGES.map(([name, range, unit]) => (
                    <tr key={name}>
                      <td>{name}</td>
                      <td className="mono">{range}</td>
                      <td style={{ color: "var(--muted)" }}>{unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="callout">
              <h3>
                <Icon name="info" size={18} /> Important
              </h3>
              <p>
                MedPredict is an educational project. It is not a medical device and does not provide a
                diagnosis. Its assessments must not be used to make treatment decisions.
              </p>
              <p>
                Always consult a qualified healthcare professional about your health. If you think you are
                having a medical emergency, call your local emergency number immediately.
              </p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="wrap section">
          <div className="cta-band">
            <h2>
              Ready to run your <span>first assessment?</span>
            </h2>
            <button className="btn lg cta-btn" onClick={onGetStarted}>
              Create a free account <span className="arrow">→</span>
            </button>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="wrap footer-grid">
          <div>
            <Brand />
            <p>Vital-sign analysis and health-risk estimation, built as an educational machine-learning project.</p>
          </div>
          <div>
            <h4>Product</h4>
            <div className="footer-links">
              <button onClick={() => scrollTo("how")}>How it works</button>
              <button onClick={() => scrollTo("features")}>Features</button>
              <button onClick={() => scrollTo("ranges")}>Reference ranges</button>
            </div>
          </div>
          <div>
            <h4>Account</h4>
            <div className="footer-links">
              <button onClick={onSignIn}>Sign in</button>
              <button onClick={onGetStarted}>Create account</button>
            </div>
          </div>
        </div>
        <div className="wrap footer-base">
          <span>© {new Date().getFullYear()} MedPredict</span>
          <span>Not a medical device. For educational use only.</span>
        </div>
      </footer>
    </div>
  );
}
