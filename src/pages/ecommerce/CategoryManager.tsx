import React, { useState, useEffect } from 'react';
import { supabase, Category } from '../../lib/supabase';
import { Folder, FolderPlus, Edit2, Trash2, ChevronRight, ChevronDown, Save, X, Plus } from 'lucide-react';

interface CategoryManagerProps {
    categories: Category[];
    onUpdate: () => void;
}

// Extended Category type to include children for the tree view
interface CategoryNode extends Category {
    children?: CategoryNode[];
    level?: number;
}

export function CategoryManager({ categories, onUpdate }: CategoryManagerProps) {
    const [nodes, setNodes] = useState<CategoryNode[]>([]);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        parent_id: '' as string | null,
        description: '',
        slug: ''
    });

    useEffect(() => {
        // Build the tree structure from flat categories
        const buildTree = (cats: Category[]) => {
            const map = new Map<string, CategoryNode>();
            const roots: CategoryNode[] = [];

            // Initialize map
            cats.forEach(c => map.set(c.id, { ...c, children: [] }));

            // Connect children to parents
            cats.forEach(c => {
                const node = map.get(c.id)!;
                if (c.parent_id && map.has(c.parent_id)) {
                    map.get(c.parent_id)!.children!.push(node);
                } else {
                    roots.push(node);
                }
            });

            return roots;
        };

        setNodes(buildTree(categories));
    }, [categories]);

    const handleSave = async () => {
        try {
            const slug = formData.slug || formData.name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');

            const payload = {
                name: formData.name,
                parent_id: formData.parent_id || null, // Convert empty string to null
                description: formData.description,
                slug
            };

            if (editingId) {
                await supabase.from('categories').update(payload).eq('id', editingId);
            } else {
                await supabase.from('categories').insert(payload);
            }

            setShowForm(false);
            setEditingId(null);
            setFormData({ name: '', parent_id: '', description: '', slug: '' });
            onUpdate(); // Refresh the list
        } catch (error) {
            console.error('Error saving category:', error);
            alert('Error al guardar la categoría');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar esta categoría?')) return;

        try {
            const { error } = await supabase.from('categories').delete().eq('id', id);
            if (error) throw error;
            onUpdate();
        } catch (error) {
            console.error('Error:', error);
            alert('Error al eliminar');
        }
    };

    const startEdit = (cat: Category) => {
        setFormData({
            name: cat.name,
            parent_id: cat.parent_id || '',
            description: cat.description || '',
            slug: cat.slug || ''
        });
        setEditingId(cat.id);
        setShowForm(true);
    };

    const CategoryItem = ({ node, level = 0 }: { node: CategoryNode, level?: number }) => {
        const [expanded, setExpanded] = useState(true);
        const hasChildren = node.children && node.children.length > 0;

        return (
            <div className="select-none">
                <div
                    className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg border border-transparent hover:border-gray-100 transition-colors"
                    style={{ marginLeft: `${level * 24}px` }}
                >
                    <button
                        onClick={() => setExpanded(!expanded)}
                        className={`p-1 rounded text-gray-400 hover:text-gray-600 ${!hasChildren && 'invisible'}`}
                    >
                        {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </button>

                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                        <Folder size={20} />
                    </div>

                    <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{node.name}</h4>
                        <p className="text-xs text-gray-500">{node.slug}</p>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => startEdit(node)}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                            <Edit2 size={16} />
                        </button>
                        <button
                            onClick={() => handleDelete(node.id)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                </div>

                {expanded && hasChildren && (
                    <div className="mt-1">
                        {node.children!.map(child => (
                            <CategoryItem key={child.id} node={child} level={level + 1} />
                        ))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-bold text-gray-900">Estructura de Categorías</h2>
                    <button
                        onClick={() => {
                            setEditingId(null);
                            setFormData({ name: '', parent_id: '', description: '', slug: '' });
                            setShowForm(true);
                        }}
                        className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-2 rounded-lg"
                    >
                        <Plus size={16} /> Nueva Categoría
                    </button>
                </div>

                <div className="space-y-1">
                    {nodes.map(node => (
                        <CategoryItem key={node.id} node={node} />
                    ))}
                    {nodes.length === 0 && (
                        <p className="text-center text-gray-500 py-8">No hay categorías registradas</p>
                    )}
                </div>
            </div>

            {/* Form Sidebar */}
            {showForm && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 h-fit sticky top-6">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-gray-900">
                            {editingId ? 'Editar Categoría' : 'Nueva Categoría'}
                        </h3>
                        <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                placeholder="Ej. Anillos"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Categoría Padre</label>
                            <select
                                value={formData.parent_id || ''}
                                onChange={e => setFormData({ ...formData, parent_id: e.target.value || null })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                            >
                                <option value="">Ninguna (Nivel Principal)</option>
                                {categories
                                    .filter(c => c.id !== editingId) // Prevent self-parenting
                                    .map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))
                                }
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Slug (URL)</label>
                            <input
                                type="text"
                                value={formData.slug}
                                onChange={e => setFormData({ ...formData, slug: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-500"
                                placeholder="Auto-generado si se deja vacío"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                            <textarea
                                rows={3}
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                            />
                        </div>

                        <div className="pt-4 flex gap-3">
                            <button
                                onClick={() => setShowForm(false)}
                                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSave}
                                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                Guardar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
