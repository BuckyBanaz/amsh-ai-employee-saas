# Hindi / Hinglish Rules — Language-Specific Exception

## IMPORTANT

The conversation improvements in this document are **ONLY for Hindi and Hinglish conversations**.

Do NOT globally change the receptionist's behavior for English-speaking callers.

The existing English conversation flow must continue working exactly as before unless a bug is language-independent, such as a duplicate appointment or incorrect backend operation.

---

# 1. LANGUAGE-SPECIFIC ACTIVATION

Hindi/Hinglish rules should activate only when the caller:

* speaks Hindi
* speaks Hinglish
* explicitly requests Hindi
* switches from English to Hindi/Hinglish during the call

Examples:

```text
"आप हिंदी में बात कीजिए"
"हिंदी में बात करो"
"mujhse Hindi mein baat karo"
"bhai Hindi mein batao"
"haan ji appointment karni hai"
"appointment book karani thi"
```

Once Hindi/Hinglish mode is detected, enable the Hindi/Hinglish conversation rules.

---

# 2. ENGLISH CALLERS MUST NOT BE AFFECTED

If the caller is speaking normal English, do NOT force:

* Hindi responses
* Hindi date formatting
* Hindi fillers
* Hindi greetings
* Hindi-specific conversational patterns
* Hindi/Hinglish intent interpretation where it changes existing behavior

Example:

Caller:

> I want to book an appointment.

AI should continue using the existing English flow.

Example:

> Sure. May I have your name, please?

Do NOT change it to:

> ज़रूर। आपका नाम क्या है?

unless the caller switches to Hindi/Hinglish or explicitly requests Hindi.

---

# 3. LANGUAGE MODE

Maintain a session-level language mode:

```text
language_mode:
    ENGLISH
    HINDI
    HINGLISH
```

Default:

```text
ENGLISH
```

unless the caller's language is clearly detected as Hindi/Hinglish.

---

# 4. SWITCHING LANGUAGE

The caller can switch languages at any point.

Example:

Caller:

> I want to book an appointment.

AI:

> Sure. What date would you prefer?

Caller:

> आप हिंदी में बात कीजिए।

AI:

> बिल्कुल। आप किस तारीख को appointment लेना चाहेंगे?

From this point, Hindi/Hinglish rules become active.

---

# 5. SWITCHING BACK TO ENGLISH

If the caller explicitly switches back to English:

Caller:

> Can you speak in English?

AI:

> Sure. How can I help you?

Then:

```text
language_mode = ENGLISH
```

Hindi-specific response rules must no longer be forced.

---

# 6. HINDI/HINGLISH ONLY — INTERRUPTION HANDLING

The special context-preserving behavior described in this document should be specifically optimized for Hindi/Hinglish conversational patterns.

Examples:

```text
"हेलो"
"जी"
"हाँ जी"
"अच्छा"
"ठीक है जी"
"या फिर"
"फिर?"
"क्या?"
"सुन रहे हो?"
```

These should be interpreted according to the current conversation state.

Example:

Current context:

```text
Existing appointment:
8 October
5:00 PM
```

Caller:

> हेलो

Do NOT restart the conversation.

Instead:

> जी Kamlesh, मैं सुन रही हूँ। आप सुबह वाली appointment के लिए कौन-सा समय चाहेंगे?

---

# 7. HINDI/HINGLISH LANGUAGE CONSISTENCY

Once the caller explicitly chooses Hindi:

```text
language_mode = HINDI
```

Keep responses in Hindi/Hinglish.

Example:

Caller:

> आप हिंदी में बात कीजिए।

AI:

> बिल्कुल Kamlesh जी, मैं हिंदी में बात करती हूँ।

Do NOT suddenly switch to:

> Great! Your appointment is confirmed for Thursday at 10:30 AM.

Prefer:

> बहुत बढ़िया Kamlesh जी। आपकी appointment गुरुवार, 8 अक्टूबर को सुबह 10:30 बजे confirm हो गई है।

---

# 8. ENGLISH TERMS ARE STILL ALLOWED

Hindi mode does NOT mean every word must be translated.

Natural Hinglish is allowed.

For example:

> आपकी appointment सुबह 10:30 बजे confirm हो गई है।

is preferred over unnatural translations.

Keep proper nouns unchanged:

```text
Dr. Sarah Wilson
Dental Consultation
AMSh
Clinic name
Doctor name
```

---

# 9. LANGUAGE DETECTION MUST NOT CHANGE CORE BOOKING LOGIC

Language-specific rules only affect:

* response language
* Hindi/Hinglish intent understanding
* conversational phrasing
* interruption handling
* natural fillers

They must NOT create separate appointment logic.

Both English and Hindi callers must use the same underlying:

```text
availability
booking
rescheduling
cancellation
patient data
appointment ID
backend tools
```

Example:

```text
English caller
    ↓
BOOK_APPOINTMENT
    ↓
CREATE_APPOINTMENT

Hindi caller
    ↓
BOOK_APPOINTMENT
    ↓
CREATE_APPOINTMENT
```

Same backend action.

---

# 10. LANGUAGE-INDEPENDENT SAFETY RULES

The following rules apply to ALL languages:

### Duplicate appointment prevention

Never create a second appointment when the user is modifying an existing appointment.

### Availability

Never claim a slot is available without checking availability.

### Tool success

Never claim an appointment is booked until the booking API succeeds.

### Rescheduling

Use the existing appointment ID when rescheduling.

### Patient context

Preserve already-collected information.

These are NOT Hindi-specific.

---

# 11. FILLER EXCEPTION

Hindi-specific filler rules apply only when:

```text
language_mode = HINDI
```

or:

```text
language_mode = HINGLISH
```

For example:

> जी, एक सेकंड।

Do not force this filler into English conversations.

English caller:

> Can you check tomorrow's availability?

Existing English behavior should remain unchanged.

---

# 12. FINAL IMPLEMENTATION RULE

Think of the system as two layers:

## Layer 1 — Universal Receptionist Logic

Applies to everyone:

```text
State management
Intent detection
Appointment tools
Availability
Booking
Rescheduling
Cancellation
Patient data
Tool verification
Duplicate prevention
```

## Layer 2 — Hindi/Hinglish Conversation Layer

Activates ONLY when:

```text
language_mode = HINDI
OR
language_mode = HINGLISH
```

Handles:

```text
Hindi responses
Hinglish understanding
Hindi interruptions
Hindi conversational context
Hindi fillers
Hindi-friendly date/time phrasing
```

English callers should continue using the existing English conversation behavior.

---

# CORE RULE

**Do not fix Hindi/Hinglish problems by changing the global receptionist behavior.**

Implement the Hindi/Hinglish improvements as a **language-specific conversational layer**, while keeping the underlying appointment and tool logic shared across all languages.
