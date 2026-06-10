import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Check, Copy, Monitor } from 'lucide-react';

const CodeBlock = ({ node, inline, className, children, setActiveArtifact, ...props }) => {
  const [copied, setCopied] = useState(false);
  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match[1] : '';
  const content = String(children).replace(/\n$/, '');

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenArtifact = () => {
    setActiveArtifact({
      title: language.toUpperCase() + ' Artifact',
      language,
      content
    });
  };

  if (inline) {
    return (
      <code className="bg-item-hover px-1.5 py-0.5 rounded text-accent font-mono text-[13px]" {...props}>
        {children}
      </code>
    );
  }

  return (
    <div className="relative group my-4 rounded-xl overflow-hidden border border-border-subtle shadow-lg">
      <div className="flex items-center justify-between px-4 py-2 bg-sidebar-bg border-b border-border-subtle">
        <span className="text-[10px] font-mono text-txt-secondary uppercase tracking-wider">
          {language || 'text'}
        </span>
        <div className="flex items-center gap-2">
          {['html', 'svg', 'react', 'javascript', 'css', 'python'].includes(language) && (
            <button
              onClick={handleOpenArtifact}
              className="flex items-center gap-1.5 text-txt-secondary hover:text-accent transition-colors cursor-pointer p-1 rounded-md hover:bg-item-hover"
              title="Ouvrir dans le panneau latéral"
            >
              <Monitor size={14} />
              <span className="text-[10px] font-medium">Aperçu</span>
            </button>
          )}
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-txt-secondary hover:text-txt-primary transition-colors cursor-pointer p-1 rounded-md hover:bg-item-hover"
            title="Copier le code"
          >
            {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
            <span className="text-[10px] font-medium">{copied ? 'Copié !' : 'Copier'}</span>
          </button>
        </div>
      </div>
      <SyntaxHighlighter
        style={vscDarkPlus}
        language={language}
        PreTag="div"
        className="!m-0 !bg-input-bg !p-4 !text-[13px] custom-scrollbar font-mono"
        {...props}
      >
        {content}
      </SyntaxHighlighter>
    </div>
  );
};

const ChatMessage = ({ role, content, isError, isStreaming, setActiveArtifact }) => {
  const isUser = role === 'user';

  return (
    <div className={`flex w-full mb-6 ${isUser ? 'justify-end' : 'justify-start'} animate-[fadeSlideIn_0.3s_ease_both]`}>
      <div 
        className={`
          max-w-[85%] px-4 py-3 rounded-2xl text-[14px] leading-relaxed shadow-sm
          ${isUser ? 'bg-item-active text-txt-primary rounded-tr-sm border border-border-subtle' : 'text-txt-primary'}
          ${isError ? 'text-accent italic border border-accent/20 bg-accent/5' : ''}
        `}
      >
        <div className="prose prose-invert max-w-none prose-p:leading-relaxed prose-pre:p-0 prose-pre:bg-transparent">
          <ReactMarkdown
            components={{
              code: (props) => <CodeBlock {...props} setActiveArtifact={setActiveArtifact} />
            }}
          >
            {content}
          </ReactMarkdown>
          {isStreaming && (
            <span className="inline-block w-2 h-4 bg-accent ml-1 animate-[pulse_1s_infinite] align-middle" />
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;
