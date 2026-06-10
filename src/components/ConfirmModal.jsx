import React from 'react';
import { AlertTriangle, Terminal, FileEdit, Check } from 'lucide-react';

const ConfirmModal = ({ data, onConfirm }) => {
  const isCommand = data.name === 'run_command';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-[fadeSlideIn_0.15s_ease_both]">
      <div className="w-full max-w-md bg-sidebar-bg border border-border-subtle rounded-2xl shadow-2xl p-6 flex flex-col gap-6">
        
        {/* Header */}
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center text-accent shrink-0">
            {isCommand ? <Terminal size={22} /> : <FileEdit size={22} />}
          </div>
          <div>
            <h2 className="text-base font-semibold text-txt-primary">
              {isCommand ? "Confirmation de commande" : "Écraser le fichier ?"}
            </h2>
            <p className="text-xs text-txt-secondary mt-1">
              {isCommand 
                ? "L'IA souhaite exécuter une commande système sur votre ordinateur."
                : `Le fichier "${data.path}" existe déjà. Voulez-vous l'écraser ?`}
            </p>
          </div>
        </div>

        {/* Content Details */}
        <div className="bg-input-bg border border-border-input rounded-xl p-4 font-mono text-xs text-txt-primary select-text overflow-x-auto max-h-40 whitespace-pre-wrap">
          {isCommand ? (
            <div className="flex gap-2">
              <span className="text-accent shrink-0">$</span>
              <span>{data.command}</span>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              <span className="text-txt-secondary font-sans text-[10px] uppercase font-bold tracking-wider">Chemin cible :</span>
              <span>{data.path}</span>
            </div>
          )}
        </div>

        {/* Warnings / Disclaimers */}
        <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 rounded-lg text-xs leading-normal">
          <AlertTriangle size={16} className="shrink-0" />
          <span>
            {isCommand 
              ? "Exécutez uniquement des commandes de confiance. Cela peut altérer vos fichiers."
              : "Cette action remplacera définitivement le fichier actuel."}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={() => onConfirm(false)}
            className="px-4 py-2 border border-border-input rounded-lg text-xs font-medium text-txt-secondary hover:bg-item-hover hover:text-txt-primary cursor-pointer transition-colors"
          >
            Refuser
          </button>
          <button
            onClick={() => onConfirm(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg text-xs font-medium cursor-pointer transition-colors shadow-lg shadow-accent/20"
          >
            <Check size={14} />
            <span>Autoriser</span>
          </button>
        </div>

      </div>
    </div>
  );
};

export default ConfirmModal;
