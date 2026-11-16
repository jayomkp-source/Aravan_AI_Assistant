import React from 'react';

interface SuggestionChipsProps {
  onSelectSuggestion: (text: string) => void;
  dynamicSuggestions?: string[];
}

export const SuggestionChips: React.FC<SuggestionChipsProps> = ({
  onSelectSuggestion,
  dynamicSuggestions,
}) => {
  const defaultSuggestions = [
    { label: '⚡ Set glow to Hyper', prompt: 'Set your holographic skull glow to hyper mode' },
    { label: '🔴 Glow Crimson Red', prompt: 'Change skull glow color to crimson red' },
    { label: '🟢 Glow Cyber Green', prompt: 'Make your skull glow cyber green' },
    { label: '🟡 Glow Golden Amber', prompt: 'Change skull glow color to golden amber' },
    { label: '🧠 Check Saved Memories', prompt: 'Check your memory storage and list what you know about me' },
    { label: '🔇 Stop mic on speech', prompt: 'Stop listening to microphone during text to speech replies' },
    { label: '💀 3D Skull Mechanics', prompt: 'Explain your interactive 3D holographic skull mechanics' },
    { label: '⚡ Jaw Articulation Test', prompt: 'Test your mandible jaw speech articulation' },
    { label: 'Who built you?', prompt: 'Who built you?' },
  ];

  // If dynamic follow-up suggestions are present, convert to chips
  const dynamicItems = (dynamicSuggestions || []).map((s) => ({
    label: s,
    prompt: s.replace(/^[^\w\s]+/, '').trim(),
  }));

  // Combine unique suggestions
  const items = dynamicItems.length > 0
    ? [...dynamicItems, ...defaultSuggestions.filter((ds) => !dynamicItems.some((di) => di.label.includes(ds.label)))]
    : defaultSuggestions;

  return (
    <div className="w-full max-w-3xl mx-auto space-y-2 select-none">
      <div className="flex items-center justify-between px-1">
        <span className="text-[10px] font-mono tracking-wider text-zinc-400 uppercase font-semibold">
          FOLLOW-UP SUGGESTIONS & PROMPTS
        </span>
        <span className="text-[10px] font-mono text-cyan-400/80">
          Interactive Directives
        </span>
      </div>
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        {items.map((s, idx) => (
          <button
            key={idx}
            onClick={() => onSelectSuggestion(s.prompt)}
            className="whitespace-nowrap px-3.5 py-1.5 rounded-xl bg-zinc-900/70 hover:bg-zinc-800 border border-zinc-800/90 hover:border-cyan-500/60 text-xs font-mono text-zinc-300 hover:text-white transition-all duration-150 shadow-sm shrink-0 flex items-center gap-1.5 active:scale-95"
          >
            <span>{s.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
