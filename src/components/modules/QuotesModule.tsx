import { useState, useEffect, useRef } from 'react';
import { supabase, Order, Customer, OrderItem, Product } from '../../lib/supabase';
import {
  FileText,
  Download,
  Eye,
  Calendar,
  DollarSign,
  User,
  Phone,
  Mail,
  MapPin,
  TrendingUp,
  Filter,
  X,
  Printer,
  CheckCircle,
  Clock,
  XCircle,
  Search,
  Plus
} from 'lucide-react';
import NewQuoteModal from './NewQuoteModal';

interface OrderWithDetails extends Order {
  customer?: Customer;
  items?: (OrderItem & { product?: Product })[];
}

export default function QuotesModule() {
  const [quotes, setQuotes] = useState<OrderWithDetails[]>([]);
  const [filteredQuotes, setFilteredQuotes] = useState<OrderWithDetails[]>([]);
  const [selectedQuote, setSelectedQuote] = useState<OrderWithDetails | null>(null);
  const [showNewQuoteModal, setShowNewQuoteModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showPrintView, setShowPrintView] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const printRef = useRef<HTMLDivElement>(null);

  const [stats, setStats] = useState({
    total: 0,
    draft: 0,
    quoted: 0,
    confirmed: 0,
    totalValue: 0,
    avgValue: 0
  });

  const [currentUser, setCurrentUser] = useState<{
    id: string;
    name: string;
  }>({ id: '', name: '' });

  useEffect(() => {
    const getUserInfo = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUser({
          id: user.id,
          name: user.email?.split('@')[0] || user.user_metadata?.name || 'Usuario'
        });
      }
    };
    getUserInfo();
  }, []);

  useEffect(() => {
    loadQuotes();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [quotes, searchTerm, filterStatus, filterDateFrom, filterDateTo]);

  const loadQuotes = async () => {
    setLoading(true);

    const { data: ordersData, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && ordersData) {
      const customerIds = [...new Set(ordersData.map(o => o.customer_id).filter(Boolean))];
      const { data: customersData } = await supabase
        .from('customers')
        .select('*')
        .in('id', customerIds);

      const { data: itemsData } = await supabase
        .from('order_items')
        .select('*, products(*)')
        .in('order_id', ordersData.map(o => o.id));

      const quotesWithDetails: OrderWithDetails[] = ordersData.map(order => ({
        ...order,
        customer: customersData?.find(c => c.id === order.customer_id),
        items: itemsData?.filter(item => item.order_id === order.id).map(item => ({
          ...item,
          product: item.products as Product
        }))
      }));

      setQuotes(quotesWithDetails);
      calculateStats(quotesWithDetails);
    }

    setLoading(false);
  };

  const calculateStats = (data: OrderWithDetails[]) => {
    const total = data.length;
    const draft = data.filter(q => q.status === 'draft').length;
    const quoted = data.filter(q => q.status === 'quoted').length;
    const confirmed = data.filter(q => q.status === 'confirmed' || q.payment_status === 'paid').length;
    const totalValue = data.reduce((sum, q) => sum + q.total, 0);
    const avgValue = total > 0 ? totalValue / total : 0;

    setStats({ total, draft, quoted, confirmed, totalValue, avgValue });
  };

  const applyFilters = () => {
    let filtered = quotes;

    if (searchTerm) {
      filtered = filtered.filter(q =>
        q.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.customer?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.customer?.phone.includes(searchTerm)
      );
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(q => q.status === filterStatus);
    }

    if (filterDateFrom) {
      filtered = filtered.filter(q => new Date(q.created_at) >= new Date(filterDateFrom));
    }

    if (filterDateTo) {
      filtered = filtered.filter(q => new Date(q.created_at) <= new Date(filterDateTo + 'T23:59:59'));
    }

    setFilteredQuotes(filtered);
  };

  const handlePrintQuote = () => {
    setShowPrintView(true);
    setTimeout(() => {
      window.print();
      setTimeout(() => setShowPrintView(false), 100);
    }, 100);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-700';
      case 'quoted': return 'bg-yellow-100 text-yellow-700';
      case 'confirmed': return 'bg-green-100 text-green-700';
      case 'paid': return 'bg-blue-100 text-blue-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft': return <Clock className="w-4 h-4" />;
      case 'quoted': return <FileText className="w-4 h-4" />;
      case 'confirmed': return <CheckCircle className="w-4 h-4" />;
      case 'paid': return <CheckCircle className="w-4 h-4" />;
      default: return <XCircle className="w-4 h-4" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'draft': return 'Borrador';
      case 'quoted': return 'Cotizado';
      case 'confirmed': return 'Confirmado';
      case 'paid': return 'Pagado';
      default: return status;
    }
  };

  return (
    <div className="space-y-6">
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-area, #print-area * {
            visibility: visible;
          }
          #print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          @page {
            margin: 1cm;
            size: letter;
          }
        }
      `}</style>

      {!showPrintView && (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Módulo de Cotizaciones</h2>
              <p className="text-gray-600 mt-1">Gestiona y visualiza todas tus cotizaciones con historial completo</p>
            </div>
            <button
              onClick={() => setShowNewQuoteModal(true)}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md hover:shadow-lg"
            >
              <Plus className="w-5 h-5" />
              Nueva Cotización
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Cotizaciones</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{stats.total}</p>
                </div>
                <FileText className="w-10 h-10 text-blue-500" />
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Cotizadas</p>
                  <p className="text-3xl font-bold text-yellow-600 mt-1">{stats.quoted}</p>
                </div>
                <Clock className="w-10 h-10 text-yellow-500" />
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Confirmadas</p>
                  <p className="text-3xl font-bold text-green-600 mt-1">{stats.confirmed}</p>
                </div>
                <CheckCircle className="w-10 h-10 text-green-500" />
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Valor Total</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">
                    ${stats.totalValue.toLocaleString('es-MX', { maximumFractionDigits: 0 })}
                  </p>
                </div>
                <DollarSign className="w-10 h-10 text-green-500" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Filtros de Búsqueda
              </h3>
              <button
                onClick={() => {
                  setSearchTerm('');
                  setFilterStatus('all');
                  setFilterDateFrom('');
                  setFilterDateTo('');
                }}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Limpiar filtros
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Buscar por cliente o número..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Todos los estados</option>
                <option value="draft">Borradores</option>
                <option value="quoted">Cotizados</option>
                <option value="confirmed">Confirmados</option>
                <option value="paid">Pagados</option>
              </select>

              <input
                type="date"
                placeholder="Desde"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />

              <input
                type="date"
                placeholder="Hasta"
                value={filterDateTo}
                onChange={(e) => setFilterDateTo(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {(searchTerm || filterStatus !== 'all' || filterDateFrom || filterDateTo) && (
              <div className="mt-3 text-sm text-gray-600">
                Mostrando {filteredQuotes.length} de {stats.total} cotizaciones
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Historial de Cotizaciones</h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Número</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                        Cargando cotizaciones...
                      </td>
                    </tr>
                  ) : filteredQuotes.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                        No se encontraron cotizaciones
                      </td>
                    </tr>
                  ) : (
                    filteredQuotes.map((quote) => (
                      <tr key={quote.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-medium text-gray-900">#{quote.order_number}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="font-medium text-gray-900">
                              {quote.customer?.name || 'Público General'}
                            </div>
                            {quote.customer?.phone && (
                              <div className="text-sm text-gray-500">{quote.customer.phone}</div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            quote.order_type === 'wholesale'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {quote.order_type === 'wholesale' ? 'Mayoreo' : 'Menudeo'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-semibold text-gray-900">
                            ${quote.total.toLocaleString('es-MX')}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full ${getStatusColor(quote.status)}`}>
                            {getStatusIcon(quote.status)}
                            {getStatusText(quote.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {new Date(quote.created_at).toLocaleDateString('es-MX', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => setSelectedQuote(quote)}
                            className="text-blue-600 hover:text-blue-800 transition-colors"
                            title="Ver detalles"
                          >
                            <Eye className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {showNewQuoteModal && (
        <NewQuoteModal
          onClose={() => setShowNewQuoteModal(false)}
          onSuccess={() => {
            loadQuotes();
            setShowNewQuoteModal(false);
          }}
        />
      )}

      {selectedQuote && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg w-full max-w-full sm:max-w-2xl md:max-w-3xl lg:max-w-4xl xl:max-w-5xl my-2 sm:my-4 md:my-8 mx-2 sm:mx-4 max-h-[95vh] overflow-hidden flex flex-col">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-3 sm:px-4 md:px-6 py-3 sm:py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 rounded-t-lg z-10">
              <h3 className="text-xl font-bold text-gray-900">
                Cotización #{selectedQuote.order_number}
              </h3>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={handlePrintQuote}
                  className="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Printer className="w-4 h-4" />
                  Imprimir PDF
                </button>
                <button
                  onClick={() => setSelectedQuote(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div id="print-area" ref={printRef} className="p-3 sm:p-4 md:p-6 overflow-y-auto flex-1">
              <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border-2 border-amber-200 rounded-lg p-4 sm:p-6 mb-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-yellow-600 rounded-lg flex items-center justify-center">
                        <span className="text-white font-bold text-2xl">GJ</span>
                      </div>
                      <div>
                        <h1 className="text-2xl font-bold text-gray-900">Gallardo Joyas</h1>
                        <p className="text-sm text-gray-600">Joyería de Plata Pura y Baño de Oro</p>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Cotización</p>
                    <p className="text-2xl font-bold text-amber-700">#{selectedQuote.order_number}</p>
                    <p className="text-sm text-gray-600 mt-1">
                      {new Date(selectedQuote.created_at).toLocaleDateString('es-MX', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Información del Cliente</h4>
                    {selectedQuote.customer ? (
                      <div className="space-y-1 text-sm">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-500" />
                          <span className="font-medium text-gray-900">{selectedQuote.customer.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-gray-500" />
                          <span className="text-gray-700">{selectedQuote.customer.phone}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-gray-500" />
                          <span className="text-gray-700">
                            Preferencia: {selectedQuote.customer.material_preference}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-gray-600">Público General</p>
                    )}
                  </div>

                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Detalles de la Cotización</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Tipo:</span>
                        <span className="font-medium text-gray-900">
                          {selectedQuote.order_type === 'wholesale' ? 'Mayoreo' : 'Menudeo'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Estado:</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs ${getStatusColor(selectedQuote.status)}`}>
                          {getStatusText(selectedQuote.status)}
                        </span>
                      </div>
                      {selectedQuote.delivery_method && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Entrega:</span>
                          <span className="font-medium text-gray-900">
                            {selectedQuote.delivery_method === 'pickup' ? 'Recolección' : 'Envío'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {selectedQuote.delivery_address && (
                  <div className="mt-4 pt-4 border-t border-amber-200">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-gray-500 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Dirección de Entrega</p>
                        <p className="text-sm text-gray-700">{selectedQuote.delivery_address}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="mb-6">
                <h4 className="font-semibold text-gray-900 mb-4">Productos Cotizados</h4>
                <div className="border border-gray-200 rounded-lg overflow-x-auto">
                  <table className="w-full min-w-[600px]">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase">Producto</th>
                        <th className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                        <th className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 text-center text-xs font-medium text-gray-500 uppercase">Cantidad</th>
                        <th className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 text-right text-xs font-medium text-gray-500 uppercase">Precio Unit.</th>
                        <th className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 text-right text-xs font-medium text-gray-500 uppercase">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {selectedQuote.items?.map((item) => (
                        <tr key={item.id}>
                          <td className="px-2 sm:px-3 md:px-4 py-2 sm:py-3">
                            <div className="font-medium text-gray-900">{item.product?.name || 'Producto'}</div>
                            {item.product?.material && (
                              <div className="text-xs text-gray-500">{item.product.material}</div>
                            )}
                          </td>
                          <td className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 text-sm text-gray-600">
                            {item.product?.sku || '-'}
                          </td>
                          <td className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 text-center text-sm text-gray-900">
                            {item.quantity}
                          </td>
                          <td className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 text-right text-sm text-gray-900">
                            ${item.unit_price.toLocaleString('es-MX')}
                          </td>
                          <td className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 text-right font-medium text-gray-900">
                            ${item.subtotal.toLocaleString('es-MX')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-3 sm:p-4 md:p-6">
                <div className="space-y-2 w-full sm:max-w-md sm:ml-auto">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="font-medium text-gray-900">
                      ${selectedQuote.subtotal.toLocaleString('es-MX')}
                    </span>
                  </div>
                  {selectedQuote.order_type === 'wholesale' && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Descuento Mayoreo:</span>
                      <span className="font-medium">
                        -${(selectedQuote.subtotal - selectedQuote.total).toLocaleString('es-MX')}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold border-t border-gray-300 pt-2">
                    <span className="text-gray-900">Total:</span>
                    <span className="text-amber-600">
                      ${selectedQuote.total.toLocaleString('es-MX')} MXN
                    </span>
                  </div>
                </div>
              </div>

              {selectedQuote.notes && (
                <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Notas</h4>
                  <p className="text-sm text-gray-700">{selectedQuote.notes}</p>
                </div>
              )}

              {selectedQuote.payment_link && (
                <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Enlace de Pago</h4>
                  <p className="text-sm text-gray-700 break-all">{selectedQuote.payment_link}</p>
                </div>
              )}

              <div className="mt-8 pt-6 border-t border-gray-200 text-center text-sm text-gray-500">
                <p>Esta cotización es válida por 15 días a partir de la fecha de emisión</p>
                <p className="mt-2">Gracias por su preferencia - Gallardo Joyas</p>
                <p className="mt-1">Centro Joyero, Guadalajara, Jalisco</p>
              </div>
            </div>

            <div className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg">
              <button
                onClick={() => setSelectedQuote(null)}
                className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
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
