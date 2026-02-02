#!/bin/bash

# install.sh - Hindsight Installation Script
# Sets up the Hindsight activity tracking system

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo -e "${BLUE}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║              Hindsight Installation Script                 ║"
echo "║      AI-powered activity tracking for macOS                ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# ─────────────────────────────────────────────────────────────────
# Prerequisites Check
# ─────────────────────────────────────────────────────────────────

echo -e "${BLUE}Checking prerequisites...${NC}"
echo ""

# Check macOS
echo -n "  macOS: "
if [[ "$(uname)" != "Darwin" ]]; then
    echo -e "${RED}FAILED${NC}"
    echo "  Error: Hindsight requires macOS (for screencapture)"
    exit 1
fi
echo -e "${GREEN}OK${NC} ($(sw_vers -productVersion))"

# Check Node.js 18+
echo -n "  Node.js 18+: "
if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}NOT FOUND${NC}"
    echo ""
    echo "  Node.js is required but not installed."
    read -p "  Install Node.js via Homebrew? [Y/n] " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Nn]$ ]]; then
        echo "  Please install Node.js 18+ manually and re-run this script."
        exit 1
    fi

    # Check for Homebrew
    if ! command -v brew &> /dev/null; then
        echo "  Installing Homebrew..."
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    fi

    echo "  Installing Node.js..."
    brew install node

    if ! command -v node &> /dev/null; then
        echo -e "${RED}  Failed to install Node.js${NC}"
        exit 1
    fi
fi

NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
if [[ "$NODE_VERSION" -lt 18 ]]; then
    echo -e "${RED}FAILED${NC} (v$(node -v))"
    echo "  Error: Node.js 18+ is required, but found $(node -v)"
    echo "  Please upgrade Node.js and re-run this script."
    exit 1
fi
echo -e "${GREEN}OK${NC} ($(node -v))"

# Check Python 3 (for better-sqlite3 native build)
echo -n "  Python 3: "
if ! command -v python3 &> /dev/null; then
    echo -e "${YELLOW}WARNING${NC}"
    echo "  Python 3 is recommended for building native modules."
    echo "  Installation will proceed, but may fail if building better-sqlite3."
else
    echo -e "${GREEN}OK${NC} ($(python3 --version | cut -d' ' -f2))"
fi

# Check Xcode Command Line Tools
echo -n "  Xcode CLT: "
if ! xcode-select -p &> /dev/null; then
    echo -e "${YELLOW}NOT FOUND${NC}"
    echo ""
    echo "  Xcode Command Line Tools are required for native module compilation."
    read -p "  Install Xcode Command Line Tools? [Y/n] " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Nn]$ ]]; then
        echo "  Please install Xcode CLT manually: xcode-select --install"
        exit 1
    fi

    xcode-select --install
    echo "  Please complete the installation dialog and re-run this script."
    exit 0
fi
echo -e "${GREEN}OK${NC}"

echo ""
echo -e "${GREEN}All prerequisites satisfied!${NC}"
echo ""

# ─────────────────────────────────────────────────────────────────
# Configuration
# ─────────────────────────────────────────────────────────────────

echo -e "${BLUE}Configuration${NC}"
echo ""

# Get lmstudio-js SDK path
echo "The image-summarizer requires the lmstudio-js SDK."
echo "Clone it from: https://github.com/lmstudio-ai/lmstudio.js"
echo ""
read -p "Enter path to lmstudio-js/packages/lmstudio-js: " LMSTUDIO_SDK_PATH

# Expand ~ to home directory
LMSTUDIO_SDK_PATH="${LMSTUDIO_SDK_PATH/#\~/$HOME}"

# Validate SDK path
if [[ ! -d "$LMSTUDIO_SDK_PATH" ]]; then
    echo -e "${RED}Error: Directory not found: $LMSTUDIO_SDK_PATH${NC}"
    exit 1
fi

if [[ ! -f "$LMSTUDIO_SDK_PATH/package.json" ]]; then
    echo -e "${RED}Error: Not a valid npm package (no package.json): $LMSTUDIO_SDK_PATH${NC}"
    exit 1
fi

echo -e "${GREEN}SDK path validated${NC}"
echo ""

# Get LM Studio API token
echo "Get your API token from LM Studio > Settings > Developer"
read -p "Enter LM Studio API token: " LM_API_TOKEN

if [[ -z "$LM_API_TOKEN" ]]; then
    echo -e "${YELLOW}Warning: No API token provided. You can add it to .env later.${NC}"
    LM_API_TOKEN="your-token-here"
fi
echo ""

# Get capture interval
read -p "Screenshot capture interval in minutes [5]: " CAPTURE_INTERVAL
CAPTURE_INTERVAL="${CAPTURE_INTERVAL:-5}"

# Validate it's a number
if ! [[ "$CAPTURE_INTERVAL" =~ ^[0-9]+\.?[0-9]*$ ]]; then
    echo -e "${RED}Error: Capture interval must be a number${NC}"
    exit 1
fi
echo ""

# Get API port
read -p "API server port [3000]: " PORT
PORT="${PORT:-3000}"
echo ""

# Get vision model
read -p "Vision model [qwen/qwen3-vl-4b]: " VISION_MODEL
VISION_MODEL="${VISION_MODEL:-qwen/qwen3-vl-4b}"
echo ""

# Get web app port
read -p "Web dashboard port [5173]: " WEB_PORT
WEB_PORT="${WEB_PORT:-5173}"
echo ""

# ─────────────────────────────────────────────────────────────────
# Installation
# ─────────────────────────────────────────────────────────────────

echo -e "${BLUE}Installing Hindsight...${NC}"
echo ""

# Update image-summarizer and web package.json with SDK path
echo "  Configuring lmstudio-js SDK path..."
sed -i '' "s|__LMSTUDIO_SDK_PATH__|$LMSTUDIO_SDK_PATH|g" packages/image-summarizer/package.json
sed -i '' "s|__LMSTUDIO_SDK_PATH__|$LMSTUDIO_SDK_PATH|g" packages/web/package.json

# Create .env file
echo "  Creating .env file..."
cat > .env << EOF
# Hindsight Configuration
# Generated by install.sh on $(date)

# LM Studio API token
LM_API_TOKEN=$LM_API_TOKEN

# Path to lmstudio-js SDK
LMSTUDIO_SDK_PATH=$LMSTUDIO_SDK_PATH

# API server port
PORT=$PORT

# Screenshot capture interval in minutes
CAPTURE_INTERVAL=$CAPTURE_INTERVAL

# Vision model for screenshot summarization
VISION_MODEL=$VISION_MODEL

# Web dashboard port
WEB_PORT=$WEB_PORT
EOF

# Create data and logs directories
echo "  Creating data directories..."
mkdir -p data/screenshots
mkdir -p logs

# Install npm dependencies
echo "  Installing npm dependencies (this may take a moment)..."
npm install

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║              Installation Complete!                        ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "Next steps:"
echo ""
echo "  1. Make sure LM Studio is running with the vision model loaded:"
echo "     Model: $VISION_MODEL"
echo ""
echo "  2. Start Hindsight:"
echo "     ./hindsight.sh start"
echo ""
echo "  3. Check status:"
echo "     ./hindsight.sh status"
echo ""
echo "  4. View logs:"
echo "     ./hindsight.sh logs"
echo ""
echo "  5. Open the web dashboard:"
echo "     http://localhost:$WEB_PORT"
echo ""
echo "  6. Stop Hindsight:"
echo "     ./hindsight.sh stop"
echo ""
echo "Configuration saved to: .env"
echo "Edit this file to change settings."
echo ""
