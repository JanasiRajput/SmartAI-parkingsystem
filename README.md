# Smart Parking Friction Predictor 🚗✨

## 🌟 The Big Goal
The **Smart Parking Friction Predictor** is designed to transform urban parking from a source of frustration into a seamless, high-end experience. By leveraging predictive intelligence, it anticipates lot congestion *before* it happens, allowing operators to manage flow and drivers to avoid the "friction" of a full lot. 

Our goal is to create a frictionless urban mobility ecosystem through elegant design and advanced predictive analytics.

---

## 🚀 Quick Start (Simplest Steps)

To run this application locally, you will need two terminal windows open:

### 1. Start the Backend (API)
```bash
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --reload
```
*Runs on: http://localhost:8000*

### 2. Start the Frontend (Dashboard)
```bash
cd frontend
npm install
npm start
```
*Runs on: http://localhost:4200*

---

## ✨ Key Features
- **Sophisticated Design**: A premium Burgundy & Gold luxury theme with both **Dark** and **Light** modes.
- **AI Predictions**: Real-time analysis that warns you when the lot is projected to be full.
- **Access Registry**: A live list of all active vehicles currently in the lot.
- **Friction Scoring**: A 0-10 "Frustration Score" based on current congestion levels.
- **Interactive UX**: Built-in info bubbles (hover ⓘ) to explain every metric and feature.

---

## 🛠️ Tech Stack
- **Backend**: FastAPI (Python), SQLAlchemy, WebSockets.
- **Frontend**: Angular, RxJS, Signals, CSS Glassmorphism.
- **Database**: SQLite (Automated setup on first run).

---
*Created with elegance for Urban Mobility Intelligence.*
