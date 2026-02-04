# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Hindsight is an AI-powered activity tracking system for macOS. It captures screenshots at regular intervals and uses a local LM Studio vision model to summarize user activity. All data stays local - no external API calls.

## Commands

```bash
# Service management
./hindsight.sh start      # Start all services
./hindsight.sh start -v   # Start with verbose API logging
./hindsight.sh stop       # Stop all services
./hindsight.sh status     # Show service status
./hindsight.sh logs       # Tail log files

# Installation/setup
./install.sh              # Full setup (deps, SDK, config, build)

# Install and build a specific package
cd packages/api && npm install && npm run build

# Package-specific development
cd packages/api && npm run dev      # API with hot reload (tsx watch)
cd packages/web && npm run dev      # Vite dev server
cd packages/plugin && npm run dev   # Plugin dev mode (lms dev)

# Test production web build
cd packages/web && npm run preview  # Serves dist on port 5173

# Test image summarizer directly
node packages/image-summarizer/dist/index.js /path/to/image.png qwen/qwen3-vl-4b

# Run capture daemon manually (for testing)
bash packages/capture-daemon/capture.sh ./data/screenshots/ 0.1  # 6-second interval
```

## Architecture

Monorepo with 5 packages (each manages its own dependencies):

```
packages/api              Express REST API + SQLite (port 3000)
packages/image-summarizer CLI that sends images to LM Studio vision model
packages/capture-daemon   Bash script for periodic screenshots
packages/plugin           LM Studio plugin for querying logs
packages/web              React dashboard (Vite, port 5173)
lmstudio-js/              Local SDK dependency (cloned at install)
```

**Data flow:**
1. `capture-daemon` captures screenshot → calls `image-summarizer`
2. `image-summarizer` sends to LM Studio vision model → posts summary to API
3. `api` stores worklog in SQLite → serves via REST
4. `web` polls API every 30 seconds → displays activity stream
5. `plugin` provides LM Studio tools to query worklogs

## Key Files

| File | Purpose |
|------|---------|
| `packages/api/src/contract.ts` | ts-rest API contract with Zod schemas |
| `packages/api/src/routes.ts` | Express route handlers |
| `packages/api/src/database.ts` | SQLite wrapper (better-sqlite3) |
| `packages/image-summarizer/src/index.ts` | Vision model integration |
| `packages/plugin/src/toolsProvider.ts` | LM Studio tool definitions |
| `hindsight.sh` | Service lifecycle management |

## Technical Notes

- **Node.js**: Requires Node.js 22.x
- **Local SDK dependency**: image-summarizer and web use `file:../../lmstudio-js/...` - the npm package has a bug
- **Module systems vary**: API/image-summarizer/web use ES modules (`"type": "module"`), plugin uses CommonJS
- **Database**: SQLite `worklogs.db` created at runtime in packages/api/
- **LM Studio connection**: WebSocket at `ws://127.0.0.1:1234`
- **Timestamp extraction**: image-summarizer gets timestamp from filename (Unix epoch), not EXIF
- **PID files**: Services track processes via `data/*.pid` files
- **No test suite**: Tests are not implemented (placeholder scripts only)

## API Contract

Endpoints defined in `packages/api/src/contract.ts`:
- `POST /worklogs` - Create worklog entry (body: `{timestamp, log}`)
- `GET /worklogs?start=&end=` - Query by Unix timestamp range
- `GET /worklogs/counts?offset=14` - Get entry counts by date (offset: days to look back, 1-365)

All validation uses Zod schemas via ts-rest. Types are exported: `Worklog`, `CreateWorklogRequest`, `GetWorklogsQuery`.

## Plugin Tools

Two tools exposed to LM Studio (in `packages/plugin/src/toolsProvider.ts`):
- `available_hindsight_logs` - Get worklog counts
- `get_hindsight_logs` - Retrieve logs for date range

Tools use fluent `tool()` API with Zod parameter schemas.

## Environment Variables (.env)

```
LM_API_TOKEN=<token>        # LM Studio API token
PORT=3000                   # API server port
CAPTURE_INTERVAL=5          # Screenshot interval (minutes)
VISION_MODEL=qwen/qwen3-vl-4b
WEB_PORT=5173
VERBOSE=1                   # Optional: enable API request logging
```
