// src/services/api.ts
import axios from "axios";
import type { AxiosInstance, AxiosError } from "axios";
import toast from 'react-hot-toast';

const api: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
  withCredentials: true, // Important for cookies if ever needed, but safe to keep
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add the Bearer token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle auth errors and notifications
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // Handle 401 Unauthorized errors
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('xeno_user');
      // Redirect to login only if not already on the login page
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    // Generic error message handling
    const data = error.response?.data as any;
    const message = data?.error || data?.message || error.message || 'An unknown error occurred';
    
    // Show toast notifications for non-GET requests
    if (error.config?.method !== 'get') {
      toast.error(message);
    }
    
    return Promise.reject(error);
  }
);

export default api;