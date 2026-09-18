# AMSh User Portal — API Verification Spec

Documenting verified APIs mapped directly against `frontend/user` screens, ensuring 100% parameter accuracy between frontend forms and backend schemas.

---

## 📊 Verification Checklist

| Screen / Flow | Frontend Path | API Method & Endpoint | Status |
|---|---|---|:---:|
| **User Login** | `http://localhost:3000/login` | `POST /api/auth/login` | ✅ Verified |
| **User Register** | `http://localhost:3000/register` | `POST /api/auth/register` | ✅ Verified |
| **Accept Invite** | `http://localhost:3000/accept-invite` | `POST /api/auth/accept-invite` | ⏳ Pending |
| **Onboarding: Business** | `http://localhost:3000/onboarding/business` | `POST /api/onboarding/businesses` | ⏳ Pending |
| **Onboarding: Services** | `http://localhost:3000/onboarding/services` | `POST /api/onboarding/businesses/{id}/services` | ⏳ Pending |
| **Onboarding: Staff** | `http://localhost:3000/onboarding/staff` | `POST /api/onboarding/businesses/{id}/staff` | ⏳ Pending |
| **Onboarding: Hours** | `http://localhost:3000/onboarding/hours` | `PATCH /api/onboarding/businesses/{id}` | ⏳ Pending |
| **Onboarding: AI Receptionist** | `http://localhost:3000/onboarding/ai-receptionist` | `POST /api/onboarding/businesses/{id}/agents` | ⏳ Pending |
| **Onboarding: Knowledge** | `http://localhost:3000/onboarding/knowledge` | `POST /api/onboarding/businesses/{id}/knowledge` | ⏳ Pending |
| **Onboarding: Integrations** | `http://localhost:3000/onboarding/integrations` | `POST /api/onboarding/businesses/{id}/integrations/{provider}/connect` | ⏳ Pending |
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
| `user.business_id` | `string (UUID) \| null` | Linked clinic ID (null if onboarding not completed) |

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

