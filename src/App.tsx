import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import BotsPage from './pages/BotsPage';
import ExchangesPage from './pages/ExchangesPage';
import PositionsPage from './pages/PositionsPage';
import HistoryPage from './pages/HistoryPage';
import WalletPage from './pages/WalletPage';
import SettingsPage from './pages/SettingsPage';
import TermsOfUse from './pages/legal/TermsOfUse';
import PrivacyPolicy from './pages/legal/PrivacyPolicy';
import AffiliateHub from './components/AffiliateHub';
import AdminPage from './pages/AdminPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';

function ProtectedRoute({ children, requireAdmin = false }: { children: React.ReactNode; requireAdmin?: boolean }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-bg0 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-cyan border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (requireAdmin && !user.isAdmin) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function AppRoute({ element, requireAdmin = false }: { element: React.ReactNode; requireAdmin?: boolean }) {
  return (
    <ProtectedRoute requireAdmin={requireAdmin}>
      <Layout>{element}</Layout>
    </ProtectedRoute>
  );
}

// Link de indicação: /ref/:code → encaminha para o registo com o código aplicado
function ReferralRedirect() {
  const { code } = useParams();
  return <Navigate to={`/login?ref=${encodeURIComponent(code ?? '')}`} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/ref/:code" element={<ReferralRedirect />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/legal/terms" element={<TermsOfUse />} />
          <Route path="/legal/privacy" element={<PrivacyPolicy />} />
          <Route path="/dashboard" element={<AppRoute element={<DashboardPage />} />} />
          <Route path="/bots" element={<AppRoute element={<BotsPage />} />} />
          <Route path="/exchanges" element={<AppRoute element={<ExchangesPage />} />} />
          <Route path="/positions" element={<AppRoute element={<PositionsPage />} />} />
          <Route path="/history" element={<AppRoute element={<HistoryPage />} />} />
          <Route path="/wallet" element={<AppRoute element={<WalletPage />} />} />
          <Route path="/settings" element={<AppRoute element={<SettingsPage />} />} />
          <Route path="/affiliates" element={<AppRoute element={<AffiliateHub />} />} />
          <Route path="/admin" element={<AppRoute element={<AdminPage />} requireAdmin />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
