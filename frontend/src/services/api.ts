// src/services/api.ts
import axios from "axios";
import type { AxiosInstance, AxiosError } from "axios";
import toast from 'react-hot-toast';

// The base Axios instance is now kept private to this module
const axiosInstance: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor remains the same
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

// Response interceptor remains the same
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

// FIX: Create a service object that wraps all API calls.
// This provides the methods that useAPI.ts and other services expect.
const apiService = {
  // A generic helper for GET requests to reduce repetition
  get: async (url: string, params?: any) => {
    const response = await axiosInstance.get(url, { params });
    return response.data;
  },

  // Customer endpoints
  getCustomers: (params?: any) => apiService.get('/customers', params),
  getCustomerStats: () => apiService.get('/customers/stats'),
  createCustomer: async (data: any) => {
    const response = await axiosInstance.post('/customers', data);
    return response.data;
  },

  // Segment endpoints
  getSegments: (params?: any) => apiService.get('/segments', params),
  getSegmentById: (id: number) => apiService.get(`/segments/${id}`),
  getSegmentStats: () => apiService.get('/segments/stats'),
  createSegment: async (data: any) => {
    const response = await axiosInstance.post('/segments', data);
    return response.data;
  },
  updateSegment: async (id: number, data: any) => {
    const response = await axiosInstance.put(`/segments/${id}`, data);
    return response.data;
  },
  deleteSegment: async (id: number) => {
    const response = await axiosInstance.delete(`/segments/${id}`);
    return response.data;
  },
  previewAudience: async (data: any) => {
    const response = await axiosInstance.post('/segments/preview', data);
    return response.data;
  },

  // Campaign endpoints
  getCampaigns: (params?: any) => apiService.get('/campaigns', params),
  getCampaignById: (id: number) => apiService.get(`/campaigns/${id}`),
  getCampaignStats: () => apiService.get('/campaigns/stats'),
  createCampaign: async (data: any) => {
    const response = await axiosInstance.post('/campaigns', data);
    return response.data;
  },
  launchCampaign: async (id: number) => {
    const response = await axiosInstance.post(`/campaigns/${id}/launch`);
    return response.data;
  },

  // AI endpoints
  generateAIMessages: async (data: any) => {
    const response = await axiosInstance.post('/ai/generate-messages', data);
    return response.data;
  },
  getCampaignInsights: (id: number) => apiService.get(`/ai/insights/campaign/${id}`),
};

// FIX: Export the service object, not the raw axios instance.
export default apiService;

// FIX: Also export the raw instance for services like auth.ts that need direct access.
export { axiosInstance as api };