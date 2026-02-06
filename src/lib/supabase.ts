import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type User = {
  id: string;
  username: string;
  full_name: string;
  email: string | null;
  role: 'admin' | 'vendedor' | 'cajero';
  is_active: boolean;
  password_hash: string;
  created_at: string;
  updated_at: string;
};

export type Customer = {
  id: string;
  phone: string;
  name: string;
  source: string;
  material_preference: string;
  segment: string | null;
  total_purchases: number;
  last_purchase_date: string | null;
  credit_limit: number;
  credit_used: number;
  credit_status: 'none' | 'active' | 'suspended' | 'blocked';
  credit_notes: string | null;
  created_at: string;
  updated_at: string;
};

export type Product = {
  id: string;
  sku: string;
  name: string;
  description: string | null; // Keep for backward compatibility or short desc
  short_description: string | null;
  detailed_description: string | null;
  slug: string | null;

  material: string;
  category: string | null; // Primary category
  image_url: string | null; // Primary image

  retail_price: number;
  wholesale_price: number;
  sale_price: number | null;
  is_on_sale: boolean;
  sale_start_date: string | null;
  sale_end_date: string | null;

  stock_a: number;
  stock_b: number;
  stock_c: number;
  total_stock: number;
  min_stock_alert: number;

  is_base_line: boolean;
  is_published_online: boolean;

  // Specs & Shipping
  weight: number | null;
  width: number | null;
  height: number | null;
  length: number | null;

  // SEO
  meta_title: string | null;
  meta_description: string | null;
  keywords: string[] | null;

  // Validation / Rules
  min_order_quantity: number | null;
  max_order_quantity: number | null;

  // JSONB fields for flexibility
  attributes: any; // e.g. { stone: "Diamond", karat: "18k" }
  images: any;     // e.g. [{url: "...", alt: "..."}] (Gallery)
  tags: string[];

  created_at: string;
  updated_at: string;
};

export type Order = {
  id: string;
  order_number: string;
  customer_id: string | null;
  status: string;
  order_type: 'venta' | 'cotizacion';
  subtotal: number;
  total: number;
  payment_status: string;
  payment_link: string | null;
  delivery_method: string | null;
  delivery_address: string | null;
  created_by: string;              // 🔑 ID del usuario (FK)
  served_by_name?: string | null;  // 🧾 Nombre visible
  sale_channel?: 'pos' | 'online' | 'remoto';
  pos_terminal_id?: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};


export type OrderItem = {
  id: string;
  order_id: string;
  product_id: string | null;
  quantity: number;
  unit_price: number;
  subtotal: number;
  created_at: string;
};

export type BusinessRule = {
  id: string;
  rule_key: string;
  rule_name: string;
  rule_value: any;
  description: string | null;
  is_active: boolean;
  updated_at: string;
};

export type ChurnAlert = {
  id: string;
  customer_id: string;
  days_inactive: number;
  status: string;
  created_at: string;
  resolved_at: string | null;
};

export type StockAlert = {
  id: string;
  product_id: string;
  alert_type: string;
  current_stock: number;
  status: string;
  created_at: string;
  resolved_at: string | null;
};

export type POSTerminal = {
  id: string;
  terminal_number: string;
  terminal_name: string;
  location: string;
  is_active: boolean;
  printer_config: any;
  scanner_config: any;
  created_at: string;
  updated_at: string;
};

export type POSSession = {
  id: string;
  terminal_id: string;
  session_number: string;
  opened_by: string;
  opened_at: string;
  closed_by: string | null;
  closed_at: string | null;
  opening_cash: number;
  closing_cash: number | null;
  expected_cash: number | null;
  cash_difference: number | null;
  total_sales: number;
  total_transactions: number;
  status: string;
  notes: string | null;
};

export type POSTransaction = {
  id: string;
  session_id: string;
  order_id: string;
  transaction_number: string;
  sale_type: string;
  payment_method: string;
  payment_reference: string | null;
  payment_details: any;
  amount_tendered: number | null;
  change_given: number;
  ticket_printed: boolean;
  ticket_number: string | null;
  completed_at: string;
  created_by: string | null;
};

export type PaymentMethod = {
  id: string;
  name: string;
  display_name: string;
  type: string;
  icon: string | null;
  requires_reference: boolean;
  requires_authorization: boolean;
  commission_rate: number;
  is_active: boolean;
  sort_order: number;
  created_at: string;
};

export type PaymentLink = {
  id: string;
  order_id: string;
  link_code: string;
  link_url: string;
  amount: number;
  payment_provider: string;
  provider_transaction_id: string | null;
  expires_at: string;
  status: string;
  paid_at: string | null;
  payment_method_used: string | null;
  created_at: string;
};

export type CreditTransaction = {
  id: string;
  customer_id: string;
  transaction_type: 'charge' | 'payment' | 'adjustment' | 'limit_change';
  amount: number;
  previous_balance: number;
  new_balance: number;
  previous_limit: number | null;
  new_limit: number | null;
  reference: string | null;
  notes: string | null;
  created_at: string;
};

export type Category = {
  id: string;
  name: string;
  parent_id: string | null;
  slug: string | null;
  description: string | null;
  image_url: string | null;
  is_visible_in_menu: boolean;
  sort_order: number;
  created_at: string;
};

export const STORAGE_BUCKET = 'product-images';

export async function uploadProductImage(file: File): Promise<string> {
  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) {
    throw new Error('La imagen debe ser menor a 5MB');
  }

  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Formato no válido. Usa JPG, PNG, GIF o WEBP');
  }

  const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
  const filePath = `products/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (uploadError) {
    console.error('Upload error:', uploadError);
    throw new Error(`Error al subir imagen: ${uploadError.message}`);
  }

  const { data } = supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(filePath);

  return data.publicUrl;
}

export async function deleteProductImage(imageUrl: string): Promise<void> {
  if (!imageUrl) return;

  try {
    const url = new URL(imageUrl);
    const pathParts = url.pathname.split('/');
    const bucketIndex = pathParts.findIndex(part => part === STORAGE_BUCKET);

    if (bucketIndex !== -1 && pathParts.length > bucketIndex + 1) {
      const filePath = pathParts.slice(bucketIndex + 1).join('/');
      const { error } = await supabase.storage.from(STORAGE_BUCKET).remove([filePath]);

      if (error) {
        console.error('Delete error:', error);
      }
    }
  } catch (error) {
    console.error('Error parsing image URL:', error);
  }
}