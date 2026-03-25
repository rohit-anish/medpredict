# 🫀 MedPredict — AI-Based Vital Analysis & Health Prediction System

An intelligent application that collects and analyzes human vital parameters using Machine Learning to predict potential health conditions in real time.

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

## 🔐 Demo Credentials during run

Username: admin  
Password: admin123

---

## 🚀 Setup

### STEP 1 — Train the ML Model

```bash
cd ml/
pip install -r ../backend/requirements.txt
python train_model.py
```

> ⚠️ Place `final_dataset_with_ecg.xlsx` inside the `ml/` folder before running.

**Expected output:**
- RF Accuracy: ~100%
- Files saved: `model_artifacts/model.pkl`, `scaler.pkl`, `label_encoder.pkl`, `model_meta.json`

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

In `frontend/src/App.jsx`, toggle the `demoMode` switch in the top-right corner:
- **Demo Mode ON** → works fully offline using heuristic simulation
- **Demo Mode OFF** → calls `http://localhost:8000/predict` (backend must be running)

---

## 🧠 ML Model Details

| Detail | Value |
|--------|-------|
| Dataset | 100,000 patient records |
| Features | 14 vital + derived parameters |
| Target | Risk Category (High Risk / Low Risk) |
| Best Model | RandomForest (100 trees, depth 12) |
| Accuracy | 100% on test set |
| Train/Test Split | 80/20 stratified |

**Top Features by Importance:**
1. BMI — 51.3%
2. Heart Rate — 25.7%
3. Weight — 9.9%
4. Height — 6.7%
5. ECG QT Interval — 5.8%

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

## 📦 Tech Stack

| Layer | Tech |
|-------|------|
| ML Training | Python, scikit-learn, pandas |
| Backend API | FastAPI, uvicorn, joblib |
| Frontend | React 18, Vite, Recharts |
| Data | 100K records, 18 features, XLSX |

