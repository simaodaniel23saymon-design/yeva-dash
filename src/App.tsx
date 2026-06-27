import { BrowserRouter, Navigate, Route, Routes, useParams, useSearchParams } from 'react-router-dom';
import { YevaTradeLoader } from './components/YevaTradeLoader';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import { ScrollToTop } from './components/ScrollToTop';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import BotsPage from './pages/BotsPage';
import ExchangesPage from './pages/ExchangesPage';
import OperationsPage from './pages/OperationsPage';
import HistoryPage from './pages/HistoryPage';
import WalletPage from './pages/WalletPage';
import DepositPage from './pages/DepositPage';
import SettingsPage from './pages/SettingsPage';
import DeleteAccountPage from './pages/DeleteAccountPage';
import TermsOfUse from './pages/legal/TermsOfUse';
import PrivacyPolicy from './pages/legal/PrivacyPolicy';
import AffiliateHub from './components/AffiliateHub';
import AdminPage from './pages/AdminPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import CreateBotPage from './pages/CreateBotPage';
import ApiGuidePage from './pages/ApiGuidePage';
import MarketAnalysisPage from './pages/MarketAnalysisPage';
import BotStatsPage from './pages/BotStatsPage';

function ProtectedRoute({ children, requireAdmin = false }: { children: React.ReactNode; requireAdmin?: boolean }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-bg0 flex items-center justify-center">
        <YevaTradeLoader size="lg" label="A carregar..." />
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

// Link de indicação: /ref/:code ou /signup?ref= → encaminha para o registo com o código aplicado
function ReferralRedirect() {
  const { code } = useParams();
  return <Navigate to={`/login?ref=${encodeURIComponent(code ?? '')}`} replace />;
}

function SignupRedirect() {
  const [params] = useSearchParams();
  const ref = params.get('ref');
  return <Navigate to={ref ? `/login?ref=${encodeURIComponent(ref)}` : '/login?tab=register'} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupRedirect />} />
          <Route path="/ref/:code" element={<ReferralRedirect />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/legal/terms" element={<TermsOfUse />} />
          <Route path="/legal/privacy" element={<PrivacyPolicy />} />
          <Route path="/dashboard" element={<AppRoute element={<DashboardPage />} />} />
          <Route path="/bots" element={<AppRoute element={<BotsPage />} />} />
          <Route path="/create-bot" element={<AppRoute element={<CreateBotPage />} />} />
          <Route path="/exchanges" element={<AppRoute element={<ExchangesPage />} />} />
          <Route path="/exchange" element={<AppRoute element={<ExchangesPage />} />} />
          <Route path="/api-guide" element={<AppRoute element={<ApiGuidePage />} />} />
          <Route path="/operations" element={<AppRoute element={<OperationsPage />} />} />
          <Route path="/positions" element={<AppRoute element={<OperationsPage />} />} />
          <Route path="/market-analysis" element={<AppRoute element={<MarketAnalysisPage />} />} />
          <Route path="/bot-stats" element={<AppRoute element={<BotStatsPage />} />} />
          <Route path="/history" element={<AppRoute element={<HistoryPage />} />} />
          <Route path="/wallet" element={<AppRoute element={<WalletPage />} />} />
          <Route path="/deposit" element={<AppRoute element={<DepositPage />} />} />
          <Route path="/settings" element={<AppRoute element={<SettingsPage />} />} />
          <Route path="/settings/delete-account" element={<AppRoute element={<DeleteAccountPage />} />} />
          <Route path="/affiliates" element={<AppRoute element={<AffiliateHub />} />} />
          <Route path="/admin" element={<AppRoute element={<AdminPage />} requireAdmin />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
