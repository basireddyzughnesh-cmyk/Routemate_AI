# RouteMate AI — Frontend (React + Vite + TypeScript)

This is the standalone React frontend for **RouteMate AI — Your Personal AI Travel Decision Engine**.

## 🚀 Quick Start

### 1. Prerequisites
Make sure the backend is running first:
```bash
# In the project root directory
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```

### 2. Install Dependencies
```bash
cd frontend
npm install
```

### 3. Start Development Server
```bash
npm run dev
```
The app will be running at `http://localhost:5173`. API requests to `/api` are automatically proxied to `http://127.0.0.1:8000`.

### 4. Build for Production
```bash
npm run build
```
Generates production-ready optimized bundles in `frontend/dist/`.

---

## 📁 Project Structure

```
frontend/
├── index.html              # HTML entrypoint with Leaflet CSS & typography
├── package.json            # React 18, Vite, Lucide Icons, Leaflet
├── tsconfig.json           # TypeScript configuration
├── vite.config.ts          # Vite configuration with API proxy to port 8000
└── src/
    ├── main.tsx            # React DOM root render
    ├── App.tsx             # Main routing & state hub (11 views + chat + modals)
    ├── index.css           # Design tokens, themes & layout styles
    ├── components/
    │   ├── Navbar.tsx      # Responsive header with navigation & user profile pill
    │   ├── Footer.tsx      # Footer with brand links & quick jump navigation
    │   └── AuthModal.tsx   # Sign In, Registration & 1-Click Demo Login
    ├── services/
    │   └── api.ts          # Type-safe API client for all RouteMate AI endpoints
    └── types/
        └── index.ts        # TypeScript schemas matching backend Pydantic models
```

---

## 🌟 Key Features Implemented in the Frontend
1. **Interactive Trip Planner**: Multi-day schedule generation, pacing, travel party sizing, and budget sliders.
2. **Decision Engine & Multi-Attribute Scoring**: Custom weights (Budget, Weather, Safety, Cultural Match, Crowds) with MAUT algorithms.
3. **Dynamic Replanning Engine**: 1-click contingencies for Rain, -20% Budget Cut, Low Walking (Mobility friendly), and Relaxed Pace.
4. **Group Travel Consensus**: Multi-member preferences, compromise detection, and fair expense sharing.
5. **Interactive Route Map**: Leaflet.js waypoint mapping with step-by-step route visualization.
6. **Expense Tracker & Analytics**: Live budget vs. actual spend graphs and category breakdowns.
7. **Traveler Profile & Auth**: Authentication, avatar customization, passport stamps, saved trips, and travel style preferences.
8. **24/7 AI Floating Assistant**: Context-aware travel copilot.
