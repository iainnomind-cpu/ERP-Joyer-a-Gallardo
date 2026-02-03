import { useState, useEffect } from 'react';
import { LogOut } from 'lucide-react';
import Layout from './components/Layout';
import LoginModule from './components/modules/LoginModule';
import Dashboard from './components/modules/Dashboard';
import CRMModule from './components/modules/CRMModule';
import KanbanModule from './components/modules/KanbanModule';
import InventoryModule from './components/modules/InventoryModule';
import SalesModule from './components/modules/SalesModule';
import QuotesModule from './components/modules/QuotesModule';
import ConfigModule from './components/modules/ConfigModule';
import MarketingModule from './components/modules/MarketingModule';

interface CurrentUser {
  id: string;
  username: string;
  full_name: string;
  email?: string;
  role: 'admin' | 'vendedor' | 'cajero';
  is_active: boolean;
}

function App() {
  const [currentModule, setCurrentModule] = useState<'dashboard' | 'crm' | 'inventory' | 'sales' | 'config' | 'kanban' | 'marketing' | 'quotes'>('dashboard');
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('current_user');
    if (stored) {
      try {
        const user = JSON.parse(stored);
        setCurrentUser(user);
      } catch (e) {
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

  return (
    <>

      <Layout
        currentModule={currentModule}
        onModuleChange={setCurrentModule}
        currentUser={currentUser}
        onLogout={handleLogout}
      >
        {currentModule === 'dashboard' && <Dashboard currentUser={currentUser} />}
        {currentModule === 'crm' && <CRMModule currentUser={currentUser} />}
        {currentModule === 'kanban' && <KanbanModule currentUser={currentUser} />}
        {currentModule === 'inventory' && <InventoryModule currentUser={currentUser} />}
        {currentModule === 'sales' && <SalesModule currentUser={currentUser} />}
        {currentModule === 'quotes' && <QuotesModule currentUser={currentUser} />}
        {currentModule === 'marketing' && <MarketingModule currentUser={currentUser} />}
        {currentModule === 'config' && <ConfigModule currentUser={currentUser} />}
      </Layout>
    </>
  );
}

export default App;
