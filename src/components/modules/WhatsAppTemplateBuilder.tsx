import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { MessageSquare, Plus, RefreshCw, Send, CheckCircle, AlertCircle, Clock, X, Trash2 } from 'lucide-react';

interface TemplateComponent {
  type: string;
  text?: string;
  format?: string;
}

interface WhatsAppTemplate {
  id: string;
  name: string;
  category: string;
  language: string;
  components: TemplateComponent[];
  status: string;
  rejection_reason?: string;
  created_at: string;
}

export default function WhatsAppTemplateBuilder() {
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreator, setShowCreator] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const textAreaRef = React.useRef<HTMLTextAreaElement>(null);

  // Form states
  const [name, setName] = useState('');
  const [category, setCategory] = useState('MARKETING');
  const [language, setLanguage] = useState('es_MX');
  const [bodyText, setBodyText] = useState('Hola {{1}}, gracias por tu compra en Gallardo Joyas.');

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('whatsapp_templates')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setTemplates(data);
    }
    setLoading(false);
  };

  const StatusBadge = ({ status, tpl }: { status: string, tpl?: any }) => {
    switch (status) {
      case 'APPROVED': return <span className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium"><CheckCircle className="w-3 h-3"/> Aprobada</span>;
      case 'PENDING':
      case 'IN_REVIEW': return <span className="flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium"><Clock className="w-3 h-3"/> En Revisión</span>;
      case 'REJECTED': return <span className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium" title={tpl?.rejection_reason}><AlertCircle className="w-3 h-3"/> Rechazada</span>;
      default: return <span className="flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-medium">Borrador</span>;
    }
  };

  const SYSTEM_VARIABLES = ['Nombre', 'Apellidos', 'Joya', 'Material', 'Monto', 'Fecha', 'Vendedor'];

  const insertVariable = (variable: string) => {
    const varText = `[${variable}]`;
    const elem = textAreaRef.current;
    
    if (elem) {
      const start = elem.selectionStart;
      const end = elem.selectionEnd;
      const newText = bodyText.substring(0, start) + varText + bodyText.substring(end);
      setBodyText(newText);
      
      // Retain focus and move cursor after the inserted variable
      setTimeout(() => {
        elem.focus();
        elem.setSelectionRange(start + varText.length, start + varText.length);
      }, 0);
    } else {
      setBodyText(prev => prev + ` ${varText}`);
    }
  };

  const handleDragStart = (e: React.DragEvent, variable: string) => {
    e.dataTransfer.setData('text/plain', `[${variable}]`);
  };

  const parsePreviewBody = (text: string) => {
    // Reemplaza [Variable] por variables resaltadas visualmente
    const parts = text.split(/(\[[^\]]+\])/g);
    return parts.map((part, i) => {
      if (part.match(/(\[[^\]]+\])/)) {
        return <span key={i} className="bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded-md text-xs font-semibold shadow-sm inline-block mx-0.5">{part.replace(/[\[\]]/g, '')}</span>;
      }
      return <span key={i} className="whitespace-pre-wrap">{part}</span>;
    });
  };

  const convertToMetaFormat = (text: string) => {
    // Reemplaza todos los [Variable1], [Variable2] por {{1}}, {{2}} y devuelve el texto procesado
    // Necesitamos que variables repetidas tengan el mismo ID, o distinto? Meta requiere incrementales.
    // Ejemplo: Hola [Nombre], tu [Joya] cuesta [Monto]. -> Hola {{1}}, tu {{2}} cuesta {{3}}.
    let metaText = text;
    let counter = 1;
    // Extraemos únicos
    const matches = text.match(/\[[^\]]+\]/g) || [];
    const uniqueVars = Array.from(new Set(matches));
    
    uniqueVars.forEach(v => {
      metaText = metaText.split(v).join(`{{${counter}}}`);
      counter++;
    });
    
    return metaText;
  };

  const handleSendToReview = async () => {
    if (!name || !bodyText) {
      alert("El nombre y el mensaje son obligatorios");
      return;
    }

    setSubmitting(true);
    try {
      const finalMetaText = convertToMetaFormat(bodyText);

      const matches = bodyText.match(/\[[^\]]+\]/g) || [];
      const uniqueVars = Array.from(new Set(matches));

      const components: any[] = [
        { type: 'BODY', text: finalMetaText, format: bodyText }
      ];

      if (uniqueVars.length > 0) {
        const dummyDataMap: Record<string, string> = {
          'Nombre': 'Juan',
          'Apellidos': 'Pérez',
          'Joya': 'Anillo de compromiso',
          'Material': 'Oro de 14k',
          'Monto': '$1,500.00',
          'Fecha': '14 de Febrero',
          'Vendedor': 'María'
        };

        components[0].example = {
          body_text: [
            uniqueVars.map(v => {
              const baseVar = v.replace(/[\[\]]/g, '');
              return dummyDataMap[baseVar] || 'Valor de prueba';
            })
          ]
        };
      }

      let savedTemplateId = editingId;

      if (editingId) {
        // Actualizar existente
        const { error: dbError } = await supabase
          .from('whatsapp_templates')
          .update({
            name: name.toLowerCase().replace(/\s+/g, '_'),
            category,
            language,
            components,
            status: 'IN_REVIEW',
            rejection_reason: null
          })
          .eq('id', editingId);
        if (dbError) throw dbError;
      } else {
        // Insertar nuevo
        const { data: insertedData, error: dbError } = await supabase
          .from('whatsapp_templates')
          .insert([{
            name: name.toLowerCase().replace(/\s+/g, '_'),
            category,
            language,
            components,
            status: 'IN_REVIEW' // Optimistic
          }])
          .select()
          .single();
        if (dbError) throw dbError;
        savedTemplateId = insertedData.id;
      }

      // 2. Llamada a Vercel Serverless Function (Meta API)
      const baseUrl = window.location.origin;
      
      // Remover "format" porque Meta API lo rechaza en BODY components
      const metaComponents = components.map(c => {
        const { format, ...rest } = c;
        return rest;
      });

      const res = await fetch(`${baseUrl}/api/meta-templates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.toLowerCase().replace(/\s+/g, '_'),
          category,
          language,
          components: metaComponents
        })
      });

      const metaRes = await res.json();

      if (!res.ok) {
        // Falló en Meta, revertir a DRAFT
        await supabase.from('whatsapp_templates').update({ status: 'DRAFT', rejection_reason: JSON.stringify(metaRes) }).eq('id', savedTemplateId);
        let errorMsg = "La plantilla se guardó localmente pero en Meta falló (Status 4xx).";
        if (metaRes.details && metaRes.details.error) {
           errorMsg += "\n\nRazón de Meta: " + metaRes.details.error.message;
        } else if (metaRes.error) {
           errorMsg += "\n\nError: " + metaRes.error;
        }
        alert(errorMsg);
      } else {
        // Actualizar ID de meta
        await supabase.from('whatsapp_templates').update({ meta_template_id: metaRes.meta_template_id }).eq('id', savedTemplateId);
        alert("¡Plantilla enviada a revisión con éxito!");
      }

      closeCreator();
      loadTemplates();
      
    } catch (e: any) {
      console.error(e);
      alert("Error al guardar la plantilla: " + e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const closeCreator = () => {
    setShowCreator(false);
    setEditingId(null);
    setName('');
    setBodyText('Hola [Nombre], ');
  };

  const handleEdit = (tpl: WhatsAppTemplate) => {
    setEditingId(tpl.id);
    setName(tpl.name);
    setCategory(tpl.category);
    setLanguage(tpl.language);
    
    const bodyComp = tpl.components.find(c => c.type === 'BODY');
    if (bodyComp) {
      setBodyText(bodyComp.format || bodyComp.text || '');
    }
    
    setShowCreator(true);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm('¿Estás seguro de que deseas eliminar esta plantilla del sistema? (Si fue enviada a Meta, seguirá existiendo allá pero se ocultará de tu vista aquí)')) return;

    try {
      const { error } = await supabase.from('whatsapp_templates').delete().eq('id', id);
      if (error) throw error;
      setTemplates(templates.filter(t => t.id !== id));
    } catch (error: any) {
      console.error(error);
      alert('Error al eliminar la plantilla: ' + error.message);
    }
  };

  return (
    <div className="space-y-6">

      {!showCreator ? (
        <>
          <div className="flex justify-between items-center bg-white p-6 rounded-xl border border-slate-200">
            <div>
              <h2 className="text-xl font-bold text-slate-800">Plantillas de WhatsApp</h2>
              <p className="text-sm text-slate-500">Diseña y solicita aprobación a Meta para tus mensajes automáticos.</p>
            </div>
            <button
              onClick={() => {
                setEditingId(null);
                setName('');
                setBodyText('Hola [Nombre], ');
                setShowCreator(true);
              }}
              className="flex items-center gap-2 bg-[#25D366] text-white px-4 py-2 rounded-lg hover:bg-[#1DA851] transition-colors"
            >
              <Plus className="w-5 h-5" />
              Nueva Plantilla
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading ? (
              <p className="text-slate-500 col-span-full">Cargando plantillas...</p>
            ) : templates.length === 0 ? (
              <div className="col-span-full text-center py-12 bg-white rounded-xl border border-slate-200 border-dashed">
                <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-slate-700">Sin plantillas</h3>
                <p className="text-slate-500 mb-4">Aún no has creado plantillas de WhatsApp.</p>
                <button onClick={() => setShowCreator(true)} className="text-blue-600 font-medium hover:underline">Crear mi primera plantilla</button>
              </div>
            ) : (
              templates.map(tpl => (
                <div key={tpl.id} className="bg-white rounded-xl p-5 border border-slate-200 hover:shadow-md transition-all flex flex-col">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="font-semibold text-slate-800 break-all">{tpl.name}</h4>
                      <div className="text-xs text-slate-500 mt-1 flex gap-2 items-center">
                        <span className="uppercase">{tpl.category}</span>
                        <span>•</span>
                        <span className="uppercase">{tpl.language}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                       <StatusBadge status={tpl.status} tpl={tpl} />
                       <div className="flex gap-2 items-center">
                         {(tpl.status === 'DRAFT' || tpl.status === 'REJECTED') && (
                           <button 
                             onClick={() => handleEdit(tpl)}
                             className="text-xs text-blue-600 hover:text-blue-800 font-medium bg-blue-50 px-2 py-1 rounded"
                           >
                             Editar y Reintentar
                           </button>
                         )}
                         <button 
                           onClick={(e) => handleDelete(e, tpl.id)}
                           className="text-xs text-red-500 hover:text-red-700 bg-red-50 p-1.5 rounded"
                           title="Eliminar plantilla del sistema"
                         >
                           <Trash2 className="w-3.5 h-3.5" />
                         </button>
                       </div>
                    </div>
                  </div>
                  
                  <div className="bg-[#E5DDD5] p-3 rounded-lg flex-1 overflow-hidden relative">
                    <div className="bg-[#DCF8C6] p-3 rounded-tr-lg rounded-tl-lg rounded-bl-lg shadow-sm text-sm text-[#303030] whitespace-pre-wrap relative z-10 w-full max-w-[90%] float-right">
                       {tpl.components?.find(c => c.type === 'BODY')?.text || 'Sin contenido'}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col md:flex-row h-[700px]">
          {/* Creador Columna Izquierda */}
          <div className="flex-1 p-6 border-r border-slate-200 flex flex-col h-full overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-slate-800">{editingId ? 'Editar Plantilla' : 'Crear Plantilla'}</h2>
              <button onClick={closeCreator} className="p-2 hover:bg-slate-100 rounded-full"><X className="w-5 h-5 text-slate-500"/></button>
            </div>

            <div className="space-y-5 flex-1">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre Interno (sin espacios, minúsculas)</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  placeholder="ej: promo_navidad_2026"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#25D366] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Categoría</label>
                  <select value={category} onChange={e => setCategory(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#25D366]">
                    <option value="MARKETING">Marketing (Promociones)</option>
                    <option value="UTILITY">Utilidad (Actualizaciones)</option>
                    <option value="AUTHENTICATION">Autenticación (OTP)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Idioma</label>
                  <select value={language} onChange={e => setLanguage(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#25D366]">
                    <option value="es_MX">Español (México)</option>
                    <option value="es">Español (General)</option>
                    <option value="en">Inglés</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-end mb-2">
                  <label className="block text-sm font-medium text-slate-700">Mensaje (Body)</label>
                  <span className="text-xs text-slate-500">Arrastra las variables al texto o hazles clic</span>
                </div>

                <div className="flex flex-wrap gap-2 mb-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                  {SYSTEM_VARIABLES.map(v => (
                    <div 
                      key={v}
                      draggable
                      onDragStart={(e) => handleDragStart(e, v)}
                      onClick={() => insertVariable(v)}
                      className="cursor-move text-xs bg-blue-100 text-blue-700 hover:bg-blue-200 px-2.5 py-1.5 rounded-md font-medium border border-blue-200 transition-colors flex items-center gap-1 shadow-sm"
                      title="Arrastra o presiona para insertar"
                    >
                      <Plus className="w-3 h-3 opacity-50"/> {v}
                    </div>
                  ))}
                </div>

                <textarea
                  ref={textAreaRef}
                  value={bodyText}
                  onChange={e => setBodyText(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#25D366] outline-none min-h-[200px] resize-none whitespace-pre-wrap text-slate-700 text-[15px] leading-relaxed"
                  placeholder="Escribe tu mensaje aquí..."
                />
                <p className="text-xs text-slate-500 mt-2">
                  Las variables <code className="bg-slate-100 px-1 rounded">[Nombre]</code> se convertirán internamente al formato <code className="bg-slate-100 px-1 rounded">{"{{1}}"}</code> requerido por Meta antes de enviarse a revisión.
                </p>
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-slate-200 flex gap-3">
              <button 
                onClick={closeCreator}
                className="flex-1 px-4 py-3 rounded-lg border border-slate-300 font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSendToReview}
                disabled={submitting || !name || !bodyText}
                className="flex-1 px-4 py-3 rounded-lg bg-[#25D366] text-white font-medium hover:bg-[#1DA851] disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
              >
                {submitting ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                Enviar a Revisión de Meta
              </button>
            </div>
          </div>

          {/* Previsualización Columna Derecha */}
          <div className="w-[400px] bg-slate-50 relative flex flex-col justify-center items-center border-l border-slate-200 hidden md:flex">
             <div className="absolute top-0 left-0 right-0 bg-[#075E54] text-white p-4 font-medium flex items-center gap-3 shadow z-10">
               <div className="w-8 h-8 bg-slate-300 rounded-full overflow-hidden flex justify-center items-center">
                 <img src="https://ui-avatars.com/api/?name=Gallardo+Joyas&background=E5DDD5&color=075E54" alt="GJ" />
               </div>
               <div>Gallardo Joyas</div>
             </div>

             <div className="w-full h-full bg-[#E5DDD5] bg-opacity-70 p-6 pt-20 overflow-y-auto" style={{ backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")', backgroundRepeat: 'repeat', backgroundSize: '70% auto', backgroundBlendMode: 'overlay'}}>
                
                <div className="bg-[#DCF8C6] p-3 rounded-tr-lg rounded-tl-lg rounded-bl-lg shadow text-[15px] text-[#303030] max-w-[90%] float-right relative break-words">
                  {parsePreviewBody(bodyText)}
                  <div className="text-[10px] text-slate-400 text-right mt-1.5 flex justify-end items-center gap-1">
                    12:00 PM <span className="text-[#53bdeb]">✓✓</span>
                  </div>
                </div>

             </div>

             {/* Phone mockup frame optional (simplified for now as just a container) */}
          </div>
        </div>
      )}
    </div>
  );
}
