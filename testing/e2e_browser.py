"""Browser end-to-end test of the two Next.js apps against a real API on a throwaway SQLite database. Real login forms, real clicks.
Screenshots go to testing/screenshots, results to testing/results/e2e_browser.json.

    (cd frontend/admin && NEXT_PUBLIC_API_URL=http://127.0.0.1:8011/api npm run build)
    (cd frontend/user  && NEXT_PUBLIC_API_URL=http://127.0.0.1:8011/api npm run build)
    python testing/e2e_browser.py

The API URL is baked into each build, so build with port 8011 (the port this script uses). Chromium comes from PLAYWRIGHT_BROWSERS_PATH.
"""

import glob
import json
import os
import signal
import subprocess
import sys
import time
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import harness as h  # noqa: E402
from playwright.sync_api import sync_playwright  # noqa: E402

HERE = Path(__file__).resolve().parent
SHOTS = HERE / "screenshots"
API_PORT, USER_PORT, ADMIN_PORT = 8011, 3000, 3001  # these origins are on the API's default CORS list
USER, ADMIN = f"http://127.0.0.1:{USER_PORT}", f"http://127.0.0.1:{ADMIN_PORT}"
RESULTS = []


def check(name: str, ok: bool, detail: str = "") -> None:
    RESULTS.append({"check": name, "ok": bool(ok), "detail": detail})
    print(("PASS " if ok else "FAIL ") + name + (f"  [{detail}]" if detail and not ok else ""))


def start_next(app: str, port: int) -> subprocess.Popen:
    proc = subprocess.Popen(["npx", "next", "start", "-p", str(port)], cwd=h.ROOT / "frontend" / app, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, start_new_session=True)  # own process group: npx leaves a child server behind otherwise
    for _ in range(60):
        try:
            urllib.request.urlopen(f"http://127.0.0.1:{port}/login", timeout=1)
            return proc
        except Exception:
            time.sleep(1)
    os.killpg(proc.pid, signal.SIGTERM)
    raise RuntimeError(f"{app} did not start on {port}: did you build it?")


def chromium_path() -> str:
    found = sorted(glob.glob(os.path.join(os.environ.get("PLAYWRIGHT_BROWSERS_PATH", "/opt/pw-browsers"), "chromium-*", "chrome-linux", "chrome")))
    if not found:
        raise RuntimeError("Chromium not found")
    return found[-1]


def shot(page, name: str) -> None:
    page.wait_for_timeout(400)
    page.screenshot(path=str(SHOTS / f"{name}.png"), full_page=False)


def admin_flow(browser, owner_token_unused: str) -> None:
    ctx = browser.new_context(viewport={"width": 1440, "height": 900})
    page = ctx.new_page()
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.goto(f"{ADMIN}/login", wait_until="networkidle")
    page.fill("input[type=email]", h.ADMIN_EMAIL)
    page.fill("input[type=password]", h.ADMIN_PASSWORD)
    page.click("button[type=submit]")
    page.wait_for_url("**/dashboard", timeout=20000)
    check("admin: real login form reaches the dashboard", True)
    page.wait_for_timeout(1500)  # the sidebar's first alerts poll sets this admin's "seen" marker

    # a clinic user signs in after the admin looked: that is an unread alert
    h.login(f"http://127.0.0.1:{API_PORT}", h.OWNER_EMAIL, h.OWNER_PASSWORD)
    page.reload(wait_until="networkidle")
    badge = page.locator("[aria-label$='unread alerts']")
    badge.wait_for(timeout=10000)
    check("admin: Alerts badge in the sidebar shows unread events", badge.count() == 1, badge.inner_text() if badge.count() else "")
    shot(page, "admin-01-sidebar-badge")

    page.goto(f"{ADMIN}/notifications", wait_until="networkidle")
    page.wait_for_selector("[data-testid=alerts] li")
    body = page.inner_text("[data-testid=alerts]")
    check("admin: alerts page lists the free trial", "started a free trial" in body)
    check("admin: alerts page lists the new signup and clinic", "New signup" in body and "New clinic: Sanjeevani Clinic" in body)
    check("admin: alerts page lists the sign-in", "Sign-in" in body)
    shot(page, "admin-02-alerts")
    page.click("text=Mark all read")
    page.wait_for_timeout(800)
    check("admin: mark all read clears the badge", page.locator("[aria-label$='unread alerts']").count() == 0)
    page.click("button[role=tab]:has-text('Trials')")
    page.wait_for_timeout(500)
    check("admin: category tab filters to trials", "started a free trial" in page.inner_text("[data-testid=alerts]") and "Sign-in" not in page.inner_text("[data-testid=alerts]"))
    shot(page, "admin-03-alerts-trials")

    page.goto(f"{ADMIN}/playground", wait_until="networkidle")
    page.wait_for_selector("select option:has-text('Sanjeevani Clinic')", state="attached")
    check("admin: playground shows the test-mode banner", "Test mode" in page.inner_text("[data-testid=test-mode-banner]"))
    value = page.locator("select option", has_text="Sanjeevani Clinic").first.get_attribute("value")  # labelled "(trial)" while on a trial
    page.select_option("select", value=value)
    page.fill("input[aria-label='Caller message']", "I want to book a checkup tomorrow at 10 AM")
    page.click("button:has-text('Send')")
    page.wait_for_selector("[data-testid=chat] >> text=thinking", state="detached", timeout=60000)
    page.wait_for_timeout(500)
    chat = page.inner_text("[data-testid=chat]")
    check("admin: playground gets a reply for the chosen clinic", chat.count("\n") >= 1 and "book a checkup" in chat, chat[:200])
    shot(page, "admin-04-playground")

    page.goto(f"{ADMIN}/usage", wait_until="networkidle")
    page.wait_for_selector("text=Spend by tool")
    text = page.inner_text("body")
    check("admin: usage page shows spend, revenue and profit", all(w.lower() in text.lower() for w in ("Tool spend", "Revenue", "Profit", "Margin")))  # labels are uppercased by CSS
    check("admin: usage page lists the tools and the clinic", all(w in text for w in ("Text to speech", "Phone calls", "SMS", "Sanjeevani Clinic")))
    check("admin: usage page notes that prices are estimates", "estimates" in text)
    bar = page.locator("[aria-label='Daily spend'] > div > div").last.bounding_box()  # a chart whose bars have no height is a real bug this test once caught
    check("admin: the daily spend chart draws bars", bar is not None and bar["height"] > 3, str(bar))
    shot(page, "admin-05-usage")
    price = page.locator("input[aria-label='Text to speech price']")
    price.fill("0.06")
    page.click("button:has-text('Save prices')")
    page.wait_for_selector("text=Saved. The report above now uses these prices")
    check("admin: editing a price saves and marks it edited", page.locator("text=edited").count() >= 1)
    page.get_by_role("heading", name="Rate card").scroll_into_view_if_needed()
    shot(page, "admin-06-usage-rate-card")

    # ---- policies: publish the starter drafts, edit an AI rule
    page.goto(f"{ADMIN}/policies", wait_until="networkidle")
    page.click("text=Add starter drafts")
    page.wait_for_selector("text=Added 5 starter draft")
    check("admin: starter policy drafts are added and say they are not published", page.locator("text=not published").count() >= 5)
    shot(page, "admin-07-policies-list")
    page.on("dialog", lambda d: d.accept())  # the publish confirmation
    for title in ("Terms of Service", "Privacy Policy", "Data Processing Addendum (DPDP, India)"):
        page.locator("tbody tr", has_text=title).first.click()
        page.wait_for_selector("textarea")
        if title == "Terms of Service":
            check("admin: the starter text warns it is a draft for a lawyer", "STARTER DRAFT" in page.input_value("textarea"))
            shot(page, "admin-08-policy-editor")
        page.get_by_role("button", name="Publish").click()
        page.wait_for_selector("text=Published.")
        page.click("text=All policies")
        page.wait_for_selector("tbody tr")
    page.wait_for_function("document.querySelectorAll('tbody tr').length >= 5 && [...document.querySelectorAll('tbody tr')].filter(r => /live/i.test(r.innerText)).length >= 3")  # the list reloads after going back
    check("admin: three policies are live after publishing", page.locator("tbody tr", has_text="live").count() == 3)
    shot(page, "admin-09-policies-published")
    page.click("button[role=tab]:has-text('AI privacy rules')")
    page.wait_for_selector("[data-testid=effective-notice]")
    page.click("button[role=tab]:has-text('India')")
    check("admin: AI rules show India's framework and the built-in notice", "may be recorded" in page.inner_text("[data-testid=effective-notice]") and "DPDP" in page.inner_text("body"))
    page.get_by_placeholder("Please note that this call may be recorded to help us serve you better.").fill("This call is recorded for quality and training.")
    page.get_by_role("button", name="Save", exact=True).click()
    page.wait_for_selector("text=Saved. New calls and chats use it from now on.")
    check("admin: the edited notice is shown as what the AI says", "recorded for quality and training" in page.inner_text("[data-testid=effective-notice]"))
    shot(page, "admin-10-policy-rules")
    check("admin: no uncaught script errors on admin pages", not errors, "; ".join(errors)[:300])
    ctx.close()


def user_flow(browser) -> None:
    ctx = browser.new_context(viewport={"width": 1440, "height": 900})
    page = ctx.new_page()
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.goto(f"{USER}/login", wait_until="networkidle")
    page.fill("input[type=email]", h.OWNER_EMAIL)
    page.fill("input[type=password]", h.OWNER_PASSWORD)
    page.click("button[type=submit]")
    page.wait_for_function("document.cookie.includes('access_token')", timeout=20000)
    check("user: real login form signs the clinic owner in", True)
    ctx.add_cookies([{"name": "amsh_onboarding_completed", "value": "true", "url": USER}])  # onboarding is not under test here
    page.goto(f"{USER}/dashboard", wait_until="networkidle")
    page.wait_for_selector("text=Test AI Receptionist", timeout=20000)
    shot(page, "user-01-dashboard")
    page.click("text=Test AI Receptionist")
    page.wait_for_selector("[data-testid=test-mode-banner]", timeout=10000)
    banner = page.inner_text("[data-testid=test-mode-banner]")
    check("user: playground shows the test-mode banner", "test mode" in banner.lower() and "no booking is saved" in banner, banner)
    shot(page, "user-02-playground-test-mode")

    # ---- policies: the public page, the sign-up links, the onboarding gate, the re-accept banner
    anon = browser.new_context(viewport={"width": 1100, "height": 800})
    apage = anon.new_page()
    apage.goto(f"{USER}/legal/terms", wait_until="networkidle")
    check("user: the published Terms are public (no login) at /legal/terms", "Terms of Service" in apage.inner_text("h1") and "Who we are" in apage.inner_text("body"))
    shot(apage, "user-03-legal-terms")
    apage.goto(f"{USER}/legal/privacy?country=India", wait_until="networkidle")
    check("user: the Privacy Policy page loads", "Privacy Policy" in apage.inner_text("h1"))
    apage.goto(f"{USER}/legal/unknown-thing", wait_until="networkidle")
    check("user: an unpublished policy says so instead of failing", "has not been published" in apage.inner_text("body"))
    apage.goto(f"{USER}/register", wait_until="networkidle")
    hrefs = apage.eval_on_selector_all("a[target=_blank]", "els => els.map(e => e.getAttribute('href'))")
    check("user: sign-up links to the real Terms and Privacy pages", "/legal/terms" in hrefs and "/legal/privacy" in hrefs, str(hrefs))
    anon.close()

    ctx.add_cookies([{"name": "amsh_onboarding_completed", "value": "false", "url": USER}])
    page.goto(f"{USER}/onboarding/review", wait_until="networkidle")
    page.wait_for_selector("[data-testid=policy-acceptance]", timeout=20000)
    card = page.inner_text("[data-testid=policy-acceptance]")
    check("user: onboarding shows what the AI does for the clinic's region", "DPDP" in card and "112 / 108" in card and "recorded" in card, card[:200])
    check("user: onboarding lists Terms, Privacy and the DPDP addendum", all(t in card for t in ("Terms of Service", "Privacy Policy", "Data Processing Addendum")))
    nxt = page.get_by_role("button", name="Select Subscription Plan")
    check("user: the next step is blocked until the policies are accepted", nxt.is_disabled())
    page.locator("[data-testid=policy-acceptance]").scroll_into_view_if_needed()
    page.evaluate("window.scrollBy(0, 220)")  # the whole card, not just its top edge
    shot(page, "user-04-onboarding-policies")
    for box in page.locator("[data-testid=policy-acceptance] input[type=checkbox]").all():
        box.check()
    page.get_by_role("button", name="Accept all").click()
    page.wait_for_function("document.querySelectorAll('[data-testid=policy-acceptance] input[type=checkbox]').length === 0")
    check("user: accepting unblocks the next step", nxt.is_enabled())
    page.locator("[data-testid=policy-acceptance]").scroll_into_view_if_needed()
    shot(page, "user-05-onboarding-policies-accepted")

    # a new version that asks everyone to accept again: the dashboard says so
    sup, _ = h.login(f"http://127.0.0.1:{API_PORT}", h.ADMIN_EMAIL, h.ADMIN_PASSWORD)
    _, listing = h.call(f"http://127.0.0.1:{API_PORT}", "GET", "/api/admin/policies", token=sup)
    terms = next(i for i in listing["items"] if i["key"] == "terms")
    h.call(f"http://127.0.0.1:{API_PORT}", "PUT", f"/api/admin/policies/{terms['id']}/draft", {"body": "# Terms of Service\n\nA material change to how we use call data, long enough to publish.", "summary": "We now use call data to improve the AI", "requires_reacceptance": True}, sup)
    h.call(f"http://127.0.0.1:{API_PORT}", "POST", f"/api/admin/policies/{terms['id']}/publish", token=sup)
    ctx.add_cookies([{"name": "amsh_onboarding_completed", "value": "true", "url": USER}])
    page.goto(f"{USER}/dashboard", wait_until="networkidle")
    page.wait_for_selector("text=needs your acceptance", timeout=15000)
    check("user: a new version that needs accepting shows a dashboard banner", True)
    shot(page, "user-06-dashboard-policy-banner")
    page.click("text=Review and accept")
    page.wait_for_selector("text=We now use call data to improve the AI")
    page.locator("[role=dialog] input[type=checkbox]").first.check()
    page.get_by_role("button", name="Accept all").click()
    page.wait_for_selector("text=needs your acceptance", state="detached", timeout=10000)
    check("user: accepting the new version clears the banner", True)
    check("user: no uncaught script errors on user pages", not errors, "; ".join(errors)[:300])
    ctx.close()


def main() -> int:
    SHOTS.mkdir(exist_ok=True)
    started = time.time()
    procs = []
    try:
        with h.running_api(API_PORT) as (base, db_path):
            h.make_platform_admin(db_path)
            clinic = h.seed_clinic(base, db_path)
            h.seed_spend(db_path, clinic["business_id"])
            procs = [start_next("admin", ADMIN_PORT), start_next("user", USER_PORT)]
            with sync_playwright() as p:
                browser = p.chromium.launch(executable_path=chromium_path())
                admin_flow(browser, clinic["owner_token"])
                user_flow(browser)
                browser.close()
    finally:
        for proc in procs:
            os.killpg(proc.pid, signal.SIGTERM)
    failed = [r for r in RESULTS if not r["ok"]]
    out = {"ran_at": time.strftime("%Y-%m-%d %H:%M:%S"), "seconds": round(time.time() - started, 1), "passed": len(RESULTS) - len(failed), "failed": len(failed), "checks": RESULTS}
    (HERE / "results" / "e2e_browser.json").write_text(json.dumps(out, indent=2))
    print(f"\n{out['passed']} passed, {out['failed']} failed in {out['seconds']}s")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
