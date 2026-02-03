import { useState, useEffect } from 'react';
import { supabase, Product, StockAlert } from '../../lib/supabase';
import { Package, Search, AlertCircle, Plus, TrendingDown, Edit2, Save, X, History, Printer, Wand2, Clock, ArrowUpCircle, ArrowDownCircle, Activity, Trash2, Edit } from 'lucide-react';

interface CurrentUser {
  id: string;
  username: string;
  full_name: string;
  email?: string;
  role: 'admin' | 'vendedor' | 'cajero';
  is_active: boolean;
}

interface InventoryModuleProps {
  currentUser: CurrentUser | null;
}

export default function InventoryModule({ currentUser }: InventoryModuleProps) {
  const getUserName = () => currentUser?.full_name || 'Sistema';
  const [products, setProducts] = useState<Product[]>([]);
  const [stockAlerts, setStockAlerts] = useState<StockAlert[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMaterial, setFilterMaterial] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<string | null>(null);
  const [editingFullProduct, setEditingFullProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [showMovementsModal, setShowMovementsModal] = useState<Product | null>(null);
  const [showLabelModal, setShowLabelModal] = useState<Product | null>(null);
  const [movements, setMovements] = useState<any[]>([]);
  const [labelQuantity, setLabelQuantity] = useState(1);
  const [autoGenerateSKU, setAutoGenerateSKU] = useState(false);

  const [labelConfig, setLabelConfig] = useState({
    size: '62x29' as '62x29' | '62x39' | '62x50' | '29x90',
    showSKU: true,
    showName: true,
    showPrice: true,
    showBarcode: true,
    showMaterial: true,
    priceType: 'retail' as 'retail' | 'wholesale' | 'both'
  });

  useEffect(() => {
    loadProducts();
    loadStockAlerts();
  }, []);

  const loadProducts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('name', { ascending: true });

    if (!error && data) {
      setProducts(data);
      checkStockLevels(data);
    }
    setLoading(false);
  };

  const loadStockAlerts = async () => {
    const { data } = await supabase
      .from('stock_alerts')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (data) {
      setStockAlerts(data);
    }
  };

  const checkStockLevels = async (productsData: Product[]) => {
    for (const product of productsData) {
      if (product.total_stock <= product.min_stock_alert) {
        const alertType = product.total_stock === 0 ? 'out_of_stock' : 'low_stock';

        const { data: existingAlert } = await supabase
          .from('stock_alerts')
          .select('*')
          .eq('product_id', product.id)
          .eq('status', 'active')
          .maybeSingle();

        if (!existingAlert) {
          await supabase
            .from('stock_alerts')
            .insert({
              product_id: product.id,
              alert_type: alertType,
              current_stock: product.total_stock,
              status: 'active'
            });
        }
      }
    }
  };

  const handleAddProduct = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    let sku = formData.get('sku') as string;
    const material = formData.get('material') as string;

    // Generar SKU automático si está habilitado
    if (autoGenerateSKU || !sku) {
      const { data: generatedSKU, error: skuError } = await supabase
        .rpc('generate_sku', { material_type: material });

      if (!skuError && generatedSKU) {
        sku = generatedSKU;
      }
    }

    const stockA = parseInt(formData.get('stock_a') as string) || 0;
    const stockB = parseInt(formData.get('stock_b') as string) || 0;
    const stockC = parseInt(formData.get('stock_c') as string) || 0;

    const { data: product, error } = await supabase
      .from('products')
      .insert({
        sku: sku,
        name: formData.get('name') as string,
        description: formData.get('description') as string,
        material: material,
        category: formData.get('category') as string,
        retail_price: parseFloat(formData.get('retail_price') as string),
        wholesale_price: parseFloat(formData.get('wholesale_price') as string),
        stock_a: stockA,
        stock_b: stockB,
        stock_c: stockC,
        min_stock_alert: parseInt(formData.get('min_stock_alert') as string) || 5,
        is_base_line: formData.get('is_base_line') === 'on',
      })
      .select()
      .single();

    if (!error && product) {
      // Registrar movimiento inicial de stock si hay stock
      if (stockA > 0 || stockB > 0 || stockC > 0) {
        await supabase
          .from('inventory_movements')
          .insert({
            product_id: product.id,
            movement_type: 'in',
            quantity_a: stockA,
            quantity_b: stockB,
            quantity_c: stockC,
            notes: 'Stock inicial al crear producto',
            created_by: getUserName()
          });
      }

      setShowAddModal(false);
      setAutoGenerateSKU(false);
      loadProducts();
      e.currentTarget.reset();
    }
  };

  const handleUpdateStock = async (productId: string, stockA: number, stockB: number, stockC: number) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const { error } = await supabase
      .from('products')
      .update({
        stock_a: stockA,
        stock_b: stockB,
        stock_c: stockC,
        updated_at: new Date().toISOString()
      })
      .eq('id', productId);

    if (!error) {
      await supabase
        .from('inventory_movements')
        .insert({
          product_id: productId,
          movement_type: 'adjustment',
          quantity_a: stockA,
          quantity_b: stockB,
          quantity_c: stockC,
          notes: `Ajuste manual: Almacén=${product.stock_a}→${stockA}, Local GJ=${product.stock_b}→${stockB}, Local 2=${product.stock_c}→${stockC}`,
          created_by: getUserName()
        });

      setEditingProduct(null);
      loadProducts();
      loadStockAlerts();
    }
  };

  const handleEditProduct = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingFullProduct) return;

    const formData = new FormData(e.currentTarget);

    const stockA = parseInt(formData.get('stock_a') as string) || 0;
    const stockB = parseInt(formData.get('stock_b') as string) || 0;
    const stockC = parseInt(formData.get('stock_c') as string) || 0;

    const { error } = await supabase
      .from('products')
      .update({
        name: formData.get('name') as string,
        description: formData.get('description') as string,
        material: formData.get('material') as string,
        category: formData.get('category') as string,
        retail_price: parseFloat(formData.get('retail_price') as string),
        wholesale_price: parseFloat(formData.get('wholesale_price') as string),
        stock_a: stockA,
        stock_b: stockB,
        stock_c: stockC,
        min_stock_alert: parseInt(formData.get('min_stock_alert') as string) || 5,
        is_base_line: formData.get('is_base_line') === 'on',
        updated_at: new Date().toISOString()
      })
      .eq('id', editingFullProduct.id);

    if (!error) {
      // Registrar movimiento si cambió el stock
      if (stockA !== editingFullProduct.stock_a || stockB !== editingFullProduct.stock_b || stockC !== editingFullProduct.stock_c) {
        await supabase
          .from('inventory_movements')
          .insert({
            product_id: editingFullProduct.id,
            movement_type: 'adjustment',
            quantity_a: stockA,
            quantity_b: stockB,
            quantity_c: stockC,
            notes: `Edición de producto: Almacén=${editingFullProduct.stock_a}→${stockA}, Local GJ=${editingFullProduct.stock_b}→${stockB}, Local 2=${editingFullProduct.stock_c}→${stockC}`,
            created_by: getUserName()
          });
      }

      setShowEditModal(false);
      setEditingFullProduct(null);
      loadProducts();
      loadStockAlerts();
    }
  };

  const handleDeleteProduct = async (product: Product) => {
    const confirmDelete = window.confirm(
      `¿Estás seguro de eliminar el producto "${product.name}"?\n\nSKU: ${product.sku}\n\nEsta acción no se puede deshacer.`
    );

    if (!confirmDelete) return;

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', product.id);

    if (error) {
      alert('Error al eliminar el producto. Verifica que no tenga pedidos asociados.');
    } else {
      loadProducts();
      loadStockAlerts();
    }
  };

  const openEditModal = (product: Product) => {
    setEditingFullProduct(product);
    setShowEditModal(true);
  };

  const loadMovements = async (productId: string) => {
    const { data } = await supabase
      .from('inventory_movements')
      .select('*')
      .eq('product_id', productId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (data) {
      setMovements(data);
    }
  };

  const generateBarcodeHTML = (sku: string, isSmallLabel: boolean = false) => {
    const bars = sku.split('').map((char) => {
      const code = char.charCodeAt(0);
      const height = isSmallLabel ? 20 + (code % 10) : 20 + (code % 10);
      const width = isSmallLabel ? 1.5 : (code % 2 === 0 ? 2 : 3);
      return `<div style="width: ${width}px; height: ${height}px; background: black; display: inline-block; margin: 0 ${isSmallLabel ? '0.5' : '1'}px;"></div>`;
    }).join('');

    return `
      <div style="text-align: center; margin: ${isSmallLabel ? '3mm' : '3mm'} 0;">
        <div style="display: inline-flex; align-items: flex-end; height: ${isSmallLabel ? '30px' : '25px'}; border-left: 2px solid black; border-right: 2px solid black; padding: 0 2px;">
          ${bars}
        </div>
        <div style="font-size: ${isSmallLabel ? '9pt' : '7pt'}; font-family: 'Courier New', monospace; letter-spacing: 0.5px; margin-top: 1mm;">
          ${sku}
        </div>
      </div>
    `;
  };

  const generateLabelHTML = (product: Product) => {
    const { size, showSKU, showName, showPrice, showBarcode, showMaterial, priceType } = labelConfig;

    const dimensions = {
      '62x29': { width: '62mm', height: '29mm' },
      '62x39': { width: '62mm', height: '39mm' },
      '62x50': { width: '62mm', height: '50mm' },
      '29x90': { width: '29mm', height: '90mm' }
    }[size];

    const priceRetail = product.retail_price.toFixed(2);
    const priceWholesale = product.wholesale_price.toFixed(2);

    const contentHeight = size === '62x29' ? '27mm' :
                          size === '62x39' ? '37mm' :
                          size === '62x50' ? '48mm' : '88mm';

    const isSmallLabel = size === '29x90';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Etiqueta - ${product.name}</title>
        <style>
          @page {
            size: ${dimensions.width} ${dimensions.height};
            margin: 0;
          }

          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }

          body {
            margin: 0;
            padding: 0;
            font-family: Arial, sans-serif;
            background: white;
          }

          .label-container {
            width: ${isSmallLabel ? '27mm' : '58mm'};
            height: ${contentHeight};
            margin: 0 auto;
            padding: ${isSmallLabel ? '2mm' : '2mm'};
            display: flex;
            flex-direction: column;
            justify-content: ${isSmallLabel ? 'center' : 'space-between'};
            page-break-after: always;
            background: white;
          }

          .label-content {
            display: flex;
            flex-direction: column;
            gap: ${isSmallLabel ? '1mm' : '1mm'};
            ${isSmallLabel ? 'align-items: center;' : ''}
          }

          .product-name {
            font-size: ${isSmallLabel ? '14pt' : '11pt'};
            font-weight: bold;
            text-align: center;
            line-height: 1.2;
            overflow: hidden;
            text-overflow: ellipsis;
            display: -webkit-box;
            -webkit-line-clamp: ${isSmallLabel ? '4' : '2'};
            -webkit-box-orient: vertical;
          }

          .product-sku {
            font-size: ${isSmallLabel ? '9pt' : '8pt'};
            text-align: center;
            color: #333;
            margin-top: ${isSmallLabel ? '1mm' : '1mm'};
          }

          .product-material {
            font-size: ${isSmallLabel ? '9pt' : '8pt'};
            text-align: center;
            color: #666;
            font-style: italic;
          }

          .product-price {
            font-size: ${isSmallLabel ? '18pt' : '13pt'};
            font-weight: bold;
            text-align: center;
            margin: ${isSmallLabel ? '3mm' : '2mm'} 0;
          }

          .price-retail {
            color: #000;
          }

          .price-wholesale {
            color: #555;
            font-size: ${isSmallLabel ? '16pt' : '10pt'};
          }

          .price-both {
            display: flex;
            flex-direction: ${isSmallLabel ? 'column' : 'row'};
            justify-content: space-around;
            align-items: center;
            gap: ${isSmallLabel ? '3mm' : '3mm'};
          }

          .price-label {
            font-size: ${isSmallLabel ? '8pt' : '7pt'};
            color: #666;
            font-weight: normal;
          }

          .barcode-container {
            margin-top: auto;
          }

          @media print {
            body {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }

            .label-container {
              page-break-inside: avoid;
            }
          }
        </style>
      </head>
      <body>
        <div class="label-container">
          <div class="label-content">
            ${showName ? `<div class="product-name">${product.name}</div>` : ''}
            ${showSKU ? `<div class="product-sku">SKU: ${product.sku}</div>` : ''}
            ${showMaterial ? `<div class="product-material">${product.material}</div>` : ''}

            ${showPrice ? (
              priceType === 'both'
                ? `<div class="product-price price-both">
                     <div>
                       <div class="price-label">Menudeo</div>
                       <div class="price-retail">$${priceRetail}</div>
                     </div>
                     <div>
                       <div class="price-label">Mayoreo</div>
                       <div class="price-wholesale">$${priceWholesale}</div>
                     </div>
                   </div>`
                : priceType === 'retail'
                  ? `<div class="product-price price-retail">$${priceRetail}</div>`
                  : `<div class="product-price price-wholesale">$${priceWholesale}</div>`
            ) : ''}
          </div>

          ${showBarcode ? `<div class="barcode-container">${generateBarcodeHTML(product.sku, isSmallLabel)}</div>` : ''}
        </div>
      </body>
      </html>
    `;
  };

  const imprimirEtiquetas = async (product: Product) => {
    console.log('=== INICIO DE IMPRESION ===');

    const isSmallLabel = labelConfig.size === '29x90';
    const priceRetail = product.retail_price.toFixed(2);
    const priceWholesale = product.wholesale_price.toFixed(2);
    const contentHeight = labelConfig.size === '62x29' ? '27mm' :
                          labelConfig.size === '62x39' ? '37mm' :
                          labelConfig.size === '62x50' ? '48mm' : '88mm';

    const allLabelsHTML = Array.from({ length: labelQuantity }, () => `
    <div class="label-container">
      <div class="label-content">
        ${labelConfig.showName ? `<div class="product-name">${product.name}</div>` : ''}
        ${labelConfig.showSKU ? `<div class="product-sku">SKU: ${product.sku}</div>` : ''}
        ${labelConfig.showMaterial ? `<div class="product-material">${product.material}</div>` : ''}
        ${labelConfig.showPrice ? (
          labelConfig.priceType === 'both'
            ? `<div class="product-price price-both">
                 <div><div class="price-label">Menudeo</div><div class="price-retail">$${priceRetail}</div></div>
                 <div><div class="price-label">Mayoreo</div><div class="price-wholesale">$${priceWholesale}</div></div>
               </div>`
            : labelConfig.priceType === 'retail'
              ? `<div class="product-price price-retail">$${priceRetail}</div>`
              : `<div class="product-price price-wholesale">$${priceWholesale}</div>`
        ) : ''}
      </div>
      ${labelConfig.showBarcode ? `<div class="barcode-container">${generateBarcodeHTML(product.sku, isSmallLabel)}</div>` : ''}
    </div>
  `).join('');

    const finalHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Etiquetas - ${product.name}</title>
  <style>
    @page {
      size: ${labelConfig.size === '62x29' ? '62mm 29mm' :
              labelConfig.size === '62x39' ? '62mm 39mm' :
              labelConfig.size === '62x50' ? '62mm 50mm' : '29mm 90mm'};
      margin: 0;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { margin: 0; padding: 0; font-family: Arial, sans-serif; background: white; }
    .label-container {
      width: ${isSmallLabel ? '27mm' : '58mm'};
      height: ${contentHeight};
      margin: 0 auto;
      padding: ${isSmallLabel ? '2mm' : '2mm'};
      display: flex;
      flex-direction: column;
      justify-content: ${isSmallLabel ? 'center' : 'space-between'};
      page-break-after: always;
      background: white;
      font-family: Arial, sans-serif;
    }
    .label-content {
      display: flex;
      flex-direction: column;
      gap: ${isSmallLabel ? '1mm' : '1mm'};
      ${isSmallLabel ? 'align-items: center;' : ''}
    }
    .product-name {
      font-size: ${isSmallLabel ? '14pt' : '11pt'};
      font-weight: bold;
      text-align: center;
      line-height: 1.2;
      overflow: hidden;
      text-overflow: ellipsis;
      display: -webkit-box;
      -webkit-line-clamp: ${isSmallLabel ? '4' : '2'};
      -webkit-box-orient: vertical;
    }
    .product-sku {
      font-size: ${isSmallLabel ? '9pt' : '8pt'};
      text-align: center;
      color: #333;
      margin-top: ${isSmallLabel ? '1mm' : '1mm'};
    }
    .product-material {
      font-size: ${isSmallLabel ? '9pt' : '8pt'};
      text-align: center;
      color: #666;
      font-style: italic;
    }
    .product-price {
      font-size: ${isSmallLabel ? '20pt' : '13pt'};
      font-weight: bold;
      text-align: center;
      margin: ${isSmallLabel ? '3mm' : '2mm'} 0;
    }
    .price-retail { color: #000; }
    .price-wholesale {
      color: #555;
      font-size: ${isSmallLabel ? '16pt' : '10pt'};
    }
    .price-both {
      display: flex;
      flex-direction: ${isSmallLabel ? 'column' : 'row'};
      justify-content: space-around;
      align-items: center;
      gap: ${isSmallLabel ? '3mm' : '3mm'};
    }
    .price-label {
      font-size: ${isSmallLabel ? '8pt' : '7pt'};
      color: #666;
      font-weight: normal;
    }
    .barcode-container { margin-top: auto; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .label-container { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  ${allLabelsHTML}
</body>
</html>
`;

    // CREAR IFRAME OCULTO
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    iframe.style.visibility = 'hidden';

    document.body.appendChild(iframe);

    // ESCRIBIR CONTENIDO
    const iframeDoc = iframe.contentWindow!.document;
    iframeDoc.open();
    iframeDoc.write(finalHTML);
    iframeDoc.close();

    // ESPERAR Y LUEGO IMPRIMIR
    setTimeout(() => {
      iframe.contentWindow!.focus();
      iframe.contentWindow!.print();

      // Guardar historial
      supabase
        .from('label_print_history')
        .insert({
          product_id: product.id,
          sku: product.sku,
          product_name: product.name,
          material: product.material,
          quantity: labelQuantity,
          label_size: labelConfig.size,
          printed_by: getUserName(),
          print_status: 'completed'
        });

      // Limpiar iframe después de imprimir
      setTimeout(() => {
        document.body.removeChild(iframe);
        console.log('=== IMPRESION COMPLETADA ===');
      }, 1000);
    }, 1000);

    setShowLabelModal(null);
    setLabelQuantity(1);
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         p.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesMaterial = filterMaterial === 'all' || p.material === filterMaterial;
    return matchesSearch && matchesMaterial;
  });

  const stats = {
    total: products.length,
    lowStock: products.filter(p => p.total_stock <= p.min_stock_alert && p.total_stock > 0).length,
    outOfStock: products.filter(p => p.total_stock === 0).length,
    baseLines: products.filter(p => p.is_base_line).length
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Módulo de Inventario</h2>
          <p className="text-gray-600 mt-1">Control de existencias y catálogo digital</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Nuevo Producto</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Productos</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.total}</p>
            </div>
            <Package className="w-10 h-10 text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Stock Bajo</p>
              <p className="text-3xl font-bold text-orange-600 mt-1">{stats.lowStock}</p>
            </div>
            <TrendingDown className="w-10 h-10 text-orange-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Sin Stock</p>
              <p className="text-3xl font-bold text-red-600 mt-1">{stats.outOfStock}</p>
            </div>
            <AlertCircle className="w-10 h-10 text-red-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Líneas Base</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.baseLines}</p>
            </div>
            <Package className="w-10 h-10 text-green-500" />
          </div>
        </div>
      </div>

      {stockAlerts.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-orange-900">Alertas de Stock</h3>
              <p className="text-sm text-orange-700 mt-1">
                {stockAlerts.length} producto{stockAlerts.length > 1 ? 's' : ''} requieren atención
              </p>
              <div className="mt-3 space-y-2">
                {stockAlerts.slice(0, 3).map((alert) => {
                  const product = products.find(p => p.id === alert.product_id);
                  return (
                    <div key={alert.id} className="flex items-center justify-between bg-white rounded p-2">
                      <div>
                        <p className="font-medium text-sm">{product?.name}</p>
                        <p className="text-xs text-gray-600">
                          Stock: {alert.current_stock} - {alert.alert_type === 'out_of_stock' ? 'Agotado' : 'Stock bajo'}
                        </p>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded ${
                        alert.alert_type === 'out_of_stock' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                      }`}>
                        {alert.alert_type === 'out_of_stock' ? 'Urgente' : 'Bajo'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-4 border-b border-gray-200 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar por nombre o SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setFilterMaterial('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                filterMaterial === 'all' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-700'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setFilterMaterial('Plata Pura')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                filterMaterial === 'Plata Pura' ? 'bg-gray-200 text-gray-900' : 'bg-gray-100 text-gray-700'
              }`}
            >
              Plata Pura
            </button>
            <button
              onClick={() => setFilterMaterial('Baño de Oro')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                filterMaterial === 'Baño de Oro' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'
              }`}
            >
              Baño de Oro
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  SKU
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Producto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Material
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Precio Menudeo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Precio Mayoreo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Almacén / GJ / L2
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                    Cargando productos...
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                    No se encontraron productos
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{product.sku}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{product.name}</div>
                      {product.is_base_line && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                          Línea Base
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        product.material === 'Plata Pura'
                          ? 'bg-gray-100 text-gray-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {product.material}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                      ${product.retail_price.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                      ${product.wholesale_price.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editingProduct === product.id ? (
                        <div className="flex space-x-1">
                          <input
                            type="number"
                            id={`stock-a-${product.id}`}
                            defaultValue={product.stock_a}
                            min="0"
                            className="w-12 px-1 py-1 text-sm border border-gray-300 rounded"
                          />
                          <input
                            type="number"
                            id={`stock-b-${product.id}`}
                            defaultValue={product.stock_b}
                            min="0"
                            className="w-12 px-1 py-1 text-sm border border-gray-300 rounded"
                          />
                          <input
                            type="number"
                            id={`stock-c-${product.id}`}
                            defaultValue={product.stock_c}
                            min="0"
                            className="w-12 px-1 py-1 text-sm border border-gray-300 rounded"
                          />
                        </div>
                      ) : (
                        <div className="text-sm text-gray-600">
                          {product.stock_a} / {product.stock_b} / {product.stock_c}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`font-semibold ${
                        product.total_stock === 0
                          ? 'text-red-600'
                          : product.total_stock <= product.min_stock_alert
                          ? 'text-orange-600'
                          : 'text-green-600'
                      }`}>
                        {product.total_stock}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editingProduct === product.id ? (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => {
                              const stockA = parseInt((document.getElementById(`stock-a-${product.id}`) as HTMLInputElement).value);
                              const stockB = parseInt((document.getElementById(`stock-b-${product.id}`) as HTMLInputElement).value);
                              const stockC = parseInt((document.getElementById(`stock-c-${product.id}`) as HTMLInputElement).value);
                              handleUpdateStock(product.id, stockA, stockB, stockC);
                            }}
                            className="text-green-600 hover:text-green-800"
                            title="Guardar"
                          >
                            <Save className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditingProduct(null)}
                            className="text-gray-600 hover:text-gray-800"
                            title="Cancelar"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => openEditModal(product)}
                            className="text-blue-600 hover:text-blue-800"
                            title="Editar producto"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditingProduct(product.id)}
                            className="text-amber-600 hover:text-amber-800"
                            title="Editar stock"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setShowMovementsModal(product);
                              loadMovements(product.id);
                            }}
                            className="text-gray-600 hover:text-gray-800"
                            title="Ver historial"
                          >
                            <History className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setShowLabelModal(product)}
                            className="text-green-600 hover:text-green-800"
                            title="Imprimir etiqueta"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(product)}
                            className="text-red-600 hover:text-red-800"
                            title="Eliminar producto"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-2 sm:p-4">
          <div className="bg-white rounded-lg w-full max-w-[95vw] sm:max-w-2xl lg:max-w-3xl max-h-[95vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-3 sm:px-4 md:px-6 py-3 sm:py-4 rounded-t-lg z-10">
              <h3 className="text-base sm:text-lg md:text-xl font-bold text-gray-900">Nuevo Producto</h3>
            </div>
            <form onSubmit={handleAddProduct} className="flex flex-col max-h-[calc(95vh-8rem)]">
            <div className="px-3 sm:px-4 md:px-6 py-4 overflow-y-auto space-y-3 sm:space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4 mb-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-start sm:items-center space-x-2">
                    <Wand2 className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5 sm:mt-0" />
                    <div className="min-w-0">
                      <h4 className="font-semibold text-blue-900 text-sm sm:text-base">Generación Automática de SKU</h4>
                      <p className="text-xs sm:text-sm text-blue-700">El sistema genera códigos únicos automáticamente</p>
                    </div>
                  </div>
                  <label className="flex items-center space-x-2 flex-shrink-0">
                    <input
                      type="checkbox"
                      checked={autoGenerateSKU}
                      onChange={(e) => setAutoGenerateSKU(e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-xs sm:text-sm font-medium text-blue-900">Activar</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    SKU {autoGenerateSKU && <span className="text-blue-600 text-xs">(se generará automáticamente)</span>}
                  </label>
                  <input
                    type="text"
                    name="sku"
                    required={!autoGenerateSKU}
                    disabled={autoGenerateSKU}
                    placeholder={autoGenerateSKU ? 'Se generará automáticamente' : 'Ej: GJ-PP-000001'}
                    className="w-full px-2 sm:px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Nombre</label>
                  <input
                    type="text"
                    name="name"
                    required
                    className="w-full px-2 sm:px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Descripción</label>
                <textarea
                  name="description"
                  rows={2}
                  className="w-full px-2 sm:px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Material</label>
                  <select
                    name="material"
                    required
                    className="w-full px-2 sm:px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  >
                    <option value="Plata Pura">Plata Pura</option>
                    <option value="Baño de Oro">Baño de Oro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Categoría</label>
                  <input
                    type="text"
                    name="category"
                    className="w-full px-2 sm:px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Precio Menudeo</label>
                  <input
                    type="number"
                    name="retail_price"
                    step="0.01"
                    required
                    className="w-full px-2 sm:px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Precio Mayoreo</label>
                  <input
                    type="number"
                    name="wholesale_price"
                    step="0.01"
                    required
                    className="w-full px-2 sm:px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Almacén</label>
                  <input
                    type="number"
                    name="stock_a"
                    min="0"
                    defaultValue="0"
                    className="w-full px-2 sm:px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Local GJ</label>
                  <input
                    type="number"
                    name="stock_b"
                    min="0"
                    defaultValue="0"
                    className="w-full px-2 sm:px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Local 2</label>
                  <input
                    type="number"
                    name="stock_c"
                    min="0"
                    defaultValue="0"
                    className="w-full px-2 sm:px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    <span className="hidden sm:inline">Alerta Mínima</span>
                    <span className="sm:hidden">Alerta</span>
                  </label>
                  <input
                    type="number"
                    name="min_stock_alert"
                    min="0"
                    defaultValue="5"
                    className="w-full px-2 sm:px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="is_base_line"
                  id="is_base_line"
                  className="w-4 h-4 text-amber-600 border-gray-300 rounded focus:ring-amber-500"
                />
                <label htmlFor="is_base_line" className="ml-2 text-xs sm:text-sm text-gray-700">
                  Línea Base (7 líneas principales)
                </label>
              </div>
            </div>

            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-3 sm:px-4 md:px-6 py-3 sm:py-4 rounded-b-lg mt-auto">
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setAutoGenerateSKU(false);
                  }}
                  className="w-full sm:flex-1 px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="w-full sm:flex-1 px-3 sm:px-4 py-2 text-sm sm:text-base bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
                >
                  Crear Producto
                </button>
              </div>
            </div>
            </form>
          </div>
        </div>
      )}

      {showEditModal && editingFullProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-2 sm:p-4">
          <div className="bg-white rounded-lg w-full max-w-[95vw] sm:max-w-2xl lg:max-w-3xl max-h-[95vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-3 sm:px-4 md:px-6 py-3 sm:py-4 rounded-t-lg z-10 flex items-center justify-between">
              <h3 className="text-base sm:text-lg md:text-xl font-bold text-gray-900">Editar Producto</h3>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingFullProduct(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleEditProduct} className="flex flex-col max-h-[calc(95vh-8rem)]">
            <div className="px-3 sm:px-4 md:px-6 py-4 overflow-y-auto space-y-3 sm:space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs sm:text-sm text-blue-800">
                  <span className="font-semibold">SKU:</span> {editingFullProduct.sku}
                </p>
                <p className="text-xs text-blue-700 mt-1">El SKU no puede ser modificado</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Nombre</label>
                  <input
                    type="text"
                    name="name"
                    required
                    defaultValue={editingFullProduct.name}
                    className="w-full px-2 sm:px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Descripción</label>
                <textarea
                  name="description"
                  rows={2}
                  defaultValue={editingFullProduct.description || ''}
                  className="w-full px-2 sm:px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Material</label>
                  <select
                    name="material"
                    required
                    defaultValue={editingFullProduct.material}
                    className="w-full px-2 sm:px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="Plata Pura">Plata Pura</option>
                    <option value="Baño de Oro">Baño de Oro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Categoría</label>
                  <input
                    type="text"
                    name="category"
                    defaultValue={editingFullProduct.category || ''}
                    className="w-full px-2 sm:px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Precio Menudeo</label>
                  <input
                    type="number"
                    name="retail_price"
                    step="0.01"
                    required
                    defaultValue={editingFullProduct.retail_price}
                    className="w-full px-2 sm:px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Precio Mayoreo</label>
                  <input
                    type="number"
                    name="wholesale_price"
                    step="0.01"
                    required
                    defaultValue={editingFullProduct.wholesale_price}
                    className="w-full px-2 sm:px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Almacén</label>
                  <input
                    type="number"
                    name="stock_a"
                    min="0"
                    defaultValue={editingFullProduct.stock_a}
                    className="w-full px-2 sm:px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Local GJ</label>
                  <input
                    type="number"
                    name="stock_b"
                    min="0"
                    defaultValue={editingFullProduct.stock_b}
                    className="w-full px-2 sm:px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Local 2</label>
                  <input
                    type="number"
                    name="stock_c"
                    min="0"
                    defaultValue={editingFullProduct.stock_c}
                    className="w-full px-2 sm:px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    <span className="hidden sm:inline">Alerta Mínima</span>
                    <span className="sm:hidden">Alerta</span>
                  </label>
                  <input
                    type="number"
                    name="min_stock_alert"
                    min="0"
                    defaultValue={editingFullProduct.min_stock_alert}
                    className="w-full px-2 sm:px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="is_base_line"
                  id="edit_is_base_line"
                  defaultChecked={editingFullProduct.is_base_line}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="edit_is_base_line" className="ml-2 text-xs sm:text-sm text-gray-700">
                  Línea Base (7 líneas principales)
                </label>
              </div>

              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-600">
                  <span className="font-medium">Creado:</span>{' '}
                  {new Date(editingFullProduct.created_at).toLocaleString('es-MX')}
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  <span className="font-medium">Última actualización:</span>{' '}
                  {new Date(editingFullProduct.updated_at).toLocaleString('es-MX')}
                </p>
              </div>
            </div>

            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-3 sm:px-4 md:px-6 py-3 sm:py-4 rounded-b-lg mt-auto">
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingFullProduct(null);
                  }}
                  className="w-full sm:flex-1 px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="w-full sm:flex-1 px-3 sm:px-4 py-2 text-sm sm:text-base bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Guardar Cambios
                </button>
              </div>
            </div>
            </form>
          </div>
        </div>
      )}

      {showMovementsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-4xl w-full p-6 my-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Historial de Movimientos</h3>
                <p className="text-sm text-gray-600 mt-1">
                  {showMovementsModal.name} - SKU: {showMovementsModal.sku}
                </p>
              </div>
              <button
                onClick={() => setShowMovementsModal(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <ArrowUpCircle className="w-5 h-5 text-green-600" />
                  <span className="font-semibold text-green-900">Entradas</span>
                </div>
                <p className="text-2xl font-bold text-green-600">
                  {movements.filter(m => m.movement_type === 'in').length}
                </p>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <ArrowDownCircle className="w-5 h-5 text-red-600" />
                  <span className="font-semibold text-red-900">Salidas</span>
                </div>
                <p className="text-2xl font-bold text-red-600">
                  {movements.filter(m => m.movement_type === 'out').length}
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Activity className="w-5 h-5 text-blue-600" />
                  <span className="font-semibold text-blue-900">Ajustes</span>
                </div>
                <p className="text-2xl font-bold text-blue-600">
                  {movements.filter(m => m.movement_type === 'adjustment').length}
                </p>
              </div>
            </div>

            <div className="overflow-x-auto max-h-96">
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Almacén</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Local GJ</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Local 2</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notas</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usuario</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {movements.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                        No hay movimientos registrados
                      </td>
                    </tr>
                  ) : (
                    movements.map((movement) => (
                      <tr key={movement.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                          <div className="flex items-center space-x-1">
                            <Clock className="w-3 h-3" />
                            <span>{new Date(movement.created_at).toLocaleString('es-MX')}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            movement.movement_type === 'in'
                              ? 'bg-green-100 text-green-700'
                              : movement.movement_type === 'out'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {movement.movement_type === 'in' ? 'Entrada' :
                             movement.movement_type === 'out' ? 'Salida' : 'Ajuste'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-sm font-medium text-gray-900">
                          {movement.quantity_a}
                        </td>
                        <td className="px-4 py-3 text-center text-sm font-medium text-gray-900">
                          {movement.quantity_b}
                        </td>
                        <td className="px-4 py-3 text-center text-sm font-medium text-gray-900">
                          {movement.quantity_c}
                        </td>
                        <td className="px-4 py-3 text-center text-sm font-bold text-gray-900">
                          {movement.quantity_a + movement.quantity_b + movement.quantity_c}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">
                          {movement.notes || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {movement.created_by || '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-6">
              <button
                onClick={() => setShowMovementsModal(null)}
                className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {showLabelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-5xl w-full p-6 my-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-2">
                <Printer className="w-6 h-6 text-green-600" />
                <h3 className="text-xl font-bold text-gray-900">Configurar e Imprimir Etiqueta - Brother QL-800</h3>
              </div>
              <button
                onClick={() => {
                  setShowLabelModal(null);
                  setLabelQuantity(1);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-2">{showLabelModal.name}</h4>
                  <div className="space-y-1 text-sm text-gray-600">
                    <p><span className="font-medium">SKU:</span> {showLabelModal.sku}</p>
                    <p><span className="font-medium">Material:</span> {showLabelModal.material}</p>
                    <p><span className="font-medium">Precio Menudeo:</span> ${showLabelModal.retail_price.toFixed(2)}</p>
                    <p><span className="font-medium">Precio Mayoreo:</span> ${showLabelModal.wholesale_price.toFixed(2)}</p>
                    <p><span className="font-medium">Stock disponible:</span> {showLabelModal.total_stock} unidades</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tamaño de Etiqueta
                  </label>
                  <select
                    value={labelConfig.size}
                    onChange={(e) => setLabelConfig({ ...labelConfig, size: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="62x29">62mm x 29mm (Pequeña)</option>
                    <option value="62x39">62mm x 39mm (Mediana)</option>
                    <option value="62x50">62mm x 50mm (Grande)</option>
                    <option value="29x90">29mm x 90mm - DK1201 (Dirección)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cantidad de Copias
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={labelQuantity}
                    onChange={(e) => setLabelQuantity(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-900 mb-3">Elementos a Mostrar</h4>
                  <div className="space-y-2">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={labelConfig.showName}
                        onChange={(e) => setLabelConfig({ ...labelConfig, showName: e.target.checked })}
                        className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                      />
                      <span className="text-sm text-blue-900">Nombre del Producto</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={labelConfig.showSKU}
                        onChange={(e) => setLabelConfig({ ...labelConfig, showSKU: e.target.checked })}
                        className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                      />
                      <span className="text-sm text-blue-900">Código SKU</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={labelConfig.showMaterial}
                        onChange={(e) => setLabelConfig({ ...labelConfig, showMaterial: e.target.checked })}
                        className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                      />
                      <span className="text-sm text-blue-900">Material</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={labelConfig.showPrice}
                        onChange={(e) => setLabelConfig({ ...labelConfig, showPrice: e.target.checked })}
                        className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                      />
                      <span className="text-sm text-blue-900">Precio</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={labelConfig.showBarcode}
                        onChange={(e) => setLabelConfig({ ...labelConfig, showBarcode: e.target.checked })}
                        className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                      />
                      <span className="text-sm text-blue-900">Código de Barras</span>
                    </label>
                  </div>
                </div>

                {labelConfig.showPrice && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tipo de Precio
                    </label>
                    <select
                      value={labelConfig.priceType}
                      onChange={(e) => setLabelConfig({ ...labelConfig, priceType: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      <option value="retail">Solo Menudeo</option>
                      <option value="wholesale">Solo Mayoreo</option>
                      <option value="both">Ambos Precios</option>
                    </select>
                  </div>
                )}

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-sm text-amber-800">
                    <span className="font-semibold">Brother QL-800:</span> Configurado para etiquetas de rollo continuo.
                    Resolución 300x600 dpi. Ancho máximo imprimible: 58mm.
                  </p>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Vista Previa</h4>
                <div className="border-2 border-gray-300 rounded-lg p-6 bg-gray-50 flex items-center justify-center min-h-96">
                  <div
                    className="bg-white shadow-lg border border-gray-300"
                    style={{
                      width: labelConfig.size === '29x90' ? '102px' : '234px',
                      height: labelConfig.size === '29x90' ? '340px' :
                              labelConfig.size === '62x29' ? '110px' :
                              labelConfig.size === '62x39' ? '147px' : '189px',
                      padding: labelConfig.size === '29x90' ? '7.5px' : '8px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: labelConfig.size === '29x90' ? 'center' : 'space-between'
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {labelConfig.showName && (
                        <div style={{
                          fontSize: labelConfig.size === '29x90' ? '14pt' : '11pt',
                          fontWeight: 'bold',
                          textAlign: 'center',
                          lineHeight: '1.2',
                          overflow: 'hidden',
                          display: '-webkit-box',
                          WebkitLineClamp: labelConfig.size === '29x90' ? 4 : 2,
                          WebkitBoxOrient: 'vertical',
                          textOverflow: 'ellipsis'
                        }}>
                          {showLabelModal.name}
                        </div>
                      )}
                      {labelConfig.showSKU && (
                        <div style={{
                          fontSize: labelConfig.size === '29x90' ? '9pt' : '8pt',
                          textAlign: 'center',
                          color: '#333',
                          marginTop: labelConfig.size === '29x90' ? '2px' : '2px'
                        }}>
                          SKU: {showLabelModal.sku}
                        </div>
                      )}
                      {labelConfig.showMaterial && (
                        <div style={{
                          fontSize: labelConfig.size === '29x90' ? '9pt' : '8pt',
                          textAlign: 'center',
                          color: '#666',
                          fontStyle: 'italic'
                        }}>
                          {showLabelModal.material}
                        </div>
                      )}
                      {labelConfig.showPrice && (
                        <div style={{ marginTop: labelConfig.size === '29x90' ? '6px' : '4px' }}>
                          {labelConfig.priceType === 'both' ? (
                            <div style={{
                              display: 'flex',
                              flexDirection: labelConfig.size === '29x90' ? 'column' : 'row',
                              justifyContent: 'space-around',
                              gap: labelConfig.size === '29x90' ? '6px' : '8px',
                              alignItems: 'center'
                            }}>
                              <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: labelConfig.size === '29x90' ? '8pt' : '7pt', color: '#666' }}>Menudeo</div>
                                <div style={{ fontSize: labelConfig.size === '29x90' ? '20pt' : '13pt', fontWeight: 'bold' }}>
                                  ${showLabelModal.retail_price.toFixed(2)}
                                </div>
                              </div>
                              <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: labelConfig.size === '29x90' ? '8pt' : '7pt', color: '#666' }}>Mayoreo</div>
                                <div style={{ fontSize: labelConfig.size === '29x90' ? '16pt' : '10pt', fontWeight: 'bold', color: '#555' }}>
                                  ${showLabelModal.wholesale_price.toFixed(2)}
                                </div>
                              </div>
                            </div>
                          ) : labelConfig.priceType === 'retail' ? (
                            <div style={{ fontSize: labelConfig.size === '29x90' ? '20pt' : '13pt', fontWeight: 'bold', textAlign: 'center' }}>
                              ${showLabelModal.retail_price.toFixed(2)}
                            </div>
                          ) : (
                            <div style={{ fontSize: labelConfig.size === '29x90' ? '20pt' : '13pt', fontWeight: 'bold', textAlign: 'center', color: '#555' }}>
                              ${showLabelModal.wholesale_price.toFixed(2)}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    {labelConfig.showBarcode && (
                      <div style={{ marginTop: 'auto', paddingTop: labelConfig.size === '29x90' ? '4px' : '4px' }}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{
                            display: 'inline-flex',
                            alignItems: 'flex-end',
                            height: labelConfig.size === '29x90' ? '30px' : '25px',
                            borderLeft: '2px solid black',
                            borderRight: '2px solid black',
                            padding: '0 2px',
                            gap: labelConfig.size === '29x90' ? '0.5px' : '1px'
                          }}>
                            {showLabelModal.sku.split('').map((char, idx) => {
                              const code = char.charCodeAt(0);
                              const height = labelConfig.size === '29x90' ? 20 + (code % 10) : 20 + (code % 10);
                              const width = labelConfig.size === '29x90' ? 1.5 : (code % 2 === 0 ? 2 : 3);
                              return (
                                <div
                                  key={idx}
                                  style={{
                                    width: `${width}px`,
                                    height: `${height}px`,
                                    background: 'black',
                                    display: 'inline-block'
                                  }}
                                />
                              );
                            })}
                          </div>
                          <div style={{
                            fontSize: labelConfig.size === '29x90' ? '9pt' : '7pt',
                            fontFamily: 'Courier New, monospace',
                            letterSpacing: '0.5px',
                            marginTop: '2px'
                          }}>
                            {showLabelModal.sku}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <p className="text-xs text-gray-500 text-center mt-2">
                  Vista previa aproximada. El tamaño real puede variar según la impresora.
                </p>
              </div>
            </div>

            <div className="flex space-x-3 mt-6 pt-6 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowLabelModal(null);
                  setLabelQuantity(1);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => imprimirEtiquetas(showLabelModal)}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center space-x-2"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir {labelQuantity > 1 ? `${labelQuantity} Etiquetas` : 'Etiqueta'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
