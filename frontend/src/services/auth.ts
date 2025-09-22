// src/services/auth.ts

import { api } from './api';
import type { User } from '../types/auth';

class AuthService {
  getGoogleAuthUrl(): string {
    // FIX: Added the '/api' prefix to match the backend's routing structure.
    // Also updated the fallback port to 7860 for local development consistency.
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:7860';
    return `${apiUrl}/api/auth/google`;
  }
  
  handleDemoLogin(demoUser: User): void {
    localStorage.setItem('auth_token', 'demo-auth-token-is-not-real');
    localStorage.setItem('xeno_user', JSON.stringify(demoUser));
  }

  async handleAuthCallback(token: string): Promise<User | null> {
    try {
      localStorage.setItem('auth_token', token);
      const user = await this.getCurrentUser();
      if (user) {
        localStorage.setItem('xeno_user', JSON.stringify(user));
        return user;
      }
      return null;
    } catch (error) {
      console.error("Failed to handle auth callback:", error);
      this.logout();
      return null;
    }
  }

  async checkAuth(): Promise<User | null> {
    const token = localStorage.getItem('auth_token');
    const userJson = localStorage.getItem('xeno_user');

    if (!token) return null;
    
    if (userJson) {
      try {
        return JSON.parse(userJson);
      } catch (e) {
        // Corrupted JSON, proceed to fetch from API
      }
    }
    
    try {
      const user = await this.getCurrentUser();
      if (user) {
        localStorage.setItem('xeno_user', JSON.stringify(user));
      }
      return user;
    } catch (error) {
      console.error("Auth check with API failed:", error);
      this.logout(); // Logout if the token is invalid
      return null;
    }
  }
  
  async getCurrentUser(): Promise<User | null> {
    try {
      const response = await api.get('/auth/me');
      return response.data.user;
    } catch (error) {
      console.error("Could not fetch current user:", error);
      // The api interceptor will handle the logout on 401/403 errors.
      throw error;
    }
  }

  async logout(): Promise<void> {
    try {
      // Notify the backend to invalidate the session/token if applicable
      await api.post('/auth/logout');
    } catch (error) {
      console.error("Backend logout failed, clearing client-side anyway.", error);
    } finally {
      // Always clear client-side credentials
      localStorage.removeItem('auth_token');
      localStorage.removeItem('xeno_user');
      // Redirect to login to clear all application state
      window.location.href = '/login';
    }
  }
}

export default new AuthService();