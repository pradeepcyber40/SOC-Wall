import React, { useState, useEffect } from 'react';
import { FileText, Search, Filter, ShieldCheck, ChevronLeft, ChevronRight, CheckCircle2, XCircle } from 'lucide-react';
import { AuditLogItem } from '../../types';
import { fetchAuditLogs } from '../../services/api';

export const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(20);
  const [loading, setLoading] = useState<boolean>(true);

  const [userFilter, setUserFilter] = useState<string>('All');
  const [actionSearch, setActionSearch] = useState<string>('');
  const [resultFilter, setResultFilter] = useState<string>('All');

  const loadLogs = async () => {
    setLoading(true);
    try {
      const res = await fetchAuditLogs({
        page,
        user: userFilter,
        action: actionSearch.trim() || undefined,
        result: resultFilter
      });
      setLogs(res.items);
      setTotal(res.total);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [page, userFilter, resultFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      loadLogs();
    }, 300);
    return () => clearTimeout(timer);
  }, [actionSearch]);

  return (
    <div className="bg-[#0d1321] border border-[#1c2842] rounded-xl shadow-soc-panel overflow-hidden flex flex-col font-mono">
      {/* Header */}
      <div className="p-4 bg-[#11192c] border-b border-[#1c2842] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded bg-indigo-950/60 border border-indigo-700/40 text-indigo-400">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Immutable SOC Compliance & Security Audit Trail
            </h2>
            <p className="text-[11px] text-slate-400">
              Regulatory Logging for Operator Actions, Configuration Mutations & Triage
            </p>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search actions..."
              value={actionSearch}
              onChange={(e) => setActionSearch(e.target.value)}
              className="pl-8 pr-3 py-1 bg-[#090d16] border border-[#1c2842] focus:border-cyan-400 rounded text-xs text-slate-200 outline-none w-44"
            />
          </div>

          <select
            value={resultFilter}
            onChange={(e) => setResultFilter(e.target.value)}
            className="bg-[#090d16] border border-[#1c2842] text-xs text-slate-200 rounded px-2.5 py-1 outline-none"
          >
            <option value="All">All Results</option>
            <option value="Success">Success</option>
            <option value="Denied">Denied</option>
            <option value="Failed">Failed</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto min-h-[350px]">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-[#090d16] border-b border-[#1c2842] text-slate-400 uppercase text-[10px] tracking-wider">
              <th className="py-3 px-4">User</th>
              <th className="py-3 px-4">Action</th>
              <th className="py-3 px-4">Resource Target</th>
              <th className="py-3 px-4">Origin IP</th>
              <th className="py-3 px-4">Timestamp</th>
              <th className="py-3 px-3">Result</th>
              <th className="py-3 px-4">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#18233a]">
            {loading ? (
              [...Array(6)].map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td colSpan={7} className="py-3 px-4">
                    <div className="h-4 bg-[#141d30] rounded w-full" />
                  </td>
                </tr>
              ))
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-500">
                  <ShieldCheck className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p>No audit records matching query.</p>
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="hover:bg-[#141d30] transition-colors">
                  <td className="py-3 px-4 font-bold text-cyan-300">
                    {log.user}
                  </td>
                  <td className="py-3 px-4 text-slate-100 font-semibold">
                    {log.action}
                  </td>
                  <td className="py-3 px-4 text-slate-300">
                    {log.resource}
                  </td>
                  <td className="py-3 px-4 text-slate-400 text-[11px]">
                    {log.ip}
                  </td>
                  <td className="py-3 px-4 text-slate-400 text-[11px] whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="py-3 px-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      log.result === 'Success' ? 'bg-emerald-950 text-emerald-400 border border-emerald-700' :
                      'bg-rose-950 text-rose-400 border border-rose-700'
                    }`}>
                      {log.result}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-400 text-[11px] max-w-[250px] truncate" title={log.details}>
                    {log.details || '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="p-3 bg-[#11192c] border-t border-[#1c2842] flex items-center justify-between text-xs text-slate-400">
        <div>Total Audit Records: <strong className="text-slate-200">{total}</strong></div>
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
