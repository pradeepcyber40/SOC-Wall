import React, { useState } from 'react';
import { 
  Radio, 
  Pause, 
  Play, 
  Trash2, 
  CheckCircle2, 
  AlertTriangle, 
  Flame, 
  PlusCircle, 
  Activity, 
  ShieldAlert,
  SlidersHorizontal,
  ExternalLink
} from 'lucide-react';
import { SOCLiveEvent } from '../../types';

interface LiveEventFeedProps {
  events: SOCLiveEvent[];
  onClear: () => void;
  onSelectAsset?: (assetId: string) => void;
}

export const LiveEventFeed: React.FC<LiveEventFeedProps> = ({ events, onClear, onSelectAsset }) => {
  const [isPaused, setIsPaused] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');

  const filteredEvents = events.filter((evt) => {
    if (filterType === 'all') return true;
    if (filterType === 'security') return ['SECURITY', 'ALERT', 'VULN'].includes(evt.type);
    if (filterType === 'state') return ['ONLINE', 'OFFLINE'].includes(evt.type);
    if (filterType === 'discovery') return ['NEW ASSET', 'POLICY'].includes(evt.type);
    return true;
  });

  const getTagColor = (type: string) => {
    switch (type) {
      case 'SECURITY':
        return 'bg-rose-950/90 text-rose-300 border-rose-600/70 shadow-glow-red animate-pulse';
      case 'ALERT':
        return 'bg-amber-950/80 text-amber-300 border-amber-600/60';
      case 'ONLINE':
        return 'bg-emerald-950/80 text-emerald-300 border-emerald-600/60';
      case 'OFFLINE':
        return 'bg-slate-800 text-slate-300 border-slate-600';
      case 'NEW ASSET':
        return 'bg-cyan-950/80 text-cyan-300 border-cyan-600/60';
      case 'VULN':
        return 'bg-orange-950/80 text-orange-300 border-orange-600/60';
      default:
        return 'bg-indigo-950/80 text-indigo-300 border-indigo-600/60';
    }
  };

  return (
    <div className="bg-[#0d1321] border border-[#1c2842] rounded-xl shadow-soc-panel flex flex-col h-[400px]">
      {/* Feed Header */}
      <div className="px-4 py-3 bg-[#11192c] border-b border-[#1c2842] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="relative flex items-center justify-center">
            <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
              <span>Live SOC Telemetry Stream</span>
              <span className="px-1.5 py-0.2 rounded text-[10px] bg-cyan-950 text-cyan-400 font-mono border border-cyan-800">
                WS ACTIVE
              </span>
            </h2>
          </div>
        </div>

        {/* Filter & Controls */}
        <div className="flex items-center gap-2">
          {/* Tag filters */}
          <div className="flex items-center bg-[#090d16] p-0.5 rounded border border-[#1c2842] text-[10px] font-mono">
            {['all', 'security', 'state', 'discovery'].map((f) => (
              <button
                key={f}
                onClick={() => setFilterType(f)}
                className={`px-2 py-0.5 rounded capitalize transition-colors ${
                  filterType === f ? 'bg-[#1c2842] text-cyan-300 font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Pause / Resume */}
          <button
            onClick={() => setIsPaused(!isPaused)}
            title={isPaused ? 'Resume live feed' : 'Pause live feed'}
            className={`p-1.5 rounded border text-xs transition-all ${
              isPaused 
                ? 'bg-amber-950/50 border-amber-600 text-amber-300' 
                : 'bg-[#141d30] border-[#1c2842] text-slate-300 hover:text-white'
            }`}
          >
            {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
          </button>

          {/* Clear Buffer */}
          <button
            onClick={onClear}
            title="Clear buffer"
            className="p-1.5 rounded bg-[#141d30] border border-[#1c2842] text-slate-400 hover:text-rose-400 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Stream List */}
      <div className="flex-1 p-3 overflow-y-auto font-mono text-xs space-y-2 select-none">
        {filteredEvents.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500">
            <Activity className="w-8 h-8 text-slate-600 mb-2 animate-pulse" />
            <p>Listening for real-time telemetry events...</p>
            <span className="text-[10px] text-slate-600">Probes, Wazuh agents, and network traps active</span>
          </div>
        ) : (
          filteredEvents.map((evt) => (
            <div
              key={evt.id}
              onClick={() => onSelectAsset && evt.asset_id && onSelectAsset(evt.asset_id)}
              className="p-2.5 rounded-lg bg-[#090d16]/80 border border-[#1c2842] hover:border-cyan-500/40 hover:bg-[#141d30] transition-all cursor-pointer flex items-start justify-between gap-3 group"
            >
              <div className="flex items-start gap-2.5 min-w-0">
                {/* Event Type Badge */}
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase border shrink-0 ${getTagColor(evt.type)}`}>
                  [{evt.type}]
                </span>

                {/* Event Message */}
                <span className="text-slate-200 text-xs font-mono leading-relaxed truncate group-hover:text-white">
                  {evt.message.replace(/^\[.*?\]\s*/, '')}
                </span>
              </div>

              {/* Timestamp & Quick Action */}
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[10px] text-slate-500 font-mono">
                  {evt.timestamp}
                </span>
                <ExternalLink className="w-3 h-3 text-slate-600 group-hover:text-cyan-400 transition-colors" />
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer ticker */}
      <div className="px-4 py-1.5 bg-[#090d16] border-t border-[#1c2842] flex items-center justify-between text-[10px] font-mono text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Buffered Events: {events.length}
        </span>
        {isPaused && (
          <span className="text-amber-400 font-bold uppercase tracking-wider">
            FEED PAUSED (BUFFERING)
          </span>
        )}
        <span className="text-slate-500">Latency: 4ms • Stream: Wazuh SIEM</span>
      </div>
    </div>
  );
};
