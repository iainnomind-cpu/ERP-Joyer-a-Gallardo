import { useState, useEffect } from 'react';
import { supabase, Order } from '../../lib/supabase';
import { ShoppingBag, Truck, Store, CheckCircle, Clock, XCircle, Search, Eye, Package } from 'lucide-react';

export function WebOrders() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [filterType, setFilterType] = useState<string>('all');
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

    useEffect(() => {
        fetchOrders();
    }, []);

    const fetchOrders = async () => {
        setLoading(true);
        // Fetch only online orders
        const { data, error } = await supabase
            .from('orders')
            .select(`
                *,
                customer:customers(name, phone),
                items:order_items(
                    *,
                    product:products(name, sku, image_url)
                )
            `)
            .eq('sale_channel', 'online')
            .order('created_at', { ascending: false });

        if (data) setOrders(data);
        setLoading(false);
    };

    const handleStatusUpdate = async (orderId: string, newStatus: string) => {
        const { error } = await supabase
            .from('orders')
            .update({ status: newStatus })
            .eq('id', orderId);

        if (!error) {
            fetchOrders();
            if (selectedOrder?.id === orderId) {
                setSelectedOrder(prev => prev ? { ...prev, status: newStatus } : null);
            }
        }
    };

    const filteredOrders = orders.filter(order => {
        if (filterStatus !== 'all' && order.status !== filterStatus) return false;
        if (filterType !== 'all') {
            if (filterType === 'pickup' && order.delivery_method !== 'pickup') return false;
            if (filterType === 'shipping' && order.delivery_method !== 'shipping') return false;
        }
        return true;
    });

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending_payment': return 'bg-yellow-100 text-yellow-800';
            case 'paid': return 'bg-blue-100 text-blue-800';
            case 'processing': return 'bg-purple-100 text-purple-800';
            case 'shipped': return 'bg-indigo-100 text-indigo-800';
            case 'ready_for_pickup': return 'bg-teal-100 text-teal-800';
            case 'completed': return 'bg-green-100 text-green-800';
            case 'cancelled': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'pending_payment': return 'Pendiente de Pago';
            case 'paid': return 'Pagado';
            case 'processing': return 'Procesando';
            case 'shipped': return 'Enviado';
            case 'ready_for_pickup': return 'Listo para Recoger';
            case 'completed': return 'Completado';
            case 'cancelled': return 'Cancelado';
            default: return status;
        }
    };

    return (
        <div className="flex h-[calc(100vh-200px)] gap-6">
            {/* Orders List */}
            <div className="w-1/3 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col">
                <div className="p-4 border-b border-gray-200 space-y-3">
                    <h2 className="font-bold text-gray-800 flex items-center gap-2">
                        <ShoppingBag size={20} className="text-blue-600" />
                        Pedidos Web ({filteredOrders.length})
                    </h2>

                    <div className="flex gap-2">
                        <select
                            className="text-sm border rounded-lg px-2 py-1 flex-1"
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                        >
                            <option value="all">Todos los estados</option>
                            <option value="paid">Pagados (Nuevos)</option>
                            <option value="processing">Procesando</option>
                            <option value="ready_for_pickup">Listos p/ Recoger</option>
                            <option value="shipped">Enviados</option>
                            <option value="completed">Completados</option>
                        </select>
                        <select
                            className="text-sm border rounded-lg px-2 py-1 flex-1"
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                        >
                            <option value="all">Todo tipo</option>
                            <option value="pickup">Recoger en Tienda</option>
                            <option value="shipping">Envío a Domicilio</option>
                        </select>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="p-8 text-center text-gray-500">Cargando...</div>
                    ) : filteredOrders.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">No hay pedidos pendientes</div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {filteredOrders.map(order => (
                                <div
                                    key={order.id}
                                    onClick={() => setSelectedOrder(order)}
                                    className={`p-4 cursor-pointer hover:bg-blue-50 transition-colors ${selectedOrder?.id === order.id ? 'bg-blue-50 border-l-4 border-blue-500' : 'border-l-4 border-transparent'}`}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="font-bold text-gray-900">#{order.order_number}</span>
                                        <span className="text-xs text-gray-500">{new Date(order.created_at).toLocaleDateString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center mb-2">
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(order.status)}`}>
                                            {getStatusLabel(order.status)}
                                        </span>
                                        <span className="font-bold text-gray-700">${order.total.toLocaleString('es-MX')}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-gray-600">
                                        {order.delivery_method === 'pickup' ? (
                                            <><Store size={14} className="text-amber-600" /> Recoger en Tienda</>
                                        ) : (
                                            <><Truck size={14} className="text-blue-600" /> Envío a Domicilio</>
                                        )}
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1 truncate">
                                        {order.customer?.name || 'Cliente sin registro'}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Order Details */}
            <div className="w-2/3 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
                {selectedOrder ? (
                    <>
                        <div className="p-6 border-b border-gray-200 flex justify-between items-start bg-gray-50">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                                    Pedido #{selectedOrder.order_number}
                                    <span className={`text-sm px-3 py-1 rounded-full ${getStatusColor(selectedOrder.status)}`}>
                                        {getStatusLabel(selectedOrder.status)}
                                    </span>
                                </h1>
                                <p className="text-sm text-gray-500 mt-1">
                                    Realizado el {new Date(selectedOrder.created_at).toLocaleString()}
                                </p>
                            </div>

                            <div className="flex gap-2">
                                {selectedOrder.status === 'pending_payment' && (
                                    <button
                                        onClick={() => window.location.href = `/?module=sales&orderId=${selectedOrder.id}`}
                                        className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2 shadow-sm animate-pulse"
                                    >
                                        <Store size={18} /> Cobrar en Caja
                                    </button>
                                )}
                                {selectedOrder.status === 'paid' && (
                                    <button
                                        onClick={() => handleStatusUpdate(selectedOrder.id, 'processing')}
                                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 shadow-sm"
                                    >
                                        <Package size={18} /> Procesar Pedido
                                    </button>
                                )}
                                {selectedOrder.status === 'processing' && selectedOrder.delivery_method === 'shipping' && (
                                    <button
                                        onClick={() => handleStatusUpdate(selectedOrder.id, 'shipped')}
                                        className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center gap-2 shadow-sm"
                                    >
                                        <Truck size={18} /> Marcar Enviado
                                    </button>
                                )}
                                {selectedOrder.status === 'processing' && selectedOrder.delivery_method === 'pickup' && (
                                    <button
                                        onClick={() => handleStatusUpdate(selectedOrder.id, 'ready_for_pickup')}
                                        className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 flex items-center gap-2 shadow-sm"
                                    >
                                        <Store size={18} /> Listo para Recoger
                                    </button>
                                )}
                                {(selectedOrder.status === 'shipped' || selectedOrder.status === 'ready_for_pickup') && (
                                    <button
                                        onClick={() => handleStatusUpdate(selectedOrder.id, 'completed')}
                                        className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2 shadow-sm"
                                    >
                                        <CheckCircle size={18} /> Completar
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6">
                            <div className="grid grid-cols-2 gap-6 mb-8">
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                                        <Eye size={18} /> Cliente
                                    </h3>
                                    <p className="font-medium text-lg">{selectedOrder.customer?.name || 'Cliente Invitado'}</p>
                                    <p className="text-gray-600">{selectedOrder.customer?.phone}</p>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                                        {selectedOrder.delivery_method === 'pickup' ? <Store size={18} /> : <Truck size={18} />}
                                        {selectedOrder.delivery_method === 'pickup' ? 'Recoger en Tienda' : 'Envío a Domicilio'}
                                    </h3>
                                    {selectedOrder.delivery_method === 'shipping' ? (
                                        <div className="text-sm text-gray-700 whitespace-pre-line">
                                            {selectedOrder.delivery_address || 'Dirección no especificada'}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-gray-600">El cliente pasará a recoger a la sucursal.</p>
                                    )}
                                </div>
                            </div>

                            <h3 className="font-bold text-gray-800 mb-4">Productos ({selectedOrder.items?.length || 0})</h3>
                            <div className="border rounded-lg overflow-hidden mb-6">
                                <table className="w-full text-left">
                                    <thead className="bg-gray-50 border-b">
                                        <tr>
                                            <th className="p-3 text-sm font-medium text-gray-500">Producto</th>
                                            <th className="p-3 text-sm font-medium text-gray-500 text-center">Cant</th>
                                            <th className="p-3 text-sm font-medium text-gray-500 text-right">Precio</th>
                                            <th className="p-3 text-sm font-medium text-gray-500 text-right">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {(selectedOrder.items as any[])?.map((item, idx) => (
                                            <tr key={idx}>
                                                <td className="p-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center">
                                                            {item.product?.image_url ? (
                                                                <img src={item.product.image_url} className="w-full h-full object-cover rounded" />
                                                            ) : (
                                                                <span className="text-xs">IMG</span>
                                                            )}
                                                        </div>
                                                        <div>
                                                            <p className="font-medium text-sm">{item.product?.name || 'Producto eliminado'}</p>
                                                            <p className="text-xs text-gray-500">{item.product?.sku}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-3 text-center text-sm">{item.quantity}</td>
                                                <td className="p-3 text-right text-sm">${item.unit_price}</td>
                                                <td className="p-3 text-right font-medium text-sm">${item.subtotal}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="bg-gray-50">
                                        <tr>
                                            <td colSpan={3} className="p-3 text-right font-bold">Total</td>
                                            <td className="p-3 text-right font-bold bg-blue-50 text-blue-800">${selectedOrder.total.toLocaleString('es-MX')}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>

                            {selectedOrder.notes && (
                                <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                                    <h4 className="font-bold text-yellow-800 text-sm mb-1">Notas del pedido:</h4>
                                    <p className="text-sm text-yellow-700">{selectedOrder.notes}</p>
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                        <ShoppingBag size={64} className="mb-4 opacity-20" />
                        <p className="text-lg font-medium">Selecciona un pedido para ver detalles</p>
                    </div>
                )}
            </div>
        </div>
    );
}
