import React, { useMemo } from 'react';
import { Package, AlertTriangle, TrendingUp, DollarSign, Clock, CheckCircle } from 'lucide-react';
import { Product } from '../../lib/supabase';

interface DashboardOverviewProps {
    products: Product[];
    onNavigate: (tab: string) => void;
}

export function DashboardOverview({ products, onNavigate }: DashboardOverviewProps) {
    const metrics = useMemo(() => {
        const totalProducts = products.length;
        const published = products.filter(p => p.is_published_online).length;
        const lowStock = products.filter(p => p.total_stock > 0 && p.total_stock < (p.min_stock_alert || 5)).length;
        const outOfStock = products.filter(p => p.total_stock === 0).length;

        const totalValue = products.reduce((sum, p) => sum + (p.retail_price * p.total_stock), 0);

        return { totalProducts, published, lowStock, outOfStock, totalValue };
    }, [products]);

    const recentProducts = [...products]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5);

    return (
        <div className="space-y-6">
            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-gray-500 text-sm font-medium">Total Productos</p>
                            <h3 className="text-2xl font-bold text-gray-900 mt-1">{metrics.totalProducts}</h3>
                            <p className="text-sm text-green-600 mt-1 flex items-center gap-1">
                                <CheckCircle size={14} /> {metrics.published} Publicados
                            </p>
                        </div>
                        <div className="bg-blue-50 p-3 rounded-lg text-blue-600">
                            <Package size={24} />
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-gray-500 text-sm font-medium">Valor Inventario</p>
                            <h3 className="text-2xl font-bold text-gray-900 mt-1">
                                ${metrics.totalValue.toLocaleString('es-MX', { maximumFractionDigits: 0 })}
                            </h3>
                            <p className="text-sm text-gray-400 mt-1">Precio Venta</p>
                        </div>
                        <div className="bg-green-50 p-3 rounded-lg text-green-600">
                            <DollarSign size={24} />
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-gray-500 text-sm font-medium">Stock Bajo</p>
                            <h3 className="text-2xl font-bold text-gray-900 mt-1">{metrics.lowStock}</h3>
                            <p className="text-sm text-yellow-600 mt-1 flex items-center gap-1">
                                <AlertTriangle size={14} /> Requiere atención
                            </p>
                        </div>
                        <div className={`p-3 rounded-lg ${metrics.lowStock > 0 ? 'bg-yellow-50 text-yellow-600' : 'bg-gray-50 text-gray-400'}`}>
                            <TrendingUp size={24} />
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-gray-500 text-sm font-medium">Sin Stock</p>
                            <h3 className="text-2xl font-bold text-gray-900 mt-1">{metrics.outOfStock}</h3>
                            <p className="text-sm text-red-600 mt-1">No disponibles</p>
                        </div>
                        <div className={`p-3 rounded-lg ${metrics.outOfStock > 0 ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-400'}`}>
                            <AlertTriangle size={24} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent Products */}
                <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                        <h3 className="font-bold text-gray-900">Productos Recientes</h3>
                        <button
                            onClick={() => onNavigate('products')}
                            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                        >
                            Ver todos
                        </button>
                    </div>
                    <div className="divide-y divide-gray-100">
                        {recentProducts.map(product => (
                            <div key={product.id} className="p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors">
                                {product.image_url ? (
                                    <img src={product.image_url} alt="" className="w-12 h-12 rounded-lg object-cover bg-gray-100" />
                                ) : (
                                    <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400">
                                        <Package size={20} />
                                    </div>
                                )}
                                <div className="flex-1">
                                    <h4 className="font-medium text-gray-900">{product.name}</h4>
                                    <p className="text-sm text-gray-500">SKU: {product.sku}</p>
                                </div>
                                <div className="text-right">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${product.is_published_online ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                        }`}>
                                        {product.is_published_online ? 'Publicado' : 'Borrador'}
                                    </span>
                                    <p className="text-xs text-gray-500 mt-1">
                                        {new Date(product.created_at).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                        ))}
                        {recentProducts.length === 0 && (
                            <div className="p-8 text-center text-gray-500">
                                No hay productos registrados
                            </div>
                        )}
                    </div>
                </div>

                {/* Quick Actions & Alerts */}
                <div className="space-y-6">
                    {/* Quick Actions */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                        <h3 className="font-bold text-gray-900 mb-4">Acciones Rápidas</h3>
                        <div className="space-y-2">
                            <button
                                onClick={() => onNavigate('products-new')}
                                className="w-full flex items-center gap-3 p-3 text-left rounded-lg hover:bg-blue-50 text-blue-700 transition-colors"
                            >
                                <div className="bg-blue-100 p-2 rounded-lg">
                                    <Package size={18} />
                                </div>
                                <span className="font-medium">Nuevo Producto</span>
                            </button>
                            <button className="w-full flex items-center gap-3 p-3 text-left rounded-lg hover:bg-purple-50 text-purple-700 transition-colors">
                                <div className="bg-purple-100 p-2 rounded-lg">
                                    <TrendingUp size={18} />
                                </div>
                                <span className="font-medium">Ver Reportes</span>
                            </button>
                        </div>
                    </div>

                    {/* System Alerts */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                        <h3 className="font-bold text-gray-900 mb-4">Alertas del Sistema</h3>
                        <div className="space-y-3">
                            {metrics.lowStock > 0 && (
                                <div className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg text-sm text-yellow-800">
                                    <AlertTriangle size={16} className="mt-0.5" />
                                    <div>
                                        <span className="font-bold">Stock Bajo:</span> {metrics.lowStock} productos requieren reabastecimiento.
                                    </div>
                                </div>
                            )}
                            {metrics.outOfStock > 0 && (
                                <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg text-sm text-red-800">
                                    <AlertTriangle size={16} className="mt-0.5" />
                                    <div>
                                        <span className="font-bold">Sin Stock:</span> {metrics.outOfStock} productos agotados.
                                    </div>
                                </div>
                            )}
                            {metrics.lowStock === 0 && metrics.outOfStock === 0 && (
                                <div className="flex items-center gap-3 p-3 text-sm text-gray-500">
                                    <CheckCircle size={16} className="text-green-500" />
                                    Todo funciona correctamente.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
