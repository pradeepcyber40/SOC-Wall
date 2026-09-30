import React from 'react';
import { 
  Monitor, 
  Laptop, 
  Smartphone, 
  Server, 
  Network, 
  GitCommit, 
  ShieldCheck, 
  Printer, 
  Video, 
  Radio, 
  Cpu, 
  HelpCircle, 
  ExternalLink,
  Clock,
  Layers,
  Terminal
} from 'lucide-react';
import { CategorySummary } from '../../types';

interface CategoryTableProps {
  categories: CategorySummary[];
  onSelectCategory: (category: string) => void;
}

const getCategoryIcon = (category: string) => {
  const c = category.toLowerCase();
  if (c.includes('computer')) return Monitor;
  if (c.includes('laptop')) return Laptop;
  if (c.includes('mobile')) return Smartphone;
  if (c.includes('server')) return Server;
  if (c.includes('router')) return Network;
  if (c.includes('switch')) return GitCommit;
  if (c.includes('firewall')) return ShieldCheck;
  if (c.includes('printer')) return Printer;
  if (c.includes('camera')) return Video;
  if (c.includes('access point')) return Radio;
  if (c.includes('iot')) return Cpu;
  if (c.includes('unknown')) return HelpCircle;
  return Layers;
};

const getRiskBadge = (risk: string) => {
  switch (risk) {
    case 'Critical':
      return (
        <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-rose-950/80 text-rose-400 border border-rose-600/60 shadow-glow-red animate-pulse">
          Critical
        </span>
      );
    case 'High':
      return (
        <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-amber-950/80 text-amber-400 border border-amber-600/50">
          High
        </span>
      );
    case 'Medium':
      return (
        <span className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-yellow-950/70 text-yellow-400 border border-yellow-600/40">
          Medium
        </span>
      );
    case 'Low':
      return (
        <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-cyan-950/70 text-cyan-400 border border-cyan-700/40">
          Low
        </span>
      );
    default:
      return (
        <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-slate-800/80 text-slate-400 border border-slate-700">
          None
        </span>
      );
  }
};

export const CategoryTable: React.FC<CategoryTableProps> = ({ categories, onSelectCategory }) => {
  const totalFleetAssets = categories.reduce((acc, c) => acc + c.total, 0);

  return (
    <div className="bg-[#0d1321] border border-[#1c2842] rounded-xl shadow-soc-panel overflow-hidden">
      {/* Header bar */}
      <div className="px-5 py-3.5 bg-[#11192c] border-b border-[#1c2842] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-[#00d2ff] animate-ping-slow" />
          <h2 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
            Asset Categories Fleet Matrix
          </h2>
        </div>
        <div className="flex items-center gap-3 text-xs font-mono text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" /> &gt;90% Healthy
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500" /> 80-90% Attention
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500" /> &lt;80% Impaired
          </span>
        </div>
      </div>

      {totalFleetAssets === 0 && (
        <div className="p-3 bg-cyan-950/20 border-b border-[#1c2842] text-xs font-mono text-cyan-300 flex items-center gap-2">
          <Terminal className="w-4 h-4 text-cyan-400" />
          <span>No endpoints reporting telemetry yet. Deploy <strong>RasiSOC-Agent.exe</strong> on Windows or trigger CIDR network sweep.</span>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-[#090d16]/70 border-b border-[#1c2842] text-slate-400 font-mono uppercase text-[11px] tracking-wider">
              <th className="py-3 px-5">Category</th>
              <th className="py-3 px-4 text-right">Total</th>
              <th className="py-3 px-4 text-right">Online</th>
              <th className="py-3 px-4 text-right">Offline</th>
              <th className="py-3 px-6">Percentage Online</th>
              <th className="py-3 px-4 text-center">Risk</th>
              <th className="py-3 px-4">Last Updated</th>
              <th className="py-3 px-5 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#18233a]">
            {categories.map((row) => {
              const Icon = getCategoryIcon(row.category);
              const isLowPercent = row.percentage_online < 85 && row.total > 0;
              const isMediumPercent = row.percentage_online >= 85 && row.percentage_online < 93 && row.total > 0;

              return (
                <tr
                  key={row.category}
                  onClick={() => onSelectCategory(row.category)}
                  className="hover:bg-[#141d30] cursor-pointer transition-colors group select-none"
                >
                  {/* Category Name & Icon */}
                  <td className="py-3 px-5">
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 rounded bg-[#11192c] border border-[#1c2842] text-cyan-400 group-hover:border-cyan-500/50 group-hover:text-cyan-300 transition-colors">
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="font-semibold text-slate-200 group-hover:text-white font-mono text-sm">
                        {row.category}
                      </span>
                    </div>
                  </td>

                  {/* Total */}
                  <td className="py-3 px-4 text-right font-mono font-bold text-slate-200">
                    {row.total.toLocaleString()}
                  </td>

                  {/* Online */}
                  <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400">
                    {row.online.toLocaleString()}
                  </td>

                  {/* Offline */}
                  <td className="py-3 px-4 text-right font-mono font-bold text-rose-400">
                    {row.offline > 0 ? row.offline.toLocaleString() : (
                      <span className="text-slate-500 font-normal">0</span>
                    )}
                  </td>

                  {/* Percentage Online Visual Bar */}
                  <td className="py-3 px-6 min-w-[200px]">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 bg-[#141d30] rounded-full overflow-hidden p-[1px] border border-[#1c2842]">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isLowPercent ? 'bg-gradient-to-r from-rose-600 to-amber-500' :
                            isMediumPercent ? 'bg-gradient-to-r from-amber-500 to-emerald-400' :
                            'bg-gradient-to-r from-emerald-500 to-cyan-400'
                          }`}
                          style={{ width: `${Math.min(100, Math.max(0, row.percentage_online))}%` }}
                        />
                      </div>
                      <span className={`font-mono font-bold text-xs w-12 text-right ${
                        isLowPercent ? 'text-rose-400' : isMediumPercent ? 'text-amber-400' : 'text-emerald-400'
                      }`}>
                        {row.percentage_online.toFixed(1)}%
                      </span>
                    </div>
                  </td>

                  {/* Risk Badge */}
                  <td className="py-3 px-4 text-center">
                    {getRiskBadge(row.risk)}
                  </td>

                  {/* Last Updated */}
                  <td className="py-3 px-4 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-slate-500" />
                      {row.last_updated}
                    </span>
                  </td>

                  {/* Action Button */}
                  <td className="py-3 px-5 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectCategory(row.category);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#11192c] border border-[#1c2842] hover:border-cyan-500 hover:text-cyan-300 text-slate-300 font-mono text-[11px] font-semibold transition-all"
                    >
                      <span>View</span>
                      <ExternalLink className="w-3 h-3 text-cyan-400" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
