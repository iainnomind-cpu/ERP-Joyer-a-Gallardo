import React, { useState, useEffect } from 'react';
import { supabase, BusinessRule } from '../../lib/supabase';
import { Building2, Save, AlertCircle, CreditCard } from 'lucide-react';

export function BankDetailsSettings() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [ruleId, setRuleId] = useState<string | null>(null);

    const [bankDetails, setBankDetails] = useState({
        bank: '',
        accountHolder: '',
        clabe: '',
        cardNumber: '',
        instructions: 'Por favor, usa el número de tu pedido como concepto de pago.'
    });

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('business_rules')
            .select('*')
            .eq('rule_key', 'bank_transfer_details')
            .single();

        if (data) {
            setRuleId(data.id);
            if (data.rule_value) {
                setBankDetails({
                    ...bankDetails,
                    ...data.rule_value
                });
            }
        }
        setLoading(false);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setSuccessMessage('');

        const ruleData = {
            rule_key: 'bank_transfer_details',
            rule_name: 'Datos Bancarios para Transferencias',
            rule_value: bankDetails,
            description: 'Se muestran en la tienda web al elegir Envío a Domicilio',
            is_active: true
        };

        let result;
        if (ruleId) {
            result = await supabase
                .from('business_rules')
                .update(ruleData)
                .eq('id', ruleId)
                .select()
                .single();
        } else {
            result = await supabase
                .from('business_rules')
                .insert([ruleData])
                .select()
                .single();
        }

        if (result.error) {
            console.error('Error saving bank details:', result.error);
            alert('Error al guardar la configuración');
        } else {
            setRuleId(result.data.id);
            setSuccessMessage('Configuración guardada exitosamente');
            setTimeout(() => setSuccessMessage(''), 3000);
        }

        setSaving(false);
    };

    if (loading) {
        return <div className="p-8 text-center text-gray-500">Cargando configuración...</div>;
    }

    return (
        <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-6 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                            <Building2 className="text-blue-600" />
                            Cuentas Bancarias
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">
                            Configura los datos donde los clientes realizarán las transferencias para pedidos en línea.
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSave} className="p-6 space-y-6">
                    <div className="bg-blue-50 text-blue-800 p-4 rounded-lg flex items-start gap-3 border border-blue-100">
                        <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                        <div className="text-sm">
                            <p className="font-semibold mb-1">Importante</p>
                            <p>Esta información aparecerá en la página web automáticamente en la Ficha de Pago al confirmar un pedido con envío a domicilio.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Banco</label>
                            <input
                                type="text"
                                required
                                value={bankDetails.bank}
                                onChange={e => setBankDetails({ ...bankDetails, bank: e.target.value })}
                                className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                placeholder="Ej. BBVA, Banorte, Santander"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Titular de la cuenta</label>
                            <input
                                type="text"
                                required
                                value={bankDetails.accountHolder}
                                onChange={e => setBankDetails({ ...bankDetails, accountHolder: e.target.value })}
                                className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                placeholder="Nombre comercial o persona física"
                            />
                        </div>

                        <div className="space-y-2 md:col-span-2">
                            <label className="text-sm font-medium text-gray-700">CLABE Interbancaria (18 dígitos)</label>
                            <input
                                type="text"
                                required
                                pattern="[0-9]{18}"
                                maxLength={18}
                                value={bankDetails.clabe}
                                onChange={e => setBankDetails({ ...bankDetails, clabe: e.target.value.replace(/[^0-9]/g, '') })}
                                className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-mono tracking-wider"
                                placeholder="000000000000000000"
                            />
                        </div>

                        <div className="space-y-2 md:col-span-2">
                            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                <CreditCard size={16} /> Número de Tarjeta (Opcional)
                            </label>
                            <input
                                type="text"
                                maxLength={16}
                                value={bankDetails.cardNumber}
                                onChange={e => setBankDetails({ ...bankDetails, cardNumber: e.target.value.replace(/[^0-9]/g, '') })}
                                className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-mono tracking-wider"
                                placeholder="0000000000000000"
                            />
                            <p className="text-xs text-gray-500">Si los clientes pueden transferir o depositar a los 16 dígitos de tu tarjeta.</p>
                        </div>

                        <div className="space-y-2 md:col-span-2">
                            <label className="text-sm font-medium text-gray-700">Instrucciones extra (Opcional)</label>
                            <textarea
                                value={bankDetails.instructions}
                                onChange={e => setBankDetails({ ...bankDetails, instructions: e.target.value })}
                                className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                rows={2}
                                placeholder="Ej. El pago debe reflejarse en máximo 24 hrs."
                            />
                        </div>
                    </div>

                    <div className="pt-4 flex items-center justify-between border-t border-gray-100">
                        {successMessage ? (
                            <span className="text-green-600 text-sm font-medium animate-pulse">{successMessage}</span>
                        ) : <span></span>}

                        <button
                            type="submit"
                            disabled={saving}
                            className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                        >
                            <Save size={18} />
                            {saving ? 'Guardando...' : 'Guardar Configuración'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
