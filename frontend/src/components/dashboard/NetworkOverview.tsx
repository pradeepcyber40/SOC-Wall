import React from 'react';
import { Network, Server, Wifi, WifiOff, HelpCircle, HardDrive, ArrowUpRight } from 'lucide-react';
import { SubnetItem } from '../../types';

interface NetworkOverviewProps {
  subnets: SubnetItem[];
  onSelectSubnet: (cidr: string) => void;
}

export const NetworkOverview: React.FC<NetworkOverviewProps> = ({ subnets, onSelectSubnet }) => {
  return (
    <div className="bg-[#0d1321] border border-[#1c2842] rounded-xl shadow-soc-panel overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3.5 bg-[#11192c] border-b border-[#1c2842] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Network className="w-4 h-4 text-cyan-400" />
          <h2 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
            Network Topology & Subnet Telemetry
          </h2>
        </div>
        <span className="text-xs font-mono text-slate-400">
          {subnets.length} Monitored Segments
        </span>
      </div>

      {/* Subnet Grid / Cards */}
      <div className="p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {subnets.map((sub) => {
          const utilPct = Math.round((sub.discovered / (sub.total_possible || 254)) * 100);
          
          return (
            <div
              key={sub.cidr}
              onClick={() => onSelectSubnet(sub.cidr)}
              className="p-4 rounded-lg bg-[#090d16] border border-[#1c2842] hover:border-cyan-500/50 hover:bg-[#141d30] cursor-pointer transition-all duration-200 group flex flex-col justify-between"
            >
              {/* CIDR & Name */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-mono text-base font-bold text-cyan-300 group-hover:text-cyan-200">
                    {sub.cidr}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#1c2842] text-slate-300 font-semibold">
                      {sub.vlan}
                    </span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400 transition-colors" />
                  </div>
                </div>

                <p className="text-xs text-slate-300 font-medium mb-1 line-clamp-1">
                  {sub.name}
                </p>
                <p className="text-[11px] text-slate-500 font-mono mb-3">
                  Gateway: {sub.gateway} • {sub.location}
                </p>
              </div>

              {/* Stats Summary matching exact example */}
              <div className="space-y-2 pt-2 border-t border-[#18233a]">
                <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                  <span>Capacity</span>
                  <span className="text-slate-200 font-semibold">{sub.total_possible} possible addresses</span>
                </div>

                {/* Utilization meter */}
                <div className="w-full h-1.5 bg-[#141d30] rounded-full overflow-hidden border border-[#1c2842]">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500 rounded-full"
                    style={{ width: `${Math.min(100, utilPct)}%` }}
                  />
                </div>

                {/* Metric pill breakdown */}
                <div className="grid grid-cols-4 gap-1.5 pt-1 text-center font-mono">
                  <div className="p-1.5 rounded bg-[#0d1321] border border-[#1c2842]">
                    <div className="text-[10px] text-slate-400">Discovered</div>
                    <div className="text-xs font-bold text-cyan-300">{sub.discovered}</div>
                  </div>
                  <div className="p-1.5 rounded bg-[#0d1321] border border-emerald-900/40">
                    <div className="text-[10px] text-slate-400">Online</div>
                    <div className="text-xs font-bold text-emerald-400">{sub.online}</div>
                  </div>
                  <div className="p-1.5 rounded bg-[#0d1321] border border-rose-900/40">
                    <div className="text-[10px] text-slate-400">Offline</div>
                    <div className="text-xs font-bold text-rose-400">{sub.offline}</div>
                  </div>
                  <div className="p-1.5 rounded bg-[#0d1321] border border-purple-900/40">
                    <div className="text-[10px] text-slate-400">Unknown</div>
                    <div className="text-xs font-bold text-purple-400">{sub.unknown}</div>
                  </div>
                </div>

                {sub.network_devices > 0 && (
                  <div className="text-[11px] font-mono text-slate-400 flex items-center justify-between pt-1">
                    <span>Network Infra (Switches/Routers)</span>
                    <span className="text-amber-400 font-bold">{sub.network_devices} units</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
