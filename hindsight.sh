#!/bin/bash

# hindsight.sh - Hindsight Service Manager
# Start, stop, and monitor the Hindsight activity tracking services

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get script directory (project root)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# PID file locations
API_PID_FILE="$SCRIPT_DIR/data/api.pid"
CAPTURE_PID_FILE="$SCRIPT_DIR/data/capture.pid"
WEB_PID_FILE="$SCRIPT_DIR/data/web.pid"
PLUGIN_PID_FILE="$SCRIPT_DIR/data/plugin.pid"

# Log file locations
API_LOG="$SCRIPT_DIR/logs/api.log"
CAPTURE_LOG="$SCRIPT_DIR/logs/capture.log"
WEB_LOG="$SCRIPT_DIR/logs/web.log"
PLUGIN_LOG="$SCRIPT_DIR/logs/plugin.log"

# Load environment variables
if [[ -f "$SCRIPT_DIR/.env" ]]; then
    set -a
    source "$SCRIPT_DIR/.env"
    set +a
fi

# Default values
PORT="${PORT:-3000}"
CAPTURE_INTERVAL="${CAPTURE_INTERVAL:-5}"
WEB_PORT="${WEB_PORT:-5173}"

# ─────────────────────────────────────────────────────────────────
# Helper Functions
# ─────────────────────────────────────────────────────────────────

is_api_running() {
    if [[ -f "$API_PID_FILE" ]]; then
        local pid
        pid=$(cat "$API_PID_FILE")
        if ps -p "$pid" > /dev/null 2>&1; then
            return 0
        fi
    fi
    return 1
}

is_capture_running() {
    if [[ -f "$CAPTURE_PID_FILE" ]]; then
        local pid
        pid=$(cat "$CAPTURE_PID_FILE")
        if ps -p "$pid" > /dev/null 2>&1; then
            return 0
        fi
    fi
    return 1
}

is_web_running() {
    if [[ -f "$WEB_PID_FILE" ]]; then
        local pid
        pid=$(cat "$WEB_PID_FILE")
        if ps -p "$pid" > /dev/null 2>&1; then
            return 0
        fi
    fi
    return 1
}

is_plugin_running() {
    if [[ -f "$PLUGIN_PID_FILE" ]]; then
        local pid
        pid=$(cat "$PLUGIN_PID_FILE")
        if ps -p "$pid" > /dev/null 2>&1; then
            return 0
        fi
    fi
    return 1
}

check_lm_studio() {
    # Check if LM Studio is accepting connections on port 1234
    if ! curl -s --connect-timeout 2 "http://127.0.0.1:1234" > /dev/null 2>&1; then
        return 1
    fi
    return 0
}

# ─────────────────────────────────────────────────────────────────
# Commands
# ─────────────────────────────────────────────────────────────────

cmd_start() {
    echo -e "${BLUE}Starting Hindsight services...${NC}"
    echo ""

    # Ensure directories exist
    mkdir -p "$SCRIPT_DIR/data/screenshots"
    mkdir -p "$SCRIPT_DIR/logs"

    # Check if already running
    if is_api_running; then
        echo -e "${YELLOW}API server is already running (PID: $(cat "$API_PID_FILE"))${NC}"
    else
        echo -n "  Starting API server on port $PORT... "

        # Start API server in background
        nohup node "$SCRIPT_DIR/packages/api/dist/index.js" >> "$API_LOG" 2>&1 &
        local api_pid=$!
        echo "$api_pid" > "$API_PID_FILE"

        # Wait a moment and check if it started
        sleep 1
        if ps -p "$api_pid" > /dev/null 2>&1; then
            echo -e "${GREEN}OK${NC} (PID: $api_pid)"
        else
            echo -e "${RED}FAILED${NC}"
            echo "  Check logs: $API_LOG"
            rm -f "$API_PID_FILE"
            return 1
        fi
    fi

    if is_capture_running; then
        echo -e "${YELLOW}Capture daemon is already running (PID: $(cat "$CAPTURE_PID_FILE"))${NC}"
    else
        # Check LM Studio before starting capture daemon
        echo -n "  Checking LM Studio connection... "
        if ! check_lm_studio; then
            echo -e "${RED}NOT AVAILABLE${NC}"
            echo ""
            echo -e "${YELLOW}Warning: LM Studio does not appear to be running.${NC}"
            echo "  The capture daemon requires LM Studio to be running with a vision model loaded."
            echo "  Please start LM Studio and load a vision model, then run:"
            echo "    ./hindsight.sh start"
            echo ""
            echo "  API server is running. You can still query existing worklogs."
            return 0
        fi
        echo -e "${GREEN}OK${NC}"

        echo -n "  Starting capture daemon (interval: ${CAPTURE_INTERVAL}m)... "

        # Start capture daemon in background
        nohup bash "$SCRIPT_DIR/packages/capture-daemon/capture.sh" \
            "$SCRIPT_DIR/data/screenshots/" \
            "$CAPTURE_INTERVAL" >> "$CAPTURE_LOG" 2>&1 &
        local capture_pid=$!
        echo "$capture_pid" > "$CAPTURE_PID_FILE"

        # Wait a moment and check if it started
        sleep 1
        if ps -p "$capture_pid" > /dev/null 2>&1; then
            echo -e "${GREEN}OK${NC} (PID: $capture_pid)"
        else
            echo -e "${RED}FAILED${NC}"
            echo "  Check logs: $CAPTURE_LOG"
            rm -f "$CAPTURE_PID_FILE"
            return 1
        fi
    fi

    # Start web dashboard
    if is_web_running; then
        echo -e "${YELLOW}Web dashboard is already running (PID: $(cat "$WEB_PID_FILE"))${NC}"
    else
        echo -n "  Starting web dashboard on port $WEB_PORT... "

        # Start web server in background (using vite preview for production build)
        nohup npm run preview --prefix "$SCRIPT_DIR/packages/web" >> "$WEB_LOG" 2>&1 &
        local web_pid=$!
        echo "$web_pid" > "$WEB_PID_FILE"

        # Wait a moment and check if it started
        sleep 2
        if ps -p "$web_pid" > /dev/null 2>&1; then
            echo -e "${GREEN}OK${NC} (PID: $web_pid)"
        else
            echo -e "${RED}FAILED${NC}"
            echo "  Check logs: $WEB_LOG"
            rm -f "$WEB_PID_FILE"
        fi
    fi

    # Start LM Studio plugin dev server
    if is_plugin_running; then
        echo -e "${YELLOW}Plugin dev server is already running (PID: $(cat "$PLUGIN_PID_FILE"))${NC}"
    else
        echo -n "  Starting LM Studio plugin dev server... "

        # Start plugin dev server in background
        nohup npm run dev --prefix "$SCRIPT_DIR/packages/plugin" >> "$PLUGIN_LOG" 2>&1 &
        local plugin_pid=$!
        echo "$plugin_pid" > "$PLUGIN_PID_FILE"

        # Wait a moment and check if it started
        sleep 2
        if ps -p "$plugin_pid" > /dev/null 2>&1; then
            echo -e "${GREEN}OK${NC} (PID: $plugin_pid)"
        else
            echo -e "${RED}FAILED${NC}"
            echo "  Check logs: $PLUGIN_LOG"
            rm -f "$PLUGIN_PID_FILE"
        fi
    fi

    echo ""
    echo -e "${GREEN}Hindsight is running!${NC}"
    echo ""
    echo "  API: http://localhost:$PORT"
    echo "  Web: http://localhost:$WEB_PORT"
    echo "  Logs: ./hindsight.sh logs"
    echo "  Stop: ./hindsight.sh stop"
}

cmd_stop() {
    echo -e "${BLUE}Stopping Hindsight services...${NC}"
    echo ""

    local stopped=0

    if is_plugin_running; then
        local pid
        pid=$(cat "$PLUGIN_PID_FILE")
        echo -n "  Stopping plugin dev server (PID: $pid)... "
        kill "$pid" 2>/dev/null || true
        rm -f "$PLUGIN_PID_FILE"
        echo -e "${GREEN}OK${NC}"
        stopped=1
    fi

    if is_web_running; then
        local pid
        pid=$(cat "$WEB_PID_FILE")
        echo -n "  Stopping web dashboard (PID: $pid)... "
        kill "$pid" 2>/dev/null || true
        rm -f "$WEB_PID_FILE"
        echo -e "${GREEN}OK${NC}"
        stopped=1
    fi

    if is_capture_running; then
        local pid
        pid=$(cat "$CAPTURE_PID_FILE")
        echo -n "  Stopping capture daemon (PID: $pid)... "
        kill "$pid" 2>/dev/null || true
        rm -f "$CAPTURE_PID_FILE"
        echo -e "${GREEN}OK${NC}"
        stopped=1
    fi

    if is_api_running; then
        local pid
        pid=$(cat "$API_PID_FILE")
        echo -n "  Stopping API server (PID: $pid)... "
        kill "$pid" 2>/dev/null || true
        rm -f "$API_PID_FILE"
        echo -e "${GREEN}OK${NC}"
        stopped=1
    fi

    if [[ $stopped -eq 0 ]]; then
        echo "  No services were running."
    else
        echo ""
        echo -e "${GREEN}Hindsight stopped.${NC}"
    fi
}

cmd_status() {
    echo -e "${BLUE}Hindsight Status${NC}"
    echo ""

    echo -n "  API Server:     "
    if is_api_running; then
        local pid
        pid=$(cat "$API_PID_FILE")
        echo -e "${GREEN}Running${NC} (PID: $pid, port: $PORT)"
    else
        echo -e "${RED}Stopped${NC}"
    fi

    echo -n "  Capture Daemon: "
    if is_capture_running; then
        local pid
        pid=$(cat "$CAPTURE_PID_FILE")
        echo -e "${GREEN}Running${NC} (PID: $pid, interval: ${CAPTURE_INTERVAL}m)"
    else
        echo -e "${RED}Stopped${NC}"
    fi

    echo -n "  Web Dashboard:  "
    if is_web_running; then
        local pid
        pid=$(cat "$WEB_PID_FILE")
        echo -e "${GREEN}Running${NC} (PID: $pid, port: $WEB_PORT)"
    else
        echo -e "${RED}Stopped${NC}"
    fi

    echo -n "  Plugin Dev:     "
    if is_plugin_running; then
        local pid
        pid=$(cat "$PLUGIN_PID_FILE")
        echo -e "${GREEN}Running${NC} (PID: $pid)"
    else
        echo -e "${RED}Stopped${NC}"
    fi

    echo -n "  LM Studio:      "
    if check_lm_studio; then
        echo -e "${GREEN}Available${NC} (ws://127.0.0.1:1234)"
    else
        echo -e "${YELLOW}Not detected${NC}"
    fi

    echo ""

    # Show recent activity if API is running
    if is_api_running; then
        echo "  Recent worklogs:"
        local count
        count=$(curl -s "http://localhost:$PORT/worklogs/counts" 2>/dev/null | grep -o '"total":[0-9]*' | cut -d: -f2 || echo "0")
        if [[ "$count" == "0" ]] || [[ -z "$count" ]]; then
            echo "    No worklogs recorded yet."
        else
            echo "    Total entries: $count"
        fi
    fi
}

cmd_logs() {
    echo -e "${BLUE}Hindsight Logs${NC}"
    echo "Press Ctrl+C to stop"
    echo ""

    # Tail all log files
    tail -f "$API_LOG" "$CAPTURE_LOG" "$WEB_LOG" "$PLUGIN_LOG" 2>/dev/null || {
        echo "No log files found. Start Hindsight first:"
        echo "  ./hindsight.sh start"
    }
}

cmd_help() {
    echo "Hindsight Service Manager"
    echo ""
    echo "Usage: $0 <command>"
    echo ""
    echo "Commands:"
    echo "  start   Start all services (API, capture, web, plugin)"
    echo "  stop    Stop all services"
    echo "  status  Show service status"
    echo "  logs    Tail log files (Ctrl+C to stop)"
    echo "  help    Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 start    # Start all services"
    echo "  $0 status   # Check what's running"
    echo "  $0 logs     # Watch log output"
    echo "  $0 stop     # Stop all services"
}

# ─────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────

case "${1:-help}" in
    start)
        cmd_start
        ;;
    stop)
        cmd_stop
        ;;
    status)
        cmd_status
        ;;
    logs)
        cmd_logs
        ;;
    help|--help|-h)
        cmd_help
        ;;
    *)
        echo -e "${RED}Unknown command: $1${NC}"
        echo ""
        cmd_help
        exit 1
        ;;
esac
