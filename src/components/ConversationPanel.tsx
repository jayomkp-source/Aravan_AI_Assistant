import React, { useEffect, useRef, useState } from 'react';
import { ConversationMessage } from '../types';
import { Trash2, Send, Mic, MicOff, MessageSquare, Brain } from 'lucide-react';
import { MessageBubble } from './MessageBubble';
import { CapabilityCard } from './CapabilityCard';

interface ConversationPanelProps {
  messages: ConversationMessage[];
  voiceState: string;
  onClear: () => void;
  onSendMessage: (text: string) => void;
  onToggleMic: () => void;
  isMicActive: boolean;
}

export const ConversationPanel: React.FC<ConversationPanelProps> = ({
  messages,
  voiceState,
  onClear,
  onSendMessage,
  onToggleMic,
  isMicActive,
}) => {
  const [activeTab, setActiveTab] = useState<'chat' | 'capabilities'>('chat');
  const [inputText, setInputText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const isAutoScrollRef = useRef(true);

  // Auto-scroll on new messages
  useEffect(() => {
    if (isAutoScrollRef.current && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    isAutoScrollRef.current = scrollHeight - (scrollTop + clientHeight) < 100;
  };

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed) return;
    onSendMessage(trimmed);
    setInputText('');
  };

  return (
    <aside className="w-full flex flex-col gap-4 select-none">
      {/* 1. Main Conversation / Capability Glass Card */}
      <div className="flex-1 flex flex-col bg-[#09071c]/75 backdrop-blur-2xl border border-zinc-800/80 rounded-2xl overflow-hidden shadow-2xl shadow-purple-950/20">
        {/* Header with Switcher Tabs */}
        <div className="px-3.5 py-2.5 border-b border-zinc-800/60 flex items-center justify-between bg-zinc-950/50">
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-zinc-900/80 border border-zinc-800">
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono font-semibold transition-all ${
                activeTab === 'chat'
                  ? 'bg-zinc-800 text-white shadow-sm ring-1 ring-cyan-500/40'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
              <span>CHAT {messages.length > 0 && `(${messages.length})`}</span>
            </button>
            <button
              onClick={() => setActiveTab('capabilities')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono font-semibold transition-all ${
                activeTab === 'capabilities'
                  ? 'bg-zinc-800 text-white shadow-sm ring-1 ring-amber-500/40'
                  : 'text-zinc-400 hover:text-amber-300'
              }`}
            >
              <Brain className="w-3.5 h-3.5 text-amber-400" />
              <span>BRAIN & POWERS</span>
            </button>
          </div>

          {activeTab === 'chat' && messages.length > 0 && (
            <button
              onClick={onClear}
              className="flex items-center gap-1 text-[11px] font-mono text-rose-400/90 hover:text-rose-300 transition-colors"
              title="Clear transcript"
            >
              <span>Clear</span>
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {activeTab === 'chat' ? (
          <>
            {/* Message Stream */}
            <div
              ref={scrollRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto p-3.5 space-y-3 select-text scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent min-h-[280px] max-h-[460px]"
            >
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-500 space-y-2">
                  <p className="text-xs text-zinc-400 font-medium">Ready for conversation.</p>
                  <p className="text-[11px] text-zinc-600 max-w-xs">
                    Speak into your mic or type below. ARAVAN will respond with real voice and text simultaneously.
                  </p>
                </div>
              ) : (
                messages.map((msg) => <MessageBubble key={msg.id} message={msg} />)
              )}
              <div ref={bottomRef} />
            </div>

            {/* Quick Suggestion Pills */}
            <div className="px-3 py-2 border-t border-zinc-850/60 bg-zinc-950/40 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
              {[
                'Who built you?',
                'What time is it?',
                'Tell a cyber joke',
                'What do you know about me?',
                'Open YouTube',
              ].map((pill, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => onSendMessage(pill)}
                  className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-cyan-300 transition-colors whitespace-nowrap"
                >
                  +{pill}
                </button>
              ))}
            </div>

            {/* Input Bar (Reference Screenshot Match) */}
            <form
              onSubmit={handleSend}
              className="p-2.5 border-t border-zinc-800/60 bg-zinc-950/60 flex items-center gap-2"
            >
              <div className="relative flex-1 flex items-center">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Type a message or command..."
                  className="w-full bg-zinc-900/60 border border-zinc-800 focus:border-cyan-500/60 rounded-xl pl-3.5 pr-8 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/40 transition-all font-sans"
                />
                <button
                  type="button"
                  onClick={onToggleMic}
                  className="absolute right-2 text-zinc-400 hover:text-cyan-300 transition-colors"
                  title={isMicActive ? 'Mute microphone' : 'Unmute microphone'}
                >
                  {isMicActive ? <Mic className="w-3.5 h-3.5 text-cyan-400" /> : <MicOff className="w-3.5 h-3.5 text-zinc-500" />}
                </button>
              </div>

              <button
                type="submit"
                disabled={!inputText.trim()}
                className="w-8 h-8 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white flex items-center justify-center disabled:opacity-40 disabled:pointer-events-none transition-all shadow-md shadow-cyan-900/30 shrink-0"
                title="Send message to ARAVAN"
              >
                <Send className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
            </form>
          </>
        ) : (
          <div className="p-2 max-h-[540px] overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-800">
            <CapabilityCard onSelectAction={onSendMessage} />
          </div>
        )}
      </div>
    </aside>
  );
};
