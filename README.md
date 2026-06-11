# Shinkansen Brain

Autonomous Railway Intelligence Operating System inspired by the Shinkansen safety philosophy.

This is a complete hackathon-ready product prototype with a React/Vite frontend, FastAPI backend, SQLite persistence, live WebSockets, anomaly detection, digital twin scenarios, incident memory, future simulator, and PDF black-box reports.

## Features

- Premium animated landing page and six-product-page interface
- Live command center with animated trains across Delhi, Agra, Jhansi, Bhopal, Nagpur, Lucknow, and Kanpur
- Simulated sensor network for vibration, temperature, bridge stress, signal health, and weather
- Threshold-based anomaly detection for track cracks, flood risk, bridge stress, and signal failures
- Shinkansen Brain agent loop: Detect -> Reason -> Decide -> Act -> Report
- Digital twin buttons for Flood, Earthquake, Track Crack, Signal Failure, and Bridge Failure
- Railway Memory dashboard with historical incidents and trend charts
- Railway Black Box PDF report generation using ReportLab
- Future simulator from 2026 to 2040
- Optional Gemini API integration facade with deterministic fallback

## Project Structure

```text
shinkansen-brain/
  backend/
    app/
      ai_agent.py
      config.py
      database.py
      main.py
      models.py
      pdf.py
      railway.py
      schemas.py
    requirements.txt
    .env.example
  frontend/
    src/
      main.tsx
      styles.css
    package.json
    .env.example
    vite.config.ts
    tailwind.config.js
    postcss.config.js
    vercel.json
  render.yaml
  README.md
```

## Local Setup

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --reload --port 8000
```

The API will run at `http://localhost:8000`. SQLite is created automatically with sample incidents and sensor data.

### Frontend

```bash
cd frontend
npm install
copy .env.example .env
npm run dev
```

The app will run at `http://localhost:5173`.

## Environment Variables

Backend:

- `DATABASE_URL`: defaults to `sqlite:///./shinkansen_brain.db`
- `GEMINI_API_KEY`: optional; leave empty for deterministic local reasoning
- `CORS_ORIGINS`: comma-separated frontend origins

Frontend:

- `VITE_API_URL`: backend HTTP URL
- `VITE_WS_URL`: backend WebSocket URL

## API Routes

- `GET /health`
- `GET /network`
- `GET /sensors?limit=180`
- `GET /incidents?limit=80`
- `POST /simulate`
- `GET /memory/summary`
- `GET /future/{year}`
- `GET /reports/{incident_id}/pdf`
- `WS /ws/live`

## Deployment

### Render Backend

Use the included `render.yaml`, or create a Render Web Service:

- Root directory: `backend`
- Build command: `pip install -r requirements.txt`
- Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

Set `CORS_ORIGINS` to your Vercel URL.

### Vercel Frontend

Import the `frontend` directory into Vercel.

Set:

- `VITE_API_URL=https://your-render-api.onrender.com`
- `VITE_WS_URL=wss://your-render-api.onrender.com/ws/live`

## Hackathon Demo Flow

1. Open the landing page and enter Command Center.
2. Watch trains move and sensors stream every 2 seconds.
3. Open Digital Twin and trigger Track Crack or Bridge Failure.
4. Show the agent loop deciding mitigation.
5. Open Railway Memory to show learned incident history.
6. Download a Black Box PDF from Incident Reports.
7. Close with Future Simulator projections through 2040.
