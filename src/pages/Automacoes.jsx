import React, { useState } from 'react';
import { Zap, Plus, Trash2, ToggleLeft, ToggleRight, MessageSquare, Mail, Bell, GitBranch, Check, Clock, AlertTriangle } from 'lucide-react';

const GATILHOS = ['Card movido para Aguardando Aprovação', 'Card movido para Concluído', 'Card em andamento por mais de 3 dias sem atualização', 'Nova demanda submetida pelo cliente', 'SLA atingido'];
const ACOES = ['Enviar e-mail para o cliente', 'Enviar mensagem no WhatsApp', 'Notificar gestor (Slack/Discord)', 'Criar alerta no sistema', 'Mover card automaticamente'];

const AUTOMACOES_INICIAIS = [
  {
    id: 'auto-1', nome: 'Notificar cliente — Aprovação Pendente', ativa: true,
    gatilho: 'Card movido para Aguardando Aprovação',
    acao: 'Enviar e-mail para o cliente',
    descricao: 'Quando um card entra em "Aguardando Aprovação", dispara e-mail automático para o cliente com o link de aprovação.',
    tipo: 'email', disparos: 47,
  },
  {
    id: 'auto-2', nome: 'WhatsApp — Arte Finalizada', ativa: true,
    gatilho: 'Card movido para Concluído',
    acao: 'Enviar mensagem no WhatsApp',
    descricao: '🚀 Arte finalizada e aprovada! Segue o link para download: [link_drive]',
    tipo: 'whatsapp', disparos: 31,
  },
  {
    id: 'auto-3', nome: 'Alerta de Ociosidade', ativa: false,
    gatilho: 'Card em andamento por mais de 3 dias sem atualização',
    acao: 'Notificar gestor (Slack/Discord)',
    descricao: 'Se um card ficar parado sem comentários por 3+ dias, o gestor recebe um alerta imediato.',
    tipo: 'alerta', disparos: 8,
  },
  {
    id: 'auto-4', nome: 'Receber nova demanda', ativa: true,
    gatilho: 'Nova demanda submetida pelo cliente',
    acao: 'Criar alerta no sistema',
    descricao: 'Quando um cliente envia uma demanda pelo portal, gera automaticamente um card na coluna "Caixa de Entrada".',
    tipo: 'sistema', disparos: 22,
  },
];

const TIPO_CONFIG = {
  email: { icon: <Mail size={14} />, color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
  whatsapp: { icon: <MessageSquare size={14} />, color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  alerta: { icon: <AlertTriangle size={14} />, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  sistema: { icon: <Bell size={14} />, color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
};

const NovaAutomacaoModal = ({ onSave, onCancel }) => {
  const [form, setForm] = useState({ nome: '', gatilho: GATILHOS[0], acao: ACOES[0], descricao: '' });
  const inputStyle = { width: '100%', padding: '11px 14px', fontSize: '14px', border: '1px solid var(--border-main)', borderRadius: '10px', backgroundColor: 'var(--bg-app)', color: 'var(--text-main)', outline: 'none', boxSizing: 'border-box', fontFamily: 'Inter, sans-serif' };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: '16px', padding: '32px', width: '520px', boxShadow: '0 24px 48px rgba(0,0,0,0.4)' }}>
        <h3 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Zap size={20} color="var(--primary)" /> Nova Automação
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Nome</label>
            <input value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} placeholder="Ex: Notificar cliente no WhatsApp" style={inputStyle} />
          </div>

          <div style={{ background: 'var(--bg-app)', border: '1px solid var(--border-light)', borderRadius: '12px', padding: '16px' }}>
            <p style={{ fontSize: '11px', fontWeight: '700', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '14px' }}>QUANDO → ENTÃO</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', width: '50px' }}>SE</span>
              <select value={form.gatilho} onChange={e => setForm(p => ({ ...p, gatilho: e.target.value }))} style={{ ...inputStyle, flex: 1 }}>
                {GATILHOS.map(g => <option key={g} style={{ background: '#121214' }}>{g}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--primary)', width: '50px' }}>ENTÃO</span>
              <select value={form.acao} onChange={e => setForm(p => ({ ...p, acao: e.target.value }))} style={{ ...inputStyle, flex: 1 }}>
                {ACOES.map(a => <option key={a} style={{ background: '#121214' }}>{a}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Mensagem / Descrição</label>
            <textarea value={form.descricao} onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))} placeholder="Descreva o que será feito..." rows={3} style={{ ...inputStyle, resize: 'none' }} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
          <button onClick={onCancel} className="btn-secondary" style={{ flex: 1, padding: '12px', borderRadius: '10px' }}>Cancelar</button>
          <button onClick={() => form.nome.trim() && onSave({ ...form, id: Date.now().toString(), ativa: true, disparos: 0, tipo: 'sistema' })} className="btn-primary" style={{ flex: 1, padding: '12px', borderRadius: '10px', opacity: form.nome.trim() ? 1 : 0.5 }}>
            <Zap size={14} /> Criar Automação
          </button>
        </div>
      </div>
    </div>
  );
};

const Automacoes = () => {
  const [automacoes, setAutomacoes] = useState(AUTOMACOES_INICIAIS);
  const [showModal, setShowModal] = useState(false);

  const toggleAtiva = (id) => setAutomacoes(prev => prev.map(a => a.id === id ? { ...a, ativa: !a.ativa } : a));
  const deletar = (id) => setAutomacoes(prev => prev.filter(a => a.id !== id));
  const salvar = (nova) => { setAutomacoes(prev => [...prev, nova]); setShowModal(false); };

  const totalDisparos = automacoes.reduce((sum, a) => sum + a.disparos, 0);
  const ativas = automacoes.filter(a => a.ativa).length;

  return (
    <div className="page-content" style={{ padding: '0 32px 32px', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '4px' }}>Motor de Automações</h2>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Regras que trabalham por você — sem intervenção manual.</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Plus size={16} /> Nova Automação
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
        {[
          { icon: <Zap size={18} />, label: 'Automações Ativas', value: ativas, color: '#10b981' },
          { icon: <GitBranch size={18} />, label: 'Total de Regras', value: automacoes.length, color: '#8b5cf6' },
          { icon: <Check size={18} />, label: 'Disparos no Mês', value: totalDisparos, color: '#3b82f6' },
        ].map((s, i) => (
          <div key={i} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: '12px', padding: '20px', display: 'flex', gap: '14px', alignItems: 'center' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: `${s.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: s.color }}>{s.icon}</div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{s.label}</div>
              <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-main)' }}>{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Lista de automações */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {automacoes.map(a => {
          const tipo = TIPO_CONFIG[a.tipo] || TIPO_CONFIG.sistema;
          return (
            <div key={a.id} style={{ background: 'var(--bg-surface)', border: `1px solid ${a.ativa ? 'var(--border-light)' : 'var(--border-light)'}`, borderRadius: '14px', padding: '20px 24px', display: 'flex', alignItems: 'flex-start', gap: '16px', opacity: a.ativa ? 1 : 0.55, transition: 'opacity 0.2s' }}>
              {/* Tipo icon */}
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: tipo.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: tipo.color, marginTop: '2px' }}>
                {tipo.icon}
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: '700', fontSize: '15px' }}>{a.nome}</span>
                  <span style={{ fontSize: '11px', fontWeight: '600', padding: '2px 10px', borderRadius: '20px', background: a.ativa ? 'rgba(16,185,129,0.1)' : 'var(--bg-app)', color: a.ativa ? '#10b981' : 'var(--text-muted)' }}>
                    {a.ativa ? '● Ativa' : '○ Inativa'}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', background: 'var(--bg-app)', padding: '2px 8px', borderRadius: '6px' }}>
                    {a.disparos} disparos
                  </span>
                </div>

                {/* Regra SE → ENTÃO */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', background: 'var(--bg-app)', padding: '4px 10px', borderRadius: '6px' }}>SE: {a.gatilho}</span>
                  <span style={{ fontSize: '14px', color: 'var(--primary)' }}>→</span>
                  <span style={{ fontSize: '11px', fontWeight: '700', color: tipo.color, background: tipo.bg, padding: '4px 10px', borderRadius: '6px' }}>ENTÃO: {a.acao}</span>
                </div>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{a.descricao}</p>
              </div>

              {/* Ações */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                <button onClick={() => toggleAtiva(a.id)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: a.ativa ? '#10b981' : 'var(--text-muted)', padding: '6px', borderRadius: '6px' }}>
                  {a.ativa ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
                </button>
                <button onClick={() => deletar(a.id)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '6px', borderRadius: '6px' }}>
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {showModal && <NovaAutomacaoModal onSave={salvar} onCancel={() => setShowModal(false)} />}
    </div>
  );
};

export default Automacoes;
