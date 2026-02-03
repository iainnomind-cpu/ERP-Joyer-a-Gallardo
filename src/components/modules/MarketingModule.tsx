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
  Zap,
  Settings,
  Target,
  Mail,
  Phone,
  Bell
} from 'lucide-react';

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
  const [activeTab, setActiveTab] = useState<'campaigns' | 'segments' | 'automations' | 'analytics'>('campaigns');
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [showSegmentModal, setShowSegmentModal] = useState(false);
  const [showAutomationModal, setShowAutomationModal] = useState(false);
  const [loading, setLoading] = useState(true);

  const [newCampaign, setNewCampaign] = useState({
    name: '',
    description: '',
    type: 'promotional',
    channel: 'whatsapp',
    message_template: '',
    scheduled_date: '',
    target_segment: {}
  });

  const [newSegment, setNewSegment] = useState({
    name: '',
    description: '',
    filters: {
      material_preference: '',
      min_purchases: '',
      max_purchases: '',
      last_purchase_days: '',
      segment: ''
    }
  });

  const [newAutomation, setNewAutomation] = useState({
    name: '',
    trigger_type: 'inactive_customer',
    trigger_config: { days: 30 },
    message_template: '',
    channel: 'whatsapp'
  });

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'campaigns') {
        const { data } = await supabase
          .from('marketing_campaigns')
          .select('*')
          .order('created_at', { ascending: false });
        setCampaigns(data || []);
      } else if (activeTab === 'segments') {
        const { data } = await supabase
          .from('marketing_segments')
          .select('*')
          .order('created_at', { ascending: false });
        setSegments(data || []);
      } else if (activeTab === 'automations') {
        const { data } = await supabase
          .from('marketing_automations')
          .select('*')
          .order('created_at', { ascending: false });
        setAutomations(data || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const createCampaign = async () => {
    try {
      const { error } = await supabase
        .from('marketing_campaigns')
        .insert([newCampaign]);

      if (!error) {
        setShowCampaignModal(false);
        setNewCampaign({
          name: '',
          description: '',
          type: 'promotional',
          channel: 'whatsapp',
          message_template: '',
          scheduled_date: '',
          target_segment: {}
        });
        loadData();
      }
    } catch (error) {
      console.error('Error creating campaign:', error);
    }
  };

  const createSegment = async () => {
    try {
      const cleanFilters = Object.fromEntries(
        Object.entries(newSegment.filters).filter(([_, v]) => v !== '')
      );

      const { error } = await supabase
        .from('marketing_segments')
        .insert([{
          name: newSegment.name,
          description: newSegment.description,
          filters: cleanFilters
        }]);

      if (!error) {
        setShowSegmentModal(false);
        setNewSegment({
          name: '',
          description: '',
          filters: {
            material_preference: '',
            min_purchases: '',
            max_purchases: '',
            last_purchase_days: '',
            segment: ''
          }
        });
        loadData();
      }
    } catch (error) {
      console.error('Error creating segment:', error);
    }
  };

  const createAutomation = async () => {
    try {
      const { error } = await supabase
        .from('marketing_automations')
        .insert([newAutomation]);

      if (!error) {
        setShowAutomationModal(false);
        setNewAutomation({
          name: '',
          trigger_type: 'inactive_customer',
          trigger_config: { days: 30 },
          message_template: '',
          channel: 'whatsapp'
        });
        loadData();
      }
    } catch (error) {
      console.error('Error creating automation:', error);
    }
  };

  const toggleCampaignStatus = async (campaignId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'paused' : 'active';
    await supabase
      .from('marketing_campaigns')
      .update({ status: newStatus })
      .eq('id', campaignId);
    loadData();
  };

  const toggleAutomation = async (automationId: string, currentStatus: boolean) => {
    await supabase
      .from('marketing_automations')
      .update({ is_active: !currentStatus })
      .eq('id', automationId);
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
                  onClick={() => setShowCampaignModal(true)}
                  className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Nueva Campaña
                </button>
              )}
              {activeTab === 'segments' && (
                <button
                  onClick={() => setShowSegmentModal(true)}
                  className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Nuevo Segmento
                </button>
              )}
              {activeTab === 'automations' && (
                <button
                  onClick={() => setShowAutomationModal(true)}
                  className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Nueva Automatización
                </button>
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
              onClick={() => setActiveTab('automations')}
              className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors ${
                activeTab === 'automations'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Zap className="w-4 h-4" />
              Automatizaciones
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
                    <button
                      onClick={() => toggleCampaignStatus(campaign.id, campaign.status)}
                      className="ml-4 p-2 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      {campaign.status === 'active' ? (
                        <Pause className="w-5 h-5 text-slate-600" />
                      ) : (
                        <Play className="w-5 h-5 text-slate-600" />
                      )}
                    </button>
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
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'automations' && (
          <div className="grid gap-4">
            {loading ? (
              <div className="text-center py-12 text-slate-600">Cargando automatizaciones...</div>
            ) : automations.length === 0 ? (
              <div className="bg-white rounded-xl p-12 text-center border border-slate-200">
                <Zap className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">No hay automatizaciones todavía</h3>
                <p className="text-slate-600 mb-4">Configura mensajes automáticos basados en eventos</p>
                <button
                  onClick={() => setShowAutomationModal(true)}
                  className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Nueva Automatización
                </button>
              </div>
            ) : (
              automations.map((automation) => (
                <div key={automation.id} className="bg-white rounded-xl p-6 border border-slate-200 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-slate-900">{automation.name}</h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          automation.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {automation.is_active ? 'Activa' : 'Inactiva'}
                        </span>
                        <span className="flex items-center gap-1 px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs">
                          {getChannelIcon(automation.channel)}
                          {automation.channel}
                        </span>
                      </div>
                      <div className="flex items-center gap-6 text-sm mb-4">
                        <div className="flex items-center gap-2">
                          <Settings className="w-4 h-4 text-slate-400" />
                          <span className="text-slate-600">Trigger: {automation.trigger_type}</span>
                        </div>
                        {automation.last_run && (
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-slate-400" />
                            <span className="text-slate-600">
                              Última ejecución: {new Date(automation.last_run).toLocaleDateString('es-MX')}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="bg-slate-50 rounded-lg p-4">
                        <p className="text-sm text-slate-700">{automation.message_template}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleAutomation(automation.id, automation.is_active)}
                      className={`ml-4 px-4 py-2 rounded-lg font-medium transition-colors ${
                        automation.is_active
                          ? 'bg-red-100 text-red-700 hover:bg-red-200'
                          : 'bg-green-100 text-green-700 hover:bg-green-200'
                      }`}
                    >
                      {automation.is_active ? 'Desactivar' : 'Activar'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
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
                  <label className="block text-sm font-medium text-slate-700 mb-2">Mensaje</label>
                  <textarea
                    value={newCampaign.message_template}
                    onChange={(e) => setNewCampaign({ ...newCampaign, message_template: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                    rows={6}
                    placeholder="Hola {nombre}, tenemos una promoción especial para ti..."
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Variables disponibles: {'{nombre}'}, {'{apellido}'}, {'{total_compras}'}
                  </p>
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
                    onChange={(e) => setNewSegment({ ...newSegment, description: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={2}
                    placeholder="Describe este segmento"
                  />
                </div>

                <div className="bg-slate-50 rounded-lg p-4">
                  <h3 className="font-semibold text-slate-900 mb-4">Filtros de Segmentación</h3>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Preferencia de Material</label>
                      <select
                        value={newSegment.filters.material_preference}
                        onChange={(e) => setNewSegment({
                          ...newSegment,
                          filters: { ...newSegment.filters, material_preference: e.target.value }
                        })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                      >
                        <option value="">Cualquiera</option>
                        <option value="Plata Pura">Plata Pura</option>
                        <option value="Baño de Oro">Baño de Oro</option>
                        <option value="Ambos">Ambos</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Compras Mínimas</label>
                        <input
                          type="number"
                          value={newSegment.filters.min_purchases}
                          onChange={(e) => setNewSegment({
                            ...newSegment,
                            filters: { ...newSegment.filters, min_purchases: e.target.value }
                          })}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Compras Máximas</label>
                        <input
                          type="number"
                          value={newSegment.filters.max_purchases}
                          onChange={(e) => setNewSegment({
                            ...newSegment,
                            filters: { ...newSegment.filters, max_purchases: e.target.value }
                          })}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                          placeholder="999"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Días desde última compra</label>
                      <input
                        type="number"
                        value={newSegment.filters.last_purchase_days}
                        onChange={(e) => setNewSegment({
                          ...newSegment,
                          filters: { ...newSegment.filters, last_purchase_days: e.target.value }
                        })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                        placeholder="Ej: 30 (clientes activos en los últimos 30 días)"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Segmento Específico</label>
                      <input
                        type="text"
                        value={newSegment.filters.segment}
                        onChange={(e) => setNewSegment({
                          ...newSegment,
                          filters: { ...newSegment.filters, segment: e.target.value }
                        })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                        placeholder="VIP, Regular, etc."
                      />
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

        {showAutomationModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold text-slate-900 mb-6">Nueva Automatización</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Nombre</label>
                  <input
                    type="text"
                    value={newAutomation.name}
                    onChange={(e) => setNewAutomation({ ...newAutomation, name: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ej: Recordatorio para clientes inactivos"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Tipo de Trigger</label>
                    <select
                      value={newAutomation.trigger_type}
                      onChange={(e) => setNewAutomation({ ...newAutomation, trigger_type: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="inactive_customer">Cliente Inactivo</option>
                      <option value="customer_birthday">Cumpleaños del Cliente</option>
                      <option value="purchase_anniversary">Aniversario de Compra</option>
                      <option value="abandoned_cart">Carrito Abandonado</option>
                      <option value="new_customer">Cliente Nuevo</option>
                      <option value="vip_customer">Cliente VIP</option>
                      <option value="custom">Personalizado</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Canal</label>
                    <select
                      value={newAutomation.channel}
                      onChange={(e) => setNewAutomation({ ...newAutomation, channel: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="whatsapp">WhatsApp</option>
                      <option value="sms">SMS</option>
                      <option value="email">Email</option>
                      <option value="push">Push Notification</option>
                    </select>
                  </div>
                </div>

                {newAutomation.trigger_type === 'inactive_customer' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Días de inactividad</label>
                    <input
                      type="number"
                      value={newAutomation.trigger_config.days}
                      onChange={(e) => setNewAutomation({
                        ...newAutomation,
                        trigger_config: { days: parseInt(e.target.value) || 30 }
                      })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="30"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Mensaje</label>
                  <textarea
                    value={newAutomation.message_template}
                    onChange={(e) => setNewAutomation({ ...newAutomation, message_template: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                    rows={6}
                    placeholder="Hola {nombre}, te extrañamos! Tenemos nuevos productos que te encantarán..."
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowAutomationModal(false)}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={createAutomation}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Crear Automatización
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
