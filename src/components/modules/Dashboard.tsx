import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
  Users,
  Package,
  ShoppingCart,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Calendar
} from 'lucide-react';

interface CurrentUser {
  id: string;
  username: string;
  full_name: string;
  email?: string;
  role: 'admin' | 'vendedor' | 'cajero';
  is_active: boolean;
}

interface DashboardProps {
  currentUser: CurrentUser | null;
}

export default function Dashboard({ currentUser }: DashboardProps) {
  const [stats, setStats] = useState({
    totalCustomers: 0,
    totalProducts: 0,
    totalOrders: 0,
    totalRevenue: 0,
    pendingOrders: 0,
    lowStockProducts: 0,
    churnAlerts: 0,
    recentOrders: [] as any[]
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);

    const [
      customersResult,
      productsResult,
      ordersResult,
      stockAlertsResult,
      churnAlertsResult,
      recentOrdersResult
    ] = await Promise.all([
      supabase.from('customers').select('*', { count: 'exact' }),
      supabase.from('products').select('*'),
      supabase.from('orders').select('*'),
      supabase.from('stock_alerts').select('*').eq('status', 'active'),
      supabase.from('churn_alerts').select('*').eq('status', 'pending'),
      supabase.from('orders').select('*, customers(name)').order('created_at', { ascending: false }).limit(5)
    ]);

    const customers = customersResult.data || [];
    const products = productsResult.data || [];
    const orders = ordersResult.data || [];
    const stockAlerts = stockAlertsResult.data || [];
    const churnAlerts = churnAlertsResult.data || [];
    const recentOrders = recentOrdersResult.data || [];

    const totalRevenue = orders
      .filter(o => o.payment_status === 'paid')
      .reduce((sum, o) => sum + o.total, 0);

    const pendingOrders = orders.filter(
      o => o.status === 'quoted' || o.status === 'draft'
    ).length;

    setStats({
      totalCustomers: customers.length,
      totalProducts: products.length,
      totalOrders: orders.length,
      totalRevenue,
      pendingOrders,
      lowStockProducts: stockAlerts.length,
      churnAlerts: churnAlerts.length,
      recentOrders
    });

    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-lg border-2 border-amber-200 p-6">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 bg-amber-500 rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-2xl">
              {currentUser?.full_name?.charAt(0) || 'U'}
            </span>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Bienvenido, {currentUser?.full_name || 'Usuario'}
            </h2>
            <p className="text-amber-700">
              Rol: {currentUser?.role === 'admin' ? 'Administrador' :
                    currentUser?.role === 'vendedor' ? 'Vendedor' : 'Cajero'}
            </p>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold text-gray-900">Dashboard General</h2>
        <p className="text-gray-600 mt-1">Vista general del sistema ERP Gallardo Joyas</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Total Clientes</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalCustomers}</p>
              <p className="text-xs text-gray-500 mt-2">Base de datos CRM</p>
            </div>
            <div className="w-14 h-14 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="w-8 h-8 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Productos</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalProducts}</p>
              <p className="text-xs text-gray-500 mt-2">En catálogo</p>
            </div>
            <div className="w-14 h-14 bg-green-100 rounded-lg flex items-center justify-center">
              <Package className="w-8 h-8 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Pedidos</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalOrders}</p>
              <p className="text-xs text-orange-600 mt-2 font-medium">
                {stats.pendingOrders} pendientes
              </p>
            </div>
            <div className="w-14 h-14 bg-orange-100 rounded-lg flex items-center justify-center">
              <ShoppingCart className="w-8 h-8 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Ingresos</p>
              <p className="text-3xl font-bold text-green-600 mt-2">
                ${stats.totalRevenue.toLocaleString('es-MX')}
              </p>
              <p className="text-xs text-gray-500 mt-2">Total histórico</p>
            </div>
            <div className="w-14 h-14 bg-green-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-8 h-8 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg border border-red-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-red-200 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-700" />
            </div>
            <span className="text-3xl font-bold text-red-700">{stats.churnAlerts}</span>
          </div>
          <h3 className="font-semibold text-red-900">Alertas de Churn</h3>
          <p className="text-sm text-red-700 mt-1">Clientes inactivos por más de 45 días</p>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg border border-orange-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-orange-200 rounded-lg flex items-center justify-center">
              <Package className="w-6 h-6 text-orange-700" />
            </div>
            <span className="text-3xl font-bold text-orange-700">{stats.lowStockProducts}</span>
          </div>
          <h3 className="font-semibold text-orange-900">Stock Bajo</h3>
          <p className="text-sm text-orange-700 mt-1">Productos que requieren reabastecimiento</p>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-200 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-blue-700" />
            </div>
            <span className="text-3xl font-bold text-blue-700">{stats.pendingOrders}</span>
          </div>
          <h3 className="font-semibold text-blue-900">Pedidos Pendientes</h3>
          <p className="text-sm text-blue-700 mt-1">Cotizaciones en proceso</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
            <Calendar className="w-5 h-5 mr-2 text-gray-600" />
            Pedidos Recientes
          </h3>
          <div className="space-y-3">
            {stats.recentOrders.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No hay pedidos recientes</p>
            ) : (
              stats.recentOrders.map((order: any) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div>
                    <p className="font-medium text-gray-900">#{order.order_number}</p>
                    <p className="text-sm text-gray-600">{order.customers?.name || 'Sin cliente'}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-amber-600">${order.total.toLocaleString('es-MX')}</p>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      order.status === 'confirmed' || order.status === 'paid'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {order.status === 'draft' ? 'Borrador' :
                       order.status === 'quoted' ? 'Cotizado' :
                       order.status === 'confirmed' ? 'Confirmado' :
                       order.status === 'paid' ? 'Pagado' : order.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Módulos del Sistema</h3>
          <div className="space-y-3">
            <div className="flex items-center p-4 bg-blue-50 rounded-lg border border-blue-200">
              <Users className="w-8 h-8 text-blue-600 mr-4" />
              <div>
                <p className="font-semibold text-gray-900">CRM</p>
                <p className="text-sm text-gray-600">Gestión de clientes y segmentación</p>
              </div>
            </div>

            <div className="flex items-center p-4 bg-green-50 rounded-lg border border-green-200">
              <Package className="w-8 h-8 text-green-600 mr-4" />
              <div>
                <p className="font-semibold text-gray-900">Inventario</p>
                <p className="text-sm text-gray-600">Control de stock y catálogo digital</p>
              </div>
            </div>

            <div className="flex items-center p-4 bg-amber-50 rounded-lg border border-amber-200">
              <ShoppingCart className="w-8 h-8 text-amber-600 mr-4" />
              <div>
                <p className="font-semibold text-gray-900">Ventas</p>
                <p className="text-sm text-gray-600">Cotización y cálculo automático de mayoreo</p>
              </div>
            </div>

            <div className="flex items-center p-4 bg-gray-50 rounded-lg border border-gray-200">
              <TrendingUp className="w-8 h-8 text-gray-600 mr-4" />
              <div>
                <p className="font-semibold text-gray-900">Configuración</p>
                <p className="text-sm text-gray-600">Reglas y políticas de negocio</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-lg border border-amber-200 p-6">
        <div className="flex items-start space-x-4">
          <div className="w-12 h-12 bg-amber-200 rounded-lg flex items-center justify-center flex-shrink-0">
            <TrendingUp className="w-6 h-6 text-amber-700" />
          </div>
          <div>
            <h3 className="font-bold text-amber-900 text-lg mb-2">
              Sistema ERP para Gallardo Joyas
            </h3>
            <p className="text-amber-800 mb-3">
              Plataforma completa de gestión empresarial con cuatro módulos interconectados
              diseñados para automatizar y formalizar los procesos de negocio.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-amber-600 rounded-full mt-1.5"></div>
                <p className="text-sm text-amber-900">
                  <span className="font-semibold">CRM:</span> Base de datos centralizada de clientes
                  con detección automática de churn
                </p>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-amber-600 rounded-full mt-1.5"></div>
                <p className="text-sm text-amber-900">
                  <span className="font-semibold">Inventario:</span> Control preciso de stock con
                  trazabilidad completa de movimientos
                </p>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-amber-600 rounded-full mt-1.5"></div>
                <p className="text-sm text-amber-900">
                  <span className="font-semibold">Ventas:</span> Calculadora automática de mayoreo
                  al superar $3,000 MXN
                </p>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-amber-600 rounded-full mt-1.5"></div>
                <p className="text-sm text-amber-900">
                  <span className="font-semibold">Configuración:</span> Gestión flexible de reglas
                  sin necesidad de reprogramación
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
