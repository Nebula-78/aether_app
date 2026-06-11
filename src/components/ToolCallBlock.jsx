import React, { useState } from 'react';
import { 
  Terminal, 
  FileText, 
  FolderOpen, 
  Copy, 
  Clipboard, 
  Camera, 
  Cpu, 
  ChevronDown, 
  ChevronUp, 
  Loader2, 
  CheckCircle2, 
  XCircle,
  Eye,
  ExternalLink,
  Search
} from 'lucide-react';

const getToolIcon = (name) => {
  switch (name) {
    case 'tavily_search':
    case 'google_search':
      return <Search size={16} />;
    case 'run_command':
//... rest of the function ...

    case 'read_file':
    case 'write_file':
    case 'open_file':
      return <FileText size={16} />;
    case 'list_directory':
      return <FolderOpen size={16} />;
    case 'copy_to_clipboard':
    case 'read_clipboard':
      return <Clipboard size={16} />;
    case 'take_screenshot':
      return <Camera size={16} />;
    case 'get_system_info':
      return <Cpu size={16} />;
    default:
      return <Terminal size={16} />;
  }
};

const getToolTitle = (name) => {
  switch (name) {
    case 'tavily_search':
      return "Recherche intelligente (Tavily)";
    case 'google_search':
      return "Recherche Web";
    case 'run_command':
      return "Exécution de commande";
    case 'read_file':
      return "Lecture de fichier";
    case 'write_file':
      return "Écriture de fichier";
    case 'list_directory':
      return "Exploration de dossier";
    case 'open_file':
      return "Ouverture de fichier";
    case 'open_url':
      return "Ouverture d'URL";
    case 'copy_to_clipboard':
      return "Copie dans le presse-papier";
    case 'read_clipboard':
      return "Lecture du presse-papier";
    case 'take_screenshot':
      return "Capture d'écran";
    case 'get_system_info':
      return "Informations système";
    default:
      return name;
  }
};

const ToolCallBlock = ({ name, args, status, result, index }) => {
  const [isOpen, setIsOpen] = useState(false);
  const title = getToolTitle(name);
  const icon = getToolIcon(name);

  let formattedArgs = '';
  try {
    formattedArgs = typeof args === 'string' ? args : JSON.stringify(args, null, 2);
  } catch {}

  let isError = status === 'error' || (result && result.error);
  let isRunning = status === 'running';
  let isSuccess = status === 'success' || (result && !result.error);

  return (
    <div 
      id={`tool-call-${index}`}
      className="w-full mb-4 border border-border-subtle bg-sidebar-bg/50 rounded-xl overflow-hidden animate-[fadeSlideIn_0.2s_ease_both] group"
    >
      {index && (
        <div className="flex items-center gap-2 mt-2 ml-4 mb-[-8px]">
          <div className="w-1 h-1 rounded-full bg-accent/40" />
          <span className="text-[9px] font-bold text-accent uppercase tracking-widest opacity-60 group-hover:opacity-100 transition-opacity">Source [^{index}]</span>
        </div>
      )}
      {/* Header */}
      <div 
        onClick={() => setIsOpen(prev => !prev)}
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-item-hover transition-colors select-none"
      >
        <div className="flex items-center gap-3">
          <div className={`p-1.5 rounded-lg ${
            isRunning ? 'bg-blue-500/10 text-blue-500' :
            isError ? 'bg-accent/10 text-accent' :
            'bg-green-500/10 text-green-500'
          }`}>
            {isRunning ? <Loader2 size={16} className="animate-spin" /> : icon}
          </div>
          <div>
            <div className="text-[12px] font-semibold text-txt-primary">{title}</div>
            <div className="text-[10px] text-txt-secondary font-mono truncate max-w-[280px]">
              {typeof args === 'object' ? (args.command || args.path || args.url || '') : formattedArgs}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Status Badge */}
          <div className="flex items-center gap-1">
            {isRunning && (
              <span className="text-[10px] text-blue-400 font-medium">Exécution...</span>
            )}
            {isSuccess && !isRunning && (
              <>
                <CheckCircle2 size={14} className="text-green-500" />
                <span className="text-[10px] text-green-500 font-medium">Succès</span>
              </>
            )}
            {isError && !isRunning && (
              <>
                <XCircle size={14} className="text-accent" />
                <span className="text-[10px] text-accent font-medium font-semibold">Échec</span>
              </>
            )}
          </div>
          {isOpen ? <ChevronUp size={16} className="text-txt-secondary" /> : <ChevronDown size={16} className="text-txt-secondary" />}
        </div>
      </div>

      {/* Details (Collapsible) */}
      {isOpen && (
        <div className="border-t border-border-subtle bg-input-bg/30 px-4 py-3 flex flex-col gap-3 font-mono text-[11px] text-txt-primary select-text">
          {/* Arguments */}
          {formattedArgs && (
            <div className="flex flex-col gap-1">
              <span className="text-[9px] font-sans font-bold text-txt-secondary uppercase tracking-wider">Arguments :</span>
              <pre className="bg-input-bg border border-border-input rounded-lg p-2.5 overflow-x-auto whitespace-pre-wrap max-h-36">{formattedArgs}</pre>
            </div>
          )}

          {/* Result / Output */}
          {result && (
            <div className="flex flex-col gap-1">
              <span className="text-[9px] font-sans font-bold text-txt-secondary uppercase tracking-wider">Sortie :</span>
              {(name === 'tavily_search' || name === 'google_search') && result.results ? (
                <div className="flex flex-col gap-3 mt-1">
                  {result.answer && (
                    <div className="bg-accent/5 border border-accent/20 rounded-lg p-3 text-xs leading-relaxed italic text-txt-primary">
                      {result.answer}
                    </div>
                  )}
                  <div className="space-y-2">
                    {result.results.map((r, i) => (
                      <div key={i} className="bg-sidebar-bg border border-border-subtle rounded-lg p-3 hover:border-accent/30 transition-all group/item">
                        <div className="flex items-start justify-between gap-3 mb-1">
                          <a 
                            href={r.url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-[12px] font-bold text-accent hover:underline flex items-center gap-1.5"
                          >
                            {r.title}
                            <ExternalLink size={10} className="opacity-0 group-hover/item:opacity-100 transition-opacity" />
                          </a>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-[9px] font-mono text-txt-secondary uppercase tracking-tighter bg-item-hover px-1.5 py-0.5 rounded">
                              Score: {Math.round(r.score * 100)}%
                            </span>
                          </div>
                        </div>
                        <p className="text-[11px] text-txt-secondary line-clamp-2 leading-normal">
                          {r.content}
                        </p>
                        <div className="mt-2 text-[9px] text-txt-muted truncate opacity-60">
                          {r.url}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <pre className={`border rounded-lg p-2.5 overflow-x-auto whitespace-pre max-h-52 ${
                  result.error ? 'bg-accent/5 border-accent/20 text-accent' : 'bg-input-bg border-border-input text-txt-primary'
                }`}>
                  {typeof result === 'string' ? result : JSON.stringify(result, null, 2)}
                </pre>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ToolCallBlock;
