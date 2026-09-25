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

export const BillingController = {
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
  }
};
