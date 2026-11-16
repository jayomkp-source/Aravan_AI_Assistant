import React, { useState } from 'react';
import { ConversationMessage } from '../types';
import { SkullIcon } from './SkullIcon';
import { Copy, Check, ExternalLink, Link2 } from 'lucide-react';

interface MessageBubbleProps {
  message: ConversationMessage;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';

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

  const textLower = message.text.toLowerCase();
  const isSecMessage = textLower.includes('give me a sec');
  const isDoneYouTube = textLower.includes('youtube is open');
  const isSearchingLofi = textLower.includes('sure, searching now');

  return (
    <div
      id={`msg-bubble-${message.id}`}
      className={`group w-full flex flex-col text-xs leading-relaxed transition-all duration-200 ${
        isUser ? 'items-end' : 'items-start'
      }`}
    >
      <div
        className={`relative max-w-[94%] sm:max-w-[88%] rounded-2xl p-3 shadow-xl backdrop-blur-xl transition-all border ${
          isUser
            ? 'bg-[#18132b]/80 border-zinc-700/50 text-zinc-100 shadow-zinc-950/40'
            : 'bg-[#120d2d]/85 border-purple-900/40 text-zinc-100 shadow-purple-950/20'
        }`}
      >
        {/* Header: Sender & Timestamp (Screenshot Match) */}
        <div className="flex items-center justify-between gap-3 text-[11px] mb-1.5 font-mono select-none">
          <div className="flex items-center gap-2">
            {!isUser && (
              <div className="w-5 h-5 rounded-md bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center p-0.5">
                <SkullIcon className="w-3.5 h-3.5 text-cyan-400" />
              </div>
            )}
            <span className={`font-semibold tracking-wide ${isUser ? 'text-zinc-300' : 'text-cyan-300'}`}>
              {isUser ? 'You' : 'ARAVAN'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-zinc-500 text-[10px]">
            <span>{formattedTime}</span>
            <button
              onClick={handleCopy}
              className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-white/10 text-zinc-400 hover:text-zinc-200 transition-all"
              title="Copy message"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>
        </div>

        {/* Message Content */}
        <div className="text-zinc-200 text-xs sm:text-[13px] leading-relaxed whitespace-pre-wrap font-sans">
          {message.text}
          {message.isStreaming && (
            <span className="inline-block w-1.5 h-3.5 ml-1 bg-cyan-400 animate-pulse align-middle" />
          )}
        </div>

        {/* Screenshot Matched Badges */}
        {!isUser && isSecMessage && (
          <div className="mt-2 pt-1.5 border-t border-purple-900/30 flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-950/60 border border-purple-500/40 text-[10px] font-mono text-purple-300">
              <Link2 className="w-3 h-3 text-purple-400" />
              Opening YouTube...
            </span>
          </div>
        )}

        {/* Detected Website Launch Cards (Reliable Website Opening Patch) */}
        {!isUser && (() => {
          // Check for explicit URLs in text
          const urlMatch = message.text.match(/https?:\/\/[^\s)"]+/);
          if (urlMatch) {
            const url = urlMatch[0];
            let domain = url;
            try {
              domain = new URL(url).hostname;
            } catch {
              // ignore
            }
            return (
              <div className="mt-2 pt-1.5 border-t border-purple-900/30 flex items-center gap-2">
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-cyan-950/80 border border-cyan-500/50 text-[10px] font-mono text-cyan-300 hover:text-white hover:bg-cyan-900/60 transition-all shadow-md"
                >
                  <ExternalLink className="w-3 h-3 text-cyan-400" />
                  <span>Launch {domain} ↗</span>
                </a>
              </div>
            );
          }

          if (isDoneYouTube) {
            return (
              <div className="mt-2 pt-1.5 border-t border-purple-900/30 flex items-center gap-2">
                <a
                  href="https://www.youtube.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-950/60 border border-cyan-500/40 text-[10px] font-mono text-cyan-300 hover:text-white transition-colors"
                >
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span>youtube.com</span>
                  <ExternalLink className="w-2.5 h-2.5 text-cyan-400 ml-0.5" />
                </a>
              </div>
            );
          }

          if (isSearchingLofi) {
            return (
              <div className="mt-2 pt-1.5 border-t border-purple-900/30 flex items-center gap-2">
                <a
                  href="https://www.youtube.com/results?search_query=lofi+music"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-950/60 border border-purple-500/40 text-[10px] font-mono text-purple-300 hover:text-white transition-colors"
                >
                  <Link2 className="w-3 h-3 text-purple-400" />
                  <span>lofi music</span>
                  <ExternalLink className="w-2.5 h-2.5 text-purple-400 ml-0.5" />
                </a>
              </div>
            );
          }

          return null;
        })()}
      </div>
    </div>
  );
};
