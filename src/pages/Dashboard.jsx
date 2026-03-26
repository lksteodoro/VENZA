import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, Users, AlertCircle, DollarSign } from 'lucide-react';
import { CAMPAIGNS, CLIENTS } from '../data/mockData';
import './Dashboard.css';

const chartData = [
  { name: '01/03', spend: 4000, revenue: 12000 },
  { name: '02/03', spend: 4200, revenue: 13500 },
  { name: '03/03', spend: 4800, revenue: 11000 },
  { name: '04/03', spend: 5200, revenue: 18000 },
  { name: '05/03', spend: 5000, revenue: 16500 },
  { name: '06/03', spend: 5500, revenue: 21000 },
  { name: '07/03', spend: 5800, revenue: 24000 },
];

const Dashboard = () => {
  const totalSpend = CAMPAIGNS.reduce((acc, c) => acc + c.spend, 0);
  const totalRev = CAMPAIGNS.reduce((acc, c) => acc + c.revenue, 0);
  const avgRoas = totalSpend > 0 ? (totalRev / totalSpend).toFixed(2) : 0;

  return (
    <div className="page-content">

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-card-top">
            <div>
              <p className="kpi-label">Gasto Total (Hoje)</p>
              <h3 className="kpi-value">R$ {totalSpend.toFixed(2)}</h3>
            </div>
            <div className="kpi-icon danger">
              <TrendingUp size={22} />
            </div>
          </div>
          <p className="kpi-trend positive">+12% vs. ontem</p>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-top">
            <div>
              <p className="kpi-label">ROAS Médio Global</p>
              <h3 className="kpi-value">{avgRoas}x</h3>
            </div>
            <div className="kpi-icon success">
              <DollarSign size={22} />
            </div>
          </div>
          <p className="kpi-trend positive">Meta: 3.0x</p>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-top">
            <div>
              <p className="kpi-label">Clientes Ativos</p>
              <h3 className="kpi-value">{CLIENTS.length}</h3>
            </div>
            <div className="kpi-icon primary">
              <Users size={22} />
            </div>
          </div>
          <p className="kpi-trend neutral">2 clientes em onboarding</p>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-top">
            <div>
              <p className="kpi-label">Regras Disparadas</p>
              <h3 className="kpi-value">14</h3>
            </div>
            <div className="kpi-icon warning">
              <AlertCircle size={22} />
            </div>
          </div>
          <p className="kpi-trend warning">3 campanhas pausadas</p>
        </div>
      </div>

      <div className="dashboard-bottom-row">

        {/* Main Chart */}
        <div className="chart-panel">
          <h3 className="chart-panel-title">Desempenho da Agência (Investimento vs Receita)</h3>
          <div className="chart-panel-body">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ff6b00" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#ff6b00" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-light)" />
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-main)', borderRadius: '8px', boxShadow: 'var(--shadow-md)' }}
                  labelStyle={{ fontWeight: 'bold', color: 'var(--text-main)' }}
                  itemStyle={{ color: 'var(--text-muted)' }}
                />
                <Area type="monotone" dataKey="revenue" name="Receita" stroke="#10b981" fillOpacity={1} fill="url(#colorRev)" />
                <Area type="monotone" dataKey="spend" name="Investimento" stroke="#ff6b00" fillOpacity={1} fill="url(#colorSpend)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Suggestion Widget */}
        <div className="alerts-panel">
          <h3 className="alerts-panel-title">
            <AlertCircle size={18} color="var(--warning)" /> Alertas &amp; Sugestões
          </h3>

          <div className="alerts-list">
            <div className="alert-item danger">
              <h4 className="alert-title danger">Custo Crítico</h4>
              <p className="alert-body">Campanha <strong>[Conv] Lançamento Sahara</strong> excedeu o CPA limite (R$ 29.20). Deseja pausar?</p>
              <div className="alert-actions">
                <button className="alert-btn danger-solid">Pausar Agora</button>
                <button className="alert-btn danger-outline">Ignorar</button>
              </div>
            </div>

            <div className="alert-item success">
              <h4 className="alert-title success">Oportunidade de Escala</h4>
              <p className="alert-body">Campanha <strong>[Conv] Remarketing 7D</strong> gerou ROAS de 8.33x. Aplicar regra de escala automática (+20%)?</p>
              <div className="alert-actions">
                <button className="alert-btn success-solid">Escalar Orçamento</button>
              </div>
            </div>

            <div className="alert-item primary">
              <h4 className="alert-title primary">Nova Tarefa no Kanban</h4>
              <p className="alert-body">Automação gerou card <strong>Revisar Criativos: REI DA PREM</strong>. O CTR (2.1%) caiu 30% em 2 dias.</p>
              <div className="alert-actions">
                <a href="#/kanban" className="alert-btn primary-link">Ver no Quadro →</a>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
