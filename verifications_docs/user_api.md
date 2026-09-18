# AMSh User Portal — API Verification Spec

Documenting verified APIs mapped directly against `frontend/user` screens, ensuring 100% parameter accuracy between frontend forms and backend schemas.

---

## 📊 Verification Checklist

| Screen / Flow | Frontend Path | API Method & Endpoint | Status |
|---|---|---|:---:|
| **User Login** | `http://localhost:3000/login` | `POST /api/auth/login` | ✅ Verified |
| **User Register** | `http://localhost:3000/register` | `POST /api/auth/register` | ✅ Verified |
| **Accept Invite** | `http://localhost:3000/accept-invite` | `POST /api/auth/accept-invite` | ✅ Verified |
| **Onboarding: Business** | `http://localhost:3000/onboarding/business` | `POST /api/onboarding/businesses` | ✅ Verified |
| **Onboarding: Services** | `http://localhost:3000/onboarding/services` | `POST /api/onboarding/businesses/{id}/services` | ✅ Verified |
| **Onboarding: Staff** | `http://localhost:3000/onboarding/staff` | `POST /api/onboarding/businesses/{id}/staff` | ✅ Verified |
| **Onboarding: Hours** | `http://localhost:3000/onboarding/hours` | `PATCH /api/onboarding/businesses/{id}` | ✅ Verified |
| **Onboarding: AI Receptionist** | `http://localhost:3000/onboarding/ai-receptionist` | `POST /api/onboarding/businesses/{id}/agents` | ✅ Verified |
| **Onboarding: Knowledge** | `http://localhost:3000/onboarding/knowledge` | `POST /api/onboarding/businesses/{id}/knowledge` | ✅ Verified |
| **Onboarding: Integrations** | `http://localhost:3000/onboarding/integrations` | `POST /api/onboarding/businesses/{id}/integrations/{provider}/connect` | ✅ Verified |
| **Dashboard Overview** | `http://localhost:3000/dashboard` | `GET /api/businesses/{id}/dashboard` | ⏳ Pending |

---

## 1. User Login Screen

### 📌 General Info
- **Frontend URL:** `http://localhost:3000/login`
- **Frontend File:** `frontend/user/app/(auth)/login/page.tsx`
- **Backend Route File:** `backend/server/api/routes/auth.py`
- **Method:** `POST`
- **Endpoint:** `/api/auth/login`
- **Authentication:** Public (No token required)
- **Verification Status:** ✅ Verified (1:1 Schema Match)

---

### 🖥️ Frontend Form Fields
- **Email:** `<input type="email">` (Required)
- **Password:** `<input type="password">` (Required)
- **Remember Me:** `<input type="checkbox">` (Client-side token persistence)
- **Secondary Links:** `/forgot-password`, `/register`

---

### 📥 Request Schema

#### Headers
```http
Content-Type: application/json
```

#### Request Body
```json
{
  "email": "doctor@clinic.com",
  "password": "mySecurePassword123"
}
```

#### Field Specifications:
| Field | Type | Required | Description |
|---|---|:---:|---|
| `email` | `string` | Yes | Valid email format (RFC 5322) |
| `password` | `string` | Yes | Plain-text password string |

---

### 📤 Response Schema

#### ✅ Success Response (`200 OK`)
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "user": {
    "id": "e3b0c442-98fc-1c14-9afb-4c7fa4e82931",
    "name": "Dr. John Doe",
    "email": "doctor@clinic.com",
    "scope": "business",
    "role": "owner",
    "business_id": "2137d850-cc11-458e-a37f-48a1531aeaf5"
  }
}
```

#### Response Field Specifications:
| Field | Type | Description |
|---|---|---|
| `access_token` | `string` | JWT token to be used in subsequent requests |
| `token_type` | `string` | Token schema (`"bearer"`) |
| `user.id` | `string (UUID)` | Unique user ID |
| `user.name` | `string` | User display name |
| `user.email` | `string` | Registered email |
| `user.scope` | `string` | `"business"` (for clinic staff/owner) or `"platform"` |
| `user.role` | `string` | `"owner"`, `"admin"`, `"doctor"`, `"receptionist"` |
| `user.business_id` | `string (UUID) | null` | Linked clinic ID (null if onboarding not completed) |

---

### 🔄 Post-Login Routing & Storage Logic

Upon receiving `200 OK`:

1. **Save Token:**
   - Store `access_token` in `localStorage` or secure HttpOnly cookie.
   - Attach to all future API calls as header:
     ```http
     Authorization: Bearer <access_token>
     ```
2. **Conditional Navigation:**
   - **Case A: First-time user / Incomplete onboarding**
     - If `user.business_id === null`:
     - ➔ **Redirect to `/onboarding/business`**
   - **Case B: Onboarded business owner / staff**
     - If `user.business_id !== null`:
     - ➔ **Redirect to `/dashboard`**

---

### ⚠️ Error Responses

| Status Code | Reason | Response Body |
|---|---|---|
| `401 Unauthorized` | Invalid email or incorrect password | `{"detail": "Invalid email or password"}` |
| `403 Forbidden` | Invitee account that hasn't accepted invite link | `{"detail": "This account hasn't accepted its team invite yet. Check your invite link."}` |
| `422 Unprocessable` | Malformed email or missing fields | `{"detail": [{"loc": ["body", "email"], "msg": "value is not a valid email address"}]}` |

---

## 2. User Register Screen

### 📌 General Info
- **Frontend URL:** `http://localhost:3000/register`
- **Frontend File:** `frontend/user/app/(auth)/register/page.tsx`
- **Backend Route File:** `backend/server/api/routes/auth.py`
- **Method:** `POST`
- **Endpoint:** `/api/auth/register`
- **Authentication:** Public (No token required)
- **Verification Status:** ✅ Verified (1:1 Schema Match)

---

### 🖥️ Frontend Form Fields
- **Full Name:** `<input type="text">` (Required)
- **Email:** `<input type="email">` (Required)
- **Password:** `<input type="password">` (Required)
- **Confirm Password:** `<input type="password">` (Client-side validation only)
- **Terms Checkbox:** `I agree to the Terms of Service and Privacy Policy` (HTML `<input type="checkbox" required>`)

---

### 📥 Request Schema

#### Headers
```http
Content-Type: application/json
```

#### Request Body
```json
{
  "name": "Dr. John Doe",
  "email": "doctor@clinic.com",
  "password": "mySecurePassword123"
}
```

#### Field Specifications:
| Field | Type | Required | Description |
|---|---|:---:|---|
| `name` | `string` | Yes | Business owner's full display name |
| `email` | `string` | Yes | Valid business or personal email (unique per user) |
| `password` | `string` | Yes | Plain-text password (hashed with bcrypt on backend) |

---

### 📤 Response Schema

#### ✅ Success Response (`201 Created`)
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "user": {
    "id": "e3b0c442-98fc-1c14-9afb-4c7fa4e82931",
    "name": "Dr. John Doe",
    "email": "doctor@clinic.com",
    "scope": "business",
    "role": "owner",
    "business_id": null
  }
}
```

---

### 🔄 Post-Register Routing & Storage Logic

Upon receiving `201 Created`:

1. **Save Token:**
   - Store `access_token` in `localStorage` or auth cookie.
2. **Immediate Redirect to Onboarding Step 1:**
   - Since a newly registered owner has `business_id === null`:
   - ➔ **Redirect directly to `/onboarding/business`**

---

### ⚠️ Error Responses

| Status Code | Reason | Response Body |
|---|---|---|
| `409 Conflict` | Email address is already registered | `{"detail": "Email already registered"}` |
| `422 Unprocessable` | Invalid email format or missing name/password | `{"detail": [{"loc": ["body", "email"], "msg": "value is not a valid email address"}]}` |

---

## 3. Onboarding: Business Profile Screen

### 📌 General Info
- **Frontend URL:** `http://localhost:3000/onboarding/business`
- **Frontend File:** `frontend/user/app/onboarding/business/page.tsx`
- **Backend Route File:** `backend/server/api/routes/businesses.py`
- **Database Model:** `backend/server/database/models/business.py`
- **Method:** `POST`
- **Endpoint:** `/api/onboarding/businesses`
- **Authentication:** Bearer Token (`Authorization: Bearer <access_token>`)
- **Verification Status:** ✅ Verified (1:1 Schema Match)

---

### 🖥️ Frontend Form Fields & Backend Mapping

| Frontend UI Field | Frontend Key | Backend Payload Key | Type | Required | Notes / Enum Mapping |
|---|---|---|---|:---:|---|
| **Business Name** | `businessName` | `name` | `string` | Yes | Practice display name (e.g. `"Smile Dental Clinic"`) |
| **Business Type** | `type` | `business_type` & `business_subtype` | `string` | Yes | UI options map to backend:<br>• `"Dental Clinic"` ➔ `business_type: "healthcare"`, `business_subtype: "clinic"`<br>• `"Medical Clinic"` ➔ `business_type: "healthcare"`, `business_subtype: "clinic"`<br>• `"Physiotherapy"` ➔ `business_type: "healthcare"`, `business_subtype: "medical_center"` |
| **Vertical** | *(implicit)* | `vertical` | `string` | Yes | Defaults to `"clinic"` (healthcare MVP) |
| **Country** | `country` | `country` | `string` | No | e.g. `"United States"`, `"Canada"`, `"United Kingdom"` |
| **Address** | `address` | `address` | `string` | Yes | Physical clinic street address |
| **City** | `city` | `city` | `string` | No | Clinic city (e.g. `"Austin"`) |
| **Postal Code** | `postalCode` | `postal_code` | `string` | No | Postal code / ZIP (e.g. `"78701"`) |
| **Business Email** | `email` | `business_email` | `string` | Yes | Clinic official contact email |
| **Business Phone** | `phone` | `business_phone` | `string` | Yes | Reception call line |
| **Website** | `website` | `website` | `string` | No | Optional clinic website URL |
| **Timezone** | `timezone` | `timezone` | `string` | Yes | Preferred IANA timezone (e.g. `"America/Chicago"`, `"UTC"`) |
| **Currency** | `currency` | `currency` | `string` | Yes | 3-letter currency code (`"USD"`, `"EUR"`, `"GBP"`, `"INR"`, `"CAD"`, `"AUD"`) |
| **Logo** | `logoFile` | `logo_url` | `string` | No | S3/CDN URL of logo or null |

---

### 📥 Request Schema

#### Headers
```http
Authorization: Bearer <access_token>
Content-Type: application/json
```

#### Request Body
```json
{
  "name": "Smile Dental Clinic",
  "vertical": "clinic",
  "business_type": "healthcare",
  "business_subtype": "clinic",
  "country": "United States",
  "address": "456 Medical Parkway, Suite 100",
  "city": "Austin",
  "postal_code": "78701",
  "business_email": "reception@smiledental.com",
  "business_phone": "+1 (555) 234-5678",
  "website": "https://www.smiledentalclinic.com",
  "timezone": "America/Chicago",
  "currency": "USD",
  "logo_url": null
}
```

---

### 📤 Response Schema

#### ✅ Success Response (`201 Created`)
```json
{
  "id": "7b2e8d91-4c12-42fe-b581-2292fa1c9402",
  "name": "Smile Dental Clinic",
  "vertical": "clinic",
  "business_type": "healthcare",
  "business_subtype": "clinic",
  "country": "United States",
  "address": "456 Medical Parkway, Suite 100",
  "city": "Austin",
  "postal_code": "78701",
  "business_email": "reception@smiledental.com",
  "business_phone": "+1 (555) 234-5678",
  "website": "https://www.smiledentalclinic.com",
  "timezone": "America/Chicago",
  "currency": "USD",
  "logo_url": null,
  "plan": "starter",
  "status": "pending",
  "working_hours": {},
  "created_at": "2026-09-18T13:30:00Z"
}
```

#### Response Field Specifications:
| Field | Type | Description |
|---|---|---|
| `id` | `string (UUID)` | Generated Business ID for this tenant |
| `name` | `string` | Registered practice name |
| `vertical` | `string` | Config-driven vertical (`"clinic"`) |
| `business_type` | `string` | Primary business domain (`"healthcare"`) |
| `business_subtype` | `string \| null` | Subtype (`"clinic"`, `"hospital"`, `"medical_center"`) |
| `currency` | `string` | Tenant currency (`"USD"`) used across all services |
| `plan` | `string` | Initial plan assigned (`"starter"`) |
| `status` | `string` | `"pending"` during onboarding, `"active"` once completed |
| `working_hours` | `object` | Operating schedule (configured in step 5) |
| `created_at` | `string (ISO)` | Creation timestamp |

---

### 🔄 Post-Step Routing & Storage Logic

Upon receiving `201 Created`:

1. **Persist State:**
   - Store `business_id` in `localStorage` / user context (`localStorage.setItem('onboarding_business_id', response.id)`).
   - Store `currency` (`localStorage.setItem('onboarding_currency', response.currency)`).
   - The backend automatically links the logged-in user to this business: `current_user.business_id = business.id`.
2. **Navigate to Step 2:**
   - ➔ **Redirect to `/onboarding/services`**

---

### ⚠️ Error Responses

| Status Code | Reason | Response Body |
|---|---|---|
| `401 Unauthorized` | Missing or expired JWT bearer token | `{"detail": "Not authenticated"}` |
| `422 Unprocessable` | Invalid business_type or subtype not in allowed list | `{"detail": "business_type must be one of ['healthcare']"}` |
| `422 Unprocessable` | Missing required fields (`name`) | `{"detail": [{"loc": ["body", "name"], "msg": "field required"}]}` |

---

## 4. Accept Invite Screen

### 📌 General Info
- **Frontend URL:** `http://localhost:3000/accept-invite`
- **Frontend File:** `frontend/user/app/(auth)/accept-invite/page.tsx`
- **Backend Route File:** `backend/server/api/routes/auth.py`
- **Method:** `POST`
- **Endpoint:** `/api/auth/accept-invite`
- **Authentication:** Public (invite token embedded in URL query param)
- **Verification Status:** ✅ Verified (1:1 Schema Match)

---

### 🖥️ Frontend Form Fields
- **Token:** Hidden field, read from `?token=<invite_token>` URL query param
- **Full Name:** `<input type="text">` (Required, display only — name already set by admin)
- **Password:** `<input type="password">` (Required, sets staff member's login password)

---

### 📥 Request Schema

#### Headers
```http
Content-Type: application/json
```

#### Request Body
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "password": "myNewPassword123"
}
```

#### Field Specifications:
| Field | Type | Required | Description |
|---|---|:---:|---|
| `token` | `string` | Yes | JWT invite token from email link (`?token=` query param) |
| `password` | `string` | Yes | New password the invitee sets for their account |

---

### 📤 Response Schema

#### ✅ Success Response (`200 OK`)
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "user": {
    "id": "a1b2c3d4-...",
    "name": "Dr. Jane Smith",
    "email": "jane@smiledental.com",
    "scope": "business",
    "role": "doctor",
    "business_id": "7b2e8d91-..."
  }
}
```

### 🔄 Post-Accept Routing
- Sets `user.is_active = True`, hashes new password.
- ➔ **Redirect to `/dashboard`** (staff member is already linked to a business).

---

### ⚠️ Error Responses

| Status Code | Reason | Response Body |
|---|---|---|
| `404 Not Found` | Invite token invalid or user deleted | `{"detail": "Invite is no longer valid"}` |
| `409 Conflict` | Invite already accepted previously | `{"detail": "This invite has already been accepted"}` |

---

## 5. Onboarding: Services Screen

### 📌 General Info
- **Frontend URL:** `http://localhost:3000/onboarding/services`
- **Frontend File:** `frontend/user/app/onboarding/services/page.tsx`
- **Backend Route File:** `backend/server/api/routes/services.py`
- **Method:** `POST` (create), `PATCH` (update), `DELETE` (delete)
- **Endpoint:** `/api/onboarding/businesses/{business_id}/services`
- **Authentication:** Bearer Token — Owner or Admin only
- **Verification Status:** ✅ Verified (1:1 Schema Match & Interactive CRUD)

---

### 🖥️ Frontend Form Fields & Backend Mapping

| Frontend UI Field | Frontend Key | Backend Payload Key | Type | Required | Notes |
|---|---|---|---|:---:|---|
| **Service Name** | `title` | `title` | `string` | Yes | e.g. `"Dental Consultation"` |
| **Description** | `description` | `description` | `string` | No | e.g. `"Standard clinic appointment slot"` |
| **Duration** | `duration` (e.g. `30` min) | `duration_minutes` | `integer` | No | Stored directly as integer minutes (15, 30, 45, 60, 90, 120) |
| **Price** | `price` (e.g. `50.0`) | `price_amount` | `float` | No | Numeric value without currency symbol |
| **Currency** | `currency` | `price_currency` | `string` | No | e.g. `"USD"` |

---

### 📥 Request Schema

#### Request Body (POST / PATCH)
```json
{
  "title": "Dental Consultation",
  "description": "Standard clinic appointment slot",
  "duration_minutes": 30,
  "price_amount": 50.0,
  "price_currency": "USD"
}
```

### 📤 Response (`201 Created` / `200 OK`)
```json
{
  "id": "svc-uuid-...",
  "business_id": "7b2e8d91-...",
  "title": "Dental Consultation",
  "description": "Standard clinic appointment slot",
  "duration_minutes": 30,
  "price_amount": 50.0,
  "price_currency": "USD",
  "created_at": "2026-09-18T14:00:00Z"
}
```

### 🔄 Post-Step Flow
- CRUD actions: Inline Edit (`PATCH`), Delete (`DELETE`), Add (`POST`).
- ➔ **Redirect to `/onboarding/staff`**

---

### ⚠️ Error Responses

| Status Code | Reason | Response Body |
|---|---|---|
| `401 Unauthorized` | Missing/expired token | `{"detail": "Not authenticated"}` |
| `403 Forbidden` | Non-owner/admin role | `{"detail": "Owner or admin role required"}` |
| `422 Unprocessable` | Missing `title` | `{"detail": [{"loc": ["body", "title"], "msg": "field required"}]}` |

---

## 6. Onboarding: Staff Screen

### 📌 General Info
- **Frontend URL:** `http://localhost:3000/onboarding/staff`
- **Frontend File:** `frontend/user/app/onboarding/staff/page.tsx`
- **Backend Route File:** `backend/server/api/routes/staff.py`
- **Method:** `POST` (create), `PATCH` (update), `DELETE` (delete)
- **Endpoint:** `/api/onboarding/businesses/{business_id}/staff`
- **Authentication:** Bearer Token — Owner or Admin only
- **Verification Status:** ✅ Verified (1:1 Schema Match & Interactive CRUD)

---

### 🖥️ Frontend Form Fields & Backend Mapping

| Frontend UI Field | Backend Payload Key | Type | Required | Notes |
|---|---|---|---|:---:|---|
| **Name** | `name` | `string` | Yes | Staff member's full name |
| **Role** | `role` | `string` | No | Default: `"Doctor"`. Options: `"Doctor"`, `"Nurse"`, `"Hygienist"`, `"Specialist"`, `"Receptionist"`, `"Physiotherapist"` |
| **Specialty** | `specialty` | `string` | No | e.g. `"Orthodontics"`, `"General Practice"` |
| **Email** | `email` | `string` | No | Staff member's work email |
| **Phone** | `phone` | `string` | No | Staff member's contact number |
| **Assigned Services** | `service_ids` | `list[string]` | No | List of service UUIDs this staff member handles |

---

### 📥 Request Schema

```json
{
  "name": "Dr. Sarah Wilson",
  "role": "Doctor",
  "specialty": "Orthodontics",
  "email": "sarah@smiledental.com",
  "phone": "+1 (555) 000-1111",
  "service_ids": ["svc-uuid-1", "svc-uuid-2"]
}
```

### 📤 Response (`201 Created` / `200 OK`)
```json
{
  "id": "staff-uuid-...",
  "business_id": "7b2e8d91-...",
  "name": "Dr. Sarah Wilson",
  "role": "Doctor",
  "specialty": "Orthodontics",
  "email": "sarah@smiledental.com",
  "phone": "+1 (555) 000-1111",
  "service_ids": ["svc-uuid-1", "svc-uuid-2"],
  "created_at": "2026-09-18T14:00:00Z"
}
```

> ℹ️ `service_ids` are mapped to the many-to-many `staff_services` table and returned in `StaffOut`.

### 🔄 Post-Step Flow
- CRUD actions: Inline Edit (`PATCH`), Delete (`DELETE`), Add (`POST`).
- ➔ **Redirect to `/onboarding/hours`**

---

## 7. Onboarding: Hours Screen

### 📌 General Info
- **Frontend URL:** `http://localhost:3000/onboarding/hours`
- **Frontend File:** `frontend/user/app/onboarding/hours/page.tsx`
- **Backend Route File:** `backend/server/api/routes/businesses.py`
- **Method:** `PATCH`
- **Endpoint:** `/api/onboarding/businesses/{business_id}`
- **Authentication:** Bearer Token — Owner or Admin only
- **Verification Status:** ✅ Verified (1:1 Schema Match & Interactive Holidays)

---

### 🖥️ Frontend Schedule Structure

Frontend state format per day & holidays:
```js
{
  "schedule": [
    { "day": "Monday", "active": true, "ranges": [{"start": "09:00", "end": "13:00"}, {"start": "14:00", "end": "18:00"}] },
    { "day": "Sunday", "active": false, "ranges": [] }
  ],
  "holidays": [
    { "id": "1", "name": "Christmas Day", "date": "2026-12-25" }
  ]
}
```

This maps to the `working_hours` JSON column on the `Business` model.

---

### 📥 Request Schema

```json
{
  "working_hours": {
    "schedule": {
      "Monday":    { "active": true,  "ranges": [{"start": "09:00", "end": "13:00"}, {"start": "14:00", "end": "18:00"}] },
      "Tuesday":   { "active": true,  "ranges": [{"start": "09:00", "end": "13:00"}, {"start": "14:00", "end": "18:00"}] },
      "Wednesday": { "active": true,  "ranges": [{"start": "09:00", "end": "13:00"}, {"start": "14:00", "end": "18:00"}] },
      "Thursday":  { "active": true,  "ranges": [{"start": "09:00", "end": "13:00"}, {"start": "14:00", "end": "18:00"}] },
      "Friday":    { "active": true,  "ranges": [{"start": "09:00", "end": "13:00"}, {"start": "14:00", "end": "17:00"}] },
      "Saturday":  { "active": true,  "ranges": [{"start": "09:00", "end": "13:00"}] },
      "Sunday":    { "active": false, "ranges": [] }
    },
    "holidays": [
      { "id": "1", "name": "Christmas Day", "date": "2026-12-25" },
      { "id": "2", "name": "New Year's Day", "date": "2027-01-01" }
    ]
  }
}
```

### 📤 Response (`200 OK`) — Full `BusinessOut` object with updated `working_hours`.

### 🔄 Post-Step Flow
- ➔ **Redirect to `/onboarding/ai-receptionist`**

---

## 8. Onboarding: AI Receptionist Screen

### 📌 General Info
- **Frontend URL:** `http://localhost:3000/onboarding/ai-receptionist`
- **Frontend File:** `frontend/user/app/onboarding/ai-receptionist/page.tsx`
- **Backend Route File:** `backend/server/api/routes/agents.py`
- **Method:** `POST`
- **Endpoint:** `/api/onboarding/businesses/{business_id}/agents`
- **Authentication:** Bearer Token — Owner or Admin only
- **Verification Status:** ✅ Verified (1:1 Schema Match)

---

### 🖥️ Frontend State & Backend Mapping

| Frontend State | Backend Payload Key | Type | Required | Notes |
|---|---|---|:---:|---|
| `aiName` | `name` | `string` | Yes | Receptionist display name (e.g. `"Sarah"`) |
| `greeting` | `greeting_message` | `string` | Yes | Opening call greeting |
| `selectedVoice` | `voice_model` | `string` | No | Voice ID: `"rachel"`, `"drew"`, `"matilda"` |
| *(implicit)* | `voice_provider` | `string` | No | Default: `"elevenlabs"` |
| `selectedLangs` (ids) | `languages` | `list[string]` | No | e.g. `["en", "nl"]` |
| `selectedPersonality` | `config.personality` | `string` | No | `"professional"`, `"friendly"`, `"warm"`, `"concise"` |
| `caps` (enabled map) | `config.capabilities` | `dict[string, bool]` | No | e.g. `{"faq": true, "book": true, "transfer": true}` |
| `transferPhone` | `config.transfer_phone` | `string` | No | e.g. `"+1 (555) 019-2834"` |
| `escalation` | `config.escalation` | `string` | No | e.g. `"When patient asks for a human"` |

---

### 📥 Request Schema

```json
{
  "name": "Sarah",
  "greeting_message": "Hi, welcome to Smile Dental Clinic. How can I help you today?",
  "voice_provider": "elevenlabs",
  "voice_model": "rachel",
  "languages": ["en", "nl"],
  "config": {
    "personality": "professional",
    "transfer_phone": "+1 (555) 019-2834",
    "escalation": "When patient asks for a human",
    "capabilities": {
      "faq": true,
      "book": true,
      "reschedule": true,
      "cancel": true,
      "details": true,
      "services": true,
      "hours": true,
      "transfer": true
    }
  }
}
```

### 📤 Response (`201 Created`)
```json
{
  "id": "agent-uuid-...",
  "business_id": "7b2e8d91-...",
  "name": "Sarah",
  "status": "inactive",
  "voice_provider": "elevenlabs",
  "voice_model": "rachel",
  "languages": ["en", "nl"],
  "greeting_message": "Hi, welcome to Smile Dental Clinic. How can I help you today?",
  "config": { "personality": "professional", "capabilities": { "faq": true } },
  "created_at": "2026-09-18T14:00:00Z"
}
```

### 🔄 Post-Step Flow
- ➔ **Redirect to `/onboarding/knowledge`**

---

## 9. Onboarding: Knowledge Screen

### 📌 General Info
- **Frontend URL:** `http://localhost:3000/onboarding/knowledge`
- **Frontend File:** `frontend/user/app/onboarding/knowledge/page.tsx`
- **Backend Route File:** `backend/server/api/routes/knowledge.py`
- **Method:** `POST`
- **Endpoint:** `/api/onboarding/businesses/{business_id}/knowledge`
- **Authentication:** Bearer Token — Owner or Admin only
- **Verification Status:** ✅ Verified

---

### 🖥️ Three Knowledge Entry Types

All three sections post to the same endpoint but with a different `doc_type`:

#### Type 1: Uploaded Document
```json
{ "doc_type": "document", "filename": "clinic_policy.pdf" }
```
- `filename` is **required** when `doc_type == "document"`
- Status auto-set to `"pending"` (to be indexed async)

#### Type 2: Website URL
```json
{ "doc_type": "website", "source_url": "https://www.smiledental.com/services" }
```
- `source_url` is **required** when `doc_type == "website"`

#### Type 3: Manual FAQ
```json
{
  "doc_type": "faq",
  "question": "Do you accept walk-ins?",
  "answer": "Yes, we accept walk-ins during business hours."
}
```
- Both `question` and `answer` are **required** when `doc_type == "faq"`
- Status auto-set to `"indexed"` immediately (no async processing needed)

---

### 📤 Response (`201 Created`)
```json
{
  "id": "know-uuid-...",
  "business_id": "7b2e8d91-...",
  "doc_type": "faq",
  "status": "indexed",
  "filename": null,
  "source_url": null,
  "question": "Do you accept walk-ins?",
  "answer": "Yes, we accept walk-ins during business hours.",
  "uploaded_at": "2026-09-18T14:00:00Z"
}
```

### ⚠️ Error Responses

| Status Code | Reason |
|---|---|
| `422` | `doc_type` not in `{"document", "website", "faq"}` |
| `422` | `filename` missing for `doc_type=document` |
| `422` | `source_url` missing for `doc_type=website` |
| `422` | `question` or `answer` missing for `doc_type=faq` |

### 🔄 Post-Step Flow
- ➔ **Redirect to `/onboarding/integrations`**

---

## 10. Onboarding: Integrations Screen

### 📌 General Info
- **Frontend URL:** `http://localhost:3000/onboarding/integrations`
- **Frontend File:** `frontend/user/app/onboarding/integrations/page.tsx`
- **Backend Route File:** `backend/server/api/routes/integrations.py`
- **Method:** `POST`
- **Endpoint:** `/api/onboarding/businesses/{business_id}/integrations/{provider}/connect`
- **Authentication:** Bearer Token — Owner or Admin only
- **Verification Status:** ✅ Verified

---

### 🖥️ Supported Providers

| Provider Card in UI | `provider` Value | Notes |
|---|---|---|
| Google Calendar | `google_calendar` | OAuth config passed in `config` |
| Outlook Calendar | `outlook` | OAuth config |
| Google Meet | `google_meet` | Video link integration |
| Twilio | `twilio` | Voice gateway |
| WhatsApp | `whatsapp` | Messaging channel |
| Stripe | `stripe` | Payment processing |

---

### 📥 Request Schema

**URL:** `POST /api/onboarding/businesses/{business_id}/integrations/google_calendar/connect`

```json
{
  "provider": "google_calendar",
  "config": {
    "access_token": "ya29.xxx",
    "refresh_token": "1//xxx",
    "calendar_id": "primary"
  }
}
```

> ⚠️ `provider` in request body **must match** `provider` in URL path — backend validates this.

### 📤 Response (`200 OK`)
```json
{
  "id": "int-uuid-...",
  "business_id": "7b2e8d91-...",
  "provider": "google_calendar",
  "status": "connected",
  "config": { "calendar_id": "primary" },
  "connected_at": "2026-09-18T14:00:00Z"
}
```

### 📌 Also Available
- `GET /api/onboarding/businesses/{business_id}/integrations` — list all connected integrations
- `POST /api/onboarding/businesses/{business_id}/integrations/{provider}/disconnect` — disconnect a provider

### 🔄 Post-Step Flow
- ➔ **Redirect to `/onboarding/review`** → `/onboarding/plans` → `/onboarding/checkout` → `/onboarding/success`

---

## 11. Onboarding: Plans Selection Screen

### 📌 General Info
- **Frontend URL:** `http://localhost:3000/onboarding/plans`
- **Frontend File:** `frontend/user/app/onboarding/plans/page.tsx`
- **Method:** Client-Side Selection & Query Param Pass
- **Verification Status:** ✅ Verified

---

### 🖥️ Plan Tier Mapping

| Plan Name | ID | Monthly Price | Annual Price (16% Off) | Included Voice Minutes |
|---|---|---|---|---|
| **Starter Practice** | `starter` | $99/mo | $990/yr | 500 Minutes |
| **Professional Clinic** | `professional` | $199/mo | $1990/yr | 2,000 Minutes |
| **Multi-Location / Hospital** | `business` | $399/mo | $3990/yr | 6,000 Minutes |

---

## 12. Onboarding: Order Checkout & Activation Screen

### 📌 General Info
- **Frontend URL:** `http://localhost:3000/onboarding/checkout`
- **Frontend File:** `frontend/user/app/onboarding/checkout/page.tsx`
- **Backend Route File:** `backend/server/api/routes/businesses.py`
- **Method:** `PATCH`
- **Endpoint:** `/api/onboarding/businesses/{business_id}`
- **Authentication:** Bearer Token — Owner or Admin only
- **Verification Status:** ✅ Verified (1:1 Schema Match)

---

### 🖥️ Line Items & Payment Breakdown

| Line Item | Description | Cost |
|---|---|---|
| **Subscription Plan** | Starter ($99) / Professional ($199) / Business ($399) | Subtotal |
| **Dedicated AI Phone Line** | Twilio Carrier VoIP Trunk (+1 555-019-2834) | **FREE ($0.00)** |
| **Voice AI Model Setup** | Clinic knowledge base indexing & training | **FREE ($0.00)** |

---

### 📥 Request Schema

```json
{
  "plan": "professional",
  "status": "active"
}
```

### 📤 Response (`200 OK`)
Full `BusinessOut` object with updated `plan: "professional"` and `status: "active"`.

### 🔄 Post-Step Flow
- ➔ **Redirect to `/onboarding/success`** → `/dashboard`

---

