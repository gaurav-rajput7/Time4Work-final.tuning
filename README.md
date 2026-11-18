# Time4Work

Time4Work is a study and productivity app for planning focused work, building habits, and tracking goals. It brings a learning roadmap, focus timers, a planner, and personal productivity tools together in a responsive Progressive Web App (PWA).

## Features

- **Roadmap** — organize study topics and projects into phases and track completion.
- **Focus** — run study sprints, guided breathing timers, and Pomodoro-style focus and break sessions.
- **Tasks and planner** — manage priorities, due dates, recurring tasks and events, subtasks, browser reminders, and standard iCalendar (`.ics`) import/export.
- **Habits** — track scheduled check-ins and streaks alongside breathing exercises.
- **Goals** — break goals into milestones and view daily study time in the target calendar.
- **Notes and reminders** — keep notes and review upcoming or overdue tasks, events, and goals.
- **Progress** — review study time, streaks, and productivity summaries.
- **Installable PWA** — install on supported devices. After the app shell is cached, core app files can load offline; external resources such as web fonts may still need a network connection.
- **Responsive interface** — use the app on mobile and desktop screens.

## Run locally

Time4Work runs on Next.js and uses the connected Neon database and Neon Auth service.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Configure `DATABASE_URL` and `NEON_AUTH_BASE_URL` for a self-hosted deployment; the connected Vercel project supplies these values in its environment.

## Project files

- `app/` — Next.js sign-in shell, page metadata, and authenticated state API.
- `components/app-shell.tsx` — Neon Auth sign-in and the synced app workspace.
- `public/index.html` — existing Time4Work interface, now backed by the authenticated cloud-state bridge.
- `public/calendar.js` — iCalendar import/export helpers.
- `public/sw.js` and `public/manifest.webmanifest` — PWA install and offline app-shell support.
- `lib/db/` — Drizzle schema and Neon connection.

## Data and accounts

Sign in with the connected Neon Auth service to keep your roadmap, tasks, habits, goals, notes, events, settings, profile, and progress in Neon. Each API request verifies the signed Neon Auth token and scopes reads and writes to that authenticated user. Local data from the previous browser-only account can be imported into the matching signed-in account on first sync. JSON backup and restore remain available in Settings.
