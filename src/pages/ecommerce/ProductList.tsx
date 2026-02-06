import React, { useState } from 'react';
import { supabase, Product } from '../../lib/supabase';
import { Search, Filter, Edit, Eye, Trash2, MoreVertical, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

interface ProductListProps {
    products: Product[];
    onRefresh: () => void;
    onEdit: (product: Product) => void;
}

export function ProductList({ products, onRefresh, onEdit }: ProductListProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<'all' | 'published' | 'draft'>('all');
    const [filterCategory, setFilterCategory] = useState<string>('all');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // Derive unique categories from products for filter dropdown
    const categories = Array.from(new Set(products.map(p => p.category).filter(Boolean)));

    const filteredProducts = products.filter(product => {
        const matchesSearch =
            product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            product.sku.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus =
            filterStatus === 'all' ? true :
                filterStatus === 'published' ? product.is_published_online :
                    !product.is_published_online;

        const matchesCategory =
            filterCategory === 'all' ? true :
                product.category === filterCategory;

        return matchesSearch && matchesStatus && matchesCategory;
    });

    const toggleSelectAll = () => {
        if (selectedIds.size === filteredProducts.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredProducts.map(p => p.id)));
        }
    };

    const toggleSelect = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    const handleBulkAction = async (action: 'publish' | 'unpublish' | 'delete') => {
        if (selectedIds.size === 0) return;
        if (!confirm(`¿Estás seguro de aplicar esta acción a ${selectedIds.size} productos?`)) return;

        try {
            if (action === 'delete') {
                await supabase.from('products').delete().in('id', Array.from(selectedIds));
            } else {
                const isPublished = action === 'publish';
                await supabase.from('products')
                    .update({ is_published_online: isPublished })
                    .in('id', Array.from(selectedIds));
            }
            onRefresh();
            setSelectedIds(new Set());
        } catch (error) {
            console.error('Error in bulk action:', error);
            alert('Error al procesar acción');
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col h-full">
            {/* Toolbar */}
            <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row gap-4 justify-between items-center bg-gray-50 rounded-t-xl">
                <div className="relative w-full sm:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Buscar por nombre o SKU..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
                    <select
                        value={filterStatus}
                        onChange={e => setFilterStatus(e.target.value as any)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                    >
                        <option value="all">Todos los estados</option>
                        <option value="published">Publicados</option>
                        <option value="draft">Borradores</option>
                    </select>

                    <select
                        value={filterCategory}
                        onChange={e => setFilterCategory(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm max-w-[150px]"
                    >
                        <option value="all">Todas las categorías</option>
                        {categories.map(cat => (
                            <option key={cat} value={cat as string}>{cat}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Bulk Actions Bar */}
            {selectedIds.size > 0 && (
                <div className="bg-blue-50 px-4 py-2 flex items-center justify-between border-b border-blue-100 animate-fade-in">
                    <span className="text-sm font-medium text-blue-800">{selectedIds.size} seleccionados</span>
                    <div className="flex gap-2">
                        <button
                            onClick={() => handleBulkAction('publish')}
                            className="text-xs px-3 py-1 bg-white border border-blue-200 text-blue-700 rounded hover:bg-blue-50"
                        >
                            Publicar
                        </button>
                        <button
                            onClick={() => handleBulkAction('unpublish')}
                            className="text-xs px-3 py-1 bg-white border border-blue-200 text-blue-700 rounded hover:bg-blue-50"
                        >
                            Despublicar
                        </button>
                        <button
                            onClick={() => handleBulkAction('delete')}
                            className="text-xs px-3 py-1 bg-white border border-red-200 text-red-700 rounded hover:bg-red-50"
                        >
                            Eliminar
                        </button>
                    </div>
                </div>
            )}

            {/* Table */}
            <div className="overflow-x-auto flex-1">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-medium">
                        <tr>
                            <th className="px-6 py-3 w-10">
                                <input
                                    type="checkbox"
                                    checked={selectedIds.size === filteredProducts.length && filteredProducts.length > 0}
                                    onChange={toggleSelectAll}
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                            </th>
                            <th className="px-6 py-3">Producto</th>
                            <th className="px-6 py-3">Categoría</th>
                            <th className="px-6 py-3">Stock</th>
                            <th className="px-6 py-3 text-right">Precio</th>
                            <th className="px-6 py-3 text-center">Estado</th>
                            <th className="px-6 py-3 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredProducts.map(product => (
                            <tr key={product.id} className="hover:bg-gray-50 transition-colors group">
                                <td className="px-6 py-4">
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.has(product.id)}
                                        onChange={() => toggleSelect(product.id)}
                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden border border-gray-200">
                                            {product.image_url ? (
                                                <img src={product.image_url} alt="" className="h-full w-full object-cover" />
                                            ) : (
                                                <div className="h-full w-full flex items-center justify-center text-gray-400">
                                                    <Eye size={16} />
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <div className="font-medium text-gray-900">{product.name}</div>
                                            <div className="text-xs text-gray-500">SKU: {product.sku}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-600">
                                    <span className="px-2 py-1 bg-gray-100 rounded-full text-xs">
                                        {product.category || 'Sin categoría'}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className={`flex items-center gap-1.5 text-sm font-medium
                    ${product.total_stock === 0 ? 'text-red-600' :
                                            product.total_stock < 5 ? 'text-yellow-600' : 'text-green-600'}`
                                    }>
                                        {product.total_stock === 0 ? <XCircle size={14} /> :
                                            product.total_stock < 5 ? <AlertTriangle size={14} /> :
                                                <CheckCircle size={14} />}
                                        {product.total_stock} uds
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right font-medium text-gray-900">
                                    ${product.retail_price.toLocaleString('es-MX')}
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
                    ${product.is_published_online
                                            ? 'bg-green-100 text-green-800'
                                            : 'bg-gray-100 text-gray-800'}`
                                    }>
                                        {product.is_published_online ? 'Publicado' : 'Borrador'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => onEdit(product)}
                                            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                                            title="Editar"
                                        >
                                            <Edit size={16} />
                                        </button>
                                        {/* Add more actions if needed */}
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {filteredProducts.length === 0 && (
                            <tr>
                                <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                                    No se encontraron productos que coincidan con los filtros.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
