import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/common/Header';
import { Footer } from './components/common/Footer';
import { SessionTimeoutModal } from './components/common/SessionTimeoutModal';
import { LoginPage } from './pages/LoginPage';
import { InstitutionDashboard } from './pages/InstitutionDashboard';
import { SubmissionWizard } from './pages/SubmissionWizard';
import { OfficialDashboard } from './pages/OfficialDashboard';
import { FDRActionCenter } from './pages/FDRActionCenter';
import { AlertsReportsPage } from './pages/AlertsReportsPage';
import { AuditLogPage } from './pages/AuditLogPage';
import { Toaster } from 'react-hot-toast';

// Protected Route Component
const ProtectedRoute: React.FC<{ 
  allowedRole: 'institution' | 'official'; 
  children: React.ReactNode;
}> = ({ allowedRole, children }) => {
  const { isAuthenticated, role } = useApp();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (role !== allowedRole) {
    return <Navigate to={role === 'official' ? '/official/dashboard' : '/institution/dashboard'} replace />;
  }

  return <>{children}</>;
};

// Root Redirect Helper
const RootRedirect: React.FC = () => {
  const { isAuthenticated, role } = useApp();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={role === 'official' ? '/official/dashboard' : '/institution/dashboard'} replace />;
};

// Main App Layout Wrapper
const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
      {!isLoginPage && <Header />}
      <div className="flex-1 flex flex-col">
        {children}
      </div>
      {!isLoginPage && <Footer />}
      <SessionTimeoutModal />
      <Toaster 
        position="top-right" 
        toastOptions={{
          style: {
            fontFamily: 'Roboto, sans-serif',
            fontSize: '13px',
            border: '1px solid #D9E2EC',
            boxShadow: '0 4px 12px rgba(18, 53, 91, 0.1)',
          },
          success: {
            iconTheme: {
              primary: '#16A34A',
              secondary: '#FFFFFF',
            },
          },
          error: {
            iconTheme: {
              primary: '#DC2626',
              secondary: '#FFFFFF',
            },
          },
        }} 
      />
    </div>
  );
};

export function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <AppLayout>
          <Routes>
            {/* Public Login Route */}
            <Route path="/login" element={<LoginPage />} />

            {/* Institution Protected Routes */}
            <Route 
              path="/institution/dashboard" 
              element={
                <ProtectedRoute allowedRole="institution">
                  <InstitutionDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/institution/new-fdr" 
              element={
                <ProtectedRoute allowedRole="institution">
                  <SubmissionWizard />
                </ProtectedRoute>
              } 
            />

            {/* Official Protected Routes */}
            <Route 
              path="/official/dashboard" 
              element={
                <ProtectedRoute allowedRole="official">
                  <OfficialDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/official/fdr/:id" 
              element={
                <ProtectedRoute allowedRole="official">
                  <FDRActionCenter />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/official/reports" 
              element={
                <ProtectedRoute allowedRole="official">
                  <AlertsReportsPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/official/audit-log" 
              element={
                <ProtectedRoute allowedRole="official">
                  <AuditLogPage />
                </ProtectedRoute>
              } 
            />

            {/* Default Catch-All */}
            <Route path="/" element={<RootRedirect />} />
            <Route path="*" element={<RootRedirect />} />
          </Routes>
        </AppLayout>
      </BrowserRouter>
    </AppProvider>
  );
}

export default App;
