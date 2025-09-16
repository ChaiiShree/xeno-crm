// src/services/auth.ts
// FIX: Import the named export 'api' for direct axios instance usage.
import { api } from './api';
import type { User } from '../types/auth';

class AuthService {
  getGoogleAuthUrl(): string {
    return `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/auth/google`;
  }
  
  // FIX: Added a method to handle the demo login functionality.
  handleDemoLogin(demoUser: User): void {
    // For demo purposes, we simulate a successful login by setting local storage.
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
        // Corrupted JSON, proceed to fetch
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
      return null;
    }
  }
  
  async getCurrentUser(): Promise<User | null> {
    try {
      const response = await api.get('/auth/me');
      return response.data.user;
    } catch (error) {
      console.error("Could not fetch current user:", error);
      return null;
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