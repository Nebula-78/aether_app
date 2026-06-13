import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Check, Copy, Monitor, RotateCcw } from 'lucide-react';
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAppStore } from '../store/useAppStore';

const CodeBlock = ({ node, inline, className, children, ...props }) => {
  const { setActiveArtifact } = useAppStore();
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
    <Card className="relative group my-4 rounded-xl overflow-hidden border-border-subtle shadow-lg bg-transparent">
      <CardHeader className="flex flex-row items-center justify-between px-4 py-2 bg-sidebar-bg border-b border-border-subtle space-y-0">
        <span className="text-[10px] font-mono text-txt-secondary uppercase tracking-wider">
          {language || 'text'}
        </span>
        <div className="flex items-center gap-2">
          {['html', 'svg', 'react', 'javascript', 'css', 'python'].includes(language) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleOpenArtifact}
              className="h-7 gap-1.5 text-txt-secondary hover:text-accent transition-colors p-1"
              title="Ouvrir dans le panneau latéral"
            >
              <Monitor size={14} />
              <span className="text-[10px] font-medium">Aperçu</span>
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="h-7 gap-1.5 text-txt-secondary hover:text-txt-primary transition-colors p-1"
            title="Copier le code"
          >
            {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
            <span className="text-[10px] font-medium">{copied ? 'Copié !' : 'Copier'}</span>
          </Button>
        </div>
      </CardHeader>
      <SyntaxHighlighter
        style={vscDarkPlus}
        language={language}
        PreTag="div"
        className="!m-0 !bg-input-bg !p-4 !text-[13px] custom-scrollbar font-mono"
        {...props}
      >
        {content}
      </SyntaxHighlighter>
    </Card>
  );
};

// ─── Markdown components styled à la Claude.ai ───────────────────────────────
const markdownComponents = (setActiveArtifact) => ({
  code: (props) => <CodeBlock {...props} setActiveArtifact={setActiveArtifact} />,

  h1: ({ children }) => (
    <h1 className="text-xl font-semibold text-txt-primary mt-6 mb-3 pb-1 border-b border-border-subtle">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-[17px] font-semibold text-txt-primary mt-5 mb-2">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-[15px] font-semibold text-txt-primary mt-4 mb-1.5">
      {children}
    </h3>
  ),

  p: ({ children }) => (
    <p className="text-[14px] leading-7 text-txt-primary mb-3 last:mb-0">
      {children}
    </p>
  ),

  ul: ({ children }) => (
    <ul className="my-3 space-y-1.5 pl-1">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="my-3 space-y-1.5 pl-1 list-decimal list-inside">
      {children}
    </ol>
  ),
  li: ({ children }) => (
    <li className="flex gap-2 text-[14px] leading-7 text-txt-primary">
      <span className="mt-2.5 w-1.5 h-1.5 rounded-full bg-txt-secondary flex-shrink-0" />
      <span>{children}</span>
    </li>
  ),

  strong: ({ children }) => (
    <strong className="font-semibold text-txt-primary">{children}</strong>
  ),
  em: ({ children }) => (
    <em className="italic text-txt-secondary">{children}</em>
  ),

  blockquote: ({ children }) => (
    <blockquote className="my-3 pl-4 border-l-2 border-accent/50 text-txt-secondary italic">
      {children}
    </blockquote>
  ),

  hr: () => <hr className="my-5 border-border-subtle" />,

  a: ({ href, children }) => {
    if (href?.startsWith('#tool-')) {
      const num = href.replace('#tool-', '');
      return (
        <sup className="mx-0.5">
          <a 
            href={href} 
            className="text-accent hover:underline font-bold text-[10px]"
            onClick={(e) => {
              e.preventDefault();
              const el = document.getElementById(`tool-call-${num}`);
              if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }}
          >
            {children}
          </a>
        </sup>
      );
    }
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-accent underline underline-offset-2 hover:opacity-80 transition-opacity"
      >
        {children}
      </a>
    );
  },

  // ─── Table ────────────────────────────────────────────────────────────────
  table: ({ children }) => (
    <div className="my-4 overflow-x-auto rounded-xl border border-border-subtle">
      <table className="w-full text-[13px] border-collapse">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-sidebar-bg text-txt-secondary uppercase text-[11px] tracking-wide">
      {children}
    </thead>
  ),
  tbody: ({ children }) => (
    <tbody className="divide-y divide-border-subtle">
      {children}
    </tbody>
  ),
  tr: ({ children }) => (
    <tr className="hover:bg-item-hover transition-colors">
      {children}
    </tr>
  ),
  th: ({ children }) => (
    <th className="px-4 py-2.5 text-left font-medium whitespace-nowrap">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-4 py-2.5 text-txt-primary align-top">
      {children}
    </td>
  ),
});

// ─── ChatMessage ──────────────────────────────────────────────────────────────
const ChatMessage = ({ role, content, isError, isStreaming, onRegenerate, onEdit }) => {
  const { setActiveArtifact } = useAppStore();
  const isUser = role === 'user';
  const isAssistant = role === 'assistant';
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(typeof content === 'string' ? content : '');
  const [copied, setCopied] = useState(false);

  const handleEdit = () => {
    onEdit(editContent);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditContent(typeof content === 'string' ? content : '');
    setIsEditing(false);
  };

  const handleCopy = () => {
    const textToCopy = typeof content === 'string' 
      ? content 
      : content.map(item => item.text || '').join('\n');
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ─── Citations [^n] ────────────────────────────────────────────────────────
  const MarkdownRenderer = React.memo(({ text }) => {
    const components = React.useMemo(() => markdownComponents(setActiveArtifact), [setActiveArtifact]);
    
    // Remplacer [^n] par un lien markdown standard pour qu'il soit parsé par le composant 'a'
    const processedText = text ? text.replace(/\[\^(\d+)\]/g, '[[$$1]](#tool-$$1)') : '';

    return (
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={components}
      >
        {processedText}
      </ReactMarkdown>
    );
  });

  const renderContent = () => {
    if (isEditing) {
      return (
        <div className="w-full flex flex-col gap-2">
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="w-full bg-input-bg border border-border-input rounded-lg p-3 text-sm text-txt-primary outline-none focus:border-accent min-h-[100px] resize-y custom-scrollbar"
            placeholder="Modifiez votre message..."
          />
          <div className="flex justify-end gap-2 mt-2">
            <button
              onClick={handleCancel}
              className="px-3 py-1.5 text-[11px] font-medium text-txt-secondary hover:text-txt-primary hover:bg-item-hover rounded-md transition-colors cursor-pointer"
            >
              Annuler
            </button>
            <button
              onClick={handleEdit}
              className="px-3 py-1.5 text-[11px] font-medium bg-accent text-white hover:bg-accent-hover rounded-md transition-colors shadow-sm cursor-pointer"
            >
              Enregistrer & Renvoyer
            </button>
          </div>
        </div>
      );
    }

    // Garde-fou robuste
    if (!content) return null;

    if (typeof content === 'string') {
      return <MarkdownRenderer text={content} />;
    }

    if (Array.isArray(content)) {
      return (
        <div className="flex flex-col gap-2">
          {content.map((item, index) => {
            if (item.type === 'text') {
              return <MarkdownRenderer key={index} text={item.text} />;
            } else if (item.type === 'image_url') {
              return (
                <img
                  key={index}
                  src={item.image_url.url}
                  alt="Attachment"
                  className="max-w-full rounded-lg my-2 border border-border-subtle"
                />
              );
            }
            return null;
          })}
        </div>
      );
    }
    
    // Si c'est un objet inconnu, essayer de le convertir en string
    return <MarkdownRenderer text={String(content)} />;
  };

  return (
    <div
      className={`flex w-full mb-6 ${isUser ? 'justify-end' : 'justify-start'} animate-[fadeSlideIn_0.3s_ease_both] group`}
      onDoubleClick={isUser ? () => setIsEditing(true) : undefined}
    >
      <div
        className={`
          ${isUser ? 'max-w-[75%]' : 'max-w-[720px] w-full'}
          px-4 py-3 rounded-2xl text-[14px] leading-relaxed
          ${isUser ? 'bg-item-active text-txt-primary rounded-tr-sm border border-border-subtle shadow-sm' : 'text-txt-primary'}
          ${isError ? 'text-accent italic border border-accent/20 bg-accent/5' : ''}
          ${isAssistant ? 'relative' : ''}
        `}
      >
        {isAssistant && !isStreaming && onRegenerate && (
          <div className="absolute -left-10 top-2 flex flex-col gap-2">
            <button
              onClick={onRegenerate}
              className="p-1.5 text-txt-secondary hover:text-accent opacity-0 group-hover:opacity-100 transition-opacity"
              title="Régénérer la réponse"
            >
              <RotateCcw size={16} />
            </button>
            <button
              onClick={handleCopy}
              className="p-1.5 text-txt-secondary hover:text-accent opacity-0 group-hover:opacity-100 transition-opacity"
              title="Copier le message"
            >
              {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
            </button>
          </div>
        )}

        {renderContent()}

        {isStreaming && (
          <span className="inline-block w-2 h-4 bg-accent ml-1 animate-[pulse_1s_infinite] align-middle" />
        )}
      </div>
    </div>
  );
};

export default ChatMessage;
