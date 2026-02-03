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

# Build all packages
npm install && npm run build

# Package-specific development
npm run dev --workspace=packages/api      # API with hot reload
npm run dev --workspace=packages/web      # Vite dev server
npm run dev --workspace=packages/plugin   # Plugin dev mode (lms dev)

# Test image summarizer directly
node packages/image-summarizer/dist/index.js /path/to/image.png qwen/qwen3-vl-4b
```

## Architecture

Monorepo with npm workspaces containing 5 packages:

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

- **Local SDK dependency**: image-summarizer and web use `file:../../lmstudio-js/...` - the npm package has a bug
- **Module systems vary**: API uses ES2022 modules, plugin uses CommonJS
- **Database**: SQLite `worklogs.db` created at runtime in packages/api/
- **LM Studio connection**: WebSocket at `ws://127.0.0.1:1234`
- **Timestamp extraction**: image-summarizer gets timestamp from filename (Unix epoch), not EXIF
- **PID files**: Services track processes via `data/*.pid` files

## API Contract

Endpoints defined in `packages/api/src/contract.ts`:
- `POST /worklogs` - Create worklog entry
- `GET /worklogs?start=&end=` - Query by Unix timestamp range
- `GET /worklogs/counts` - Get entry counts by date

All validation uses Zod schemas via ts-rest.

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
