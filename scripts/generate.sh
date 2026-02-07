#!/usr/bin/env bash

# Bloom Identity Card Generator
# Generates identity cards with real wallets on Base

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Parse command line arguments
USER_ID=""
while [[ $# -gt 0 ]]; do
  case $1 in
    --user-id)
      USER_ID="$2"
      shift 2
      ;;
    *)
      echo "Unknown option: $1"
      echo "Usage: $0 --user-id <userId>"
      exit 1
      ;;
  esac
done

# Validate user ID
if [ -z "$USER_ID" ]; then
  echo "❌ Error: --user-id is required"
  echo "Usage: $0 --user-id <userId>"
  exit 1
fi

# Load environment variables
if [ -f "$PROJECT_ROOT/.env" ]; then
  export $(grep -v '^#' "$PROJECT_ROOT/.env" | xargs 2>/dev/null || true)
fi

# Execute the complete skill
cd "$PROJECT_ROOT"
npx tsx src/index.ts --user-id "$USER_ID"
