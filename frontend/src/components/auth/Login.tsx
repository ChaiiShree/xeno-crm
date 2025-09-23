// frontend/src/components/auth/Login.tsx

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Target, Mail, BarChart3, Shield, Star } from 'lucide-react';
import toast from 'react-hot-toast';
import authService from '../../services/auth';

const Login: React.FC = () => {
  const navigate = useNavigate();

  const handleGoogleLogin = () => {
    window.location.href = authService.getGoogleAuthUrl();
  };

  /**
   * NEW: Handles the demo login click event.
   */
  const handleDemoLogin = async () => {
    const toastId = toast.loading('Logging in as Demo User...');
    try {
      const user = await authService.demoLogin();
      if (user) {
        toast.success(`Welcome back, ${user.name}!`, { id: toastId });
        navigate('/dashboard', { replace: true });
        // Use a slight delay before reload to ensure navigation completes
        setTimeout(() => window.location.reload(), 100);
      } else {
        toast.error('Demo login failed. Please contact support.', { id: toastId });
      }
    } catch (error: any) {
      const message = error.response?.data?.error || 'An error occurred during demo login.';
      toast.error(message, { id: toastId });
    }
  };

  const features = [
    { icon: Target, title: 'Smart Segmentation', description: 'AI-powered customer segmentation' },
    { icon: Mail, title: 'Campaign Management', description: 'Create and manage personalized campaigns' },
    { icon: BarChart3, title: 'Advanced Analytics', description: 'Detailed insights and performance metrics' },
    { icon: Shield, title: 'Secure & Reliable', description: 'Enterprise-grade security with Google OAuth' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Side */}
            <div className="space-y-8">
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center">
                    <span className="text-white text-xl font-bold">X</span>
                  </div>
                  <h1 className="text-3xl font-bold text-gray-900">Xeno CRM</h1>
                </div>
                <p className="text-lg text-gray-600">Customer Intelligence Platform</p>
              </div>
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900">Transform your customer relationships with AI-powered insights</h2>
                <p className="text-gray-600 text-lg">Build targeted segments, create personalized campaigns, and drive meaningful engagement.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {features.map((feature, index) => {
                  const Icon = feature.icon;
                  return (
                    <div key={index} className="flex space-x-4">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-gradient-to-r from-blue-100 to-purple-100 rounded-xl flex items-center justify-center">
                          <Icon className="w-6 h-6 text-blue-600" />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <h3 className="font-semibold text-gray-900">{feature.title}</h3>
                        <p className="text-sm text-gray-600">{feature.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Side - Login Form */}
            <div className="flex justify-center">
              <div className="w-full max-w-md">
                <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/20 p-8">
                  <div className="space-y-6">
                    <div className="text-center space-y-2">
                      <h2 className="text-2xl font-bold text-gray-900">Welcome back</h2>
                      <p className="text-gray-600">Sign in to your account to continue</p>
                    </div>
                    <div className="space-y-4">
                      <button onClick={handleGoogleLogin} className="w-full bg-white hover:bg-gray-50 border-2 border-gray-200 text-gray-700 py-4 px-6 rounded-2xl transition-all duration-300 flex items-center justify-center space-x-3 font-medium shadow-lg hover:shadow-xl transform hover:scale-[1.02]">
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                        <span>Continue with Google</span>
                      </button>

                      <div className="relative">
                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-300"></div></div>
                        <div className="relative flex justify-center text-sm"><span className="px-2 bg-white text-gray-500">or</span></div>
                      </div>

                      <button onClick={handleDemoLogin} className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:opacity-90 text-white py-4 px-6 rounded-2xl transition-all duration-300 flex items-center justify-center space-x-3 font-medium shadow-lg hover:shadow-xl transform hover:scale-[1.02]">
                        <Star className="w-5 h-5" />
                        <span>View Demo Account</span>
                      </button>
                    </div>
                    <div className="text-center space-y-4">
                      <p className="text-xs text-gray-500">By continuing, you agree to our <a href="#" className="text-blue-600 hover:underline">Terms of Service</a> and <a href="#" className="text-blue-600 hover:underline">Privacy Policy</a></p>
                    </div>
                  </div>
                </div>
                <div className="mt-6 text-center">
                  <p className="text-sm text-gray-500">New to Xeno CRM? <a href="#" className="text-blue-600 hover:underline font-medium">Learn more</a></p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
