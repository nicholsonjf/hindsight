<p align="center">
<img height="350" alt="logo" src="https://github.com/user-attachments/assets/0af0b95f-8ff4-4ef8-b216-2f7eaa2d4fce" />
</p>

AI-powered activity tracking for macOS. Hindsight automatically captures screenshots at regular intervals and uses a local vision model running on LM Studio to summarize what you're working on.

## Features

- **Automatic screenshot capture** - Periodic screenshots using macOS native `screencapture`
- **AI-powered summarization** - Uses local vision models via LM Studio to describe your activity
- **Web dashboard** - Real-time activity stream and AI chat interface
- **Worklog API** - REST API to query your activity history
- **Privacy-first** - Everything runs locally, no data leaves your machine
- **LM Studio plugin** - Ask questions about your activity directly in LM Studio

## Usage

<p>Get a summary of what you worked on today using LM Studio</p>
<img width="1624" height="1056" alt="hindsight-lmstudio" src="https://github.com/user-attachments/assets/d8a59ced-fc37-467f-9149-9a69ddc3058e" />

## Prerequisites

> [!IMPORTANT]
> **Node.js 22.21.1** is required. Installation will fail without it.
> Use `nvm install 22.21.1` or download from [nodejs.org](https://nodejs.org/)

- **macOS** (required for `screencapture`)
- **LM Studio** with a vision-capable model (e.g., `qwen/qwen3-vl-8b`)

## Quick Start

### 1. Clone the repository

```bash
git clone https://github.com/your-username/hindsight.git
cd hindsight
```

### 2. Run the installer

```bash
./install.sh
```

The installer will:
- Check prerequisites (macOS, Node.js, Xcode CLT)
- Clone and build the lmstudio-js SDK
- Prompt for LM Studio API token
- Configure capture interval and other settings
- Install dependencies and build each package

If `.env` already exists, the installer skips configuration prompts and proceeds directly to installation. This allows re-running the installer after pulling updates.

### 3. Start LM Studio

Open LM Studio and load a vision-capable model trained for tool use. `qwen/qwen3-vl-8b` performed well during testing.

### 4. Start Hindsight

```bash
./hindsight.sh start
```

### 5. Open the Web Dashboard

Navigate to `http://localhost:5173` (or your configured WEB_PORT) to view the activity stream and chat with the AI about your recent activity.

## Usage

### Service Management

```bash
./hindsight.sh start      # Start all services (API, capture, web, plugin)
./hindsight.sh start -v   # Start with verbose API request logging
./hindsight.sh stop       # Stop all services
./hindsight.sh status     # Show service status
./hindsight.sh logs       # Tail log files
```

### Web Dashboard

The web dashboard provides:
- **Activity Stream** - Real-time feed of your recent activity summaries
- **AI Chat** - Ask questions about your activity using the loaded LM Studio model

Access it at `http://localhost:5173` (default).

### API Endpoints

The worklog API runs on `http://localhost:3000` by default.

```bash
# Get worklog counts
curl http://localhost:3000/worklogs/counts

# Get worklogs for a time range
curl "http://localhost:3000/worklogs?start=1706745600&end=1706832000"

# Get worklogs for the last hour
curl "http://localhost:3000/worklogs?start=$(($(date +%s) - 3600))&end=$(date +%s)"
```

## Configuration

Configuration is stored in `.env` at the project root:

```bash
# LM Studio API token (from LM Studio > Settings > Developer)
LM_API_TOKEN=your-token-here

# API server port
PORT=3000

# Screenshot capture interval in minutes
CAPTURE_INTERVAL=5

# Vision model for summarization
VISION_MODEL=qwen/qwen3-vl-8b

# Web dashboard port
WEB_PORT=5173
```

Use `./hindsight.sh start -v` to enable verbose API request logging.

## Project Structure

```
hindsight/
├── install.sh              # Installation script
├── hindsight.sh            # Service manager (start/stop/status)
├── .env                    # Configuration (created by install.sh)
├── .env.example            # Configuration template
├── lmstudio-js/            # SDK (cloned by install.sh)
├── packages/
│   ├── api/                # Express/SQLite worklog server
│   ├── capture-daemon/     # Screenshot capture (bash)
│   ├── image-summarizer/   # LM Studio vision summarization
│   ├── plugin/             # LM Studio plugin
│   └── web/                # React web dashboard
├── data/                   # Runtime data
│   └── screenshots/        # Temporary screenshot storage
└── logs/                   # Service log files
```

## Packages

### packages/api
Express.js REST API with SQLite database for storing and querying activity logs.

### packages/capture-daemon
Bash script that captures screenshots at regular intervals and sends them to the image-summarizer.

### packages/image-summarizer
Node.js CLI that sends screenshots to LM Studio's vision model and posts summaries to the API.

### packages/plugin
LM Studio plugin that provides tools to query activity logs from within LM Studio chat:
- `available_hindsight_logs` - Get counts of available worklog entries
- `get_hindsight_logs` - Retrieve worklog entries for a date range

### packages/web
React web dashboard with:
- Real-time activity stream (polls API every 30 seconds)
- AI chat interface connected to LM Studio
- Built with Vite for fast development

## Troubleshooting

### "LM Studio not available" when starting

Make sure LM Studio is running and has loaded a vision model. The capture daemon connects to `ws://127.0.0.1:1234`.

### Screenshots not being processed

1. Check the capture log: `./hindsight.sh logs`
2. Verify the vision model is loaded in LM Studio
3. Test the image-summarizer directly:
   ```bash
   node packages/image-summarizer/dist/index.js /path/to/test.png qwen/qwen3-vl-8b
   ```

### API server not responding

1. Check if it's running: `./hindsight.sh status`
2. Check the API log: `tail -f logs/api.log`
3. Verify port 3000 isn't in use: `lsof -i :3000`

### Web dashboard not loading

1. Check if it's running: `./hindsight.sh status`
2. Check the web log: `tail -f logs/web.log`
3. Verify the web port isn't in use: `lsof -i :5173`
4. Make sure the web package was built: `cd packages/web && npm run build`

### npm install fails with better-sqlite3 errors

better-sqlite3 requires native compilation. Ensure you have:
- Xcode Command Line Tools: `xcode-select --install`
- Python 3: `python3 --version`

### Permission denied for screenshots

macOS requires screen recording permission. Go to:
System Preferences > Privacy & Security > Screen Recording > Enable for Terminal (or your terminal app)

## Development

Each package manages its own dependencies independently (no npm workspaces).

```bash
# Install and build a specific package
cd packages/api && npm install && npm run build

# Run API in development mode
cd packages/api && npm run dev

# Run web dashboard in development mode
cd packages/web && npm run dev

# Run plugin in development mode
cd packages/plugin && npm run dev

# Run capture daemon manually
bash packages/capture-daemon/capture.sh ./data/screenshots/ 1
```

## License

MIT
