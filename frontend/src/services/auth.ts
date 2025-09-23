// frontend/src/services/auth.ts

import { api } from './api';
import type { User } from '../types/auth';

class AuthService {
  getGoogleAuthUrl(): string {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:7860';
    return `${apiUrl}/api/auth/google`;
  }

  /**
   * Handles the demo login flow by calling the backend endpoint using fetch.
   */
  async demoLogin(): Promise<User | null> {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:7860'}/api/demo/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Demo login failed');
      }
      
      const data = await response.json();
      
      if (data.success) {
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('xeno_user', JSON.stringify(data.user));
        return data.user;
      } else {
        throw new Error(data.error || 'Demo login failed');
      }
    } catch (error) {
      console.error('Demo login error:', error);
      throw error;
    }
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
      this.logout();
      return null;
    }
  }
  
  async getCurrentUser(): Promise<User | null> {
    try {
      const response = await api.get('/auth/me');
      return response.data.user;
    } catch (error) {
      console.error("Could not fetch current user:", error);
      throw error;
    }
  }

  async logout(): Promise<void> {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error("Backend logout failed, clearing client-side anyway.", error);
    } finally {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('xeno_user');
      window.location.href = '/login';
    }
  }
}

export default new AuthService();
