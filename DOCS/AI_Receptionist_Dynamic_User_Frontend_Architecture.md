# AI Receptionist — Dynamic User Frontend Architecture

## 1. Goal

The current uploaded UI is designed around a clinic workflow: onboarding, appointments, patients, doctors/staff, calls, AI receptionist, knowledge base, integrations, analytics, notifications, billing, team and settings.

The important architectural decision is:

> **Do NOT build the frontend as a hardcoded Clinic Dashboard.**

Instead, build a **generic Business Dashboard** whose modules, navigation, terminology, forms, tables, cards and workflows are driven by a `Business Type + Capabilities + Configuration` system.

A customer should be able to create:

- Clinic
- Restaurant
- E-commerce
- Retail Store
- Salon / Spa
- Real Estate
- Gym
- Hotel
- Service Center
- Future custom business type

without us creating a completely new frontend application.

---

# 2. Core Concept

```text
                    BUSINESS SIGNUP
                          │
                          ▼
                  Select Business Type
                          │
              ┌───────────┴───────────┐
              │                       │
          Clinic                  Restaurant
              │                       │
              ▼                       ▼
       Capability Config        Capability Config
              │                       │
              └───────────┬───────────┘
                          ▼
                 Frontend Runtime
                          │
        ┌─────────────────┼──────────────────┐
        ▼                 ▼                  ▼
   Navigation          Pages             Components
        │                 │                  │
        └─────────────────┼──────────────────┘
                          ▼
                 Business Dashboard
```

The frontend should render the correct experience automatically.

---

# 3. Recommended Frontend Repository

```text
apps/
└── dashboard/
    ├── app/
    │   ├── (auth)/
    │   │   ├── login/
    │   │   ├── register/
    │   │   ├── forgot-password/
    │   │   ├── verify-email/
    │   │   └── invitation/
    │   │
    │   ├── onboarding/
    │   │   ├── account/
    │   │   ├── business/
    │   │   ├── resources/
    │   │   ├── staff/
    │   │   ├── hours/
    │   │   ├── ai-agent/
    │   │   ├── knowledge/
    │   │   ├── integrations/
    │   │   └── review/
    │   │
    │   └── (dashboard)/
    │       ├── dashboard/
    │       ├── appointments/
    │       ├── customers/
    │       ├── staff/
    │       ├── calls/
    │       ├── ai/
    │       ├── knowledge/
    │       ├── integrations/
    │       ├── analytics/
    │       ├── notifications/
    │       ├── billing/
    │       ├── team/
    │       └── settings/
    │
    ├── components/
    │   ├── ui/
    │   ├── layout/
    │   ├── navigation/
    │   ├── tables/
    │   ├── forms/
    │   ├── charts/
    │   ├── calls/
    │   ├── ai/
    │   ├── knowledge/
    │   └── onboarding/
    │
    ├── features/
    │   ├── dashboard/
    │   ├── appointments/
    │   ├── customers/
    │   ├── staff/
    │   ├── calls/
    │   ├── ai-receptionist/
    │   ├── knowledge-base/
    │   ├── integrations/
    │   ├── analytics/
    │   ├── billing/
    │   ├── team/
    │   └── notifications/
    │
    ├── business/
    │   ├── registry/
    │   ├── capabilities/
    │   ├── schemas/
    │   ├── adapters/
    │   └── resolver/
    │
    ├── verticals/
    │   ├── clinic/
    │   │   ├── config.ts
    │   │   ├── terminology.ts
    │   │   ├── navigation.ts
    │   │   ├── resources.ts
    │   │   └── capabilities.ts
    │   │
    │   ├── restaurant/
    │   │   ├── config.ts
    │   │   ├── terminology.ts
    │   │   ├── navigation.ts
    │   │   ├── resources.ts
    │   │   └── capabilities.ts
    │   │
    │   ├── ecommerce/
    │   ├── retail/
    │   ├── salon/
    │   ├── real-estate/
    │   ├── gym/
    │   ├── hotel/
    │   └── service-center/
    │
    ├── hooks/
    ├── stores/
    ├── services/
    ├── api/
    ├── lib/
    ├── types/
    ├── utils/
    └── middleware.ts
```

---

# 4. The Most Important Rule

## Don't do this

```text
if businessType === "clinic":
    show Doctors

if businessType === "restaurant":
    show Tables

if businessType === "ecommerce":
    show Products
```

all over the application.

This becomes impossible to maintain.

## Do this instead

```text
Business Type
      ↓
Business Definition
      ↓
Capabilities
      ↓
Resource Definitions
      ↓
Navigation
      ↓
UI
```

The dashboard becomes a **configuration-driven application**.

---

# 5. Business Registry

Create one registry that describes every supported business type.

```text
business/
└── registry/
    ├── index.ts
    ├── business.types.ts
    └── business.registry.ts
```

Example:

```ts
export const businessRegistry = {
  clinic: clinicConfig,
  restaurant: restaurantConfig,
  ecommerce: ecommerceConfig,
  retail: retailConfig,
  salon: salonConfig,
  realEstate: realEstateConfig,
  gym: gymConfig,
  hotel: hotelConfig,
  serviceCenter: serviceCenterConfig,
};
```

The backend should return the active business type and capabilities for the tenant.

Example API response:

```json
{
  "businessType": "clinic",
  "capabilities": [
    "appointments",
    "customers",
    "staff",
    "services",
    "ai_receptionist",
    "knowledge_base",
    "calls",
    "analytics",
    "integrations"
  ]
}
```

The frontend consumes this configuration.

---

# 6. Capability System

Business type alone is not enough.

Two clinics can have different requirements.

One may need:

```text
appointments
staff
patients
insurance
payments
```

Another may only need:

```text
appointments
customers
staff
```

Therefore:

```text
Business Type
      +
Capabilities
      +
Enabled Integrations
      +
Business Configuration
```

should control the UI.

---

# 7. Capability Registry

```text
business/
└── capabilities/
    ├── appointments.ts
    ├── customers.ts
    ├── staff.ts
    ├── services.ts
    ├── products.ts
    ├── orders.ts
    ├── tables.ts
    ├── properties.ts
    ├── memberships.ts
    ├── rooms.ts
    ├── calls.ts
    ├── ai-receptionist.ts
    ├── knowledge-base.ts
    ├── analytics.ts
    ├── integrations.ts
    ├── billing.ts
    └── team.ts
```

Each capability defines:

```ts
{
  id: "appointments",
  label: "Appointments",
  icon: "calendar",
  routes: {
    list: "/appointments",
    create: "/appointments/new"
  },
  permissions: [...],
  requiredIntegrations: [...],
  resource: ...
}
```

---

# 8. Resource System

This is how the frontend becomes genuinely generic.

Instead of creating separate pages for every vertical, define business resources.

## Example resources

```text
Customer
Staff
Service
Appointment
Order
Product
Table
Property
Membership
Room
Job
Call
Transaction
```

A clinic might map:

```text
Customer → Patient
Staff → Doctor / Receptionist
Service → Treatment
Appointment → Appointment
```

A restaurant:

```text
Customer → Customer
Staff → Staff
Service → Menu Item / Service
Appointment → Reservation
Table → Table
Order → Order
```

E-commerce:

```text
Customer → Customer
Product → Product
Order → Order
Appointment → Support Call / Callback
```

The underlying component can remain generic.

---

# 9. Resource Definition

```text
business/
└── schemas/
    ├── resource.schema.ts
    ├── field.schema.ts
    ├── form.schema.ts
    ├── table.schema.ts
    └── filter.schema.ts
```

Example:

```ts
const appointmentResource = {
  id: "appointments",

  labels: {
    singular: "Appointment",
    plural: "Appointments"
  },

  fields: [
    {
      key: "customer",
      type: "relation"
    },
    {
      key: "service",
      type: "relation"
    },
    {
      key: "staff",
      type: "relation"
    },
    {
      key: "startTime",
      type: "datetime"
    },
    {
      key: "status",
      type: "status"
    }
  ]
};
```

The same engine can render:

```text
List
Table
Create Form
Edit Form
Details Page
Filters
Search
Status
Calendar
```

---

# 10. Clinic Configuration

The uploaded clinic design has these major user-facing areas:

```text
Dashboard
Appointments
Patients
Doctors
Call Logs
AI Receptionist
Knowledge Base
AI Conversations
Services
Integrations
Analytics
Notifications
Billing
Team & Permissions
Settings
```

These are visible in the provided design. For example, the dashboard contains appointments, patients, doctors, call logs, AI settings, services, integrations and analytics. The onboarding also configures business, services, staff, hours, AI receptionist, knowledge and integrations.

Source: uploaded design, page 1. fileciteturn1file0L387-L407

The onboarding specifically asks for business details, services, staff, hours, AI receptionist, knowledge and integrations. fileciteturn1file0L155-L172 fileciteturn1file0L176-L196 fileciteturn1file0L201-L227 fileciteturn1file0L231-L260

We should convert these into generic capabilities rather than permanently naming everything "clinic".

---

# 11. Generic Navigation

```text
navigation/
├── core.ts
├── ai.ts
├── business.ts
├── system.ts
└── resolver.ts
```

Core navigation:

```text
Dashboard
Calls
AI Receptionist
Knowledge Base
Analytics
Integrations
Billing
Team
Settings
```

Business navigation is generated dynamically:

```text
Business Resources
├── Appointments
├── Customers
├── Staff
├── Services
├── Orders
├── Products
├── Tables
├── Properties
├── Rooms
└── Memberships
```

Only relevant resources appear.

---

# 12. Example: Clinic

```text
MAIN
├── Dashboard
├── Appointments
├── Patients
├── Doctors
└── Call Logs

AI
├── AI Receptionist
├── Knowledge Base
└── AI Conversations

BUSINESS
├── Services
└── Integrations

ANALYTICS
└── Analytics

SYSTEM
├── Notifications
├── Billing
├── Team
└── Settings
```

This matches the general information architecture shown in the uploaded clinic dashboard. fileciteturn1file0L387-L407

---

# 13. Example: Restaurant

The same dashboard engine can automatically become:

```text
MAIN
├── Dashboard
├── Reservations
├── Customers
├── Staff
├── Tables
└── Orders

AI
├── AI Receptionist
├── Knowledge Base
└── AI Conversations

BUSINESS
├── Menu
├── Locations
└── Integrations

ANALYTICS
└── Analytics

SYSTEM
├── Notifications
├── Billing
├── Team
└── Settings
```

No new dashboard application is required.

---

# 14. Example: E-commerce

```text
MAIN
├── Dashboard
├── Orders
├── Customers
├── Products
└── Calls

AI
├── AI Receptionist
├── Knowledge Base
└── AI Conversations

BUSINESS
├── Store
├── Shipping
├── Returns
└── Integrations

ANALYTICS
└── Analytics

SYSTEM
├── Notifications
├── Billing
├── Team
└── Settings
```

---

# 15. Vertical Configuration

Each vertical should only describe differences.

```text
verticals/
└── clinic/
    ├── config.ts
    ├── terminology.ts
    ├── navigation.ts
    ├── resources.ts
    └── capabilities.ts
```

Example:

```ts
export const clinicConfig = {
  type: "clinic",

  terminology: {
    customer: "Patient",
    staff: "Doctor",
    service: "Treatment",
    appointment: "Appointment"
  },

  capabilities: [
    "appointments",
    "customers",
    "staff",
    "services",
    "calls",
    "ai_receptionist",
    "knowledge_base",
    "analytics",
    "integrations"
  ]
};
```

Restaurant:

```ts
export const restaurantConfig = {
  type: "restaurant",

  terminology: {
    customer: "Customer",
    staff: "Staff",
    service: "Menu Item",
    appointment: "Reservation"
  },

  capabilities: [
    "reservations",
    "customers",
    "staff",
    "menu",
    "tables",
    "orders",
    "calls",
    "ai_receptionist",
    "knowledge_base",
    "analytics",
    "integrations"
  ]
};
```

---

# 16. AI-Generated Business Setup

This is the part that makes the product powerful.

The customer should NOT have to manually select every frontend module.

During onboarding:

```text
What type of business do you run?
              ↓
        AI / Registry
              ↓
      Detect business model
              ↓
     Generate capabilities
              ↓
    Generate initial resources
              ↓
     Generate terminology
              ↓
   Generate onboarding steps
              ↓
      Configure dashboard
```

Example:

```text
User:
"I run a dental clinic."

System:
businessType = clinic

Automatically enables:
✓ Appointments
✓ Patients
✓ Doctors
✓ Services
✓ AI Receptionist
✓ Knowledge Base
✓ Calls
✓ Analytics
✓ Integrations
```

The uploaded design already follows this type of onboarding flow: business details → services → staff → hours → AI receptionist → knowledge → integrations → review. fileciteturn1file0L155-L172 fileciteturn1file0L231-L286

---

# 17. AI Business Detection

Do not allow an LLM to directly modify frontend code.

Instead:

```text
User description
      ↓
AI classifier
      ↓
Structured BusinessProfile
      ↓
Validation
      ↓
Capability Resolver
      ↓
Dashboard Configuration
```

Example:

```json
{
  "businessType": "dental_clinic",
  "confidence": 0.98,
  "capabilities": [
    "appointments",
    "customers",
    "staff",
    "services",
    "calls",
    "knowledge_base"
  ]
}
```

The frontend only consumes the validated result.

---

# 18. Custom Business Types

For an unknown business:

```text
User:
"I run a car detailing business."

No exact template?
        ↓
AI analyzes business
        ↓
Detects:
services
customers
staff
appointments
locations
calls
        ↓
Creates capability configuration
```

Result:

```text
Dashboard
├── Dashboard
├── Bookings
├── Customers
├── Staff
├── Services
├── Calls
├── AI Receptionist
├── Knowledge Base
├── Integrations
├── Analytics
└── Settings
```

This means the SaaS can support new industries without a complete frontend rewrite.

---

# 19. Onboarding Architecture

Do not hardcode:

```text
ClinicOnboarding.tsx
```

Instead:

```text
onboarding/
├── engine/
│   ├── onboarding-engine.ts
│   ├── step-resolver.ts
│   └── validation.ts
│
├── steps/
│   ├── account/
│   ├── business/
│   ├── resources/
│   ├── staff/
│   ├── hours/
│   ├── ai-agent/
│   ├── knowledge/
│   ├── integrations/
│   └── review/
│
└── schemas/
```

The resolver decides which steps are needed.

Example:

```ts
resolveOnboarding({
  businessType: "clinic",
  capabilities: [...]
});
```

returns:

```text
Account
Business
Services
Staff
Hours
AI Receptionist
Knowledge
Integrations
Review
```

For a simple freelancer/service business:

```text
Account
Business
Services
Hours
AI Receptionist
Knowledge
Integrations
Review
```

---

# 20. Generic Components

Build reusable components once.

```text
components/
├── data-table/
├── data-grid/
├── calendar/
├── resource-list/
├── resource-detail/
├── resource-form/
├── stats-card/
├── activity-feed/
├── status-badge/
├── filter-bar/
├── search/
├── file-upload/
├── knowledge-source/
├── call-player/
├── transcript/
├── ai-agent-card/
├── integration-card/
├── chart/
└── onboarding/
```

Then configuration tells these components what to display.

---

# 21. Feature vs Vertical Separation

Use this rule:

```text
features/
    = reusable product capabilities

verticals/
    = business-specific configuration
```

Example:

```text
features/appointments/
    AppointmentTable.tsx
    AppointmentCalendar.tsx
    AppointmentForm.tsx

verticals/clinic/
    resources.ts
```

The feature owns UI behavior.

The vertical owns:

```text
label
fields
terminology
permissions
enabled/disabled
workflow differences
```

---

# 22. API Response for Dashboard

Backend should return something similar to:

```json
{
  "business": {
    "id": "biz_123",
    "name": "Example Business",
    "type": "clinic"
  },

  "configuration": {
    "capabilities": [
      "appointments",
      "customers",
      "staff",
      "services",
      "calls",
      "ai_receptionist",
      "knowledge_base",
      "analytics"
    ],

    "terminology": {
      "customer": "Patient",
      "staff": "Doctor",
      "service": "Treatment"
    }
  }
}
```

Frontend:

```ts
const config = useBusinessConfig();

const navigation = resolveNavigation(config);
const resources = resolveResources(config);
const terminology = resolveTerminology(config);
```

---

# 23. What the AI Can Generate

The AI/business setup layer can generate:

```text
✓ Business type
✓ Capabilities
✓ Terminology
✓ Services/resources
✓ Suggested onboarding steps
✓ Suggested AI receptionist skills
✓ Suggested knowledge categories
✓ Suggested integrations
✓ Suggested dashboard navigation
✓ Suggested call intents
```

But it should NOT directly generate arbitrary React/TypeScript code.

Generated configuration should always pass:

```text
AI Output
   ↓
Schema Validation
   ↓
Permission Validation
   ↓
Business Rules
   ↓
Persist
   ↓
Frontend Resolver
```

---

# 24. Permission System

The frontend must also be role-aware.

```text
team/
├── owner
├── admin
├── manager
├── receptionist
├── staff
└── viewer
```

Each capability can define:

```ts
permissions: {
  view: ["owner", "admin", "manager"],
  create: ["owner", "admin", "manager"],
  update: ["owner", "admin", "manager"],
  delete: ["owner", "admin"]
}
```

The backend must enforce permissions too. Frontend hiding a button is not security.

---

# 25. Tenant Isolation

Every dashboard request must be scoped to:

```text
user
   ↓
membership
   ↓
business / tenant
   ↓
agent
   ↓
resources
```

Never trust a business ID supplied by the browser without backend authorization.

---

# 26. Recommended Frontend State

```text
stores/
├── auth.store.ts
├── business.store.ts
├── configuration.store.ts
├── agent.store.ts
├── call.store.ts
├── notification.store.ts
└── ui.store.ts
```

Important:

```text
business.store
    ↓
configuration.store
    ↓
navigation
    ↓
pages
```

---

# 27. Final Mental Model

The frontend should NOT be:

```text
Clinic Frontend
Restaurant Frontend
Ecommerce Frontend
Salon Frontend
...
```

It should be:

```text
                    BUSINESS DASHBOARD
                           │
                    Business Resolver
                           │
              ┌────────────┴────────────┐
              │                         │
        Business Type              Capabilities
              │                         │
              └────────────┬────────────┘
                           │
                    Resource Resolver
                           │
                    Navigation Resolver
                           │
                    Onboarding Resolver
                           │
                    Component Registry
                           │
                           ▼
                  DYNAMIC USER PANEL
```

---

# 28. Final Folder Structure

```text
apps/dashboard/
│
├── app/
│   ├── (auth)/
│   ├── onboarding/
│   └── (dashboard)/
│
├── components/
│   ├── ui/
│   ├── layout/
│   ├── navigation/
│   ├── resource/
│   ├── forms/
│   ├── tables/
│   ├── charts/
│   ├── calls/
│   ├── ai/
│   └── knowledge/
│
├── features/
│   ├── dashboard/
│   ├── appointments/
│   ├── customers/
│   ├── staff/
│   ├── services/
│   ├── products/
│   ├── orders/
│   ├── calls/
│   ├── ai-receptionist/
│   ├── knowledge-base/
│   ├── integrations/
│   ├── analytics/
│   ├── billing/
│   ├── team/
│   └── notifications/
│
├── business/
│   ├── registry/
│   ├── capabilities/
│   ├── schemas/
│   ├── resolver/
│   └── adapters/
│
├── verticals/
│   ├── clinic/
│   ├── restaurant/
│   ├── ecommerce/
│   ├── retail/
│   ├── salon/
│   ├── real-estate/
│   ├── gym/
│   ├── hotel/
│   └── service-center/
│
├── onboarding/
│   ├── engine/
│   ├── steps/
│   └── schemas/
│
├── api/
├── services/
├── hooks/
├── stores/
├── types/
├── utils/
└── middleware.ts
```

# 29. Golden Rule

> **Add a business type by adding configuration, capabilities, resources, terminology and integrations — NOT by cloning the entire frontend.**

If tomorrow we add:

```text
Car Workshop
```

we should ideally only need:

```text
verticals/car-workshop/
    config.ts
    terminology.ts
    capabilities.ts
    resources.ts
    navigation.ts
```

plus any genuinely new feature/tool that does not already exist.

The existing dashboard engine should automatically assemble the user panel.
