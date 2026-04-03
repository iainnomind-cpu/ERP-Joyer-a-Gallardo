import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
  Send,
  Users,
  Calendar,
  TrendingUp,
  MessageSquare,
  Filter,
  Plus,
  Play,
  Pause,
  BarChart3,
  Target,
  Mail,
  Phone,
  Bell,
  Trash2,
  Edit
} from 'lucide-react';
import WhatsAppTemplateBuilder from './WhatsAppTemplateBuilder';

interface Campaign {
  id: string;
  name: string;
  description: string;
  type: string;
  status: string;
  channel: string;
  message_template: string;
  scheduled_date: string | null;
  target_segment: any;
  stats: {
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    failed: number;
  };
  created_at: string;
}

interface Segment {
  id: string;
  name: string;
  description: string;
  filters: any;
  customer_count: number;
  created_at: string;
}

interface Automation {
  id: string;
  name: string;
  trigger_type: string;
  trigger_config: any;
  message_template: string;
  channel: string;
  is_active: boolean;
  last_run: string | null;
  created_at: string;
}

export default function MarketingModule() {
  const [activeTab, setActiveTab] = useState<'campaigns' | 'segments' | 'templates' | 'analytics'>('campaigns');
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [whatsappTemplates, setWhatsappTemplates] = useState<any[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [showSegmentModal, setShowSegmentModal] = useState(false);
  const [editingCampaignId, setEditingCampaignId] = useState<string | null>(null);
  const [editingSegmentId, setEditingSegmentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [newCampaign, setNewCampaign] = useState({
    name: '',
    description: '',
    type: 'promotional',
    channel: 'whatsapp',
    template_id: '',
    segment_id: '',
    scheduled_date: '',
  });

  const [newSegment, setNewSegment] = useState({
    name: '',
    description: '',
    filters: {
      customerType: 'all',
      activity: 'all',
      material: 'all',
      category: 'all'
    } as Record<string, string>
  });

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      const cats = await supabase.from('categories').select('id, name').order('name');
      setCategories(cats.data || []);

      if (activeTab === 'campaigns') {
        const [campaignsRes, templatesRes] = await Promise.all([
          supabase.from('marketing_campaigns').select('*').order('created_at', { ascending: false }),
          supabase.from('whatsapp_templates').select('*').eq('status', 'APPROVED')
        ]);
        const segs = await supabase.from('marketing_segments').select('*');
        setCampaigns(campaignsRes.data || []);
        setWhatsappTemplates(templatesRes.data || []);
        setSegments(segs.data || []);
      } else if (activeTab === 'segments') {
        const { data } = await supabase
          .from('marketing_segments')
          .select('*')
          .order('created_at', { ascending: false });
        setSegments(data || []);
      }
// removed automations check
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const createCampaign = async () => {
    try {
      const selectedTpl = whatsappTemplates.find(t => t.id === newCampaign.template_id);
      const selectedSeg = segments.find(s => s.id === newCampaign.segment_id);

      const payload = {
        name: newCampaign.name,
        description: newCampaign.description,
        type: newCampaign.type,
        channel: newCampaign.channel,
        message_template: selectedTpl ? selectedTpl.name : newCampaign.template_id,
        target_segment: selectedSeg ? { id: selectedSeg.id, name: selectedSeg.name } : {},
        scheduled_date: newCampaign.scheduled_date || null
      };

      if (editingCampaignId) {
        const { error } = await supabase.from('marketing_campaigns').update(payload).eq('id', editingCampaignId);
        if (!error) {
          setShowCampaignModal(false);
          setEditingCampaignId(null);
          resetCampaignForm();
          loadData();
        }
      } else {
        const { error } = await supabase.from('marketing_campaigns').insert([payload]);
        if (!error) {
          setShowCampaignModal(false);
          resetCampaignForm();
          loadData();
        }
      }
    } catch (error) {
      console.error('Error creating campaign:', error);
    }
  };

  const resetCampaignForm = () => {
    setNewCampaign({
      name: '',
      description: '',
      type: 'promotional',
      channel: 'whatsapp',
      template_id: '',
      segment_id: '',
      scheduled_date: '',
    });
  };

  const handleEditCampaign = (campaign: Campaign) => {
    setEditingCampaignId(campaign.id);
    setNewCampaign({
      name: campaign.name,
      description: campaign.description || '',
      type: campaign.type,
      channel: campaign.channel,
      template_id: whatsappTemplates.find(t => t.name === campaign.message_template)?.id || campaign.message_template,
      segment_id: (campaign.target_segment as any)?.id || '',
      scheduled_date: campaign.scheduled_date ? new Date(campaign.scheduled_date).toISOString().slice(0,16) : '',
    });
    setShowCampaignModal(true);
  };

  const handleDeleteCampaign = async (id: string) => {
    if (!window.confirm('¿Eliminar campaña definitivamente?')) return;
    await supabase.from('marketing_campaigns').delete().eq('id', id);
    loadData();
  };

  const createSegment = async () => {
    try {
      const cleanFilters = Object.fromEntries(
        Object.entries(newSegment.filters).filter(([_, v]) => v !== '' && v !== 'all')
      );

      // Calculate the customer_count dynamically based on current rules
      let q = supabase.from('customers').select('id', { count: 'exact', head: true });

      if (cleanFilters.customerType === 'new') q = q.lte('total_purchases', 1);
      if (cleanFilters.customerType === 'frequent') q = q.gte('total_purchases', 2).lte('total_purchases', 5);
      if (cleanFilters.customerType === 'vip') q = q.gt('total_purchases', 5);

      if (cleanFilters.activity === 'recent') {
        const thirty = new Date(); thirty.setDate(thirty.getDate() - 30);
        q = q.gte('last_purchase_date', thirty.toISOString());
      }
      if (cleanFilters.activity === 'inactive') {
        const ninety = new Date(); ninety.setDate(ninety.getDate() - 90);
        // also consider those with no purchase date yet inactive? 
        q = q.lte('last_purchase_date', ninety.toISOString());
      }

      if (cleanFilters.material === 'oro') q = q.ilike('material_preference', '%Oro%');
      if (cleanFilters.material === 'plata') q = q.ilike('material_preference', '%Plata%');
      
      if (cleanFilters.category) {
         q = q.eq('preferred_category', cleanFilters.category);
      }

      const { count } = await q;

      const payload = {
        name: newSegment.name,
        description: newSegment.description,
        filters: cleanFilters,
        customer_count: count || 0
      };

      if (editingSegmentId) {
        const { error } = await supabase.from('marketing_segments').update(payload).eq('id', editingSegmentId);
        if (!error) {
          setShowSegmentModal(false);
          setEditingSegmentId(null);
          resetSegmentForm();
          loadData();
        }
      } else {
        const { error } = await supabase.from('marketing_segments').insert([payload]);
        if (!error) {
          setShowSegmentModal(false);
          resetSegmentForm();
          loadData();
        }
      }
    } catch (error) {
      console.error('Error creating segment:', error);
    }
  };

  const resetSegmentForm = () => {
    setNewSegment({
      name: '',
      description: '',
      filters: { customerType: 'all', activity: 'all', material: 'all', category: 'all' }
    });
  };

  const handleEditSegment = (segment: Segment) => {
    setEditingSegmentId(segment.id);
    setNewSegment({
      name: segment.name,
      description: segment.description || '',
      filters: (segment.filters as any) || { customerType: 'all', activity: 'all', material: 'all', category: 'all' }
    });
    setShowSegmentModal(true);
  };

  const handleDeleteSegment = async (id: string) => {
    if (!window.confirm('¿Eliminar segmento definitivamente?')) return;
    await supabase.from('marketing_segments').delete().eq('id', id);
    loadData();
  };

  const toggleCampaignStatus = async (campaignId: string, currentStatus: string) => {
    if (currentStatus === 'active') {
      await supabase.from('marketing_campaigns').update({ status: 'paused' }).eq('id', campaignId);
      loadData();
      return;
    }

    if (currentStatus === 'completed') {
      window.alert('Esta campaña ya ha finalizado. Duplíquela o cree otra para volver a enviar.');
      return;
    }

    if (!window.confirm('Se procederá a contactar masivamente a los clientes de este segmento vía WhatsApp. Esta acción consumirá tu cuota de WABA. ¿Iniciar envío?')) {
      return;
    }

    // Update to active visually
    await supabase.from('marketing_campaigns').update({ status: 'active' }).eq('id', campaignId);
    loadData();

    try {
      const res = await fetch('/api/send-campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId })
      });
      const data = await res.json();

      if (!res.ok) {
        window.alert('Falló el motor de envío: ' + (data.error || 'Error interno'));
        await supabase.from('marketing_campaigns').update({ status: 'paused' }).eq('id', campaignId);
      } else {
        if (data.stats?.failed > 0) {
           window.alert(`Envío finalizado con algunos fallos.\nÉxitos: ${data.stats?.sent}\nFallos: ${data.stats?.failed}\nMotivo principal de rechazo dado por WhatsApp: ${data.lastError}`);
        } else {
           window.alert(`¡Envío ejecutado exitosamente!\nImpactos exitosos: ${data.stats?.sent || 0}\nFallos: ${data.stats?.failed || 0}`);
        }
      }
    } catch (err: any) {
      window.alert('Error de conexión con el motor de envíos.');
      await supabase.from('marketing_campaigns').update({ status: 'paused' }).eq('id', campaignId);
    }
    
    loadData();
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'whatsapp': return <MessageSquare className="w-4 h-4" />;
      case 'sms': return <Phone className="w-4 h-4" />;
      case 'email': return <Mail className="w-4 h-4" />;
      case 'push': return <Bell className="w-4 h-4" />;
      default: return <Send className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      case 'scheduled': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Marketing Automation</h1>
              <p className="text-slate-600 mt-1">Gestiona campañas, segmentos y mensajes automatizados</p>
            </div>
            <div className="flex gap-3">
              {activeTab === 'campaigns' && (
                <button
                  onClick={() => { setEditingCampaignId(null); resetCampaignForm(); setShowCampaignModal(true); }}
                  className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Nueva Campaña
                </button>
              )}
              {activeTab === 'segments' && (
                <button
                  onClick={() => { setEditingSegmentId(null); resetSegmentForm(); setShowSegmentModal(true); }}
                  className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Nuevo Segmento
                </button>
              )}
              {activeTab === 'templates' && (
                <div className="text-sm font-medium text-slate-500 flex items-center">
                  Gestionadas a través de Meta
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 mb-6">
          <div className="flex border-b border-slate-200">
            <button
              onClick={() => setActiveTab('campaigns')}
              className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors ${
                activeTab === 'campaigns'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Send className="w-4 h-4" />
              Campañas
            </button>
            <button
              onClick={() => setActiveTab('segments')}
              className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors ${
                activeTab === 'segments'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-4 h-4" />
              Segmentos
            </button>
            <button
              onClick={() => setActiveTab('templates')}
              className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors ${
                activeTab === 'templates'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              Plantillas (WhatsApp)
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors ${
                activeTab === 'analytics'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              Análisis
            </button>
          </div>
        </div>

        {activeTab === 'campaigns' && (
          <div className="grid gap-4">
            {loading ? (
              <div className="text-center py-12 text-slate-600">Cargando campañas...</div>
            ) : campaigns.length === 0 ? (
              <div className="bg-white rounded-xl p-12 text-center border border-slate-200">
                <Send className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">No hay campañas todavía</h3>
                <p className="text-slate-600 mb-4">Crea tu primera campaña de marketing</p>
                <button
                  onClick={() => setShowCampaignModal(true)}
                  className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Nueva Campaña
                </button>
              </div>
            ) : (
              campaigns.map((campaign) => (
                <div key={campaign.id} className="bg-white rounded-xl p-6 border border-slate-200 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-slate-900">{campaign.name}</h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(campaign.status)}`}>
                          {campaign.status}
                        </span>
                        <span className="flex items-center gap-1 px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs">
                          {getChannelIcon(campaign.channel)}
                          {campaign.channel}
                        </span>
                      </div>
                      <p className="text-slate-600 mb-4">{campaign.description}</p>
                      <div className="flex items-center gap-6 text-sm">
                        <div className="flex items-center gap-2">
                          <Target className="w-4 h-4 text-slate-400" />
                          <span className="text-slate-600">Tipo: {campaign.type}</span>
                        </div>
                        {campaign.scheduled_date && (
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-slate-400" />
                            <span className="text-slate-600">
                              {new Date(campaign.scheduled_date).toLocaleDateString('es-MX')}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="mt-4 grid grid-cols-5 gap-4">
                        <div className="bg-slate-50 rounded-lg p-3">
                          <div className="text-2xl font-bold text-slate-900">{campaign.stats.sent}</div>
                          <div className="text-xs text-slate-600">Enviados</div>
                        </div>
                        <div className="bg-green-50 rounded-lg p-3">
                          <div className="text-2xl font-bold text-green-700">{campaign.stats.delivered}</div>
                          <div className="text-xs text-green-700">Entregados</div>
                        </div>
                        <div className="bg-blue-50 rounded-lg p-3">
                          <div className="text-2xl font-bold text-blue-700">{campaign.stats.opened}</div>
                          <div className="text-xs text-blue-700">Abiertos</div>
                        </div>
                        <div className="bg-purple-50 rounded-lg p-3">
                          <div className="text-2xl font-bold text-purple-700">{campaign.stats.clicked}</div>
                          <div className="text-xs text-purple-700">Clicks</div>
                        </div>
                        <div className="bg-red-50 rounded-lg p-3">
                          <div className="text-2xl font-bold text-red-700">{campaign.stats.failed}</div>
                          <div className="text-xs text-red-700">Fallidos</div>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditCampaign(campaign)}
                        className="p-2 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
                        title="Editar Campaña"
                      >
                        <Edit className="w-5 h-5 text-slate-600" />
                      </button>
                      <button
                        onClick={() => handleDeleteCampaign(campaign.id)}
                        className="p-2 bg-red-50 hover:bg-red-100 rounded-lg transition-colors border border-red-200"
                        title="Eliminar Campaña"
                      >
                        <Trash2 className="w-5 h-5 text-red-500" />
                      </button>
                      <button
                        onClick={() => toggleCampaignStatus(campaign.id, campaign.status)}
                        className="p-2 ml-2 hover:bg-slate-100 rounded-lg transition-colors border border-transparent hover:border-slate-200"
                        title={campaign.status === 'active' ? 'Pausar envío' : 'Reanudar envío'}
                      >
                        {campaign.status === 'active' ? (
                          <Pause className="w-5 h-5 text-slate-600" />
                        ) : (
                          <Play className="w-5 h-5 text-slate-600" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'segments' && (
          <div className="grid gap-4">
            {loading ? (
              <div className="text-center py-12 text-slate-600">Cargando segmentos...</div>
            ) : segments.length === 0 ? (
              <div className="bg-white rounded-xl p-12 text-center border border-slate-200">
                <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">No hay segmentos todavía</h3>
                <p className="text-slate-600 mb-4">Crea segmentos de audiencia para campañas dirigidas</p>
                <button
                  onClick={() => setShowSegmentModal(true)}
                  className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Nuevo Segmento
                </button>
              </div>
            ) : (
              segments.map((segment) => (
                <div key={segment.id} className="bg-white rounded-xl p-6 border border-slate-200 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-slate-900 mb-2">{segment.name}</h3>
                      <p className="text-slate-600 mb-4">{segment.description}</p>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-lg">
                          <Users className="w-4 h-4" />
                          <span className="font-semibold">{segment.customer_count}</span>
                          <span className="text-sm">clientes</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-600 text-sm">
                          <Filter className="w-4 h-4" />
                          {Object.keys(segment.filters).length} filtros aplicados
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                       <button
                         onClick={() => handleEditSegment(segment)}
                         className="p-2 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
                         title="Editar Segmento"
                       >
                         <Edit className="w-4 h-4 text-slate-600" />
                       </button>
                       <button
                         onClick={() => handleDeleteSegment(segment.id)}
                         className="p-2 bg-red-50 hover:bg-red-100 rounded-lg transition-colors border border-red-200"
                         title="Eliminar Segmento"
                       >
                         <Trash2 className="w-4 h-4 text-red-500" />
                       </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'templates' && (
          <WhatsAppTemplateBuilder />
        )}

        {activeTab === 'analytics' && (
          <div className="bg-white rounded-xl p-12 text-center border border-slate-200">
            <BarChart3 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Análisis de Marketing</h3>
            <p className="text-slate-600">Panel de análisis disponible próximamente</p>
          </div>
        )}

        {showCampaignModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold text-slate-900 mb-6">Nueva Campaña</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Nombre de la Campaña</label>
                  <input
                    type="text"
                    value={newCampaign.name}
                    onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ej: Promoción Día de las Madres"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Descripción</label>
                  <textarea
                    value={newCampaign.description}
                    onChange={(e) => setNewCampaign({ ...newCampaign, description: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                    placeholder="Describe el objetivo de esta campaña"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Tipo</label>
                    <select
                      value={newCampaign.type}
                      onChange={(e) => setNewCampaign({ ...newCampaign, type: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="promotional">Promocional</option>
                      <option value="reminder">Recordatorio</option>
                      <option value="recommendation">Recomendación</option>
                      <option value="birthday">Cumpleaños</option>
                      <option value="follow_up">Seguimiento</option>
                      <option value="custom">Personalizado</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Canal</label>
                    <select
                      value={newCampaign.channel}
                      onChange={(e) => setNewCampaign({ ...newCampaign, channel: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="whatsapp">WhatsApp</option>
                      <option value="sms">SMS</option>
                      <option value="email">Email</option>
                      <option value="push">Push Notification</option>
                      <option value="multi">Multi-canal</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Segmento de Destino</label>
                  <select
                    value={newCampaign.segment_id}
                    onChange={(e) => setNewCampaign({ ...newCampaign, segment_id: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
                  >
                    <option value="" disabled>Seleccione un segmento de audiencia...</option>
                    {segments.map(seg => (
                      <option key={seg.id} value={seg.id}>{seg.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Plantilla Meta Empleada (Aprobadas)</label>
                  <select
                    value={newCampaign.template_id}
                    onChange={(e) => setNewCampaign({ ...newCampaign, template_id: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#25D366] focus:border-transparent outline-none cursor-pointer text-slate-700"
                  >
                    <option value="" disabled>Selecciona una plantilla verificada por Meta...</option>
                    {whatsappTemplates.map(tpl => (
                      <option key={tpl.id} value={tpl.id}>{tpl.name}</option>
                    ))}
                  </select>
                  {newCampaign.template_id && (
                    <div className="mt-3 bg-[#E5DDD5] p-4 rounded-lg relative overflow-hidden">
                      <div className="bg-[#DCF8C6] p-3 rounded-bl-lg rounded-tl-lg rounded-tr-lg shadow-sm text-sm text-[#303030] whitespace-pre-wrap relative z-10 w-full max-w-[95%] float-right">
                         {whatsappTemplates.find(t => t.id === newCampaign.template_id)?.components?.find((c:any) => c.type === 'BODY')?.text || 'Sin contenido visualizable'}
                      </div>
                      <div className="clear-both"></div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Fecha Programada (opcional)</label>
                  <input
                    type="datetime-local"
                    value={newCampaign.scheduled_date}
                    onChange={(e) => setNewCampaign({ ...newCampaign, scheduled_date: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowCampaignModal(false)}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={createCampaign}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Crear Campaña
                </button>
              </div>
            </div>
          </div>
        )}

        {showSegmentModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold text-slate-900 mb-6">Nuevo Segmento de Audiencia</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Nombre del Segmento</label>
                  <input
                    type="text"
                    value={newSegment.name}
                    onChange={(e) => setNewSegment({ ...newSegment, name: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ej: Clientes VIP"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Descripción</label>
                  <textarea
                    value={newSegment.description}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={2}
                    placeholder="Describe este segmento"
                  />
                </div>
                <div className="bg-slate-50 rounded-lg p-5 border border-slate-200">
                  <h3 className="font-semibold text-slate-900 mb-5">Perfiles de Segmentación Rápida</h3>

                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">1. Volumen de Compras</label>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { id: 'all', label: 'Cualquiera' },
                          { id: 'new', label: 'Nuevos (0-1)' },
                          { id: 'frequent', label: 'Frecuentes (2-5)' },
                          { id: 'vip', label: 'VIP (> 5)' }
                        ].map(opt => (
                          <button
                            key={opt.id}
                            onClick={() => setNewSegment({ ...newSegment, filters: { ...newSegment.filters, customerType: opt.id } })}
                            className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors border shadow-sm ${newSegment.filters.customerType === opt.id ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'}`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">2. Nivel de Actividad</label>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { id: 'all', label: 'Cualquiera' },
                          { id: 'recent', label: 'Recientes (-30d)' },
                          { id: 'inactive', label: 'Inactivos (+90d sin comprar)' }
                        ].map(opt => (
                          <button
                            key={opt.id}
                            onClick={() => setNewSegment({ ...newSegment, filters: { ...newSegment.filters, activity: opt.id } })}
                            className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors border shadow-sm ${newSegment.filters.activity === opt.id ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'}`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">3. Interés Primario</label>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { id: 'all', label: 'Todas las Joyas' },
                          { id: 'oro', label: 'Compradores de Oro' },
                          { id: 'plata', label: 'Compradores de Plata' }
                        ].map(opt => (
                          <button
                            key={opt.id}
                            onClick={() => setNewSegment({ ...newSegment, filters: { ...newSegment.filters, material: opt.id } })}
                            className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors border shadow-sm ${newSegment.filters.material === opt.id ? 'bg-[#D4AF37] text-white border-[#D4AF37]' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'}`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">4. Categoría de Producto</label>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => setNewSegment({ ...newSegment, filters: { ...newSegment.filters, category: 'all' } })}
                          className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors border shadow-sm ${newSegment.filters.category === 'all' ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'}`}
                        >
                          Cualquiera
                        </button>
                        {categories.map(cat => (
                          <button
                            key={cat.id}
                            onClick={() => setNewSegment({ ...newSegment, filters: { ...newSegment.filters, category: cat.name } })}
                            className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors border shadow-sm ${newSegment.filters.category === cat.name ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'}`}
                          >
                            {cat.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowSegmentModal(false)}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={createSegment}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Crear Segmento
                </button>
              </div>
            </div>
          </div>
        )}


      </div>
    </div>
  );
}
