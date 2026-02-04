# Hindsight Web Dashboard

A React-based web dashboard for viewing activity logs from the Hindsight application. Displays recent worklogs in real-time and provides a chat interface for querying activity history.

## Features

- Live activity stream showing recent worklogs (last 20 minutes)
- Auto-polling every 30 seconds for updates
- Chat panel for interacting with activity data
- Auto-scroll to latest entries with manual scroll override

## Requirements

- Node.js 22.x or higher
- Hindsight API server running (default: `http://localhost:3000`)

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

The development server runs on port 5173 by default.

## Environment Variables

Configure via environment variables (can use `.env` file):

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `http://localhost:3000` | Hindsight API server URL |

## Project Structure

```
.
├── src/
│   ├── main.jsx           # Application entry point
│   ├── App.jsx            # Root component
│   ├── App.css            # Global styles
│   ├── index.css          # Base styles
│   └── components/
│       ├── Header.jsx     # Application header
│       ├── Header.css
│       ├── WorklogPanel.jsx   # Activity stream display
│       ├── WorklogPanel.css
│       ├── ChatPanel.jsx      # Chat interface
│       └── ChatPanel.css
├── index.html             # HTML template
├── vite.config.js         # Vite configuration
├── package.json
└── README.md
```

## Technology Stack

- **React 18** - UI framework
- **Vite** - Build tool and dev server
- **lmstudio-js** - LM Studio SDK integration (local dependency)

## API Integration

The dashboard fetches worklogs from the API with:
- `GET /worklogs?start=<timestamp>&end=<timestamp>` - Retrieve logs within time range

Timestamps are Unix epoch seconds.

## License

Part of the Hindsight activity tracking system.
