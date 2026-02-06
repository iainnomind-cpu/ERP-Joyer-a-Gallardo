import React, { useState, useEffect } from 'react';
import { supabase, Product, Category, uploadProductImage } from '../../lib/supabase';
import { Save, ArrowRight, ArrowLeft, Upload, X, Check, Image as ImageIcon } from 'lucide-react';

interface ProductWizardProps {
    onCancel: () => void;
    onSuccess: () => void;
    initialProduct?: Product;
}

export function ProductWizard({ onCancel, onSuccess, initialProduct }: ProductWizardProps) {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [categories, setCategories] = useState<Category[]>([]);

    // Step 1: Inventory Selection (Simplified for now, assuming new product or passed initialProduct)
    // Step 2: Basic Info
    // Step 3: Images
    // Step 4: Categorization
    // Step 5: Sales & Variants

    const [formData, setFormData] = useState<Partial<Product>>({
        name: '',
        sku: '',
        description: '',
        short_description: '',
        detailed_description: '',
        retail_price: 0,
        wholesale_price: 0, // Required by DB
        total_stock: 0,
        category: '',
        is_published_online: false,
        images: [],
        tags: [],
        ...initialProduct
    });

    useEffect(() => {
        supabase.from('categories').select('*').then(({ data }) => {
            if (data) setCategories(data);
        });
    }, []);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;

        try {
            setLoading(true);
            const file = e.target.files[0];
            const publicUrl = await uploadProductImage(file);

            // Update form data with new image
            const currentImages = (formData.images as any[]) || [];
            const newImage = { url: publicUrl, alt: formData.name, sort_order: currentImages.length };

            setFormData(prev => ({
                ...prev,
                image_url: prev.image_url || publicUrl, // Set primary if none
                images: [...currentImages, newImage]
            }));
        } catch (error) {
            console.error('Error uploading:', error);
            alert('Error al subir imagen');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setLoading(true);

            // Destructure to remove total_stock from the direct payload
            // We map total_stock input to stock_a instead
            const { total_stock, ...rest } = formData;

            const payload: any = {
                ...rest,
                // Sanitize category: send null if empty string
                category: formData.category || null,
                // Generate slug if missing
                slug: formData.slug || formData.name?.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, ''),
                updated_at: new Date().toISOString(),
                // ALWAYS map total_stock input to stock_a, even on updates
                // Since total_stock is a generated column, we must update the physical columns (stock_a)
                stock_a: formData.total_stock || 0
            };

            if (initialProduct?.id) {
                // specific update logic if needed, but simple update is fine
                await supabase.from('products').update(payload).eq('id', initialProduct.id);
            } else {
                await supabase.from('products').insert({
                    ...payload,
                    created_at: new Date().toISOString(),
                    // Ensure required fields for new products
                    sku: formData.sku || `SKU-${Date.now()}`,
                    material: formData.material || 'General',
                    // Map the input total_stock to stock_a (primary warehouse)
                    stock_a: formData.total_stock || 0,
                    stock_b: 0,
                    stock_c: 0,
                    min_stock_alert: 5,
                    is_base_line: false
                });
            }
            onSuccess();
        } catch (error: any) {
            console.error('Error saving product:', error);
            alert(`Error al guardar producto: ${error.message || 'Datos inválidos'}`);
        } finally {
            setLoading(false);
        }
    };

    const renderStep1_BasicInfo = () => (
        <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Información Básica</h3>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Nombre del Producto</label>
                    <input
                        type="text"
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">SKU</label>
                    <input
                        type="text"
                        value={formData.sku}
                        onChange={e => setFormData({ ...formData, sku: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                    />
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700">Descripción Corta (SEO)</label>
                <textarea
                    rows={2}
                    value={formData.short_description || ''}
                    onChange={e => setFormData({ ...formData, short_description: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700">Descripción Detallada</label>
                <textarea
                    rows={5}
                    value={formData.detailed_description || ''}
                    onChange={e => setFormData({ ...formData, detailed_description: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                />
            </div>
        </div>
    );

    const renderStep2_Categorization = () => (
        <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Categorización</h3>

            <div>
                <label className="block text-sm font-medium text-gray-700">Categoría Principal</label>
                <select
                    value={formData.category || ''}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                >
                    <option value="">Seleccionar Categoría</option>
                    {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </select>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700">Etiquetas (Separadas por coma)</label>
                <input
                    type="text"
                    placeholder="oro, anillo, compromiso"
                    value={(formData.tags || []).join(', ')}
                    onChange={e => setFormData({ ...formData, tags: e.target.value.split(',').map(s => s.trim()) })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                />
            </div>
        </div>
    );

    const renderStep3_Images = () => (
        <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Imágenes</h3>

            <div className="flex items-center justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:bg-gray-50 transition-colors cursor-pointer relative">
                <input
                    type="file"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={handleImageUpload}
                    accept="image/*"
                    disabled={loading}
                />
                <div className="space-y-1 text-center">
                    <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="flex text-sm text-gray-600">
                        <span className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                            {loading ? 'Subiendo...' : 'Sube un archivo'}
                        </span>
                        <p className="pl-1">o arrastra y suelta</p>
                    </div>
                    <p className="text-xs text-gray-500">PNG, JPG, GIF hasta 5MB</p>
                </div>
            </div>

            <div className="grid grid-cols-4 gap-4 mt-4">
                {(formData.images as any[])?.map((img, idx) => (
                    <div key={idx} className="relative group rounded-lg overflow-hidden border border-gray-200 aspect-square">
                        <img src={img.url} alt="" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <button
                                onClick={() => {
                                    const newImages = (formData.images as any[]).filter((_, i) => i !== idx);
                                    setFormData({ ...formData, images: newImages });
                                }}
                                className="text-white bg-red-600 p-1 rounded-full"
                            >
                                <X size={16} />
                            </button>
                        </div>
                        {formData.image_url === img.url && (
                            <div className="absolute top-1 left-1 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">
                                Principal
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );

    const renderStep4_Sales = () => (
        <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Precios e Inventario</h3>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Precio de Venta</label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <span className="text-gray-500 sm:text-sm">$</span>
                        </div>
                        <input
                            type="number"
                            value={formData.retail_price}
                            onChange={e => setFormData({ ...formData, retail_price: Number(e.target.value) })}
                            className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md border p-2"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Precio Mayorista (Costo)</label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <span className="text-gray-500 sm:text-sm">$</span>
                        </div>
                        <input
                            type="number"
                            value={formData.wholesale_price}
                            onChange={e => setFormData({ ...formData, wholesale_price: Number(e.target.value) })}
                            className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md border p-2"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Stock Total</label>
                    <input
                        type="number"
                        value={formData.total_stock}
                        onChange={e => setFormData({ ...formData, total_stock: Number(e.target.value) })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                    />
                </div>
            </div>

            <div className="flex items-center gap-3 py-3">
                <input
                    type="checkbox"
                    id="published"
                    checked={formData.is_published_online}
                    onChange={e => setFormData({ ...formData, is_published_online: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="published" className="text-sm font-medium text-gray-700">Publicar en tienda en línea</label>
            </div>
        </div>
    );

    return (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 flex flex-col max-w-4xl mx-auto h-[600px]">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50 rounded-t-xl">
                <h2 className="text-xl font-bold text-gray-900">
                    {initialProduct ? `Editar ${initialProduct.name}` : 'Nuevo Producto'}
                </h2>
                <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
                    <X size={24} />
                </button>
            </div>

            {/* Steps Indicator */}
            <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                    {[1, 2, 3, 4].map((s) => (
                        <div key={s} className="flex flex-col items-center">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${step === s ? 'bg-blue-600 text-white' :
                                step > s ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'
                                }`}>
                                {step > s ? <Check size={16} /> : s}
                            </div>
                            <span className="text-xs mt-1 text-gray-500">
                                {s === 1 ? 'Info' : s === 2 ? 'Categoría' : s === 3 ? 'Imágenes' : 'Precios'}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 p-8 overflow-y-auto">
                {step === 1 && renderStep1_BasicInfo()}
                {step === 2 && renderStep2_Categorization()}
                {step === 3 && renderStep3_Images()}
                {step === 4 && renderStep4_Sales()}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 flex justify-between bg-gray-50 rounded-b-xl">
                <button
                    onClick={() => step > 1 ? setStep(step - 1) : onCancel()}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-white transition-colors"
                >
                    {step > 1 ? 'Anterior' : 'Cancelar'}
                </button>

                <button
                    onClick={() => step < 4 ? setStep(step + 1) : handleSave()}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                    disabled={loading}
                >
                    {loading ? 'Guardando...' : step < 4 ? <>Siguiente <ArrowRight size={16} /></> : <>Guardar Producto <Save size={16} /></>}
                </button>
            </div>
        </div>
    );
}
