import React, { useState } from 'react';
import { X, FileText, ExternalLink, PlayCircle, Zap } from 'lucide-react';
import { CLIENTS } from '../data/mockData';
import MetaAdCreator from './MetaAdCreator';
import GoogleAdCreator from './GoogleAdCreator';
import './EditModal.css';

const EditModal = ({ card, onClose, onSave }) => {
  const [formData, setFormData] = useState({ ...card });
  const [showMetaCreator, setShowMetaCreator] = useState(false);
  const [showGoogleCreator, setShowGoogleCreator] = useState(false);

  const isMeta   = formData.demandaPlataforma?.toLowerCase().includes('meta');
  const isGoogle = formData.demandaPlataforma?.toLowerCase().includes('google');
  const isTikTok = formData.demandaPlataforma?.toLowerCase().includes('tiktok');

  // After publishing: move card to Em Andamento and close
  const handlePublishComplete = () => {
    setShowMetaCreator(false);
    setShowGoogleCreator(false);
    onSave({ ...formData, columnId: 'andamento' });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <div>
            <h2 className="modal-title">Editar Card</h2>
            <p className="modal-subtitle">Atualize as informações e publique a campanha</p>
          </div>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">

          {/* Briefing do Cliente (portal-origin) */}
          {formData.fromPortal && (
            <div style={{
              background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.2)',
              borderRadius: '10px', padding: '16px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                <FileText size={14} color="var(--primary)" />
                <span style={{ color: 'var(--primary)', fontWeight: '700', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Briefing do Cliente
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Tipo: </span>
                  <span style={{ color: 'var(--text-main)' }}>{formData.demandaTipo}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Prioridade: </span>
                  <span style={{ color: formData.demandaPrioridade === 'urgente' ? '#ef4444' : formData.demandaPrioridade === 'alta' ? '#f59e0b' : 'var(--text-main)', fontWeight: '700' }}>
                    {formData.demandaPrioridade?.toUpperCase()}
                  </span>
                </div>
                {formData.demandaDescricao && (
                  <div>
                    <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Briefing: </span>
                    <p style={{ color: 'var(--text-main)', marginTop: '4px', lineHeight: '1.55', whiteSpace: 'pre-wrap', fontSize: '13px' }}>
                      {formData.demandaDescricao}
                    </p>
                  </div>
                )}
                {formData.demandaJustificativa && (
                  <div style={{ background: 'rgba(239,68,68,0.06)', borderRadius: '6px', padding: '8px 10px' }}>
                    <span style={{ color: '#ef4444', fontWeight: '600' }}>⚠ Urgência: </span>
                    <span style={{ color: '#ef4444' }}>{formData.demandaJustificativa}</span>
                  </div>
                )}
                {formData.demandaArquivo && (
                  <a href={formData.demandaArquivo} target="_blank" rel="noreferrer" style={{
                    color: 'var(--primary)', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '5px', textDecoration: 'none'
                  }}>
                    <ExternalLink size={13} /> Ver referência / Drive
                  </a>
                )}
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', paddingTop: '8px', borderTop: '1px solid rgba(139,92,246,0.15)' }}>
                  Recebido em {formData.demandaCriadoEm} · {formData.clientName}
                </div>
              </div>
            </div>
          )}

          {/* Título */}
          <div className="form-group">
            <label>Título / Evento</label>
            <input
              type="text" className="input-field"
              value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
              placeholder="Ex: Campanha Black Friday"
            />
          </div>

          <div className="form-group">
            <label>Horário</label>
            <input
              type="time" className="input-field"
              value={formData.time}
              onChange={e => setFormData({ ...formData, time: e.target.value })}
            />
          </div>

          {/* Cliente */}
          <div className="form-group">
            <label>Cliente</label>
            <select
              className="input-field custom-select"
              value={formData.clientId || ''}
              onChange={e => setFormData({ ...formData, clientId: e.target.value })}
            >
              <option value="">Selecione um cliente</option>
              {CLIENTS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {/* Plataforma + Objetivo */}
          <div className="form-row">
            <div className="form-group flex-1">
              <label>Plataforma</label>
              <select
                className="input-field custom-select"
                value={formData.demandaPlataforma || ''}
                onChange={e => setFormData({ ...formData, demandaPlataforma: e.target.value })}
              >
                <option value="">Selecione...</option>
                {['Meta Ads (Facebook/Instagram)', 'Google Ads', 'TikTok Ads', 'LinkedIn Ads', 'Outra'].map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="form-group flex-1">
              <label>Objetivo</label>
              <select
                className="input-field custom-select"
                value={formData.demandaObjetivo || ''}
                onChange={e => setFormData({ ...formData, demandaObjetivo: e.target.value })}
              >
                <option value="">Selecione...</option>
                {['Mensagens no WhatsApp', 'Leads (Formulário)', 'Vendas (E-commerce)', 'Engajamento/Seguidores', 'Branding/Alcance', 'Outro'].map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Orçamento + Público */}
          <div className="form-row">
            <div className="form-group flex-1">
              <label>Orçamento</label>
              <input
                type="text" className="input-field"
                value={formData.demandaOrcamento || ''}
                onChange={e => setFormData({ ...formData, demandaOrcamento: e.target.value })}
                placeholder="Ex: R$ 50/dia"
              />
            </div>
            <div className="form-group flex-1">
              <label>Público-Alvo / Região</label>
              <input
                type="text" className="input-field"
                value={formData.demandaPublico || ''}
                onChange={e => setFormData({ ...formData, demandaPublico: e.target.value })}
                placeholder="Ex: Brasil 25–54a"
              />
            </div>
          </div>

          {/* Link */}
          <div className="form-group">
            <label>URL de Destino / Drive</label>
            <input
              type="text" className="input-field"
              value={formData.linkComplete || ''}
              onChange={e => setFormData({ ...formData, linkComplete: e.target.value })}
              placeholder="https://..."
            />
          </div>
        </div>

        {/* Botões de Publicação */}
        {(isMeta || isGoogle || isTikTok) && (
          <div style={{ padding: '0 24px', marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Publicar Campanha
            </div>

            {isMeta && (
              <button
                onClick={() => setShowMetaCreator(true)}
                style={{
                  width: '100%', padding: '13px', borderRadius: '10px',
                  background: 'linear-gradient(135deg, #1877F2, #0056d6)', color: 'white',
                  border: 'none', fontWeight: '700', fontSize: '14px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  boxShadow: '0 4px 14px rgba(24,119,242,0.3)',
                }}
              >
                <PlayCircle size={17} /> Publicar via Meta Ads API
              </button>
            )}

            {isGoogle && (
              <button
                onClick={() => setShowGoogleCreator(true)}
                style={{
                  width: '100%', padding: '13px', borderRadius: '10px',
                  background: 'linear-gradient(135deg, #34a853, #0f9d58)', color: 'white',
                  border: 'none', fontWeight: '700', fontSize: '14px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  boxShadow: '0 4px 14px rgba(52,168,83,0.3)',
                }}
              >
                <Zap size={17} /> Publicar via Google Ads API
              </button>
            )}

            {isTikTok && (
              <div style={{ padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--border-light)', background: 'var(--bg-app)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '20px' }}>🎵</span>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-main)' }}>TikTok Ads</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Integração em breve — publique manualmente no TikTok Ads Manager.</div>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" onClick={() => onSave(formData)}>Salvar Alterações</button>
        </div>
      </div>

      {showMetaCreator && (
        <MetaAdCreator
          card={formData}
          onClose={() => setShowMetaCreator(false)}
          onComplete={handlePublishComplete}
        />
      )}

      {showGoogleCreator && (
        <GoogleAdCreator
          card={formData}
          onClose={() => setShowGoogleCreator(false)}
          onComplete={handlePublishComplete}
        />
      )}
    </div>
  );
};

export default EditModal;
