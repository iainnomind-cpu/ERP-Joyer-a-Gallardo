
import React, { useState, useEffect } from 'react';
import { supabase, Product, Category } from '../../lib/supabase';
import { Package, Layers, Plus } from 'lucide-react';

import { CategoryManager } from './CategoryManager';
import { ProductWizard } from './ProductWizard';
import { ProductList } from './ProductList';
import { WebOrders } from './WebOrders';

export function EcommerceLayout() {
    const [activeTab, setActiveTab] = useState(() => {
        const params = new URLSearchParams(window.location.search);
        return params.get('tab') || 'orders';
    });
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingProduct, setEditingProduct] = useState<Product | undefined>(undefined);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const tab = params.get('tab');
        if (tab) {
            console.log('Setting tab from URL:', tab);
            setActiveTab(tab);
        }
        fetchData();
    }, []);

    const fetchData = async () => {
        // setLoading(true); // Don't block UI on refresh if already loaded once, maybe separate initial load
        const [productsResult, categoriesResult] = await Promise.all([
            supabase.from('products').select('*').order('created_at', { ascending: false }),
            supabase.from('categories').select('*').order('name')
        ]);

        if (productsResult.data) setProducts(productsResult.data);
        if (categoriesResult.data) setCategories(categoriesResult.data);
        setLoading(false);
    };

    const handleEditProduct = (product: Product) => {
        setEditingProduct(product);
        setActiveTab('products-new');
    };

    const renderContent = () => {
        if (loading) {
            return (
                <div className="flex items-center justify-center h-96">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
            );
        }

        switch (activeTab) {
            case 'dashboard':
            // deleted
            case 'products':
                return (
                    <ProductList
                        products={products}
                        onRefresh={fetchData}
                        onEdit={handleEditProduct}
                    />
                );
            case 'categories':
                return <CategoryManager categories={categories} onUpdate={fetchData} />;
            case 'products-new':
                return (
                    <ProductWizard
                        initialProduct={editingProduct}
                        onCancel={() => {
                            setEditingProduct(undefined);
                            setActiveTab('products');
                        }}
                        onSuccess={() => {
                            setEditingProduct(undefined);
                            fetchData();
                            setActiveTab('products');
                        }}
                    />
                );

            case 'orders':
                return <WebOrders />;
            default:
                return <WebOrders />;
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-4">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">E-commerce</h1>
                        <p className="text-sm text-gray-500">Gestión de Tienda en Línea</p>
                    </div>
                    <button
                        onClick={() => setActiveTab('products-new')}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors shadow-sm"
                    >
                        <Plus size={20} /> Nuevo Producto
                    </button>
                </div>
            </div>

            {/* Navigation */}
            <div className="bg-white border-b border-gray-200 px-6">
                <div className="max-w-7xl mx-auto flex gap-6 overflow-x-auto">

                    <NavButton
                        active={activeTab === 'products'}
                        onClick={() => setActiveTab('products')}
                        icon={<Package size={20} />}
                        label="Productos"
                    />
                    <NavButton
                        active={activeTab === 'categories'}
                        onClick={() => setActiveTab('categories')}
                        icon={<Layers size={20} />}
                        label="Categorías"
                    />
                    <NavButton
                        active={activeTab === 'orders'}
                        onClick={() => setActiveTab('orders')}
                        icon={<Package size={20} />}
                        label="Pedidos Web"
                    />

                </div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto p-6">
                {renderContent()}
            </div>
        </div>
    );
}

function NavButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
    return (
        <button
            onClick={onClick}
            className={`flex items - center gap - 2 py - 4 border - b - 2 transition - colors whitespace - nowrap px - 2
        ${active
                    ? 'border-blue-600 text-blue-600 font-medium'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } `}
        >
            {icon}
            {label}
        </button>
    );
}

// Add import at the top
// import { WebOrders } from './WebOrders';
