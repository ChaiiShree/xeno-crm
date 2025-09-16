// src/services/auth.ts
import api from './api';
import type { User } from '../types/auth';

class AuthService {
  getGoogleAuthUrl(): string {
    return `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/auth/google`;
  }

  /**
   * Called from the new AuthCallback page.
   * Stores the token and fetches the user data.
   */
  async handleAuthCallback(token: string): Promise<User | null> {
    try {
      // 1. Store the token immediately
      localStorage.setItem('auth_token', token);

      // 2. Fetch user data using the new token
      const user = await this.getCurrentUser();
      if (user) {
        // 3. Store user data
        localStorage.setItem('xeno_user', JSON.stringify(user));
        return user;
      }
      return null;
    } catch (error) {
      console.error("Failed to handle auth callback:", error);
      this.logout(); // Clear bad token
      return null;
    }
  }

  /**
   * Checks if a user is logged in by verifying the stored token with the backend.
   * Called by the useAuth hook on initial app load.
   */
  async checkAuth(): Promise<User | null> {
    const token = localStorage.getItem('auth_token');
    const userJson = localStorage.getItem('xeno_user');

    if (!token) {
      return null;
    }
    
    // If we have a user in localStorage, return it for a faster UI response.
    // A background check can be implemented later if freshness is critical.
    if (userJson) {
      try {
        return JSON.parse(userJson);
      } catch (e) {
        // If JSON is corrupted, proceed to fetch from API
      }
    }
    
    // If no local user, fetch from API
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
  
  /**
   * Fetches the current user from the /auth/me endpoint.
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      const response = await api.get('/auth/me');
      return response.data.user;
    } catch (error) {
      console.error("Could not fetch current user:", error);
      return null;
    }
  }

  /**
   * Logs the user out by clearing local storage and notifying the backend.
   */
  async logout(): Promise<void> {
    try {
      // Notify backend to invalidate the session/token if necessary
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