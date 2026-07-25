import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import Layout from './components/Layout';
import Chatbot from './components/Chatbot';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import MockCheckoutPage from './pages/MockCheckoutPage';
import DashboardPage from './pages/DashboardPage';
import FacilitiesPage from './pages/FacilitiesPage';
import MembershipsPage from './pages/MembershipsPage';
import PaymentsPage from './pages/PaymentsPage';
import CardPage from './pages/CardPage';
import FreezePage from './pages/FreezePage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import AdminUsersPage from './pages/AdminUsersPage';
import AuditLogsPage from './pages/AuditLogsPage';
import TrainerPage from './pages/TrainerPage';
import VerifyCardPage from './pages/VerifyCardPage';

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  
  if (loading) return <div className="loading-page"><div className="spinner" /></div>;
  if (!user) {
    const nextUrl = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?redirectTo=${nextUrl}`} replace />;
  }
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return <Layout>{children}</Layout>;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-page"><div className="spinner" /></div>;
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
      <Route path="/checkout" element={<MockCheckoutPage />} />

      {/* Member Routes */}
      <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/facilities" element={<ProtectedRoute><FacilitiesPage /></ProtectedRoute>} />
      <Route path="/memberships" element={<ProtectedRoute><MembershipsPage /></ProtectedRoute>} />
      <Route path="/payments" element={<ProtectedRoute><PaymentsPage /></ProtectedRoute>} />
      <Route path="/card" element={<ProtectedRoute><CardPage /></ProtectedRoute>} />
      <Route path="/freeze" element={<ProtectedRoute><FreezePage /></ProtectedRoute>} />

      {/* Admin Routes */}
      <Route path="/admin" element={<ProtectedRoute roles={['ADMIN']}><AdminDashboardPage /></ProtectedRoute>} />
      <Route path="/admin/users" element={<ProtectedRoute roles={['ADMIN']}><AdminUsersPage /></ProtectedRoute>} />
      <Route path="/admin/audit" element={<ProtectedRoute roles={['ADMIN']}><AuditLogsPage /></ProtectedRoute>} />

      {/* Trainer Routes */}
      <Route path="/trainer" element={<ProtectedRoute roles={['TRAINER', 'ADMIN']}><TrainerPage /></ProtectedRoute>} />
      <Route path="/verify-card" element={<ProtectedRoute roles={['TRAINER', 'ADMIN']}><VerifyCardPage /></ProtectedRoute>} />

      {/* Redirects */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <AppRoutes />
          <Chatbot />
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
