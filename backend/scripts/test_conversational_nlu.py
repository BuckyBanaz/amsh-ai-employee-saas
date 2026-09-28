"""
Verification Script for Conversational NLU & Persona Intelligence.
Tests all 5 semantic categories, identity recognition, out-of-scope redirection,
clinic knowledge, and slot corrections.
"""

import asyncio
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

from backend.ai.engine.conversation.nlu import ConversationalNLU, NLUCategory
from backend.ai.engine.conversation.state_machine import ConversationStateMachine
from backend.ai.verticals.registry import registry as vertical_registry


async def run_tests():
    print("=" * 70)
    print("🚀 STARTING CONVERSATIONAL NLU & PERSONA INTELLIGENCE TEST SUITE")
    print("=" * 70)

    vertical_cfg = vertical_registry.get_vertical("clinic")
    assert vertical_cfg is not None, "Clinic vertical config must exist"

    available_intents = [
        {"name": i.name, "description": i.description}
        for i in vertical_cfg.intents
    ]
    services = ["General Consultation", "Dental Cleaning", "Root Canal Treatment"]

    # -------------------------------------------------------------
    # TEST 1: Persona - Name & Identity ("Aapka naam kya hai?")
    # -------------------------------------------------------------
    print("\n[TEST 1] Persona Inquiry: 'Aapka naam kya hai?' (Hindi)")
    sm_hi = ConversationStateMachine(
        call_id="test_persona_hi",
        business_id="test_biz",
        caller_number="+919876543210",
        vertical_config=vertical_cfg,
        business_info={"name": "Sanjeevani Clinic", "agent_name": "Maya"},
        services=services,
        language="hi",
    )
    sm_hi.start_call()

    nlu_1 = await ConversationalNLU.analyze_turn(
        user_utterance="Aapka naam kya hai?",
        available_intents=available_intents,
        available_services=services,
        agent_name="Maya",
        business_name="Sanjeevani Clinic",
    )
    print(f"-> NLU Category: {nlu_1.category} | Intent: {nlu_1.intent} | Confidence: {nlu_1.confidence}")
    assert nlu_1.category == NLUCategory.PERSONA, f"Expected PERSONA, got {nlu_1.category}"

    res_1 = await sm_hi.process_user_turn(
        user_transcript="Aapka naam kya hai?",
        extracted_intent=nlu_1.intent,
        extracted_slots=nlu_1.slots,
        nlu_category=nlu_1.category.value,
        confidence=nlu_1.confidence,
    )
    print(f"-> Bot Response: \"{res_1['bot_response']}\"")
    assert "Maya" in res_1["bot_response"], "Agent name 'Maya' should be in the response"
    assert "Sanjeevani Clinic" in res_1["bot_response"], "Business name should be in the response"
    print("✅ TEST 1 PASSED: AI accurately identified its persona and name!")

    # -------------------------------------------------------------
    # TEST 2: Persona - Is AI ("Are you a real human or robot?")
    # -------------------------------------------------------------
    print("\n[TEST 2] Persona Inquiry: 'Are you an AI or a real person?' (English)")
    sm_en = ConversationStateMachine(
        call_id="test_persona_en",
        business_id="test_biz",
        caller_number="+15551234567",
        vertical_config=vertical_cfg,
        business_info={"name": "Smile Dental Care", "agent_name": "Aura"},
        services=services,
        language="en",
    )
    sm_en.start_call()

    nlu_2 = await ConversationalNLU.analyze_turn(
        user_utterance="Are you a robot or a real person?",
        available_intents=available_intents,
        available_services=services,
        agent_name="Aura",
        business_name="Smile Dental Care",
    )
    print(f"-> NLU Category: {nlu_2.category} | Intent: {nlu_2.intent}")
    assert nlu_2.category == NLUCategory.PERSONA, f"Expected PERSONA, got {nlu_2.category}"

    res_2 = await sm_en.process_user_turn(
        user_transcript="Are you a robot or a real person?",
        extracted_intent=nlu_2.intent,
        extracted_slots=nlu_2.slots,
        nlu_category=nlu_2.category.value,
        confidence=nlu_2.confidence,
    )
    print(f"-> Bot Response: \"{res_2['bot_response']}\"")
    assert "AI" in res_2["bot_response"], "Should clarify AI identity"
    print("✅ TEST 2 PASSED: AI accurately declared its AI nature with human handover option!")

    # -------------------------------------------------------------
    # TEST 3: Out-of-Scope ("Who is the Prime Minister of India?")
    # -------------------------------------------------------------
    print("\n[TEST 3] Out-of-Scope Query: 'Who is the Prime Minister of India?'")
    nlu_3 = await ConversationalNLU.analyze_turn(
        user_utterance="Who is the Prime Minister of India?",
        available_intents=available_intents,
        available_services=services,
        agent_name="Aura",
        business_name="Smile Dental Care",
    )
    print(f"-> NLU Category: {nlu_3.category} | Intent: {nlu_3.intent}")
    assert nlu_3.category == NLUCategory.OUT_OF_SCOPE, f"Expected OUT_OF_SCOPE, got {nlu_3.category}"

    res_3 = await sm_en.process_user_turn(
        user_transcript="Who is the Prime Minister of India?",
        extracted_intent=nlu_3.intent,
        extracted_slots=nlu_3.slots,
        nlu_category=nlu_3.category.value,
        confidence=nlu_3.confidence,
    )
    print(f"-> Bot Response: \"{res_3['bot_response']}\"")
    # Must NOT be the old generic booking fallback!
    assert "I'm here to help with scheduling appointments, checking doctors, or clinic hours" not in res_3["bot_response"]
    assert "specialize in clinic" in res_3["bot_response"].lower() or "clinic" in res_3["bot_response"].lower()
    print("✅ TEST 3 PASSED: Polite out-of-scope redirect without generic booking fallback!")

    # -------------------------------------------------------------
    # TEST 4: Nonsense / Unclear Speech ("Potato helicopter")
    # -------------------------------------------------------------
    print("\n[TEST 4] Nonsense / Low-Confidence Speech: 'Potato helicopter'")
    nlu_4 = await ConversationalNLU.analyze_turn(
        user_utterance="Potato helicopter",
        available_intents=available_intents,
        available_services=services,
        agent_name="Aura",
        business_name="Smile Dental Care",
    )
    print(f"-> NLU Category: {nlu_4.category} | Confidence: {nlu_4.confidence}")
    assert nlu_4.category in (NLUCategory.AMBIGUOUS_UNCLEAR, NLUCategory.OUT_OF_SCOPE)

    res_4 = await sm_en.process_user_turn(
        user_transcript="Potato helicopter",
        extracted_intent=nlu_4.intent,
        extracted_slots=nlu_4.slots,
        nlu_category=nlu_4.category.value,
        confidence=nlu_4.confidence,
    )
    print(f"-> Bot Response: \"{res_4['bot_response']}\"")
    assert "catch that" in res_4["bot_response"] or "specialize" in res_4["bot_response"]
    print("✅ TEST 4 PASSED: Asks for repetition / redirection rather than forcing booking!")

    # -------------------------------------------------------------
    # TEST 5: Action / Booking with Correction ("Actually Thursday")
    # -------------------------------------------------------------
    print("\n[TEST 5] Booking Flow & Correction: 'Kal appointment chahiye' then 'Actually Thursday'")
    sm_booking = ConversationStateMachine(
        call_id="test_booking",
        business_id="test_biz",
        caller_number="+919876543210",
        vertical_config=vertical_cfg,
        business_info={"name": "Sanjeevani Clinic", "agent_name": "Maya"},
        services=services,
        language="en",
    )
    sm_booking.start_call()

    # Turn 1: User asks for appointment tomorrow
    nlu_5a = await ConversationalNLU.analyze_turn(
        user_utterance="Can I get an appointment tomorrow?",
        available_intents=available_intents,
        available_services=services,
        agent_name="Maya",
        business_name="Sanjeevani Clinic",
    )
    print(f"-> Turn 1 NLU Category: {nlu_5a.category} | Slots: {nlu_5a.slots}")
    res_5a = await sm_booking.process_user_turn(
        user_transcript="Can I get an appointment tomorrow?",
        extracted_intent=nlu_5a.intent,
        extracted_slots=nlu_5a.slots,
        nlu_category=nlu_5a.category.value,
    )
    print(f"-> Turn 1 Bot Prompt: \"{res_5a['bot_response']}\"")
    assert sm_booking.collected_slots.get("preferred_date") in ("tomorrow", "2026-09-29"), f"Expected date tomorrow or 2026-09-29, got {sm_booking.collected_slots.get('preferred_date')}"

    # Turn 2: User provides name
    nlu_5b = await ConversationalNLU.analyze_turn(
        user_utterance="My name is Parikshit Verma",
        available_intents=available_intents,
        available_services=services,
        agent_name="Maya",
        business_name="Sanjeevani Clinic",
        current_intent="appointment_booking",
        missing_slot="patient_name",
        collected_slots=sm_booking.collected_slots,
    )
    print(f"-> Turn 2 NLU Slots: {nlu_5b.slots}")
    res_5b = await sm_booking.process_user_turn(
        user_transcript="My name is Parikshit Verma",
        extracted_intent=nlu_5b.intent,
        extracted_slots=nlu_5b.slots,
        nlu_category=nlu_5b.category.value,
    )
    print(f"-> Turn 2 Bot Prompt: \"{res_5b['bot_response']}\"")
    assert "Parikshit" in str(sm_booking.collected_slots.get("patient_name"))

    # Turn 3: User corrects date ("Actually Thursday instead")
    nlu_5c = await ConversationalNLU.analyze_turn(
        user_utterance="Actually Thursday instead",
        available_intents=available_intents,
        available_services=services,
        agent_name="Maya",
        business_name="Sanjeevani Clinic",
        current_intent="appointment_booking",
        collected_slots=sm_booking.collected_slots,
    )
    print(f"-> Turn 3 Correction: is_correction={nlu_5c.is_correction} | overridden_slot={nlu_5c.overridden_slot} | Slots: {nlu_5c.slots}")
    res_5c = await sm_booking.process_user_turn(
        user_transcript="Actually Thursday instead",
        extracted_intent=nlu_5c.intent,
        extracted_slots=nlu_5c.slots,
        nlu_category=nlu_5c.category.value,
        is_correction=nlu_5c.is_correction,
        overridden_slot=nlu_5c.overridden_slot,
    )
    print(f"-> Turn 3 Bot Prompt: \"{res_5c['bot_response']}\"")
    assert "thursday" in str(sm_booking.collected_slots.get("preferred_date")).lower(), "Date slot should be overridden to Thursday!"
    assert "Parikshit" in str(sm_booking.collected_slots.get("patient_name")), "Patient name must be preserved across correction!"
    print("✅ TEST 5 PASSED: Slot correction updated date while preserving previous patient name!")

    # -------------------------------------------------------------
    # TEST 6: Knowledge / Clinic FAQ ("Clinic Sunday ko open hoti hai?")
    # -------------------------------------------------------------
    print("\n[TEST 6] Knowledge / FAQ: 'Clinic Sunday ko open hoti hai?' (Hindi)")
    nlu_6 = await ConversationalNLU.analyze_turn(
        user_utterance="Clinic Sunday ko open hoti hai kya?",
        available_intents=available_intents,
        available_services=services,
        agent_name="Maya",
        business_name="Sanjeevani Clinic",
    )
    print(f"-> NLU Category: {nlu_6.category} | Intent: {nlu_6.intent}")
    assert nlu_6.category == NLUCategory.KNOWLEDGE, f"Expected KNOWLEDGE, got {nlu_6.category}"
    print("✅ TEST 6 PASSED: Legitimate clinic question classified as KNOWLEDGE rather than booking!")

    print("\n" + "=" * 70)
    print("🎉 ALL 6 CONVERSATIONAL NLU & PERSONA TEST SUITES PASSED PERFECTLY!")
    print("=" * 70)


if __name__ == "__main__":
    asyncio.run(run_tests())
