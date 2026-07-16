import { Platform } from 'react-native';
import { storage } from './storage';

// Base URL configuration resolving dynamically based on platform
const getBaseUrl = (): string => {
  if (Platform.OS === 'android') {
    // Android emulator routes 10.0.2.2 to the host machine's localhost
    return 'http://10.0.2.2:8080/api/v1';
  }
  return 'http://localhost:8080/api/v1';
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
      // Auto-logout if unauthorized (401)
      if (response.status === 401) {
        await storage.removeItem('auth_token');
      }
      return {
        status: 'error',
        message: json.message || `HTTP error ${response.status}`,
        errors: json.errors,
      };
    }

    return json;
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
    async verify2FALogin(payload: { email: string; otp_code: string }) {
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
    async verify2FAActivation(payload: { otp_code: string }) {
      return request('/auth/2fa/verify', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    async disable2FA(payload: { otp_code: string }) {
      return request('/auth/2fa/disable', {
        method: 'POST',
        body: JSON.stringify(payload),
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
    async initiateTransfer(payload: { destination_user_id: string; asset_symbol: string; amount: number; notes?: string }) {
      return request('/transfer', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    async initiateWithdraw(payload: {
      bank_code: string;
      account_number: string;
      amount: number;
      notes?: string;
    }) {
      return request('/fiat/withdraw', {
        method: 'POST',
        body: JSON.stringify(payload),
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
      return request(`/crypto/address?asset=${asset}`, {
        method: 'GET',
      });
    },
    async withdrawCrypto(payload: {
      asset: string;
      recipient_address: string;
      amount: number;
    }) {
      return request('/crypto/withdraw', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
  },
};
