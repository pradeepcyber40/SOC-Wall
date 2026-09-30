import React, { useState } from 'react';
import { 
  ShieldAlert, 
  Activity, 
  Search, 
  Bell, 
  Settings, 
  LogOut, 
  Volume2, 
  VolumeX, 
  Maximize2, 
  Minimize2, 
  ChevronDown, 
  CheckCircle2, 
  AlertTriangle,
  UserCheck,
  Server,
  Layers,
  Radio
} from 'lucide-react';
import { switchUserPersona, getCurrentRole, getCurrentUserFullName } from '../../services/api';
import { SecurityAlertItem } from '../../types';

interface NavbarProps {
  wsConnected: boolean;
  activeEnvironment: string;
  onEnvironmentChange: (env: string) => void;
  onGlobalSearch: (term: string) => void;
  onOpenAlerts: () => void;
  onOpenSettings: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  recentAlerts: SecurityAlertItem[];
  currentRole: string;
  onRoleChanged: (newRole: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  wsConnected,
  activeEnvironment,
  onEnvironmentChange,
  onGlobalSearch,
  onOpenAlerts,
  onOpenSettings,
  soundEnabled,
  onToggleSound,
  recentAlerts,
  currentRole,
  onRoleChanged
}) => {
  const [searchInput, setSearchInput] = useState('');
  const [showEnvDropdown, setShowEnvDropdown] = useState(false);
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [showNotificationPopup, setShowNotificationPopup] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const environments = [
    { id: 'prod', name: 'Production HQ (Tier-3)', badge: 'CORP-NET' },
    { id: 'staging', name: 'Staging DC-2 (Lab)', badge: 'DEV-VLAN' },
    { id: 'dmz', name: 'DMZ & Perimeter Fabric', badge: 'EXTERNAL' },
    { id: 'isolated', name: 'Air-Gapped SCADA Grid', badge: 'RESTRICTED' },
  ];

  const roles = ['Super Admin', 'SOC Admin', 'SOC Analyst', 'Viewer'];

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      onGlobalSearch(searchInput.trim());
    }
  };

  const handleRoleSelect = async (role: string) => {
    try {
      await switchUserPersona(role);
      onRoleChanged(role);
      setShowRoleDropdown(false);
    } catch (e) {
      console.error('Role switch failed', e);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
        setIsFullscreen(false);
      }
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-[#090d16] border-b border-[#1c2842] shadow-2xl backdrop-blur-md">
      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        
        {/* Brand & Status Beacon */}
        <div className="flex items-center gap-4 min-w-fit">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-lg bg-[#0f172a] border border-[#00d2ff]/40 shadow-glow-cyan">
              <ShieldAlert className="w-5 h-5 text-[#00d2ff]" />
              {wsConnected && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black tracking-wider text-white font-mono uppercase">
                  Rasi NovaTech
                </span>
                <span className="px-1.5 py-0.5 text-[10px] font-bold tracking-widest bg-cyan-950/80 text-[#00d2ff] border border-[#00d2ff]/30 rounded">
                  SOC WALL
                </span>
              </div>
              <p className="text-[11px] text-slate-400 tracking-wide font-mono flex items-center gap-1.5">
                <span>DEFENSE & ASSET RADAR</span>
                <span className="text-slate-600">•</span>
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <Radio className="w-2.5 h-2.5 animate-pulse text-emerald-400" />
                  WAZUH / OPENSEARCH ACTIVE
                </span>
              </p>
            </div>
          </div>

          <div className="h-6 w-px bg-[#1c2842] hidden md:block" />

          {/* Environment Selector Dropdown */}
          <div className="relative hidden lg:block">
            <button
              onClick={() => setShowEnvDropdown(!showEnvDropdown)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#0d1321] border border-[#1c2842] hover:border-cyan-500/50 text-xs text-slate-200 transition-all"
            >
              <Server className="w-3.5 h-3.5 text-cyan-400" />
              <span className="font-mono text-cyan-300 font-medium">
                {environments.find(e => e.id === activeEnvironment)?.name || 'Production HQ'}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {showEnvDropdown && (
              <div className="absolute left-0 mt-2 w-64 bg-[#0d1321] border border-[#1c2842] rounded-lg shadow-2xl py-1 z-50">
                <div className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-slate-400 border-b border-[#1c2842]">
                  Target Environment Scope
                </div>
                {environments.map((env) => (
                  <button
                    key={env.id}
                    onClick={() => {
                      onEnvironmentChange(env.id);
                      setShowEnvDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-[#141d30] transition-colors ${
                      activeEnvironment === env.id ? 'text-[#00d2ff] bg-cyan-950/20 font-medium' : 'text-slate-300'
                    }`}
                  >
                    <span>{env.name}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#1c2842] text-slate-400">
                      {env.badge}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Global Search Bar */}
        <div className="flex-1 max-w-md hidden sm:block">
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search hostname, IP (192.168.x.x), MAC, Serial, or CVE..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 bg-[#0d1321] border border-[#1c2842] focus:border-[#00d2ff] focus:ring-1 focus:ring-[#00d2ff] rounded-md text-xs text-slate-100 placeholder-slate-500 font-mono transition-all outline-none"
            />
            {searchInput && (
              <button 
                type="button" 
                onClick={() => { setSearchInput(''); onGlobalSearch(''); }}
                className="absolute right-2.5 top-2 text-xs text-slate-400 hover:text-white"
              >
                ✕
              </button>
            )}
          </form>
        </div>

        {/* Status Indicators & Right Controls */}
        <div className="flex items-center gap-3">
          
          {/* Current System Status Badge */}
          <div className="hidden xl:flex items-center gap-2 px-3 py-1 bg-[#0d1321] border border-[#1c2842] rounded-md">
            <Activity className={`w-3.5 h-3.5 ${wsConnected ? 'text-emerald-400 animate-pulse' : 'text-amber-500'}`} />
            <span className="text-[11px] font-mono tracking-tight text-slate-300">
              {wsConnected ? 'SYSTEMS OPERATIONAL' : 'RECONNECTING TELEMETRY'}
            </span>
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping-slow" />
          </div>

          {/* Tactical Audio Toggle */}
          <button
            onClick={onToggleSound}
            title={soundEnabled ? "Mute tactical audio alerts" : "Enable tactical audio alerts"}
            className={`p-2 rounded-md border transition-all ${
              soundEnabled 
                ? 'bg-cyan-950/30 border-cyan-500/40 text-cyan-400' 
                : 'bg-[#0d1321] border-[#1c2842] text-slate-400 hover:text-slate-200'
            }`}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
          </button>

          {/* Fullscreen Wall Toggle */}
          <button
            onClick={toggleFullscreen}
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen SOC Wall Mode"}
            className="p-2 rounded-md bg-[#0d1321] border border-[#1c2842] text-slate-400 hover:text-cyan-400 hover:border-cyan-500/40 transition-all"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Notifications Drawer Toggle */}
          <div className="relative">
            <button
              onClick={() => setShowNotificationPopup(!showNotificationPopup)}
              className="relative p-2 rounded-md bg-[#0d1321] border border-[#1c2842] text-slate-300 hover:text-white transition-all"
            >
              <Bell className="w-4 h-4 text-amber-400" />
              {recentAlerts.length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[9px] font-bold text-white shadow-glow-red">
                  {recentAlerts.length}
                </span>
              )}
            </button>

            {/* Notification Popup Dropdown */}
            {showNotificationPopup && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-[#0d1321] border border-[#1c2842] rounded-lg shadow-2xl z-50 overflow-hidden">
                <div className="p-3 bg-[#11192c] border-b border-[#1c2842] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold text-white font-mono uppercase tracking-wide">
                      Active Threat Feeds ({recentAlerts.length})
                    </span>
                  </div>
                  <button 
                    onClick={() => { setShowNotificationPopup(false); onOpenAlerts(); }}
                    className="text-[11px] text-cyan-400 hover:underline font-mono"
                  >
                    View All Alerts →
                  </button>
                </div>
                <div className="max-h-72 overflow-y-auto divide-y divide-[#1c2842]">
                  {recentAlerts.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400">
                      No critical security incidents unaddressed.
                    </div>
                  ) : (
                    recentAlerts.slice(0, 5).map((alt) => (
                      <div key={alt.alert_id} className="p-3 hover:bg-[#141d30] transition-colors">
                        <div className="flex items-center justify-between text-[11px] mb-1">
                          <span className={`font-bold font-mono px-1.5 py-0.5 rounded text-[10px] ${
                            alt.severity === 'Critical' ? 'bg-rose-950/80 text-rose-400 border border-rose-700/50' :
                            alt.severity === 'High' ? 'bg-amber-950/80 text-amber-400 border border-amber-700/50' :
                            'bg-cyan-950/80 text-cyan-400 border border-cyan-700/50'
                          }`}>
                            {alt.severity}
                          </span>
                          <span className="font-mono text-slate-400 text-[10px]">
                            {new Date(alt.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-slate-200 line-clamp-1">{alt.alert_type}</p>
                        <p className="text-[11px] text-slate-400 font-mono truncate">{alt.asset_hostname} • {alt.source}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Admin Profile & Persona Switcher */}
          <div className="relative">
            <button
              onClick={() => setShowRoleDropdown(!showRoleDropdown)}
              className="flex items-center gap-2 pl-2 pr-3 py-1 rounded-md bg-[#0d1321] border border-[#1c2842] hover:border-cyan-500/50 transition-all"
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center text-white text-xs font-bold border border-cyan-400/50">
                {currentRole[0]}
              </div>
              <div className="text-left hidden md:block">
                <p className="text-xs font-bold text-slate-100 leading-none">
                  {currentRole}
                </p>
                <p className="text-[10px] text-cyan-400 font-mono leading-tight">
                  {currentRole === 'Super Admin' ? 'Full Access' : currentRole === 'Viewer' ? 'Read Only' : 'Operator'}
                </p>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {/* Persona Switcher Dropdown */}
            {showRoleDropdown && (
              <div className="absolute right-0 mt-2 w-64 bg-[#0d1321] border border-[#1c2842] rounded-lg shadow-2xl py-2 z-50">
                <div className="px-3 pb-2 border-b border-[#1c2842]">
                  <p className="text-xs font-bold text-slate-200">{getCurrentUserFullName()}</p>
                  <p className="text-[10px] text-slate-400 font-mono">Enforced by FastAPI RBAC</p>
                </div>

                <div className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-slate-400">
                  Switch Persona (RBAC Testing)
                </div>

                {roles.map((r) => (
                  <button
                    key={r}
                    onClick={() => handleRoleSelect(r)}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-[#141d30] transition-colors ${
                      currentRole === r ? 'text-[#00d2ff] bg-cyan-950/20 font-bold' : 'text-slate-300'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <UserCheck className="w-3.5 h-3.5" />
                      {r}
                    </span>
                    {currentRole === r && <CheckCircle2 className="w-3.5 h-3.5 text-[#00d2ff]" />}
                  </button>
                ))}

                <div className="pt-2 mt-2 border-t border-[#1c2842] px-2 space-y-1">
                  <button
                    onClick={() => { setShowRoleDropdown(false); onOpenSettings(); }}
                    className="w-full text-left px-2 py-1.5 text-xs text-slate-300 hover:text-white hover:bg-[#141d30] rounded flex items-center gap-2"
                  >
                    <Settings className="w-3.5 h-3.5 text-slate-400" />
                    Admin Settings
                  </button>
                  <button
                    onClick={() => {
                      localStorage.clear();
                      window.location.reload();
                    }}
                    className="w-full text-left px-2 py-1.5 text-xs text-rose-400 hover:bg-rose-950/30 rounded flex items-center gap-2"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Logout & Reset Session
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </header>
  );
};
