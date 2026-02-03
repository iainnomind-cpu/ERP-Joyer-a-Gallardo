import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, X, Tag, DollarSign, User, Calendar, MessageSquare, ChevronDown, ChevronUp, Filter, Users, Phone, TrendingUp } from 'lucide-react';

interface Stage {
  id: string;
  name: string;
  order: number;
  color: string;
}

interface Card {
  id: string;
  customer_id: string | null;
  stage_id: string;
  title: string;
  description: string;
  estimated_value: number;
  priority: 'low' | 'medium' | 'high';
  assigned_to: string;
  order: number;
  tags: string[];
  created_at: string;
  updated_at: string;
}

interface Activity {
  id: string;
  card_id: string;
  activity_type: string;
  description: string;
  created_by: string;
  created_at: string;
}

interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  material_preference: string;
  total_purchases: number;
  last_purchase_date?: string;
  source: string;
}

export default function KanbanModule() {
  const [stages, setStages] = useState<Stage[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [showNewCard, setShowNewCard] = useState<string | null>(null);
  const [draggedCard, setDraggedCard] = useState<Card | null>(null);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [filterSegment, setFilterSegment] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  const [newCard, setNewCard] = useState({
    title: '',
    description: '',
    customer_id: '',
    estimated_value: 0,
    priority: 'medium' as 'low' | 'medium' | 'high',
    assigned_to: '',
    tags: [] as string[],
  });

  const [newActivity, setNewActivity] = useState('');

  useEffect(() => {
    loadStages();
    loadCards();
    loadCustomers();
  }, []);

  useEffect(() => {
    if (selectedCard) {
      loadActivities(selectedCard.id);
    }
  }, [selectedCard]);

  const loadStages = async () => {
    const { data, error } = await supabase
      .from('pipeline_stages')
      .select('*')
      .order('order');
    if (data && !error) setStages(data);
  };

  const loadCards = async () => {
    const { data, error } = await supabase
      .from('pipeline_cards')
      .select('*')
      .order('order');
    if (data && !error) setCards(data);
  };

  const loadCustomers = async () => {
    const { data, error } = await supabase
      .from('customers')
      .select('id, name, phone, email, material_preference, total_purchases, last_purchase_date, source')
      .order('name');
    if (data && !error) setCustomers(data);
  };

  const loadActivities = async (cardId: string) => {
    const { data, error } = await supabase
      .from('pipeline_activities')
      .select('*')
      .eq('card_id', cardId)
      .order('created_at', { ascending: false });
    if (data && !error) setActivities(data);
  };

  const createCard = async (stageId: string) => {
    if (!newCard.title.trim()) return;

    const maxOrder = cards
      .filter(c => c.stage_id === stageId)
      .reduce((max, c) => Math.max(max, c.order), 0);

    const { data, error } = await supabase
      .from('pipeline_cards')
      .insert([{
        ...newCard,
        stage_id: stageId,
        order: maxOrder + 1,
        customer_id: newCard.customer_id || null,
      }])
      .select()
      .single();

    if (data && !error) {
      setCards([...cards, data]);
      await createActivity(data.id, 'created', `Tarjeta creada en ${stages.find(s => s.id === stageId)?.name}`);
      setNewCard({
        title: '',
        description: '',
        customer_id: '',
        estimated_value: 0,
        priority: 'medium',
        assigned_to: '',
        tags: [],
      });
      setShowNewCard(null);
    }
  };

  const moveCard = async (cardId: string, newStageId: string) => {
    const card = cards.find(c => c.id === cardId);
    if (!card) return;

    const oldStage = stages.find(s => s.id === card.stage_id)?.name;
    const newStage = stages.find(s => s.id === newStageId)?.name;

    const { error } = await supabase
      .from('pipeline_cards')
      .update({ stage_id: newStageId, updated_at: new Date().toISOString() })
      .eq('id', cardId);

    if (!error) {
      setCards(cards.map(c => c.id === cardId ? { ...c, stage_id: newStageId } : c));
      await createActivity(cardId, 'moved', `Movido de ${oldStage} a ${newStage}`);
    }
  };

  const deleteCard = async (cardId: string) => {
    const { error } = await supabase
      .from('pipeline_cards')
      .delete()
      .eq('id', cardId);

    if (!error) {
      setCards(cards.filter(c => c.id !== cardId));
      if (selectedCard?.id === cardId) setSelectedCard(null);
    }
  };

  const createActivity = async (cardId: string, type: string, description: string) => {
    await supabase
      .from('pipeline_activities')
      .insert([{
        card_id: cardId,
        activity_type: type,
        description,
        created_by: 'Usuario',
      }]);
  };

  const addActivity = async () => {
    if (!selectedCard || !newActivity.trim()) return;

    await createActivity(selectedCard.id, 'note', newActivity);
    await loadActivities(selectedCard.id);
    setNewActivity('');
  };

  const handleDragStart = (card: Card) => {
    setDraggedCard(card);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (stageId: string) => {
    if (draggedCard) {
      moveCard(draggedCard.id, stageId);
      setDraggedCard(null);
    }
  };

  const toggleCardExpansion = (cardId: string) => {
    const newExpanded = new Set(expandedCards);
    if (newExpanded.has(cardId)) {
      newExpanded.delete(cardId);
    } else {
      newExpanded.add(cardId);
    }
    setExpandedCards(newExpanded);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-700 border-red-300';
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'low': return 'bg-green-100 text-green-700 border-green-300';
      default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value);
  };

  const getCustomer = (customerId: string | null) => {
    if (!customerId) return null;
    return customers.find(c => c.id === customerId) || null;
  };

  const getCustomersBySegment = () => {
    const segments = {
      plata: customers.filter(c => c.material_preference === 'Plata Pura'),
      oro: customers.filter(c => c.material_preference === 'Baño de Oro'),
      ambos: customers.filter(c => c.material_preference === 'Ambos'),
      all: customers
    };
    return segments;
  };

  const getFilteredCards = () => {
    let filtered = cards;

    if (filterSegment !== 'all') {
      const segmentCustomers = getCustomersBySegment();
      const customerIds = filterSegment === 'plata'
        ? segmentCustomers.plata.map(c => c.id)
        : filterSegment === 'oro'
        ? segmentCustomers.oro.map(c => c.id)
        : segmentCustomers.ambos.map(c => c.id);
      filtered = filtered.filter(card => card.customer_id && customerIds.includes(card.customer_id));
    }

    if (filterPriority !== 'all') {
      filtered = filtered.filter(card => card.priority === filterPriority);
    }

    return filtered;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Pipeline de Ventas</h2>
          <p className="text-gray-600 mt-1">Gestiona y da seguimiento a tus oportunidades de venta</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total en Pipeline</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(getFilteredCards().reduce((sum, c) => sum + Number(c.estimated_value), 0))}
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-emerald-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Oportunidades</p>
              <p className="text-2xl font-bold text-gray-900">{getFilteredCards().length}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Seg. Plata Pura</p>
              <p className="text-2xl font-bold text-gray-900">{getCustomersBySegment().plata.length}</p>
            </div>
            <Users className="w-8 h-8 text-gray-400" />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Seg. Baño de Oro</p>
              <p className="text-2xl font-bold text-gray-900">{getCustomersBySegment().oro.length}</p>
            </div>
            <Users className="w-8 h-8 text-yellow-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Seg. Ambos</p>
              <p className="text-2xl font-bold text-gray-900">{getCustomersBySegment().ambos.length}</p>
            </div>
            <Users className="w-8 h-8 text-blue-500" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Filtros</h3>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <Filter className="w-4 h-4" />
            {showFilters ? 'Ocultar' : 'Mostrar'}
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">Segmento de Cliente</label>
              <select
                value={filterSegment}
                onChange={(e) => setFilterSegment(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              >
                <option value="all">Todos los segmentos</option>
                <option value="plata">Plata Pura</option>
                <option value="oro">Baño de Oro</option>
                <option value="ambos">Ambos</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">Prioridad</label>
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              >
                <option value="all">Todas las prioridades</option>
                <option value="high">Alta</option>
                <option value="medium">Media</option>
                <option value="low">Baja</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => {
                  setFilterSegment('all');
                  setFilterPriority('all');
                }}
                className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
              >
                Limpiar Filtros
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {stages.map(stage => (
          <div
            key={stage.id}
            className="flex-shrink-0 w-80 bg-gray-50 rounded-lg p-4"
            onDragOver={handleDragOver}
            onDrop={() => handleDrop(stage.id)}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: stage.color }}
                />
                <h3 className="font-semibold text-gray-900">{stage.name}</h3>
                <span className="bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded-full">
                  {getFilteredCards().filter(c => c.stage_id === stage.id).length}
                </span>
              </div>
              <button
                onClick={() => setShowNewCard(stage.id)}
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto">
              {showNewCard === stage.id && (
                <div className="bg-white rounded-lg shadow p-4 space-y-3 border-2 border-blue-500">
                  <input
                    type="text"
                    placeholder="Título de la oportunidad"
                    value={newCard.title}
                    onChange={e => setNewCard({ ...newCard, title: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                  <textarea
                    placeholder="Descripción"
                    value={newCard.description}
                    onChange={e => setNewCard({ ...newCard, description: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    rows={2}
                  />
                  <select
                    value={newCard.customer_id}
                    onChange={e => setNewCard({ ...newCard, customer_id: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  >
                    <option value="">Seleccionar cliente</option>
                    {customers.map(customer => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name} - {customer.phone}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    placeholder="Valor estimado"
                    value={newCard.estimated_value || ''}
                    onChange={e => setNewCard({ ...newCard, estimated_value: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                  <select
                    value={newCard.priority}
                    onChange={e => setNewCard({ ...newCard, priority: e.target.value as any })}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  >
                    <option value="low">Prioridad Baja</option>
                    <option value="medium">Prioridad Media</option>
                    <option value="high">Prioridad Alta</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Asignado a"
                    value={newCard.assigned_to}
                    onChange={e => setNewCard({ ...newCard, assigned_to: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => createCard(stage.id)}
                      className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors"
                    >
                      Crear
                    </button>
                    <button
                      onClick={() => setShowNewCard(null)}
                      className="px-3 py-2 border rounded-lg text-sm hover:bg-gray-50 transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              {getFilteredCards()
                .filter(card => card.stage_id === stage.id)
                .map(card => {
                  const isExpanded = expandedCards.has(card.id);
                  const customer = getCustomer(card.customer_id);
                  return (
                    <div
                      key={card.id}
                      draggable
                      onDragStart={() => handleDragStart(card)}
                      className={`bg-white rounded-lg shadow p-4 cursor-move hover:shadow-lg transition-all ${
                        selectedCard?.id === card.id ? 'ring-2 ring-blue-500' : ''
                      }`}
                      onClick={() => setSelectedCard(card)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium text-gray-900 text-sm flex-1">{card.title}</h4>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleCardExpansion(card.id);
                          }}
                          className="text-gray-500 hover:text-gray-700"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>

                      {customer && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 mb-2">
                          <div className="flex items-center gap-2 mb-1">
                            <User className="w-3 h-3 text-blue-700" />
                            <span className="font-medium text-blue-900 text-xs">{customer.name}</span>
                          </div>
                          {isExpanded && (
                            <>
                              <div className="flex items-center gap-2 text-xs text-blue-700">
                                <Phone className="w-3 h-3" />
                                <span>{customer.phone}</span>
                              </div>
                              <div className="mt-1">
                                <span className={`text-xs px-2 py-0.5 rounded-full ${
                                  customer.material_preference === 'Plata Pura'
                                    ? 'bg-gray-200 text-gray-700'
                                    : customer.material_preference === 'Baño de Oro'
                                    ? 'bg-yellow-200 text-yellow-700'
                                    : 'bg-blue-200 text-blue-700'
                                }`}>
                                  {customer.material_preference}
                                </span>
                              </div>
                              {customer.total_purchases > 0 && (
                                <div className="text-xs text-blue-700 mt-1">
                                  Compras: ${customer.total_purchases.toLocaleString('es-MX')}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      )}

                      {!customer && (
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-2 mb-2">
                          <div className="flex items-center gap-2">
                            <User className="w-3 h-3 text-gray-500" />
                            <span className="text-xs text-gray-500">Sin cliente asignado</span>
                          </div>
                        </div>
                      )}

                      {isExpanded && card.description && (
                        <p className="text-xs text-gray-600 mb-2 p-2 bg-gray-50 rounded">{card.description}</p>
                      )}

                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-xs px-2 py-1 rounded border ${getPriorityColor(card.priority)}`}>
                          {card.priority === 'high' ? 'Alta' : card.priority === 'medium' ? 'Media' : 'Baja'}
                        </span>
                        {card.assigned_to && (
                          <span className="text-xs text-gray-600 flex items-center gap-1">
                            <Tag className="w-3 h-3" />
                            {card.assigned_to}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-xs text-gray-600">
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-3 h-3" />
                          <span className="font-semibold text-gray-900">{formatCurrency(card.estimated_value)}</span>
                        </div>
                        {isExpanded && (
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <span>{new Date(card.created_at).toLocaleDateString('es-MX')}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        ))}
      </div>

      {selectedCard && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-900">{selectedCard.title}</h3>
              <button
                onClick={() => setSelectedCard(null)}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Cliente</label>
                  {(() => {
                    const customer = getCustomer(selectedCard.customer_id);
                    return customer ? (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <p className="font-semibold text-blue-900 mb-2">{customer.name}</p>
                        <div className="space-y-1 text-sm text-blue-700">
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4" />
                            <span>{customer.phone}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Tag className="w-4 h-4" />
                            <span className={`px-2 py-0.5 rounded-full text-xs ${
                              customer.material_preference === 'Plata Pura'
                                ? 'bg-gray-200 text-gray-700'
                                : customer.material_preference === 'Baño de Oro'
                                ? 'bg-yellow-200 text-yellow-700'
                                : 'bg-blue-200 text-blue-700'
                            }`}>
                              {customer.material_preference}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <TrendingUp className="w-4 h-4" />
                            <span>Compras totales: ${customer.total_purchases.toLocaleString('es-MX')}</span>
                          </div>
                          {customer.last_purchase_date && (
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4" />
                              <span>Última compra: {new Date(customer.last_purchase_date).toLocaleDateString('es-MX')}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            <span>Origen: {customer.source}</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-gray-500">Sin cliente asignado</p>
                    );
                  })()}
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Valor Estimado</label>
                  <p className="text-gray-900 font-semibold">{formatCurrency(selectedCard.estimated_value)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Prioridad</label>
                  <span className={`inline-block text-xs px-2 py-1 rounded border ${getPriorityColor(selectedCard.priority)}`}>
                    {selectedCard.priority === 'high' ? 'Alta' : selectedCard.priority === 'medium' ? 'Media' : 'Baja'}
                  </span>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Asignado a</label>
                  <p className="text-gray-900">{selectedCard.assigned_to || 'Sin asignar'}</p>
                </div>
              </div>

              {selectedCard.description && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Descripción</label>
                  <p className="text-gray-900 mt-1">{selectedCard.description}</p>
                </div>
              )}

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <MessageSquare className="w-5 h-5 text-gray-600" />
                  <h4 className="font-semibold text-gray-900">Actividades</h4>
                </div>

                <div className="flex gap-2 mb-4">
                  <input
                    type="text"
                    placeholder="Agregar nota o actividad..."
                    value={newActivity}
                    onChange={e => setNewActivity(e.target.value)}
                    onKeyPress={e => e.key === 'Enter' && addActivity()}
                    className="flex-1 px-3 py-2 border rounded-lg text-sm"
                  />
                  <button
                    onClick={addActivity}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors"
                  >
                    Agregar
                  </button>
                </div>

                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {activities.map(activity => (
                    <div key={activity.id} className="border-l-2 border-blue-500 pl-4 py-2">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-gray-900">{activity.activity_type}</span>
                        <span className="text-xs text-gray-500">
                          {new Date(activity.created_at).toLocaleString('es-MX')}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700">{activity.description}</p>
                      {activity.created_by && (
                        <p className="text-xs text-gray-500 mt-1">Por: {activity.created_by}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  onClick={() => {
                    if (confirm('¿Estás seguro de eliminar esta oportunidad?')) {
                      deleteCard(selectedCard.id);
                    }
                  }}
                  className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  Eliminar
                </button>
                <button
                  onClick={() => setSelectedCard(null)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
