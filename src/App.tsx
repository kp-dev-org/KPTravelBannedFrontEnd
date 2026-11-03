import { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import Passengers from "./pages/Passengers";
import GateCheck from "./pages/GateCheck";
import Users from "./pages/Users";
import AuditLogs from "./pages/AuditLogs";
import Profile from "./pages/Profile";
import Login from "./pages/Login";
import ErrorPage from "./pages/Errorpage";
import InactivityWarningModal from "./components/InactivityWarningModal";
import SessionExpiredModal from "./components/SessionExpiredModal";
import { LanguageProvider } from './contexts/LanguageContext';
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { DataProvider } from "./contexts/DataContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { ApiError } from "./services/Api";

function AppContent() {
  const { user, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [globalError, setGlobalError] = useState<ApiError | null>(null);

  window.handleGlobalError = (error: any) => {
    setGlobalError(error);
  };

  if (globalError) {
    return <ErrorPage error={globalError} />;
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white space-y-4">
        <div className="w-12 h-12 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-medium text-yellow-300">Vérification de session Spring Boot...</p>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <InactivityWarningModal />
      <SessionExpiredModal />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/passengers" element={<Passengers />} />
            <Route path="/gate-check" element={<GateCheck />} />
            <Route path="/users" element={<Users />} />
            <Route path="/audit-logs" element={<AuditLogs />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <DataProvider>
            <Router>
              <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
                <AppContent />
              </div>
            </Router>
          </DataProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default App;
