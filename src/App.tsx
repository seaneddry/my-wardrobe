import { useEffect } from 'react';
import { createHashRouter, Navigate, Outlet, RouterProvider, useLocation } from 'react-router-dom';
import { TabBar } from './components/TabBar';
import { ToastProvider } from './components/Toast';
import { config } from './config';
import { ConfigMissing } from './pages/ConfigMissing';
import { ItemDetail } from './pages/ItemDetail';
import { ItemForm } from './pages/ItemForm';
import { Login } from './pages/Login';
import { FieldsEditor } from './pages/manage/FieldsEditor';
import { ListEditor } from './pages/manage/ListEditor';
import { ManageIntro, ManageLayout } from './pages/manage/ManageLayout';
import { OutfitBuilder } from './pages/outfits/OutfitBuilder';
import { OutfitDetail } from './pages/outfits/OutfitDetail';
import { Outfits } from './pages/outfits/Outfits';
import { Settings } from './pages/Settings';
import { Stylist } from './pages/Stylist';
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
  const isForm = location.pathname === '/add' || location.pathname === '/outfits/new' || location.pathname.endsWith('/edit');

  // Each screen starts at the top, except the wardrobe, which restores its own position.
  useEffect(() => {
    if (location.pathname !== '/') window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <>
      <ErrorBanner />
      <Outlet />
      {!isForm && <TabBar />}
    </>
  );
}

// A data router enables animated page transitions (View Transitions API).
const router = createHashRouter([
  {
    element: <Shell />,
    children: [
      { path: '/', element: <Wardrobe /> },
      { path: '/add', element: <ItemForm /> },
      { path: '/item/:id', element: <ItemDetail /> },
      { path: '/item/:id/edit', element: <ItemForm /> },
      { path: '/outfits', element: <Outfits /> },
      { path: '/outfits/new', element: <OutfitBuilder /> },
      { path: '/outfits/:id', element: <OutfitDetail /> },
      { path: '/outfits/:id/edit', element: <OutfitBuilder /> },
      { path: '/stylist', element: <Stylist /> },
      { path: '/settings', element: <Settings /> },
      {
        path: '/manage',
        element: <ManageLayout />,
        children: [
          { index: true, element: <ManageIntro /> },
          { path: 'lists/:list', element: <ListEditor /> },
          { path: 'fields', element: <FieldsEditor /> },
        ],
      },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);

function Gate() {
  const { ready, session } = useAuth();
  if (!ready) return <div className="splash" aria-label="Loading" />;
  if (!session) return <Login />;
  return (
    <DataProvider userId={session.user.id}>
      <RouterProvider router={router} />
    </DataProvider>
  );
}

export function App() {
  if (!config.isConfigured) return <ConfigMissing />;
  return (
    <ToastProvider>
      <AuthProvider>
        <Gate />
      </AuthProvider>
    </ToastProvider>
  );
}
