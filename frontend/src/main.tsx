import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LoginPage } from './pages/LoginPage';
import { AdminLoginPage } from './pages/AdminLoginPage';
import { AdminPage } from './pages/AdminPage';
import { MemoriesPage } from './pages/DrivePage';
import { LandingPage } from './pages/LandingPage';
import { PublicSharePage } from './pages/PublicSharePage';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { useAuthStore } from './stores/useAuthStore';
import { NotFoundPage } from './pages/NotFoundPage';
import { verifyMe } from './services/api';
import './index.css';

// Create TanStack Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const AppRoutes: React.FC = () => {
  const { user, isAuthenticated, logout, updateUser } = useAuthStore();
  const isAdmin = isAuthenticated && user?.role === 'admin';
  const navigate = useNavigate();

  // Verify session integrity on initial mount
  useEffect(() => {
    const token = sessionStorage.getItem('auth_token');
    if (token) {
      verifyMe()
        .then((res) => {
          if (res?.user) {
            updateUser(res.user);
          }
        })
        .catch((err) => {
          // Only clear session if token is genuinely rejected (401 Unauthorized)
          if (err?.response?.status === 401) {
            logout();
            const isAdminRoute = window.location.pathname.startsWith('/pangurus');
            navigate(isAdminRoute ? '/pangurus/login' : '/login', { replace: true });
          }
        });
    }
  }, []);

  return (
    <Routes>
      <Route
        path="/"
        element={
          isAdmin ? (
            <Navigate to="/pangurus" replace />
          ) : isAuthenticated ? (
            <Navigate to="/drive" replace />
          ) : (
            <LandingPage />
          )
        }
      />
      <Route
        path="/drive"
        element={
          isAdmin ? (
            <Navigate to="/pangurus" replace />
          ) : isAuthenticated ? (
            <MemoriesPage />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route
        path="/login"
        element={
          isAdmin ? (
            <Navigate to="/pangurus" replace />
          ) : isAuthenticated ? (
            <Navigate to="/drive" replace />
          ) : (
            <LoginPage />
          )
        }
      />
      <Route
        path="/pangurus/login"
        element={
          isAdmin ? (
            <Navigate to="/pangurus" replace />
          ) : (
            <AdminLoginPage />
          )
        }
      />
      <Route
        path="/pangurus"
        element={
          isAdmin ? (
            <AdminPage />
          ) : (
            <Navigate to="/pangurus/login" replace />
          )
        }
      />
      <Route path="/admin" element={<NotFoundPage />} />
      <Route path="/admin/*" element={<NotFoundPage />} />
      <Route path="/share/:token" element={<PublicSharePage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
