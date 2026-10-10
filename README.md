# RouteMate AI

RouteMate AI helps you compare Indian destinations, plan a trip, estimate its
budget, and adjust the plan when your needs change. It includes a FastAPI
backend and two browser interfaces:

1. **Main web app:** HTML, CSS, and JavaScript served by FastAPI. This is the
   easiest way to start the app.
2. **React web app:** a separate React and TypeScript interface in `frontend/`.
   It uses the same backend API.

The project uses demo destination and planning data. It does not book transport,
hotels, or attractions, and it does not provide live availability or live prices.

## What you can do

- Compare destinations using your budget, interests, trip duration, travel pace,
  and other preferences.
- Create a day-by-day itinerary and view estimated spending by category.
- Replan for a lower budget, rain, less walking, more nature, or a slower pace.
- Explore route maps and compare group preferences.
- Use the travel assistant, packing checklist, trip journal, and spending
  analytics.
- Create an account, save trips, and update your profile.

The sample destination catalog focuses on Indian states and regions, including
Goa, Himachal Pradesh, Karnataka, Kerala, Maharashtra, Rajasthan, Sikkim, Tamil
Nadu, and Uttarakhand.

## How the application works

1. **The browser collects your choices.** You choose a destination or ask the
   planner to compare destinations, then enter details such as dates, budget,
   travellers, interests, and preferred pace.
2. **The browser sends a request to the API.** The user interface calls routes
   under `/api`, such as the destination, planning, authentication, and saved
   trip endpoints.
3. **FastAPI validates and processes the request.** The backend uses Pydantic
   request models and its planning and decision-engine modules to calculate
   results.
4. **The backend returns JSON.** The browser renders the destination scores,
   itinerary, estimated costs, and explanations.
5. **You can adjust the result.** Replanning applies the selected change to the
   itinerary and its budget estimate. Estimates are planning guidance, not
   guaranteed supplier prices.
6. **Signed-in users can save trip data.** Protected account and trip routes
   require a bearer token. In local development the JSON files live under
   `backend/storage_data/` by default. Set `ROUTEMATE_DATA_DIR` to choose a
   different data directory.

### How destination matching works

The decision engine scores each destination against weighted factors such as
budget fit, interest match, trip length and pace, seasonal suitability, and
accessibility. It combines the factor scores into an overall match score from
0 to 100. A higher score means a closer match to the preferences supplied; it
is not a guarantee that the destination is objectively best.

### What happens to account and trip data

- Passwords for newly registered accounts are stored as PBKDF2 password hashes,
  not as readable passwords.
- Successful login returns a signed, expiring bearer token. The frontends use
  that token for protected API requests.
- Saved trips are associated with their account so one account cannot list or
  modify another account's saved trips through the protected trip API.
- Local JSON data is excluded from Git by `.gitignore`. It is not uploaded when
  you push the source code.
- A free cloud service may delete or replace local files during a restart or
  redeploy. Use persistent storage or a database if cloud accounts and trips
  must be retained.

## Requirements

For the backend and main web app:

- Python 3.10 or newer (the current Render configuration selects Python 3.13.4).
- pip.

For the optional React app:

- Node.js and npm.

## Quick start: main web app

These steps work in Windows PowerShell from the project folder.

1. Open PowerShell and go to the project:

   ```powershell
   cd "C:\path\to\RouteMate AI"
   ```

   Replace the example path with the folder where you saved the project.

2. Create a Python virtual environment:

   ```powershell
   py -m venv .venv
   ```

3. Activate it:

   ```powershell
   .\.venv\Scripts\Activate.ps1
   ```

   If PowerShell blocks activation, open Command Prompt and use
   `.\.venv\Scripts\activate.bat`, or run the venv Python executable directly
   in the commands below.

4. Install the backend packages:

   ```powershell
   python -m pip install -r requirements.txt
   ```

5. Start the backend and main web app:

   ```powershell
   python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
   ```

6. Open these addresses in your browser:

   - App: <http://127.0.0.1:8000/>
   - API health check: <http://127.0.0.1:8000/api/health>
   - Interactive API documentation: <http://127.0.0.1:8000/docs>

Keep the PowerShell window open while using the app. To stop the server, press
`Ctrl+C` in that window.

## Optional: run the React web app

The React interface is developed separately from the main FastAPI-served page.
Run the backend first using the previous instructions, then open a **second**
PowerShell window:

```powershell
cd "C:\path\to\RouteMate AI\frontend"
npm install
npm run dev
```

Open the Vite URL shown in the terminal (normally
<http://localhost:5173/>). Its development proxy sends `/api` requests to the
backend on port 8000.

To create a production React bundle:

```powershell
npm run build
```

This writes generated files to `frontend/dist/`. The current Render configuration
starts FastAPI and serves the main app in `backend/static/`; it does **not**
build or serve the React bundle.

## Step-by-step: plan a trip

1. Start the backend and open <http://127.0.0.1:8000/>.
2. Open the trip planner from the app navigation.
3. Enter your trip length, number of travellers, budget, and interests.
4. Select a destination or request a comparison.
5. Review the match score and the factors behind it. Use it as a comparison
   guide rather than a promise of real-world conditions.
6. Generate the itinerary and review each day's activities and estimated
   category costs.
7. Try a replan option such as **Budget Cut**, **Rain Contingency**, **Reduced
   Walking**, **More Nature**, or **Relax Pace**.
8. Sign in or register if you want to save a trip to your account.
9. Open your profile or analytics to review saved information and recorded
   spending.

## Accounts and authentication

In local development, the app can provide a demo traveler account. Demo login
is disabled by default when `APP_ENV=production`; do not enable it for a
production service unless you intentionally want demo access.

To create a personal account, register through the app with a valid email and a
password of at least 12 characters. A legacy account whose password was stored
before password hashing was added is upgraded to a hash at login; in production
it must change its password before accessing protected account features.

For production, configure `ROUTEMATE_SECRET_KEY` with a strong private value.
Never commit secrets or real account data to GitHub. If you suspect a secret or
password has been exposed, rotate it.

## Where local data is stored

By default, the backend creates JSON files in `backend/storage_data/` when it
needs them:

- `users.json` — account records and password hashes.
- `saved_trips.json` — saved itinerary and trip information.
- `user_preferences.json` — app preferences.

These files may contain private information. Keep them out of public source
control and make backups before moving or deleting them. You can choose another
directory before starting the server:

```powershell
$env:ROUTEMATE_DATA_DIR = "C:\RouteMateData"
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```

To use existing local data in another environment, transfer it privately and
securely into that environment's configured data directory. Do not upload the
files as source code or paste their contents into a public issue.

## Test the application

From the project root, activate the virtual environment and run:

```powershell
python -m pytest backend/tests/test_api.py -v
```

The tests cover the health endpoint, destination catalog, scoring and planning,
authentication, email updates, and account-specific saved trips.

To check the React TypeScript code and production bundle:

```powershell
cd frontend
npm install
npm run build
```

### Manual smoke test

1. Visit `/api/health`; confirm the response says `"status": "healthy"`.
2. Visit `/docs`; confirm the API documentation loads.
3. Open `/`; confirm the main application loads.
4. Generate a destination recommendation and itinerary.
5. Try a replan action and check the revised itinerary and estimate.
6. Register an account, sign in, update the profile, and save a trip.
7. Refresh and sign back in; confirm the saved trip appears.
8. Create a second account and confirm it cannot see the first account's trips.

## Deploy to Render

The repository includes a `render.yaml` blueprint for a free web service. To
deploy:

1. Push the project to a GitHub repository you control.
2. In Render, choose **New** → **Blueprint** and connect that repository.
3. Review the service settings from `render.yaml` and create the service.
4. Wait for the build and deployment to finish. Render runs the configured
   health check at `/api/health`.
5. Open the Render service URL and test the app and health endpoint.

The blueprint sets `APP_ENV=production`, disables demo login, and asks Render to
generate `ROUTEMATE_SECRET_KEY`. Keep this key private and do not replace it
without understanding that existing signed sessions will no longer validate.

**Important data limitation:** the current blueprint uses Render's free plan
without a persistent disk. JSON account and trip files may be lost when the
instance restarts or is redeployed. Do not rely on this setup as durable storage
for important user data. Before inviting real users, configure an appropriate
persistent database or paid persistent storage and plan a secure migration.

## Main project folders

```text
backend/
  data/          Sample destination data
  database/      JSON storage and account/trip persistence
  routers/       FastAPI API endpoints
  security/      Password hashing and signed-token authentication
  services/      Destination scoring, itinerary, and replanning logic
  static/        Main HTML, CSS, and JavaScript application
  tests/         Backend API and service tests
frontend/
  src/           Optional React and TypeScript interface
render.yaml      Render deployment configuration
requirements.txt Python dependencies
```

## Troubleshooting

| Problem | What to check |
|---|---|
| `python` or `py` is not recognized | Install Python, reopen PowerShell, and retry with `py`. |
| `No module named ...` | Activate `.venv` and run `python -m pip install -r requirements.txt`. |
| Port 8000 is already in use | Stop the other server or start this one on a different port. |
| The React page cannot reach the API | Confirm FastAPI is running on port 8000 and restart Vite. |
| Protected API returns 401 | Sign in again; the request needs a valid bearer token. |
| Saved data is missing on free hosting | Free ephemeral storage is not durable; use a persistent database/disk and restore a backup. |
| Render build fails | Open the service's build logs and confirm the root directory contains `requirements.txt` and `backend/`. |

## Change the main app theme

The main FastAPI-served interface uses CSS variables in
`backend/static/css/theme.css`. Change the values under `:root` for the light
theme and `[data-theme="dark"]` for dark mode. Refresh the browser to see the
changes. The React interface has its own styling in `frontend/src/index.css`.
