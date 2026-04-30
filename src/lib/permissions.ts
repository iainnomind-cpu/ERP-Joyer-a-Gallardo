import { supabase } from './supabase';

// Module IDs matching Layout.tsx
export type ModuleId = 'dashboard' | 'crm' | 'inventory' | 'sales' | 'config' | 'kanban' | 'marketing' | 'quotes' | 'ecommerce' | 'inbox';
export type RoleId = 'admin' | 'vendedor' | 'cajero';
export type ActionId = 'view' | 'create' | 'edit' | 'delete';

export interface ModulePermissions {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
}

export type PermissionsMap = Record<ModuleId, ModulePermissions>;

// Human-readable module labels
export const MODULE_LABELS: Record<ModuleId, string> = {
  dashboard: 'Dashboard',
  crm: 'CRM (Clientes)',
  inventory: 'Inventario',
  sales: 'Ventas (POS)',
  quotes: 'Cotizaciones',
  kanban: 'Pipeline',
  marketing: 'Marketing',
  ecommerce: 'E-commerce',
  config: 'Configuración',
  inbox: 'Bandeja de Entrada',
};

export const ALL_MODULES: ModuleId[] = ['dashboard', 'crm', 'inventory', 'sales', 'quotes', 'kanban', 'marketing', 'ecommerce', 'config', 'inbox'];

// ─────────────────────────────────────────────
// Default permission matrices per role
// ─────────────────────────────────────────────
const FULL = { view: true, create: true, edit: true, delete: true };
const VIEW_ONLY = { view: true, create: false, edit: false, delete: false };
const VIEW_CREATE = { view: true, create: true, edit: false, delete: false };
const VIEW_CREATE_EDIT = { view: true, create: true, edit: true, delete: false };
const NONE = { view: false, create: false, edit: false, delete: false };

const DEFAULT_PERMISSIONS: Record<RoleId, PermissionsMap> = {
  admin: {
    dashboard: FULL,
    crm: FULL,
    inventory: FULL,
    sales: FULL,
    quotes: FULL,
    kanban: FULL,
    marketing: FULL,
    ecommerce: FULL,
    config: FULL,
    inbox: FULL,
  },
  vendedor: {
    dashboard: VIEW_ONLY,
    crm: VIEW_CREATE_EDIT,
    inventory: VIEW_CREATE_EDIT,
    sales: FULL,
    quotes: VIEW_CREATE_EDIT,
    kanban: VIEW_CREATE_EDIT,
    marketing: VIEW_ONLY,
    ecommerce: NONE,
    config: NONE,
    inbox: VIEW_CREATE_EDIT,
  },
  cajero: {
    dashboard: VIEW_ONLY,
    crm: VIEW_ONLY,
    inventory: VIEW_ONLY,
    sales: VIEW_CREATE,
    quotes: VIEW_CREATE,
    kanban: NONE,
    marketing: NONE,
    ecommerce: NONE,
    config: NONE,
    inbox: NONE,
  },
};

/**
 * Get the default permissions for a role (no DB overrides)
 */
export function getDefaultPermissions(role: RoleId): PermissionsMap {
  return DEFAULT_PERMISSIONS[role] || DEFAULT_PERMISSIONS.cajero;
}

/**
 * Merge default permissions with any user-specific overrides from DB
 */
export function mergePermissions(role: RoleId, overrides?: Partial<PermissionsMap>): PermissionsMap {
  const defaults = getDefaultPermissions(role);
  if (!overrides) return defaults;

  const merged = { ...defaults };
  for (const mod of ALL_MODULES) {
    if (overrides[mod]) {
      merged[mod] = { ...defaults[mod], ...overrides[mod] };
    }
  }
  return merged;
}

/**
 * Check if user can access a module (has view permission)
 */
export function canAccessModule(permissions: PermissionsMap, module: ModuleId): boolean {
  return permissions[module]?.view ?? false;
}

/**
 * Get module permissions for a specific module
 */
export function getModulePermissions(permissions: PermissionsMap, module: ModuleId): ModulePermissions {
  return permissions[module] || NONE;
}

/**
 * Load user-specific permission overrides from DB
 */
export async function loadUserPermissions(userId: string): Promise<Partial<PermissionsMap> | null> {
  const { data } = await supabase
    .from('user_permissions')
    .select('permissions')
    .eq('user_id', userId)
    .maybeSingle();

  return data?.permissions || null;
}

/**
 * Save user-specific permission overrides to DB
 */
export async function saveUserPermissions(
  userId: string,
  permissions: Partial<PermissionsMap>,
  updatedBy: string
): Promise<boolean> {
  const { error } = await supabase
    .from('user_permissions')
    .upsert({
      user_id: userId,
      permissions,
      updated_at: new Date().toISOString(),
      updated_by: updatedBy,
    }, { onConflict: 'user_id' });

  return !error;
}
