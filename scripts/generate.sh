#!/usr/bin/env bash

# Bloom Identity Card Generator - New Version
# Uses full CLI (src/index.ts) instead of token-based approach
# Creates real wallets and permanent dashboard URLs

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Load environment variables
if [ -f "$PROJECT_ROOT/.env" ]; then
  export $(grep -v '^#' "$PROJECT_ROOT/.env" | xargs 2>/dev/null || true)
fi

# Parse arguments
USER_ID="$1"

if [ -z "$USER_ID" ]; then
  echo "❌ Error: USER_ID required"
  echo ""
  echo "Usage: bash scripts/generate.sh <user-id>"
  echo ""
  echo "Example:"
  echo "  bash scripts/generate.sh my-unique-user-id"
  exit 1
fi

# Run the full CLI
cd "$PROJECT_ROOT"
npx tsx src/index.ts --user-id "$USER_ID"
