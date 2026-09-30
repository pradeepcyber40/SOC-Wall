import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  LayoutDashboard, 
  Server, 
  AlertTriangle, 
  Settings, 
  FileText, 
  Network,
  RefreshCw,
  Clock,
  Radio
} from 'lucide-react';
import { Navbar } from './components/layout/Navbar';
import { KpiCards } from './components/dashboard/KpiCards';
import { CategoryTable } from './components/dashboard/CategoryTable';
import { LiveEventFeed } from './components/dashboard/LiveEventFeed';
import { NetworkOverview } from './components/dashboard/NetworkOverview';
import { BrandInventory } from './components/dashboard/BrandInventory';
import { AssetInventory } from './components/inventory/AssetInventory';
import { AssetDetailsModal } from './components/inventory/AssetDetailsModal';
import { SecurityAlertsPage } from './components/alerts/SecurityAlertsPage';
import { AdminControlsPage } from './components/admin/AdminControlsPage';
import { AuditLogsPage } from './components/audit/AuditLogsPage';

import { useWebSocket } from './hooks/useWebSocket';
import { 
  fetchKPIs, 
  fetchCategories, 
  fetchSubnets, 
  fetchBrands, 
  fetchAlerts,
  initializeAuth,
  getCurrentRole 
} from './services/api';
import { KPISummary, CategorySummary, SubnetItem, BrandItem, SecurityAlertItem } from './types';

export function App() {
  const [activeView, setActiveView] = useState<'wall' | 'inventory' | 'alerts' | 'admin' | 'audit'>('wall');
  const [activeEnvironment, setActiveEnvironment] = useState<string>('prod');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [currentRole, setCurrentRole] = useState<string>('Super Admin');

  // Dashboard Data State
  const [kpis, setKpis] = useState<KPISummary | null>(null);
  const [categories, setCategories] = useState<CategorySummary[]>([]);
  const [subnets, setSubnets] = useState<SubnetItem[]>([]);
  const [brands, setBrands] = useState<BrandItem[]>([]);
  const [recentAlerts, setRecentAlerts] = useState<SecurityAlertItem[]>([]);
  const [loadingInitial, setLoadingInitial] = useState<boolean>(true);
  const [lastRefreshed, setLastRefreshed] = useState<string>('Just now');

  // Filter pass-through state for Asset Inventory
  const [invCategory, setInvCategory] = useState<string>('All');
  const [invSubnet, setInvSubnet] = useState<string>('All');
  const [invVendor, setInvVendor] = useState<string>('All');
  const [invStatus, setInvStatus] = useState<string>('All');
  const [invSearch, setInvSearch] = useState<string>('');

  // Selected Asset for Deep Inspection Modal
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);

  // Real-time WebSocket Stream
  const { isConnected, events, latestKpi, clearEvents } = useWebSocket({
    soundEnabled,
    onKpiUpdate: (updatedKpis) => {
      setKpis(updatedKpis);
    }
  });

  // Sync latest KPI from WS if available
  useEffect(() => {
    if (latestKpi) {
      setKpis(latestKpi);
    }
  }, [latestKpi]);

  const refreshAllData = async () => {
    try {
      const [kpiData, catData, subnetData, brandData, alertsData] = await Promise.all([
        fetchKPIs(),
        fetchCategories(),
        fetchSubnets(),
        fetchBrands(),
        fetchAlerts({ page: 1, page_size: 10, status: 'New' })
      ]);
      setKpis(kpiData);
      setCategories(catData);
      setSubnets(subnetData);
      setBrands(brandData);
      setRecentAlerts(alertsData.items);
      setLastRefreshed(new Date().toLocaleTimeString());
    } catch (e) {
      console.error('Failed to load initial SOC data', e);
    } finally {
      setLoadingInitial(false);
    }
  };

  useEffect(() => {
    // Initialize superadmin authentication token on start
    initializeAuth().then(() => {
      setCurrentRole(getCurrentRole());
      refreshAllData();
    });
  }, []);

  // Handlers for interactive cross-filtering
  const handleSelectCategory = (cat: string) => {
    setInvCategory(cat);
    setInvSubnet('All');
    setInvVendor('All');
    setInvStatus('All');
    setInvSearch('');
    setActiveView('inventory');
  };

  const handleSelectSubnet = (cidr: string) => {
    setInvSubnet(cidr);
    setInvCategory('All');
    setInvVendor('All');
    setInvStatus('All');
    setInvSearch('');
    setActiveView('inventory');
  };

  const handleSelectBrand = (brand: string) => {
    setInvVendor(brand);
    setInvCategory('All');
    setInvSubnet('All');
    setInvStatus('All');
    setInvSearch('');
    setActiveView('inventory');
  };

  const handleKpiFilter = (filterType: string, value: string) => {
    if (filterType === 'status') {
      setInvStatus(value);
      setInvCategory('All');
      setInvSubnet('All');
      setInvVendor('All');
      setInvSearch('');
      setActiveView('inventory');
    }
  };

  const handleGlobalSearch = (term: string) => {
    setInvSearch(term);
    setInvCategory('All');
    setInvSubnet('All');
    setInvVendor('All');
    setInvStatus('All');
    setActiveView('inventory');
  };

  return (
    <div className="min-h-screen bg-[#080c14] text-slate-100 flex flex-col font-sans soc-grid-bg">
      {/* Sticky Top Navigation Bar */}
      <Navbar
        wsConnected={isConnected}
        activeEnvironment={activeEnvironment}
        onEnvironmentChange={setActiveEnvironment}
        onGlobalSearch={handleGlobalSearch}
        onOpenAlerts={() => setActiveView('alerts')}
        onOpenSettings={() => setActiveView('admin')}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled(!soundEnabled)}
        recentAlerts={recentAlerts}
        currentRole={currentRole}
        onRoleChanged={(r) => {
          setCurrentRole(r);
          refreshAllData();
        }}
      />

      {/* Main Workspace Navigation Bar */}
      <div className="bg-[#090d16]/95 border-b border-[#1c2842] sticky top-16 z-40 backdrop-blur">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 flex items-center justify-between overflow-x-auto">
          <nav className="flex items-center space-x-1 sm:space-x-2 py-2">
            <button
              onClick={() => setActiveView('wall')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                activeView === 'wall'
                  ? 'bg-cyan-950/70 text-[#00d2ff] border border-[#00d2ff]/40 shadow-glow-cyan'
                  : 'text-slate-400 hover:text-white hover:bg-[#141d30]'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>MAIN SOC WALL</span>
            </button>

            <button
              onClick={() => setActiveView('inventory')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                activeView === 'inventory'
                  ? 'bg-cyan-950/70 text-[#00d2ff] border border-[#00d2ff]/40 shadow-glow-cyan'
                  : 'text-slate-400 hover:text-white hover:bg-[#141d30]'
              }`}
            >
              <Server className="w-4 h-4" />
              <span>ASSET INVENTORY</span>
              <span className="px-1.5 py-0.2 rounded text-[10px] bg-[#1c2842] text-slate-300">
                {kpis?.total_assets || '1,000'}
              </span>
            </button>

            <button
              onClick={() => setActiveView('alerts')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                activeView === 'alerts'
                  ? 'bg-rose-950/70 text-rose-300 border border-rose-600/50 shadow-glow-red'
                  : 'text-slate-400 hover:text-white hover:bg-[#141d30]'
              }`}
            >
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>SECURITY ALERTS</span>
              {kpis && kpis.critical_alerts > 0 && (
                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-600 text-white animate-pulse">
                  {kpis.critical_alerts} CRIT
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveView('admin')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                activeView === 'admin'
                  ? 'bg-cyan-950/70 text-[#00d2ff] border border-[#00d2ff]/40 shadow-glow-cyan'
                  : 'text-slate-400 hover:text-white hover:bg-[#141d30]'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>ADMIN & RBAC</span>
            </button>

            <button
              onClick={() => setActiveView('audit')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                activeView === 'audit'
                  ? 'bg-cyan-950/70 text-[#00d2ff] border border-[#00d2ff]/40 shadow-glow-cyan'
                  : 'text-slate-400 hover:text-white hover:bg-[#141d30]'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>AUDIT TRAIL</span>
            </button>
          </nav>

          {/* Sync indicator */}
          <div className="hidden lg:flex items-center gap-3 text-[11px] font-mono text-slate-400">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-slate-500" />
              Sync: <strong className="text-slate-300">{lastRefreshed}</strong>
            </span>
            <button
              onClick={refreshAllData}
              title="Force reload all data"
              className="p-1 rounded bg-[#0d1321] border border-[#1c2842] hover:text-cyan-400 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-[1920px] w-full mx-auto p-4 sm:p-6 space-y-6">
        
        {/* VIEW 1: FULL SOC WALL DASHBOARD */}
        {activeView === 'wall' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            
            {/* 1. Top KPI Cards */}
            <KpiCards
              kpis={kpis}
              onFilterClick={handleKpiFilter}
              onOpenAlerts={() => setActiveView('alerts')}
            />

            {/* 2. Primary Asset Category Table */}
            <CategoryTable
              categories={categories}
              onSelectCategory={handleSelectCategory}
            />

            {/* 3. Live SOC Events & Network Breakdown Row */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
              {/* Left: Real-time SOC Events Live Feed (5 cols) */}
              <div className="xl:col-span-5">
                <LiveEventFeed
                  events={events}
                  onClear={clearEvents}
                  onSelectAsset={(id) => setSelectedAssetId(id)}
                />
              </div>

              {/* Right: Brand Distribution (7 cols) */}
              <div className="xl:col-span-7">
                <BrandInventory
                  brands={brands}
                  onSelectBrand={handleSelectBrand}
                />
              </div>
            </div>

            {/* 4. Network Overview (Subnet Topologies & Capacity) */}
            <div>
              <NetworkOverview
                subnets={subnets}
                onSelectSubnet={handleSelectSubnet}
              />
            </div>
          </div>
        )}

        {/* VIEW 2: DETAILED ASSET INVENTORY */}
        {activeView === 'inventory' && (
          <div className="animate-in fade-in duration-200">
            <AssetInventory
              initialCategory={invCategory}
              initialSubnet={invSubnet}
              initialVendor={invVendor}
              initialStatus={invStatus}
              initialSearch={invSearch}
              onInspectAsset={(id) => setSelectedAssetId(id)}
            />
          </div>
        )}

        {/* VIEW 3: SECURITY ALERTS */}
        {activeView === 'alerts' && (
          <div className="animate-in fade-in duration-200">
            <SecurityAlertsPage
              onInspectAsset={(id) => setSelectedAssetId(id)}
            />
          </div>
        )}

        {/* VIEW 4: ADMIN CONTROLS & RBAC */}
        {activeView === 'admin' && (
          <div className="animate-in fade-in duration-200">
            <AdminControlsPage />
          </div>
        )}

        {/* VIEW 5: AUDIT LOGS */}
        {activeView === 'audit' && (
          <div className="animate-in fade-in duration-200">
            <AuditLogsPage />
          </div>
        )}

      </main>

      {/* Deep Asset Inspection Modal Drawer */}
      {selectedAssetId && (
        <AssetDetailsModal
          assetId={selectedAssetId}
          onClose={() => setSelectedAssetId(null)}
          onAssetUpdated={refreshAllData}
        />
      )}

      {/* Footer Status Bar */}
      <footer className="mt-auto bg-[#090d16] border-t border-[#1c2842] py-2.5 px-4 sm:px-6 text-[11px] font-mono text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="text-slate-400 font-semibold">Rasi NovaTech SOC Platform v2.4.0</span>
          <span>•</span>
          <span>Security Engine: Wazuh 4.8.0 / OpenSearch SIEM</span>
          <span>•</span>
          <span className="text-emerald-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Zero Trust Network Architecture Active
          </span>
        </div>
        <div className="text-slate-400">
          Operator Persona: <strong className="text-cyan-400">{currentRole}</strong> • Session: TLS 1.3 AES-256-GCM
        </div>
      </footer>
    </div>
  );
}

export default App;
