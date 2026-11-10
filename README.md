# Time4Work

Time4Work is a study and productivity app for planning focused work, building habits, and tracking goals. It brings a learning roadmap, focus timers, a planner, and personal productivity tools together in a responsive Progressive Web App (PWA).

## Features

- **Roadmap** — organize study topics and projects into phases and track completion.
- **Focus** — run study sprints, guided breathing timers, and Pomodoro-style focus and break sessions.
- **Tasks and planner** — manage priorities, due dates, recurring tasks, subtasks, and calendar events.
- **Habits** — track scheduled check-ins and streaks alongside breathing exercises.
- **Goals** — break goals into milestones and view daily study time in the target calendar.
- **Notes and reminders** — keep notes and review upcoming or overdue tasks, events, and goals.
- **Progress** — review study time, streaks, and productivity summaries.
- **Installable PWA** — install on supported devices. After the app shell is cached, core app files can load offline; external resources such as web fonts may still need a network connection.
- **Responsive interface** — use the app on mobile and desktop screens.

## Run locally

The app is static HTML, CSS, and JavaScript. No build step or package installation is needed. Run it from a local web server because service workers require `localhost` or HTTPS:

```bash
python -m http.server 8000
```

If `python` is not available, try `python3 -m http.server 8000`. Then open [http://localhost:8000](http://localhost:8000).

## Deploy with GitHub Pages

1. Push the project files to a GitHub repository.
2. In the repository, open **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Select the `main` branch and `/ (root)` folder, then save.
5. Open the published URL shown in the Pages settings. PWA installation and service workers require HTTPS; GitHub Pages provides HTTPS.

The project can also be hosted using another static hosting service that supports HTTPS.

## Project files

- `index.html` — app interface, styles, and application logic.
- `manifest.webmanifest` — PWA metadata and install icons.
- `sw.js` — service worker that caches the app shell and assets.
- `icons/` — app and install icons.

## Data and accounts

App data and locally created account information are stored in the browser on the current device. There is no server-side account service or automatic synchronization between browsers or devices. Clearing the browser's site data may remove this information.
