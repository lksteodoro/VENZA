import { GripVertical, Trash2, Clock, FolderOpen, Pencil, AlertTriangle, MessageSquare, CalendarClock } from 'lucide-react';
import { CLIENTS } from '../data/mockData';
import { calcBusinessHours } from '../utils/businessHours';

const formatAge = (createdAt) => {
  if (!createdAt) return null;
  const diff = Date.now() - new Date(createdAt).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins  < 60)  return `${mins}min`;
  if (hours < 24)  return `${hours}h`;
  if (days  < 7)   return `${days}d`;
  const weeks = Math.floor(days / 7);
  return `${weeks}sem`;
};

const PRIORITY_STYLES = {
  urgente: { color: '#ef4444', bg: 'rgba(239,68,68,0.1)', label: '⚡ Urgente' },
  alta:    { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', label: '↑ Alta' },
};

const TaskCard = ({ card, onEdit, onDelete }) => {
  const client = CLIENTS.find(c => c.id === card.clientId);

  const checklist      = Array.isArray(card.checklist) ? card.checklist : [];
  const completedCount = checklist.filter(item => item.completed).length;
  const totalCount     = checklist.length;
  const progressPercent = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);

  const isFromProject = !!card.fromProject;
  const clientLabel   = card.clientName || client?.name || '';
  const projectLabel  = card.projectName || card.tag || '';
  const platformLabel = isFromProject ? null : (card.demandaPlataforma || null);
  const priority      = PRIORITY_STYLES[card.priority];
  const age           = formatAge(card.createdAt);
  const isOld         = card.createdAt && (Date.now() - new Date(card.createdAt).getTime()) > 3 * 86_400_000; // +3 dias

  const stalledHours = (card.columnId === 'pendente' && card.pendenteSince)
    ? calcBusinessHours(card.pendenteSince)
    : 0;
  const isStalled = stalledHours >= 3;

  const hasFooter = totalCount > 0;

  return (
    <div className="task-card" data-priority={card.priority || 'normal'} onClick={onEdit}>

      {/* ── Header: drag + avatar + client + time + actions ── */}
      <div className="tc-header">
        <div className="tc-client-row">
          <span className="tc-drag" onClick={e => e.stopPropagation()}>
            <GripVertical size={13} />
          </span>
          {client?.avatarUrl ? (
            <img src={client.avatarUrl} alt={clientLabel} className="tc-avatar" />
          ) : (
            <div className="tc-avatar tc-avatar-fallback">
              {(clientLabel || card.title || '?')[0].toUpperCase()}
            </div>
          )}
          <span className="tc-client-name">{clientLabel || '—'}</span>
        </div>

        <div className="tc-header-right">
          {age && (
            <span className={`tc-age ${isOld ? 'tc-age--old' : ''}`} title="Tempo desde a criação">
              <CalendarClock size={10} />{age}
            </span>
          )}
          {card.time && (
            <span className="tc-time"><Clock size={10} />{card.time}</span>
          )}
          <div className="tc-actions" onClick={e => e.stopPropagation()}>
            <button className="tc-btn" title="Editar" onClick={onEdit}>
              <Pencil size={12} />
            </button>
            <button
              className="tc-btn tc-btn-danger"
              title="Excluir"
              onClick={() => {
                if (window.confirm(`Excluir "${card.title}"?`)) onDelete(card.id);
              }}
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Alerta de atividade parada ── */}
      {isStalled && (
        <div className="tc-stalled">
          <AlertTriangle size={11} />
          Parada há {stalledHours >= 1 ? `${Math.floor(stalledHours)}h` : '<1h'} comerciais
        </div>
      )}

      {/* ── Title ── */}
      <div className="tc-title">{card.title}</div>

      {/* ── Comentário ── */}
      {card.comentario && (
        <div className="tc-comment">
          <MessageSquare size={9} />
          {card.comentario}
        </div>
      )}

      {/* ── Project tag ── */}
      {projectLabel && (
        <div className="tc-project">
          <FolderOpen size={10} />
          {projectLabel}
        </div>
      )}

      {/* ── Badges ── */}
      {(platformLabel || priority) && (
        <div className="tc-badges">
          {platformLabel && (
            <span className="tc-badge tc-badge-platform">{platformLabel}</span>
          )}
          {priority && (
            <span className="tc-badge" style={{ color: priority.color, background: priority.bg, borderColor: `${priority.color}25` }}>
              {priority.label}
            </span>
          )}
        </div>
      )}

      {/* ── Footer: checklist progress ── */}
      {hasFooter && (
        <div className="tc-footer">
          <div className="tc-progress-wrap">
            <div className="tc-progress-meta">
              <span>Checklist</span>
              <span className="tc-progress-pct">
                {completedCount}/{totalCount}
                <span className="tc-progress-frac"> · {progressPercent}%</span>
              </span>
            </div>
            <div className="tc-progress-bar">
              <div
                className="tc-progress-fill"
                style={{ width: `${progressPercent}%` }}
                data-complete={progressPercent === 100 ? 'true' : undefined}
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default TaskCard;
