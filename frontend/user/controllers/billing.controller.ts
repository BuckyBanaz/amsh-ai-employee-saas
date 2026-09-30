import { API_ENDPOINTS } from '../utils/api_endpoints';
import { ApiService } from '../services/api.service';

export interface BillingConfig {
  key_id: string;
  currency: string;
  enabled: boolean;
}

export interface CreateOrderPayload {
  amount: number;
  currency: string;
  plan_id: string;
  cycle: string;
  business_id: string | null;
}

export interface CreateOrderResponse {
  success: boolean;
  order_id: string;
  amount: number;
  currency: string;
  key_id: string;
  test_mode?: boolean;
}

export interface VerifyPaymentPayload {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  plan_id: string;
  business_id: string | null;
}

export interface VerifyPaymentResponse {
  success: boolean;
  message: string;
  payment_id: string;
  plan_id: string;
  status: string;
}

export interface PlanItem {
  key: string;
  name: string;
  description: string;
  price_monthly: number | null;
  price_yearly: number | null;
  currency: string;
  highlighted?: boolean;
  quotas?: Record<string, number | null>;
  overage?: Record<string, number>;
  features?: { key: string; label: string }[];
}

export interface InvoiceItem {
  id: string;
  number: string;
  date: string;
  period: string;
  description: string;
  amount: string;
  amount_raw: number;
  currency: string;
  status: string;
  payment_method: string;
  receipt_url?: string;
}

export const BillingController = {
  getPlans: async (): Promise<{ items: PlanItem[] }> => {
    try {
      return await ApiService.get<{ items: PlanItem[] }>(
        API_ENDPOINTS.PLANS.LIST,
        { requireAuth: false }
      );
    } catch (error) {
      console.warn('Failed to load plans from backend catalog:', error);
      return { items: [] };
    }
  },

  getConfig: async (): Promise<BillingConfig> => {
    try {
      return await ApiService.get<BillingConfig>(
        API_ENDPOINTS.BILLING.CONFIG,
        { requireAuth: false }
      );
    } catch (error) {
      console.error('Failed to load billing config:', error);
      throw error;
    }
  },

  createOrder: async (payload: CreateOrderPayload): Promise<CreateOrderResponse> => {
    try {
      return await ApiService.post<CreateOrderResponse>(
        API_ENDPOINTS.BILLING.CREATE_ORDER,
        payload,
        { requireAuth: false }
      );
    } catch (error) {
      console.error('Failed to create billing order:', error);
      throw error;
    }
  },

  verifyPayment: async (payload: VerifyPaymentPayload): Promise<VerifyPaymentResponse> => {
    try {
      return await ApiService.post<VerifyPaymentResponse>(
        API_ENDPOINTS.BILLING.VERIFY,
        payload,
        { requireAuth: false }
      );
    } catch (error) {
      console.error('Failed to verify payment:', error);
      throw error;
    }
  },

  getBusinessBilling: async (businessId: string): Promise<any> => {
    try {
      return await ApiService.get<any>(
        API_ENDPOINTS.BILLING.GET_BUSINESS_BILLING(businessId),
        { requireAuth: true }
      );
    } catch (error) {
      console.error(`Failed to get billing for business ${businessId}:`, error);
      throw error;
    }
  },

  getInvoices: async (businessId: string): Promise<{ total_invoices: number; invoices: InvoiceItem[] }> => {
    try {
      return await ApiService.get<{ total_invoices: number; invoices: InvoiceItem[] }>(
        API_ENDPOINTS.BILLING.GET_INVOICES(businessId),
        { requireAuth: true }
      );
    } catch (error) {
      console.warn(`Failed to get invoices for business ${businessId}:`, error);
      return { total_invoices: 0, invoices: [] };
    }
  },

  changePlan: async (businessId: string, planId: string, cycle: string = 'monthly'): Promise<any> => {
    try {
      return await ApiService.post<any>(
        API_ENDPOINTS.BILLING.CHANGE_PLAN(businessId),
        { plan_id: planId, cycle },
        { requireAuth: true }
      );
    } catch (error) {
      console.error(`Failed to change plan for business ${businessId}:`, error);
      throw error;
    }
  },

  startTrial: async (businessId: string, planId: string = 'starter'): Promise<any> => {
    try {
      return await ApiService.post<any>(
        API_ENDPOINTS.BILLING.START_TRIAL(businessId),
        { plan_id: planId },
        { requireAuth: true }
      );
    } catch (error) {
      console.error(`Failed to start free trial for business ${businessId}:`, error);
      throw error;
    }
  }
};
