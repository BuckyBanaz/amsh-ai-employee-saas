# Amsh: Runtime context, language packs and RTL readiness

> Added 2026-10-03 on branch `v1.3`. Code: `backend/ai/verticals/{context,regions,language_policy,errors}.py`, `backend/ai/lexicon.py`,
> `backend/ai/locales/lexicon/<code>.json`, `backend/server/api/routes/languages.py`. Tests: `test_agent_core.py`
> (`RuntimeContextDimensions`, `LanguagePacks`, `HindiHinglishLayer`). Supersedes the "region gates the Hindi layer" idea in doc 21.

## 1. Five independent dimensions

One global engine; five settings, each from its own place, none inferred from another and none guessed by the model.

| Dimension | Stored in | Decides |
|---|---|---|
| Vertical | `Business.vertical` | terminology, capabilities, operations (vertical YAML) |
| Language | `Agent.primary_language` + `Agent.languages` (the /ai Languages tab) | how the agent talks: wording, native fillers, fixed lines, language layer |
| Accent / voice | `Agent.config["accent"]`, `Agent.voice_model` (the /ai Voice tab) | how it sounds; refines STT dialect only when it belongs to the primary language; never decides region |
| Region | `Business.country` only | emergency numbers, privacy framework (DPDP / GDPR / HIPAA) |
| Timezone | `Business.timezone` | today's date, appointment times, scheduling |

`BusinessContext` (`verticals/context.py`) holds the resolved values; `AgentEngine.context` exposes it and the system prompt starts
with a short RUNTIME CONTEXT block built from it. Valid examples: India + Hindi, India + English, Netherlands + Hindi,
Netherlands + Dutch, US + English (all tested). A missing vertical or timezone, a missing business, an unknown vertical or
unregistered operations raise `MissingContextError` / `UnknownVerticalError`; nothing falls back to clinic, UTC or India. A missing
country is not an error: region UNKNOWN, no emergency number is invented.

## 2. Language packs: a new language is data

A pack is `backend/ai/locales/lexicon/<code>.json`. Keys:

| Key | Used for |
|---|---|
| `name`, `native_name`, `direction` (`ltr` / `rtl`) | prompt, and the dashboard (see section 4) |
| `fillers` {`think`, `ack`, `delight`, `wait`} | native human filler words chosen by code (`agent/fillers.py`), "one moment" line |
| `leading_sounds`, `question_words` | do not stack a filler on a sentence that already starts with one; detect a question |
| `ask_patterns` | phrases for "can we talk in <language>" (`hindi.requested_language`) |
| `style` | native-speaker guidance added to the prompt (register, politeness form, how times are said, typical fillers) |
| `strings` | fixed lines in that language: `greeting`, `transfer_generic`, `fallback`, `no_transfer`, `billing`, `frustrated`, `unsure_claim`, `unsure_times` |
| `tts_language`, `stt_language` | codes for speech synthesis / recognition |
| `emergency_patterns`, `hinglish_words`... | emergency phrases (every language stays active whatever the region), Hindi layer data |
| `conversation_layer` | true when the language has a dedicated conversation layer (today Hindi/Hinglish) |

Packs shipped: English, Hindi (Hinglish), Spanish, French, German, Dutch, Arabic. To add a language: drop in its JSON file; optionally
`ai/locales/<code>.json` for the legacy flow's lines. No Python change. A language **without** a pack still works: the engine keeps
its code (`language_code`, no collapse to English), the prompt says "speak it the way a native speaker does on the phone: real
fillers, never English fillers translated", fixed lines fall back to English, and no code-chosen filler is added.

What follows the active language (the /ai primary language, or the one the caller switched to): prompt style note, native fillers,
wait filler, fixed lines, TTS language (`voice_profile.resolve_tts_language`; Hindi/English calls still pick per sentence), and STT
(`stt/language.py`: explicit STT setting, then the accent if it belongs to the primary language, then the primary language; never the
phone number or region).

### Languages the dashboard offers vs backend support
| UI option | Backend |
|---|---|
| English (US), English (India) | pack `en` (`en-IN` is the same language, the accent differs) |
| Hindi | pack `hi` + Hindi/Hinglish layer |
| Spanish, French, German | packs `es`, `fr`, `de` |
| Arabic | pack `ar` (RTL) |
| Dutch (accent list / onboarding only) | pack `nl` |
| Punjabi, Bengali (accent list only) | no pack: generic native-speaker instruction |

## 3. Language layer follows language, not region
The Hindi/Hinglish layer (doc 21) switches on from the language settings (`language_policy.py`): Hindi in the allowed languages or as
primary, or nothing restricted with auto-detect on. Region never switches it. Hindi in the Netherlands gets the layer and the Dutch
emergency number 112, no DPDP / 108.

## 4. RTL readiness (frontend comes later)
`GET /api/languages` (public, read-only) lists every pack: `code`, `name`, `native_name`, `direction`, `native_fillers`,
`tts_language`, `stt_language`. The dashboard can build its language picker from it and set `dir="rtl"` for Arabic and any later
right-to-left language (Hebrew, Persian, Urdu: add a pack with `"direction": "rtl"`). The engine also exposes
`context.direction` and tells the model to write right to left. Frontend still to do when you add Arabic: the `ar` entry already
exists in the Languages tab list; add `dir` handling for transcripts, chat bubbles and inputs, and an Arabic accent entry if wanted.

## 5. Behaviour changes to know
- Region comes from `Business.country` only. A business with an Indian timezone but no country is now region UNKNOWN (no 112/108).
- Netherlands is its own region (112), not "UK/EU 999 / 112"; "A&E" / "NHS" wording is UK-only.
- STT default is the language/accent from settings (`en` / `hi` / `nl`...), not the phone-number guess (`en-IN` / `en-US`).
- A call for a business with no vertical or timezone fails explicitly. The unused `restaurant` fallback is gone.
- Billing (separate work the same day): secure payment verification restored, auth on tenant billing routes, free upgrades closed,
  trial once per business, invoices only from real payments, `trial_config.json` recursion fixed.

## 6. Open
- Native-quality review: fillers, style notes and fixed lines for es / nl / de / fr / ar were written by Claude. Have a native speaker
  read them before a launch in that language.
- Not verified live: Cartesia voices and Deepgram models for Arabic (and nova-2 for non-multi languages); check the provider supports
  each `tts_language` / `stt_language` and that a voice exists for the accent.
- Not run: live LLM evals (daily token limit), a real call or chat in any non-English language.
- Base prompt is about 7.7k characters; `test_owner_instructions_are_included_capped...` (limit 6500) was already failing before this work.
- Base prompt still contains clinic-specific lines and Hinglish examples for every tenant; moving them into the vertical YAML and the
  Hindi pack is a separate step. `hindi.py` human/escalation regexes are still code.
- Compliance default greetings still mix language into region text (the Indian one says "Namaste").
