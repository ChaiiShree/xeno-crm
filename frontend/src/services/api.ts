// src/services/api.ts
import axios from "axios";
import type { AxiosInstance, AxiosError } from "axios";
import toast from 'react-hot-toast';

const axiosInstance: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
axiosInstance.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('xeno_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    const data = error.response?.data as any;
    const message = data?.error || data?.message || error.message || 'An unknown error occurred';
    if (error.config?.method !== 'get') {
      toast.error(message);
    }
    return Promise.reject(error);
  }
);

// FIX: All endpoints now use the correct /api/ prefix to match backend routes
const apiService = {
  // Generic helper for GET requests
  get: async (url: string, params?: any) => {
    const response = await axiosInstance.get(url, { params });
    return response.data;
  },

  // Customer endpoints - Fixed to use /api/ prefix
  getCustomers: (params?: any) => apiService.get('/api/customers', params),
  getCustomerStats: () => apiService.get('/api/customers/stats'),
  createCustomer: async (data: any) => {
    const response = await axiosInstance.post('/api/customers', data);
    return response.data;
  },

  // Segment endpoints - Fixed to use /api/ prefix
  getSegments: (params?: any) => apiService.get('/api/segments', params),
  getSegmentById: (id: number) => apiService.get(`/api/segments/${id}`),
  getSegmentStats: () => apiService.get('/api/segments/stats'),
  createSegment: async (data: any) => {
    const response = await axiosInstance.post('/api/segments', data);
    return response.data;
  },
  updateSegment: async (id: number, data: any) => {
    const response = await axiosInstance.put(`/api/segments/${id}`, data);
    return response.data;
  },
  deleteSegment: async (id: number) => {
    const response = await axiosInstance.delete(`/api/segments/${id}`);
    return response.data;
  },
  previewAudience: async (data: any) => {
    const response = await axiosInstance.post('/api/segments/preview', data);
    return response.data;
  },

  // Campaign endpoints - Fixed to use /api/ prefix
  getCampaigns: (params?: any) => apiService.get('/api/campaigns', params),
  getCampaignById: (id: number) => apiService.get(`/api/campaigns/${id}`),
  getCampaignStats: () => apiService.get('/api/campaigns/stats'),
  createCampaign: async (data: any) => {
    const response = await axiosInstance.post('/api/campaigns', data);
    return response.data;
  },
  launchCampaign: async (id: number) => {
    const response = await axiosInstance.post(`/api/campaigns/${id}/launch`);
    return response.data;
  },

  // AI endpoints - Fixed to use /api/ prefix
  generateAIMessages: async (data: any) => {
    const response = await axiosInstance.post('/api/ai/generate-messages', data);
    return response.data;
  },
  getCampaignInsights: (id: number) => apiService.get(`/api/ai/insights/campaign/${id}`),

  // Orders endpoints - Fixed to use /api/ prefix
  getOrders: (params?: any) => apiService.get('/api/orders', params),
  getOrderById: (id: number) => apiService.get(`/api/orders/${id}`),
  getOrderStats: () => apiService.get('/api/orders/stats'),
  createOrder: async (data: any) => {
    const response = await axiosInstance.post('/api/orders', data);
    return response.data;
  },
};

export default apiService;
export { axiosInstance as api };
