import React from 'react';
import { FileText, Terminal, MessageSquare, Plus, Zap, Search } from 'lucide-react';

const Card = ({ title, icon: Icon, children }) => (
  <div className="bg-sidebar-bg/50 backdrop-blur-md border border-border-subtle rounded-2xl p-5 flex flex-col gap-3 shadow-lg hover:border-accent/30 transition-all">
    <div className="flex items-center gap-2 text-txt-secondary">
      <Icon size={16} className="text-accent" />
      <span className="text-xs font-semibold uppercase tracking-wider">{title}</span>
    </div>
    <div className="flex-1 flex flex-col gap-2">{children}</div>
  </div>
);

const WelcomeDashboard = ({ onSend, startNewConversation, conversations, onSelect }) => {
  const quickActions = [
    { label: 'Analyser Projet', icon: <Search size={14} />, prompt: 'Analyse la structure de ce projet et fais-moi un résumé architectural.' },
    { label: 'Nouveau Script', icon: <Zap size={14} />, prompt: 'Crée un nouveau script de base.' },
    { label: 'Debug', icon: <Terminal size={14} />, prompt: 'Aide-moi à déboguer le dernier problème rencontré.' }
  ];

  return (
    <div className="h-full flex flex-col items-center justify-center p-8 gap-10 animate-[heroReveal_0.5s_ease_both]">
      <h1 className="text-4xl font-display text-txt-primary">Bonjour, ARIA. Que souhaitez-vous faire ?</h1>

      {/* Quick Actions */}
      <div className="flex gap-3">
        {quickActions.map((action) => (
          <button
            key={action.label}
            onClick={() => onSend(action.prompt)}
            className="flex items-center gap-2 px-4 py-2 bg-input-bg hover:bg-item-hover border border-border-input rounded-xl text-sm text-txt-primary transition-all"
          >
            {action.icon}
            {action.label}
          </button>
        ))}
      </div>

      {/* Dashboard Grid */}
      <div className="grid grid-cols-3 gap-6 w-full max-w-4xl">
        <Card title="Contexte Projet" icon={FileText}>
          <p className="text-xs text-txt-secondary italic">Aucun fichier indexé.</p>
        </Card>
        
        <Card title="Outils Système" icon={Terminal}>
          <button onClick={() => onSend('Ouvre l\'explorateur de fichiers')} className="text-sm text-txt-primary hover:text-accent text-left">Explorer répertoires</button>
          <button onClick={() => onSend('Exécute une commande')} className="text-sm text-txt-primary hover:text-accent text-left">Exécuter commande</button>
        </Card>
        
        <Card title="Récents" icon={MessageSquare}>
          {conversations.slice(0, 3).map(conv => (
            <button key={conv.id} onClick={() => onSelect(conv)} className="text-sm text-txt-primary hover:text-accent text-left truncate">
              {conv.title}
            </button>
          ))}
        </Card>
      </div>
    </div>
  );
};

export default WelcomeDashboard;
