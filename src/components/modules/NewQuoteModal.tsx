import { useState, useEffect } from 'react';
import { supabase, Customer, Product } from '../../lib/supabase';
import { X, Trash2, Search, User, Phone, AlertCircle, Plus, Tag, Package, CreditCard, FileText } from 'lucide-react';

interface NewQuoteModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

interface CartItem {
  product: Product;
  quantity: number;
}

export default function NewQuoteModal({ onClose, onSuccess }: NewQuoteModalProps) {
  const [customerMode, setCustomerMode] = useState<'existing' | 'new'>('existing');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [productsLoading, setProductsLoading] = useState(false);
  const [error, setError] = useState('');
  const [addedProductId, setAddedProductId] = useState<string | null>(null);

  const [newCustomerForm, setNewCustomerForm] = useState({
    name: '',
    phone: '',
    source: 'manual',
    material_preference: 'ambos',
    credit_limit: 0,
    credit_status: 'none',
    credit_notes: ''
  });

  const [orderDetails, setOrderDetails] = useState({
    order_type: 'retail' as 'retail' | 'wholesale',
    delivery_method: 'pickup' as 'pickup' | 'delivery',
    delivery_address: '',
    notes: ''
  });

  useEffect(() => {
    loadCustomers();
    loadProducts();
  }, []);

  useEffect(() => {
    filterProducts();
  }, [productSearchTerm, allProducts]);

  const loadCustomers = async () => {
    const { data } = await supabase
      .from('customers')
      .select('*')
      .order('name');
    if (data) setCustomers(data);
  };

  const loadProducts = async () => {
    setProductsLoading(true);

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .gt('total_stock', 0)
      .order('total_stock', { ascending: false })
      .order('name');

    if (!error && data) {
      setAllProducts(data);
      setFilteredProducts(data);
    }

    setProductsLoading(false);
  };

  const filterProducts = () => {
    if (!productSearchTerm.trim()) {
      setFilteredProducts(allProducts);
      return;
    }

    const searchLower = productSearchTerm.toLowerCase();
    const filtered = allProducts.filter(product =>
      product.name.toLowerCase().includes(searchLower) ||
      product.sku.toLowerCase().includes(searchLower) ||
      product.material.toLowerCase().includes(searchLower)
    );

    setFilteredProducts(filtered);
  };

  const isLowStock = (stock: number) => {
    return stock <= 10 && stock > 0;
  };

  const addToCart = (product: Product) => {
    const existingItem = cart.find(item => item.product.id === product.id);

    if (existingItem) {
      const newQuantity = existingItem.quantity + 1;
      if (newQuantity > product.total_stock) {
        setError(`Stock insuficiente. Solo hay ${product.total_stock} unidades disponibles.`);
        setTimeout(() => setError(''), 3000);
        return;
      }
      setCart(cart.map(item =>
        item.product.id === product.id
          ? { ...item, quantity: newQuantity }
          : item
      ));
    } else {
      setCart([...cart, { product, quantity: 1 }]);
    }

    setAddedProductId(product.id);
    setTimeout(() => setAddedProductId(null), 1000);
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (isNaN(quantity) || quantity < 1) {
      return;
    }

    const item = cart.find(item => item.product.id === productId);
    if (!item) return;

    if (quantity > item.product.total_stock) {
      setError(`Stock insuficiente. Solo hay ${item.product.total_stock} unidades disponibles.`);
      setTimeout(() => setError(''), 3000);
      return;
    }

    setCart(cart.map(item =>
      item.product.id === productId
        ? { ...item, quantity }
        : item
    ));
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.product.id !== productId));
  };

  const calculateSubtotal = () => {
    return cart.reduce((sum, item) => {
      const price = orderDetails.order_type === 'wholesale'
        ? item.product.wholesale_price
        : item.product.retail_price;
      return sum + (price * item.quantity);
    }, 0);
  };

  const calculateDiscount = () => {
    if (orderDetails.order_type !== 'wholesale') return 0;

    const retailTotal = cart.reduce((sum, item) => {
      return sum + (item.product.retail_price * item.quantity);
    }, 0);

    const wholesaleTotal = cart.reduce((sum, item) => {
      return sum + (item.product.wholesale_price * item.quantity);
    }, 0);

    return retailTotal - wholesaleTotal;
  };

  const calculateTotal = () => {
    return calculateSubtotal();
  };

  const generateOrderNumber = async () => {
    const { data } = await supabase
      .from('orders')
      .select('order_number')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data?.order_number) {
      const lastNumber = parseInt(data.order_number.replace(/\D/g, ''));
      return `COT-${String(lastNumber + 1).padStart(5, '0')}`;
    }
    return 'COT-00001';
  };

  const validateForm = () => {
    if (customerMode === 'new') {
      if (!newCustomerForm.name.trim()) {
        setError('El nombre del cliente es requerido');
        return false;
      }
      if (!newCustomerForm.phone.trim()) {
        setError('El teléfono del cliente es requerido');
        return false;
      }
    } else {
      if (!selectedCustomerId) {
        setError('Selecciona un cliente');
        return false;
      }
    }

    if (cart.length === 0) {
      setError('Agrega al menos un producto');
      return false;
    }

    for (const item of cart) {
      if (item.quantity > item.product.total_stock) {
        setError(`Stock insuficiente para ${item.product.name}. Solo hay ${item.product.total_stock} unidades disponibles.`);
        return false;
      }
    }

    if (orderDetails.delivery_method === 'delivery' && !orderDetails.delivery_address.trim()) {
      setError('La dirección de entrega es requerida');
      return false;
    }

    return true;
  };

  const handleSave = async (status: 'draft' | 'quoted') => {
    setError('');

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      let customerId = selectedCustomerId;

      if (customerMode === 'new') {
        const { data: customerData, error: customerError } = await supabase
          .from('customers')
          .insert([{
            name: newCustomerForm.name.trim(),
            phone: newCustomerForm.phone.trim(),
            source: newCustomerForm.source,
            material_preference: newCustomerForm.material_preference,
            credit_limit: newCustomerForm.credit_limit,
            credit_status: newCustomerForm.credit_status,
            credit_notes: newCustomerForm.credit_notes.trim() || null
          }])
          .select()
          .single();

        if (customerError) throw customerError;
        customerId = customerData.id;
      }

      const orderNumber = await generateOrderNumber();
      const subtotal = calculateSubtotal();
      const total = calculateTotal();

      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert([{
          order_number: orderNumber,
          customer_id: customerId || null,
          order_type: orderDetails.order_type,
          status: status,
          payment_status: 'pending',
          delivery_method: orderDetails.delivery_method,
          delivery_address: orderDetails.delivery_method === 'delivery' ? orderDetails.delivery_address.trim() : null,
          subtotal: subtotal,
          total: total,
          notes: orderDetails.notes.trim() || null
        }])
        .select()
        .single();

      if (orderError) throw orderError;

      const orderItems = cart.map(item => ({
        order_id: orderData.id,
        product_id: item.product.id,
        quantity: item.quantity,
        unit_price: orderDetails.order_type === 'wholesale'
          ? item.product.wholesale_price
          : item.product.retail_price,
        subtotal: (orderDetails.order_type === 'wholesale'
          ? item.product.wholesale_price
          : item.product.retail_price) * item.quantity
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error al guardar cotización:', err);
      setError('Error al guardar la cotización. Por favor intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-lg max-w-4xl w-full my-8">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center rounded-t-lg z-10">
          <h3 className="text-xl font-bold text-gray-900">Nueva Cotización</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={loading}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <h4 className="font-semibold text-gray-900 mb-3">Información del Cliente</h4>
            <div className="flex gap-4 mb-4">
              <button
                onClick={() => setCustomerMode('existing')}
                className={`flex-1 px-4 py-2 rounded-lg border-2 transition-colors ${
                  customerMode === 'existing'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 text-gray-700 hover:border-gray-400'
                }`}
              >
                Cliente Existente
              </button>
              <button
                onClick={() => setCustomerMode('new')}
                className={`flex-1 px-4 py-2 rounded-lg border-2 transition-colors ${
                  customerMode === 'new'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 text-gray-700 hover:border-gray-400'
                }`}
              >
                Nuevo Cliente
              </button>
            </div>

            {customerMode === 'existing' ? (
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Selecciona un cliente</option>
                {customers.map(customer => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name} - {customer.phone}
                  </option>
                ))}
              </select>
            ) : (
              <div className="space-y-6">
                <div>
                  <h5 className="text-sm font-semibold text-gray-900 mb-3">Información Básica</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nombre completo *
                      </label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                          type="text"
                          value={newCustomerForm.name}
                          onChange={(e) => setNewCustomerForm({ ...newCustomerForm, name: e.target.value })}
                          className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Ej: Juan Pérez"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Teléfono *
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                          type="tel"
                          value={newCustomerForm.phone}
                          onChange={(e) => setNewCustomerForm({ ...newCustomerForm, phone: e.target.value })}
                          maxLength={10}
                          className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="10 dígitos"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Origen *
                      </label>
                      <div className="relative">
                        <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <select
                          value={newCustomerForm.source}
                          onChange={(e) => setNewCustomerForm({ ...newCustomerForm, source: e.target.value })}
                          className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="manual">Manual</option>
                          <option value="whatsapp">WhatsApp</option>
                          <option value="facebook">Facebook</option>
                          <option value="instagram">Instagram</option>
                          <option value="centro_joyero">Centro Joyero</option>
                          <option value="referido">Referido</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Preferencia de Material
                      </label>
                      <div className="relative">
                        <Package className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <select
                          value={newCustomerForm.material_preference}
                          onChange={(e) => setNewCustomerForm({ ...newCustomerForm, material_preference: e.target.value })}
                          className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="ambos">Ambos</option>
                          <option value="plata_pura">Plata Pura</option>
                          <option value="baño_oro">Baño de Oro</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-gray-200">
                  <h5 className="text-sm font-semibold text-gray-900 mb-3">Línea de Crédito</h5>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Límite de Crédito
                        </label>
                        <div className="relative">
                          <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                          <input
                            type="number"
                            value={newCustomerForm.credit_limit}
                            onChange={(e) => setNewCustomerForm({ ...newCustomerForm, credit_limit: parseFloat(e.target.value) || 0 })}
                            min={0}
                            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="$0"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Estado del Crédito
                        </label>
                        <div className="relative">
                          <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                          <select
                            value={newCustomerForm.credit_status}
                            onChange={(e) => setNewCustomerForm({ ...newCustomerForm, credit_status: e.target.value })}
                            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="none">Sin Crédito</option>
                            <option value="active">Activo</option>
                            <option value="suspended">Suspendido</option>
                            <option value="blocked">Bloqueado</option>
                          </select>
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Notas de Crédito
                      </label>
                      <div className="relative">
                        <FileText className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
                        <textarea
                          value={newCustomerForm.credit_notes}
                          onChange={(e) => setNewCustomerForm({ ...newCustomerForm, credit_notes: e.target.value })}
                          className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          rows={3}
                          placeholder="Notas adicionales sobre el crédito..."
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 mb-3">Detalles de la Orden</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Orden
                </label>
                <select
                  value={orderDetails.order_type}
                  onChange={(e) => setOrderDetails({ ...orderDetails, order_type: e.target.value as 'retail' | 'wholesale' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="retail">Menudeo</option>
                  <option value="wholesale">Mayoreo</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Método de Entrega
                </label>
                <select
                  value={orderDetails.delivery_method}
                  onChange={(e) => setOrderDetails({ ...orderDetails, delivery_method: e.target.value as 'pickup' | 'delivery' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="pickup">Recolección</option>
                  <option value="delivery">Envío</option>
                </select>
              </div>
            </div>

            {orderDetails.delivery_method === 'delivery' && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dirección de Entrega *
                </label>
                <textarea
                  value={orderDetails.delivery_address}
                  onChange={(e) => setOrderDetails({ ...orderDetails, delivery_address: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={2}
                  placeholder="Calle, número, colonia, ciudad, estado, CP"
                />
              </div>
            )}
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 mb-3">Productos</h4>
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={productSearchTerm}
                  onChange={(e) => setProductSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Buscar producto por nombre, SKU o material..."
                />
              </div>
            </div>

            <div className="mb-4 border border-gray-200 rounded-lg overflow-hidden">
              {productsLoading ? (
                <div className="p-8 text-center text-gray-500">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <span>Cargando productos...</span>
                  </div>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Search className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p className="font-medium">No se encontraron productos</p>
                  <p className="text-sm text-gray-400 mt-1">
                    {productSearchTerm ? 'Intenta con otro término de búsqueda' : 'No hay productos disponibles'}
                  </p>
                </div>
              ) : (
                <div className="max-h-96 overflow-y-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Material</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Stock</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Menudeo</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Mayoreo</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredProducts.slice(0, 10).map(product => {
                        const isInCart = cart.some(item => item.product.id === product.id);
                        const lowStock = isLowStock(product.total_stock);
                        const isJustAdded = addedProductId === product.id;

                        return (
                          <tr
                            key={product.id}
                            className={`hover:bg-blue-50 transition-colors ${
                              isJustAdded ? 'bg-green-50' : isInCart ? 'bg-gray-50' : ''
                            }`}
                          >
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="font-medium text-gray-900">{product.name}</div>
                                {isInCart && (
                                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                                    En carrito
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600 font-mono">{product.sku}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{product.material}</td>
                            <td className="px-4 py-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <span className={`text-sm font-medium ${lowStock ? 'text-yellow-600' : 'text-gray-900'}`}>
                                  {product.total_stock}
                                </span>
                                {lowStock && (
                                  <AlertCircle className="w-3 h-3 text-yellow-600" title="Stock bajo" />
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right text-sm text-gray-900">
                              ${product.retail_price.toLocaleString('es-MX')}
                            </td>
                            <td className="px-4 py-3 text-right text-sm font-medium text-green-600">
                              ${product.wholesale_price.toLocaleString('es-MX')}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <button
                                onClick={() => addToCart(product)}
                                className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors flex items-center gap-1 mx-auto"
                                title="Agregar al carrito"
                              >
                                <Plus className="w-4 h-4" />
                                Agregar
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {filteredProducts.length > 10 && (
                    <div className="bg-gray-50 px-4 py-2 text-center text-sm text-gray-600 border-t border-gray-200">
                      Mostrando 10 de {filteredProducts.length} productos. Usa el buscador para filtrar resultados.
                    </div>
                  )}
                </div>
              )}
            </div>

            {cart.length > 0 && (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Producto</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Cantidad</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Precio Unit.</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Subtotal</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {cart.map(item => {
                      const unitPrice = orderDetails.order_type === 'wholesale'
                        ? item.product.wholesale_price
                        : item.product.retail_price;
                      const subtotal = unitPrice * item.quantity;
                      const lowStock = isLowStock(item.product.total_stock);
                      const isJustAdded = addedProductId === item.product.id;

                      return (
                        <tr
                          key={item.product.id}
                          className={`transition-colors ${isJustAdded ? 'bg-green-50' : ''}`}
                        >
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-900">{item.product.name}</div>
                            <div className="text-xs text-gray-500 flex items-center gap-2 mt-1">
                              <span>{item.product.material} • {item.product.sku}</span>
                              {lowStock && (
                                <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3" />
                                  Solo {item.product.total_stock} en stock
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-2">
                              <input
                                type="number"
                                min="1"
                                max={item.product.total_stock}
                                value={item.quantity}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value);
                                  if (!isNaN(val)) {
                                    updateQuantity(item.product.id, val);
                                  }
                                }}
                                className="w-20 px-2 py-1 border border-gray-300 rounded text-center focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                              <span className="text-xs text-gray-500">/ {item.product.total_stock}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right text-gray-900">
                            ${unitPrice.toLocaleString('es-MX')}
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-gray-900">
                            ${subtotal.toLocaleString('es-MX')}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => removeFromCart(item.product.id)}
                              className="text-red-600 hover:text-red-800 transition-colors"
                              title="Eliminar producto"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {cart.length === 0 && (
              <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <Search className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500">No hay productos agregados</p>
                <p className="text-sm text-gray-400 mt-1">Busca y agrega productos usando el buscador de arriba</p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notas (opcional)
            </label>
            <textarea
              value={orderDetails.notes}
              onChange={(e) => setOrderDetails({ ...orderDetails, notes: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
              placeholder="Notas adicionales sobre la cotización..."
            />
          </div>

          {cart.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="space-y-2 max-w-md ml-auto">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium text-gray-900">
                    ${calculateSubtotal().toLocaleString('es-MX')}
                  </span>
                </div>
                {orderDetails.order_type === 'wholesale' && calculateDiscount() > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Descuento Mayoreo:</span>
                    <span className="font-medium">
                      -${calculateDiscount().toLocaleString('es-MX')}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold border-t border-gray-300 pt-2">
                  <span className="text-gray-900">Total:</span>
                  <span className="text-amber-600">
                    ${calculateTotal().toLocaleString('es-MX')} MXN
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 rounded-b-lg flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            onClick={() => handleSave('draft')}
            className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
            disabled={loading}
          >
            {loading ? 'Guardando...' : 'Guardar como Borrador'}
          </button>
          <button
            onClick={() => handleSave('quoted')}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            disabled={loading}
          >
            {loading ? 'Guardando...' : 'Guardar y Cotizar'}
          </button>
        </div>
      </div>
    </div>
  );
}
