import { Users, Package, ShoppingCart, Settings, LayoutDashboard, Trello, Megaphone, FileText, LogOut, User, Globe } from 'lucide-react';

interface CurrentUser {
  id: string;
  username: string;
  full_name: string;
  email?: string;
  role: 'admin' | 'vendedor' | 'cajero';
  is_active: boolean;
}

type LayoutProps = {
  children: ReactNode;
  currentModule: 'dashboard' | 'crm' | 'inventory' | 'sales' | 'config' | 'kanban' | 'marketing' | 'quotes' | 'ecommerce';
  onModuleChange: (module: 'dashboard' | 'crm' | 'inventory' | 'sales' | 'config' | 'kanban' | 'marketing' | 'quotes' | 'ecommerce') => void;
  currentUser: CurrentUser;
  onLogout: () => void;
};

export default function Layout({ children, currentModule, onModuleChange, currentUser, onLogout }: LayoutProps) {
  const modules = [
    { id: 'dashboard' as const, name: 'Dashboard', icon: LayoutDashboard },
    { id: 'crm' as const, name: 'CRM', icon: Users },
    { id: 'kanban' as const, name: 'Pipeline', icon: Trello },
    { id: 'inventory' as const, name: 'Inventario', icon: Package },
    { id: 'sales' as const, name: 'Ventas', icon: ShoppingCart },
    { id: 'quotes' as const, name: 'Cotizaciones', icon: FileText },
    { id: 'ecommerce' as const, name: 'E-commerce', icon: Globe },
    { id: 'marketing' as const, name: 'Marketing', icon: Megaphone },
    { id: 'config' as const, name: 'Configuración', icon: Settings },
  ];

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-blue-100 text-blue-700';
      case 'vendedor': return 'bg-green-100 text-green-700';
      case 'cajero': return 'bg-purple-100 text-purple-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getRoleText = (role: string) => {
    switch (role) {
      case 'admin': return 'Admin';
      case 'vendedor': return 'Vendedor';
      case 'cajero': return 'Cajero';
      default: return role;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
            <div className="flex items-center space-x-2 flex-shrink-0">
              <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-yellow-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">GJ</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Gallardo Joyas</h1>
                <p className="text-xs text-gray-500">Sistema ERP</p>
              </div>
            </div>

            <div className="flex space-x-1 overflow-x-auto">
              {modules.map((module) => {
                const Icon = module.icon;
                const isActive = currentModule === module.id;
                return (
                  <button
                    key={module.id}
                    onClick={() => onModuleChange(module.id)}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${isActive
                      ? 'bg-amber-50 text-amber-700'
                      : 'text-gray-600 hover:bg-gray-100'
                      }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{module.name}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-gray-400 to-gray-600 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-gray-900">{currentUser.full_name}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getRoleBadgeColor(currentUser.role)}`}>
                      {getRoleText(currentUser.role)}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={onLogout}
                className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg transition-colors border border-red-200"
                title="Cerrar Sesión"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-sm font-medium">Salir</span>
              </button>
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
