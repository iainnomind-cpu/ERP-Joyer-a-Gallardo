import { useState, useEffect, lazy, Suspense } from 'react';
import Layout from './components/Layout';
import LoginModule from './components/modules/LoginModule';
import { PermissionsMap, getDefaultPermissions, mergePermissions, loadUserPermissions, getModulePermissions } from './lib/permissions';

// Lazy-loaded modules — each becomes its own chunk
const Dashboard = lazy(() => import('./components/modules/Dashboard'));
const CRMModule = lazy(() => import('./components/modules/CRMModule'));
const KanbanModule = lazy(() => import('./components/modules/KanbanModule'));
const InventoryModule = lazy(() => import('./components/modules/InventoryModule'));
const SalesModule = lazy(() => import('./components/modules/SalesModule'));
const QuotesModule = lazy(() => import('./components/modules/QuotesModule'));
const ConfigModule = lazy(() => import('./components/modules/ConfigModule'));
const MarketingModule = lazy(() => import('./components/modules/MarketingModule'));
const EcommerceDashboard = lazy(() => import('./pages/EcommerceDashboard').then(m => ({ default: m.EcommerceDashboard })));
const InboxModule = lazy(() => import('./components/modules/InboxModule'));

interface CurrentUser {
  id: string;
  username: string;
  full_name: string;
  email?: string;
  role: 'admin' | 'vendedor' | 'cajero';
  is_active: boolean;
}

function App() {
  const [currentModule, setCurrentModule] = useState<'dashboard' | 'crm' | 'inventory' | 'sales' | 'config' | 'kanban' | 'marketing' | 'quotes' | 'ecommerce' | 'inbox'>(() => {
    const path = window.location.pathname;
    if (path.includes('/ecommerce')) return 'ecommerce';

    const params = new URLSearchParams(window.location.search);
    const moduleParam = params.get('module');
    if (moduleParam && ['dashboard', 'crm', 'inventory', 'sales', 'config', 'kanban', 'marketing', 'quotes', 'ecommerce', 'inbox'].includes(moduleParam)) {
      return moduleParam as 'dashboard' | 'crm' | 'inventory' | 'sales' | 'config' | 'kanban' | 'marketing' | 'quotes' | 'ecommerce' | 'inbox';
    }

    return 'dashboard';
  });
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [userPermissions, setUserPermissions] = useState<PermissionsMap>(getDefaultPermissions('cajero'));
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Load permissions when user changes
  useEffect(() => {
    if (currentUser) {
      loadUserPermissions(currentUser.id).then(overrides => {
        setUserPermissions(mergePermissions(currentUser.role, overrides || undefined));
      });
    }
  }, [currentUser]);

  useEffect(() => {
    const stored = localStorage.getItem('current_user');
    if (stored) {
      try {
        const user = JSON.parse(stored);
        setCurrentUser(user);
      } catch {
        localStorage.removeItem('current_user');
      }
    }
    setIsCheckingAuth(false);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('current_user');
    setCurrentUser(null);
    setCurrentModule('dashboard');
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-yellow-50 to-amber-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-amber-400 to-yellow-600 rounded-2xl shadow-2xl mb-4">
            <span className="text-white font-bold text-4xl">GJ</span>
          </div>
          <div className="w-16 h-16 border-4 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginModule onLoginSuccess={setCurrentUser} />;
  }

  const ModuleLoader = () => (
    <div className="flex items-center justify-center h-96">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-gray-500 text-sm">Cargando módulo...</p>
      </div>
    </div>
  );

  return (
    <>
      <Layout
        currentModule={currentModule}
        onModuleChange={setCurrentModule}
        currentUser={currentUser}
        onLogout={handleLogout}
        permissions={userPermissions}
      >
        <Suspense fallback={<ModuleLoader />}>
          {currentModule === 'dashboard' && <Dashboard currentUser={currentUser} />}
          {currentModule === 'crm' && <CRMModule currentUser={currentUser} permissions={getModulePermissions(userPermissions, 'crm')} />}
          {currentModule === 'kanban' && <KanbanModule currentUser={currentUser} />}
          {currentModule === 'inventory' && <InventoryModule currentUser={currentUser} permissions={getModulePermissions(userPermissions, 'inventory')} />}
          {currentModule === 'sales' && <SalesModule currentUser={currentUser} permissions={getModulePermissions(userPermissions, 'sales')} />}
          {currentModule === 'quotes' && <QuotesModule currentUser={currentUser} permissions={getModulePermissions(userPermissions, 'quotes')} />}
          {currentModule === 'marketing' && <MarketingModule />}
          {currentModule === 'ecommerce' && <EcommerceDashboard />}
          {currentModule === 'inbox' && <InboxModule currentUser={currentUser} />}
          {currentModule === 'config' && <ConfigModule currentUser={currentUser} />}
        </Suspense>
      </Layout>
    </>
  );
}

export default App;
