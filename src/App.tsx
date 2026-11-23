import { useState, useEffect, Suspense } from 'react';
import Layout from './components/Layout';
import LoginModule from './components/modules/LoginModule';
import ErrorBoundary from './components/ErrorBoundary';
import { lazyWithRetry } from './lib/lazyWithRetry';
import { PermissionsMap, getDefaultPermissions, mergePermissions, loadUserPermissions, getModulePermissions } from './lib/permissions';

// Lazy-loaded modules — each becomes its own chunk
const Dashboard = lazyWithRetry(() => import('./components/modules/Dashboard'), 'Dashboard');
const CRMModule = lazyWithRetry(() => import('./components/modules/CRMModule'), 'CRM');
const KanbanModule = lazyWithRetry(() => import('./components/modules/KanbanModule'), 'Pipeline');
const InventoryModule = lazyWithRetry(() => import('./components/modules/InventoryModule'), 'Inventario');
const SalesModule = lazyWithRetry(() => import('./components/modules/SalesModule'), 'Ventas');
const QuotesModule = lazyWithRetry(() => import('./components/modules/QuotesModule'), 'Cotizaciones');
const ConfigModule = lazyWithRetry(() => import('./components/modules/ConfigModule'), 'Configuración');
const MarketingModule = lazyWithRetry(() => import('./components/modules/MarketingModule'), 'Marketing');
const EcommerceDashboard = lazyWithRetry(() => import('./pages/EcommerceDashboard').then(m => ({ default: m.EcommerceDashboard })), 'E-commerce');
const InboxModule = lazyWithRetry(() => import('./components/modules/InboxModule'), 'Bandeja de Entrada');

interface CurrentUser {
  id: string;
  username: string;
  full_name: string;
  email?: string;
  role: 'admin' | 'vendedor' | 'cajero';
  is_active: boolean;
  assigned_terminal_id?: string | null;
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
        // Refresh assigned_terminal_id from database in background to avoid stale localStorage
        if (user?.id) {
          import('./lib/supabase').then(({ supabase }) => {
            supabase
              .from('users')
              .select('assigned_terminal_id, role, is_active')
              .eq('id', user.id)
              .single()
              .then(({ data }) => {
                if (data) {
                  const updatedUser = {
                    ...user,
                    role: data.role || user.role,
                    is_active: data.is_active ?? user.is_active,
                    assigned_terminal_id: data.assigned_terminal_id || null
                  };
                  localStorage.setItem('current_user', JSON.stringify(updatedUser));
                  setCurrentUser(updatedUser);
                }
              });
          });
        }
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
        <ErrorBoundary label={`el módulo ${currentModule}`} resetKey={currentModule}>
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
        </ErrorBoundary>
      </Layout>
    </>
  );
}

export default App;
