import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LoginPage } from './pages/LoginPage';
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
  const { isAuthenticated } = useAuthStore();

  return (
    <Routes>
      <Route path="/" element={isAuthenticated ? <MemoriesPage /> : <LandingPage />} />
      <Route path="/drive" element={isAuthenticated ? <MemoriesPage /> : <Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/share/:token" element={<PublicSharePage />} />
      <Route path="/*" element={isAuthenticated ? <MemoriesPage /> : <LandingPage />} />
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
