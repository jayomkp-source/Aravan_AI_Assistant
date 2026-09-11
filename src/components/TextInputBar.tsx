import React, { useState, useRef, useEffect } from 'react';
import { Send, CornerDownLeft, Sparkles, Volume2, Mic } from 'lucide-react';

interface TextInputBarProps {
  onSend: (text: string) => void;
  disabled?: boolean;
  isSpeaking?: boolean;
  onInterrupt?: () => void;
}

export const TextInputBar: React.FC<TextInputBarProps> = ({
  onSend,
  disabled = false,
  isSpeaking = false,
  onInterrupt,
}) => {
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;

    if (isSpeaking && onInterrupt) {
      onInterrupt();
    }

    onSend(trimmed);
    setText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="relative w-full flex items-center gap-2 bg-zinc-900/90 backdrop-blur-xl border border-zinc-800 focus-within:border-amber-500/50 rounded-2xl p-1.5 shadow-xl transition-all duration-200"
    >
      <div className="pl-3 text-zinc-500 flex items-center justify-center">
        <Sparkles className="w-4 h-4 text-amber-500/80" />
      </div>

      <input
        ref={inputRef}
        id="aravan-text-input"
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder={
          isSpeaking
            ? 'Type to ask and interrupt ARAVAN...'
            : 'Type a message to ARAVAN (or speak anytime)...'
        }
        className="flex-1 bg-transparent py-2 px-1 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none disabled:opacity-50"
      />

      <button
        type="submit"
        id="aravan-send-btn"
        disabled={!text.trim() || disabled}
        className="flex items-center justify-center w-9 h-9 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:hover:bg-amber-500 text-stone-950 transition-all font-medium shadow-md shadow-amber-950/40"
        title="Send text message to ARAVAN"
      >
        <Send className="w-4 h-4 translate-x-0.5" />
      </button>
    </form>
  );
};
