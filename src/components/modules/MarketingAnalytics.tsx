import React from 'react';
import { BarChart3, TrendingUp, Users, Target, Activity, Mail, CheckCircle2, Eye, MousePointerClick, AlertTriangle } from 'lucide-react';

interface MarketingAnalyticsProps {
  campaigns: any[];
  segments: any[];
  customers: any[];
}

export default function MarketingAnalytics({ campaigns, segments, customers }: MarketingAnalyticsProps) {
  // Aggregate Global Stats from Campaigns
  const globalStats = campaigns.reduce((acc, curr) => {
    return {
      sent: acc.sent + (curr.stats?.sent || 0),
      delivered: acc.delivered + (curr.stats?.delivered || 0),
      opened: acc.opened + (curr.stats?.opened || 0),
      clicked: acc.clicked + (curr.stats?.clicked || 0),
      failed: acc.failed + (curr.stats?.failed || 0),
    };
  }, { sent: 0, delivered: 0, opened: 0, clicked: 0, failed: 0 });

  // Calculate Rates
  const safePercent = (val: number, total: number) => total > 0 ? Math.round((val / total) * 100) : 0;
  const deliveryRate = safePercent(globalStats.delivered, globalStats.sent);
  const openRate = safePercent(globalStats.opened, globalStats.delivered); // Opened out of delivered
  const clickRate = safePercent(globalStats.clicked, globalStats.opened); // Clicked out of opened
  const failRate = safePercent(globalStats.failed, globalStats.sent);

  // Top Campaigns
  const topCampaigns = [...campaigns]
    .filter(c => c.stats?.delivered > 0)
    .sort((a, b) => {
      const rateA = safePercent(a.stats?.opened || 0, a.stats?.delivered || 0);
      const rateB = safePercent(b.stats?.opened || 0, b.stats?.delivered || 0);
      return rateB - rateA;
    })
    .slice(0, 3);

  // Audience Analytics
  const materialStats = customers.reduce((acc, c) => {
    const mat = c.material_preference || 'No definido';
    acc[mat] = (acc[mat] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const categoryStats = customers.reduce((acc, c) => {
    const cat = c.preferred_category || 'Otra';
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const sortStats = (statsObj: Record<string, number>) => {
    const total = Object.values(statsObj).reduce((a, b) => a + b, 0);
    return Object.entries(statsObj)
      .sort((a, b) => b[1] - a[1])
      .map(([label, count]) => ({
        label,
        count,
        percent: safePercent(count, total)
      }));
  };

  const topMaterials = sortStats(materialStats).slice(0, 4);
  const topCategories = sortStats(categoryStats).slice(0, 5);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* KPI Header */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-2 text-slate-500 mb-2">
            <Mail className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">Enviados</span>
          </div>
          <div className="text-3xl font-bold text-slate-900">{globalStats.sent}</div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-2 text-green-600 mb-2">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">Entregabilidad</span>
          </div>
          <div className="text-3xl font-bold text-emerald-600">{deliveryRate}%</div>
          <p className="text-xs text-slate-500 mt-1">{globalStats.delivered} msgs</p>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-2 text-blue-600 mb-2">
            <Eye className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">Lectura (Open)</span>
          </div>
          <div className="text-3xl font-bold text-blue-600">{openRate}%</div>
          <p className="text-xs text-slate-500 mt-1">{globalStats.opened} msgs</p>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-2 text-purple-600 mb-2">
            <MousePointerClick className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">Eficiencia (Click)</span>
          </div>
          <div className="text-3xl font-bold text-purple-600">{clickRate}%</div>
          <p className="text-xs text-slate-500 mt-1">{globalStats.clicked} msgs</p>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-2 text-red-600 mb-2">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">Fallos (Bounces)</span>
          </div>
          <div className="text-3xl font-bold text-red-600">{failRate}%</div>
          <p className="text-xs text-slate-500 mt-1">{globalStats.failed} msgs</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Funnel Section */}
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm lg:col-span-2">
          <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-500" />
            Funnel de Conversión WABA
          </h3>
          
          <div className="space-y-4">
            {[
              { label: '1. Despachados (Sent)', count: globalStats.sent, max: Math.max(1, globalStats.sent), color: 'bg-slate-300' },
              { label: '2. Entregados (Delivered)', count: globalStats.delivered, max: Math.max(1, globalStats.sent), color: 'bg-emerald-500' },
              { label: '3. Leídos (Opened)', count: globalStats.opened, max: Math.max(1, globalStats.sent), color: 'bg-blue-500' },
              { label: '4. Interacción (Clicked)', count: globalStats.clicked, max: Math.max(1, globalStats.sent), color: 'bg-purple-500' },
            ].map((step, idx) => (
              <div key={idx} className="relative">
                <div className="flex justify-between items-end mb-1">
                  <span className="text-sm font-medium text-slate-700">{step.label}</span>
                  <span className="text-sm font-bold text-slate-900">{step.count.toLocaleString()}</span>
                </div>
                <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden flex">
                  <div 
                    className={`h-full rounded-full transition-all duration-1000 ease-out ${step.color}`}
                    style={{ width: `${safePercent(step.count, step.max)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-6 bg-indigo-50 rounded-lg p-4 border border-indigo-100 flex items-start gap-3">
             <Activity className="w-5 h-5 text-indigo-600 mt-0.5" />
             <p className="text-sm text-indigo-900">
               La tasa de lectura sana para WhatsApp ronda el <span className="font-bold">60% - 80%</span>. Si tu tasa cae debajo de esto, intenta enviar campañas en horarios pico o mejorar las "cabeceras" de las plantillas de Meta.
             </p>
          </div>
        </div>

        {/* Top Campaigns Table */}
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex flex-col">
          <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-amber-500" />
            Top Campañas
          </h3>

          <div className="flex-1 space-y-4">
            {topCampaigns.length === 0 ? (
              <div className="text-center text-slate-500 py-8 text-sm">
                No hay datos suficientes
              </div>
            ) : (
              topCampaigns.map((camp, i) => (
                <div key={camp.id} className="group p-3 rounded-lg border border-slate-100 hover:border-amber-200 hover:bg-amber-50 transition-all">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-semibold text-slate-800 text-sm truncate pr-2">
                      {i+1}. {camp.name}
                    </span>
                    <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-medium">
                      {safePercent(camp.stats?.opened, camp.stats?.delivered)}% Open
                    </span>
                  </div>
                  <div className="flex gap-4 text-xs text-slate-500">
                    <span>Entregados: {camp.stats?.delivered}</span>
                    <span>Clicks: {camp.stats?.clicked}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Material Audiences */}
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-500" />
            Intereses de Material en Clientes
          </h3>
          <div className="space-y-5">
            {topMaterials.map((mat, i) => (
              <div key={i}>
                <div className="flex justify-between items-end mb-1">
                  <span className="text-sm font-medium text-slate-700">{mat.label}</span>
                  <span className="text-sm font-semibold text-slate-900">{mat.percent}% <span className="text-slate-400 font-normal">({mat.count})</span></span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full bg-blue-500 transition-all duration-1000 ease-out"
                    style={{ width: `${mat.percent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Category Audiences */}
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
            <Target className="w-5 h-5 text-teal-500" />
            Intereses de Categoría Preferida
          </h3>
          <div className="space-y-4">
            {topCategories.map((cat, i) => (
              <div key={i}>
                <div className="flex justify-between items-end mb-1">
                  <span className="text-sm font-medium text-slate-700">{cat.label}</span>
                  <span className="text-sm font-semibold text-slate-900">{cat.percent}% <span className="text-slate-400 font-normal">({cat.count})</span></span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full bg-teal-500 transition-all duration-1000 ease-out"
                    style={{ width: `${cat.percent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Segment Audiences */}
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm lg:col-span-2">
          <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-500" />
            Segmentos de Audiencia Activos
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {segments.slice(0, 4).map((seg, i) => (
              <div key={i} className="bg-indigo-50 rounded-lg p-4 border border-indigo-100 flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-indigo-900">{seg.name}</h4>
                  <p className="text-xs text-indigo-700 mt-1">{Object.keys(seg.filters).length} filtros</p>
                </div>
                <div className="text-2xl font-bold text-indigo-700">{seg.customer_count}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
    </div>
  );
}
