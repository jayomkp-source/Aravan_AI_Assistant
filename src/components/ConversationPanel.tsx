import React, { useEffect, useRef } from 'react';
import { ConversationMessage } from '../types';
import { MessageSquare, Bot, Sparkles, Trash2, Brain } from 'lucide-react';
import { MessageBubble } from './MessageBubble';

interface ConversationPanelProps {
  messages: ConversationMessage[];
  voiceState: string;
  onClear: () => void;
  onQuickPrompt?: (text: string) => void;
  onOpenMemory?: () => void;
}

export const ConversationPanel: React.FC<ConversationPanelProps> = ({
  messages,
  voiceState,
  onClear,
  onQuickPrompt,
  onOpenMemory,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const isAutoScrollRef = useRef(true);

  // Auto-scroll to latest message/token if user is near bottom
  useEffect(() => {
    if (isAutoScrollRef.current && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    // If within 100px of bottom, keep auto-scrolling
    isAutoScrollRef.current = scrollHeight - (scrollTop + clientHeight) < 100;
  };

  return (
    <div className="w-full flex flex-col h-full bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/80 rounded-2xl overflow-hidden shadow-2xl transition-all duration-300">
      {/* Panel Header */}
      <div className="px-4 py-3 border-b border-zinc-800/60 bg-zinc-950/40 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
            Live Conversation
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-800/80 text-zinc-400 border border-zinc-700/50">
            {messages.length} {messages.length === 1 ? 'message' : 'messages'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {onOpenMemory && (
            <button
              id="open-memory-btn"
              onClick={onOpenMemory}
              className="px-2.5 py-1 rounded-lg text-xs font-medium text-amber-400 bg-amber-950/40 border border-amber-500/30 hover:bg-amber-900/50 transition-all flex items-center gap-1.5 shadow-sm"
              title="Open ARAVAN's Memory"
            >
              <Brain className="w-3.5 h-3.5 text-amber-400" />
              <span>Memory</span>
            </button>
          )}

          {messages.length > 0 && (
            <button
              id="clear-chat-btn"
              onClick={onClear}
              className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60 transition-colors"
              title="Clear transcript"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-3.5 select-text scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent"
        style={{ minHeight: '180px', maxHeight: '340px' }}
      >
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-500">
            <Bot className="w-8 h-8 text-zinc-600 mb-2 opacity-60" />
            <p className="text-xs">No messages yet. Speak or type to begin talking with ARAVAN.</p>
          </div>
        ) : (
          messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick Prompts (if empty or starting) */}
      {onQuickPrompt && messages.length <= 2 && (
        <div className="px-4 py-2.5 border-t border-zinc-800/40 bg-zinc-950/20 flex items-center gap-2 overflow-x-auto text-[11px] font-mono no-scrollbar">
          <span className="text-zinc-500 flex items-center gap-1 shrink-0">
            <Sparkles className="w-3 h-3 text-amber-500/70" /> Try:
          </span>
          <button
            onClick={() => onQuickPrompt('Who built you?')}
            className="px-2.5 py-1 rounded-full bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 border border-zinc-700/60 shrink-0 transition-colors"
          >
            "Who built you?"
          </button>
          <button
            onClick={() => onQuickPrompt('Remember that I like dark themes.')}
            className="px-2.5 py-1 rounded-full bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 border border-zinc-700/60 shrink-0 transition-colors"
          >
            "Remember that..."
          </button>
          <button
            onClick={() => onQuickPrompt('What do you remember about me?')}
            className="px-2.5 py-1 rounded-full bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 border border-zinc-700/60 shrink-0 transition-colors"
          >
            "What do you remember?"
          </button>
          <button
            onClick={() => onQuickPrompt('Kese ho boss?')}
            className="px-2.5 py-1 rounded-full bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 border border-zinc-700/60 shrink-0 transition-colors"
          >
            "Kese ho boss?"
          </button>
        </div>
      )}
    </div>
  );
};
