# Time4Work

Time4Work is a study and productivity app for planning focused work, building habits, and keeping track of goals. It combines a learning roadmap, study timer, planner, and personal productivity tools in a responsive Progressive Web App (PWA).

## Features

- **Roadmap** — organize study topics and projects into phases and track completion.
- **Focus sessions** — run a study sprint, breathing timer, or Pomodoro break.
- **Tasks and planner** — manage tasks, due dates, recurring tasks, and calendar events.
- **Habits and breathing** — track scheduled daily habits and streaks alongside breathing exercises.
- **Goals and target calendar** — break goals into milestones and view daily study progress on a calendar.
- **Notes and reminders** — keep notes and review upcoming or overdue items.
- **Progress** — view study time, streaks, and productivity summaries.
- **Installable PWA** — install on supported devices; the service worker caches app files for offline access.
- **Responsive interface** — designed for mobile and desktop screens.

## Run locally

No build step or package installation is required. Serve the project from a local web server (service workers require `localhost` or HTTPS):

```bash
python -m http.server 8000
```

Then open [http://localhost:8000](http://localhost:8000).

You can also use any static file server or host the files on an HTTPS static hosting service.

## Project files

- `index.html` — app interface, styles, and application logic.
- `manifest.webmanifest` — PWA name, display settings, and icons.
- `sw.js` — service worker for caching app assets.
- `icons/` — app and install icons.

## Data and accounts

App data is stored in the browser's local storage on the device. It is not automatically synchronized between browsers or devices. Clearing browser site data may remove locally stored information.
