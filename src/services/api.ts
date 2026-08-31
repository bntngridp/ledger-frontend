import { Platform } from 'react-native';
import { storage } from './storage';

// Base URL configuration resolving dynamically based on platform
const getBaseUrl = (): string => {
  if (Platform.OS === 'android') {
    // Android emulator routes 10.0.2.2 to the host machine's localhost
    return 'http://10.0.2.2:7070/api/v1';
  }
  return 'http://localhost:7070/api/v1';
};

export const API_BASE_URL = getBaseUrl();

export interface ApiResponse<T = any> {
  status: 'success' | 'error';
  message: string;
  data?: T;
  errors?: Array<{ field: string; message: string }>;
}

async function request<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = await storage.getItem('auth_token');

  const headers = new Headers(options.headers || {});
  headers.set('Accept', 'application/json');
  if (!(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const config: RequestInit = {
    ...options,
    headers,
  };

  try {
    const response = await fetch(url, config);
    let json: ApiResponse<T>;
    try {
      json = await response.json();
    } catch {
      json = {
        status: 'error',
        message: `HTTP error ${response.status}: Failed to parse response`,
      };
    }

    if (!response.ok) {
      // Auto-logout if unauthorized (401) except for 2FA verification endpoints
      if (response.status === 401 && !endpoint.includes('/2fa/verify') && !endpoint.includes('/2fa/disable')) {
        await storage.removeItem('auth_token');
      }
      return {
        status: 'error',
        message: json.message || `HTTP error ${response.status}`,
        errors: json.errors,
      };
    }

    // Normalize: backend returns integer HTTP status codes in JSON body
    // (e.g. { status: 200, ... } or { status: 201, ... }) but our ApiResponse
    // interface uses the string literals 'success' | 'error'. We override here
    // so all callers can safely check `response.status === 'success'`.
    return {
      status: 'success',
      message: json.message,
      data: json.data,
      errors: json.errors,
    } as ApiResponse<T>;
  } catch (err: any) {
    console.error('API request network error:', err);
    return {
      status: 'error',
      message: err.message || 'Network connection failed. Please check if your backend server is running.',
    };
  }
}

export const api = {
  auth: {
    async login(payload: any) {
      return request('/auth/login', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    async register(payload: any) {
      return request('/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    async verify2FALogin(payload: { pre_auth_token: string; code: string }) {
      return request('/auth/2fa/login', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    async enable2FA() {
      return request('/auth/2fa/enable', {
        method: 'POST',
      });
    },
    async verify2FAActivation(payload: { code: string }) {
      return request('/auth/2fa/verify', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    async disable2FA(payload: { code?: string; recovery_code?: string }) {
      return request('/auth/2fa/disable', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    async send2FAEmailOTP() {
      return request('/auth/2fa/email-otp/send', {
        method: 'POST',
      });
    },
    async sendPaymentEmailOtp() {
      return request('/auth/payment/email-otp/send', {
        method: 'POST',
      });
    },
    async get2FARecoveryCodes() {
      return request('/auth/2fa/recovery-codes', {
        method: 'GET',
      });
    },
    async regenerate2FARecoveryCodes() {
      return request('/auth/2fa/recovery-codes/regenerate', {
        method: 'POST',
      });
    },
    async sendChangePasswordEmailOTP() {
      return request('/auth/password/email-otp/send', {
        method: 'POST',
      });
    },
    async changePassword(payload: {
      old_password: string;
      new_password: string;
      email_otp: string;
      two_factor_code?: string;
    }) {
      return request('/auth/password/change', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    async verifyPin(pin: string) {
      return request('/auth/pin/verify', {
        method: 'POST',
        body: JSON.stringify({ pin }),
      });
    },
    async setupPin(pin: string) {
      return request('/auth/pin/setup', {
        method: 'POST',
        body: JSON.stringify({ pin }),
      });
    },
    async getBiometricChallenge() {
      return request('/auth/biometric/challenge', {
        method: 'GET',
      });
    },
    async registerBiometric(payload: {
      credential_id: string;
      public_key_base64: string;
      client_data_json: string;
      authenticator_data: string;
    }) {
      return request('/auth/biometric/register', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    async verifyBiometric(payload: {
      credential_id: string;
      client_data_json: string;
      authenticator_data: string;
      signature: string;
      challenge: string;
    }) {
      return request('/auth/biometric/verify', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    async disableBiometric() {
      return request('/auth/biometric', {
        method: 'DELETE',
      });
    },
    async getMe() {
      return request('/auth/me', {
        method: 'GET',
      });
    },
  },

  wallet: {
    async getDashboard() {
      return request('/wallet/dashboard', {
        method: 'GET',
      });
    },
    async getTransactions(params: {
      type?: string;
      asset?: string;
      page?: number;
      per_page?: number;
    } = {}) {
      const queryParams = new URLSearchParams();
      if (params.type) queryParams.append('type', params.type);
      if (params.asset) queryParams.append('asset', params.asset);
      if (params.page) queryParams.append('page', String(params.page));
      if (params.per_page) queryParams.append('per_page', String(params.per_page));

      const queryString = queryParams.toString();
      const endpoint = `/transactions${queryString ? `?${queryString}` : ''}`;
      return request(endpoint, {
        method: 'GET',
      });
    },
    async initiateTopUp(payload: { amount: number; notes?: string }) {
      return request('/topup', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    async checkTopUpStatus(payload: { transaction_id: string }) {
      return request('/topup/status', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    async simulateTopUpSettlement(payload: { transaction_id: string }) {
      return request('/topup/simulate-settlement', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    async initiateTransfer(payload: {
      destination_user_id: string;
      asset_symbol: string;
      amount: number;
      notes?: string;
      two_factor_code?: string;
      email_otp?: string;
    }) {
      const headers: Record<string, string> = {};
      if (payload.two_factor_code) headers['X-2FA-Code'] = payload.two_factor_code;
      if (payload.email_otp) headers['X-Email-OTP'] = payload.email_otp;
      return request('/transfer', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
    },
    async initiateWithdraw(payload: {
      bank_code: string;
      account_number: string;
      account_name?: string;
      amount: number;
      notes?: string;
      two_factor_code?: string;
      email_otp?: string;
    }) {
      const headers: Record<string, string> = {};
      if (payload.two_factor_code) headers['X-2FA-Code'] = payload.two_factor_code;
      if (payload.email_otp) headers['X-Email-OTP'] = payload.email_otp;
      return request('/fiat/withdraw', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          bank_code: payload.bank_code,
          account_number: payload.account_number,
          account_name: payload.account_name || 'Account Holder',
          amount: payload.amount,
          notes: payload.notes || 'Withdrawal',
          two_factor_code: payload.two_factor_code,
          email_otp: payload.email_otp,
        }),
      });
    },
    async getExchangeRate(fromAsset: string, toAsset: string) {
      return request(`/exchange/rate?from=${fromAsset}&to=${toAsset}`, {
        method: 'GET',
      });
    },
    async swap(payload: { from_asset: string; to_asset: string; amount: number }) {
      return request('/exchange/swap', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    async getCryptoAddress(asset: string) {
      return request(`/crypto/address?asset_symbol=${asset}&network=polygon_amoy`, {
        method: 'GET',
      });
    },
    async withdrawCrypto(payload: {
      asset_symbol: string;
      network?: string;
      to_address: string;
      amount: number;
      notes?: string;
      two_factor_code?: string;
      email_otp?: string;
    }) {
      const headers: Record<string, string> = {};
      if (payload.two_factor_code) headers['X-2FA-Code'] = payload.two_factor_code;
      if (payload.email_otp) headers['X-Email-OTP'] = payload.email_otp;
      return request('/crypto/withdraw', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          asset_symbol: payload.asset_symbol,
          network: payload.network || 'polygon_amoy',
          to_address: payload.to_address,
          amount: payload.amount,
          notes: payload.notes || 'Crypto Withdrawal',
          two_factor_code: payload.two_factor_code,
          email_otp: payload.email_otp,
        }),
      });
    },
    async simulateCryptoDeposit(payload: {
      asset_symbol: string;
      amount: number;
      tx_hash?: string;
      notes?: string;
    }) {
      return request('/crypto/simulate-deposit', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
  },

  notifications: {
    async getNotifications(params: { page?: number; per_page?: number } = {}) {
      const q = new URLSearchParams();
      if (params.page) q.append('page', String(params.page));
      if (params.per_page) q.append('per_page', String(params.per_page));
      const qs = q.toString();
      return request(`/notifications${qs ? `?${qs}` : ''}`, { method: 'GET' });
    },
    async getUnreadCount() {
      return request('/notifications/unread-count', { method: 'GET' });
    },
    async markAsRead(notificationId: string) {
      return request(`/notifications/${notificationId}/read`, { method: 'PATCH' });
    },
    async markAllAsRead() {
      return request('/notifications/read-all', { method: 'PATCH' });
    },
    async deleteNotification(notificationId: string) {
      return request(`/notifications/${notificationId}`, { method: 'DELETE' });
    },
    async deleteAllNotifications() {
      return request('/notifications/all', { method: 'DELETE' });
    },
    async deleteBulkNotifications(notificationIds: string[]) {
      return request('/notifications/bulk-delete', {
        method: 'POST',
        body: JSON.stringify({ notification_ids: notificationIds }),
      });
    },
  },
};
