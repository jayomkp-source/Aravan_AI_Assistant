import React, { useState } from 'react';
import { SkullDebugData } from './ThreeSkullScene';
import { Terminal, ChevronDown, ChevronUp } from 'lucide-react';

interface SkullDebugPanelProps {
  debugData: SkullDebugData | null;
  geminiConnected: boolean;
  micActive: boolean;
}

export const SkullDebugPanel: React.FC<SkullDebugPanelProps> = ({
  debugData,
  geminiConnected,
  micActive,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!debugData) return null;

  return (
    <div className="fixed bottom-4 left-4 z-40 font-mono text-[10px] select-none">
      {/* Floating Toggle Pill */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-950/85 border border-cyan-500/40 text-cyan-300 hover:text-white shadow-lg backdrop-blur-md transition-all"
        title="Toggle ARAVAN Skull Telemetry Debug"
      >
        <Terminal className="w-3 h-3 text-cyan-400" />
        <span className="font-semibold uppercase tracking-wider">SKULL ROOT TELEMETRY</span>
        <span className={`w-1.5 h-1.5 rounded-full ${debugData.audioLevel > 0.05 ? 'bg-violet-400 animate-ping' : 'bg-cyan-400'}`} />
        {isExpanded ? <ChevronDown className="w-3 h-3 ml-0.5" /> : <ChevronUp className="w-3 h-3 ml-0.5" />}
      </button>

      {/* Expanded Telemetry HUD (Section 28) */}
      {isExpanded && (
        <div className="mt-2 w-64 p-3 rounded-xl bg-zinc-950/95 border border-cyan-500/40 text-zinc-300 shadow-2xl backdrop-blur-xl space-y-1.5 animate-fade-in">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-1 text-cyan-400 font-bold">
            <span>ARAVAN SKULL ROOT</span>
            <span>LIVE</span>
          </div>

          <div className="flex justify-between">
            <span className="text-zinc-500">CURSOR X:</span>
            <span className="text-cyan-300 font-semibold">{debugData.cursorX}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-zinc-500">CURSOR Y:</span>
            <span className="text-cyan-300 font-semibold">{debugData.cursorY}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-zinc-500">TARGET YAW:</span>
            <span className="text-zinc-300">{debugData.targetYaw}°</span>
          </div>

          <div className="flex justify-between">
            <span className="text-zinc-500">TARGET PITCH:</span>
            <span className="text-zinc-300">{debugData.targetPitch}°</span>
          </div>

          <div className="flex justify-between">
            <span className="text-zinc-500">CURRENT YAW:</span>
            <span className="text-emerald-400 font-semibold">{debugData.currentYaw}°</span>
          </div>

          <div className="flex justify-between">
            <span className="text-zinc-500">CURRENT PITCH:</span>
            <span className="text-emerald-400 font-semibold">{debugData.currentPitch}°</span>
          </div>

          <div className="flex justify-between">
            <span className="text-zinc-500">SKULL ROOT STATUS:</span>
            <span className="text-cyan-300 font-semibold">{debugData.skullRootStatus}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-zinc-500">WEBGL STATUS:</span>
            <span className="text-emerald-400 font-semibold">{debugData.webGLStatus}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-zinc-500">ARAVAN STATE:</span>
            <span className="text-amber-300 uppercase font-semibold">{debugData.aravanState}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-zinc-500">AUDIO LEVEL:</span>
            <div className="flex items-center gap-1.5">
              <span className="text-violet-300 font-semibold">{debugData.audioLevel.toFixed(2)}</span>
              <div className="w-12 bg-zinc-900 rounded-full h-1 overflow-hidden">
                <div
                  className="bg-violet-400 h-full transition-all duration-75"
                  style={{ width: `${Math.min(100, debugData.audioLevel * 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
