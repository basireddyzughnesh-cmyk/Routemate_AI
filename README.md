# RouteMate AI — Quick Guide

## Start the app (Windows)

You only need Python for the main app. Do these steps in PowerShell.

### 1. Open the project folder

```powershell
cd "C:\Users\Zugne\OneDrive\Desktop\RouteMate AI"
```

### 2. Install what the app needs

Run this once, or again if you see a missing-package error:

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

### 3. Start the app

```powershell
.\.venv\Scripts\python.exe -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```

Leave this PowerShell window open while using the app.

### 4. Open the app

Go to **http://127.0.0.1:8000/** in your browser.

- Check that it is running: **http://127.0.0.1:8000/api/health**
- API testing page: **http://127.0.0.1:8000/docs**

### 5. Stop the app

Click the PowerShell window and press **Ctrl+C**.

## Try a trip

1. Open the planner in the app.
2. Enter your trip length, number of travellers, budget, and interests.
3. Choose a destination or compare destinations.
4. Generate the itinerary and review the estimated costs.
5. Try a change such as **Budget Cut**, **Rain Contingency**, or **Relax Pace**.
6. Sign in or register to save a trip.

The destination list is focused on India. Budgets and itineraries are estimates;
the app does not book hotels, transport, or activities.

## Test the app

With the project virtual environment set up, run this from the project folder:

```powershell
.\.venv\Scripts\python.exe -m pytest backend\tests\test_api.py -v
```

Expected result: all tests pass. To check the optional React interface:

```powershell
cd frontend
npm install
npm run build
```

The main app does not need React or npm. The React app is optional and runs
separately; the current cloud setup serves the main app.

## Save data and account safety

- Local accounts and saved trips are stored in JSON files in
  `backend/storage_data/`.
- Those files contain private data and are excluded from GitHub.
- Do not delete them if you want to keep your local accounts and trips.
- The Render free plan in this project does **not** have permanent file storage.
  Cloud accounts and saved trips may disappear after a restart or redeploy.
  Use a database or persistent storage before relying on cloud data.
- Production demo login is disabled. New users can register an account.

## Deploy to Render

The GitHub repository is
<https://github.com/basireddyzughnesh-cmyk/Routemate_AI>.

1. Sign in to Render and choose **New** → **Blueprint**.
2. Connect the RouteMate AI GitHub repository.
3. Select `render.yaml` and create the service.
4. Wait for deployment, then open the Render URL.
5. Check that `<your-render-url>/api/health` reports `"status": "healthy"`.

**Important:** this free setup may lose saved cloud data. Do not use it for
important user data until persistent storage or a database is configured.

## If something goes wrong

| Problem | Try this |
|---|---|
| App page does not open | Check that the server is still running in PowerShell. |
| Port 8000 is busy | Stop the other app using port 8000, or change `8000` in the start command and URL. |
| Missing Python package | Run the install command again. |
| Sign-in or saved trips fail | Sign in again. Protected features need an active session. |
| Cloud trips disappear | Free hosting does not guarantee permanent storage. |

## What the app does

The browser sends your choices to the FastAPI backend. The backend compares
destinations, creates an itinerary and budget estimate, then sends the results
back to the browser. You can change the plan and save trips when signed in.
Match scores and costs are guidance based on the app's sample data, not live
travel information.
