// Typed mirror of the backend vertical definitions (backend/ai/workflows/schema.py) as served by /api/verticals and
// /api/businesses/{id}/vertical-config. The server is the source of truth; nothing here is hardcoded per vertical.

export type VerticalKey = 'clinic' | 'education' | 'salon' | 'wellness';

export interface Terminology {
  customer: string;
  customers: string;
  staff: string;
  staff_plural: string;
  offering: string;
  offerings: string;
  booking: string;
  bookings: string;
}

export interface OnboardingStep {
  key: string;
  title: string;
  required: boolean;
}

export interface NavItem {
  key: string;
  label: string;
  route: string;
}

export interface DepartmentTemplate {
  key: string;
  name: string;
  intents: string[];
  match: Record<string, string>;
  may_answer: boolean;
  required_slots: string[];
  priority: number;
  default_fallback: string | null;
}

export interface SubtypeSummary {
  key: string;
  name: string;
  workflows: string[];
  departments: string[];
  resources: string[];
  differences: string[];
  terminology: Terminology | null;
}

export interface VerticalSummary {
  key: VerticalKey | string;
  name: string;
  status: 'live' | 'beta' | 'designed';
  version: string;
  description: string;
  terminology: Terminology;
  onboarding: OnboardingStep[];
  dashboard: NavItem[];
  resources: { key: string; name: string; capacity_limited: boolean }[];
  departments: DepartmentTemplate[];
  subtypes: SubtypeSummary[];
}

export interface VerticalConfig {
  vertical: string;
  vertical_name?: string;
  subtype: string | null;
  subtype_name?: string | null;
  supported: boolean;
  status?: 'draft' | 'active';
  settings: Record<string, unknown>;
  terminology: Terminology | null;
  dashboard: NavItem[];
  onboarding: OnboardingStep[];
  resources?: { key: string; name: string; capacity_limited: boolean }[];
  workflows: { id: string; title: string; status: string; version: string }[];
  tools?: string[];
  suggested_departments?: string[];
}

export interface ReadinessProblem {
  level: 'error' | 'warning';
  code: string;
  message: string;
}

export interface Department {
  id: string;
  key: string;
  name: string;
  intents: string[];
  match: Record<string, string>;
  transfer_phone: string | null;
  hours: Record<string, unknown> | null;
  priority: number;
  fallback_key: string | null;
  timeout_seconds: number;
  may_answer: boolean;
  required_slots: string[];
  active: boolean;
}

export type EnquiryStatus = 'new' | 'contacted' | 'closed';

export interface Enquiry {
  id: string;
  kind: 'enquiry' | 'admission' | 'callback' | 'demo_request' | 'support';
  source: 'ai' | 'staff';
  status: EnquiryStatus;
  topic: string | null;
  subject: string | null;
  contact_name: string;
  contact_phone: string;
  contact_email: string | null;
  details: Record<string, string>;
  department_key: string | null;
  call_id: string | null;
  notes: string | null;
  follow_up_due_at: string | null;
  created_at: string | null;
}

export interface TransferAttempt {
  id: string;
  call_id: string | null;
  department_key: string;
  requested_key: string | null;
  destination_tail: string | null;
  reason: string | null;
  status: string;
  outcome_detail: string | null;
  enquiry_id: string | null;
  created_at: string | null;
  finished_at: string | null;
}

export interface Resource {
  id: string;
  name: string;
  kind: string;
  capacity: number;
  active: boolean;
}

// What a clinic always showed: used only while the config loads, so the clinic UI never flashes other labels.
export const CLINIC_TERMS: Terminology = {
  customer: 'Patient', customers: 'Patients', staff: 'Doctor', staff_plural: 'Doctors',
  offering: 'Treatment', offerings: 'Treatments', booking: 'Appointment', bookings: 'Appointments',
};
