#!/bin/bash

# capture.sh - Continuous screenshot capture for Hindsight activity tracking
# Captures screenshots at regular intervals and passes them to summarize.ts

set -euo pipefail  # Exit on error, undefined variables, and pipe failures

# Default values
DEFAULT_DIR="./screenshots/"
DEFAULT_FREQUENCY=1  # minutes

# Display help message
show_help() {
    cat << EOF
Hindsight Screenshot Capture Script

Usage: $0 [directory] [frequency]

Arguments:
  directory   Path where screenshots will be saved
              Default: ./screenshots/

  frequency   Interval between captures in minutes
              Supports fractional values (e.g., 0.5 for 30 seconds)
              Default: 1

Flags:
  --help      Display this help message

Examples:
  $0                           # Use defaults (./screenshots/, 1 minute)
  $0 /tmp/screens/             # Custom directory, default interval
  $0 ./screens/ 2              # Custom directory and 2-minute interval
  $0 ./screens/ 0.1            # Short interval for testing (6 seconds)

The script will:
  1. Capture a screenshot using macOS screencapture
  2. Pass the screenshot path to the image-summarizer
  3. Delete the screenshot after successful processing
  4. Wait for the specified interval
  5. Repeat until interrupted (Ctrl+C)

Error Handling:
  - Screenshots are preserved if summarization fails
  - Script exits with non-zero code on any error
  - Requires macOS (screencapture command) and Node.js

EOF
    exit 0
}

# Check for --help flag
if [[ "${1:-}" == "--help" ]]; then
    show_help
fi

# Parse arguments
SCREENSHOT_DIR="${1:-$DEFAULT_DIR}"
FREQUENCY="${2:-$DEFAULT_FREQUENCY}"

# Normalize directory path (ensure trailing slash)
if [[ "$SCREENSHOT_DIR" != */ ]]; then
    SCREENSHOT_DIR="${SCREENSHOT_DIR}/"
fi

# Validate frequency is a number
if ! [[ "$FREQUENCY" =~ ^[0-9]+\.?[0-9]*$ ]]; then
    echo "Error: Frequency must be a positive number" >&2
    echo "       Got: '$FREQUENCY'" >&2
    echo "" >&2
    echo "Run '$0 --help' for usage information" >&2
    exit 1
fi

# Check for negative or zero frequency
if (( $(echo "$FREQUENCY <= 0" | bc -l) )); then
    echo "Error: Frequency must be greater than 0" >&2
    echo "       Got: '$FREQUENCY' minutes" >&2
    echo "" >&2
    echo "Run '$0 --help' for usage information" >&2
    exit 1
fi

# Check for required commands
echo "Checking dependencies..."

if ! command -v screencapture &> /dev/null; then
    echo "Error: 'screencapture' command not found" >&2
    echo "" >&2
    echo "This script requires macOS and the screencapture utility." >&2
    echo "The screencapture command is built into macOS." >&2
    echo "" >&2
    echo "If you're on macOS and seeing this error, your system" >&2
    echo "may have a configuration issue." >&2
    exit 1
fi

if ! command -v node &> /dev/null; then
    echo "Error: 'node' command not found" >&2
    echo "" >&2
    echo "This script requires Node.js to run the summarization program." >&2
    echo "Please install Node.js from: https://nodejs.org/" >&2
    echo "" >&2
    echo "After installation, verify with: node --version" >&2
    exit 1
fi

# Determine the script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
IMAGE_SUMMARIZER="$PROJECT_ROOT/packages/image-summarizer/dist/index.js"

# Load environment variables from project root .env if it exists
if [[ -f "$PROJECT_ROOT/.env" ]]; then
    set -a
    source "$PROJECT_ROOT/.env"
    set +a
fi

# Get vision model from environment or use default
VISION_MODEL="${VISION_MODEL:-qwen/qwen3-vl-4b}"

# Check if image-summarizer exists
if [[ ! -f "$IMAGE_SUMMARIZER" ]]; then
    echo "Warning: image-summarizer not found at: $IMAGE_SUMMARIZER" >&2
    echo "         Run 'npm run build' from the project root first." >&2
    echo "" >&2
fi

echo "✓ All dependencies found"
echo ""

# Create screenshot directory if it doesn't exist
mkdir -p "$SCREENSHOT_DIR"
echo "✓ Screenshot directory: $SCREENSHOT_DIR"

# Convert frequency to seconds for sleep command
SLEEP_SECONDS=$(echo "$FREQUENCY * 60" | bc)

echo "✓ Capture interval: $FREQUENCY minutes ($SLEEP_SECONDS seconds)"
echo ""
echo "Starting continuous screenshot capture..."
echo "Press Ctrl+C to stop"
echo ""
echo "----------------------------------------"
echo ""

# Function to capture and process a screenshot
capture_and_process() {
    # Generate timestamp for filename
    TIMESTAMP=$(date +%s)
    SCREENSHOT_PATH="${SCREENSHOT_DIR}${TIMESTAMP}.png"

    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Capturing screenshot..."

    # Capture screenshot with specified flags
    # -x: silent (no camera sound)
    # -m: main display only
    # -D 1: display 1
    # -t png: PNG format
    if ! screencapture -x -m -D 1 -t png "$SCREENSHOT_PATH" 2>&1; then
        echo "Error: Failed to capture screenshot" >&2
        echo "       screencapture command failed" >&2
        echo "" >&2
        echo "This could be due to:" >&2
        echo "  - Insufficient permissions" >&2
        echo "  - Display configuration issues" >&2
        echo "  - System resource constraints" >&2
        exit 1
    fi

    echo "  → Saved: $SCREENSHOT_PATH"

    # Process screenshot with image-summarizer
    echo "  → Processing with image-summarizer (model: $VISION_MODEL)..."

    if node "$IMAGE_SUMMARIZER" "$SCREENSHOT_PATH" "$VISION_MODEL"; then
        echo "  ✓ Processing complete"

        # Delete screenshot after successful processing
        rm "$SCREENSHOT_PATH"
        echo "  ✓ Screenshot cleaned up"
    else
        EXIT_CODE=$?
        echo "" >&2
        echo "Error: Failed to process screenshot" >&2
        echo "       image-summarizer exited with code $EXIT_CODE" >&2
        echo "" >&2
        echo "Screenshot preserved at: $SCREENSHOT_PATH" >&2
        echo "" >&2
        echo "Possible causes:" >&2
        echo "  - image-summarizer threw an error" >&2
        echo "  - $IMAGE_SUMMARIZER not found" >&2
        echo "  - Node.js runtime error" >&2
        echo "" >&2
        echo "Check the output above for details." >&2
        exit 1
    fi

    echo ""
}

# Main loop
CAPTURE_COUNT=0
while true; do
    CAPTURE_COUNT=$((CAPTURE_COUNT + 1))

    echo "Capture #$CAPTURE_COUNT"
    capture_and_process

    echo "Waiting $FREQUENCY minutes until next capture..."
    echo "----------------------------------------"
    echo ""

    # Sleep for specified interval
    sleep "$SLEEP_SECONDS"
done
