# Hindsight Screenshot Capture Script

A macOS shell script that continuously captures screenshots at user-defined intervals and passes each screenshot to the image-summarizer for AI-powered analysis. This is the capture component of the Hindsight activity tracking system.

## Overview

This script automates the process of:
1. Capturing screenshots at regular intervals
2. Passing each screenshot to the `image-summarizer` package for AI analysis
3. Cleaning up screenshots after successful processing
4. Running continuously until interrupted

## Requirements

- **macOS**: Uses the native `screencapture` command
- **Node.js**: Required to run the summarization script
- **Bash**: Standard on macOS

## Quick Start

1. **Run with defaults** (1-minute interval, `./screenshots/` directory):
   ```bash
   ./capture.sh
   ```

2. **Custom configuration:**
   ```bash
   # Custom directory
   ./capture.sh /path/to/screenshots/

   # Custom directory and interval (in minutes)
   ./capture.sh /path/to/screenshots/ 2

   # Short interval for testing (0.1 = 6 seconds)
   ./capture.sh ./screenshots/ 0.1
   ```

3. **Stop the script:**
   Press `Ctrl+C`

## Usage

```
./capture.sh [directory] [frequency]

Arguments:
  directory   Path where screenshots will be saved (default: ./screenshots/)
  frequency   Interval between captures in minutes (default: 1)

Flags:
  --help      Display this help message
```

## How It Works

### Screenshot Capture
- Uses `screencapture -x -m -D 1 -t png`
  - `-x`: Silent mode (no camera sound)
  - `-m`: Main display only
  - `-D 1`: Display 1
  - `-t png`: PNG format
- Files are named with Unix timestamps (e.g., `1699900000.png`)

### Processing Flow
1. Capture screenshot → `[timestamp].png`
2. Run `node packages/image-summarizer/dist/index.js [screenshot_path] [vision_model]`
3. If successful → delete screenshot
4. If failed → preserve screenshot for debugging and exit
5. Wait for specified interval
6. Repeat

### Error Handling
- Validates that `screencapture` and `node` commands exist before starting
- If `screencapture` fails: prints error, exits with code 1
- If `image-summarizer` fails: prints error, preserves screenshot, exits with code 1
- All errors include informative messages about what went wrong

## Development

### Project Structure
```
.
├── capture.sh          # Main capture script
├── README.md           # This file
└── screenshots/        # Default output directory (created automatically)
```

The script depends on `packages/image-summarizer` being built. Run `npm run build` from that package directory first.

## Environment Variables

The script reads from the project root `.env` file:
- `VISION_MODEL`: The vision model to use (default: `qwen/qwen3-vl-4b`)

## License

Part of the Hindsight activity tracking system.
