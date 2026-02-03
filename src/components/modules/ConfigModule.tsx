import { useState, useEffect } from 'react';
import { supabase, BusinessRule, User } from '../../lib/supabase';
import { Settings, DollarSign, AlertCircle, Save, Edit2, X, Users, Plus, Check } from 'lucide-react';

interface ConfigModuleProps {
  currentUser: User | null;
}

export default function ConfigModule({ currentUser }: ConfigModuleProps) {
  const [rules, setRules] = useState<BusinessRule[]>([]);
  const [editingRule, setEditingRule] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userForm, setUserForm] = useState({
    username: '',
    full_name: '',
    email: '',
    password: '',
    role: 'vendedor' as 'admin' | 'vendedor' | 'cajero',
    is_active: true
  });

  useEffect(() => {
    loadBusinessRules();
    loadUsers();
  }, []);

  const loadBusinessRules = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('business_rules')
      .select('*')
      .order('rule_name', { ascending: true });

    if (!error && data) {
      setRules(data);
    }
    setLoading(false);
  };

  const loadUsers = async () => {
    const { data } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setUsers(data);
  };

  const handleUpdateRule = async (ruleId: string, newValue: any) => {
    const { error } = await supabase
      .from('business_rules')
      .update({
        rule_value: newValue,
        updated_at: new Date().toISOString()
      })
      .eq('id', ruleId);

    if (!error) {
      setEditingRule(null);
      loadBusinessRules();
    }
  };

  const handleToggleActive = async (ruleId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('business_rules')
      .update({
        is_active: !currentStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', ruleId);

    if (!error) {
      loadBusinessRules();
    }
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingUser) {
      const updateData: any = {
        full_name: userForm.full_name,
        email: userForm.email || null,
        role: userForm.role,
        is_active: userForm.is_active,
        updated_at: new Date().toISOString()
      };

      if (userForm.password) {
        updateData.password_hash = userForm.password;
      }

      const { error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', editingUser.id);

      if (!error) {
        alert('Usuario actualizado correctamente');
        setShowUserModal(false);
        loadUsers();
      }
    } else {
      const { error } = await supabase
        .from('users')
        .insert({
          username: userForm.username,
          full_name: userForm.full_name,
          email: userForm.email || null,
          password_hash: userForm.password,
          role: userForm.role,
          is_active: userForm.is_active
        });

      if (error) {
        if (error.code === '23505') {
          alert('El nombre de usuario ya existe');
        } else {
          alert('Error al crear usuario');
        }
      } else {
        alert('Usuario creado correctamente');
        setShowUserModal(false);
        loadUsers();
      }
    }
  };

  const handleToggleUserStatus = async (user: User) => {
    if (user.id === currentUser?.id) {
      alert('No puedes desactivar tu propio usuario');
      return;
    }

    const action = user.is_active ? 'desactivar' : 'activar';
    if (!confirm(`¿Está seguro de ${action} al usuario ${user.full_name}?`)) {
      return;
    }

    const { error } = await supabase
      .from('users')
      .update({
        is_active: !user.is_active,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (!error) {
      alert(`Usuario ${action === 'desactivar' ? 'desactivado' : 'activado'} correctamente`);
      loadUsers();
    }
  };

  if (currentUser?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">Acceso Denegado</h3>
          <p className="text-gray-600">Solo administradores pueden acceder a este módulo</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Módulo de Configuración</h2>
          <p className="text-gray-600 mt-1">Gestión centralizada de reglas y políticas de negocio</p>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h3 className="font-semibold text-blue-900">Maestro de Políticas</h3>
            <p className="text-sm text-blue-700 mt-1">
              Las reglas configuradas aquí afectan directamente el comportamiento del sistema.
              Modifica los umbrales y políticas según las necesidades del negocio sin necesidad de reprogramación.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Umbral de Mayoreo</h3>
              <p className="text-sm text-gray-600">Monto mínimo para precios de mayorista</p>
            </div>
          </div>

          {rules.map((rule) => {
            if (rule.rule_key !== 'wholesale_threshold') return null;

            const isEditing = editingRule === rule.id;
            const currentAmount = rule.rule_value.amount;

            return (
              <div key={rule.id} className="space-y-4">
                <div>
                  {isEditing ? (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Monto en MXN
                        </label>
                        <input
                          type="number"
                          id={`amount-${rule.id}`}
                          defaultValue={currentAmount}
                          min="0"
                          step="100"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        />
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            const input = document.getElementById(`amount-${rule.id}`) as HTMLInputElement;
                            const newAmount = parseInt(input.value);
                            handleUpdateRule(rule.id, { amount: newAmount, currency: 'MXN' });
                          }}
                          className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                        >
                          <Save className="w-4 h-4" />
                          <span>Guardar</span>
                        </button>
                        <button
                          onClick={() => setEditingRule(null)}
                          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-baseline justify-between mb-3">
                        <div>
                          <span className="text-4xl font-bold text-amber-600">
                            ${currentAmount.toLocaleString('es-MX')}
                          </span>
                          <span className="text-gray-600 ml-2">MXN</span>
                        </div>
                        <button
                          onClick={() => setEditingRule(rule.id)}
                          className="text-amber-600 hover:text-amber-800"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                      </div>
                      <p className="text-sm text-gray-600">
                        Cuando el total de un pedido supera este monto, se aplican automáticamente
                        los precios de la lista de Mayoreo.
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <span className="text-sm text-gray-700">Estado de la regla</span>
                  <button
                    onClick={() => handleToggleActive(rule.id, rule.is_active)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      rule.is_active
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {rule.is_active ? 'Activa' : 'Inactiva'}
                  </button>
                </div>

                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-600">
                    <span className="font-medium">Última actualización:</span>{' '}
                    {new Date(rule.updated_at).toLocaleString('es-MX')}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Detección de Churn</h3>
              <p className="text-sm text-gray-600">Días de inactividad para alerta</p>
            </div>
          </div>

          {rules.map((rule) => {
            if (rule.rule_key !== 'churn_days') return null;

            const isEditing = editingRule === rule.id;
            const currentDays = rule.rule_value.days;

            return (
              <div key={rule.id} className="space-y-4">
                <div>
                  {isEditing ? (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Días sin compra
                        </label>
                        <input
                          type="number"
                          id={`days-${rule.id}`}
                          defaultValue={currentDays}
                          min="1"
                          step="1"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        />
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            const input = document.getElementById(`days-${rule.id}`) as HTMLInputElement;
                            const newDays = parseInt(input.value);
                            handleUpdateRule(rule.id, { days: newDays });
                          }}
                          className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                        >
                          <Save className="w-4 h-4" />
                          <span>Guardar</span>
                        </button>
                        <button
                          onClick={() => setEditingRule(null)}
                          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-baseline justify-between mb-3">
                        <div>
                          <span className="text-4xl font-bold text-red-600">
                            {currentDays}
                          </span>
                          <span className="text-gray-600 ml-2">días</span>
                        </div>
                        <button
                          onClick={() => setEditingRule(rule.id)}
                          className="text-amber-600 hover:text-amber-800"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                      </div>
                      <p className="text-sm text-gray-600">
                        Los clientes que no han realizado compras durante este periodo
                        generarán una alerta automática para reactivación.
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <span className="text-sm text-gray-700">Estado de la regla</span>
                  <button
                    onClick={() => handleToggleActive(rule.id, rule.is_active)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      rule.is_active
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {rule.is_active ? 'Activa' : 'Inactiva'}
                  </button>
                </div>

                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-600">
                    <span className="font-medium">Última actualización:</span>{' '}
                    {new Date(rule.updated_at).toLocaleString('es-MX')}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center space-x-3 mb-6">
          <Settings className="w-6 h-6 text-gray-600" />
          <div>
            <h3 className="font-bold text-gray-900">Listas de Precios</h3>
            <p className="text-sm text-gray-600">Las listas de precios se gestionan a nivel de producto</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-gray-900">Lista Minorista</h4>
              <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">Activa</span>
            </div>
            <p className="text-sm text-gray-600">
              Precios estándar aplicados a ventas individuales y pedidos que no alcanzan el umbral de mayoreo.
            </p>
          </div>

          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-gray-900">Lista Mayorista</h4>
              <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">Activa</span>
            </div>
            <p className="text-sm text-gray-600">
              Precios especiales aplicados automáticamente cuando el pedido supera el umbral configurado.
            </p>
          </div>
        </div>

        <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-sm text-amber-800">
            <span className="font-semibold">Nota:</span> Los precios individuales de cada producto
            se configuran en el Módulo de Inventario. Aquí solo se gestionan las políticas generales.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Gestión de Usuarios</h3>
              <p className="text-sm text-gray-600">Administrar usuarios y permisos del sistema</p>
            </div>
          </div>
          <button
            onClick={() => {
              setEditingUser(null);
              setUserForm({
                username: '',
                full_name: '',
                email: '',
                password: '',
                role: 'vendedor',
                is_active: true
              });
              setShowUserModal(true);
            }}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Usuario</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-700 font-medium">Total Usuarios</p>
            <p className="text-3xl font-bold text-blue-900 mt-1">{users.length}</p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm text-green-700 font-medium">Usuarios Activos</p>
            <p className="text-3xl font-bold text-green-900 mt-1">
              {users.filter(u => u.is_active).length}
            </p>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <p className="text-sm text-purple-700 font-medium">Vendedores</p>
            <p className="text-3xl font-bold text-purple-900 mt-1">
              {users.filter(u => u.role === 'vendedor' && u.is_active).length}
            </p>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-sm text-amber-700 font-medium">Cajeros</p>
            <p className="text-3xl font-bold text-amber-900 mt-1">
              {users.filter(u => u.role === 'cajero' && u.is_active).length}
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usuario</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre Completo</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rol</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold text-sm">
                          {user.full_name.charAt(0)}
                        </span>
                      </div>
                      <span className="font-medium text-gray-900">{user.username}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-900">
                    {user.full_name}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                    {user.email || '-'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                      user.role === 'admin' ? 'bg-red-100 text-red-700' :
                      user.role === 'vendedor' ? 'bg-blue-100 text-blue-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {user.role === 'admin' ? 'Administrador' :
                       user.role === 'vendedor' ? 'Vendedor' : 'Cajero'}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                      user.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {user.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          setEditingUser(user);
                          setUserForm({
                            username: user.username,
                            full_name: user.full_name,
                            email: user.email || '',
                            password: '',
                            role: user.role,
                            is_active: user.is_active
                          });
                          setShowUserModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-800"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleToggleUserStatus(user)}
                        disabled={user.id === currentUser?.id}
                        className="text-amber-600 hover:text-amber-800 disabled:text-gray-400 disabled:cursor-not-allowed"
                        title={user.is_active ? 'Desactivar' : 'Activar'}
                      >
                        {user.is_active ? <X className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center space-x-3 mb-6">
          <Settings className="w-6 h-6 text-gray-600" />
          <div>
            <h3 className="font-bold text-gray-900">Ventajas del Sistema de Reglas</h3>
            <p className="text-sm text-gray-600">Flexibilidad sin reprogramación</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border-l-4 border-green-500 pl-4">
            <h4 className="font-semibold text-gray-900 mb-2">Adaptabilidad</h4>
            <p className="text-sm text-gray-600">
              Modifica umbrales y políticas según las condiciones del mercado sin necesidad de desarrollo.
            </p>
          </div>

          <div className="border-l-4 border-blue-500 pl-4">
            <h4 className="font-semibold text-gray-900 mb-2">Consistencia</h4>
            <p className="text-sm text-gray-600">
              Todas las reglas se aplican uniformemente en todos los módulos del sistema.
            </p>
          </div>

          <div className="border-l-4 border-amber-500 pl-4">
            <h4 className="font-semibold text-gray-900 mb-2">Control</h4>
            <p className="text-sm text-gray-600">
              Activa o desactiva reglas según sea necesario para pruebas o ajustes temporales.
            </p>
          </div>
        </div>
      </div>

      {showUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              {editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
            </h3>

            <form onSubmit={handleSaveUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre de Usuario
                </label>
                <input
                  type="text"
                  value={userForm.username}
                  onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                  disabled={!!editingUser}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  required
                />
                {editingUser && (
                  <p className="text-xs text-gray-500 mt-1">
                    El nombre de usuario no puede modificarse
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  value={userForm.full_name}
                  onChange={(e) => setUserForm({ ...userForm, full_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email (opcional)
                </label>
                <input
                  type="email"
                  value={userForm.email}
                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {editingUser ? 'Nueva Contraseña (dejar vacío para mantener actual)' : 'Contraseña'}
                </label>
                <input
                  type="password"
                  value={userForm.password}
                  onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required={!editingUser}
                  minLength={4}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Mínimo 4 caracteres
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rol
                </label>
                <select
                  value={userForm.role}
                  onChange={(e) => setUserForm({ ...userForm, role: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  disabled={editingUser?.id === currentUser?.id}
                >
                  <option value="vendedor">Vendedor</option>
                  <option value="cajero">Cajero</option>
                  <option value="admin">Administrador</option>
                </select>
                {editingUser?.id === currentUser?.id && (
                  <p className="text-xs text-amber-600 mt-1">
                    No puedes cambiar tu propio rol
                  </p>
                )}
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={userForm.is_active}
                  onChange={(e) => setUserForm({ ...userForm, is_active: e.target.checked })}
                  disabled={editingUser?.id === currentUser?.id}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="is_active" className="ml-2 text-sm text-gray-700">
                  Usuario activo
                </label>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowUserModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {editingUser ? 'Actualizar' : 'Crear Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
