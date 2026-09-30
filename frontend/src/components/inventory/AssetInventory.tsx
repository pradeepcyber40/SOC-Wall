import React, { useState, useEffect, useCallback } from 'react';
import { 
  Search, 
  Filter, 
  Download, 
  Eye, 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight, 
  ArrowUpDown, 
  SlidersHorizontal, 
  RefreshCw,
  Server,
  Shield,
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Clock
} from 'lucide-react';
import { AssetItem } from '../../types';
import { fetchAssets, getExportCsvUrl } from '../../services/api';

interface AssetInventoryProps {
  initialCategory?: string;
  initialSubnet?: string;
  initialVendor?: string;
  initialStatus?: string;
  initialSearch?: string;
  onInspectAsset: (assetId: string) => void;
}

export const AssetInventory: React.FC<AssetInventoryProps> = ({
  initialCategory = 'All',
  initialSubnet = 'All',
  initialVendor = 'All',
  initialStatus = 'All',
  initialSearch = '',
  onInspectAsset
}) => {
  const [assets, setAssets] = useState<AssetItem[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [search, setSearch] = useState<string>(initialSearch);
  const [category, setCategory] = useState<string>(initialCategory);
  const [statusFilter, setStatusFilter] = useState<string>(initialStatus);
  const [vendor, setVendor] = useState<string>(initialVendor);
  const [risk, setRisk] = useState<string>('All');
  const [subnet, setSubnet] = useState<string>(initialSubnet);

  // Sorting
  const [sortBy, setSortBy] = useState<string>('id');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Column visibility
  const [showColMenu, setShowColMenu] = useState<boolean>(false);
  const [visibleCols, setVisibleCols] = useState<Record<string, boolean>>({
    id: true,
    hostname: true,
    ip_address: true,
    mac_address: true,
    category: true,
    manufacturer: true,
    model: true,
    os: true,
    status: true,
    risk: true,
    first_seen: false,
    last_seen: true,
    agent_status: true,
    actions: true,
  });

  // Sync external prop changes
  useEffect(() => {
    if (initialCategory) setCategory(initialCategory);
  }, [initialCategory]);

  useEffect(() => {
    if (initialSubnet) setSubnet(initialSubnet);
  }, [initialSubnet]);

  useEffect(() => {
    if (initialVendor) setVendor(initialVendor);
  }, [initialVendor]);

  useEffect(() => {
    if (initialStatus) setStatusFilter(initialStatus);
  }, [initialStatus]);

  useEffect(() => {
    if (initialSearch !== undefined) setSearch(initialSearch);
  }, [initialSearch]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchAssets({
        page,
        page_size: pageSize,
        search: search.trim() || undefined,
        category,
        status: statusFilter,
        vendor,
        risk,
        subnet,
        sort_by: sortBy,
        sort_order: sortOrder
      });
      setAssets(res.items);
      setTotal(res.total);
      setTotalPages(res.total_pages);
    } catch (e) {
      console.error('Failed to load asset inventory', e);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, category, statusFilter, vendor, risk, subnet, sortBy, sortOrder]);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setPage(1);
      loadData();
    }, 280);
    return () => clearTimeout(handler);
  }, [search, category, statusFilter, vendor, risk, subnet, sortBy, sortOrder, pageSize]);

  useEffect(() => {
    loadData();
  }, [page]);

  const toggleSort = (colName: string) => {
    if (sortBy === colName) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(colName);
      setSortOrder('asc');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ONLINE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-600/50 shadow-glow-green">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            ONLINE
          </span>
        );
      case 'OFFLINE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-900 text-slate-400 border border-slate-700">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
            OFFLINE
          </span>
        );
      case 'WARNING':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-950/80 text-amber-400 border border-amber-600/50">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            WARNING
          </span>
        );
      case 'UNKNOWN':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-950/80 text-purple-400 border border-purple-600/50">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
            UNKNOWN
          </span>
        );
    }
  };

  const getRiskBadge = (risk: string) => {
    switch (risk) {
      case 'Critical':
        return <span className="text-rose-400 font-bold font-mono text-[11px] bg-rose-950/80 px-2 py-0.5 rounded border border-rose-600/50 animate-pulse">Critical</span>;
      case 'High':
        return <span className="text-amber-400 font-bold font-mono text-[11px] bg-amber-950/80 px-2 py-0.5 rounded border border-amber-600/50">High</span>;
      case 'Medium':
        return <span className="text-yellow-400 font-medium font-mono text-[11px] bg-yellow-950/60 px-2 py-0.5 rounded border border-yellow-700/40">Medium</span>;
      case 'Low':
        return <span className="text-cyan-400 font-mono text-[11px] bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/40">Low</span>;
      default:
        return <span className="text-slate-500 font-mono text-[11px]">None</span>;
    }
  };

  const getAgentBadge = (agent: string) => {
    switch (agent) {
      case 'Active':
        return <span className="text-emerald-400 font-mono text-[11px] flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Active</span>;
      case 'Disconnected':
        return <span className="text-rose-400 font-mono text-[11px] flex items-center gap-1"><XCircle className="w-3 h-3" /> Disconnected</span>;
      default:
        return <span className="text-slate-500 font-mono text-[11px]">Unmanaged</span>;
    }
  };

  const categoriesList = [
    'All', 'Computers', 'Laptops', 'Mobile', 'Servers', 'Routers',
    'Switches', 'Firewalls', 'Printers', 'Cameras', 'Access Points',
    'IoT', 'Other', 'Unknown'
  ];

  const subnetsList = [
    'All', '192.168.1.0/24', '192.168.2.0/24', '10.0.10.0/24', '10.0.20.0/24', '172.16.50.0/24', '172.16.60.0/24'
  ];

  return (
    <div className="bg-[#0d1321] border border-[#1c2842] rounded-xl shadow-soc-panel overflow-hidden flex flex-col">
      {/* Top Controls Toolbar */}
      <div className="p-4 bg-[#11192c] border-b border-[#1c2842] space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative flex-1 max-w-lg">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search Hostname, IP, MAC, Serial, or OS..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-8 py-1.5 bg-[#090d16] border border-[#1c2842] focus:border-[#00d2ff] rounded-md text-xs text-slate-100 placeholder-slate-500 font-mono outline-none"
            />
            {search && (
              <button 
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-2 text-xs text-slate-400 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>

          {/* Quick Actions (Export, Column Visibility, Refresh) */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Export CSV */}
            <a
              href={getExportCsvUrl(category, statusFilter, subnet)}
              download
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#090d16] border border-[#1c2842] hover:border-cyan-500/50 text-xs font-mono text-cyan-300 transition-all"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span>Export CSV</span>
            </a>

            {/* Column Visibility */}
            <div className="relative">
              <button
                onClick={() => setShowColMenu(!showColMenu)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#090d16] border border-[#1c2842] hover:border-cyan-500/50 text-xs font-mono text-slate-300 transition-all"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
                <span>Columns</span>
              </button>

              {showColMenu && (
                <div className="absolute right-0 mt-2 w-52 bg-[#0d1321] border border-[#1c2842] rounded-lg shadow-2xl p-2 z-50 space-y-1">
                  <p className="text-[10px] font-mono text-slate-400 uppercase tracking-wider px-2 py-1">Toggle Columns</p>
                  {Object.keys(visibleCols).map((colKey) => (
                    <label
                      key={colKey}
                      className="flex items-center gap-2 px-2 py-1 rounded hover:bg-[#141d30] cursor-pointer text-xs text-slate-300 capitalize font-mono"
                    >
                      <input
                        type="checkbox"
                        checked={visibleCols[colKey]}
                        onChange={() => setVisibleCols({ ...visibleCols, [colKey]: !visibleCols[colKey] })}
                        className="rounded border-[#1c2842] bg-[#090d16] text-cyan-500 focus:ring-0"
                      />
                      <span>{colKey.replace('_', ' ')}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Refresh */}
            <button
              onClick={() => loadData()}
              className="p-1.5 rounded-md bg-[#090d16] border border-[#1c2842] text-slate-400 hover:text-white transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Filter Selectors Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 pt-1">
          {/* Category */}
          <div>
            <label className="text-[10px] font-mono text-slate-400 uppercase">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full mt-1 bg-[#090d16] border border-[#1c2842] text-xs text-slate-200 font-mono rounded px-2 py-1 outline-none"
            >
              {categoriesList.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="text-[10px] font-mono text-slate-400 uppercase">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full mt-1 bg-[#090d16] border border-[#1c2842] text-xs text-slate-200 font-mono rounded px-2 py-1 outline-none"
            >
              <option value="All">All Statuses</option>
              <option value="ONLINE">ONLINE</option>
              <option value="OFFLINE">OFFLINE</option>
              <option value="WARNING">WARNING</option>
              <option value="UNKNOWN">UNKNOWN</option>
            </select>
          </div>

          {/* Risk */}
          <div>
            <label className="text-[10px] font-mono text-slate-400 uppercase">Risk Level</label>
            <select
              value={risk}
              onChange={(e) => setRisk(e.target.value)}
              className="w-full mt-1 bg-[#090d16] border border-[#1c2842] text-xs text-slate-200 font-mono rounded px-2 py-1 outline-none"
            >
              <option value="All">All Risks</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
              <option value="None">None</option>
            </select>
          </div>

          {/* Subnet */}
          <div>
            <label className="text-[10px] font-mono text-slate-400 uppercase">Subnet</label>
            <select
              value={subnet}
              onChange={(e) => setSubnet(e.target.value)}
              className="w-full mt-1 bg-[#090d16] border border-[#1c2842] text-xs text-slate-200 font-mono rounded px-2 py-1 outline-none"
            >
              {subnetsList.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Vendor */}
          <div>
            <label className="text-[10px] font-mono text-slate-400 uppercase">Vendor</label>
            <select
              value={vendor}
              onChange={(e) => setVendor(e.target.value)}
              className="w-full mt-1 bg-[#090d16] border border-[#1c2842] text-xs text-slate-200 font-mono rounded px-2 py-1 outline-none"
            >
              <option value="All">All Vendors</option>
              <option value="Dell">Dell</option>
              <option value="HP">HP</option>
              <option value="Lenovo">Lenovo</option>
              <option value="Cisco">Cisco</option>
              <option value="Hikvision">Hikvision</option>
              <option value="Fortinet">Fortinet</option>
              <option value="Apple">Apple</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Asset Table */}
      <div className="overflow-x-auto min-h-[380px]">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-[#090d16] border-b border-[#1c2842] text-slate-400 font-mono uppercase text-[11px] tracking-wider select-none">
              {visibleCols.id && (
                <th onClick={() => toggleSort('id')} className="py-3 px-4 cursor-pointer hover:text-white">
                  <div className="flex items-center gap-1">
                    <span>Asset ID</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-600" />
                  </div>
                </th>
              )}
              {visibleCols.hostname && (
                <th onClick={() => toggleSort('hostname')} className="py-3 px-4 cursor-pointer hover:text-white">
                  <div className="flex items-center gap-1">
                    <span>Hostname</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-600" />
                  </div>
                </th>
              )}
              {visibleCols.ip_address && (
                <th onClick={() => toggleSort('ip_address')} className="py-3 px-4 cursor-pointer hover:text-white">
                  <div className="flex items-center gap-1">
                    <span>IP Address</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-600" />
                  </div>
                </th>
              )}
              {visibleCols.mac_address && <th className="py-3 px-4">MAC Address</th>}
              {visibleCols.category && <th className="py-3 px-4">Category</th>}
              {visibleCols.manufacturer && <th className="py-3 px-4">Manufacturer</th>}
              {visibleCols.model && <th className="py-3 px-4">Model</th>}
              {visibleCols.os && <th className="py-3 px-4">OS</th>}
              {visibleCols.status && (
                <th onClick={() => toggleSort('status')} className="py-3 px-4 cursor-pointer hover:text-white">
                  <div className="flex items-center gap-1">
                    <span>Status</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-600" />
                  </div>
                </th>
              )}
              {visibleCols.risk && <th className="py-3 px-4">Risk</th>}
              {visibleCols.last_seen && <th className="py-3 px-4">Last Seen</th>}
              {visibleCols.agent_status && <th className="py-3 px-4">Agent Status</th>}
              {visibleCols.actions && <th className="py-3 px-4 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#18233a]">
            {loading ? (
              [...Array(10)].map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td colSpan={14} className="py-3 px-4">
                    <div className="h-4 bg-[#141d30] rounded w-full" />
                  </td>
                </tr>
              ))
            ) : assets.length === 0 ? (
              <tr>
                <td colSpan={14} className="py-12 text-center text-slate-500 font-mono">
                  <Server className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p>No assets found matching the specified filters.</p>
                  <button
                    onClick={() => {
                      setSearch('');
                      setCategory('All');
                      setStatusFilter('All');
                      setVendor('All');
                      setRisk('All');
                      setSubnet('All');
                    }}
                    className="mt-2 text-xs text-cyan-400 hover:underline"
                  >
                    Clear all filters
                  </button>
                </td>
              </tr>
            ) : (
              assets.map((a, idx) => {
                const assetId = a.asset_id || a.id || `asset-${idx}`;
                return (
                  <tr
                    key={assetId}
                    onClick={() => onInspectAsset(assetId)}
                    className="hover:bg-[#141d30] cursor-pointer transition-colors group"
                  >
                    {visibleCols.id && (
                      <td className="py-2.5 px-4 font-mono font-bold text-cyan-400">
                        {assetId}
                      </td>
                    )}
                  {visibleCols.hostname && (
                    <td className="py-2.5 px-4 font-mono text-slate-100 font-medium group-hover:text-white">
                      {a.hostname}
                    </td>
                  )}
                  {visibleCols.ip_address && (
                    <td className="py-2.5 px-4 font-mono text-slate-300">
                      {a.ip_address}
                    </td>
                  )}
                  {visibleCols.mac_address && (
                    <td className="py-2.5 px-4 font-mono text-slate-400 text-[11px]">
                      {a.mac_address}
                    </td>
                  )}
                  {visibleCols.category && (
                    <td className="py-2.5 px-4 font-mono text-slate-300">
                      {a.category}
                    </td>
                  )}
                  {visibleCols.manufacturer && (
                    <td className="py-2.5 px-4 text-slate-300 font-mono">
                      {a.manufacturer}
                    </td>
                  )}
                  {visibleCols.model && (
                    <td className="py-2.5 px-4 text-slate-400 font-mono max-w-[150px] truncate" title={a.model}>
                      {a.model}
                    </td>
                  )}
                  {visibleCols.os && (
                    <td className="py-2.5 px-4 text-slate-400 font-mono max-w-[140px] truncate" title={a.os}>
                      {a.os}
                    </td>
                  )}
                  {visibleCols.status && (
                    <td className="py-2.5 px-4">
                      {getStatusBadge(a.status)}
                    </td>
                  )}
                  {visibleCols.risk && (
                    <td className="py-2.5 px-4">
                      {getRiskBadge(a.risk)}
                    </td>
                  )}
                  {visibleCols.last_seen && (
                    <td className="py-2.5 px-4 font-mono text-slate-400 text-[11px] whitespace-nowrap">
                      {new Date(a.last_seen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                  )}
                  {visibleCols.agent_status && (
                    <td className="py-2.5 px-4">
                      {getAgentBadge(a.agent_status)}
                    </td>
                  )}
                  {visibleCols.actions && (
                    <td className="py-2.5 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onInspectAsset(assetId);
                        }}
                        className="p-1 px-2 rounded bg-[#090d16] border border-[#1c2842] hover:border-cyan-500 hover:text-cyan-300 text-slate-400 text-xs font-mono inline-flex items-center gap-1 transition-all"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Inspect</span>
                      </button>
                    </td>
                  )}
                </tr>
              );
            })
            )}
          </tbody>
        </table>
      </div>

      {/* Server-side Pagination Footer */}
      <div className="p-3 bg-[#11192c] border-t border-[#1c2842] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono text-slate-400">
        <div className="flex items-center gap-2">
          <span>Showing</span>
          <span className="font-bold text-slate-200">
            {total > 0 ? (page - 1) * pageSize + 1 : 0} - {Math.min(page * pageSize, total)}
          </span>
          <span>of</span>
          <span className="font-bold text-slate-200">{total.toLocaleString()}</span>
          <span>assets</span>
        </div>

        <div className="flex items-center gap-3">
          {/* Page size select */}
          <div className="flex items-center gap-1.5">
            <span>Rows:</span>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
              className="bg-[#090d16] border border-[#1c2842] text-xs text-slate-200 rounded px-2 py-0.5"
            >
              <option value={15}>15</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>

          {/* Page nav */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(1)}
              disabled={page <= 1}
              className="p-1 rounded bg-[#090d16] border border-[#1c2842] disabled:opacity-30 hover:text-white"
            >
              <ChevronsLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setPage(page - 1)}
              disabled={page <= 1}
              className="p-1 rounded bg-[#090d16] border border-[#1c2842] disabled:opacity-30 hover:text-white"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            <span className="px-2 text-slate-200">
              Page {page} of {totalPages || 1}
            </span>

            <button
              onClick={() => setPage(page + 1)}
              disabled={page >= totalPages}
              className="p-1 rounded bg-[#090d16] border border-[#1c2842] disabled:opacity-30 hover:text-white"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setPage(totalPages)}
              disabled={page >= totalPages}
              className="p-1 rounded bg-[#090d16] border border-[#1c2842] disabled:opacity-30 hover:text-white"
            >
              <ChevronsRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
