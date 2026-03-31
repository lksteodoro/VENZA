import React from 'react';
import { BOARD_COLUMNS } from '../data/mockData';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import TaskCard from './TaskCard';
import './Kanban.css';
import { fireAutomation } from '../utils/automations';

const KanbanBoard = ({ cards, setCards, updateCard, onEditCard }) => {
  const onDragEnd = (result) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const newCards = Array.from(cards);
    const cardIndex = newCards.findIndex((c) => c.id === draggableId);
    if (cardIndex === -1) return;

    const [movedCard] = newCards.splice(cardIndex, 1);

    // Change column
    movedCard.columnId = destination.droppableId;

    // Insert at new position
    newCards.splice(destination.index, 0, movedCard);

    setCards(newCards);

    // Dispara automação se a coluna mudou
    if (destination.droppableId !== source.droppableId) {
      const col = BOARD_COLUMNS.find(c => c.id === destination.droppableId);
      fireAutomation(destination.droppableId, {
        clientId:   movedCard.clientId,
        cardName:   movedCard.title || movedCard.name || '',
        columnName: col?.title || destination.droppableId,
      });
    }
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="kanban-board">
        {BOARD_COLUMNS.map((col) => {
          const columnCards = cards.filter((c) => c.columnId === col.id);
          
          return (
            <div key={col.id} className="kanban-column-wrapper">
              <div className="kanban-column-header">
                <h3 className="kanban-column-title">{col.title}</h3>
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
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            style={{
                              ...provided.draggableProps.style,
                              marginBottom: '16px'
                            }}
                          >
                            <TaskCard 
                              card={card} 
                              onEdit={() => onEditCard(card)} 
                              onToggleCheck={(checkId) => {
                                const newCard = { ...card };
                                newCard.checklist = newCard.checklist.map(chk => 
                                  chk.id === checkId ? { ...chk, completed: !chk.completed } : chk
                                );
                                updateCard(newCard);
                              }}
                            />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                    {columnCards.length === 0 && (
                      <div className="kanban-empty-state">
                        Nenhum item
                      </div>
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
