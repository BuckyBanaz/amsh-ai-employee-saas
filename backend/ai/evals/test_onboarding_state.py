"""Signing in with onboarding unfinished must lead back to onboarding: the server says whether it is done, from the business's
status after checkout. Having a business only means the first step was done."""

import unittest

from backend.ai.evals.test_policies import Base
from backend.server.database.models.business import Business


class OnboardingState(Base):
    def me(self, who="owner"):
        return self.c.get("/api/auth/me", headers=self.h[who]).json()

    def _status(self, status):
        with self.factory() as db:
            db.get(Business, self.biz).status = status
            db.commit()

    def test_a_business_made_in_the_first_step_is_not_a_finished_onboarding(self):
        self._status("pending")
        self.assertFalse(self.me()["onboarding_completed"])

    def test_checkout_finishes_it(self):
        for status in ("trial", "active", "paused"):
            self._status(status)
            self.assertTrue(self.me()["onboarding_completed"], status)

    def test_a_teammate_joins_a_set_up_clinic_and_a_new_account_has_none(self):
        self._status("pending")
        self.assertTrue(self.me("staff")["onboarding_completed"])  # invited into the owner's clinic
        self.assertFalse(self.me("super")["onboarding_completed"])  # no business at all

    def test_the_trial_route_moves_it_to_finished(self):
        from backend.server.api.routes import billing

        self.c.app.include_router(billing.router)
        self._status("pending")
        r = self.c.post(f"/api/billing/businesses/{self.biz}/start-trial", headers=self.h["owner"], json={"plan_id": "starter"})
        self.assertEqual(r.status_code, 200, r.text)
        self.assertTrue(self.me()["onboarding_completed"])


if __name__ == "__main__":
    unittest.main()
