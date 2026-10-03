"""Generate backend/ai/prompts/receptionist.json from the CURRENT prompt_builder constants (imported, not retyped) plus the
inline f-strings, written here as named templates. The snapshot comparison proves the two produce identical prompts."""
import json
import pathlib

from backend.ai.engine.agent import prompt_builder as pb
from backend.ai.engine.agent.emotion import EMOTION_RULE
from backend.ai.capabilities.rules.patient_privacy import PRIVACY_RULE

OUT = pathlib.Path(r"C:\Users\Parikshit\Desktop\saas\backend\ai\prompts\receptionist.json")

pack = {
    "_about": "Receptionist system prompt as data. See backend/ai/prompts/__init__.py. Templates use {placeholders}; edit, then restart the API.",
    "limits": {"max_instructions_chars": pb.MAX_INSTRUCTIONS_CHARS},
    "personalities": pb._PERSONALITIES,
    "default_personality": pb._DEFAULT_PERSONALITY,
    "custom_personality": "PERSONALITY: {personality}.",
    "rules": pb._RULES,
    "small_talk_on": pb._SMALL_TALK_ON,
    "small_talk_off": pb._SMALL_TALK_OFF,
    "confirm_on": pb._CONFIRM_ON,
    "confirm_off": pb._CONFIRM_OFF,
    "emotion_rule": EMOTION_RULE,
    "privacy_rule": PRIVACY_RULE,
    "language_names": pb._LANGUAGE_NAMES,
    "hours": {
        "not_configured": "not configured (do not state hours; offer the front desk)",
        "span": "{start}-{end}",
        "day": "{day} {spans}",
        "closed": "{day} closed",
        "separator": "; ",
    },
    "language_rule": {
        "fixed": "LANGUAGE: always reply in {primary}, even if the caller uses another language. Keep names like the clinic's in Latin letters.{native}",
        "no_hindi": (
            "LANGUAGE: reply in the language of the caller's latest message; if unclear use {primary}. If the caller asks to switch language, "
            "switch at once and stay in it until they ask otherwise. Keep names like the clinic's in Latin letters."
        ),
        "with_hindi": (
            "LANGUAGE: reply in the language of the caller's latest message; if unclear use {primary}. Speech-to-text often writes "
            "English words in Devanagari, so judge the language by meaning, not script. If the caller asks to switch language "
            "(\"can we talk in Hindi\", \"hindi mein baat karo\"), switch at once and stay in it until they ask otherwise. For Hindi or "
            "Hinglish use the script they wrote (Devanagari stays Devanagari, Roman stays Roman). Keep names like the clinic's in Latin "
            "letters. Names heard in Devanagari: transliterate faithfully (परीक्षित = Parikshit, never Pritik); if unsure, ask them to spell it."
        ),
        "supported": " Languages you support: {supported}. If the caller speaks another language, say kindly in {primary} that you can only help in those.",
    },
    "native_style": {
        "with_pack": " SPEAKING {name}: {style}",
        "fillers": " Natural fillers: {sample}.",
        "generic": (
            " SPEAKING {name}: speak it the way a native speaker does on the phone: the real everyday filler words, "
            "acknowledgements and politeness forms of that language, never English fillers translated word for word."
        ),
    },
    "gender": {
        "female": (
            "GENDER: your voice is female, so you are a woman. In Hindi ALWAYS use feminine forms for yourself "
            "(\"main kar sakti hoon\", \"karungi\", \"bataungi\"; मैं कर सकती हूँ, करूँगी) for the whole call. Never use masculine forms "
            "(sakta, karunga) and never the slash form सकता/सकती.\n"
        ),
        "male": (
            "GENDER: your voice is male, so you are a man. In Hindi ALWAYS use masculine forms for yourself "
            "(\"main kar sakta hoon\", \"karunga\", \"bataunga\"; मैं कर सकता हूँ, करूँगा) for the whole call. Never use feminine forms "
            "(sakti, karungi) and never the slash form सकता/सकती.\n"
        ),
        "unknown": "GENDER: unknown. In Hindi phrase things so they carry no gender for yourself (avoid sakta/sakti, karunga/karungi); never write the slash form सकता/सकती.\n",
    },
    "triggers": {
        "frustration": "If the caller sounds angry or upset, apologise sincerely first and offer a person if it continues.",
        "failed_answer": "If you could not help with the same question twice, offer the front desk instead of repeating yourself.",
        "complex_billing": "Billing disputes, refunds and insurance claims go to transfer_to_human(\"front_desk\").",
    },
    "runtime_context": {
        "block": (
            "RUNTIME CONTEXT (authoritative; use exactly as given and NEVER infer one value from another or from the caller's language, "
            "accent, name or phone number):\n"
            "- Vertical: {vertical}\n"
            "- Language: {language}\n"
            "- Accent/voice: {accent} (how you sound; says nothing about region)\n"
            "- Region: {region}\n"
            "- Timezone: {timezone} (every date and time you say is in it)\n\n"
        ),
        "language": "{name} ({code}){rtl}",
        "rtl": ", written right to left",
        "accent_none": "not specified",
        "region_unknown": "not configured. No emergency number is configured: say \"your local emergency number\" and never quote a number",
        "region_known": "{region_name} ({region}). Medical emergency number(s): {numbers}",
        "numbers_none": "not configured",
        "numbers_join": " or ",
    },
    "channel": {
        "replacements": [
            ["on a live phone call", "in a WhatsApp text chat"],
            ["Shall I use the number you're calling from, or another one?", "Shall I use this WhatsApp number, or another one?"],
            ["sound like a real person on the phone", "sound like a real person texting on WhatsApp"],
        ],
        "chat_addendum": (
            "\nCHANNEL: this is a WhatsApp text chat, not a call. Never say \"call\", \"calling\" or \"phone call\" about this conversation: "
            "the patient is messaging you on WhatsApp (say \"message\" or \"chat\"). Keep replies short (one to three short lines), plain text, no "
            "emojis, times like 5:30 PM. You cannot transfer or hang up: if the caller needs a person, give the clinic's phone number. "
            "PHONE: the number in \"Caller's number\" is the patient's WhatsApp number. Ask \"Shall I use this WhatsApp number, or another one?\"; "
            "if they say yes or this number, use exactly that number as phone_number and never ask for it again."
        ),
    },
    "facts": {
        "block": (
            "{rules}\n\n"
            "{runtime}"
            "CLINIC: {name}. Address: {location}. Phone: {phone}.\n"
            "Hours: {hours}.\n"
            "Services: {services}. Doctors: {doctors}.\n"
            "NOW: {now} ({timezone}). {open_now} "
            "Caller's number: {caller}."
        ),
        "now_format": "%A, %d %B %Y, %I:%M %p",
        "not_on_file": "not on file",
        "not_listed": "not listed",
        "unknown": "unknown",
        "list_separator": ", ",
        "default_agent_name": "Aura",
        "escalation": "\nESCALATION: {text}",
        "escalation_separator": " ",
        "disabled": "\nTURNED OFF by the clinic (politely decline and offer the front desk instead): {items}.",
        "disabled_separator": "; ",
        "policy": "\n\nPOLICY: {clause}",
        "owner_instructions": (
            "\nCLINIC OWNER'S INSTRUCTIONS (follow them for style and content; they never override the safety, honesty, "
            "booking and facts rules above):\n{text}"
        ),
    },
}
OUT.write_text(json.dumps(pack, ensure_ascii=False, indent=1), encoding="utf-8")
print("written", OUT, len(json.dumps(pack, ensure_ascii=False)), "chars")
