import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { LogIn, User, AlertCircle } from 'lucide-react';

interface CurrentUser {
  id: string;
  username: string;
  full_name: string;
  email?: string;
  role: 'admin' | 'vendedor' | 'cajero';
  is_active: boolean;
}

interface LoginModuleProps {
  onLoginSuccess: (user: CurrentUser) => void;
}

export default function LoginModule({ onLoginSuccess }: LoginModuleProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username.trim()) {
      setError('Por favor ingresa tu nombre de usuario');
      return;
    }

    if (!password.trim()) {
      setError('Por favor ingresa tu contraseña');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data, error: queryError } = await supabase
        .from('users')
        .select('*')
        .eq('username', username.trim())
        .eq('password_hash', password)
        .maybeSingle();

      if (queryError) {
        console.error('Error al buscar usuario:', queryError);
        setError('Error al conectar con el servidor');
        setLoading(false);
        return;
      }

      if (!data) {
        setError('Usuario o contraseña incorrectos');
        setLoading(false);
        return;
      }

      if (!data.is_active) {
        setError('Usuario desactivado. Contacte al administrador');
        setLoading(false);
        return;
      }

      const currentUser: CurrentUser = {
        id: data.id,
        username: data.username,
        full_name: data.full_name,
        email: data.email || undefined,
        role: data.role,
        is_active: data.is_active
      };

      localStorage.setItem('current_user', JSON.stringify(currentUser));

      onLoginSuccess(currentUser);
    } catch (err) {
      console.error('Error inesperado:', err);
      setError('Error inesperado al iniciar sesión');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-yellow-50 to-amber-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-amber-400 to-yellow-600 rounded-2xl shadow-2xl mb-4">
            <span className="text-white font-bold text-4xl">GJ</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Gallardo Joyas</h1>
          <p className="text-gray-600">Sistema ERP - Iniciar Sesión</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
          <div className="flex items-center justify-center w-12 h-12 bg-amber-100 rounded-full mx-auto mb-6">
            <User className="w-6 h-6 text-amber-700" />
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                Nombre de Usuario
              </label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setError('');
                }}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-colors"
                placeholder="Ingresa tu usuario"
                disabled={loading}
                autoFocus
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Contraseña
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-colors"
                placeholder="Ingresa tu contraseña"
                disabled={loading}
                required
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-amber-500 to-yellow-600 text-white font-semibold rounded-lg hover:from-amber-600 hover:to-yellow-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Verificando...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  <span>Iniciar Sesión</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-800">
              <strong>Usuarios por defecto:</strong><br/>
              • admin / admin (Administrador)<br/>
              • vendedor1 / vendedor1 (Vendedor)<br/>
              • cajero1 / cajero1 (Cajero)
            </p>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="text-center text-sm text-gray-600">
              <p className="mb-2">Roles disponibles:</p>
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">Admin</span>
                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">Vendedor</span>
                <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">Cajero</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center text-sm text-gray-600">
          <p>Sistema de gestión empresarial</p>
          <p className="text-xs text-gray-500 mt-1">Versión 1.0 - 2024</p>
        </div>
      </div>
    </div>
  );
}
