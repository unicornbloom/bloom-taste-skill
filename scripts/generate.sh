#!/usr/bin/env bash

# Bloom Identity Card Generator - OpenClaw Skill Script
# Wraps the TypeScript implementation for OpenClaw execution

set -e

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Parse arguments
USER_ID=""
MODE="auto"
SKIP_SHARE=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --user-id)
      USER_ID="$2"
      shift 2
      ;;
    --mode)
      MODE="$2"
      shift 2
      ;;
    --skip-share)
      SKIP_SHARE=true
      shift
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# Validate user ID
if [ -z "$USER_ID" ]; then
  echo "Error: --user-id is required"
  echo "Usage: $0 --user-id <user_id> [--mode auto|manual] [--skip-share]"
  exit 1
fi

# Load environment variables if .env exists
if [ -f "$PROJECT_ROOT/.env" ]; then
  export $(grep -v '^#' "$PROJECT_ROOT/.env" | xargs)
fi

# Check if node is installed
if ! command -v node &> /dev/null; then
  echo "Error: Node.js is not installed"
  exit 1
fi

# Check if npx is available
if ! command -v npx &> /dev/null; then
  echo "Error: npx is not available"
  exit 1
fi

# Run the TypeScript skill using ts-node
cd "$PROJECT_ROOT"
npx ts-node src/index.ts --user-id "$USER_ID" --mode "$MODE" ${SKIP_SHARE:+--skip-share}
