import React, { useState, useRef, useEffect } from 'react';
import { Plus, Mic, SendHorizontal, MicOff, Loader2, File, X, Image as ImageIcon } from 'lucide-react';

const InputZone = ({ onSend, disabled }) => {
  const [text, setText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const textareaRef = useRef(null);
  const recognitionRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'fr-FR';

      recognitionRef.current.onresult = (event) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          setText(prev => (prev + ' ' + finalTranscript).trim());
        }
      };

      recognitionRef.current.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      recognitionRef.current?.start();
      setIsListening(true);
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
    setText(e.target.value);
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    if ((!text.trim() && attachments.length === 0) || disabled) return;
    
    // In a real app, you'd probably upload these or convert to base64
    // For now, we'll send the text and attachment names
    let fullText = text;
    if (attachments.length > 0) {
      const fileNames = attachments.map(a => `[Fichier: ${a.name}]`).join(' ');
      fullText = `${fullText} ${fileNames}`.trim();
    }

    onSend(fullText);
    setText('');
    setAttachments([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  return (
    <div 
      className={`w-full bg-input-bg border border-border-input rounded-2xl p-4 flex flex-col gap-4 shadow-xl transition-all ${disabled ? 'opacity-70' : ''} ${isListening ? 'ring-2 ring-accent/50 bg-accent/5' : ''}`}
      style={{ animation: 'heroReveal 0.4s ease 0.2s both' }}
    >
      {/* Zone des pièces jointes */}
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
        disabled={disabled || isListening}
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
            aria-label="Joindre un fichier"
            className="w-7 h-7 rounded-full border border-border-input flex items-center justify-center text-txt-secondary hover:border-accent hover:text-accent transition-all cursor-pointer"
          >
            <Plus size={16} />
          </button>
          
          <button
            onClick={toggleListening}
            aria-label={isListening ? "Arrêter l'écoute" : "Démarrer l'écoute vocale"}
            className={`w-7 h-7 rounded-full border transition-all flex items-center justify-center cursor-pointer ${
              isListening ? 'bg-accent border-accent text-white animate-pulse' : 'border-border-input text-txt-secondary hover:border-accent hover:text-accent'
            }`}
          >
            {isListening ? <MicOff size={14} /> : <Mic size={14} />}
          </button>
        </div>

        <div className="flex items-center gap-2">
          {disabled && (
            <div className="text-accent animate-spin mr-2">
              <Loader2 size={18} />
            </div>
          )}
          <button 
            onClick={handleSubmit}
            disabled={(!text.trim() && attachments.length === 0) || disabled}
            aria-label="Envoyer le message"
            className="p-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors disabled:bg-txt-muted disabled:cursor-not-allowed cursor-pointer"
          >
            <SendHorizontal size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default InputZone;
