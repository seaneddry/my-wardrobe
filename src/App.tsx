import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { TabBar } from './components/TabBar';
import { config } from './config';
import { ConfigMissing } from './pages/ConfigMissing';
import { ItemDetail } from './pages/ItemDetail';
import { ItemForm } from './pages/ItemForm';
import { Login } from './pages/Login';
import { Settings } from './pages/Settings';
import { Wardrobe } from './pages/Wardrobe';
import { AuthProvider, useAuth } from './state/auth';
import { DataProvider, useData } from './state/data';

function ErrorBanner() {
  const { error, clearError } = useData();
  if (!error) return null;
  return (
    <div className="banner" role="alert">
      <span>{error}</span>
      <button type="button" className="banner-close" onClick={clearError} aria-label="Dismiss">
        ×
      </button>
    </div>
  );
}

function Shell() {
  const location = useLocation();
  const isForm = location.pathname === '/add' || location.pathname.endsWith('/edit');

  // Each screen starts at the top, except when returning to the wardrobe list.
  useEffect(() => {
    if (location.pathname !== '/') window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <>
      <ErrorBanner />
      <Routes>
        <Route path="/" element={<Wardrobe />} />
        <Route path="/add" element={<ItemForm />} />
        <Route path="/item/:id" element={<ItemDetail />} />
        <Route path="/item/:id/edit" element={<ItemForm />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {!isForm && <TabBar />}
    </>
  );
}

function Gate() {
  const { ready, session } = useAuth();
  if (!ready) return <div className="splash" aria-label="Loading" />;
  if (!session) return <Login />;
  return (
    <DataProvider userId={session.user.id}>
      <HashRouter>
        <Shell />
      </HashRouter>
    </DataProvider>
  );
}

export function App() {
  if (!config.isConfigured) return <ConfigMissing />;
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  );
}
