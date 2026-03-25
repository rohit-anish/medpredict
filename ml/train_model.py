"""
Vital Signs Health Prediction - ML Training Script
Dataset: human_vital_signs_dataset_with_ecg.csv
Target: Risk Category (High Risk / Low Risk)
"""

import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.metrics import classification_report, accuracy_score, confusion_matrix
import joblib
import json
import os

# ── Config ─────────────────────────────────────────────────────────────────────
DATASET_PATH = "human_vital_signs_dataset_with_ecg.csv"   # adjust path as needed
OUTPUT_DIR   = "./model_artifacts"
os.makedirs(OUTPUT_DIR, exist_ok=True)

FEATURES = [
    "Heart Rate", "Respiratory Rate", "Body Temperature",
    "Oxygen Saturation", "Systolic Blood Pressure", "Diastolic Blood Pressure",
    "Age", "Weight (kg)", "Height (m)",
    "Derived_HRV", "Derived_Pulse_Pressure", "Derived_BMI",
    "Derived_MAP", "ECG_QT_Interval_ms"
]
TARGET = "Risk Category"

# ── Load & Prepare ─────────────────────────────────────────────────────────────
print("Loading dataset...")
df = pd.read_csv(DATASET_PATH)

# Encode gender (not used as feature but kept for reference)
le_gender = LabelEncoder()
df["Gender_enc"] = le_gender.fit_transform(df["Gender"])

X = df[FEATURES]
y = df[TARGET]

le_target = LabelEncoder()   # High Risk=0, Low Risk=1 (alphabetical)
y_enc = le_target.fit_transform(y)
print("Classes:", le_target.classes_)

# ── Split ──────────────────────────────────────────────────────────────────────
X_train, X_test, y_train, y_test = train_test_split(
    X, y_enc, test_size=0.2, random_state=42, stratify=y_enc
)

scaler = StandardScaler()
X_train_s = scaler.fit_transform(X_train)
X_test_s  = scaler.transform(X_test)

# ── Train Random Forest ────────────────────────────────────────────────────────
print("\nTraining Random Forest...")
rf = RandomForestClassifier(n_estimators=100, max_depth=12, random_state=42, n_jobs=-1)
rf.fit(X_train_s, y_train)
rf_preds = rf.predict(X_test_s)
rf_acc   = accuracy_score(y_test, rf_preds)
print(f"Random Forest Accuracy: {rf_acc:.4f}")
print(classification_report(y_test, rf_preds, target_names=le_target.classes_))

# ── Train Gradient Boosting ────────────────────────────────────────────────────
print("\nTraining Gradient Boosting...")
gb = GradientBoostingClassifier(n_estimators=100, max_depth=5, random_state=42)
gb.fit(X_train_s, y_train)
gb_preds = gb.predict(X_test_s)
gb_acc   = accuracy_score(y_test, gb_preds)
print(f"Gradient Boosting Accuracy: {gb_acc:.4f}")
print(classification_report(y_test, gb_preds, target_names=le_target.classes_))

# ── Pick Best & Save ───────────────────────────────────────────────────────────
best_model = rf if rf_acc >= gb_acc else gb
best_name  = "RandomForest" if rf_acc >= gb_acc else "GradientBoosting"
print(f"\nBest model: {best_name} ({max(rf_acc, gb_acc):.4f})")

joblib.dump(best_model, f"{OUTPUT_DIR}/model.pkl")
joblib.dump(scaler,     f"{OUTPUT_DIR}/scaler.pkl")
joblib.dump(le_target,  f"{OUTPUT_DIR}/label_encoder.pkl")

# Feature importances
importances = dict(zip(FEATURES, best_model.feature_importances_))
importances = dict(sorted(importances.items(), key=lambda x: x[1], reverse=True))

# Save metadata
meta = {
    "model_type":  best_name,
    "accuracy":    round(max(rf_acc, gb_acc), 4),
    "rf_accuracy": round(rf_acc, 4),
    "gb_accuracy": round(gb_acc, 4),
    "classes":     le_target.classes_.tolist(),
    "features":    FEATURES,
    "feature_importances": {k: round(v, 4) for k, v in importances.items()},
    "train_samples": len(X_train),
    "test_samples":  len(X_test),
    "confusion_matrix": confusion_matrix(y_test, rf_preds if rf_acc >= gb_acc else gb_preds).tolist()
}
with open(f"{OUTPUT_DIR}/model_meta.json", "w") as f:
    json.dump(meta, f, indent=2)

print(f"\nAll artifacts saved to {OUTPUT_DIR}/")
print("Files: model.pkl, scaler.pkl, label_encoder.pkl, model_meta.json")
print("\nTop 5 important features:")
for feat, imp in list(importances.items())[:5]:
    print(f"  {feat}: {imp:.4f}")
