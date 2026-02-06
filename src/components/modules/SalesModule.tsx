import { useState, useEffect, useRef } from 'react';
import { supabase, Order, Customer, Product, BusinessRule, PaymentMethod, POSSession, POSTerminal } from '../../lib/supabase';
import {
  ShoppingCart, Plus, FileText, DollarSign, Calendar, Eye, X,
  Scan, Printer, CreditCard, Banknote, Smartphone, Link as LinkIcon,
  AlertCircle, Check, TrendingUp, Monitor, Lock, Bell
} from 'lucide-react';

type CartItem = {
  product: Product;
  quantity: number;
};



export default function SalesModule() {

  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [wholesaleThreshold, setWholesaleThreshold] = useState(3000);
  const [showNewOrderModal, setShowNewOrderModal] = useState(false);
  const [showOrderDetails, setShowOrderDetails] = useState<Order | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('');
  const [paymentReference, setPaymentReference] = useState('');
  const [amountTendered, setAmountTendered] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [currentSession, setCurrentSession] = useState<POSSession | null>(null);
  const [terminals, setTerminals] = useState<POSTerminal[]>([]);
  const [selectedTerminal, setSelectedTerminal] = useState<POSTerminal | null>(null);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [openingCash, setOpeningCash] = useState(1000);
  const [scannerInput, setScannerInput] = useState('');


  const scannerRef = useRef<HTMLInputElement>(null);

  const [pendingWebOrders, setPendingWebOrders] = useState(0);



  const [loadedOrderId, setLoadedOrderId] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('orderId');
    if (orderId) {
      loadWebOrder(orderId);
    }
  }, [products, customers]); // Depend on products/customers being loaded? Maybe check loading state.

  useEffect(() => {
    checkPendingWebOrders();
    const interval = setInterval(checkPendingWebOrders, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, []);

  const checkPendingWebOrders = async () => {
    const { count } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('sale_channel', 'online')
      .eq('status', 'pending_payment'); // Or 'paid' if we assume payment gateway is active. Using pending_payment as per current default.
    // Actually, previous fix set default to 'pending_payment'. 
    // We probably want to see 'paid' orders if payment is auto.
    // BUT for now, let's show ALL active web orders that are NOT completed/cancelled.
    // Let's filter by: sale_channel='online' AND status IN ('pending_payment', 'paid', 'processing')

    // Better query:
    const { count: activeCount } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('sale_channel', 'online')
      .in('status', ['paid', 'pending_payment', 'processing']);

    if (activeCount !== null) setPendingWebOrders(activeCount);
  };

  useEffect(() => {
    loadOrders();
    loadCustomers();
    loadProducts();
    loadBusinessRules();
    loadPaymentMethods();
    loadTerminals();
    loadCurrentSession();

  }, []);

  const loadWebOrder = async (orderId: string) => {
    // Wait for initial data load if needed, or just fetch
    const { data: order, error } = await supabase
      .from('orders')
      .select('*, items:order_items(*)')
      .eq('id', orderId)
      .single();

    if (error || !order) {
      console.error('Error loading web order:', error);
      return;
    }

    setLoadedOrderId(order.id);

    if (order.customer_id) {
      // Find customer in existing list or fetch if missing?
      // List might be partial? loadCustomers fetches all so we are good.
      const customer = customers.find(c => c.id === order.customer_id);
      if (customer) setSelectedCustomer(customer);
    }

    // Populate cart
    const newCart: CartItem[] = [];
    if (order.items && Array.isArray(order.items)) {
      for (const item of order.items) {
        let product = products.find(p => p.id === item.product_id);

        // If product not in list (e.g. stock 0), fetch it
        if (!product) {
          const { data: p } = await supabase.from('products').select('*').eq('id', item.product_id).single();
          if (p) product = p;
        }

        if (product) {
          newCart.push({
            product: product,
            quantity: item.quantity
          });
        }
      }
    }
    setCart(newCart);

    // Open modal to proceed
    setShowNewOrderModal(true);

    // Clean URL
    window.history.replaceState({}, '', '/?module=sales');
  };

  const loadOrders = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('status', 'confirmed')
      .order('created_at', { ascending: false });

    if (data) {
      setOrders(data);
    }
    setLoading(false);
  };

  const loadCustomers = async () => {
    const { data } = await supabase
      .from('customers')
      .select('*')
      .order('name', { ascending: true });

    if (data) {
      setCustomers(data);
    }
  };

  const loadProducts = async () => {
    const { data } = await supabase
      .from('products')
      .select('*')
      .gt('total_stock', 0)
      .order('name', { ascending: true });

    if (data) {
      setProducts(data);
    }
  };

  const loadBusinessRules = async () => {
    const { data } = await supabase
      .from('business_rules')
      .select('*')
      .eq('rule_key', 'wholesale_threshold')
      .eq('is_active', true)
      .maybeSingle();

    if (data) {
      setWholesaleThreshold(data.rule_value.amount);
    }
  };

  const loadPaymentMethods = async () => {
    const { data } = await supabase
      .from('payment_methods')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (data) {
      setPaymentMethods(data);
    }
  };

  const loadTerminals = async () => {
    const { data } = await supabase
      .from('pos_terminals')
      .select('*')
      .eq('is_active', true)
      .order('terminal_number', { ascending: true });

    if (data) {
      setTerminals(data);
    }
  };

  const loadCurrentSession = async () => {
    const { data } = await supabase
      .from('pos_sessions')
      .select('*')
      .eq('status', 'open')
      .order('opened_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) {
      setCurrentSession(data);
    }
  };

  const handleOpenSession = async () => {
    if (!selectedTerminal) return;

    const { data: sessionNumber } = await supabase.rpc('generate_session_number');

    const { data: newSession, error } = await supabase
      .from('pos_sessions')
      .insert({
        terminal_id: selectedTerminal.id,
        session_number: sessionNumber,
        opened_by: 'Cajero',
        opening_cash: openingCash,
      })
      .select()
      .single();

    if (!error && newSession) {
      setCurrentSession(newSession);
      setShowSessionModal(false);
    }
  };

  const handleCloseSession = async () => {
    if (!currentSession) return;

    const { data: reconciliation } = await supabase.rpc('calculate_cash_reconciliation', {
      p_session_id: currentSession.id
    });

    if (reconciliation && reconciliation.length > 0) {
      const expected = reconciliation[0].expected_cash;
      const closingCash = prompt(`Efectivo esperado: $${expected.toFixed(2)}\n\nIngrese el efectivo contado en caja:`);

      if (closingCash !== null) {
        const closingAmount = parseFloat(closingCash);
        const difference = closingAmount - expected;

        await supabase
          .from('pos_sessions')
          .update({
            status: 'closed',
            closed_by: 'Cajero',
            closed_at: new Date().toISOString(),
            closing_cash: closingAmount,
            expected_cash: expected,
            cash_difference: difference,
          })
          .eq('id', currentSession.id);

        setCurrentSession(null);
        alert(`Caja cerrada.\nDiferencia: $${difference.toFixed(2)} ${difference >= 0 ? '(Sobrante)' : '(Faltante)'}`);
      }
    }
  };

  const handleScanBarcode = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && scannerInput) {
      const product = products.find(p => p.sku === scannerInput.trim());
      if (product) {
        addToCart(product);
        setScannerInput('');
      } else {
        alert(`Producto no encontrado: ${scannerInput}`);
        setScannerInput('');
      }
    }
  };

  const addToCart = (product: Product) => {
    const existingItem = cart.find(item => item.product.id === product.id);
    if (existingItem) {
      setCart(cart.map(item =>
        item.product.id === product.id
          ? { ...item, quantity: Math.min(item.quantity + 1, product.total_stock) }
          : item
      ));
    } else {
      setCart([...cart, { product, quantity: 1 }]);
    }
  };

  const updateQuantity = (productId: string, quantity: number) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    if (quantity <= 0) {
      setCart(cart.filter(item => item.product.id !== productId));
    } else {
      setCart(cart.map(item =>
        item.product.id === productId
          ? { ...item, quantity: Math.min(quantity, product.total_stock) }
          : item
      ));
    }
  };

  const calculateTotal = () => {
    const subtotal = cart.reduce((sum, item) => sum + (item.product.retail_price * item.quantity), 0);
    const isWholesale = subtotal >= wholesaleThreshold;

    const total = cart.reduce((sum, item) => {
      const price = isWholesale ? item.product.wholesale_price : item.product.retail_price;
      return sum + (price * item.quantity);
    }, 0);

    const changeGiven = amountTendered > total ? amountTendered - total : 0;

    return { subtotal, total, isWholesale, changeGiven };
  };

  const generateOrderNumber = () => {
    const lastOrder = orders[0];
    if (!lastOrder) return '500';
    const lastNumber = parseInt(lastOrder.order_number);
    return (lastNumber + 1).toString();
  };

  const handleCreateOrder = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (cart.length === 0) return;





    const formData = new FormData(e.currentTarget);
    const { subtotal, total, isWholesale } = calculateTotal();
    const orderNumber = loadedOrderId ? orders.find(o => o.id === loadedOrderId)?.order_number || generateOrderNumber() : generateOrderNumber();

    let orderData = null;
    let orderError = null;

    if (loadedOrderId) {
      // Update existing order
      const { data, error } = await supabase
        .from('orders')
        .update({
          pos_terminal_id: selectedTerminal?.id,
          status: 'confirmed', // Taken over by POS
          payment_status: 'paid', // Optimistic, will confirm in next step
          served_by: 'Cajero', // TODO: Use real user
          notes: formData.get('notes') as string || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', loadedOrderId)
        .select()
        .single();

      orderData = data;
      orderError = error;

      // NOTE: Web orders valid inventory deduction confirmation
      // We process the inventory out now
      for (const item of cart) {
        await supabase
          .from('products')
          .update({
            stock_a: Math.max(0, item.product.stock_a - Math.ceil(item.quantity / 3)),
            stock_b: Math.max(0, item.product.stock_b - Math.ceil(item.quantity / 3)),
            stock_c: Math.max(0, item.product.stock_c - Math.floor(item.quantity / 3)),
            updated_at: new Date().toISOString()
          })
          .eq('id', item.product.id);

        await supabase
          .from('inventory_movements')
          .insert({
            product_id: item.product.id,
            movement_type: 'out',
            quantity_a: Math.ceil(item.quantity / 3),
            quantity_b: Math.ceil(item.quantity / 3),
            quantity_c: Math.floor(item.quantity / 3),
            reference: orderNumber,
            reference: orderNumber,
            notes: `Venta POS - Confirmación Web - Pedido ${orderNumber}`,
            created_by: 'system'
          });
      }

    } else {
      // Create NEW order (Existing logic)
      const { data, error } = await supabase
        .from('orders')
        .insert({
          order_number: orderNumber,
          customer_id: selectedCustomer?.id || null,
          status: 'confirmed',
          order_type: isWholesale ? 'wholesale' : 'retail',
          sale_channel: 'pos',
          pos_terminal_id: selectedTerminal?.id,
          subtotal,
          total,
          delivery_method: formData.get('delivery_method') as string || null,
          delivery_address: formData.get('delivery_address') as string || null,
          payment_status: 'paid',
          notes: formData.get('notes') as string || null,
          served_by: 'Cajero',
        })
        .select()
        .single();

      if (orderError || !orderData) {
        console.error('Error creating order:', orderError);
        return;
      }

      if (!loadedOrderId) {
        // Only insert items and update stock for NEW orders
        for (const item of cart) {
          const price = isWholesale ? item.product.wholesale_price : item.product.retail_price;
          await supabase
            .from('order_items')
            .insert({
              order_id: orderData.id,
              product_id: item.product.id,
              quantity: item.quantity,
              unit_price: price,
              subtotal: price * item.quantity,
            });

          await supabase
            .from('products')
            .update({
              stock_a: Math.max(0, item.product.stock_a - Math.ceil(item.quantity / 3)),
              stock_b: Math.max(0, item.product.stock_b - Math.ceil(item.quantity / 3)),
              stock_c: Math.max(0, item.product.stock_c - Math.floor(item.quantity / 3)),
              updated_at: new Date().toISOString()
            })
            .eq('id', item.product.id);

          await supabase
            .from('inventory_movements')
            .insert({
              product_id: item.product.id,
              movement_type: 'out',
              quantity_a: Math.ceil(item.quantity / 3),
              quantity_b: Math.ceil(item.quantity / 3),
              quantity_c: Math.floor(item.quantity / 3),
              reference: orderNumber,
              notes: `Venta POS - Pedido ${orderNumber}`,
              created_by: 'system'
            });

        }
      }
    }

    if (selectedCustomer) {
      await supabase
        .from('customers')
        .update({
          total_purchases: selectedCustomer.total_purchases + total,
          last_purchase_date: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedCustomer.id);
    }

    setShowPaymentModal(true);
    setShowNewOrderModal(false);

    loadOrders();
    loadProducts();
  };

  const handleCompletePayment = async () => {
    if (!selectedPaymentMethod) {
      alert('Seleccione un método de pago');
      return;
    }

    const lastOrder = loadedOrderId
      ? orders.find(o => o.id === loadedOrderId) || orders[0]
      : orders[0];

    if (!lastOrder) return;

    if (selectedPaymentMethod === 'credit') {
      if (!selectedCustomer) {
        alert('Error: No hay cliente seleccionado para pago con crédito');
        return;
      }

      if (selectedCustomer.credit_status !== 'active') {
        alert('Error: El crédito del cliente no está activo');
        return;
      }

      const creditAvailable = selectedCustomer.credit_limit - selectedCustomer.credit_used;
      if (creditAvailable < total) {
        alert('Error: Crédito insuficiente');
        return;
      }

      const { error: creditError } = await supabase.rpc('register_credit_transaction', {
        p_customer_id: selectedCustomer.id,
        p_transaction_type: 'charge',
        p_amount: total,
        p_reference: `Pedido #${lastOrder.order_number}`,
        p_notes: `Venta POS - Terminal: ${selectedTerminal?.terminal_name || 'N/A'}`,
        p_created_by: 'Cajero'
      });

      if (creditError) {
        alert('Error al registrar la transacción de crédito');
        console.error(creditError);
        return;
      }

      await loadCustomers();
    }

    const { data: transactionNumber } = await supabase.rpc('generate_transaction_number');

    await supabase
      .from('pos_transactions')
      .insert({
        session_id: currentSession?.id,
        order_id: lastOrder.id,
        transaction_number: transactionNumber,
        sale_type: 'physical_pos',
        payment_method: selectedPaymentMethod,
        payment_reference: selectedPaymentMethod === 'credit'
          ? `Crédito - Pedido #${lastOrder.order_number}`
          : (paymentReference || null),
        amount_tendered: selectedPaymentMethod === 'credit' ? total : amountTendered,
        change_given: selectedPaymentMethod === 'credit' ? 0 : calculateTotal().changeGiven,
        ticket_printed: true,
        completed_at: new Date().toISOString(),
        created_by: 'Cajero',
      });

    if (currentSession) {
      await supabase
        .from('pos_sessions')
        .update({
          total_sales: currentSession.total_sales + lastOrder.total,
          total_transactions: currentSession.total_transactions + 1,
        })
        .eq('id', currentSession.id);
    }

    // Obtener el pedido recién creado
    const orderToPrint = orders[0];
    if (!orderToPrint) {
      console.error('No se encontró el pedido para imprimir');
      setShowPaymentModal(false);
      return;
    }

    // Generar e imprimir el ticket
    const ticketHTML = generateTicketHTML(orderToPrint, selectedCustomer);

    // Crear iframe oculto para impresión
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    iframe.style.visibility = 'hidden';

    document.body.appendChild(iframe);

    // Escribir contenido
    const iframeDoc = iframe.contentWindow!.document;
    iframeDoc.open();
    iframeDoc.write(ticketHTML);
    iframeDoc.close();

    // Imprimir después de que cargue
    setTimeout(() => {
      iframe.contentWindow!.focus();
      iframe.contentWindow!.print();

      // Limpiar iframe después de imprimir
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1000);
    }, 500);

    setShowPaymentModal(false);
    setCart([]);
    setSelectedCustomer(null);
    setShowPaymentModal(false);
    setCart([]);
    setSelectedCustomer(null);
    setSelectedPaymentMethod('');
    setLoadedOrderId(null);
    setPaymentReference('');
    setAmountTendered(0);

    const paymentMethodDisplay = selectedPaymentMethod === 'credit'
      ? 'Crédito'
      : paymentMethods.find(m => m.name === selectedPaymentMethod)?.display_name || selectedPaymentMethod;

    alert(`✅ VENTA COMPLETADA
━━━━━━━━━━━━━━━━━━━━━━━
Transacción: ${transactionNumber}
Total: $${total.toLocaleString('es-MX')}
Pago: ${paymentMethodDisplay}
${selectedPaymentMethod === 'cash' ? `Cambio: $${changeGiven.toFixed(2)}` : ''}
${selectedPaymentMethod === 'credit' ? `Crédito Restante: $${(selectedCustomer!.credit_limit - selectedCustomer!.credit_used - total).toLocaleString('es-MX')}` : ''}
━━━━━━━━━━━━━━━━━━━━━━━
🖨️ Ticket impreso en POS 58`);
    loadCurrentSession();
  };

  const generateTicketHTML = (order: any, customer: Customer | null) => {
    const ticketDate = new Date().toLocaleString('es-MX', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });

    const paymentMethodName = selectedPaymentMethod === 'credit'
      ? 'Crédito'
      : paymentMethods.find(m => m.name === selectedPaymentMethod)?.display_name || selectedPaymentMethod;

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Ticket ${order.order_number}</title>
  <style>
    @page {
      size: 58mm auto;
      margin: 0;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      width: 58mm;
      margin: 0;
      padding: 3mm;
      font-family: 'Courier New', monospace;
      font-size: 9pt;
      line-height: 1.3;
    }

    .header {
      text-align: center;
      margin-bottom: 3mm;
      border-bottom: 1px dashed #000;
      padding-bottom: 2mm;
    }

    .store-name {
      font-size: 12pt;
      font-weight: bold;
      margin-bottom: 1mm;
    }

    .store-info {
      font-size: 7pt;
      color: #333;
    }

    .section {
      margin: 2mm 0;
      padding: 2mm 0;
    }

    .section-border {
      border-top: 1px dashed #000;
      border-bottom: 1px dashed #000;
    }

    .label {
      font-weight: bold;
      display: inline-block;
      width: 40%;
    }

    .value {
      display: inline-block;
      width: 60%;
      text-align: right;
    }

    .item {
      margin: 1mm 0;
    }

    .item-name {
      font-weight: bold;
      font-size: 8pt;
    }

    .item-details {
      font-size: 7pt;
      color: #333;
      display: flex;
      justify-content: space-between;
    }

    .totals {
      margin-top: 2mm;
      font-weight: bold;
    }

    .total-line {
      display: flex;
      justify-content: space-between;
      margin: 1mm 0;
    }

    .grand-total {
      font-size: 11pt;
      border-top: 2px solid #000;
      border-bottom: 2px solid #000;
      padding: 1mm 0;
      margin-top: 2mm;
    }

    .footer {
      text-align: center;
      margin-top: 3mm;
      font-size: 7pt;
      border-top: 1px dashed #000;
      padding-top: 2mm;
    }

    .thank-you {
      font-weight: bold;
      font-size: 9pt;
      margin: 2mm 0;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="store-name">GALLARDO JOYAS</div>
    <div class="store-info">
      Joyería de Plata Pura y Baño de Oro<br/>
      Centro Joyero, Guadalajara, Jalisco<br/>
      Tel: (33) 1234-5678
    </div>
  </div>

  <div class="section">
    <div class="label">Ticket:</div>
    <div class="value">#${order.order_number}</div>
  </div>

  <div class="section">
    <div class="label">Fecha:</div>
    <div class="value">${ticketDate}</div>
  </div>

  ${customer ? `
  <div class="section">
    <div class="label">Cliente:</div>
    <div class="value">${customer.name}</div>
  </div>
  ` : ''}

  <div class="section">
    <div class="label">Atendió:</div>
    <div class="value">Cajero</div>
  </div>

  <div class="section section-border">
    ${cart.map(item => `
      <div class="item">
        <div class="item-name">${item.product.name}</div>
        <div class="item-details">
          <span>${item.quantity} x $${(isWholesale ? item.product.wholesale_price : item.product.retail_price).toFixed(2)}</span>
          <span>$${((isWholesale ? item.product.wholesale_price : item.product.retail_price) * item.quantity).toFixed(2)}</span>
        </div>
      </div>
    `).join('')}
  </div>

  <div class="totals">
    <div class="total-line">
      <span>Subtotal:</span>
      <span>$${subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
    </div>
    ${isWholesale ? `
    <div class="total-line">
      <span>Descuento Mayoreo:</span>
      <span>-$${(subtotal - total).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
    </div>
    ` : ''}
    <div class="total-line grand-total">
      <span>TOTAL:</span>
      <span>$${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
    </div>
  </div>

  <div class="section section-border">
    <div class="label">Pago:</div>
    <div class="value">${paymentMethodName}</div>
  </div>

  ${selectedPaymentMethod === 'cash' ? `
  <div class="section">
    <div class="total-line">
      <span>Efectivo:</span>
      <span>$${amountTendered.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
    </div>
    <div class="total-line">
      <span>Cambio:</span>
      <span>$${changeGiven.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
    </div>
  </div>
  ` : ''}

  ${paymentReference ? `
  <div class="section">
    <div class="label">Ref:</div>
    <div class="value">${paymentReference}</div>
  </div>
  ` : ''}

  <div class="footer">
    <div class="thank-you">¡GRACIAS POR SU COMPRA!</div>
    <div>
      Ticket generado el ${ticketDate}<br/>
      Terminal: ${selectedTerminal?.terminal_name || 'POS'}<br/>
      Sesión: ${currentSession?.session_number || 'N/A'}
    </div>
    <div style="margin-top: 2mm;">
      Conserve este ticket como comprobante
    </div>
  </div>
</body>
</html>
    `;
  };

  const reprintTicket = async (order: Order) => {
    const { data: itemsData } = await supabase
      .from('order_items')
      .select('*, products(*)')
      .eq('order_id', order.id);

    if (!itemsData) {
      alert('No se pudieron cargar los items del pedido');
      return;
    }

    const { data: transaction } = await supabase
      .from('pos_transactions')
      .select('*')
      .eq('order_id', order.id)
      .maybeSingle();

    const cartForTicket = itemsData.map(item => ({
      product: item.products as Product,
      quantity: item.quantity
    }));

    const ticketHTML = generateTicketHTMLFromOrder(order, cartForTicket, transaction);

    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    iframe.style.visibility = 'hidden';

    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentWindow!.document;
    iframeDoc.open();
    iframeDoc.write(ticketHTML);
    iframeDoc.close();

    setTimeout(() => {
      iframe.contentWindow!.focus();
      iframe.contentWindow!.print();
      setTimeout(() => document.body.removeChild(iframe), 1000);
    }, 500);

    alert('Reimprimiendo ticket...');
  };

  const generateTicketHTMLFromOrder = (order: Order, cartItems: CartItem[], transaction: any) => {
    const customer = customers.find(c => c.id === order.customer_id);
    const ticketDate = new Date(order.created_at).toLocaleString('es-MX', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });

    const paymentMethodName = transaction?.payment_method || 'Efectivo';
    const paymentMethodDisplay = paymentMethodName === 'credit'
      ? 'Crédito'
      : paymentMethods.find(m => m.name === paymentMethodName)?.display_name || paymentMethodName;
    const isWholesale = order.order_type === 'wholesale';
    const amountTenderedFromTransaction = transaction?.amount_tendered || order.total;
    const changeGivenFromTransaction = transaction?.change_given || 0;
    const paymentRef = transaction?.payment_reference || '';

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Ticket ${order.order_number}</title>
  <style>
    @page {
      size: 58mm auto;
      margin: 0;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      width: 58mm;
      margin: 0;
      padding: 3mm;
      font-family: 'Courier New', monospace;
      font-size: 9pt;
      line-height: 1.3;
    }

    .header {
      text-align: center;
      margin-bottom: 3mm;
      border-bottom: 1px dashed #000;
      padding-bottom: 2mm;
    }

    .store-name {
      font-size: 12pt;
      font-weight: bold;
      margin-bottom: 1mm;
    }

    .store-info {
      font-size: 7pt;
      color: #333;
    }

    .section {
      margin: 2mm 0;
      padding: 2mm 0;
    }

    .section-border {
      border-top: 1px dashed #000;
      border-bottom: 1px dashed #000;
    }

    .label {
      font-weight: bold;
      display: inline-block;
      width: 40%;
    }

    .value {
      display: inline-block;
      width: 60%;
      text-align: right;
    }

    .item {
      margin: 1mm 0;
    }

    .item-name {
      font-weight: bold;
      font-size: 8pt;
    }

    .item-details {
      font-size: 7pt;
      color: #333;
      display: flex;
      justify-content: space-between;
    }

    .totals {
      margin-top: 2mm;
      font-weight: bold;
    }

    .total-line {
      display: flex;
      justify-content: space-between;
      margin: 1mm 0;
    }

    .grand-total {
      font-size: 11pt;
      border-top: 2px solid #000;
      border-bottom: 2px solid #000;
      padding: 1mm 0;
      margin-top: 2mm;
    }

    .footer {
      text-align: center;
      margin-top: 3mm;
      font-size: 7pt;
      border-top: 1px dashed #000;
      padding-top: 2mm;
    }

    .thank-you {
      font-weight: bold;
      font-size: 9pt;
      margin: 2mm 0;
    }

    .reprint-label {
      font-size: 8pt;
      font-weight: bold;
      color: #666;
      margin-bottom: 2mm;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="reprint-label">*** REIMPRESION ***</div>

  <div class="header">
    <div class="store-name">GALLARDO JOYAS</div>
    <div class="store-info">
      Joyería de Plata Pura y Baño de Oro<br/>
      Centro Joyero, Guadalajara, Jalisco<br/>
      Tel: (33) 1234-5678
    </div>
  </div>

  <div class="section">
    <div class="label">Ticket:</div>
    <div class="value">#${order.order_number}</div>
  </div>

  <div class="section">
    <div class="label">Fecha Original:</div>
    <div class="value">${ticketDate}</div>
  </div>

  ${customer ? `
  <div class="section">
    <div class="label">Cliente:</div>
    <div class="value">${customer.name}</div>
  </div>
  ` : ''}

  <div class="section">
    <div class="label">Atendió:</div>
    <div class="value">${(order as any).served_by || 'Cajero'}</div>
  </div>

  <div class="section section-border">
    ${cartItems.map(item => `
      <div class="item">
        <div class="item-name">${item.product.name}</div>
        <div class="item-details">
          <span>${item.quantity} x $${(isWholesale ? item.product.wholesale_price : item.product.retail_price).toFixed(2)}</span>
          <span>$${((isWholesale ? item.product.wholesale_price : item.product.retail_price) * item.quantity).toFixed(2)}</span>
        </div>
      </div>
    `).join('')}
  </div>

  <div class="totals">
    <div class="total-line">
      <span>Subtotal:</span>
      <span>$${order.subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
    </div>
    ${isWholesale ? `
    <div class="total-line">
      <span>Descuento Mayoreo:</span>
      <span>-$${(order.subtotal - order.total).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
    </div>
    ` : ''}
    <div class="total-line grand-total">
      <span>TOTAL:</span>
      <span>$${order.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
    </div>
  </div>

  <div class="section section-border">
    <div class="label">Pago:</div>
    <div class="value">${paymentMethodDisplay}</div>
  </div>

  ${paymentMethodName === 'cash' ? `
  <div class="section">
    <div class="total-line">
      <span>Efectivo:</span>
      <span>$${amountTenderedFromTransaction.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
    </div>
    <div class="total-line">
      <span>Cambio:</span>
      <span>$${changeGivenFromTransaction.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
    </div>
  </div>
  ` : ''}

  ${paymentRef ? `
  <div class="section">
    <div class="label">Ref:</div>
    <div class="value">${paymentRef}</div>
  </div>
  ` : ''}

  <div class="footer">
    <div class="thank-you">¡GRACIAS POR SU COMPRA!</div>
    <div>
      Ticket original: ${ticketDate}<br/>
      ${transaction ? `Terminal: ${transaction.terminal_id || 'POS'}<br/>` : ''}
      ${transaction ? `Transacción: ${transaction.transaction_number}<br/>` : ''}
      Reimpreso: ${new Date().toLocaleString('es-MX')}
    </div>
    <div style="margin-top: 2mm;">
      Conserve este ticket como comprobante
    </div>
  </div>
</body>
</html>
    `;
  };

  const { subtotal, total, isWholesale, changeGiven } = calculateTotal();

  const stats = {
    totalOrders: orders.length,
    pending: orders.filter(o => o.status === 'quoted' || o.status === 'draft').length,
    confirmed: orders.filter(o => o.status === 'confirmed' || o.payment_status === 'paid').length,
    revenue: orders.filter(o => o.payment_status === 'paid').reduce((sum, o) => sum + o.total, 0),
    todaySales: orders.filter(o =>
      new Date(o.created_at).toDateString() === new Date().toDateString() &&
      o.payment_status === 'paid'
    ).reduce((sum, o) => sum + o.total, 0),
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Módulo de Ventas y POS</h2>
          <p className="text-gray-600 mt-1">Sistema completo de punto de venta y cotización remota</p>
        </div>
        <div className="flex items-center gap-4">
          {pendingWebOrders > 0 && (
            <button
              onClick={() => window.location.href = '/ecommerce?tab=orders'} // Or use navigation prop if available, but href is safe for full refresh swap
              className="flex items-center gap-2 bg-amber-100 text-amber-800 px-3 py-1.5 rounded-full hover:bg-amber-200 transition-colors animate-pulse cursor-pointer"
            >
              <Bell size={18} />
              <span className="font-bold text-sm">{pendingWebOrders} {pendingWebOrders === 1 ? 'Pedido Web' : 'Pedidos Web'}</span>
            </button>
          )}

          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg shadow-sm border border-stone-200">
            {/* Mode toggle removed */}
            <div className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-green-700">
              <Monitor className="w-4 h-4" />
              <span>POS Físico</span>
            </div>
          </div>

          {currentSession && (
            <button
              onClick={handleCloseSession}
              className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <Lock className="w-4 h-4" />
              <span>Cerrar Caja</span>
            </button>
          )}

          <button
            onClick={() => setShowNewOrderModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
          >
            < Plus className="w-4 h-4" />
            <span>Nueva Venta</span>
          </button>
        </div>
      </div>

      {currentSession && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center">
                <Monitor className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-green-900">Sesión Activa: {currentSession.session_number}</h3>
                <p className="text-sm text-green-700">
                  {selectedTerminal?.terminal_name} - Apertura: ${currentSession.opening_cash.toLocaleString('es-MX')}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-green-900">${currentSession.total_sales.toLocaleString('es-MX')}</p>
              <p className="text-sm text-green-700">{currentSession.total_transactions} transacciones</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Pedidos</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.totalOrders}</p>
            </div>
            <FileText className="w-10 h-10 text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pendientes</p>
              <p className="text-3xl font-bold text-orange-600 mt-1">{stats.pending}</p>
            </div>
            <Calendar className="w-10 h-10 text-orange-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Confirmados</p>
              <p className="text-3xl font-bold text-green-600 mt-1">{stats.confirmed}</p>
            </div>
            <ShoppingCart className="w-10 h-10 text-green-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Ventas Hoy</p>
              <p className="text-3xl font-bold text-blue-600 mt-1">${stats.todaySales.toLocaleString('es-MX')}</p>
            </div>
            <TrendingUp className="w-10 h-10 text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Ingresos Total</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">${stats.revenue.toLocaleString('es-MX')}</p>
            </div>
            <DollarSign className="w-10 h-10 text-green-500" />
          </div>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <DollarSign className="w-5 h-5 text-amber-600" />
          <div>
            <h3 className="font-semibold text-amber-900">Calculadora Automática de Mayoreo</h3>
            <p className="text-sm text-amber-700">
              Umbral: ${wholesaleThreshold.toLocaleString('es-MX')} MXN - Los precios se ajustan automáticamente al superar este monto
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Pedidos y Transacciones Recientes</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Número</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Canal</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pago</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-gray-500">Cargando...</td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-gray-500">No hay pedidos</td>
                </tr>
              ) : (
                orders.slice(0, 20).map((order) => {
                  const customer = customers.find(c => c.id === order.customer_id);
                  return (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">#{order.order_number}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${(order as any).sale_channel === 'pos'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-blue-100 text-blue-700'
                          }`}>
                          {(order as any).sale_channel === 'pos' ? 'POS' : 'Remoto'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                        {customer?.name || 'Público General'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${order.order_type === 'wholesale'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-700'
                          }`}>
                          {order.order_type === 'wholesale' ? 'Mayoreo' : 'Menudeo'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-900 font-semibold">
                        ${order.total.toLocaleString('es-MX')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${order.status === 'confirmed' || order.status === 'paid'
                          ? 'bg-green-100 text-green-700'
                          : order.status === 'quoted'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-gray-100 text-gray-700'
                          }`}>
                          {order.status === 'draft' ? 'Borrador' :
                            order.status === 'quoted' ? 'Cotizado' :
                              order.status === 'confirmed' ? 'Confirmado' : 'Pagado'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${order.payment_status === 'paid'
                          ? 'bg-green-100 text-green-700'
                          : order.payment_status === 'failed'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-yellow-100 text-yellow-700'
                          }`}>
                          {order.payment_status === 'paid' ? 'Pagado' :
                            order.payment_status === 'failed' ? 'Fallido' : 'Pendiente'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                        {new Date(order.created_at).toLocaleDateString('es-MX')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => setShowOrderDetails(order)}
                            className="text-blue-600 hover:text-blue-800"
                            title="Ver detalles"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {order.payment_status === 'paid' && (
                            <button
                              onClick={() => reprintTicket(order)}
                              className="text-green-600 hover:text-green-800"
                              title="Reimprimir ticket"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                          )}
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

      {showNewOrderModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-6xl w-full p-6 my-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  Nueva Venta POS
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Venta directa en terminal con pago inmediato
                </p>
              </div>
              <button
                onClick={() => {
                  setShowNewOrderModal(false);
                  setCart([]);
                  setSelectedCustomer(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <label className="block text-sm font-medium text-blue-900 mb-2">
                    <Scan className="w-4 h-4 inline mr-2" />
                    Escanear Código de Barras
                  </label>
                  <input
                    ref={scannerRef}
                    type="text"
                    value={scannerInput}
                    onChange={(e) => setScannerInput(e.target.value)}
                    onKeyPress={handleScanBarcode}
                    placeholder="Escanee el código o ingrese el SKU"
                    className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    autoFocus
                  />
                </div>


                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cliente (Opcional)
                  </label>
                  <select
                    value={selectedCustomer?.id || ''}
                    onChange={(e) => {
                      const customer = customers.find(c => c.id === e.target.value);
                      setSelectedCustomer(customer || null);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  >
                    <option value="">Público General</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name} - {customer.phone}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedCustomer && (
                  <div className={`rounded-lg border-2 p-4 ${selectedCustomer.credit_limit > 0
                    ? selectedCustomer.credit_status === 'active'
                      ? 'bg-green-50 border-green-300'
                      : selectedCustomer.credit_status === 'suspended'
                        ? 'bg-yellow-50 border-yellow-300'
                        : selectedCustomer.credit_status === 'blocked'
                          ? 'bg-red-50 border-red-300'
                          : 'bg-blue-50 border-blue-300'
                    : 'bg-slate-50 border-slate-300'
                    }`}>
                    <div className="flex items-start space-x-3">
                      <CreditCard className={`w-5 h-5 mt-0.5 ${selectedCustomer.credit_limit > 0
                        ? selectedCustomer.credit_status === 'active'
                          ? 'text-green-600'
                          : selectedCustomer.credit_status === 'suspended'
                            ? 'text-yellow-600'
                            : selectedCustomer.credit_status === 'blocked'
                              ? 'text-red-600'
                              : 'text-blue-600'
                        : 'text-slate-500'
                        }`} />
                      <div className="flex-1">
                        {selectedCustomer.credit_limit > 0 ? (
                          <>
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-semibold text-gray-900">Cliente con Línea de Crédito</h4>
                              <span className={`px-2 py-1 text-xs rounded-full font-medium ${selectedCustomer.credit_status === 'active'
                                ? 'bg-green-200 text-green-800'
                                : selectedCustomer.credit_status === 'suspended'
                                  ? 'bg-yellow-200 text-yellow-800'
                                  : selectedCustomer.credit_status === 'blocked'
                                    ? 'bg-red-200 text-red-800'
                                    : 'bg-gray-200 text-gray-800'
                                }`}>
                                {selectedCustomer.credit_status === 'active' ? 'Activo' :
                                  selectedCustomer.credit_status === 'suspended' ? 'Suspendido' :
                                    selectedCustomer.credit_status === 'blocked' ? 'Bloqueado' : 'Sin crédito'}
                              </span>
                            </div>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-600">Límite de Crédito:</span>
                                <span className="font-bold text-gray-900">
                                  ${selectedCustomer.credit_limit.toLocaleString('es-MX')}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Crédito Usado:</span>
                                <span className="font-semibold text-red-600">
                                  ${selectedCustomer.credit_used.toLocaleString('es-MX')}
                                </span>
                              </div>
                              <div className="flex justify-between border-t border-gray-300 pt-2">
                                <span className="text-gray-700 font-medium">Crédito Disponible:</span>
                                <span className="font-bold text-green-600">
                                  ${(selectedCustomer.credit_limit - selectedCustomer.credit_used).toLocaleString('es-MX')}
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                                <div
                                  className={`h-2.5 rounded-full transition-all ${(selectedCustomer.credit_used / selectedCustomer.credit_limit) * 100 >= 100
                                    ? 'bg-red-600'
                                    : (selectedCustomer.credit_used / selectedCustomer.credit_limit) * 100 >= 80
                                      ? 'bg-orange-500'
                                      : (selectedCustomer.credit_used / selectedCustomer.credit_limit) * 100 >= 60
                                        ? 'bg-yellow-500'
                                        : 'bg-green-500'
                                    }`}
                                  style={{
                                    width: `${Math.min((selectedCustomer.credit_used / selectedCustomer.credit_limit) * 100, 100)}%`
                                  }}
                                />
                              </div>
                            </div>
                            {selectedCustomer.credit_status !== 'active' && (
                              <div className="mt-3 bg-white rounded-lg p-2 border border-red-200">
                                <div className="flex items-center space-x-2">
                                  <AlertCircle className="w-4 h-4 text-red-600" />
                                  <p className="text-xs text-red-700 font-medium">
                                    {selectedCustomer.credit_status === 'suspended'
                                      ? 'Crédito suspendido temporalmente'
                                      : selectedCustomer.credit_status === 'blocked'
                                        ? 'Crédito bloqueado - No se pueden realizar ventas a crédito'
                                        : 'Sin línea de crédito activa'}
                                  </p>
                                </div>
                              </div>
                            )}
                            {selectedCustomer.credit_status === 'active' &&
                              (selectedCustomer.credit_limit - selectedCustomer.credit_used) < total && (
                                <div className="mt-3 bg-white rounded-lg p-2 border border-orange-200">
                                  <div className="flex items-center space-x-2">
                                    <AlertCircle className="w-4 h-4 text-orange-600" />
                                    <p className="text-xs text-orange-700 font-medium">
                                      Esta venta excede el crédito disponible. Se requerirá pago inmediato.
                                    </p>
                                  </div>
                                </div>
                              )}
                            {selectedCustomer.credit_notes && (
                              <div className="mt-2">
                                <p className="text-xs text-gray-600 italic">
                                  Nota: {selectedCustomer.credit_notes}
                                </p>
                              </div>
                            )}
                          </>
                        ) : (
                          <>
                            <h4 className="font-semibold text-gray-900 mb-1">Cliente de Contado</h4>
                            <p className="text-sm text-gray-600">
                              Este cliente no tiene línea de crédito. Todas las ventas deben ser pagadas de inmediato.
                            </p>
                            <div className="mt-2 bg-white rounded-lg p-2 border border-slate-200">
                              <div className="flex items-center space-x-2">
                                <Banknote className="w-4 h-4 text-slate-600" />
                                <p className="text-xs text-slate-700 font-medium">
                                  Pago requerido: ${total.toLocaleString('es-MX')}
                                </p>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Productos Disponibles
                  </label>
                  <div className="border border-gray-200 rounded-lg max-h-64 overflow-y-auto">
                    {products.map((product) => (
                      <div
                        key={product.id}
                        className="flex items-center justify-between p-3 border-b border-gray-100 hover:bg-gray-50"
                      >
                        <div className="flex-1">
                          <p className="font-medium text-sm text-gray-900">{product.name}</p>
                          <p className="text-xs text-gray-600">
                            SKU: {product.sku} - ${product.retail_price} - Stock: {product.total_stock}
                          </p>
                        </div>
                        <button
                          onClick={() => addToCart(product)}
                          className="px-3 py-1 bg-amber-100 text-amber-700 rounded text-sm hover:bg-amber-200"
                        >
                          Agregar
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-4">Carrito de Compra</h4>

                {cart.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <ShoppingCart className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p>No hay productos en el carrito</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
                      {cart.map((item) => (
                        <div key={item.product.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                          <div className="flex-1">
                            <p className="font-medium text-sm">{item.product.name}</p>
                            <p className="text-xs text-gray-600">
                              ${isWholesale ? item.product.wholesale_price : item.product.retail_price} c/u
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                              className="w-6 h-6 bg-gray-200 rounded text-gray-700 hover:bg-gray-300"
                            >
                              -
                            </button>
                            <span className="w-8 text-center font-medium">{item.quantity}</span>
                            <button
                              onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                              className="w-6 h-6 bg-gray-200 rounded text-gray-700 hover:bg-gray-300"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {isWholesale && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                        <p className="text-sm text-blue-800 font-medium">
                          Precios de Mayoreo Aplicados
                        </p>
                        <p className="text-xs text-blue-600">
                          El total supera ${wholesaleThreshold.toLocaleString('es-MX')}
                        </p>
                      </div>
                    )}

                    <div className="border-t border-gray-200 pt-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Subtotal:</span>
                        <span className="text-gray-900">${subtotal.toLocaleString('es-MX')}</span>
                      </div>
                      <div className="flex justify-between text-lg font-bold">
                        <span className="text-gray-900">Total:</span>
                        <span className="text-amber-600">${total.toLocaleString('es-MX')}</span>
                      </div>
                    </div>

                    <form onSubmit={handleCreateOrder} className="mt-6 space-y-4">


                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Notas (opcional)
                        </label>
                        <textarea
                          name="notes"
                          rows={2}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={cart.length === 0}
                        className="w-full px-4 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-semibold"
                      >
                        Procesar Venta ${total.toLocaleString('es-MX')}
                      </button>
                    </form>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Procesar Pago</h3>

            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-600">Total a pagar:</span>
                <span className="text-3xl font-bold text-green-600">${total.toLocaleString('es-MX')}</span>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Método de Pago</label>
                <div className="grid grid-cols-2 gap-2">
                  {selectedCustomer &&
                    selectedCustomer.credit_limit > 0 &&
                    selectedCustomer.credit_status === 'active' &&
                    (selectedCustomer.credit_limit - selectedCustomer.credit_used) >= total && (
                      <button
                        onClick={() => setSelectedPaymentMethod('credit')}
                        className={`flex items-center justify-center space-x-2 p-3 border-2 rounded-lg transition-colors ${selectedPaymentMethod === 'credit'
                          ? 'border-green-600 bg-green-50 text-green-900'
                          : 'border-blue-200 hover:border-blue-300 bg-blue-50'
                          }`}
                      >
                        <CreditCard className="w-5 h-5" />
                        <span className="text-sm font-medium">Crédito</span>
                      </button>
                    )}
                  {paymentMethods.map((method) => (
                    <button
                      key={method.id}
                      onClick={() => setSelectedPaymentMethod(method.name)}
                      className={`flex items-center justify-center space-x-2 p-3 border-2 rounded-lg transition-colors ${selectedPaymentMethod === method.name
                        ? 'border-green-600 bg-green-50 text-green-900'
                        : 'border-gray-200 hover:border-gray-300'
                        }`}
                    >
                      {method.type === 'cash' && <Banknote className="w-5 h-5" />}
                      {method.type === 'card' && <CreditCard className="w-5 h-5" />}
                      {method.type === 'digital_wallet' && <Smartphone className="w-5 h-5" />}
                      <span className="text-sm font-medium">{method.display_name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {selectedPaymentMethod === 'credit' && selectedCustomer && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start space-x-2 mb-3">
                    <CreditCard className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-semibold text-blue-900 mb-1">Pago con Crédito</h4>
                      <p className="text-sm text-blue-700 mb-2">
                        Se cargará el monto de la venta a la línea de crédito del cliente
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm bg-white rounded p-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Crédito Disponible:</span>
                      <span className="font-bold text-green-600">
                        ${(selectedCustomer.credit_limit - selectedCustomer.credit_used).toLocaleString('es-MX')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Monto de la Venta:</span>
                      <span className="font-bold text-blue-900">
                        ${total.toLocaleString('es-MX')}
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-gray-200 pt-2">
                      <span className="text-gray-700 font-medium">Crédito Después:</span>
                      <span className="font-bold text-orange-600">
                        ${(selectedCustomer.credit_limit - selectedCustomer.credit_used - total).toLocaleString('es-MX')}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {selectedPaymentMethod === 'cash' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Efectivo Recibido</label>
                  <input
                    type="number"
                    value={amountTendered || ''}
                    onChange={(e) => setAmountTendered(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="0.00"
                  />
                  {amountTendered > total && (
                    <p className="text-sm text-gray-600 mt-1">
                      Cambio: <span className="font-semibold text-green-600">${changeGiven.toFixed(2)}</span>
                    </p>
                  )}
                </div>
              )}

              {paymentMethods.find(m => m.name === selectedPaymentMethod)?.requires_reference && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Referencia de Pago</label>
                  <input
                    type="text"
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Últimos 4 dígitos o referencia"
                  />
                </div>
              )}

              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCompletePayment}
                  disabled={!selectedPaymentMethod || (selectedPaymentMethod === 'cash' && amountTendered < total)}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  <Check className="w-4 h-4" />
                  <span>Completar Venta</span>
                  <Printer className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showSessionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Abrir Sesión de Caja</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Terminal</label>
                {terminals.length === 0 ? (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-start space-x-2">
                      <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm text-red-800 font-medium">No hay terminales disponibles</p>
                        <p className="text-xs text-red-700 mt-1">
                          Debe crear al menos una terminal POS activa antes de abrir una sesión de caja.
                          Contacte al administrador del sistema.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <select
                    value={selectedTerminal?.id || ''}
                    onChange={(e) => {
                      const terminal = terminals.find(t => t.id === e.target.value);
                      setSelectedTerminal(terminal || null);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="">Seleccione una terminal</option>
                    {terminals.map((terminal) => (
                      <option key={terminal.id} value={terminal.id}>
                        {terminal.terminal_name} - {terminal.location}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {terminals.length > 0 && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Efectivo de Apertura</label>
                    <input
                      type="number"
                      value={openingCash}
                      onChange={(e) => setOpeningCash(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="1000"
                      step="0.01"
                      min="0"
                    />
                    <p className="text-xs text-gray-500 mt-1">Cantidad inicial de efectivo en la caja</p>
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <div className="flex items-start space-x-2">
                      <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm text-yellow-800 font-medium">Importante</p>
                        <p className="text-xs text-yellow-700 mt-1">
                          Verifique que el efectivo en caja coincida con el monto ingresado.
                          Esta cantidad será verificada al cierre de sesión.
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}

              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => setShowSessionModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleOpenSession}
                  disabled={!selectedTerminal || terminals.length === 0}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  <Check className="w-4 h-4" />
                  <span>Abrir Caja</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showOrderDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Detalles del Pedido #{showOrderDetails.order_number}</h3>
              <button
                onClick={() => setShowOrderDetails(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Cliente</p>
                  <p className="font-medium">
                    {customers.find(c => c.id === showOrderDetails.customer_id)?.name || 'Público General'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Tipo</p>
                  <p className="font-medium">
                    {showOrderDetails.order_type === 'wholesale' ? 'Mayoreo' : 'Menudeo'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total</p>
                  <p className="font-bold text-lg text-amber-600">
                    ${showOrderDetails.total.toLocaleString('es-MX')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Canal de Venta</p>
                  <p className="font-medium">
                    {(showOrderDetails as any).sale_channel === 'pos' ? 'POS Físico' : 'Venta Remota'}
                  </p>
                </div>
              </div>

              {showOrderDetails.notes && (
                <div>
                  <p className="text-sm text-gray-600">Notas</p>
                  <p className="font-medium">{showOrderDetails.notes}</p>
                </div>
              )}

              <div className="pt-4">
                <button
                  onClick={() => setShowOrderDetails(null)}
                  className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
