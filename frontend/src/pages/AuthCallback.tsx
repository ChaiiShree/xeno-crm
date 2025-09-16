// src/pages/AuthCallback.tsx
import React, { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import authService from '../services/auth';
import LoadingSpinner from '../components/ui/LoadingSpinner';

const AuthCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get('token');

    const handleLogin = async (authToken: string) => {
      const user = await authService.handleAuthCallback(authToken);
      if (user) {
        navigate('/dashboard', { replace: true });
        window.location.reload(); // Force a reload to ensure all states are fresh
      } else {
        navigate('/login?error=verification_failed', { replace: true });
      }
    };

    if (token) {
      handleLogin(token);
    } else {
      navigate('/login?error=no_token', { replace: true });
    }
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <LoadingSpinner size="lg" />
      <p className="ml-4 text-gray-600">Finalizing authentication...</p>
    </div>
  );
};

export default AuthCallback;