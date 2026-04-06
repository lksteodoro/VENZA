import { BOARD_COLUMNS } from '../data/mockData';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import TaskCard from './TaskCard';
import './Kanban.css';
import { fireAutomation } from '../utils/automations';
import { logCardCompleted } from '../utils/weeklySummary';

const KanbanBoard = ({ cards, setCards, onEditCard, onDeleteCard }) => {
  const onDragEnd = (result) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    // Busca no array GLOBAL de cards (não filtrado)
    // setCards recebe o setter do App, então precisa trabalhar com todos os cards
    setCards(prev => {
      const newCards = Array.from(prev);
      const cardIndex = newCards.findIndex((c) => c.id === draggableId);
      if (cardIndex === -1) return prev;

      const [movedCard] = newCards.splice(cardIndex, 1);

      // Rastreia tempo na coluna Pendente
      if (destination.droppableId === 'pendente' && source.droppableId !== 'pendente') {
        movedCard.pendenteSince = new Date().toISOString();
        movedCard.stalledAlertFiredAt = null;
      } else if (source.droppableId === 'pendente' && destination.droppableId !== 'pendente') {
        movedCard.pendenteSince = null;
        movedCard.stalledAlertFiredAt = null;
      }

      movedCard.columnId = destination.droppableId;

      // Reinsere na posição correta dentro da lista completa
      // Calcula o índice real baseado nos cards da coluna destino
      const destColumnCards = newCards.filter(c => c.columnId === destination.droppableId);
      const refCard = destColumnCards[destination.index];
      const insertAt = refCard ? newCards.indexOf(refCard) : newCards.length;
      newCards.splice(insertAt, 0, movedCard);

      // Dispara automação se a coluna mudou
      if (destination.droppableId !== source.droppableId) {
        const col = BOARD_COLUMNS.find(c => c.id === destination.droppableId);
        fireAutomation(destination.droppableId, {
          clientId:    movedCard.clientId,
          cardName:    movedCard.title || movedCard.name || '',
          columnName:  col?.title || destination.droppableId,
          projectName: movedCard.projectName || movedCard.tag || '',
          comentario:  movedCard.comentario || '',
        });

        if (destination.droppableId === 'concluido') {
          logCardCompleted({
            clientId:    movedCard.clientId,
            clientName:  movedCard.clientName || '',
            title:       movedCard.title || movedCard.name || '',
            projectName: movedCard.projectName || movedCard.tag || '',
          });
        }
      }

      return newCards;
    });
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="kanban-board">
        {BOARD_COLUMNS.map((col) => {
          const columnCards = cards
            .filter((c) => c.columnId === col.id)
            .sort((a, b) => {
              const ta = a.createdAt ? new Date(a.createdAt).getTime() : Infinity;
              const tb = b.createdAt ? new Date(b.createdAt).getTime() : Infinity;
              return ta - tb; // mais antigas no topo
            });

          return (
            <div key={col.id} className="kanban-column-wrapper" data-column-id={col.id}>
              <div className="kanban-column-header">
                <div className="kanban-column-header-left">
                  <span className="kanban-column-dot" />
                  <h3 className="kanban-column-title">{col.title}</h3>
                </div>
                <span className="kanban-column-count">{columnCards.length}</span>
              </div>

              <Droppable droppableId={col.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`kanban-column-content ${snapshot.isDraggingOver ? 'dragging-over' : ''}`}
                  >
                    {columnCards.map((card, index) => (
                      <Draggable key={card.id} draggableId={card.id} index={index}>
                        {(provided) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            style={{ ...provided.draggableProps.style }}
                          >
                            <TaskCard
                              card={card}
                              onEdit={() => onEditCard(card)}
                              onDelete={onDeleteCard}
                            />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                    {columnCards.length === 0 && (
                      <div className="kanban-empty-state">Nenhum item</div>
                    )}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
};

export default KanbanBoard;
