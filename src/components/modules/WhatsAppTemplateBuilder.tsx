import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { MessageSquare, Plus, RefreshCw, Send, CheckCircle, AlertCircle, Clock, X, Trash2, Filter, LinkIcon, ImageIcon } from 'lucide-react';

interface WhatsAppButton {
  type: string;
  text: string;
  url?: string;
}

interface TemplateComponent {
  type: string;
  text?: string;
  format?: string;
  example?: any;
  buttons?: WhatsAppButton[];
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
  const [syncing, setSyncing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const textAreaRef = React.useRef<HTMLTextAreaElement>(null);

  // Form states
  const [name, setName] = useState('');
  const [category, setCategory] = useState('MARKETING');
  const [language, setLanguage] = useState('es_MX');
  const [headerImageUrl, setHeaderImageUrl] = useState('');
  const [bodyText, setBodyText] = useState('Hola [Nombre], gracias por tu compra en Gallardo Joyas.');
  const [buttonsList, setButtonsList] = useState<WhatsAppButton[]>([]);

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

      const components: any[] = [];

      if (headerImageUrl.trim()) {
        components.push({
          type: 'HEADER',
          format: 'IMAGE',
          example: {
            header_url: [headerImageUrl.trim()]
          }
        });
      }

      const bodyComponent: any = { type: 'BODY', text: finalMetaText, format: bodyText };

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

        bodyComponent.example = {
          body_text: [
            uniqueVars.map(v => {
              const baseVar = v.replace(/[\[\]]/g, '');
              return dummyDataMap[baseVar] || 'Valor de prueba';
            })
          ]
        };
      }

      components.push(bodyComponent);

      if (buttonsList.length > 0) {
        components.push({
          type: 'BUTTONS',
          buttons: buttonsList.map(b => ({
            type: b.type,
            text: b.text,
            ...(b.type === 'URL' ? { url: b.url } : {})
          }))
        });
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
    setHeaderImageUrl('');
    setButtonsList([]);
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

    const headerComp = tpl.components.find(c => c.type === 'HEADER');
    if (headerComp && headerComp.example && headerComp.example.header_url) {
      setHeaderImageUrl(headerComp.example.header_url[0] || '');
    } else {
      setHeaderImageUrl('');
    }

    const buttonsComp = tpl.components.find(c => c.type === 'BUTTONS');
    if (buttonsComp && buttonsComp.buttons) {
      setButtonsList(buttonsComp.buttons);
    } else {
      setButtonsList([]);
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

  const syncStatuses = async () => {
    setSyncing(true);
    try {
      const baseUrl = window.location.origin;
      const res = await fetch(`${baseUrl}/api/meta-templates`);
      const payload = await res.json();
      
      if (!res.ok) throw new Error(payload.error || "Error al conectar con Meta");
      if (!payload.data) throw new Error("Format error: No se obtuvo la lista de datos desde Meta");

      const metaTemplates = payload.data;
      let updatedCount = 0;

      const updatePromises = templates.map(async (localTpl) => {
         const remoteTpl = metaTemplates.find((rt: any) => rt.name === localTpl.name);
         if (remoteTpl && remoteTpl.status !== localTpl.status) {
            await supabase.from('whatsapp_templates').update({
              status: remoteTpl.status,
              rejection_reason: remoteTpl.rejected_reason || null
            }).eq('id', localTpl.id);
            updatedCount++;
            return true;
         }
         return false;
      });

      await Promise.all(updatePromises);
      await loadTemplates();
      alert(`Sincronización completa con Meta. Se actualizaron ${updatedCount} plantillas.`);
    } catch (e: any) {
       console.error("Sync error:", e);
       alert("Error al sincronizar: " + e.message);
    } finally {
       setSyncing(false);
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
            <div className="flex gap-3">
              <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                <Filter className="w-4 h-4 text-slate-400 mr-2" />
                <select 
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-transparent border-none text-sm font-medium text-slate-700 focus:ring-0 cursor-pointer outline-none"
                >
                  <option value="ALL">Todos los estados</option>
                  <option value="APPROVED">Aprobadas</option>
                  <option value="IN_REVIEW">En Revisión</option>
                  <option value="DRAFT">Borradores</option>
                  <option value="REJECTED">Rechazadas</option>
                </select>
              </div>

              <button
                onClick={syncStatuses}
                disabled={syncing}
                className="flex items-center gap-2 bg-white text-slate-700 border border-slate-300 px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
                title="Sincronizar estados con Meta"
              >
                <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                Sincronizar
              </button>

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
              templates.filter(tpl => {
                if (statusFilter === 'ALL') return true;
                if (statusFilter === 'APPROVED' && tpl.status === 'APPROVED') return true;
                if (statusFilter === 'IN_REVIEW' && (tpl.status === 'PENDING' || tpl.status === 'IN_REVIEW')) return true;
                if (statusFilter === 'REJECTED' && tpl.status === 'REJECTED') return true;
                if (statusFilter === 'DRAFT' && tpl.status === 'DRAFT') return true;
                return false;
              }).map(tpl => (
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

              <div className="pt-3 border-t border-slate-100">
                <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2"><ImageIcon className="w-4 h-4"/> Imagen de Encabezado (Opcional)</label>
                <input
                  type="url"
                  value={headerImageUrl}
                  onChange={e => setHeaderImageUrl(e.target.value)}
                  placeholder="Pega la URL de una imagen JPG/PNG..."
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#25D366] outline-none"
                />
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

              <div className="pt-4 border-t border-slate-100">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-slate-700 flex items-center gap-2"><LinkIcon className="w-4 h-4"/> Botones (Máx 3)</label>
                  {buttonsList.length < 3 && (
                    <button 
                      onClick={() => setButtonsList([...buttonsList, { type: 'QUICK_REPLY', text: '' }])}
                      className="text-xs bg-[#25D366] text-white px-2 py-1 rounded hover:bg-[#1DA851] font-medium"
                    >+ Botón</button>
                  )}
                </div>
                {buttonsList.map((btn, i) => (
                  <div key={i} className="flex gap-2 items-start mb-2 bg-slate-50 p-2 rounded border border-slate-200">
                    <div className="flex-1 space-y-2">
                      <div className="flex gap-2">
                        <select 
                          value={btn.type}
                          onChange={(e) => {
                            const newBtns = [...buttonsList];
                            newBtns[i].type = e.target.value;
                            setButtonsList(newBtns);
                          }}
                          className="w-[140px] text-xs p-1.5 border rounded outline-none"
                        >
                          <option value="QUICK_REPLY">Resp. Rápida</option>
                          <option value="URL">Sitio Web</option>
                        </select>
                        <input 
                          className="flex-1 text-xs p-1.5 border rounded outline-none" 
                          placeholder="Texto ej. Comprar" 
                          value={btn.text} 
                          onChange={(e) => { const nb = [...buttonsList]; nb[i].text = e.target.value; setButtonsList(nb); }} 
                          maxLength={25}
                        />
                      </div>
                      {btn.type === 'URL' && (
                        <input 
                          className="w-full text-xs p-1.5 border rounded outline-none" 
                          placeholder="https://tulink.com..." 
                          value={btn.url || ''} 
                          onChange={(e) => { const nb = [...buttonsList]; nb[i].url = e.target.value; setButtonsList(nb); }} 
                        />
                      )}
                    </div>
                    <button onClick={() => setButtonsList(buttonsList.filter((_, idx) => idx !== i))} className="p-1 hover:bg-red-100 text-red-500 rounded mt-0.5"><X className="w-4 h-4"/></button>
                  </div>
                ))}
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
                  {headerImageUrl && (
                    <div className="mb-2 -mx-2 -mt-2">
                       <img src={headerImageUrl} alt="Header" className="w-full h-auto rounded-tl-lg rounded-tr-lg" onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/400x200?text=Error+en+URL&font=inter' }} />
                    </div>
                  )}
                  {parsePreviewBody(bodyText)}
                  <div className="text-[10px] text-slate-400 text-right mt-1.5 flex justify-end items-center gap-1">
                    12:00 PM <span className="text-[#53bdeb]">✓✓</span>
                  </div>
                </div>

                {buttonsList.length > 0 && (
                   <div className="float-right max-w-[90%] w-full clear-both flex flex-col gap-1 mt-1">
                     {buttonsList.map((b, i) => (
                        <div key={i} className="bg-white rounded-lg p-2.5 text-center text-[#00a884] text-[13px] font-medium shadow-sm flex justify-center items-center gap-2">
                           {b.type === 'URL' && <span className="opacity-70"><LinkIcon className="w-3 h-3" /></span>}
                           {b.text || 'Botón'}
                        </div>
                     ))}
                   </div>
                )}

             </div>

             {/* Phone mockup frame optional (simplified for now as just a container) */}
          </div>
        </div>
      )}
    </div>
  );
}
