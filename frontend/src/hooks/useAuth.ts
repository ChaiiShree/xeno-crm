// src/hooks/useAuth.ts
import { useState, useEffect, useCallback } from 'react';
import authService from '../services/auth';
import type { User } from '../types/auth';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const checkAuthStatus = useCallback(async () => {
    try {
      const fetchedUser = await authService.checkAuth();
      setUser(fetchedUser);
    } catch (error) {
      console.error('Auth check failed:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  // FIX: The logout function from the service is now returned by the hook.
  // This allows components to call logout() via const { logout } = useAuth().
  return { user, loading, logout: authService.logout };
};