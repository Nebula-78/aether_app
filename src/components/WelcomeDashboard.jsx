import React, { useState } from 'react';
import { Image as ImageIcon, PenLine, Globe } from 'lucide-react';
import HeroInputZone from './HeroInputZone';

const WelcomeDashboard = ({ onSend, startNewConversation, conversations, onSelect, userProfile, streaming, disabled, activePersona, onPersonaChange }) => {
  const userName = userProfile?.profile?.name || 'ARIA';

  return (
    <div className="h-full flex flex-col items-center justify-center p-8 gap-8 animate-[heroReveal_0.5s_ease_both] w-full max-w-3xl mx-auto">
      <h1 className="text-2xl md:text-3xl font-display text-txt-primary">Bonjour {userName}. On commence ?</h1>

      {/* Barre de recherche centrale */}
      <div className="w-full">
        <HeroInputZone 
          onSend={onSend}
          streaming={streaming}
          disabled={disabled}
          activePersona={activePersona}
          onPersonaChange={onPersonaChange}
        />
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 mt-2 flex-wrap justify-center">
        <button
          onClick={() => onSend('Je souhaite créer une image', { formatMode: 'prose' })}
          className="flex items-center gap-2 px-4 py-2 bg-transparent hover:bg-item-hover border border-border-subtle rounded-full text-sm text-txt-primary transition-all"
        >
          <ImageIcon size={16} />
          Créer une image
        </button>
        <button
          onClick={() => onSend('Aide-moi à rédiger ou modifier un texte', { formatMode: 'prose' })}
          className="flex items-center gap-2 px-4 py-2 bg-transparent hover:bg-item-hover border border-border-subtle rounded-full text-sm text-txt-primary transition-all"
        >
          <PenLine size={16} />
          Rédiger ou modifier
        </button>
        <button
          onClick={() => onSend('Recherche web activée : ', { useSearch: true })}
          className="flex items-center gap-2 px-4 py-2 bg-transparent hover:bg-item-hover border border-border-subtle rounded-full text-sm text-txt-primary transition-all"
        >
          <Globe size={16} />
          Faire une recherche
        </button>
      </div>
    </div>
  );
};

export default WelcomeDashboard;
