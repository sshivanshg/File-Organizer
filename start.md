# Getting Started with Nexus

## Prerequisites

- **Node.js** v18 or later
- **npm** (comes with Node.js)
- **macOS** (arm64 or Intel)

## Install & Run (Development)

```bash
# Clone the repo
git clone https://github.com/sshivanshg/File-Organizer.git
cd File-Organizer

# Install dependencies
npm install

# Start the app in dev mode (hot-reload)
npm run electron:dev
```

The app will compile the Electron main process, start the Vite dev server on `http://localhost:5173`, and launch the Electron window automatically.

## Build (Production DMG)

```bash
npm run electron:build
```

Output goes to `release/`:
- `Nexus-0.1.0-arm64.dmg` — macOS installer
- `Nexus-0.1.0-arm64-mac.zip` — portable zip

## First Launch

1. On first open, Nexus shows a permission screen asking for **Full Disk Access**.
2. Click **Open System Settings** — it takes you to Privacy & Security > Full Disk Access.
3. Toggle the switch for Nexus, then go back to the app and click **I've Enabled Access**.

> If downloading the DMG on another Mac, right-click the app and choose **Open** the first time (macOS Gatekeeper).

## Available Scripts

| Command | What it does |
|---------|-------------|
| `npm run electron:dev` | Dev mode with hot-reload |
| `npm run electron:build` | Production build (DMG + ZIP) |
| `npm run dev` | Vite dev server only (no Electron) |
| `npm run build` | Vite production build only |

## Project Structure (Quick Overview)

```
electron/          → Main process (Node.js) — IPC handlers, file ops, worker
  main.ts          → Window creation, IPC, protocol, trash
  preload.ts       → Safe API bridge for renderer
  fileScanner.worker.ts → Background thread for disk scanning

src/               → Renderer (React) — UI only, no fs access
  App.tsx          → Root component, routing, tour
  components/      → Sidebar, Explorer, Dashboard, Bin, etc.
  stores/          → Zustand state (path, favorites, settings)
```

## Tech Stack

Electron 33 · React 18 · TypeScript · Zustand · Tailwind CSS · Vite · Framer Motion · Nivo Charts
