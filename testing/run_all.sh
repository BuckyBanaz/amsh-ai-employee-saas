#!/usr/bin/env bash
# Runs every check and prints one line per step. From the repo root:  bash testing/run_all.sh
# Needs: python deps from backend/requirements.txt + pytest + playwright, node deps installed in both apps, Chromium (PLAYWRIGHT_BROWSERS_PATH).
set -u
cd "$(dirname "$0")/.."
PY="${PYTHON:-python}"
API="http://127.0.0.1:8011/api"   # baked into the builds, and the port the browser test starts the API on
fail=0
step() { local name="$1"; shift; if "$@" >"testing/results/$(echo "$name" | tr ' /' '__').log" 2>&1; then echo "PASS  $name"; else echo "FAIL  $name  (see testing/results/)"; fail=1; fi; }
mkdir -p testing/results testing/screenshots
step "backend offline tests"        env PYTHONPATH=. "$PY" -m pytest backend/ai/evals -q -p no:cacheprovider
step "api smoke (real app, sqlite)" env PYTHONPATH=. "$PY" testing/api_smoke.py
step "admin typecheck"              bash -c "cd frontend/admin && npx tsc --noEmit"
step "admin lint (0 errors)"        bash -c "cd frontend/admin && npx eslint . --quiet"
step "user typecheck"               bash -c "cd frontend/user && npx tsc --noEmit"
step "user lint (0 errors)"         bash -c "cd frontend/user && npx eslint . --quiet"
step "admin production build"       bash -c "cd frontend/admin && NEXT_PUBLIC_API_URL=$API npx next build"
step "user production build"        bash -c "cd frontend/user && NEXT_PUBLIC_API_URL=$API npx next build"
step "browser e2e (both apps)"      env PYTHONPATH=. "$PY" testing/e2e_browser.py
exit $fail
