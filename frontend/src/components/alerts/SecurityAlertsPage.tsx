import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  Search, 
  Filter, 
  CheckCircle, 
  Eye, 
  Clock, 
  AlertTriangle, 
  Flame, 
  Info,
  ChevronLeft,
  ChevronRight,
  UserCheck
} from 'lucide-react';
import { SecurityAlertItem } from '../../types';
import { fetchAlerts, updateAlertStatus, getCurrentRole, getCurrentUserFullName } from '../../services/api';

interface SecurityAlertsPageProps {
  onInspectAsset: (assetId: string) => void;
}

export const SecurityAlertsPage: React.FC<SecurityAlertsPageProps> = ({ onInspectAsset }) => {
  const [alerts, setAlerts] = useState<SecurityAlertItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(20);

  // Filters
  const [severityFilter, setSeverityFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [search, setSearch] = useState<string>('');

  const currentRole = getCurrentRole();
  const canUpdate = ['Super Admin', 'SOC Admin', 'SOC Analyst'].includes(currentRole);

  const loadAlerts = async () => {
    setLoading(true);
    try {
      const res = await fetchAlerts({
        page,
        page_size: pageSize,
        severity: severityFilter,
        status: statusFilter,
        search: search.trim() || undefined
      });
      setAlerts(res.items);
      setTotal(res.total);
    } catch (e) {
      console.error('Failed to load alerts', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, [page, severityFilter, statusFilter]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      loadAlerts();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleStatusChange = async (alertId: string, newStatus: string) => {
    if (!canUpdate) {
      alert(`Role '${currentRole}' is read-only. SOC Analyst or Admin permission required.`);
      return;
    }
    try {
      await updateAlertStatus(alertId, newStatus, getCurrentUserFullName());
      loadAlerts();
    } catch (e: any) {
      alert(`Action failed: ${e.message}`);
    }
  };

  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case 'Critical':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-950 text-rose-300 border border-rose-600 shadow-glow-red animate-pulse">
            Critical
          </span>
        );
      case 'High':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-950 text-amber-300 border border-amber-600">
            High
          </span>
        );
      case 'Medium':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-yellow-950 text-yellow-300 border border-yellow-700">
            Medium
          </span>
        );
      case 'Low':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-cyan-950 text-cyan-300 border border-cyan-800">
            Low
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono text-slate-300 bg-slate-800 border border-slate-700">
            Informational
          </span>
        );
    }
  };

  const getStatusBadge = (st: string) => {
    switch (st) {
      case 'New':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-950/60 text-rose-400 border border-rose-800">New</span>;
      case 'Investigating':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-950/60 text-amber-400 border border-amber-800">Investigating</span>;
      case 'Acknowledged':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-cyan-950/60 text-cyan-400 border border-cyan-800">Acknowledged</span>;
      case 'Resolved':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-950/60 text-emerald-400 border border-emerald-800">Resolved</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono text-slate-400 bg-slate-800">{st}</span>;
    }
  };

  return (
    <div className="bg-[#0d1321] border border-[#1c2842] rounded-xl shadow-soc-panel overflow-hidden flex flex-col font-mono">
      {/* Header */}
      <div className="p-4 bg-[#11192c] border-b border-[#1c2842] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded bg-rose-950/50 border border-rose-600/40 text-rose-400 shadow-glow-red">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Wazuh & OpenSearch Security Incident Queue
            </h2>
            <p className="text-[11px] text-slate-400">
              Live Threat Detections, MITRE ATT&CK Mapping & Analyst Triage
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search alert, host, MITRE..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1 bg-[#090d16] border border-[#1c2842] focus:border-cyan-400 rounded text-xs text-slate-200 outline-none w-48 sm:w-60"
            />
          </div>

          {/* Severity */}
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="bg-[#090d16] border border-[#1c2842] text-xs text-slate-200 rounded px-2.5 py-1 outline-none"
          >
            <option value="All">All Severities</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
            <option value="Informational">Informational</option>
          </select>

          {/* Status */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#090d16] border border-[#1c2842] text-xs text-slate-200 rounded px-2.5 py-1 outline-none"
          >
            <option value="All">All Statuses</option>
            <option value="New">New</option>
            <option value="Investigating">Investigating</option>
            <option value="Acknowledged">Acknowledged</option>
            <option value="Resolved">Resolved</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto min-h-[350px]">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-[#090d16] border-b border-[#1c2842] text-slate-400 uppercase text-[10px] tracking-wider">
              <th className="py-3 px-4">Alert ID</th>
              <th className="py-3 px-3">Severity</th>
              <th className="py-3 px-4">Target Asset</th>
              <th className="py-3 px-3">Source</th>
              <th className="py-3 px-4">Alert Type</th>
              <th className="py-3 px-5 max-w-[280px]">Description</th>
              <th className="py-3 px-4">Timestamp</th>
              <th className="py-3 px-3">Status</th>
              <th className="py-3 px-4">Assigned Analyst</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#18233a]">
            {loading ? (
              [...Array(6)].map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td colSpan={10} className="py-3 px-4">
                    <div className="h-4 bg-[#141d30] rounded w-full" />
                  </td>
                </tr>
              ))
            ) : alerts.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-12 text-center text-slate-500">
                  <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                  <p>No alerts matching the selected filters.</p>
                </td>
              </tr>
            ) : (
              alerts.map((alt) => (
                <tr key={alt.alert_id} className="hover:bg-[#141d30] transition-colors group">
                  <td className="py-3 px-4 font-bold text-cyan-400">
                    {alt.alert_id}
                  </td>
                  <td className="py-3 px-3">
                    {getSeverityBadge(alt.severity)}
                  </td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => onInspectAsset(alt.asset_id)}
                      className="text-slate-100 hover:text-cyan-300 font-semibold flex items-center gap-1 group-hover:underline"
                    >
                      {alt.asset_hostname}
                      <Eye className="w-3 h-3 text-cyan-400" />
                    </button>
                    <span className="text-[10px] text-slate-500 block">{alt.asset_id}</span>
                  </td>
                  <td className="py-3 px-3 text-slate-300 font-medium">
                    {alt.source}
                  </td>
                  <td className="py-3 px-4 text-slate-200 font-medium max-w-[180px] truncate" title={alt.alert_type}>
                    {alt.alert_type}
                  </td>
                  <td className="py-3 px-5 text-slate-400 text-[11px] max-w-[280px] truncate" title={alt.description}>
                    {alt.description}
                  </td>
                  <td className="py-3 px-4 text-slate-400 text-[11px] whitespace-nowrap">
                    {new Date(alt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </td>
                  <td className="py-3 px-3">
                    {getStatusBadge(alt.status)}
                  </td>
                  <td className="py-3 px-4 text-slate-300 text-xs">
                    {alt.assigned_analyst}
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      {alt.status === 'New' && canUpdate && (
                        <button
                          onClick={() => handleStatusChange(alt.alert_id, 'Acknowledged')}
                          className="px-2 py-0.5 rounded bg-cyan-950 border border-cyan-700 text-cyan-300 text-[10px] hover:bg-cyan-900"
                        >
                          Ack
                        </button>
                      )}
                      {alt.status !== 'Resolved' && canUpdate && (
                        <button
                          onClick={() => handleStatusChange(alt.alert_id, 'Resolved')}
                          className="px-2 py-0.5 rounded bg-emerald-950 border border-emerald-700 text-emerald-300 text-[10px] hover:bg-emerald-900"
                        >
                          Resolve
                        </button>
                      )}
                      <button
                        onClick={() => onInspectAsset(alt.asset_id)}
                        className="px-2 py-0.5 rounded bg-[#11192c] border border-[#1c2842] text-slate-300 text-[10px] hover:text-white"
                      >
                        Inspect
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="p-3 bg-[#11192c] border-t border-[#1c2842] flex items-center justify-between text-xs text-slate-400">
        <div>Total Security Incidents: <strong className="text-slate-200">{total}</strong></div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage(page - 1)}
            disabled={page <= 1}
            className="p-1 rounded bg-[#090d16] border border-[#1c2842] disabled:opacity-30"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span>Page {page}</span>
          <button
            onClick={() => setPage(page + 1)}
            disabled={page * pageSize >= total}
            className="p-1 rounded bg-[#090d16] border border-[#1c2842] disabled:opacity-30"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
