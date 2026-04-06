import React, { useState } from 'react';
import { X, FileText, ExternalLink, PlayCircle, Zap, MessageSquare, User, Settings2, Send } from 'lucide-react';
import { CLIENTS } from '../data/mockData';
import MetaAdCreator from './MetaAdCreator';
import GoogleAdCreator from './GoogleAdCreator';
import './EditModal.css';

const SectionLabel = ({ icon: Icon, label }) => (
  <div className="em-section-label">
    <Icon size={13} />
    <span>{label}</span>
  </div>
);

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
            <div className="em-briefing">
              <div className="em-briefing-header">
                <FileText size={14} color="var(--primary)" />
                <span>Briefing do Cliente</span>
              </div>
              <div className="em-briefing-body">
                <div className="em-briefing-row">
                  <span className="em-briefing-label">Tipo:</span>
                  <span>{formData.demandaTipo}</span>
                </div>
                <div className="em-briefing-row">
                  <span className="em-briefing-label">Prioridade:</span>
                  <span style={{ color: formData.demandaPrioridade === 'urgente' ? '#ef4444' : formData.demandaPrioridade === 'alta' ? '#f59e0b' : 'var(--text-main)', fontWeight: '700' }}>
                    {formData.demandaPrioridade?.toUpperCase()}
                  </span>
                </div>
                {formData.demandaDescricao && (
                  <div>
                    <span className="em-briefing-label">Briefing:</span>
                    <p className="em-briefing-desc">{formData.demandaDescricao}</p>
                  </div>
                )}
                {formData.demandaJustificativa && (
                  <div className="em-briefing-urgency">
                    <span>⚠ Urgência: </span>
                    <span>{formData.demandaJustificativa}</span>
                  </div>
                )}
                {formData.demandaArquivo && (
                  <a href={formData.demandaArquivo} target="_blank" rel="noreferrer" className="em-briefing-link">
                    <ExternalLink size={13} /> Ver referência / Drive
                  </a>
                )}
                <div className="em-briefing-footer">
                  Recebido em {formData.demandaCriadoEm} · {formData.clientName}
                </div>
              </div>
            </div>
          )}

          {/* ── Seção: Identificação ── */}
          <SectionLabel icon={User} label="Identificação" />

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

          <div className="form-row">
            <div className="form-group flex-1">
              <label>Horário</label>
              <input
                type="time" className="input-field"
                value={formData.time}
                onChange={e => setFormData({ ...formData, time: e.target.value })}
              />
            </div>
            {/* Cliente */}
            <div className="form-group flex-2">
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
          </div>

          {/* ── Seção: Campanha ── */}
          <SectionLabel icon={Settings2} label="Campanha" />

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

          {/* ── Seção: Comentário / Observação ── */}
          <SectionLabel icon={MessageSquare} label="Comentário / Observação" />
          <div className="form-group">
            <label>
              Observação interna
              <span className="em-label-hint">Enviado junto na automação do WhatsApp ao mover o card</span>
            </label>
            <textarea
              className="input-field em-textarea"
              rows={3}
              value={formData.comentario || ''}
              onChange={e => setFormData({ ...formData, comentario: e.target.value })}
              placeholder="Ex: Aprovado pelo cliente. Aguardando arte final..."
            />
            {formData.comentario && (
              <div className="em-comment-preview">
                <Send size={11} />
                <span>Este comentário será incluído na mensagem de automação do WhatsApp</span>
              </div>
            )}
          </div>

        </div>

        {/* Botões de Publicação */}
        {(isMeta || isGoogle || isTikTok) && (
          <div className="em-publish-section">
            <div className="em-section-label" style={{ marginBottom: '10px' }}>
              <Settings2 size={13} />
              <span>Publicar Campanha</span>
            </div>

            {isMeta && (
              <button
                onClick={() => setShowMetaCreator(true)}
                className="em-publish-btn em-publish-meta"
              >
                <PlayCircle size={17} /> Publicar via Meta Ads API
              </button>
            )}

            {isGoogle && (
              <button
                onClick={() => setShowGoogleCreator(true)}
                className="em-publish-btn em-publish-google"
              >
                <Zap size={17} /> Publicar via Google Ads API
              </button>
            )}

            {isTikTok && (
              <div className="em-publish-tiktok">
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
