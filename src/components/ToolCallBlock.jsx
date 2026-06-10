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
  Eye
} from 'lucide-react';

const getToolIcon = (name) => {
  switch (name) {
    case 'run_command':
      return <Terminal size={16} />;
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

const ToolCallBlock = ({ name, args, status, result }) => {
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
    <div className="w-full mb-4 border border-border-subtle bg-sidebar-bg/50 rounded-xl overflow-hidden animate-[fadeSlideIn_0.2s_ease_both]">
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
              <pre className={`border rounded-lg p-2.5 overflow-x-auto whitespace-pre max-h-52 ${
                result.error ? 'bg-accent/5 border-accent/20 text-accent' : 'bg-input-bg border-border-input text-txt-primary'
              }`}>
                {typeof result === 'string' ? result : JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ToolCallBlock;
