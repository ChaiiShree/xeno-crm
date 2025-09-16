// src/hooks/useAuth.ts
import { useState, useEffect, useCallback } from 'react';
import authService from '../services/auth';
import type { User } from '../types/auth';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true); // Start as true on initial load

  // Using useCallback is good practice but not strictly necessary here
  // as the dependency array in useEffect is empty.
  const checkAuthStatus = useCallback(async () => {
    try {
      // The new authService.checkAuth() returns the user directly, or null.
      // We don't need to destructure it with { user: ... } anymore.
      const fetchedUser = await authService.checkAuth();
      setUser(fetchedUser);
    } catch (error) {
      console.error('Auth check failed:', error);
      setUser(null);
    } finally {
      // Always set loading to false after the check is complete
      setLoading(false);
    }
  }, []);

  // This useEffect now runs only once when the app first loads.
  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  // The listener-based useEffect has been removed as it's no longer needed.

  return { user, loading };
};