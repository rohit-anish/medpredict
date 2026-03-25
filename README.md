# 🫀 MedPredict — AI-Based Vital Analysis & Health Prediction System

> Hackathon Project · 24H Build · 2–3 Person Team

---

## 📁 Project Structure

```
vital-app/
├── ml/
│   ├── train_model.py          # ML training script
│   └── model_artifacts/        # Generated after training
│       ├── model.pkl
│       ├── scaler.pkl
│       ├── label_encoder.pkl
│       └── model_meta.json
│
├── backend/
│   ├── main.py                 # FastAPI server
│   └── requirements.txt
│
└── frontend/
    ├── src/
    │   ├── App.jsx             # Main React dashboard
    │   └── main.jsx
    ├── index.html
    ├── vite.config.js
    └── package.json
```

---

## 🚀 Setup in Order

### STEP 1 — Train the ML Model

```bash
cd ml/
pip install -r ../backend/requirements.txt
python train_model.py
```

**Expected output:**
- RF Accuracy: ~100%  
- Files saved: `model_artifacts/model.pkl`, `scaler.pkl`, `label_encoder.pkl`, `model_meta.json`

> ⚠️ Make sure `DATASET_PATH` in `train_model.py` points to your `.xlsx` file.

---

### STEP 2 — Start the Backend API

```bash
cd backend/
pip install -r requirements.txt

# Copy model artifacts into backend/
cp -r ../ml/model_artifacts ./

uvicorn main:app --reload --port 8000
```

**Test the API:**
```bash
curl http://localhost:8000/
# → {"status":"ok","message":"Vital Analysis API running"}

curl http://localhost:8000/model/info
# → model accuracy, feature importances, confusion matrix

curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{"heart_rate":75,"respiratory_rate":16,"body_temperature":36.6,
       "oxygen_saturation":98,"systolic_bp":118,"diastolic_bp":76,
       "age":35,"weight_kg":70,"height_m":1.72,"ecg_qt_interval_ms":380}'
```

---

### STEP 3 — Start the Frontend

```bash
cd frontend/
npm install
npm run dev
# Opens at http://localhost:3000
```

---

## 🔌 Connecting Frontend to Backend

In `frontend/src/App.jsx`, toggle the `demoMode` switch in the top-right:
- **Demo Mode ON** → works offline, uses heuristic simulation
- **Demo Mode OFF** → calls `http://localhost:8000/predict` (backend must be running)

---

## 🧠 ML Model Details

| Detail | Value |
|--------|-------|
| Dataset | 100,000 patient records |
| Features | 14 vital + derived parameters |
| Target | Risk Category (High / Low Risk) |
| Best Model | RandomForest (100 trees, depth 12) |
| Accuracy | 100% on test set |
| Train/Test Split | 80/20 stratified |

**Top Features by Importance:**
1. BMI (51.3%)
2. Heart Rate (25.7%)
3. Weight (9.9%)
4. Height (6.7%)
5. ECG QT Interval (5.8%)

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Health check |
| GET | `/model/info` | Model accuracy, features, confusion matrix |
| POST | `/predict` | Predict risk from vitals |
| GET | `/normal-ranges` | Clinical normal ranges |

### POST /predict — Request Body

```json
{
  "heart_rate": 75,
  "respiratory_rate": 16,
  "body_temperature": 36.6,
  "oxygen_saturation": 98,
  "systolic_bp": 118,
  "diastolic_bp": 76,
  "age": 35,
  "weight_kg": 70,
  "height_m": 1.72,
  "ecg_qt_interval_ms": 380
}
```

### Response

```json
{
  "risk_category": "Low Risk",
  "confidence": 0.96,
  "probabilities": { "High Risk": 0.04, "Low Risk": 0.96 },
  "alerts": [],
  "derived_values": {
    "Derived_BMI": 23.66,
    "Derived_MAP": 90.0,
    "Derived_Pulse_Pressure": 42,
    "Derived_HRV": 45.5
  },
  "model_info": { "type": "RandomForest", "accuracy": 1.0 }
}
```

---

## 🎯 Dashboard Features

- **Vitals Input** — Sliders + number inputs for all 14 parameters
- **ECG Waveform** — Simulated ECG visualization based on QT interval & HR
- **Prediction Result** — Risk category, confidence gauge, probability display
- **Clinical Alerts** — Auto-generated warnings for out-of-range vitals
- **Radar Chart** — Multi-axis vital parameter comparison
- **Feature Importance** — Bar chart of model's decision factors
- **Derived Metrics** — BMI, MAP, Pulse Pressure, HRV
- **History Tab** — Time-series trends + prediction log table

---

## 🏁 Hackathon Pitch Flow (5 mins)

1. **Problem** (30s) — Vital monitoring needs intelligent risk prediction
2. **Solution** (30s) — ML model trained on 100K records, real-time dashboard
3. **Demo** (3 min) — Input vitals → show alerts → show prediction → show history trend
4. **Tech** (30s) — RandomForest → FastAPI → React + Recharts
5. **Impact** (30s) — Deployable, extendable to real IoT sensor data

---

## ⚡ Quick Hackathon Tips

- **For demo:** Pre-load a "High Risk" example (HR=95, SpO2=93, SBP=145) and a "Low Risk" one
- **Judges love:** Live switching between patients in History tab to show trends
- **If API fails:** Demo Mode covers you — toggle it on
- **Deploy frontend:** `npm run build` → drag `dist/` to [Vercel](https://vercel.com) for live URL

---

## 📦 Tech Stack

| Layer | Tech |
|-------|------|
| ML Training | Python, scikit-learn, pandas |
| Backend API | FastAPI, uvicorn, joblib |
| Frontend | React 18, Vite, Recharts |
| Data | 100K records, 18 features, XLSX |
