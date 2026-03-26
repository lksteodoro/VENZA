import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Clock, Users, AlertCircle, CheckCircle, Zap, Target, Activity } from 'lucide-react';

const TEAM = [
  { name: 'Lucas', avatar: 'https://i.pravatar.cc/40?u=lucas', concluidas: 14, emAndamento: 3, atrasadas: 1, horasTrabalhadas: 38 },
  { name: 'Marina', avatar: 'https://i.pravatar.cc/40?u=marina', concluidas: 11, emAndamento: 5, atrasadas: 0, horasTrabalhadas: 32 },
  { name: 'Pedro', avatar: 'https://i.pravatar.cc/40?u=pedro', concluidas: 8, emAndamento: 2, atrasadas: 3, horasTrabalhadas: 27 },
  { name: 'Clara', avatar: 'https://i.pravatar.cc/40?u=clara', concluidas: 17, emAndamento: 1, atrasadas: 0, horasTrabalhadas: 40 },
];

const GARGALO_DATA = [
  { coluna: 'Backlog', tempoMedio: 0.5 },
  { coluna: 'Em Andamento', tempoMedio: 2.2 },
  { coluna: 'Revisão Interna', tempoMedio: 1.8 },
  { coluna: 'Ag. Aprovação', tempoMedio: 4.1 },
  { coluna: 'Concluído', tempoMedio: 0 },
];

const SLA_DATA = [
  { name: 'No Prazo', value: 72, color: '#10b981' },
  { name: 'Atrasadas', value: 18, color: '#ef4444' },
  { name: 'Em Risco', value: 10, color: '#f59e0b' },
];

const WEEKLY_DATA = [
  { semana: 'Sem 1', concluidas: 12, demandas: 15 },
  { semana: 'Sem 2', concluidas: 18, demandas: 20 },
  { semana: 'Sem 3', concluidas: 9, demandas: 14 },
  { semana: 'Sem 4', concluidas: 22, demandas: 24 },
];

const KpiCard = ({ icon, label, value, sub, color }) => (
  <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: '14px', padding: '20px', display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
    <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <span style={{ color }}>{icon}</span>
    </div>
    <div>
      <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>{label}</div>
      <div style={{ fontSize: '26px', fontWeight: '800', color: 'var(--text-main)', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>{sub}</div>}
    </div>
  </div>
);

const Analytics = ({ demandas = [] }) => {
  const [tab, setTab] = useState('capacidade');

  const totalDemandas = demandas.length + 50;
  const entreguesNoPrazo = Math.round(totalDemandas * 0.72);
  const atrasadas = Math.round(totalDemandas * 0.18);

  const tabStyle = (t) => ({
    padding: '8px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer',
    background: tab === t ? 'var(--primary)' : 'transparent',
    color: tab === t ? 'white' : 'var(--text-muted)',
    border: 'none', transition: 'all 0.2s',
  });

  return (
    <div className="page-content" style={{ padding: '0 32px 32px', gap: '24px' }}>
      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        <KpiCard icon={<CheckCircle size={18} />} label="Tarefas Concluídas" value={TEAM.reduce((a, t) => a + t.concluidas, 0)} sub="Esta semana" color="#10b981" />
        <KpiCard icon={<Target size={18} />} label="Taxa de Entrega no Prazo" value={`${72}%`} sub="vs 65% semana passada" color="#8b5cf6" />
        <KpiCard icon={<Clock size={18} />} label="Gargalo Médio" value="4.1 dias" sub="Aguardando Aprovação do Cliente" color="#f59e0b" />
        <KpiCard icon={<AlertCircle size={18} />} label="SLA Atrasados" value={atrasadas} sub={`${totalDemandas} demandas totais`} color="#ef4444" />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: '10px', padding: '4px', width: 'fit-content' }}>
        {[['capacidade', 'Capacidade do Time'], ['gargalo', 'Gargalos'], ['sla', 'Relatório de SLA']].map(([k, l]) => (
          <button key={k} style={tabStyle(k)} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      {/* ── Capacidade do Time ── */}
      {tab === 'capacidade' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {/* Tabela de membros */}
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: '14px', overflow: 'hidden' }}>
            <div style={{ padding: '20px', borderBottom: '1px solid var(--border-light)', fontWeight: '700', fontSize: '15px' }}>
              <Users size={16} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle', color: 'var(--primary)' }} />
              Capacidade por Membro
            </div>
            <div>
              {TEAM.map((m, i) => {
                const total = m.concluidas + m.emAndamento + m.atrasadas;
                const pct = Math.round((m.concluidas / total) * 100);
                return (
                  <div key={i} style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <img src={m.avatar} alt={m.name} style={{ width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{ fontWeight: '700', fontSize: '13px' }}>{m.name}</span>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{m.concluidas} concluídas · {m.horasTrabalhadas}h</span>
                      </div>
                      <div style={{ height: '6px', background: 'var(--bg-app)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: m.atrasadas > 2 ? '#ef4444' : '#10b981', borderRadius: '4px', transition: 'width 0.5s' }} />
                      </div>
                      <div style={{ display: 'flex', gap: '12px', marginTop: '6px' }}>
                        <span style={{ fontSize: '11px', color: '#10b981' }}>✓ {m.concluidas}</span>
                        <span style={{ fontSize: '11px', color: '#8b5cf6' }}>⏳ {m.emAndamento}</span>
                        {m.atrasadas > 0 && <span style={{ fontSize: '11px', color: '#ef4444' }}>⚠ {m.atrasadas} atrasadas</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Gráfico de barras semanal */}
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: '14px', padding: '20px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '20px' }}>
              <Activity size={16} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle', color: 'var(--primary)' }} />
              Demandas por Semana
            </h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={WEEKLY_DATA} margin={{ top: 5, right: 0, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" vertical={false} />
                <XAxis dataKey="semana" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
                <Tooltip contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border-main)', borderRadius: '8px' }} />
                <Bar dataKey="demandas" name="Recebidas" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="concluidas" name="Concluídas" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── Gargalos ── */}
      {tab === 'gargalo' && (
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: '14px', padding: '24px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '6px' }}>
            <Clock size={16} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle', color: '#f59e0b' }} />
            Tempo Médio por Coluna
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '24px' }}>Onde as tarefas passam mais tempo paradas na operação.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {GARGALO_DATA.map((g, i) => {
              const max = Math.max(...GARGALO_DATA.map(x => x.tempoMedio));
              const pct = max > 0 ? (g.tempoMedio / max) * 100 : 0;
              const isAlert = g.tempoMedio > 3.5;
              return (
                <div key={i}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: isAlert ? '#ef4444' : 'var(--text-main)' }}>
                      {isAlert && '⚠ '}{g.coluna}
                    </span>
                    <span style={{ fontSize: '13px', fontWeight: '700', color: isAlert ? '#ef4444' : 'var(--text-muted)' }}>
                      {g.tempoMedio > 0 ? `${g.tempoMedio} dias` : '—'}
                    </span>
                  </div>
                  <div style={{ height: '10px', background: 'var(--bg-app)', borderRadius: '6px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: isAlert ? 'linear-gradient(90deg, #ef4444, #f59e0b)' : '#8b5cf6', borderRadius: '6px', transition: 'width 0.6s ease' }} />
                  </div>
                  {isAlert && <p style={{ fontSize: '11px', color: '#ef4444', marginTop: '4px' }}>Gargalo detectado: aprovações de cliente estão atrasando a operação.</p>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── SLA ── */}
      {tab === 'sla' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '20px' }}>
          {/* Donut */}
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: '14px', padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '20px', alignSelf: 'flex-start' }}>Entrega vs. SLA</h3>
            <PieChart width={200} height={200}>
              <Pie data={SLA_DATA} cx={100} cy={100} innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value">
                {SLA_DATA.map((entry, index) => <Cell key={index} fill={entry.color} />)}
              </Pie>
            </PieChart>
            <div style={{ display: 'flex', gap: '16px', marginTop: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
              {SLA_DATA.map((s, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{s.name}: <strong style={{ color: 'var(--text-main)' }}>{s.value}%</strong></span>
                </div>
              ))}
            </div>
          </div>

          {/* SLA por cliente */}
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: '14px', overflow: 'hidden' }}>
            <div style={{ padding: '20px', borderBottom: '1px solid var(--border-light)', fontWeight: '700', fontSize: '15px' }}>SLA por Cliente</div>
            {[
              { name: 'MIGUEL DO GRAU', demandas: 12, noPrazo: 11, atrasadas: 1, emRisco: 0 },
              { name: 'REI DA PREMIAÇÃO', demandas: 20, noPrazo: 14, atrasadas: 5, emRisco: 1 },
              { name: 'PEDOKA', demandas: 8, noPrazo: 7, atrasadas: 0, emRisco: 1 },
              { name: 'FIOTE DE SORTE', demandas: 6, noPrazo: 4, atrasadas: 2, emRisco: 0 },
            ].map((c, i) => {
              const pct = Math.round((c.noPrazo / c.demandas) * 100);
              return (
                <div key={i} style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontWeight: '700', fontSize: '13px' }}>{c.name}</span>
                      <span style={{ fontSize: '12px', fontWeight: '700', color: pct >= 80 ? '#10b981' : '#ef4444' }}>{pct}% no prazo</span>
                    </div>
                    <div style={{ height: '6px', background: 'var(--bg-app)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: pct >= 80 ? '#10b981' : '#ef4444', borderRadius: '4px' }} />
                    </div>
                    <div style={{ display: 'flex', gap: '12px', marginTop: '6px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{c.demandas} demandas</span>
                      {c.atrasadas > 0 && <span style={{ fontSize: '11px', color: '#ef4444' }}>⚠ {c.atrasadas} atrasadas</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default Analytics;
