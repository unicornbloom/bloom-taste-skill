#!/usr/bin/env bash

# Bloom Identity OpenClaw Wrapper
#
# This script reads the full OpenClaw session file for comprehensive analysis
# Uses the last ~120 messages for accurate personality detection

set -e

# Get the directory of this script
WRAPPER_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BLOOM_SKILL_DIR="$(cd "$WRAPPER_DIR/.." && pwd)"

# Check if bloom-identity-skill is installed
if [ ! -d "$BLOOM_SKILL_DIR/src" ]; then
  echo "❌ Error: Bloom Identity Skill not found at $BLOOM_SKILL_DIR"
  echo ""
  echo "Please install:"
  echo "  cd ~/.openclaw/workspace"
  echo "  git clone https://github.com/unicornbloom/bloom-identity-skill.git"
  echo "  cd bloom-identity-skill"
  echo "  npm install"
  exit 1
fi

# Parse arguments
SESSION_FILE=""
USER_ID=""

# Check for --session-file or positional argument
if [ "$1" = "--session-file" ]; then
  SESSION_FILE="$2"
  USER_ID="${3:-$OPENCLAW_USER_ID}"
elif [ -f "$1" ]; then
  SESSION_FILE="$1"
  USER_ID="${2:-$OPENCLAW_USER_ID}"
else
  USER_ID="${1:-$OPENCLAW_USER_ID}"
fi

# If no session file provided, try to find it
if [ -z "$SESSION_FILE" ]; then
  # Try to locate session file from OpenClaw directory
  OPENCLAW_SESSIONS="$HOME/.openclaw/agents/main/sessions"

  if [ -d "$OPENCLAW_SESSIONS" ]; then
    # Find most recent .jsonl file
    SESSION_FILE=$(ls -t "$OPENCLAW_SESSIONS"/*.jsonl 2>/dev/null | head -1)

    if [ -n "$SESSION_FILE" ]; then
      echo "📁 Using session file: $(basename "$SESSION_FILE")"
    fi
  fi
fi

# Validate inputs
if [ -z "$USER_ID" ]; then
  echo "❌ Error: USER_ID required"
  echo ""
  echo "Usage:"
  echo "  bash execute.sh <session-file> <user-id>"
  echo "  bash execute.sh --session-file <path> <user-id>"
  echo "  Set OPENCLAW_USER_ID environment variable"
  exit 1
fi

if [ -z "$SESSION_FILE" ] || [ ! -f "$SESSION_FILE" ]; then
  echo "❌ Error: Session file not found"
  echo ""
  echo "Specify session file:"
  echo "  bash execute.sh ~/.openclaw/agents/main/sessions/<SessionId>.jsonl <user-id>"
  echo ""
  echo "Or ensure OpenClaw sessions directory exists:"
  echo "  ~/.openclaw/agents/main/sessions/"
  exit 1
fi

echo "🌸 Bloom Identity - Analyzing full session history..."
echo ""

# Run analyzer with session file
npx tsx "$BLOOM_SKILL_DIR/scripts/run-from-session.ts" "$SESSION_FILE" "$USER_ID"
