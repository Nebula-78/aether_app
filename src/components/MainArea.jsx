import React, { useState, useEffect, useRef } from 'react';
import { PanelLeft, Download, ChevronDown } from 'lucide-react';
import ChatMessage from './ChatMessage';
import InputZone from './InputZone';
import ToolCallBlock from './ToolCallBlock';

const MainArea = ({ activeConvId, setActiveConvId, messages, setMessages, systemPrompt, setSystemPrompt, onConversationUpdated, startNewConversation, showSidebar, onToggleSidebar, setActiveArtifact, activePersona }) => {
  const [streaming, setStreaming] = useState(false);
  const [currentResponse, setCurrentResponse] = useState('');
  const [activeToolCalls, setActiveToolCalls] = useState([]);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [showPromptEdit, setShowPromptEdit] = useState(false);
  const scrollRef = useRef(null);
  const messagesRef = useRef(messages);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  };

  // Auto-scroll en bas de la conv
  useEffect(() => {
    if (!showScrollBottom) {
      scrollToBottom();
    }
  }, [messages, currentResponse, activeToolCalls]);

  // Détection du scroll
  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
      setShowScrollBottom(!isAtBottom);
    }
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.addEventListener('scroll', handleScroll);
      return () => el.removeEventListener('scroll', handleScroll);
    }
  }, []);

  // Écouter le stream et les tools
  const handleChunk = (chunk) => {
    setCurrentResponse(prev => prev + chunk);
  };

  const handleEnd = (fullResponse, metadata) => {
    let updatedMessagesForSave = [];

    setMessages(prev => {
      let newMessages = [...prev];

      // Si des outils ont été exécutés, on les insère dans l'historique de l'UI
      if (metadata && metadata.toolCalls && metadata.toolResults) {
        const assistantToolMsg = {
          role: 'assistant',
          tool_calls: metadata.toolCalls.map(tc => ({
            id: tc.id,
            type: 'function',
            function: {
              name: tc.function.name,
              arguments: tc.function.arguments
            }
          }))
        };

        const toolMsgResults = metadata.toolResults.map(tr => ({
          role: 'tool',
          tool_call_id: tr.tool_call_id,
          name: tr.name,
          content: tr.content
        }));

        newMessages = [...newMessages, assistantToolMsg, ...toolMsgResults];
      }

      // On ajoute la réponse textuelle finale
      const assistantMsg = { role: 'assistant', content: fullResponse };
      newMessages = [...newMessages, assistantMsg];
      
      updatedMessagesForSave = newMessages; 
      return newMessages;
    });

    // --- Side Effects OUTSIDE of setMessages ---
    const convId = activeConvId || Date.now();

    // Sauvegarder la conversation
    const saveAndTitle = async () => {
      // Use the updated messages directly from the scope
      const finalMessages = updatedMessagesForSave;
      
      let title = finalMessages[0]?.content?.slice(0, 40) || 'Nouvelle conversation';
      
      // Auto-génération du titre si c'est le premier échange
      if (!activeConvId && finalMessages.length >= 2) {
        try {
          const generatedTitle = await window.electronAPI.generateTitle(finalMessages);
          if (generatedTitle) title = generatedTitle;
        } catch (e) {
          console.error("Erreur génération titre:", e);
        }
      }

      window.electronAPI.saveConversation({
        id: convId,
        title: title,
        messages: finalMessages,
        systemPrompt: systemPrompt
      });

      // Si c'était une nouvelle conversation, on fixe l'ID
      if (!activeConvId) {
        setActiveConvId(convId);
      }
      
      onConversationUpdated();
      setCurrentResponse('');
      setStreaming(false);
      setActiveToolCalls([]);
    };

    saveAndTitle();
  };

  const handleError = (error) => {
    setMessages(prev => [...prev, { role: 'assistant', content: `Erreur : ${error}`, isError: true }]);
    setStreaming(false);
    setCurrentResponse('');
    setActiveToolCalls([]);
  };

  useEffect(() => {
    const wrappedChunk = window.electronAPI.onStreamChunk(handleChunk);
    const wrappedEnd = window.electronAPI.onStreamEnd(handleEnd);
    const wrappedError = window.electronAPI.onStreamError(handleError);

    return () => {
      window.electronAPI.offStreamChunk(wrappedChunk);
      window.electronAPI.offStreamEnd(wrappedEnd);
      window.electronAPI.offStreamError(wrappedError);
    };
  }, [activeConvId, setMessages, onConversationUpdated, setActiveConvId]);

  // Écouter les événements des tools système (F3)
  useEffect(() => {
    const handleToolCalls = (toolCalls) => {
      setActiveToolCalls(toolCalls.map(tc => ({
        id: tc.id,
        name: tc.function.name,
        args: tc.function.arguments,
        status: 'running',
        result: null
      })));
    };

    const handleToolStatus = ({ id, status }) => {
      setActiveToolCalls(prev => prev.map(tc => 
        tc.id === id ? { ...tc, status } : tc
      ));
    };

    const handleToolResult = ({ id, name, result }) => {
      setActiveToolCalls(prev => prev.map(tc => 
        tc.id === id ? { ...tc, status: result.error ? 'error' : 'success', result } : tc
      ));
    };

    const wrappedCalls = window.electronAPI?.onToolCalls(handleToolCalls);
    const wrappedStatus = window.electronAPI?.onToolStatus(handleToolStatus);
    const wrappedResult = window.electronAPI?.onToolResult(handleToolResult);

    return () => {
      window.electronAPI?.offToolCalls(wrappedCalls);
      window.electronAPI?.offToolStatus(wrappedStatus);
      window.electronAPI?.offToolResult(wrappedResult);
    };
  }, []);

  const handleSendMessage = async (content) => {
    if (!content || streaming) return;

    // Check if content is a string (legacy text) or an array (new multipart format)
    const isText = typeof content === 'string';
    if (isText && !content.trim()) return;

    const userMsg = { role: 'user', content: content };
    const newMessages = [...messages, userMsg];
    
    // Add system prompt to messages if it exists
    let messagesToSend = newMessages;
    if (systemPrompt && systemPrompt.trim()) {
        messagesToSend = [{ role: 'system', content: systemPrompt }, ...newMessages];
    }

    setMessages(newMessages);
    setStreaming(true);
    setCurrentResponse('');
    setActiveToolCalls([]);

    window.electronAPI.sendMessage({ messages: messagesToSend, persona: activePersona });
  };

  const handleEditMessage = (index, newContent) => {
    // Truncate history to the edited message, update it, and resend
    const newMessages = messages.slice(0, index);
    newMessages.push({ role: 'user', content: newContent });
    
    setMessages(newMessages);
    setStreaming(true);
    setCurrentResponse('');
    setActiveToolCalls([]);

    let messagesToSend = newMessages;
    if (systemPrompt && systemPrompt.trim()) {
        messagesToSend = [{ role: 'system', content: systemPrompt }, ...newMessages];
    }
    window.electronAPI.sendMessage({ messages: messagesToSend, persona: activePersona });
  };

  const handleRegenerate = (index) => {
    // Retirer le dernier message assistant et éventuellement les messages outils associés
    // Pour simplifier, on retire tout ce qui suit le message utilisateur précédent
    const messagesWithoutLast = messages.slice(0, index);
    
    setMessages(messagesWithoutLast);
    setStreaming(true);
    setCurrentResponse('');
    setActiveToolCalls([]);

    let messagesToSend = messagesWithoutLast;
    if (systemPrompt && systemPrompt.trim()) {
        messagesToSend = [{ role: 'system', content: systemPrompt }, ...messagesWithoutLast];
    }
    window.electronAPI.sendMessage({ messages: messagesToSend, persona: activePersona });
  };

  const handleExport = async () => {
    if (messages.length === 0) return;
    const convs = await window.electronAPI.listConversations();
    const currentConv = convs.find(c => c.id === activeConvId);
    const title = currentConv?.title || 'Conversation';
    await window.electronAPI.exportConversation({ title, messages });
  };

  return (
    <main className="flex-1 bg-main-bg flex flex-col overflow-hidden relative">
      {/* Barre d'outils supérieure */}
      <div className="absolute top-4 left-4 right-4 z-50 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto">
          {!showSidebar && (
            <button 
              onClick={onToggleSidebar}
              aria-label="Ouvrir la barre latérale"
              className="p-1.5 text-txt-secondary hover:bg-item-hover rounded-md transition-all cursor-pointer bg-main-bg/50 backdrop-blur-sm border border-border-subtle shadow-sm animate-[fadeSlideIn_0.2s_ease_both]"
            >
              <PanelLeft size={20} />
            </button>
          )}
          <button
            onClick={() => setShowPromptEdit(!showPromptEdit)}
            className="p-1.5 text-txt-secondary hover:text-accent hover:bg-item-hover rounded-md transition-all cursor-pointer bg-main-bg/50 backdrop-blur-sm border border-border-subtle shadow-sm"
            title="Prompt système"
          >
            <span className="text-[12px] font-mono">system</span>
          </button>
        </div>

        {showPromptEdit && (
          <div className="absolute top-12 left-0 z-50 w-80 bg-sidebar-bg border border-border-subtle rounded-xl shadow-2xl p-4 animate-[fadeSlideIn_0.2s_ease_both] pointer-events-auto">
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              className="w-full h-32 bg-input-bg border border-border-input rounded-lg p-2 text-sm text-txt-primary outline-none focus:border-accent"
              placeholder="Prompt système pour cette conversation..."
            />
          </div>
        )}

        {messages.length > 0 && (
          <div className="flex items-center gap-2 pointer-events-auto">
            <button 
              onClick={handleExport}
              aria-label="Exporter la conversation en Markdown"
              className="flex items-center gap-2 px-3 py-1.5 text-[11px] font-medium text-txt-secondary hover:text-txt-primary hover:bg-item-hover rounded-md transition-all cursor-pointer bg-main-bg/50 backdrop-blur-sm border border-border-subtle shadow-sm animate-[heroReveal_0.3s_ease_both]"
            >
              <Download size={14} />
              Exporter (.md)
            </button>
          </div>
        )}
      </div>

      {/* Zone scrollable des messages */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-8 custom-scrollbar"
      >
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-8 animate-[heroReveal_0.4s_ease_both]">
            <div className="flex items-center gap-3 font-display text-[42px] text-txt-primary tracking-tight leading-tight select-none">
              <span className="text-accent text-[38px]">*</span>
              <h1>Comment puis-je vous aider ?</h1>
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto w-full">
            {messages.map((msg, i) => {
              if (msg.role === 'tool') {
                return null; // Rendu inline géré par le message assistant
              }

              if (msg.role === 'assistant' && msg.tool_calls) {
                return (
                  <div key={i} className="mb-6">
                    {msg.tool_calls.map(tc => {
                      const toolMsg = messages.find(m => m.role === 'tool' && m.tool_call_id === tc.id);
                      let result = null;
                      if (toolMsg) {
                        try {
                          result = JSON.parse(toolMsg.content);
                        } catch {
                          result = toolMsg.content;
                        }
                      }
                      return (
                        <ToolCallBlock 
                          key={tc.id}
                          name={tc.function.name}
                          args={tc.function.arguments}
                          status={toolMsg ? (result && result.error ? 'error' : 'success') : 'running'}
                          result={result}
                        />
                      );
                    })}
                    {msg.content && (
                      <ChatMessage 
                        role="assistant" 
                        content={msg.content} 
                        setActiveArtifact={setActiveArtifact} 
                        onRegenerate={() => handleRegenerate(i)}
                      />
                    )}
                  </div>
                );
              }

              return (
                <ChatMessage 
                  key={i} 
                  {...msg} 
                  setActiveArtifact={setActiveArtifact} 
                  onRegenerate={msg.role === 'assistant' ? () => handleRegenerate(i) : undefined}
                  onEdit={msg.role === 'user' ? (newContent) => handleEditMessage(i, newContent) : undefined}
                />
              );
            })}

            {/* Affichage des tool calls en cours d'exécution */}
            {activeToolCalls.map(tc => (
              <ToolCallBlock 
                key={tc.id}
                name={tc.name}
                args={tc.args}
                status={tc.status}
                result={tc.result}
              />
            ))}

            {streaming && currentResponse && (
              <ChatMessage role="assistant" content={currentResponse} isStreaming={true} setActiveArtifact={setActiveArtifact} />
            )}

            {streaming && !currentResponse && activeToolCalls.length === 0 && (
              <div className="flex justify-start mb-6">
                 <div className="px-4 py-3 rounded-2xl bg-accent/5 border border-accent/10 animate-pulse">
                   <div className="flex gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: '0s' }} />
                      <div className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: '0.1s' }} />
                      <div className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: '0.2s' }} />
                   </div>
                 </div>
              </div>
            )}
          </div>
        )}
        {showScrollBottom && (
          <button
            onClick={scrollToBottom}
            className="fixed bottom-32 right-1/2 translate-x-1/2 z-40 bg-sidebar-bg/90 backdrop-blur border border-border-subtle p-2 rounded-full shadow-lg text-txt-secondary hover:text-accent hover:border-accent transition-all animate-[fadeSlideIn_0.2s_ease_both]"
            aria-label="Aller en bas"
          >
            <ChevronDown size={20} />
          </button>
        )}
      </div>

      {/* Zone de saisie (fixe en bas) */}
      <div className="p-6 bg-gradient-to-t from-main-bg via-main-bg to-transparent">
        <div className="max-w-3xl mx-auto">
          <InputZone onSend={handleSendMessage} streaming={streaming} disabled={streaming} />
          <p className="text-[10px] text-txt-secondary text-center mt-3">
            Aether peut faire des erreurs. Vérifiez les informations importantes.
          </p>
        </div>
      </div>
    </main>
  );
};

export default MainArea;
