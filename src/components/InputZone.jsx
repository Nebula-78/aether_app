import React, { useState, useRef, useEffect } from 'react';
import { Plus, Mic, SendHorizontal, MicOff, Loader2, File, X, Image as ImageIcon, Square, Search, LayoutList, TextQuote, Command, Activity } from 'lucide-react';

const InputZone = ({ onSend, streaming, disabled, activePersona, onPersonaChange }) => {
  const [text, setText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [useSearch, setUseSearch] = useState(false);
  const [searchDepth, setSearchDepth] = useState('basic'); // 'basic' or 'advanced'
  const [formatMode, setFormatMode] = useState('prose'); // 'prose' or 'structured'
  const [showCommands, setShowCommands] = useState(false);
  const textareaRef = useRef(null);
  
  const commandsList = [
    { cmd: '/search', desc: 'Activer la recherche web pour ce message', icon: <Search size={14} /> },
    { cmd: '/code', desc: 'Activer le mode développeur expert', icon: <Command size={14} /> },
    { cmd: '/resume', desc: 'Générer un résumé de la conversation', icon: <LayoutList size={14} /> },
    { cmd: '/export', desc: 'Exporter la conversation en Markdown', icon: <File size={14} /> },
  ];
  const recognitionRef = useRef(null);
  const isListeningRef = useRef(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'fr-FR';

      recognition.onresult = (event) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          setText(prev => (prev + (prev ? ' ' : '') + finalTranscript).trim());
        }
      };

      recognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        if (event.error === 'no-speech') return; // Ignorer les silences
        setIsListening(false);
        isListeningRef.current = false;
      };

      recognition.onend = () => {
        // Si on est toujours censé écouter (mode continu), on redémarre avec un petit délai
        // pour éviter de saturer le service réseau en cas de coupures répétées.
        if (isListeningRef.current) {
          setTimeout(() => {
            if (isListeningRef.current) {
              try {
                recognition.start();
              } catch (e) {
                // Si le démarrage échoue (ex: déjà démarré ou erreur fatale), on arrête tout.
                console.error("Failed to restart recognition:", e);
                setIsListening(false);
                isListeningRef.current = false;
              }
            }
          }, 300); // Délai de 300ms entre deux sessions
        } else {
          setIsListening(false);
        }
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) return;

    if (isListening) {
      isListeningRef.current = false;
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      isListeningRef.current = true;
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (e) {
        console.error("Error starting recognition:", e);
        isListeningRef.current = false;
      }
    }
  };

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    const newAttachments = files.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      name: file.name,
      type: file.type,
      size: (file.size / 1024).toFixed(1) + ' KB',
      isImage: file.type.startsWith('image/')
    }));

    setAttachments(prev => [...prev, ...newAttachments]);
    e.target.value = ''; // Reset input
  };

  const removeAttachment = (id) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  const handleInput = (e) => {
    const val = e.target.value;
    setText(val);
    setShowCommands(val === '/');

    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  };

  const applyCommand = (cmd) => {
    if (cmd === '/search') {
      setUseSearch(true);
      setText('Recherche web activée : '); // Pré-remplissage pour aider l'utilisateur
    } else if (cmd === '/code') {
      setText('');
      if (onPersonaChange) onPersonaChange('coder');
      onSend([{ type: "text", text: "Je souhaite que tu m'aides sur un projet de programmation." }], { formatMode: 'structured' });
    } else if (cmd === '/resume') {
      setText('');
      onSend([{ type: "text", text: "Fais-moi un résumé structuré des points clés de notre conversation." }], { formatMode: 'structured' });
    } else if (cmd === '/export') {
      setText('');
      onSend([{ type: "text", text: "Commande d'exportation demandée." }], { isExportCommand: true });
    }
    setShowCommands(false);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleStop = () => {
    window.electronAPI.abortStream();
  };

  const handleSubmit = async () => {
    if ((!text.trim() && attachments.length === 0) || disabled || streaming) return;
    
    // Helper to read file as base64
    const readFileAsBase64 = (file) => new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result); // Keep the full data URL
      reader.readAsDataURL(file);
    });

    let messageContent = [];
    if (text.trim()) {
      messageContent.push({ type: "text", text: text.trim() });
    }

    for (const attachment of attachments) {
      const dataUrl = await readFileAsBase64(attachment.file);
      messageContent.push({
        type: "image_url",
        image_url: {
          url: dataUrl
        }
      });
    }

    onSend(messageContent, { useSearch, searchDepth, formatMode });
    setText('');
    setAttachments([]);
    setUseSearch(false); // Reset search after send
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  return (
    <div 
      className={`w-full bg-input-bg border border-border-input rounded-2xl p-4 flex flex-col gap-4 shadow-xl transition-all ${disabled ? 'opacity-70' : ''} ${isListening ? 'ring-2 ring-accent/50 bg-accent/5' : ''}`}
      style={{ animation: 'heroReveal 0.4s ease 0.2s both' }}
    >
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          {showCommands && (
            <div className="absolute bottom-full left-0 mb-2 w-72 bg-sidebar-bg border border-border-subtle rounded-xl shadow-2xl p-1.5 animate-[fadeSlideIn_0.2s_ease_both] z-[100]">
              <div className="px-3 py-1.5 text-[10px] font-bold text-txt-secondary uppercase tracking-widest border-b border-border-subtle/50 mb-1">
                Commandes rapides
              </div>
              {commandsList.map((item) => (
                <button
                  key={item.cmd}
                  onClick={() => applyCommand(item.cmd)}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-item-hover transition-colors group"
                >
                  <div className="p-1.5 bg-sidebar-bg border border-border-subtle rounded text-txt-secondary group-hover:text-accent group-hover:border-accent/30 transition-all">
                    {item.icon}
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="text-[12px] font-mono font-bold text-txt-primary">{item.cmd}</span>
                    <span className="text-[10px] text-txt-secondary">{item.desc}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
          <button
            onClick={() => setUseSearch(!useSearch)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${
              useSearch 
                ? 'bg-accent/10 text-accent border border-accent/20' 
                : 'text-txt-secondary hover:bg-item-hover border border-transparent'
            }`}
          >
            <Search size={12} />
            Recherche Web {useSearch ? 'ON' : 'OFF'}
          </button>
          
          {useSearch && (
            <div className="flex items-center bg-sidebar-bg/50 rounded-full p-0.5 border border-border-subtle animate-[fadeSlideIn_0.2s_ease_both]">
              <button
                onClick={() => setSearchDepth('basic')}
                className={`px-2 py-0.5 rounded-full text-[9px] font-bold transition-all ${
                  searchDepth === 'basic' ? 'bg-blue-500/20 text-blue-400' : 'text-txt-secondary hover:text-txt-primary'
                }`}
              >
                RAPIDE
              </button>
              <button
                onClick={() => setSearchDepth('advanced')}
                className={`px-2 py-0.5 rounded-full text-[9px] font-bold transition-all ${
                  searchDepth === 'advanced' ? 'bg-purple-500/20 text-purple-400' : 'text-txt-secondary hover:text-txt-primary'
                }`}
              >
                PROFOND
              </button>
            </div>
          )}

          <div className="w-[1px] h-3 bg-border-subtle mx-1" />
          <div className="flex items-center bg-sidebar-bg/50 rounded-full p-0.5 border border-border-subtle">
            <button
              onClick={() => setFormatMode('prose')}
              title="Mode Prose (narratif)"
              className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-medium transition-all ${
                formatMode === 'prose' ? 'bg-accent text-white shadow-sm' : 'text-txt-secondary hover:text-txt-primary'
              }`}
            >
              <TextQuote size={10} /> Prose
            </button>
            <button
              onClick={() => setFormatMode('structured')}
              title="Mode Structuré (listes, tableaux)"
              className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-medium transition-all ${
                formatMode === 'structured' ? 'bg-accent text-white shadow-sm' : 'text-txt-secondary hover:text-txt-primary'
              }`}
            >
              <LayoutList size={10} /> Structuré
            </button>
          </div>
        </div>
        
        {attachments.length > 0 && (
          <span className="text-[10px] text-txt-secondary font-medium">
            {attachments.length} fichier{attachments.length > 1 ? 's' : ''} joint{attachments.length > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {attachments.map((file) => (
            <div 
              key={file.id} 
              className="relative group flex items-center gap-2 bg-sidebar-bg/50 border border-border-subtle rounded-lg px-3 py-2 animate-[fadeSlideIn_0.2s_ease_both]"
            >
              {file.isImage ? <ImageIcon size={14} className="text-accent" /> : <File size={14} className="text-accent" />}
              <div className="flex flex-col">
                <span className="text-[11px] text-txt-primary font-medium max-w-[120px] truncate">{file.name}</span>
                <span className="text-[9px] text-txt-secondary">{file.size}</span>
              </div>
              <button 
                onClick={() => removeAttachment(file.id)}
                className="ml-1 p-0.5 hover:bg-item-hover rounded-full text-txt-secondary hover:text-accent transition-colors"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      <textarea
        ref={textareaRef}
        value={text}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        disabled={disabled || isListening || streaming}
        placeholder={isListening ? "J'écoute..." : "Comment puis-je vous aider aujourd'hui ?"}
        className="bg-transparent border-none outline-none font-body text-[14px] font-light text-txt-primary resize-none min-h-[44px] caret-accent w-full placeholder:text-txt-secondary select-text disabled:cursor-not-allowed"
        rows={1}
      />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            className="hidden" 
            multiple 
          />
          <button 
            onClick={handleFileClick}
            disabled={streaming}
            aria-label="Joindre un fichier"
            className="w-7 h-7 rounded-full border border-border-input flex items-center justify-center text-txt-secondary hover:border-accent hover:text-accent transition-all cursor-pointer disabled:opacity-50"
          >
            <Plus size={16} />
          </button>
          
          <button
            onClick={toggleListening}
            disabled={streaming}
            aria-label={isListening ? "Arrêter l'écoute" : "Démarrer l'écoute vocale"}
            className={`w-7 h-7 rounded-full border transition-all flex items-center justify-center cursor-pointer ${
              isListening ? 'bg-accent border-accent text-white animate-pulse' : 'border-border-input text-txt-secondary hover:border-accent hover:text-accent disabled:opacity-50'
            }`}
          >
            {isListening ? <MicOff size={14} /> : <Mic size={14} />}
          </button>
        </div>

        <div className="flex items-center gap-2">
          {disabled && !streaming && (
            <div className="text-accent animate-spin mr-2">
              <Loader2 size={18} />
            </div>
          )}
          
          {streaming ? (
            <button 
              onClick={handleStop}
              aria-label="Arrêter le streaming"
              className="p-2 bg-red-600/20 border border-red-500/40 text-red-400 rounded-lg hover:bg-red-600/30 transition-colors"
            >
              <Square size={18} />
            </button>
          ) : (
            <button 
              onClick={handleSubmit}
              disabled={(!text.trim() && attachments.length === 0) || disabled}
              aria-label="Envoyer le message"
              className="p-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors disabled:bg-txt-muted disabled:cursor-not-allowed cursor-pointer"
            >
              <SendHorizontal size={18} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default InputZone;
