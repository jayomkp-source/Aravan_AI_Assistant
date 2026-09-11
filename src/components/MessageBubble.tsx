/**
 * MessageBubble - Individual visual container for conversational responses
 * 
 * Guarantees:
 * - Each user and assistant response renders as its own distinct DOM component
 * - Distinct styling between User (compact, right) and ARAVAN (spacious, glowing, left)
 * - Live streaming indicators without creating duplicate bubbles
 */

import React, { useState } from 'react';
import { ConversationMessage } from '../types';
import { Bot, User, Mic, FileText, Copy, Check } from 'lucide-react';

interface MessageBubbleProps {
  message: ConversationMessage;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';
  const isVoice = message.source === 'voice';

  const handleCopy = () => {
    if (!message.text) return;
    navigator.clipboard?.writeText(message.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formattedTime = new Date(message.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      id={`msg-bubble-${message.id}`}
      className={`group w-full flex gap-3 text-xs leading-relaxed transition-all duration-200 ${
        isUser ? 'flex-row-reverse' : 'flex-row'
      }`}
    >
      {/* Avatar Icon */}
      <div
        className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 border shadow-sm transition-transform duration-200 group-hover:scale-105 ${
          isUser
            ? 'bg-amber-950/70 border-amber-500/40 text-amber-300'
            : 'bg-zinc-900 border-zinc-700/80 text-amber-400 shadow-amber-950/20'
        }`}
      >
        {isUser ? (
          <User className="w-3.5 h-3.5" />
        ) : (
          <Bot className="w-3.5 h-3.5 text-amber-400" />
        )}
      </div>

      {/* Message Box */}
      <div
        className={`relative max-w-[85%] sm:max-w-[78%] rounded-2xl px-4 py-3 shadow-md transition-all ${
          isUser
            ? 'bg-gradient-to-br from-amber-600/90 to-amber-700/95 text-zinc-950 font-medium rounded-tr-sm shadow-amber-950/20 border border-amber-500/50'
            : 'bg-zinc-900/85 border border-zinc-800/90 text-zinc-100 rounded-tl-sm backdrop-blur-xl shadow-black/40 hover:border-zinc-700/80'
        }`}
      >
        {/* Header bar */}
        <div
          className={`flex items-center justify-between gap-3 text-[10px] mb-1.5 font-mono select-none ${
            isUser ? 'text-amber-950/75' : 'text-zinc-400'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <span className="font-semibold tracking-wide">
              {isUser ? 'You' : 'ARAVAN'}
            </span>
            <span>•</span>
            <span className="flex items-center gap-0.5">
              {isVoice ? (
                <>
                  <Mic className="w-2.5 h-2.5 inline" /> Voice
                </>
              ) : (
                <>
                  <FileText className="w-2.5 h-2.5 inline" /> Text
                </>
              )}
            </span>
            {message.isStreaming && (
              <span className="inline-flex items-center gap-1 text-amber-300 animate-pulse font-semibold ml-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                Streaming
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
            <span className="text-[9px]">{formattedTime}</span>
            <button
              onClick={handleCopy}
              className={`p-0.5 rounded hover:bg-black/10 transition-colors ${
                isUser ? 'text-amber-950 hover:text-black' : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Copy text"
            >
              {copied ? (
                <Check className="w-2.5 h-2.5 text-emerald-400" />
              ) : (
                <Copy className="w-2.5 h-2.5" />
              )}
            </button>
          </div>
        </div>

        {/* Message Content Body */}
        <div className="whitespace-pre-wrap break-words leading-relaxed text-[13px] tracking-normal font-sans">
          {message.text}
        </div>
      </div>
    </div>
  );
};
