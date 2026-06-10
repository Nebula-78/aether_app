import React, { useState } from 'react';
import { X, Code, Eye, Copy, Check, Download, Monitor } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

const ArtifactsPanel = ({ artifact, onClose }) => {
  const [view, setView] = useState('preview'); // 'preview' or 'code'
  const [copied, setCopied] = useState(false);

  if (!artifact) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(artifact.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isWeb = ['html', 'svg', 'react'].includes(artifact.language?.toLowerCase());

  return (
    <div className="h-full flex flex-col bg-sidebar-bg select-none">
      {/* Header */}
      <div className="h-[52px] flex items-center justify-between px-4 border-b border-border-subtle bg-main-bg/20">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="p-1.5 rounded-lg bg-accent/10 text-accent shrink-0">
            <Monitor size={18} />
          </div>
          <span className="font-medium text-[13px] text-txt-primary truncate">
            {artifact.title || 'Artifact'}
          </span>
        </div>
        <button 
          onClick={onClose}
          aria-label="Fermer le panneau"
          className="p-1.5 hover:bg-item-hover rounded-md text-txt-secondary hover:text-txt-primary transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border-subtle bg-main-bg/10">
        <div className="flex bg-item-hover rounded-lg p-0.5">
          {isWeb && (
            <button
              onClick={() => setView('preview')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                view === 'preview' ? 'bg-sidebar-bg text-txt-primary shadow-sm' : 'text-txt-secondary hover:text-txt-primary'
              }`}
            >
              <Eye size={14} />
              Aperçu
            </button>
          )}
          <button
            onClick={() => setView('code')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
              view === 'code' || !isWeb ? 'bg-sidebar-bg text-txt-primary shadow-sm' : 'text-txt-secondary hover:text-txt-primary'
            }`}
          >
            <Code size={14} />
            Code
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium text-txt-secondary hover:text-txt-primary hover:bg-item-hover transition-all cursor-pointer"
          >
            {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
            {copied ? 'Copié' : 'Copier'}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden relative">
        {view === 'preview' && isWeb ? (
          <div className="w-full h-full bg-white overflow-auto">
            {artifact.language === 'svg' ? (
              <div 
                className="w-full h-full flex items-center justify-center p-8"
                dangerouslySetInnerHTML={{ __html: artifact.content }}
              />
            ) : (
              <iframe
                title="Preview"
                className="w-full h-full border-none"
                srcDoc={`
                  <html>
                    <head>
                      <meta charset="utf-8">
                      <script src="https://cdn.tailwindcss.com"></script>
                      <style>body { font-family: sans-serif; }</style>
                    </head>
                    <body class="p-4 bg-white text-black">
                      ${artifact.content}
                    </body>
                  </html>
                `}
              />
            )}
          </div>
        ) : (
          <div className="w-full h-full overflow-auto custom-scrollbar bg-[#1e1e1e]">
            <SyntaxHighlighter
              style={vscDarkPlus}
              language={artifact.language || 'text'}
              PreTag="div"
              className="!m-0 !bg-transparent !p-6 !text-[13px] !leading-relaxed"
              showLineNumbers={true}
            >
              {artifact.content}
            </SyntaxHighlighter>
          </div>
        )}
      </div>
    </div>
  );
};

export default ArtifactsPanel;
