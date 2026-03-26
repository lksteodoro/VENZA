import React, { useState } from 'react';
import KanbanBoard from '../components/KanbanBoard';
import EditModal from '../components/EditModal';
import { MOCK_CARDS } from '../data/mockData';

const KanbanView = () => {
  const [cards, setCards] = useState(MOCK_CARDS);
  const [editingCard, setEditingCard] = useState(null);

  const updateCard = (updatedCard) => {
    setCards(cards.map(c => c.id === updatedCard.id ? updatedCard : c));
  };

  return (
    <>
      <div className="board-container">
        <KanbanBoard 
          cards={cards} 
          setCards={setCards} 
          updateCard={updateCard} 
          onEditCard={(card) => setEditingCard(card)} 
        />
      </div>
      
      {editingCard && (
        <EditModal 
          card={editingCard} 
          onClose={() => setEditingCard(null)} 
          onSave={(updatedCard) => {
            updateCard(updatedCard);
            setEditingCard(null);
          }} 
        />
      )}
    </>
  );
};

export default KanbanView;
