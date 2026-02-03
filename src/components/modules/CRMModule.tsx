import { useState, useEffect } from 'react';
import { supabase, Customer, ChurnAlert, CreditTransaction } from '../../lib/supabase';
import { UserPlus, Search, AlertTriangle, TrendingUp, Users, Phone, Edit2, Trash2, CreditCard, DollarSign, History, Plus, Minus, RefreshCw } from 'lucide-react';

interface CurrentUser {
  id: string;
  username: string;
  full_name: string;
  email?: string;
  role: 'admin' | 'vendedor' | 'cajero';
  is_active: boolean;
}

interface CRMModuleProps {
  currentUser: CurrentUser | null;
}

export default function CRMModule({ currentUser }: CRMModuleProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [churnAlerts, setChurnAlerts] = useState<ChurnAlert[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [showCreditHistoryModal, setShowCreditHistoryModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [selectedCustomerForCredit, setSelectedCustomerForCredit] = useState<Customer | null>(null);
  const [creditTransactions, setCreditTransactions] = useState<CreditTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [creditStats, setCreditStats] = useState({
    totalCustomersWithCredit: 0,
    totalCreditGranted: 0,
    totalCreditUsed: 0,
    totalCreditAvailable: 0,
    customersOver80Percent: 0,
    customersMaxedOut: 0
  });
  const [stats, setStats] = useState({
    total: 0,
    plataPreference: 0,
    oroPreference: 0,
    churnRisk: 0
  });

  const [creditOperation, setCreditOperation] = useState({
    type: 'charge' as 'charge' | 'payment' | 'adjustment' | 'limit_change',
    amount: 0,
    reference: '',
    notes: ''
  });

  useEffect(() => {
    loadCustomers();
    loadChurnAlerts();
    loadCreditStats();
  }, []);

  const getUserName = () => currentUser?.full_name || 'Sistema';

  const loadCustomers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setCustomers(data);
      calculateStats(data);
    }
    setLoading(false);
  };

  const loadChurnAlerts = async () => {
    const { data } = await supabase
      .from('churn_alerts')
      .select('*')
      .eq('status', 'pending')
      .order('days_inactive', { ascending: false });

    if (data) {
      setChurnAlerts(data);
    }
  };

  const loadCreditStats = async () => {
    const { data, error } = await supabase.rpc('get_credit_stats');
    if (!error && data && data.length > 0) {
      setCreditStats({
        totalCustomersWithCredit: data[0].totalCustomersWithCredit || 0,
        totalCreditGranted: data[0].totalCreditGranted || 0,
        totalCreditUsed: data[0].totalCreditUsed || 0,
        totalCreditAvailable: data[0].totalCreditAvailable || 0,
        customersOver80Percent: data[0].customersOver80Percent || 0,
        customersMaxedOut: data[0].customersMaxedOut || 0
      });
    }
  };

  const loadCreditTransactions = async (customerId: string) => {
    const { data } = await supabase
      .from('credit_transactions')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });

    if (data) {
      setCreditTransactions(data);
    }
  };

  const calculateStats = (data: Customer[]) => {
    setStats({
      total: data.length,
      plataPreference: data.filter(c => c.material_preference === 'Plata Pura').length,
      oroPreference: data.filter(c => c.material_preference === 'Baño de Oro').length,
      churnRisk: data.filter(c => {
        if (!c.last_purchase_date) return false;
        const daysSince = Math.floor((Date.now() - new Date(c.last_purchase_date).getTime()) / (1000 * 60 * 60 * 24));
        return daysSince > 45;
      }).length
    });
  };

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone.includes(searchTerm)
  );

  const handleAddCustomer = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const creditLimit = parseFloat(formData.get('credit_limit') as string) || 0;
    const creditStatus = creditLimit > 0 ? (formData.get('credit_status') as string) : 'none';

    const { error } = await supabase
      .from('customers')
      .insert({
        name: formData.get('name') as string,
        phone: formData.get('phone') as string,
        source: formData.get('source') as string,
        material_preference: formData.get('material_preference') as string,
        credit_limit: creditLimit,
        credit_used: 0,
        credit_status: creditStatus,
        credit_notes: formData.get('credit_notes') as string || null
      });

    if (!error) {
      setShowAddModal(false);
      loadCustomers();
      loadCreditStats();
      e.currentTarget.reset();
    }
  };

  const handleResolveChurn = async (alertId: string) => {
    await supabase
      .from('churn_alerts')
      .update({ status: 'contacted', resolved_at: new Date().toISOString() })
      .eq('id', alertId);

    loadChurnAlerts();
  };

  const handleEditCustomer = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingCustomer) return;

    const formData = new FormData(e.currentTarget);
    const creditLimit = parseFloat(formData.get('credit_limit') as string) || 0;
    const creditStatus = creditLimit > 0 ? (formData.get('credit_status') as string) : 'none';

    const { error } = await supabase
      .from('customers')
      .update({
        name: formData.get('name') as string,
        phone: formData.get('phone') as string,
        source: formData.get('source') as string,
        material_preference: formData.get('material_preference') as string,
        credit_limit: creditLimit,
        credit_status: creditStatus,
        credit_notes: formData.get('credit_notes') as string || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', editingCustomer.id);

    if (!error) {
      setShowEditModal(false);
      setEditingCustomer(null);
      loadCustomers();
      loadCreditStats();
    }
  };

  const handleDeleteCustomer = async (customer: Customer) => {
    const confirmDelete = window.confirm(
      `¿Estás seguro de eliminar al cliente "${customer.name}"?\n\nEsta acción no se puede deshacer.`
    );

    if (!confirmDelete) return;

    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', customer.id);

    if (!error) {
      loadCustomers();
      loadChurnAlerts();
      loadCreditStats();
    } else {
      alert('Error al eliminar el cliente. Verifica que no tenga pedidos asociados.');
    }
  };

  const openEditModal = (customer: Customer) => {
    setEditingCustomer(customer);
    setShowEditModal(true);
  };

  const openCreditModal = (customer: Customer) => {
    setSelectedCustomerForCredit(customer);
    setShowCreditModal(true);
    setCreditOperation({
      type: 'charge',
      amount: 0,
      reference: '',
      notes: ''
    });
  };

  const openCreditHistory = async (customer: Customer) => {
    setSelectedCustomerForCredit(customer);
    await loadCreditTransactions(customer.id);
    setShowCreditHistoryModal(true);
  };

  const handleCreditOperation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerForCredit) return;

    const { error } = await supabase.rpc('register_credit_transaction', {
      p_customer_id: selectedCustomerForCredit.id,
      p_transaction_type: creditOperation.type,
      p_amount: creditOperation.amount,
      p_reference: creditOperation.reference || null,
      p_notes: creditOperation.notes || null,
      p_created_by: getUserName()
    });

    if (!error) {
      setShowCreditModal(false);
      setSelectedCustomerForCredit(null);
      loadCustomers();
      loadCreditStats();
      alert('Operación de crédito registrada exitosamente');
    } else {
      alert('Error al registrar la operación de crédito');
    }
  };

  const getCreditStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'suspended': return 'bg-yellow-100 text-yellow-800';
      case 'blocked': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCreditStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Activo';
      case 'suspended': return 'Suspendido';
      case 'blocked': return 'Bloqueado';
      default: return 'Sin crédito';
    }
  };

  const getCreditUsagePercentage = (customer: Customer) => {
    if (customer.credit_limit === 0) return 0;
    return (customer.credit_used / customer.credit_limit) * 100;
  };

  const getCreditUsageColor = (percentage: number) => {
    if (percentage >= 100) return 'bg-red-500';
    if (percentage >= 80) return 'bg-orange-500';
    if (percentage >= 60) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getTransactionTypeIcon = (type: string) => {
    switch (type) {
      case 'charge': return <Plus className="w-4 h-4" />;
      case 'payment': return <Minus className="w-4 h-4" />;
      case 'adjustment': return <RefreshCw className="w-4 h-4" />;
      case 'limit_change': return <CreditCard className="w-4 h-4" />;
      default: return <DollarSign className="w-4 h-4" />;
    }
  };

  const getTransactionTypeText = (type: string) => {
    switch (type) {
      case 'charge': return 'Cargo';
      case 'payment': return 'Pago';
      case 'adjustment': return 'Ajuste';
      case 'limit_change': return 'Cambio de Límite';
      default: return type;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Módulo CRM</h2>
          <p className="text-gray-600 mt-1">Gestión centralizada de clientes, relaciones y líneas de crédito</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          <span>Nuevo Cliente</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Clientes</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.total}</p>
            </div>
            <Users className="w-10 h-10 text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Preferencia Plata</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.plataPreference}</p>
            </div>
            <TrendingUp className="w-10 h-10 text-gray-400" />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Preferencia Oro</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.oroPreference}</p>
            </div>
            <TrendingUp className="w-10 h-10 text-yellow-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Riesgo Churn</p>
              <p className="text-3xl font-bold text-red-600 mt-1">{stats.churnRisk}</p>
            </div>
            <AlertTriangle className="w-10 h-10 text-red-500" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border-2 border-green-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-white" />
            </div>
            <span className="text-3xl font-bold text-green-700">{creditStats.totalCustomersWithCredit}</span>
          </div>
          <p className="text-sm font-medium text-green-900">Clientes con Crédito</p>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg border-2 border-blue-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
          </div>
          <p className="text-2xl font-bold text-blue-900">${creditStats.totalCreditGranted.toLocaleString('es-MX')}</p>
          <p className="text-sm font-medium text-blue-700">Crédito Total Otorgado</p>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-lg border-2 border-orange-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
          </div>
          <p className="text-2xl font-bold text-orange-900">${creditStats.totalCreditUsed.toLocaleString('es-MX')}</p>
          <p className="text-sm font-medium text-orange-700">Crédito en Uso</p>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-pink-50 rounded-lg border-2 border-red-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="w-12 h-12 bg-red-500 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-white" />
            </div>
            <span className="text-3xl font-bold text-red-700">{creditStats.customersMaxedOut}</span>
          </div>
          <p className="text-sm font-medium text-red-900">Crédito al Límite</p>
        </div>
      </div>

      {churnAlerts.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-red-900">Alertas de Clientes Inactivos</h3>
              <p className="text-sm text-red-700 mt-1">
                {churnAlerts.length} cliente{churnAlerts.length > 1 ? 's' : ''} con más de 45 días sin compra
              </p>
              <div className="mt-3 space-y-2">
                {churnAlerts.slice(0, 3).map((alert) => {
                  const customer = customers.find(c => c.id === alert.customer_id);
                  return (
                    <div key={alert.id} className="flex items-center justify-between bg-white rounded p-2">
                      <div>
                        <p className="font-medium text-sm">{customer?.name}</p>
                        <p className="text-xs text-gray-600">{alert.days_inactive} días inactivo</p>
                      </div>
                      <button
                        onClick={() => handleResolveChurn(alert.id)}
                        className="text-xs px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                      >
                        Contactar
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar por nombre o teléfono..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Teléfono
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Preferencia
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Compras Totales
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Línea de Crédito
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado Crédito
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    Cargando clientes...
                  </td>
                </tr>
              ) : filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    No se encontraron clientes
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((customer) => {
                  const creditAvailable = customer.credit_limit - customer.credit_used;
                  const usagePercentage = getCreditUsagePercentage(customer);

                  return (
                    <tr key={customer.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">{customer.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-gray-600">
                          <Phone className="w-4 h-4 mr-2" />
                          {customer.phone}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          customer.material_preference === 'Plata Pura'
                            ? 'bg-gray-100 text-gray-700'
                            : customer.material_preference === 'Baño de Oro'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {customer.material_preference}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                        ${customer.total_purchases.toLocaleString('es-MX')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {customer.credit_limit > 0 ? (
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-medium text-gray-900">
                                ${creditAvailable.toLocaleString('es-MX')}
                              </span>
                              <span className="text-xs text-gray-500">
                                / ${customer.credit_limit.toLocaleString('es-MX')}
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                              <div
                                className={`h-2 rounded-full ${getCreditUsageColor(usagePercentage)}`}
                                style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                              />
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">Sin crédito</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${getCreditStatusColor(customer.credit_status)}`}>
                          {getCreditStatusText(customer.credit_status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => openEditModal(customer)}
                            className="text-blue-600 hover:text-blue-800 transition-colors"
                            title="Editar cliente"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {customer.credit_limit > 0 && (
                            <>
                              <button
                                onClick={() => openCreditModal(customer)}
                                className="text-green-600 hover:text-green-800 transition-colors"
                                title="Gestionar crédito"
                              >
                                <CreditCard className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => openCreditHistory(customer)}
                                className="text-gray-600 hover:text-gray-800 transition-colors"
                                title="Ver historial"
                              >
                                <History className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => handleDeleteCustomer(customer)}
                            className="text-red-600 hover:text-red-800 transition-colors"
                            title="Eliminar cliente"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6 my-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Nuevo Cliente</h3>
            <form onSubmit={handleAddCustomer} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre completo
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Origen
                  </label>
                  <select
                    name="source"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  >
                    <option value="WhatsApp">WhatsApp</option>
                    <option value="Facebook">Facebook</option>
                    <option value="Instagram">Instagram</option>
                    <option value="Centro Joyero">Centro Joyero</option>
                    <option value="Referido">Referido</option>
                    <option value="manual">Manual</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Preferencia de Material
                  </label>
                  <select
                    name="material_preference"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  >
                    <option value="Ambos">Ambos</option>
                    <option value="Plata Pura">Plata Pura</option>
                    <option value="Baño de Oro">Baño de Oro</option>
                  </select>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4 mt-4">
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                  <CreditCard className="w-5 h-5 mr-2" />
                  Configuración de Línea de Crédito
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Límite de Crédito (MXN)
                    </label>
                    <input
                      type="number"
                      name="credit_limit"
                      min="0"
                      step="100"
                      defaultValue="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">Dejar en 0 para no asignar crédito</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Estado del Crédito
                    </label>
                    <select
                      name="credit_status"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    >
                      <option value="active">Activo</option>
                      <option value="suspended">Suspendido</option>
                      <option value="blocked">Bloqueado</option>
                    </select>
                  </div>
                </div>
                <div className="mt-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notas de Crédito
                  </label>
                  <textarea
                    name="credit_notes"
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="Notas adicionales sobre el crédito del cliente..."
                  />
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
                >
                  Crear Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditModal && editingCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-2 sm:p-4">
          <div className="bg-white rounded-lg w-full max-w-[95vw] sm:max-w-2xl lg:max-w-3xl max-h-[95vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-3 sm:px-4 md:px-6 py-3 sm:py-4 rounded-t-lg z-10">
              <h3 className="text-base sm:text-lg md:text-xl font-bold text-gray-900">Editar Cliente</h3>
            </div>
            <div className="px-3 sm:px-4 md:px-6 py-4">
              <form onSubmit={handleEditCustomer} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                      Nombre completo
                    </label>
                    <input
                      type="text"
                      name="name"
                      required
                      defaultValue={editingCustomer.name}
                      className="w-full px-2 sm:px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                      Teléfono
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      required
                      defaultValue={editingCustomer.phone}
                      className="w-full px-2 sm:px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                      Origen
                    </label>
                    <select
                      name="source"
                      defaultValue={editingCustomer.source}
                      className="w-full px-2 sm:px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="WhatsApp">WhatsApp</option>
                      <option value="Facebook">Facebook</option>
                      <option value="Instagram">Instagram</option>
                      <option value="Centro Joyero">Centro Joyero</option>
                      <option value="Referido">Referido</option>
                      <option value="manual">Manual</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                      Preferencia de Material
                    </label>
                    <select
                      name="material_preference"
                      defaultValue={editingCustomer.material_preference}
                      className="w-full px-2 sm:px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="Ambos">Ambos</option>
                      <option value="Plata Pura">Plata Pura</option>
                      <option value="Baño de Oro">Baño de Oro</option>
                    </select>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-600 mb-1">
                    <span className="font-medium">Compras totales:</span> ${editingCustomer.total_purchases.toLocaleString('es-MX')}
                  </p>
                  {editingCustomer.last_purchase_date && (
                    <p className="text-xs text-gray-600">
                      <span className="font-medium">Última compra:</span>{' '}
                      {new Date(editingCustomer.last_purchase_date).toLocaleDateString('es-MX')}
                    </p>
                  )}
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <h4 className="text-sm sm:text-base font-semibold text-gray-900 mb-3 flex items-center">
                    <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                    Línea de Crédito
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                        Límite de Crédito (MXN)
                      </label>
                      <input
                        type="number"
                        name="credit_limit"
                        min="0"
                        step="100"
                        defaultValue={editingCustomer.credit_limit}
                        className="w-full px-2 sm:px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                        Estado del Crédito
                      </label>
                      <select
                        name="credit_status"
                        defaultValue={editingCustomer.credit_status}
                        className="w-full px-2 sm:px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="none">Sin crédito</option>
                        <option value="active">Activo</option>
                        <option value="suspended">Suspendido</option>
                        <option value="blocked">Bloqueado</option>
                      </select>
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm">
                        <div>
                          <span className="text-blue-700 font-medium">Crédito Usado:</span>
                          <span className="ml-2 text-blue-900">${editingCustomer.credit_used.toLocaleString('es-MX')}</span>
                        </div>
                        <div>
                          <span className="text-blue-700 font-medium">Crédito Disponible:</span>
                          <span className="ml-2 text-blue-900">${(editingCustomer.credit_limit - editingCustomer.credit_used).toLocaleString('es-MX')}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3">
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                      Notas de Crédito
                    </label>
                    <textarea
                      name="credit_notes"
                      rows={2}
                      defaultValue={editingCustomer.credit_notes || ''}
                      className="w-full px-2 sm:px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Notas adicionales sobre el crédito del cliente..."
                    />
                  </div>
                </div>
              </form>
            </div>

            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-3 sm:px-4 md:px-6 py-3 sm:py-4 rounded-b-lg">
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingCustomer(null);
                  }}
                  className="w-full sm:flex-1 px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  onClick={(e) => {
                    const form = e.currentTarget.closest('.bg-white')?.querySelector('form') as HTMLFormElement;
                    if (form) {
                      form.requestSubmit();
                    }
                  }}
                  className="w-full sm:flex-1 px-3 sm:px-4 py-2 text-sm sm:text-base bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Guardar Cambios
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCreditModal && selectedCustomerForCredit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-2 sm:p-4">
          <div className="bg-white rounded-lg w-full max-w-[95vw] sm:max-w-md lg:max-w-lg max-h-[95vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-3 sm:px-4 md:px-6 py-3 sm:py-4 rounded-t-lg z-10">
              <h3 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 flex items-center">
                <CreditCard className="w-5 h-5 sm:w-6 sm:h-6 mr-2" />
                Gestionar Crédito
              </h3>
            </div>
            <div className="px-3 sm:px-4 md:px-6 py-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4 mb-4">
                <p className="font-semibold text-blue-900 mb-2 text-sm sm:text-base">{selectedCustomerForCredit.name}</p>
                <div className="space-y-1 text-xs sm:text-sm">
                  <div className="flex justify-between">
                    <span className="text-blue-700">Límite de Crédito:</span>
                    <span className="font-medium text-blue-900">${selectedCustomerForCredit.credit_limit.toLocaleString('es-MX')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700">Crédito Usado:</span>
                    <span className="font-medium text-blue-900">${selectedCustomerForCredit.credit_used.toLocaleString('es-MX')}</span>
                  </div>
                  <div className="flex justify-between border-t border-blue-300 pt-1 mt-1">
                    <span className="text-blue-700 font-semibold">Crédito Disponible:</span>
                    <span className="font-bold text-green-700">${(selectedCustomerForCredit.credit_limit - selectedCustomerForCredit.credit_used).toLocaleString('es-MX')}</span>
                  </div>
                </div>
              </div>

              <form onSubmit={handleCreditOperation} className="space-y-3 sm:space-y-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                    Tipo de Operación
                  </label>
                  <select
                    value={creditOperation.type}
                    onChange={(e) => setCreditOperation({ ...creditOperation, type: e.target.value as any })}
                    className="w-full px-2 sm:px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="charge">Cargo (aumentar deuda)</option>
                    <option value="payment">Pago (reducir deuda)</option>
                    <option value="adjustment">Ajuste</option>
                    <option value="limit_change">Cambiar Límite</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    {creditOperation.type === 'limit_change' ? 'Nuevo Límite' : 'Monto'}
                  </label>
                  <input
                    type="number"
                    value={creditOperation.amount || ''}
                    onChange={(e) => setCreditOperation({ ...creditOperation, amount: parseFloat(e.target.value) || 0 })}
                    min="0"
                    step="0.01"
                    required
                    className="w-full px-2 sm:px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    Referencia (opcional)
                  </label>
                  <input
                    type="text"
                    value={creditOperation.reference}
                    onChange={(e) => setCreditOperation({ ...creditOperation, reference: e.target.value })}
                    className="w-full px-2 sm:px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Ej: Pedido #123, Factura #456"
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    Notas (opcional)
                  </label>
                  <textarea
                    value={creditOperation.notes}
                    onChange={(e) => setCreditOperation({ ...creditOperation, notes: e.target.value })}
                    rows={2}
                    className="w-full px-2 sm:px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Detalles adicionales de la operación..."
                  />
                </div>
              </form>
            </div>

            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-3 sm:px-4 md:px-6 py-3 sm:py-4 rounded-b-lg">
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreditModal(false);
                    setSelectedCustomerForCredit(null);
                  }}
                  className="w-full sm:flex-1 px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  onClick={(e) => {
                    const form = e.currentTarget.closest('.bg-white')?.querySelector('form') as HTMLFormElement;
                    if (form) {
                      form.requestSubmit();
                    }
                  }}
                  className="w-full sm:flex-1 px-3 sm:px-4 py-2 text-sm sm:text-base bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Registrar Operación
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCreditHistoryModal && selectedCustomerForCredit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-4xl w-full p-6 my-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900 flex items-center">
                <History className="w-6 h-6 mr-2" />
                Historial de Crédito
              </h3>
              <button
                onClick={() => {
                  setShowCreditHistoryModal(false);
                  setSelectedCustomerForCredit(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="font-semibold text-blue-900 mb-2">{selectedCustomerForCredit.name}</p>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-blue-700">Límite:</span>
                  <span className="ml-2 font-medium text-blue-900">${selectedCustomerForCredit.credit_limit.toLocaleString('es-MX')}</span>
                </div>
                <div>
                  <span className="text-blue-700">Usado:</span>
                  <span className="ml-2 font-medium text-blue-900">${selectedCustomerForCredit.credit_used.toLocaleString('es-MX')}</span>
                </div>
                <div>
                  <span className="text-blue-700">Disponible:</span>
                  <span className="ml-2 font-bold text-green-700">${(selectedCustomerForCredit.credit_limit - selectedCustomerForCredit.credit_used).toLocaleString('es-MX')}</span>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Monto</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Balance Anterior</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nuevo Balance</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Referencia</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {creditTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                        No hay transacciones de crédito registradas
                      </td>
                    </tr>
                  ) : (
                    creditTransactions.map((transaction) => (
                      <tr key={transaction.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                          {new Date(transaction.created_at).toLocaleDateString('es-MX', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <span className={`p-1 rounded ${
                              transaction.transaction_type === 'charge' ? 'bg-red-100 text-red-700' :
                              transaction.transaction_type === 'payment' ? 'bg-green-100 text-green-700' :
                              transaction.transaction_type === 'adjustment' ? 'bg-blue-100 text-blue-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {getTransactionTypeIcon(transaction.transaction_type)}
                            </span>
                            <span className="text-sm font-medium text-gray-900">
                              {getTransactionTypeText(transaction.transaction_type)}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`text-sm font-semibold ${
                            transaction.transaction_type === 'charge' ? 'text-red-600' :
                            transaction.transaction_type === 'payment' ? 'text-green-600' :
                            'text-gray-900'
                          }`}>
                            ${transaction.amount.toLocaleString('es-MX')}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                          ${transaction.previous_balance.toLocaleString('es-MX')}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                          ${transaction.new_balance.toLocaleString('es-MX')}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {transaction.reference || '-'}
                          {transaction.notes && (
                            <div className="text-xs text-gray-500 mt-1">{transaction.notes}</div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={() => {
                  setShowCreditHistoryModal(false);
                  setSelectedCustomerForCredit(null);
                }}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
