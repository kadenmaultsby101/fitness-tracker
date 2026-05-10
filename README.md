# Trace

A quiet habit tracker. Single page, vanilla HTML / CSS / JS — no frameworks,
no build step. Data lives in `localStorage`. Installs to your phone home
screen as a PWA.

## Files

```
index.html          markup + iOS / PWA meta tags
style.css           full stylesheet (black / white only)
app.js              habit logic, streaks, notifications
manifest.json       PWA manifest
service-worker.js   offline cache
icon.svg            the T mark (source of truth)
icon-192.png        generated raster icon (192 x 192)
icon-512.png        generated raster icon (512 x 512)
scripts/generate-icons.js   regenerates the PNGs from the SVG geometry
```

To regenerate the PNG icons after tweaking the T:

```bash
node scripts/generate-icons.js
```

## Run locally

Service workers and the Notification API require an HTTP origin (not
`file://`). Pick any static server:

```bash
# Python 3
python3 -m http.server 5173

# Node (no install)
npx serve -l 5173 .
```

Then open <http://localhost:5173>.

On first load you'll be prompted for notification permission. If you allow it,
Trace schedules two reminders for the current session: 8:00 AM (`Trace — start
the day`) and 9:30 PM (`Trace — check in`). You can toggle this in the gear
screen later.

> Note on background notifications: vanilla PWAs don't get true background
> push on iOS without a push server. Notifications fire while the PWA is
> open in the foreground or recently backgrounded. For a real always-on
> reminder, you'd need a Web Push backend — out of scope for v1.

## Deploy to Vercel

The project is already static — no build step needed.

```bash
# Once, globally:
npm i -g vercel

# From this directory:
vercel              # follow prompts, accept defaults
vercel --prod       # promote to a production URL
```

Vercel will pick up `index.html` automatically. The first deploy gives you a
preview URL like `trace-xxxx.vercel.app`; `--prod` pins it to your project's
production domain.

You can also drag-and-drop the project folder into the Vercel dashboard
("Add New → Project → import from local") if you'd rather not use the CLI.

## Add to iPhone home screen

1. Open your deployed URL in **Safari** (not Chrome — Chrome on iOS can't
   install PWAs).
2. Tap the **Share** button (square with an up-arrow at the bottom).
3. Scroll down and tap **Add to Home Screen**.
4. The name should auto-fill as **Trace**. Tap **Add**.
5. Find the white **T** on a black tile on your home screen. Tap it — the app
   opens fullscreen with no Safari chrome.

The first launch caches the app shell, so it'll keep working offline after
that. To get an update, tap-and-hold the icon, delete it, and re-add it
(iOS doesn't refresh installed PWAs aggressively).

## Data

Everything is stored under the single `localStorage` key `trace-data`:

```js
{
  habits: [{ id, name, timeOfDay, createdAt }],
  completions: { "YYYY-MM-DD": [habitId, habitId, ...] },
  settings: { notificationsEnabled: true },
  lastOpenedDate: "YYYY-MM-DD"
}
```

Streaks are computed fresh on every render by walking backwards from today.
"Reset all data" in the habits screen wipes the key and reseeds the nine
starting habits.
