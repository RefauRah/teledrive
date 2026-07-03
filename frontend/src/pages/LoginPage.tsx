import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthFlow from '../components/auth/AuthFlow';
import { useAuthStore } from '../stores/useAuthStore';

export const LoginPage: React.FC = () => {
  const { isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  return (
    <div className="min-h-screen w-full bg-bg-primary text-text-primary flex items-center justify-center p-6 relative overflow-hidden">
      {/* Decorative background gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-accent-primary/10 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-accent-secondary/15 blur-[150px] pointer-events-none" />

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(19,27,46,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(19,27,46,0.015)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

      <main className="w-full max-w-md relative z-10">
        <AuthFlow />
      </main>
    </div>
  );
};
