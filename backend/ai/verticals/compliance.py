"""Regional compliance and vertical-aware policy resolver for multi-region SaaS.

Determines the appropriate data protection framework (HIPAA, DPDP, GDPR, DISHA)
and emergency protocols (911, 112/108, 999) based on tenant country, timezone, and business vertical.
Enforces Section 1 of the platform guidelines (Generic & Config-Driven).
"""

from typing import Dict, Any


def region_flags(country: str = "", timezone: str = "", currency: str = "") -> tuple:
    """(is_india, is_us, is_uk_eu) from the tenant's country, timezone and currency. The one place regions are detected: the
    compliance resolver below and `language_policy.py` both use it."""
    c = (country or "").strip().lower()
    tz = (timezone or "").strip().lower()
    curr = (currency or "").strip().upper()
    is_india = "india" in c or c == "in" or "kolkata" in tz or "calcutta" in tz or curr == "INR"
    is_us = "united states" in c or "usa" in c or c == "us" or "america" in tz or "pacific" in tz or "eastern" in tz
    is_uk_eu = (
        "uk" in c or "united kingdom" in c or "great britain" in c or c == "gb" or
        "europe" in tz or "london" in tz or "amsterdam" in tz or "berlin" in tz or
        curr in ("EUR", "GBP") or "germany" in c or "netherlands" in c or "france" in c
    )
    return is_india, is_us, is_uk_eu


def detect_region(country: str = "", timezone: str = "", currency: str = "") -> str:
    """'IN' | 'UK_EU' | 'US' | 'OTHER' (same precedence as the compliance chain below: India, then UK/EU, then US)."""
    is_india, is_us, is_uk_eu = region_flags(country, timezone, currency)
    return "IN" if is_india else "UK_EU" if is_uk_eu else "US" if is_us else "OTHER"


def get_regional_compliance(
    vertical: str = "clinic",
    country: str = "",
    timezone: str = "",
    currency: str = "USD"
) -> Dict[str, Any]:
    vert = (vertical or "clinic").strip().lower()
    is_india, is_us, is_uk_eu = region_flags(country, timezone, currency)

    if vert in ("clinic", "healthcare", "dental", "medical"):
        if is_india:
            framework = "DPDP Act (India) & DISHA"
            emergency_code = "112 / 108"
            emergency_guidance = "immediately dial 112 or 108, or go to the nearest emergency casualty"
            compliance_clause = (
                "COMPLIANCE & PRIVACY (India - DPDP & DISHA): Protect patient information in accordance with "
                "Digital Personal Data Protection (DPDP) and DISHA guidelines. Never diagnose or prescribe medicines over the phone. "
                "For medical emergencies (chest pain, severe bleeding, breathing distress), instruct the caller to dial 112 / 108 "
                "or proceed to the nearest emergency casualty immediately."
            )
            default_prompt = (
                "You are a professional, DPDP-compliant medical receptionist. Greet callers warmly, offer open "
                "appointment slots, confirm patient name and contact number, and answer clinic FAQs accurately. "
                "For medical emergencies, advise immediate emergency care (112/108)."
            )
            default_greeting = "Namaste! Welcome to our clinic. I am your AI receptionist. How can I help you today?"
        elif is_uk_eu:
            framework = "GDPR (UK/EU) & NHS Clinical Guidelines"
            emergency_code = "999 / 112"
            emergency_guidance = "dial 999 or 112 immediately, or go to the nearest A&E department"
            compliance_clause = (
                "COMPLIANCE & PRIVACY (UK/EU - GDPR): Handle all patient data with strict confidentiality in adherence to GDPR. "
                "Never offer clinical diagnosis or prescriptions over the phone. For acute life-threatening medical emergencies, "
                "instruct the caller to dial 999 or 112 immediately, or proceed to the nearest Accident & Emergency (A&E)."
            )
            default_prompt = (
                "You are a professional, GDPR-compliant medical receptionist. Greet callers warmly, offer open "
                "appointment slots, confirm patient name and contact number, and answer clinic FAQs accurately. "
                "For acute medical emergencies, advise immediate emergency care (999/112)."
            )
            default_greeting = "Hello, welcome to our clinic. I am your AI receptionist. How can I assist you today?"
        elif is_us:
            framework = "HIPAA (United States)"
            emergency_code = "911"
            emergency_guidance = "hang up and immediately dial 911, or proceed to the nearest emergency room"
            compliance_clause = (
                "COMPLIANCE & PRIVACY (USA - HIPAA): Maintain strict HIPAA privacy standards for Protected Health Information (PHI). "
                "Never provide clinical diagnoses or prescriptive medical advice. In life-threatening emergencies, "
                "instruct the caller to hang up and immediately dial 911 or visit the nearest emergency room."
            )
            default_prompt = (
                "You are a professional, HIPAA-compliant medical receptionist. Greet callers warmly, offer open "
                "appointment slots, confirm patient name and contact number, and answer clinic FAQs accurately. "
                "For medical emergencies, advise immediate emergency care (911)."
            )
            default_greeting = "Hello, welcome to our clinic. I am your AI receptionist. How may I help you today?"
        else:
            framework = "Global Healthcare Data Privacy"
            emergency_code = "Local Emergency Services"
            emergency_guidance = "immediately contact local emergency services or visit the nearest hospital emergency room"
            compliance_clause = (
                "COMPLIANCE & PRIVACY: Treat all patient health information with strict confidentiality. "
                "Do not offer clinical diagnosis or medical prescriptions over the phone. For medical emergencies, "
                "advise the caller to immediately contact their local emergency services or visit the nearest hospital."
            )
            default_prompt = (
                "You are a professional medical receptionist. Greet callers warmly, offer open appointment slots, "
                "confirm patient name and contact number, and answer clinic FAQs accurately. For medical emergencies, "
                "advise immediate emergency care."
            )
            default_greeting = "Hello, welcome to our clinic. I am your AI receptionist. How can I help you today?"

    elif vert in ("restaurant", "dining", "cafe", "hospitality"):
        framework = "Food Safety & Consumer Privacy"
        emergency_code = "911" if is_us else ("112" if is_india else "999")
        emergency_guidance = f"dial {emergency_code} in life-threatening allergic reactions"
        compliance_clause = (
            "DINING & ALLERGEN POLICY: Always inquire about severe food allergies (nuts, gluten, dairy, shellfish) "
            "when booking tables or answering menu questions. Inform guests about reservation policies and arrival grace periods."
        )
        default_prompt = (
            "You are a polite, hospitable restaurant host/hostess. Welcome guests warmly, take table reservations with date, "
            "time and party size, check for dietary restrictions/allergies, and answer questions about the menu and opening hours."
        )
        default_greeting = "Hello, thank you for calling! How can I assist you with table reservations or our menu today?"

    elif vert in ("salon", "spa", "wellness"):
        framework = "Consumer Privacy & Treatment Safety"
        emergency_code = "911" if is_us else ("112" if is_india else "999")
        emergency_guidance = "seek medical attention if severe chemical reactions occur"
        compliance_clause = (
            "SERVICE & SAFETY POLICY: Inquire about skin sensitivities or allergies prior to chemical or skin treatments. "
            "Clearly communicate appointment duration and 24-hour advance cancellation policies."
        )
        default_prompt = (
            "You are a friendly, polished salon coordinator. Help clients book appointments, select stylists or treatments, "
            "confirm date and time, and answer pricing and service questions politely."
        )
        default_greeting = "Hello, welcome! I am your salon assistant. How can I help you book a service or appointment today?"

    else:
        framework = "Standard Data Privacy"
        emergency_code = "Local Emergency"
        emergency_guidance = "contact local emergency services"
        compliance_clause = (
            "PRIVACY & ETHICS: Treat caller information with professional confidentiality and adhere to applicable local privacy standards."
        )
        default_prompt = (
            "You are a professional, courteous receptionist. Greet callers warmly, answer business questions accurately, "
            "take down caller inquiries, and schedule appointments or callbacks efficiently."
        )
        default_greeting = "Hello, thank you for calling. I am the AI receptionist. How can I assist you today?"

    return {
        "vertical": vert,
        "region": "India" if is_india else ("USA" if is_us else ("UK/Europe" if is_uk_eu else "International")),
        "framework": framework,
        "emergency_code": emergency_code,
        "emergency_guidance": emergency_guidance,
        "compliance_clause": compliance_clause,
        "default_system_prompt": default_prompt,
        "default_greeting": default_greeting,
    }
