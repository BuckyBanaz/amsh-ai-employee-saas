# Amsh: BusinessContext, Hindi/Hinglish layer, slot rules and booking guard

> Added 2026-10-03. Spec for the language layer: `issue.md` (repo root). Code: `backend/ai/engine/agent/language_layer.py`,
> `backend/ai/verticals/language_policy.py`, `backend/ai/capabilities/operations/clinic/slot_availability.py`.
> Tests: `test_agent_core.py` (`HindiHinglishLayer`, slot-rule tests).

## 1. Architecture (one global engine, behaviour from config)

```
GLOBAL CONVERSATION ENGINE  (state, intent, tools, availability, booking, rescheduling, cancellation, patient data)
        |
        +-- region policy  (verticals/language_policy.py)  <- same region detection as the compliance resolver
                 |
                 +-- IN     -> Hindi/Hinglish layer allowed
                 +-- other  -> existing behaviour
```

- No separate India / Europe engines and no scattered `if country == "IN"`. `compliance.region_flags()` is the single region
  detector (country, timezone, currency); `language_policy.REGION_POLICIES` maps a region to behaviour flags.
- The engine resolves the policy once per call from the business's country/timezone and builds `LanguageLayer(enabled=...)`.
- Booking, rescheduling, tools, state and safety rules never read the policy or the language mode.

| Business region | Caller language | Hindi/Hinglish layer |
|---|---|---|
| India | Hindi / Hinglish / asks for Hindi | ON |
| India | English | OFF (English prompt is byte-for-byte unchanged) |
| Netherlands / any other | Hindi | OFF (older generic language notes still apply) |

Region comes from the **business**, not the caller's phone prefix: a +91 caller to a Dutch clinic does not switch it on.

## 2. Language mode (`language_layer.py`)

- `LanguageMode`: ENGLISH (default), HINDI, HINGLISH. Kept per session.
- Explicit request ("हिंदी में बात कीजिए", "Hindi mein baat karo") -> HINDI and it stays until the caller asks for English
  ("Can you speak in English?") -> ENGLISH. English words in between do not undo it.
- No request: Devanagari -> HINDI, Roman Hindi words (`_HINGLISH_WORDS`, at least two, or one in a very short message) ->
  HINGLISH, otherwise ENGLISH.
- In HINDI/HINGLISH the engine adds one system note (`_LAYER_NOTE`): stay in Hindi/Hinglish including confirmations, natural
  Hinglish with everyday English words, names unchanged (doctor, service, clinic, AMSh), Hindi-style dates/times that match
  the tool results, short fillers ("जी, एक सेकंड").
- **Interruptions:** a bare "हेलो / जी / हाँ जी / अच्छा / ठीक है जी / या फिर / फिर? / क्या? / सुन रहे हो?" is not a new request.
  The note carries the agent's last message and tells the model to acknowledge briefly and continue the pending step, never
  restart or re-greet.
- The wait filler ("one moment") turns Hindi only when the layer is active; English callers keep the English filler.
- `AgentTurn.language_mode` reports the mode after each turn.
- Not changed: the older `language_pref` / Devanagari notes and the wrong-language guard still run, as before.

To tune: word list, interruption list and note text live at the top of `language_layer.py`. To enable another region or
behaviour: one field and one table entry in `language_policy.py`.

## 3. Slot availability (a clinic operation, language-independent)

`operations/clinic/slot_availability.py` is the one place that decides what blocks a slot; `engine/agent/availability.is_free`
calls it.

1. **Pending bookings hold their slot.** Before, only `confirmed` blocked, so a "Pending" dashboard booking could be sold
   twice. Now `BLOCKING_STATUSES = confirmed, pending` (cancelled and completed do not block).
2. **Unassigned bookings count against a named doctor.** A booking with no doctor is stored as "Duty Doctor". Before, a
   request for "Dr. Sharma" ignored it. Now a named doctor is free only if they have no booking of their own AND the other
   overlapping bookings (other doctors plus unassigned ones) leave at least one doctor free. One doctor + one unassigned
   booking = blocked; two doctors + one unassigned = free; two unassigned = blocked.
3. No doctor named: free while overlapping bookings < number of doctors (minimum 1), as before.
4. Scaling: more doctors need no code change (count comes from staff); a new blocking status is one entry in the tuple.
5. `ClinicReadOperations.get_appointments` gained `statuses=` (several statuses at once); `status=` still works.

Working hours are still checked before conflicts: a request for 4 Oct at 10 PM gets "closed" or "outside working hours" and
never reaches the conflict check. The AI says only "taken / free", never whose appointment it is (privacy rule).

## 4. BusinessContext (one engine, behaviour from config) - added 2026-10-03

```
AMSh global engine  <-  BusinessContext  <-  vertical config (YAML)  +  region profile  +  language policy
                                                 verticals/configs/<vertical>/   verticals/regions.py   verticals/language_policy.py
```

`backend/ai/verticals/context.py` builds a frozen `BusinessContext` once per call from the business's own facts and hands it to
`AgentEngine` (`engine.context`). Fields: `vertical`, `region` (IN / US / UK_EU / OTHER), `language`, `timezone`,
`emergency_numbers`, `terminology` (Patient / Doctor... from the vertical YAML), `enabled_capabilities` (the vertical's
`default_tools`), `policies` (language policy). The engine, rules and operations read the context; none of them test a
country or a vertical name.

- **Where each fact lives:** vertical facts (terminology, intents, tools, prompts) stay in `verticals/configs/<vertical>/*.yaml`
  and the frontend's `frontend/user/verticals/<vertical>/config.ts` (type, terminology, capabilities). Region facts (emergency
  numbers) are data in `verticals/regions.py`. Region behaviour switches are in `verticals/language_policy.py`. Region
  detection is one function (`compliance.region_flags / detect_region`).
- **New vertical:** add its YAML (and a `config.ts` for the dashboard); the context picks it up. No engine change.
- **New region:** add a `RegionProfile` (and a policy entry if it needs behaviour). No engine change.
- The two vertical config trees were not restructured on purpose: the working clinic receptionist stays as it is. Moving
  `operations/clinic` to a generic `operations/` is a later, separate step.

### Hardcoded India values removed
| Was | Now |
|---|---|
| `business_hours.is_open(... timezone_str="Asia/Kolkata")` default (unused today) | default `UTC`; callers pass the business timezone (the prompt already used `facts.timezone`) |
| "(112 or 108 in India)" in the emergency message | `emergency_message(numbers)`; numbers from `BusinessContext.emergency_numbers`; unknown region says "your local emergency number" |
| Hindi emergency regex as a global constant | `EMERGENCY_PATTERNS` table per language (`en`, `hi`); add a language = add an entry. Detection stays on for **every** listed language whatever the region: a missed emergency costs more than a false alarm |

Still hardcoded (not done): the emergency numbers and wording inside `compliance.py` prompt text (it has its own per-region
strings), and the Hindi/Devanagari word lists in `hindi.py` (language data, not region logic).

## 5. Booking guard: change means reschedule, never a second booking

`operations/clinic/booking_guard.py`, called from the booking tool, so it holds whatever the model decides to call and in every
language. A booking is refused (`existing_appointment`) when the patient's own upcoming appointment (same phone, today or later,
confirmed or pending) exists AND either the caller used change words ("reschedule", "move", "change", "बदल", "badal"...) or it
is the same service. The refusal tells the model to `lookup_appointment` then `reschedule_appointment`. It is allowed when the
caller clearly asks for an additional one ("another appointment", "for my wife", "ek aur") or the service differs and no
change words were said. Other patients' and past appointments never count. This is the "LLM calls book instead of reschedule
and a duplicate appears" risk from the architecture audit.

Limit: it works from words the caller said and the service name; an unusual phrasing for "change" is not caught (add it to
`_CHANGE`).

## 6. Order of work (agreed)
1. Context/config layer: done (this section 4).
2. Reschedule safety: done (section 5).
3. Language + region behaviour: done (sections 1 to 2).
4. Remove hardcoded India values: three done (above), compliance prompt text left.
5. Later: generic operations across verticals, a second vertical (a restaurant YAML was in git; it is deleted in the working tree, check before relying on it), per-language emergency lists from
   the vertical YAML.

## 7. Open

- Language layer: not tried on a real WhatsApp or phone conversation yet; Hinglish detection is a word list, so rare
  words can be missed or an English sentence with two Hindi words can trip it.
- Live LLM evals were not run (Groq daily token limit, see `.agents/rules/ai-receptionist-rules.md` rule 8); the offline suite
  passes except the 6 known failures.
- The "Duty Doctor" placeholder is still how an unassigned booking is stored; a real `doctor_id` column would be cleaner.
