# AMSh Multi-Vertical Architecture & Visual Flowcharts Guide

Welcome to the definitive visual flowcharts and architecture guide for **AMSh (Autonomous AI Employee SaaS)**. 

AMSh is built on a **Generic, Configuration-Driven Multi-Vertical Engine**:
- **Zero hardcoded vertical logic**: The core conversation engine and database are completely vertical-agnostic.
- **Dynamic Onboarding**: Based on the business vertical and subtype chosen, the onboarding wizard loads the exact required steps (services, staff, departments, treatment rooms, working hours, AI agent persona).
- **Dynamic AI Conversation Workflows**: Each vertical executes deterministic state machines and tool calling tailored to its domain (Emergency triage for clinics, Multi-department transfers for universities, Stylist/deposit locks for salons, and Room resource locks for spas).

---

## Table of Contents
1. [Master SaaS Auth & Universal Onboarding Flow](#1-master-saas-auth--universal-onboarding-flow)
2. [Vertical 1: Education & Universities (Admissions & Department Routing)](#2-vertical-1-education--universities)
3. [Vertical 2: Healthcare & Medical Clinics (Intake, Booking & Emergency Triage)](#3-vertical-2-healthcare--medical-clinics)
4. [Vertical 3: Salons & Beauty Studios (Stylists, Slots & Deposits)](#4-vertical-3-salons--beauty-studios)
5. [Vertical 4: Luxury Spas & Wellness (Therapists, Treatment Rooms & Health Check)](#5-vertical-4-luxury-spas--wellness)
6. [Codebase & File Implementation Map](#6-codebase--file-implementation-map)

---

## 1. Master SaaS Auth & Universal Onboarding Flow

Every business owner follows a structured, secure onboarding journey. The system dynamically adapts the form steps according to the selected vertical.

### 🖼️ Visual Flowchart
![AMSh Universal SaaS Onboarding Flowchart](images/01_universal_onboarding_flow.jpg)

### 📊 Technical Mermaid Diagram
```mermaid
flowchart TD
    %% Auth
    A["👤 User Registration / Login"] -->|"POST /api/auth/register (JWT)"| B["🔐 Authenticated Session"]
    
    %% Vertical Selection
    B --> C["🏢 Business Profile & Vertical Choice<br/>(/onboarding/business)"]
    C --> D{"Select Vertical & Subtype"}
    D -->|Healthcare| D1["Clinic / Dental / Hospital"]
    D -->|Education| D2["University / School / Coaching / EdTech"]
    D -->|Salon| D3["Hair Salon / Barber / Beauty Studio"]
    D -->|Wellness| D4["Day Spa / Wellness / Recovery"]
    
    %% Dynamic Configurator Steps
    D1 & D2 & D3 & D4 --> E["⚙️ Dynamic Step Configurator"]
    E --> S1["1. Services / Courses / Treatments"]
    S1 --> S2["2. Staff / Doctors / Stylists / Departments"]
    S2 --> S3["3. Working Hours & Operating Schedules"]
    S3 --> S4["4. AI Agent Persona & Custom Voice (Groq/Cartesia)"]
    S4 --> S5["5. Knowledge Base (RAG Documents & FAQs)"]
    S5 --> S6["6. Telephony (Twilio/Plivo) & WhatsApp Cloud API"]
    
    %% Validation & Go Live
    S6 --> V["🔍 Review & Validation (/onboarding/review)"]
    V -->|"POST /api/businesses/{id}/vertical-config/validate"| CHK{"Valid?"}
    CHK -->|Errors| FIX["Highlight Missing Steps"] --> E
    CHK -->|Ready| ACT["🚀 Activate AI Employee (/vertical-config/activate)"]
    ACT --> SUB["💳 Subscription / Plan Activation"]
    SUB --> DASH["🎉 Live Business Dashboard"]
```

### Key Stages Explained
1. **User Registration & JWT Auth**: Secure token-based authentication (`POST /api/auth/register` & `/api/auth/login`).
2. **Vertical & Subtype Resolution**: Fetches schema from `GET /api/verticals`. The user chooses vertical and subtype (e.g. `education -> university`).
3. **Dynamic Step Engine**: Frontend loads only the relevant steps defined in `backend/ai/workflows/definitions/{vertical}.yaml`.
4. **Validation & Readiness Check**: Validates that mandatory requirements are met (at least 1 bookable service/course, AI persona selected, timezone configured).
5. **Activation**: System compiles prompt overlays, tool catalogs, and telephony routing.

---

## 2. Vertical 1: Education & Universities

Education is primarily an **inquiry, department routing, and lead-generation** workflow, combined with **campus tour / counselling bookings**.

### 🖼️ Visual Flowchart
![AI University Admissions & Student Front-Desk Flowchart](images/02_university_ai_flowchart.jpg)

### 📊 AI Conversation Mermaid Diagram
```mermaid
flowchart TD
    Inbound["📞 Student Inbound Call or WhatsApp Enquiry"] --> Greet["🎙️ AI Receptionist Greeting"]
    Greet --> Intent{"Identify Student Intent"}
    
    %% Branches
    Intent -->|General FAQ / Deadlines / Fees| RAG["📚 Query Verified Knowledge Base (RAG)"]
    Intent -->|Complex Query / Application Status| Route["🔀 Multi-Department Route Lookup"]
    Intent -->|Book Campus Tour / Counselling| Book["📅 Campus Visit Reservation"]
    
    %% Knowledge Base
    RAG --> Answer["🗣️ Speak Answer Grounded in University Docs"]
    Answer --> Resolved{"Satisfied?"}
    Resolved -->|Yes| FinishCall["✅ Call Completed"]
    Resolved -->|No / Wants Human| Route
    
    %% Department Routing
    Route --> DeptList{"Select Department"}
    DeptList -->|Visa / Int'l| D_Int["🌍 International Admissions"]
    DeptList -->|Fee Plans / Accounts| D_Acc["💰 Accounts & Financial Aid"]
    DeptList -->|Courses / Faculty| D_Acad["🎓 Academic Counselling"]
    
    D_Int & D_Acc & D_Acad --> Dial["📞 Place SIP/PSTN Human Transfer"]
    Dial --> TransferResult{"Staff Answered?"}
    TransferResult -->|Connected| Transferred["🤝 Handed Over to Staff"]
    TransferResult -->|Busy / Closed| Fallback["📝 Lead Capture Fallback"]
    
    %% Lead Capture / Booking
    Fallback --> CaptureLead["Collect Student Name, Phone & Query Summary"]
    CaptureLead --> CRM_Sync["📥 Log Enquiry in University CRM + Alert Staff"]
    
    Book --> CollectDetails["Collect Name, Phone, Date, Party Size"]
    CollectDetails --> Readback["🔁 Verbal Confirmation Read-back"]
    Readback --> LockVisit["🔒 Lock Tour Slot in Calendar"]
    LockVisit --> Notification["📲 WhatsApp / SMS Confirmation + Campus Map Sent"]
```

### Specific Capabilities in Education:
* **Department Routing**: Intelligent routing based on applicant level (Undergraduate vs. Postgraduate) and origin (Domestic vs. International).
* **Closed-Hours Fallback**: If admissions desks are closed, the AI captures full contact details and logs an enquiry task in the dashboard.
* **Campus Tour Reservations**: Real-time slot booking for Saturday tours or weekday counselling.

---

## 3. Vertical 2: Healthcare & Medical Clinics

Healthcare prioritizes **deterministic patient safety, emergency triage, doctor schedules, and EHR booking**.

### 🖼️ Visual Flowchart
![Healthcare & Clinic Patient Booking Journey Flowchart](images/03_clinic_ai_flowchart.jpg)

### 📊 AI Conversation Mermaid Diagram
```mermaid
flowchart TD
    PatientCall["📞 Inbound Patient Call / WhatsApp"] --> AnswerCall["🎙️ AI Clinic Receptionist Answers (1st Ring)"]
    AnswerCall --> Triage{"🚨 Emergency Triage Check"}
    
    %% Emergency Branch
    Triage -->|Severe Chest Pain, Heavy Bleeding, Shock| Escalate["🚑 Immediate 911 / ER Escalation Protocol<br/>(Instruct patient to hang up & call emergency services)"]
    
    %% Normal Booking Branch
    Triage -->|Routine Care / Symptoms / Enquiry| Identify["👤 Patient Intake & Service Selection"]
    Identify --> CollectInfo["Collect Patient Name, Phone, DOB, Preferred Doctor"]
    
    CollectInfo --> SlotCheck["🔍 Real-Time EHR / Calendar Slot Availability"]
    SlotCheck --> SlotFound{"Slot Open?"}
    SlotFound -->|No| OfferAlt["Suggest Next Available Timeslots"] --> SlotCheck
    SlotFound -->|Yes| Readback["🔁 Mandatory Verbal Confirmation Read-Back"]
    
    Readback --> PatientConfirm{"Patient Confirms 'Yes'?"}
    PatientConfirm -->|Correction| Modify["Update Date / Time Slot"] --> SlotCheck
    PatientConfirm -->|Confirmed| LockSlot["🔒 Lock Slot in EHR / Clinic Database"]
    
    LockSlot --> Dispatch["📲 WhatsApp Appointment Slip + Intake Form Link Dispatched"]
    Dispatch --> Done["✅ Booking Completed"]
    
    %% Reschedule / Cancel
    PatientCall -->|Reschedule / Cancel| Lookup["🔍 Lookup Existing Appointment by Phone"]
    Lookup --> ModifyAppt["Modify or Cancel with Verbal Confirmation"] --> Dispatch
```

### Specific Capabilities in Healthcare:
* **Strict Emergency Detection**: Deterministic safety checks prevent the AI from offering doctor appointments for life-threatening symptoms.
* **Patient Intake Fields**: Collects name, phone, date of birth, insurance provider, and reason for consultation.
* **Grounding & Read-back**: Code strictly enforces that the appointment is read back before any booking tool executes.

---

## 4. Vertical 3: Salons & Beauty Studios

Salons operate on **stylist preference, multi-service durations, and deposit links**.

### 🖼️ Visual Flowchart
![Salon & Beauty Studio AI Receptionist Flowchart](images/04_salon_ai_flowchart.jpg)

### 📊 AI Conversation Mermaid Diagram
```mermaid
flowchart TD
    Client["📞 Client Calls / Messages Salon"] --> Greet["🎙️ Salon AI Answers"]
    Greet --> SelectService["💇 Select Service (Balayage, Cut, Blowout, Facial)"]
    SelectService --> SelectStylist["✂️ Preferred Stylist (Specific Stylist or 'Any Available')"]
    
    SelectStylist --> SlotCheck["🔍 Calendar Slot & Stylist Schedule Availability"]
    SlotCheck --> Available{"Slot Available?"}
    Available -->|No| Suggest["Suggest Alternative Days / Stylists"] --> SlotCheck
    Available -->|Yes| DynamicPrice["💲 Compute Duration & Dynamic Price Quote"]
    
    DynamicPrice --> DepositCheck{"Deposit Required for Service?"}
    DepositCheck -->|Yes| GenLink["🔗 Generate Secure WhatsApp / SMS Deposit Link"]
    DepositCheck -->|No| Readback
    
    GenLink --> HoldSlot["⏳ 15-Minute Temporary Slot Hold"]
    HoldSlot --> Readback["🔁 Verbal Confirmation Read-Back"]
    
    Readback --> Confirmed["✅ Lock Appointment in Salon Schedule"]
    Confirmed --> WhatsAppRemind["📲 WhatsApp Confirmation & Calendar Invite Dispatched"]
```

### Specific Capabilities in Salons:
* **Service Durations**: Automatically calculates slot length (e.g., Full Balayage = 180 min, Haircut = 45 min).
* **Stylist Roster**: Respects individual stylist working hours, days off, and specialties.
* **WhatsApp Deposit Links**: Integrates with payment providers (Stripe Global) to prevent no-shows.

---

## 5. Vertical 4: Luxury Spas & Wellness

Spas feature **health contraindications, multi-therapist assignments, and specialized treatment rooms**.

### 🖼️ Visual Flowchart
![Luxury Spa & Wellness AI Concierge Flowchart](images/05_spa_wellness_flowchart.jpg)

### 📊 AI Conversation Mermaid Diagram
```mermaid
flowchart TD
    Guest["📞 Inbound Guest Call / WhatsApp"] --> Welcome["🌿 Spa AI Concierge Welcome"]
    Welcome --> HealthCheck{"🩺 Health & Contraindications Check"}
    
    %% Health Escalation
    HealthCheck -->|Pregnancy, Acute Injury, Severe Skin Conditions| TransferLead["🤝 Transfer to Senior Spa Therapist / Lead Intake<br/>(AI does not offer medical advice)"]
    
    %% Standard Spa Booking
    HealthCheck -->|All Clear| SelectTreatment["💆 Select Treatment / Wellness Package<br/>(Deep Tissue, Hydrotherapy, Sauna, Facial)"]
    SelectTreatment --> TherapistPref["🧑‍⚕️ Therapist Gender / Specialist Preference"]
    
    TherapistPref --> CheckTherapist["🔍 Check Therapist Availability"]
    CheckTherapist --> RoomCheck{"Dedicated Room / Equipment Required?<br/>(e.g., Hydrotherapy Tub, Vichy Shower)"}
    
    RoomCheck -->|No| ConfirmSlot
    RoomCheck -->|Yes| LockRoom["🚪 Resource Lock: Check & Reserve Treatment Room"]
    
    LockRoom --> RoomFree{"Room Free?"}
    RoomFree -->|No| AltRoomTime["Offer Alternate Time with Free Room"] --> CheckTherapist
    RoomFree -->|Yes| ConfirmSlot["🔁 Verbal Read-back & Cancellation Policy Read"]
    
    ConfirmSlot --> Booked["🔒 Lock Booking in Spa Management System"]
    Booked --> PrepGuide["📲 WhatsApp Booking Confirmation + Spa Etiquette & Prep Guide"]
```

### Specific Capabilities in Wellness:
* **Dual Resource Allocation**: Allocates both a **Therapist** AND a **Treatment Room** (ResourceAwareWriteOperations) simultaneously.
* **Contraindication Guard**: Protects business liability by transferring pregnant or injured guests to human wellness directors.
* **Package Coordination**: Coordinates multi-hour packages across sequential facilities.

---

## 6. Codebase & File Implementation Map

| Component | Codebase Path | Description |
| :--- | :--- | :--- |
| **Workflow Definitions** | `backend/ai/workflows/definitions/` | YAML configuration for `healthcare.yaml`, `education.yaml`, `salon.yaml`, `wellness.yaml`. |
| **Vertical Prompts** | `backend/ai/prompts/verticals/` | Overlays for system prompts, terminology, and tone per vertical. |
| **Language Packs** | `backend/ai/verticals/configs/` | Multilingual support (English, Hindi, German, Dutch, Arabic) per vertical. |
| **User Onboarding** | `frontend/user/app/onboarding/` | Next.js dynamic step wizard (`/business`, `/services`, `/staff`, `/hours`, `/review`). |
| **Visual Flowcharts** | `DOCS/flowcharts/images/` | High-resolution JPG flowchart infographics for all verticals. |
| **Mermaid Sources** | `DOCS/flowcharts/verticals/` | Source `.mmd` diagrams for system architecture and testing. |

---
*Created for AMSh Autonomous AI Employee Platform.*
