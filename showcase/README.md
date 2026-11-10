# openGym Feature Engineering Showcase

A zero-dependency, ultra-lightweight (<40KB runtime), unslop-style portfolio web application engineered by **Parth Patil**.

## Features Showcased
1. **Interactive Android Workout Widget**: Native `RemoteViews` + Capacitor Native Bridge (`WorkoutWidgetManager.java`, 892 LOC) with two-way state sync, weight/rep steppers, dynamic canvas accent paint, and zero background battery drain.
2. **Android Live Rest Timer Notification**: Foreground notification channel with circular quick-action buttons (`-15s`, `+15s`, `SKIP`), non-blocking timer loops, and hardware vibration waveforms (`RestTimerManager.java`, 367 LOC).
3. **Algorithmic Muscle Recovery & SVG BodyMap**: 7-day rolling fatigue decay model mapping compound exercises to primary agonist and secondary stabilizer groups with real-time SVG heatmap color transitions (`recovery.js`, 76 LOC).
4. **Defensive Workout Completion Guard**: Non-blocking modal sheet intercepting premature session finishes to prevent silent volume loss (`sheets.jsx` & `Workout.jsx`).

## Running & Previewing Locally

### Option 1: Direct File Open (Zero Tooling)
Simply double-click `index.html` or open in any web browser:
```
file:///path/to/openGym/showcase/index.html
```

### Option 2: Lightweight HTTP Server
```bash
# Python
python -m http.server 3000 --directory showcase

# Node / npx
npx serve showcase -l 3000
```

## Deploying to Your Portfolio

### Deploy to GitHub Pages:
1. In your GitHub repository (`github.com/parthpatyl/openGym`), go to **Settings > Pages**.
2. Under **Build and deployment > Branch**, select `feat/android-rest-timer-widget` (or `main`), and choose `/showcase` (or set up a GitHub Action to deploy `/showcase`).
3. Your showcase will be live at `https://parthpatyl.github.io/openGym/showcase/`.

### Embed in Your Portfolio as an iframe:
```html
<iframe 
  src="https://parthpatyl.github.io/openGym/showcase/" 
  width="100%" 
  height="900px" 
  style="border: none; border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.3);"
  title="openGym Engineering Showcase by Parth Patil">
</iframe>
```
