import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LoginPage } from './pages/LoginPage';
import { AdminLoginPage } from './pages/AdminLoginPage';
import { AdminPage } from './pages/AdminPage';
import { MemoriesPage } from './pages/DrivePage';
import { LandingPage } from './pages/LandingPage';
import { PublicSharePage } from './pages/PublicSharePage';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { useAuthStore } from './stores/useAuthStore';
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
  const { user, isAuthenticated } = useAuthStore();
  const isAdmin = isAuthenticated && user?.role === 'admin';

  return (
    <Routes>
      <Route
        path="/"
        element={
          isAdmin ? (
            <Navigate to="/pangurus" replace />
          ) : isAuthenticated ? (
            <MemoriesPage />
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
          ) : isAuthenticated ? (
            <Navigate to="/" replace />
          ) : (
            <Navigate to="/pangurus/login" replace />
          )
        }
      />
      <Route path="/admin" element={<Navigate to="/" replace />} />
      <Route path="/admin/*" element={<Navigate to="/" replace />} />
      <Route path="/share/:token" element={<PublicSharePage />} />
      <Route
        path="/*"
        element={
          isAdmin ? (
            <Navigate to="/pangurus" replace />
          ) : isAuthenticated ? (
            <MemoriesPage />
          ) : (
            <LandingPage />
          )
        }
      />
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
