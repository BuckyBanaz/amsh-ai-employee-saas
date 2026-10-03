# Testing

Everything that checks the platform end to end lives here. Nothing in this folder touches a real database, sends a message or calls a paid provider: each run starts the API on a throwaway SQLite file with no model keys.

| File | What it does |
|---|---|
| `run_all.sh` | Runs every step below and prints one PASS/FAIL line each. `PYTHON=/path/to/venv/bin/python bash testing/run_all.sh` |
| `api_smoke.py` | Starts the real app (real routes, real auth, Alembic migrations from empty) and checks access control, alerts, spend report, rate card, playground test mode and suspension. 35 checks. |
| `e2e_browser.py` | Playwright. Starts the API and both built Next apps, signs in through the real login forms, clicks through alerts, playground, usage and the rate card, and takes screenshots. 18 checks. |
| `harness.py` | Shared setup (API process, seeding a clinic the way a customer does, seeding spend). |
| `REPORT.md` | The latest results, what they found, and what is not covered. |
| `results/` | `api_smoke.json`, `e2e_browser.json` (kept); `*.log` per step (ignored by git). |
| `screenshots/` | What the browser test saw. |

The offline backend suite (451 tests) is `backend/ai/evals`; CI runs it and `api_smoke.py` on every push (`.github/workflows/ci.yml`).

The browser test needs both apps built against the port it uses (8011): `run_all.sh` does this.
