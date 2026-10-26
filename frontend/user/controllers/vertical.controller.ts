import { ApiService } from '../services/api.service';
import { StorageService } from '../services/storage.service';
import { API_ENDPOINTS } from '../utils/api_endpoints';
import type {
  Department, Enquiry, EnquiryStatus, ReadinessProblem, Resource, TransferAttempt, VerticalConfig, VerticalSummary,
} from '../verticals/types';

function businessId(): string {
  const id = StorageService.getBusinessId();
  if (!id) throw new Error('No business selected');
  return id;
}

// Every call reads or writes the server; the browser keeps no copy of the tenant's configuration.
export const VerticalController = {
  catalog: () => ApiService.get<{ items: VerticalSummary[] }>(API_ENDPOINTS.VERTICALS.CATALOG).then((r) => r.items),
  config: (id: string = businessId()) => ApiService.get<VerticalConfig>(API_ENDPOINTS.VERTICALS.CONFIG(id)),
  setSubtype: (subtype: string, vertical?: string, id: string = businessId()) =>
    ApiService.request<VerticalConfig>(API_ENDPOINTS.VERTICALS.CONFIG(id), { method: 'PUT', body: JSON.stringify({ subtype, vertical }) }),
  validate: (id: string = businessId()) =>
    ApiService.post<{ ready: boolean; problems: ReadinessProblem[] }>(API_ENDPOINTS.VERTICALS.VALIDATE(id), {}),
  activate: (id: string = businessId()) => ApiService.post<VerticalConfig & { problems: ReadinessProblem[] }>(API_ENDPOINTS.VERTICALS.ACTIVATE(id), {}),

  departments: () => ApiService.get<{ items: Department[] }>(API_ENDPOINTS.VERTICALS.DEPARTMENTS(businessId())).then((r) => r.items),
  createDepartment: (body: Partial<Department>) => ApiService.post<Department>(API_ENDPOINTS.VERTICALS.DEPARTMENTS(businessId()), body),
  updateDepartment: (id: string, body: Partial<Department>) => ApiService.patch<Department>(API_ENDPOINTS.VERTICALS.DEPARTMENT(businessId(), id), body),
  deleteDepartment: (id: string) => ApiService.delete<void>(API_ENDPOINTS.VERTICALS.DEPARTMENT(businessId(), id)),
  departmentsFromTemplate: () =>
    ApiService.post<{ created: Department[] }>(API_ENDPOINTS.VERTICALS.DEPARTMENTS_FROM_TEMPLATE(businessId()), {}).then((r) => r.created),

  enquiries: (status?: EnquiryStatus) =>
    ApiService.get<{ items: Enquiry[]; counts: Record<EnquiryStatus, number> }>(
      API_ENDPOINTS.VERTICALS.ENQUIRIES(businessId()) + (status ? `?status_filter=${status}` : ''),
    ),
  updateEnquiry: (id: string, body: { status?: EnquiryStatus; notes?: string }) =>
    ApiService.patch<Enquiry>(API_ENDPOINTS.VERTICALS.ENQUIRY(businessId(), id), body),

  transfers: () => ApiService.get<{ items: TransferAttempt[]; by_status: Record<string, number> }>(API_ENDPOINTS.VERTICALS.TRANSFERS(businessId())),

  resources: () => ApiService.get<{ items: Resource[] }>(API_ENDPOINTS.VERTICALS.RESOURCES(businessId())).then((r) => r.items),
  createResource: (body: Partial<Resource>) => ApiService.post<Resource>(API_ENDPOINTS.VERTICALS.RESOURCES(businessId()), body),
  updateResource: (id: string, body: Partial<Resource>) => ApiService.patch<Resource>(API_ENDPOINTS.VERTICALS.RESOURCE(businessId(), id), body),
  deleteResource: (id: string) => ApiService.delete<void>(API_ENDPOINTS.VERTICALS.RESOURCE(businessId(), id)),
};
