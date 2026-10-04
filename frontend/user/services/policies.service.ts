import { ApiService } from './api.service';
import { BASE_URL } from '../utils/api_endpoints';

export interface PolicyItem {
  policy_id: string;
  version_id: string;
  key: string;
  title: string;
  version: number;
  summary: string;
  body: string;
  requires_acceptance: boolean;
  accepted: boolean;
  accepted_at: string | null;
}

export interface AiPolicySummary {
  region: string;
  framework: string;
  emergency: string;
  privacy_instruction: boolean;
  custom_privacy_instruction: boolean;
  recording_on: boolean;
  recording_notice: string;
}

export interface PolicyStatus {
  items: PolicyItem[];
  pending: number;
  ai: AiPolicySummary;
}

const base = (businessId: string) => `${BASE_URL}/businesses/${encodeURIComponent(businessId)}/policies`;

export const PoliciesService = {
  /** What applies to this business, whether the signed-in person accepted it, and what the AI does for its region. */
  getStatus: (businessId: string) => ApiService.get<PolicyStatus>(base(businessId)),
  accept: (businessId: string, versionIds: string[]) => ApiService.post<PolicyStatus & { accepted: number }>(`${base(businessId)}/accept`, { version_ids: versionIds }),
};
