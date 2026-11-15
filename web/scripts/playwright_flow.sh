#!/usr/bin/env bash
set -euo pipefail

export CODEX_HOME="${CODEX_HOME:-$HOME/.codex}"
export PWCLI="$CODEX_HOME/skills/playwright/scripts/playwright_cli.sh"

if ! command -v npx >/dev/null 2>&1; then
  echo "npx is required (install Node.js/npm)."
  exit 1
fi

if [ ! -f "$PWCLI" ]; then
  echo "Playwright wrapper not found at: $PWCLI"
  exit 1
fi

BASE_URL="${1:-http://localhost:3000}"

run_pw() {
  bash "$PWCLI" "$@"
}

run_pw open "$BASE_URL" --headed
run_pw snapshot
run_pw click "Photographer Login"
run_pw snapshot
run_pw click "name@studio.com"
run_pw type "demo@framefind.app"
run_pw click "••••••••"
run_pw type "password123"
run_pw click "Access Studio"
run_pw snapshot
run_pw click "+ New Event"
run_pw snapshot
run_pw type "Playwright Event"
run_pw click "Create"
run_pw snapshot
run_pw click "Logout"
run_pw snapshot
run_pw click "Find photos"
run_pw snapshot
run_pw screenshot

echo "Playwright flow executed."
