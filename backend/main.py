"""
MEDPREDICT Health Prediction API
Run: uvicorn main:app --reload --port 8000
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional
import joblib, json, numpy as np
from pathlib import Path

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import hashlib

app = FastAPI()

users_db = {}

class User(BaseModel):
    username: str
    password: str

def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

@app.post("/register")
def register(user: User):
    if user.username in users_db:
        raise HTTPException(status_code=400, detail="User already exists")
    
    users_db[user.username] = hash_password(user.password)
    return {"message": "User registered successfully"}

@app.post("/login")
def login(user: User):
    if user.username not in users_db:
        raise HTTPException(status_code=400, detail="User not found")
    
    if users_db[user.username] != hash_password(user.password):
        raise HTTPException(status_code=400, detail="Invalid password")
    
    return {"message": "Login successful", "token": "dummy-token"}

app = FastAPI(title="Vital Analysis API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Load artifacts ─────────────────────────────────────────────────────────────
BASE = Path(__file__).parent / "model_artifacts"
model   = joblib.load(BASE / "model.pkl")
scaler  = joblib.load(BASE / "scaler.pkl")
le      = joblib.load(BASE / "label_encoder.pkl")
with open(BASE / "model_meta.json") as f:
    meta = json.load(f)

FEATURES = meta["features"]

# Normal ranges for alert generation
NORMAL_RANGES = {
    "Heart Rate":                 (60, 100),
    "Respiratory Rate":           (12, 20),
    "Body Temperature":           (36.1, 37.2),
    "Oxygen Saturation":          (95, 100),
    "Systolic Blood Pressure":    (90, 120),
    "Diastolic Blood Pressure":   (60, 80),
    "ECG_QT_Interval_ms":         (350, 440),
}

# ── Schemas ────────────────────────────────────────────────────────────────────
class VitalInput(BaseModel):
    heart_rate:              float = Field(..., ge=30,  le=200,   description="BPM")
    respiratory_rate:        float = Field(..., ge=5,   le=60)
    body_temperature:        float = Field(..., ge=34,  le=42,    description="Celsius")
    oxygen_saturation:       float = Field(..., ge=70,  le=100,   description="SpO2 %")
    systolic_bp:             float = Field(..., ge=70,  le=200)
    diastolic_bp:            float = Field(..., ge=40,  le=130)
    age:                     float = Field(..., ge=0,   le=120)
    weight_kg:               float = Field(..., ge=20,  le=300)
    height_m:                float = Field(..., ge=0.5, le=2.5)
    ecg_qt_interval_ms:      float = Field(..., ge=200, le=600)
    # derived fields — computed server-side if not provided
    derived_hrv:             Optional[float] = None
    derived_pulse_pressure:  Optional[float] = None
    derived_bmi:             Optional[float] = None
    derived_map:             Optional[float] = None

class PredictionResponse(BaseModel):
    risk_category:    str
    confidence:       float
    probabilities:    dict
    alerts:           list
    derived_values:   dict
    model_info:       dict

# ── Helpers ────────────────────────────────────────────────────────────────────
def compute_derived(v: VitalInput) -> dict:
    pulse_pressure = v.systolic_bp - v.diastolic_bp
    bmi            = v.weight_kg / (v.height_m ** 2)
    map_val        = v.diastolic_bp + (pulse_pressure / 3)
    # HRV: rough estimate if not given
    hrv = v.derived_hrv if v.derived_hrv is not None else round(50 - (v.heart_rate - 60) * 0.3, 2)
    return {
        "Derived_HRV":            hrv,
        "Derived_Pulse_Pressure": pulse_pressure,
        "Derived_BMI":            round(bmi, 2),
        "Derived_MAP":            round(map_val, 2),
    }

def generate_alerts(v: VitalInput) -> list:
    alerts = []
    checks = {
        "Heart Rate":              v.heart_rate,
        "Respiratory Rate":        v.respiratory_rate,
        "Body Temperature":        v.body_temperature,
        "Oxygen Saturation":       v.oxygen_saturation,
        "Systolic Blood Pressure": v.systolic_bp,
        "Diastolic Blood Pressure":v.diastolic_bp,
        "ECG_QT_Interval_ms":      v.ecg_qt_interval_ms,
    }
    for param, value in checks.items():
        lo, hi = NORMAL_RANGES[param]
        if value < lo:
            severity = "critical" if value < lo * 0.85 else "warning"
            alerts.append({"param": param, "value": value, "status": "low", "severity": severity,
                           "message": f"{param} is below normal range ({lo}–{hi})"})
        elif value > hi:
            severity = "critical" if value > hi * 1.15 else "warning"
            alerts.append({"param": param, "value": value, "status": "high", "severity": severity,
                           "message": f"{param} is above normal range ({lo}–{hi})"})
    return alerts

# ── Routes ─────────────────────────────────────────────────────────────────────
@app.get("/")
def root():
    return {"status": "ok", "message": "Vital Analysis API running"}

@app.get("/model/info")
def model_info():
    return {
        "model_type":           meta["model_type"],
        "accuracy":             meta["accuracy"],
        "rf_accuracy":          meta["rf_accuracy"],
        "gb_accuracy":          meta["gb_accuracy"],
        "train_samples":        meta["train_samples"],
        "test_samples":         meta["test_samples"],
        "classes":              meta["classes"],
        "feature_importances":  meta["feature_importances"],
        "confusion_matrix":     meta["confusion_matrix"],
    }

@app.post("/predict", response_model=PredictionResponse)
def predict(vitals: VitalInput):
    derived = compute_derived(vitals)
    alerts  = generate_alerts(vitals)

    feature_vector = [
        vitals.heart_rate, vitals.respiratory_rate, vitals.body_temperature,
        vitals.oxygen_saturation, vitals.systolic_bp, vitals.diastolic_bp,
        vitals.age, vitals.weight_kg, vitals.height_m,
        derived["Derived_HRV"], derived["Derived_Pulse_Pressure"],
        derived["Derived_BMI"], derived["Derived_MAP"],
        vitals.ecg_qt_interval_ms,
    ]

    X = np.array(feature_vector).reshape(1, -1)
    X_scaled = scaler.transform(X)

    pred_idx   = model.predict(X_scaled)[0]
    proba      = model.predict_proba(X_scaled)[0]
    risk_label = le.inverse_transform([pred_idx])[0]
    confidence = float(round(proba[pred_idx], 4))

    proba_dict = {cls: round(float(p), 4) for cls, p in zip(le.classes_, proba)}

    return PredictionResponse(
        risk_category  = risk_label,
        confidence     = confidence,
        probabilities  = proba_dict,
        alerts         = alerts,
        derived_values = derived,
        model_info     = {"type": meta["model_type"], "accuracy": meta["accuracy"]},
    )

@app.get("/normal-ranges")
def normal_ranges():
    return NORMAL_RANGES
