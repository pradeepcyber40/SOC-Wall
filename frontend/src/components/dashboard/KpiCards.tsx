import React from 'react';
import { 
  Server, 
  Wifi, 
  WifiOff, 
  AlertTriangle, 
  Flame, 
  HelpCircle
} from 'lucide-react';
import { KPISummary } from '../../types';

interface KpiCardsProps {
  kpis: KPISummary | null;
  onFilterClick?: (filterType: string, value: string) => void;
  onOpenAlerts?: () => void;
}

export const KpiCards: React.FC<KpiCardsProps> = ({ kpis, onFilterClick, onOpenAlerts }) => {
  if (!kpis) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-28 bg-[#0d1321] border border-[#1c2842] rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  const total = kpis.total_assets;
  const onlinePct = total > 0 ? ((kpis.online_assets / total) * 100).toFixed(1) : "0.0";

  const cards = [
    {
      id: 'total',
      label: 'TOTAL ASSETS',
      value: total.toLocaleString(),
      subtext: total === 0 ? 'No endpoints reported yet' : 'Real Hardware Discovered',
      icon: Server,
      color: 'text-cyan-400',
      borderColor: 'border-cyan-500/30',
      bgColor: 'bg-cyan-950/20',
      glow: 'shadow-glow-cyan',
      onClick: () => onFilterClick && onFilterClick('status', 'All')
    },
    {
      id: 'online',
      label: 'ONLINE ASSETS',
      value: kpis.online_assets.toLocaleString(),
      subtext: total === 0 ? 'Waiting for agents...' : `${onlinePct}% Operational`,
      icon: Wifi,
      color: 'text-emerald-400',
      borderColor: 'border-emerald-500/30',
      bgColor: 'bg-emerald-950/20',
      glow: 'shadow-glow-green',
      onClick: () => onFilterClick && onFilterClick('status', 'ONLINE')
    },
    {
      id: 'offline',
      label: 'OFFLINE ASSETS',
      value: (kpis.offline_assets + (kpis.warning_assets || 0)).toLocaleString(),
      subtext: total === 0 ? '0 In Warning' : `${kpis.warning_assets || 0} In Warning / Timeout`,
      icon: WifiOff,
      color: 'text-slate-400',
      borderColor: 'border-slate-600/40',
      bgColor: 'bg-slate-900/40',
      glow: '',
      onClick: () => onFilterClick && onFilterClick('status', 'OFFLINE')
    },
    {
      id: 'alerts',
      label: 'SECURITY ALERTS',
      value: kpis.security_alerts.toLocaleString(),
      subtext: 'Wazuh & OpenSearch Telemetry',
      icon: AlertTriangle,
      color: 'text-amber-400',
      borderColor: 'border-amber-500/40',
      bgColor: 'bg-amber-950/20',
      glow: '',
      onClick: () => onOpenAlerts && onOpenAlerts()
    },
    {
      id: 'critical',
      label: 'CRITICAL ALERTS',
      value: kpis.critical_alerts.toLocaleString(),
      subtext: kpis.critical_alerts === 0 ? 'No Critical Incidents' : 'Requires Immediate Action',
      icon: Flame,
      color: 'text-rose-400',
      borderColor: 'border-rose-500/50',
      bgColor: 'bg-rose-950/25',
      glow: kpis.critical_alerts > 0 ? 'shadow-glow-red' : '',
      badge: kpis.critical_alerts > 0 ? 'URGENT' : undefined,
      onClick: () => onOpenAlerts && onOpenAlerts()
    },
    {
      id: 'unknown',
      label: 'UNKNOWN ASSETS',
      value: kpis.unknown_assets.toLocaleString(),
      subtext: 'Unclassified Probes',
      icon: HelpCircle,
      color: 'text-purple-400',
      borderColor: 'border-purple-500/40',
      bgColor: 'bg-purple-950/20',
      glow: '',
      onClick: () => onFilterClick && onFilterClick('status', 'UNKNOWN')
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.id}
            onClick={card.onClick}
            className={`relative p-3.5 rounded-lg bg-[#0d1321] border ${card.borderColor} ${card.bgColor} ${card.glow} cursor-pointer hover:scale-[1.02] hover:border-opacity-100 transition-all duration-200 select-none group`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono tracking-wider text-slate-400 font-semibold uppercase">
                {card.label}
              </span>
              <div className="p-1.5 rounded-md bg-[#11192c] border border-[#1c2842] group-hover:border-[#2d3f66] transition-colors">
                <Icon className={`w-4 h-4 ${card.color}`} />
              </div>
            </div>

            <div className="mt-2 flex items-baseline justify-between">
              <span className={`text-2xl sm:text-3xl font-black font-mono tracking-tight ${card.color}`}>
                {card.value}
              </span>
              {card.badge && (
                <span className="px-1.5 py-0.5 text-[9px] font-bold font-mono tracking-widest bg-rose-600/90 text-white rounded animate-pulse">
                  {card.badge}
                </span>
              )}
            </div>

            <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400 font-mono">
              <span className="truncate">{card.subtext}</span>
            </div>

            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#1c2842] to-transparent group-hover:via-cyan-400/50 transition-colors" />
          </div>
        );
      })}
    </div>
  );
};
