const API_BASE_URL = 'http://localhost:5000/api';

export const getAuthToken = (): string | null => {
  return localStorage.getItem('payverse_token');
};

export const setAuthToken = (token: string): void => {
  localStorage.setItem('payverse_token', token);
};

export const removeAuthToken = (): void => {
  localStorage.removeItem('payverse_token');
};

const getHeaders = (includeAuth = true): Record<string, string> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (includeAuth) {
    const token = getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }
  return headers;
};

const handleResponse = async (response: Response) => {
  const data = await response.json().catch(() => ({ success: false, message: 'Invalid response from server' }));
  if (
    response.status === 401 ||
    (data && !data.success && typeof data.message === 'string' && (
      data.message.includes('token') ||
      data.message.includes('Access denied') ||
      data.message.includes('Unauthorized')
    ))
  ) {
    removeAuthToken();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('auth:expired', {
        detail: data.message || 'Your session has expired. Please log in again.'
      }));
    }
  }
  return data;
};

export interface ApiUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  payverseId: string;
  createdAt?: string;
}

export interface ApiWallet {
  balance: number;
  currency: string;
  updatedAt?: string;
}

export interface ApiTransaction {
  _id?: string;
  id?: string;
  senderId: any;
  receiverId: any;
  amount: number;
  type: 'transfer' | 'add_money';
  status: 'success' | 'failed';
  timestamp: string;
}

export const api = {
  // Auth API
  sendOtp: async (data: { phone: string }) => {
    const response = await fetch(`${API_BASE_URL}/auth/send-otp`, {
      method: 'POST',
      headers: getHeaders(false),
      body: JSON.stringify(data),
    });
    return await response.json();
  },

  verifyOtp: async (data: { phone: string; otp: string }) => {
    const response = await fetch(`${API_BASE_URL}/auth/verify-otp`, {
      method: 'POST',
      headers: getHeaders(false),
      body: JSON.stringify(data),
    });
    const result = await response.json();
    if (result.success && result.token) {
      setAuthToken(result.token);
    }
    return result;
  },

  register: async (data: { name: string; email: string; phone: string; password: string; payverseId?: string }) => {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: getHeaders(false),
      body: JSON.stringify(data),
    });
    const result = await response.json();
    if (result.success && result.token) {
      setAuthToken(result.token);
    }
    return result;
  },

  login: async (data: { email?: string; phone?: string; payverseId?: string; identifier?: string; password: string }) => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: getHeaders(false),
      body: JSON.stringify(data),
    });
    const result = await response.json();
    if (result.success && result.token) {
      setAuthToken(result.token);
    }
    return result;
  },

  getMe: async () => {
    const token = getAuthToken();
    if (!token) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('auth:expired', { detail: 'Please log in to continue.' }));
      }
      return { success: false, message: 'No token' };
    }
    try {
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        method: 'GET',
        headers: getHeaders(true),
      });
      return await handleResponse(response);
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  },

  getUsers: async () => {
    const token = getAuthToken();
    if (!token) return { success: false, users: [] };
    try {
      const response = await fetch(`${API_BASE_URL}/auth/users`, {
        method: 'GET',
        headers: getHeaders(true),
      });
      return await handleResponse(response);
    } catch (err: any) {
      return { success: false, users: [] };
    }
  },

  // Wallet API
  getBalance: async () => {
    const token = getAuthToken();
    if (!token) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('auth:expired', { detail: 'Please log in to check balance.' }));
      }
      return { success: false, message: 'No token provided' };
    }
    const response = await fetch(`${API_BASE_URL}/wallet/balance`, {
      method: 'GET',
      headers: getHeaders(true),
    });
    return await handleResponse(response);
  },

  transfer: async (data: { receiverId?: string; receiverPayverseId?: string; receiverEmail?: string; receiverPhone?: string; amount: number }) => {
    const token = getAuthToken();
    if (!token) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('auth:expired', { detail: 'Please log in to transfer money.' }));
      }
      return { success: false, message: 'Access denied. No token provided.' };
    }
    const response = await fetch(`${API_BASE_URL}/wallet/transfer`, {
      method: 'POST',
      headers: getHeaders(true),
      body: JSON.stringify(data),
    });
    return await handleResponse(response);
  },

  addMoney: async (data: { amount: number }) => {
    const token = getAuthToken();
    if (!token) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('auth:expired', { detail: 'Please log in to add money.' }));
      }
      return { success: false, message: 'Access denied. No token provided.' };
    }
    const response = await fetch(`${API_BASE_URL}/wallet/add-money`, {
      method: 'POST',
      headers: getHeaders(true),
      body: JSON.stringify(data),
    });
    return await handleResponse(response);
  },

  // Transaction API
  getTransactionHistory: async () => {
    const token = getAuthToken();
    if (!token) return { success: false, transactions: [] };
    const response = await fetch(`${API_BASE_URL}/transactions/history`, {
      method: 'GET',
      headers: getHeaders(true),
    });
    return await handleResponse(response);
  },
};
