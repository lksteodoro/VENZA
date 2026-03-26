import React, { useState } from 'react';
import { X, Plus, Trash2, Copy } from 'lucide-react';
import { CLIENTS } from '../data/mockData';
import { v4 as uuidv4 } from 'uuid';
import './EditModal.css';

const EditModal = ({ card, onClose, onSave }) => {
  const [formData, setFormData] = useState({ ...card });

  const handleWabaChange = (wabaId, field, value) => {
    setFormData(prev => ({
      ...prev,
      wabas: prev.wabas.map(w => w.id === wabaId ? { ...w, [field]: value } : w)
    }));
  };

  const addWabaRule = () => {
    setFormData(prev => ({
      ...prev,
      wabas: [...prev.wabas, { id: uuidv4(), name: `WABA ${prev.wabas.length + 1}`, identity: '', numbers: [] }]
    }));
  };

  const removeWaba = (wabaId) => {
    setFormData(prev => ({
      ...prev,
      wabas: prev.wabas.filter(w => w.id !== wabaId)
    }));
  };

  const addNumberToWaba = (wabaId, newNumber) => {
    if (!newNumber.trim()) return;
    setFormData(prev => ({
      ...prev,
      wabas: prev.wabas.map(w => {
        if (w.id === wabaId) {
          return { ...w, numbers: [...w.numbers, newNumber.trim()] };
        }
        return w;
      })
    }));
  };

  const removeNumberFromWaba = (wabaId, numberToRemove) => {
    setFormData(prev => ({
      ...prev,
      wabas: prev.wabas.map(w => {
        if (w.id === wabaId) {
          return { ...w, numbers: w.numbers.filter(n => n !== numberToRemove) };
        }
        return w;
      })
    }));
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <div>
            <h2 className="modal-title">Editar Item</h2>
            <p className="modal-subtitle">Edite as informações e status do item de checklist</p>
          </div>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <label>Evento</label>
            <input 
              type="text" 
              className="input-field" 
              value={formData.title} 
              onChange={e => setFormData({...formData, title: e.target.value})} 
              placeholder="Nome do card (ex: Campanha Black Friday)"
            />
          </div>

          <div className="form-group">
            <label>Horário</label>
            <input 
              type="time" 
              className="input-field" 
              value={formData.time} 
              onChange={e => setFormData({...formData, time: e.target.value})} 
            />
          </div>

          <div className="form-group">
            <label>Cliente</label>
            <select 
              className="input-field custom-select" 
              value={formData.clientId}
              onChange={e => setFormData({...formData, clientId: e.target.value})}
            >
              <option value="">Selecione um cliente</option>
              {CLIENTS.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="wabas-section">
            <div className="wabas-header">
              <label>WABAs e Números</label>
              <button className="btn-secondary" onClick={addWabaRule}>
                <Plus size={16} /> Criar WABA
              </button>
            </div>
            
            <div className="wabas-list">
              {formData.wabas.map((waba, index) => (
                <div key={waba.id} className="waba-card">
                  <div className="waba-row-top">
                    <span className="waba-badge">WABA {index + 1}</span>
                    <span className="waba-count">({waba.numbers.length}/4 números)</span>
                    
                    <input 
                      type="text" 
                      className="input-field waba-identity" 
                      value={waba.identity} 
                      onChange={e => handleWabaChange(waba.id, 'identity', e.target.value)}
                      placeholder="GF I"
                    />
                    <input 
                      type="text" 
                      className="input-field waba-main-num" 
                      placeholder="Número principal"
                    />
                    
                    <button className="action-icon"><Copy size={16} /></button>
                    <button className="action-icon text-danger" onClick={() => removeWaba(waba.id)}><Trash2 size={16} /></button>
                  </div>
                  
                  <div className="waba-numbers-grid">
                    {waba.numbers.map((num, i) => (
                      <div key={i} className="number-chip">
                        <Copy size={12} className="text-muted" />
                        <span>{num}</span>
                        <button onClick={() => removeNumberFromWaba(waba.id, num)}><X size={14} /></button>
                      </div>
                    ))}
                    <div className="number-input-wrap">
                      <input 
                        type="text" 
                        placeholder="Digitar número" 
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            addNumberToWaba(waba.id, e.target.value);
                            e.target.value = '';
                          }
                        }}
                      />
                      <button className="add-btn"><Plus size={16} /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group flex-1">
              <label>Lista (Contatos)</label>
              <input 
                type="text" 
                className="input-field" 
                value={formData.contactsList} 
                onChange={e => setFormData({...formData, contactsList: e.target.value})} 
              />
            </div>
            <div className="form-group flex-1">
              <label>Tag</label>
              <input 
                type="text" 
                className="input-field" 
                value={formData.tag} 
                onChange={e => setFormData({...formData, tag: e.target.value})} 
              />
            </div>
          </div>

          <div className="form-group">
            <label>Link Completo</label>
            <input 
              type="text" 
              className="input-field" 
              value={formData.linkComplete} 
              onChange={e => setFormData({...formData, linkComplete: e.target.value})} 
            />
          </div>

          <div className="form-group">
            <label>Link Encurtado</label>
            <input 
              type="text" 
              className="input-field" 
              value={formData.linkShort} 
              onChange={e => setFormData({...formData, linkShort: e.target.value})} 
            />
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" onClick={() => onSave(formData)}>Salvar Alterações</button>
        </div>
      </div>
    </div>
  );
};

export default EditModal;
