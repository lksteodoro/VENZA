import React from 'react';
import { Play, Pause, Trash2, LineChart } from 'lucide-react';
import { CAMPAIGNS } from '../data/mockData';
import './AdsManagerTable.css';

const AdsManagerTable = ({ accountId }) => {
  const campaigns = accountId ? CAMPAIGNS.filter(c => c.accountId === accountId) : CAMPAIGNS;

  return (
    <div className="ads-table-container">
      <table className="ads-table">
        <thead>
          <tr>
            <th className="checkbox-cell"><input type="checkbox" /></th>
            <th>Veiculação</th>
            <th>Nome da Campanha</th>
            <th className="num-cell">Orçamento</th>
            <th className="num-cell">Valor Gasto</th>
            <th className="num-cell">Resultados</th>
            <th className="num-cell">Custo por Res. (CPA)</th>
            <th className="num-cell">ROAS</th>
            <th className="num-cell">CTR</th>
            <th className="action-cell">Ações</th>
          </tr>
        </thead>
        <tbody>
          {campaigns.length === 0 ? (
            <tr>
              <td colSpan="10" className="empty-state">Nenhuma campanha encontrada.</td>
            </tr>
          ) : (
            campaigns.map(camp => (
              <tr key={camp.id} className={camp.status === 'paused' ? 'paused-row' : ''}>
                <td className="checkbox-cell"><input type="checkbox" /></td>
                <td>
                  <div className="status-toggle">
                    <div className={`status-dot ${camp.status}`} />
                    <span className="status-text">{camp.status === 'active' ? 'Ativo' : 'Pausado'}</span>
                  </div>
                </td>
                <td className="camp-name">
                  <span className="text-truncate">{camp.name}</span>
                </td>
                <td className="num-cell text-muted">R$ {camp.budget.toFixed(2)}</td>
                <td className="num-cell font-medium">R$ {camp.spend.toFixed(2)}</td>
                <td className="num-cell font-medium text-primary">{camp.conversions}</td>
                <td className="num-cell font-medium">R$ {camp.cpa.toFixed(2)}</td>
                <td className="num-cell font-medium">
                  <span className={`roas-badge ${camp.roas >= 3 ? 'good' : camp.roas > 0 ? 'warning' : 'bad'}`}>
                    {camp.roas.toFixed(2)}x
                  </span>
                </td>
                <td className="num-cell">{camp.ctr.toFixed(2)}%</td>
                <td className="action-cell">
                  <button className="icon-btn" title="Ver Gráficos"><LineChart size={16} /></button>
                  <button className="icon-btn text-danger" title="Apagar"><Trash2 size={16} /></button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default AdsManagerTable;
