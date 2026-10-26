"""Vertical definitions and the workflow engine (DOCS/31): every shipped definition is valid, invalid ones are refused with the
reason, healthcare resolves to exactly today's clinic tools and booking order, runs are bounded, validated and resumable."""

import copy
import unittest
from pathlib import Path

import yaml

from backend.ai.workflows.registry import DEFINITIONS_DIR, KNOWN_TOOLS, WorkflowDefinitionError, WorkflowRegistry, workflow_registry


def _raw(name: str) -> dict:
    return yaml.safe_load((DEFINITIONS_DIR / f"{name}.yaml").read_text(encoding="utf-8"))


def _registry_from(*raws: dict) -> WorkflowRegistry:
    from backend.ai.workflows.schema import VerticalDefinition, WorkflowSpec

    verticals, workflows = {}, {}
    for raw in raws:
        v = VerticalDefinition.model_validate(raw["vertical"])
        verticals[v.key] = v
        for item in raw.get("workflows") or []:
            wf = WorkflowSpec.model_validate(item)
            workflows[wf.id] = wf
    return WorkflowRegistry(verticals, workflows)


class ShippedDefinitions(unittest.TestCase):
    def test_every_vertical_and_subtype_loads_and_validates(self):
        r = WorkflowRegistry.from_dir()
        self.assertEqual(sorted(r.verticals), ["clinic", "education", "salon", "wellness"])
        subtypes = {v: [s.key for s in r.verticals[v].subtypes] for v in r.verticals}
        self.assertEqual(subtypes["clinic"], ["dental", "general_clinic", "hospital"])
        self.assertEqual(subtypes["education"], ["university", "school", "coaching", "edtech"])
        self.assertEqual(subtypes["salon"], ["hair_salon", "beauty_salon", "barbershop", "nail_salon", "lash_brow"])
        self.assertEqual(subtypes["wellness"], ["day_spa", "massage_spa", "wellness_centre", "sauna"])

    def test_healthcare_is_exactly_todays_clinic(self):
        from backend.ai.engine.agent.controller import SLOT_ORDER

        r = workflow_registry()
        clinic_tools = ["check_availability", "book_appointment", "lookup_appointment", "cancel_appointment",
                        "reschedule_appointment", "send_confirmation", "search_knowledge", "transfer_to_human", "end_call"]
        for sub in (None, "", "dental", "general_clinic", "hospital", "Dental Clinic"):  # unknown / display text -> first subtype
            with self.subTest(sub):
                self.assertEqual(sorted(r.tools_for("clinic", sub)), sorted(clinic_tools))
                self.assertEqual(r.booking_slot_order("clinic", sub), SLOT_ORDER)
        self.assertFalse(r.vertical("clinic").workflow_runtime)

    def test_subtypes_do_not_all_share_one_workflow(self):
        r = workflow_registry()
        edu = {s.key: tuple(s.workflows) for s in r.vertical("education").subtypes}
        self.assertEqual(len(set(edu.values())), 4)  # university, school, coaching and EdTech each run their own
        self.assertNotIn("book_appointment", r.tools_for("education", "edtech"))  # an EdTech demo is a lead, not a booking
        self.assertEqual(r.booking_slot_order("education", "edtech"), ())
        self.assertIn("capture_enquiry", r.tools_for("education", "university"))
        self.assertNotIn("capture_enquiry", r.tools_for("salon", "hair_salon"))

    def test_every_known_tool_has_a_toolbox_handler(self):
        from backend.ai.engine.agent.toolbox import AgentToolbox, tool_schemas

        for tool in KNOWN_TOOLS:
            self.assertTrue(hasattr(AgentToolbox, f"_tool_{tool}"), tool)
        self.assertEqual({s["function"]["name"] for s in tool_schemas()}, KNOWN_TOOLS)

    def test_prompt_overlays_still_apply_to_the_base_packs(self):
        from backend.ai.prompts import overlay_problems

        self.assertEqual(overlay_problems(), [])

    def test_unknown_vertical_is_refused_never_treated_as_a_clinic(self):
        from backend.ai.verticals.errors import UnknownVerticalError

        for bad in ("restaurant", "", None, "CLINICS"):
            with self.assertRaises(UnknownVerticalError):
                workflow_registry().vertical(bad)


class InvalidDefinitionsAreRefused(unittest.TestCase):
    def _refused(self, mutate, expect: str, base: str = "salon"):
        raw = copy.deepcopy(_raw(base))
        mutate(raw)
        with self.assertRaises((WorkflowDefinitionError, ValueError)) as ctx:
            _registry_from(raw)
        self.assertIn(expect, str(ctx.exception))

    @staticmethod
    def _wf(raw, wid="salon.appointment_booking"):
        return next(w for w in raw["workflows"] if w["id"] == wid)

    @classmethod
    def _step(cls, raw, sid, wid="salon.appointment_booking"):
        return next(s for s in cls._wf(raw, wid)["steps"] if s["id"] == sid)

    def test_unknown_tool(self):
        self._refused(lambda r: self._wf(r)["tools"].append("delete_everything"), "unknown tool 'delete_everything'")

    def test_step_tool_outside_the_allowlist(self):
        self._refused(lambda r: self._wf(r)["tools"].remove("check_availability"), "not in the workflow's allowlist")

    def test_transition_to_a_missing_step(self):
        self._refused(lambda r: self._step(r, "collect").update(next=[{"to": "nowhere"}]), "missing step 'nowhere'")

    def test_loop_without_an_exit(self):
        def loop(r):
            self._step(r, "check")["next"] = [{"to": "collect"}]  # collect <-> check forever
        self._refused(loop, "cannot reach a complete/fail step")

    def test_last_transition_must_be_the_default(self):
        self._refused(lambda r: self._step(r, "check").update(next=[{"to": "confirm", "when": {"tool_code_in": ["ok"]}}]),
                      "last transition must be unconditional")

    def test_undefined_department(self):
        self._refused(lambda r: self._wf(r)["transfer"]["departments"].append("dean_office"), "undefined department 'dean_office'")

    def test_undeclared_slot(self):
        self._refused(lambda r: self._step(r, "collect")["slots"].append("shoe_size"), "undeclared slot 'shoe_size'")

    def test_subtype_naming_another_verticals_workflow(self):
        self._refused(lambda r: r["vertical"]["subtypes"][0]["workflows"].append("salon.nope"), "unknown workflow 'salon.nope'")

    def test_unknown_resource_kind(self):
        self._refused(lambda r: self._wf(r)["resources"].append("jacuzzi"), "unknown resource kind 'jacuzzi'")

    def test_department_falling_back_to_itself(self):
        self._refused(lambda r: r["vertical"]["departments"][1].update(default_fallback="manager"), "falls back to itself")

    def test_typo_in_a_field_name(self):
        self._refused(lambda r: self._wf(r).update(tolls=["end_call"]), "Extra inputs are not permitted")

    def test_invalid_validation_regex(self):
        self._refused(lambda r: self._wf(r)["slots"][0].update(validation="(unclosed"), "missing )")


class EngineRuns(unittest.TestCase):
    def setUp(self):
        from backend.ai.workflows.engine import WorkflowEngine

        r = workflow_registry()
        self.uni = WorkflowEngine(r.workflows["education.university_enquiry"])
        self.salon = WorkflowEngine(r.workflows["salon.appointment_booking"])

    def test_booking_asks_required_slots_in_order_and_skips_optional_ones(self):
        st = self.salon.start()
        asked = []
        for slot, value in (("service", "Haircut"), ("date", "2026-10-01"), ("time", "10:00 AM"), ("name", "Asha"), ("phone", "9876543210")):
            asked.append(self.salon.next_slot(st))
            self.salon.advance(st, slots={slot: value})
        self.assertEqual(asked, ["service", "date", "time", "name", "phone"])  # the optional stylist is never demanded
        self.assertEqual(st.state, "check")

    def test_moves_only_on_the_right_tools_real_result(self):
        st = self.salon.start()
        self.salon.advance(st, slots={"service": "Haircut", "date": "2026-10-01", "time": "10:00 AM", "name": "A", "phone": "9876543210"})
        self.salon.advance(st, tool="book_appointment", code="booked")  # wrong step's tool: ignored
        self.assertEqual(st.state, "check")
        self.salon.advance(st, tool="check_availability", code="ok")
        self.assertEqual(st.state, "confirm")
        self.salon.advance(st, tool="book_appointment", code="needs_confirmation")
        self.assertEqual(st.state, "confirm")
        self.salon.advance(st, tool="book_appointment", code="booked")
        self.assertEqual((st.status, st.outcome), ("completed", "booked"))

    def test_bad_slot_values_are_refused_by_code(self):
        st = self.uni.start()
        self.uni.advance(st, slots={"topic": "astrology"})
        self.assertNotIn("topic", st.slots)
        self.assertIn("must be one of", st.rejected["topic"])
        self.uni.advance(st, slots={"topic": "Admissions"})
        self.assertEqual(st.slots["topic"], "admissions")
        self.assertEqual(st.state, "answer")

    def test_a_loop_ends_the_run_instead_of_spinning(self):
        st = self.salon.start()
        full = {"service": "Haircut", "date": "2026-10-01", "time": "10:00 AM", "name": "A", "phone": "9876543210"}
        self.salon.advance(st, slots=full)
        for _ in range(5):  # availability keeps failing: collect -> check -> collect ...
            self.salon.advance(st, tool="check_availability", code="closed")
            self.salon.advance(st, slots=full)
        self.assertEqual((st.status, st.outcome), ("failed", "loop_exceeded"))

    def test_university_routes_complaints_through_identity_then_transfer(self):
        st = self.uni.start()
        self.uni.advance(st, slots={"topic": "complaint"})
        self.assertEqual((st.state, self.uni.next_slot(st)), ("identity", "name"))
        self.uni.advance(st, slots={"name": "Ravi", "phone": "+919876543210"})
        self.assertEqual(st.state, "route")
        self.uni.advance(st, tool="transfer_to_human", code="department_closed")
        self.assertEqual(st.state, "save_lead")  # name and phone already known: straight to saving the callback
        self.uni.advance(st, tool="capture_enquiry", code="saved")
        self.assertEqual(st.outcome, "lead_captured")


class RunsArePersistedAndResumed(unittest.TestCase):
    def test_a_second_session_resumes_the_saved_run(self):
        from backend.ai.evals.fixtures import make_db_factory
        from backend.ai.workflows.session import WorkflowSession

        factory, biz = make_db_factory()
        s1 = WorkflowSession(biz, "CA-1", "education", "university", factory)
        s1.sync([{"tool": "transfer_to_human", "args": {"topic": "complaint", "name": "Ravi", "phone": "9876543210"}, "result_code": "department_closed"}], {})
        s1.close()  # waits for the ordered background saves
        s2 = WorkflowSession(biz, "CA-1", "education", "university", factory)
        st = s2.run("education.university_enquiry")
        self.assertEqual(st.slots.get("topic"), "complaint")
        self.assertIn(st.state, ("save_lead", "lead_contact"))
        other = WorkflowSession(biz, "CA-2", "education", "university", factory).run("education.university_enquiry")
        self.assertEqual(other.state, "identify")  # another conversation starts fresh

    def test_saving_twice_keeps_one_row(self):
        from backend.ai.evals.fixtures import make_db_factory
        from backend.ai.workflows.engine import WorkflowEngine, WorkflowStore
        from backend.server.database.models.vertical import WorkflowRun

        factory, biz = make_db_factory()
        store = WorkflowStore(factory)
        st = WorkflowEngine(workflow_registry().workflows["salon.enquiry"]).start()
        store.save(biz, "CA-9", st)
        store.save(biz, "CA-9", st)
        with factory() as db:
            self.assertEqual(db.query(WorkflowRun).count(), 1)


if __name__ == "__main__":
    unittest.main()
