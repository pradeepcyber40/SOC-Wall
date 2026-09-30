import React, { useState, useEffect } from 'react';
import { 
  X, 
  Cpu, 
  Network, 
  Layers, 
  ShieldAlert, 
  HardDrive, 
  Activity, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Server, 
  Terminal, 
  ShieldCheck, 
  FileCode,
  Edit2,
  Check,
  Radio
} from 'lucide-react';
import { AssetDetailResponse } from '../../types';
import { fetchAssetDetail, updateAsset, getCurrentRole } from '../../services/api';

interface AssetDetailsModalProps {
  assetId: string | null;
  onClose: () => void;
  onAssetUpdated?: () => void;
}

export const AssetDetailsModal: React.FC<AssetDetailsModalProps> = ({ assetId, onClose, onAssetUpdated }) => {
  const [data, setData] = useState<AssetDetailResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'hardware' | 'network' | 'services' | 'ports' | 'software' | 'security'>('overview');
  const [isEditingCategory, setIsEditingCategory] = useState<boolean>(false);
  const [newCategory, setNewCategory] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const currentRole = getCurrentRole();
  const canEdit = ['Super Admin', 'SOC Admin'].includes(currentRole);

  useEffect(() => {
    if (!assetId) return;
    setLoading(true);
    fetchAssetDetail(assetId)
      .then((res) => {
        setData(res);
        setNewCategory(res.overview.category);
      })
      .catch((err) => console.error('Failed to load asset details', err))
      .finally(() => setLoading(false));
  }, [assetId]);

  if (!assetId) return null;

  const handleSaveCategory = async () => {
    if (!data || !newCategory) return;
    setIsSaving(true);
    try {
      const targetId = data.overview.asset_id || data.overview.id;
      if (!targetId) throw new Error('Asset ID missing');
      await updateAsset(targetId, { category: newCategory });
      setData({
        ...data,
        overview: {
          ...data.overview,
          category: newCategory
        }
      });
      setIsEditingCategory(false);
      if (onAssetUpdated) onAssetUpdated();
    } catch (e: any) {
      alert(`Error updating category: ${e.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Server },
    { id: 'hardware', label: 'Hardware', icon: Cpu },
    { id: 'network', label: 'Network', icon: Network },
    { id: 'services', label: 'Services', icon: Layers },
    { id: 'ports', label: 'Ports', icon: Terminal },
    { id: 'software', label: 'Software', icon: FileCode },
    { id: 'security', label: 'Security & Wazuh', icon: ShieldAlert, badge: data?.security_alerts.length },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-5xl bg-[#090d16] border border-[#1c2842] rounded-xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-[#11192c] border-b border-[#1c2842] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#0d1321] border border-[#1c2842] text-cyan-400">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-black font-mono text-white">
                  {loading ? assetId : data?.overview.hostname}
                </span>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#1c2842] text-cyan-300">
                  {assetId}
                </span>
                {data && (
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                    data.overview.status === 'ONLINE' ? 'bg-emerald-950 text-emerald-400 border border-emerald-700/50' :
                    data.overview.status === 'WARNING' ? 'bg-amber-950 text-amber-400 border border-amber-700/50' :
                    'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}>
                    {data.overview.status}
                  </span>
                )}
              </div>
              <p className="text-xs font-mono text-slate-400">
                Deep Telemetry Inspection & SIEM Audit Profile
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-[#141d30] border border-[#1c2842] text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center px-6 bg-[#0d1321] border-b border-[#1c2842] overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-mono border-b-2 font-semibold transition-all whitespace-nowrap ${
                  isActive
                    ? 'border-[#00d2ff] text-[#00d2ff] bg-cyan-950/20'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-950 text-rose-400 border border-rose-800">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 font-mono">
          {loading || !data ? (
            <div className="py-20 text-center text-slate-500">
              <Activity className="w-8 h-8 text-cyan-400 animate-spin mx-auto mb-2" />
              <p className="text-xs">Querying endpoint inventory & hardware registers...</p>
            </div>
          ) : (
            <>
              {/* TAB 1: OVERVIEW */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="p-3.5 rounded-lg bg-[#0d1321] border border-[#1c2842]">
                      <span className="text-[11px] text-slate-400 block mb-1">Asset ID</span>
                      <span className="text-sm font-bold text-cyan-300">{data.overview.asset_id || data.overview.id}</span>
                    </div>

                    <div className="p-3.5 rounded-lg bg-[#0d1321] border border-[#1c2842]">
                      <span className="text-[11px] text-slate-400 block mb-1">Hostname</span>
                      <span className="text-sm font-bold text-white">{data.overview.hostname}</span>
                    </div>

                    <div className="p-3.5 rounded-lg bg-[#0d1321] border border-[#1c2842]">
                      <span className="text-[11px] text-slate-400 block mb-1">IP Address</span>
                      <span className="text-sm font-bold text-slate-200">{data.overview.ip_address}</span>
                    </div>

                    <div className="p-3.5 rounded-lg bg-[#0d1321] border border-[#1c2842]">
                      <span className="text-[11px] text-slate-400 block mb-1">MAC Address</span>
                      <span className="text-sm font-bold text-slate-300">{data.overview.mac_address}</span>
                    </div>

                    <div className="p-3.5 rounded-lg bg-[#0d1321] border border-[#1c2842]">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-slate-400 block mb-1">Category</span>
                        {canEdit && !isEditingCategory && (
                          <button
                            onClick={() => setIsEditingCategory(true)}
                            className="text-[10px] text-cyan-400 hover:underline flex items-center gap-1"
                          >
                            <Edit2 className="w-2.5 h-2.5" /> Edit
                          </button>
                        )}
                      </div>
                      {isEditingCategory ? (
                        <div className="flex items-center gap-2 mt-1">
                          <select
                            value={newCategory}
                            onChange={(e) => setNewCategory(e.target.value)}
                            className="bg-[#090d16] border border-[#1c2842] text-xs text-white rounded px-2 py-1"
                          >
                            {['Computers', 'Laptops', 'Mobile', 'Servers', 'Routers', 'Switches', 'Firewalls', 'Printers', 'Cameras', 'Access Points', 'IoT', 'Other', 'Unknown'].map((c) => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                          <button
                            onClick={handleSaveCategory}
                            disabled={isSaving}
                            className="p-1 rounded bg-cyan-600 text-white hover:bg-cyan-500"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setIsEditingCategory(false)}
                            className="p-1 rounded bg-slate-800 text-slate-300"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-sm font-bold text-white">{data.overview.category}</span>
                      )}
                    </div>

                    <div className="p-3.5 rounded-lg bg-[#0d1321] border border-[#1c2842]">
                      <span className="text-[11px] text-slate-400 block mb-1">Manufacturer & Model</span>
                      <span className="text-sm font-bold text-slate-200">
                        {data.overview.manufacturer} {data.overview.model}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-lg bg-[#0d1321] border border-[#1c2842]">
                      <span className="text-[11px] text-slate-400 block mb-1">Operating System</span>
                      <span className="text-sm font-bold text-slate-300">{data.overview.os}</span>
                    </div>

                    <div className="p-3.5 rounded-lg bg-[#0d1321] border border-[#1c2842]">
                      <span className="text-[11px] text-slate-400 block mb-1">Current Risk Score</span>
                      <span className={`text-sm font-bold ${
                        data.overview.risk === 'Critical' ? 'text-rose-400' :
                        data.overview.risk === 'High' ? 'text-amber-400' : 'text-cyan-400'
                      }`}>
                        {data.overview.risk}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-lg bg-[#0d1321] border border-[#1c2842]">
                      <span className="text-[11px] text-slate-400 block mb-1">Wazuh Agent Status</span>
                      <span className="text-sm font-bold text-slate-200">
                        {data.overview.agent_status} ({data.overview.agent_version})
                      </span>
                    </div>
                  </div>

                  {/* Status Engine Details */}
                  <div className="p-4 rounded-lg bg-[#0d1321] border border-[#1c2842] space-y-2">
                    <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                      <Radio className="w-3.5 h-3.5 text-cyan-400" />
                      Status Evaluation Fused Telemetry
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div>
                        <span className="text-slate-500 block">First Seen</span>
                        <span className="text-slate-300">{new Date(data.overview.first_seen).toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Last Seen Probe</span>
                        <span className="text-slate-300">{new Date(data.overview.last_seen).toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Last Agent Heartbeat</span>
                        <span className="text-slate-300">{new Date(data.overview.last_heartbeat).toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Ping Availability</span>
                        <span className="text-emerald-400 font-bold">{data.overview.network_availability_pct}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: HARDWARE */}
              {activeTab === 'hardware' && (
                <div className="space-y-4">
                  {data.hardware ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 rounded-lg bg-[#0d1321] border border-[#1c2842] space-y-1">
                        <span className="text-[11px] text-slate-500 block uppercase">Central Processor (CPU)</span>
                        <p className="text-sm font-bold text-slate-200">{data.hardware.cpu}</p>
                      </div>

                      <div className="p-4 rounded-lg bg-[#0d1321] border border-[#1c2842] space-y-1">
                        <span className="text-[11px] text-slate-500 block uppercase">Physical Memory (RAM)</span>
                        <p className="text-sm font-bold text-cyan-300">{data.hardware.ram_gb} GB Registered DDR</p>
                      </div>

                      <div className="p-4 rounded-lg bg-[#0d1321] border border-[#1c2842] space-y-1">
                        <span className="text-[11px] text-slate-500 block uppercase">NVMe / Solid-State Storage</span>
                        <p className="text-sm font-bold text-slate-200">{data.hardware.storage_gb} GB Enterprise SSD</p>
                      </div>

                      <div className="p-4 rounded-lg bg-[#0d1321] border border-[#1c2842] space-y-1">
                        <span className="text-[11px] text-slate-500 block uppercase">Graphics Acceleration (GPU)</span>
                        <p className="text-sm font-bold text-slate-200">{data.hardware.gpu}</p>
                      </div>

                      <div className="p-4 rounded-lg bg-[#0d1321] border border-[#1c2842] space-y-1">
                        <span className="text-[11px] text-slate-500 block uppercase">System BIOS / Firmware</span>
                        <p className="text-sm font-bold text-slate-300">{data.hardware.bios}</p>
                      </div>

                      <div className="p-4 rounded-lg bg-[#0d1321] border border-[#1c2842] space-y-1">
                        <span className="text-[11px] text-slate-500 block uppercase">Chassis Serial Number</span>
                        <p className="text-sm font-bold text-cyan-400">{data.hardware.serial_number}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-slate-500 text-xs">No hardware registers reported for this device.</p>
                  )}
                </div>
              )}

              {/* TAB 3: NETWORK */}
              {activeTab === 'network' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="p-3.5 rounded-lg bg-[#0d1321] border border-[#1c2842]">
                      <span className="text-[11px] text-slate-500 block">Assigned Subnet</span>
                      <span className="text-sm font-bold text-cyan-300">{data.overview.subnet}</span>
                    </div>
                    <div className="p-3.5 rounded-lg bg-[#0d1321] border border-[#1c2842]">
                      <span className="text-[11px] text-slate-500 block">VLAN Segment</span>
                      <span className="text-sm font-bold text-slate-200">{data.overview.vlan}</span>
                    </div>
                  </div>

                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                    Network Adapters & Interfaces
                  </h3>

                  <div className="divide-y divide-[#1c2842] bg-[#0d1321] border border-[#1c2842] rounded-lg">
                    {data.network.map((iface, idx) => (
                      <div key={idx} className="p-4 grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                        <div>
                          <span className="text-slate-500 block text-[10px]">Interface Name</span>
                          <span className="text-slate-200 font-semibold">{iface.interface_name}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px]">IP & Gateway</span>
                          <span className="text-cyan-300">{iface.ip_address}</span>
                          <span className="text-slate-500 text-[10px] block">GW: {iface.gateway}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px]">MAC Address</span>
                          <span className="text-slate-300">{iface.mac_address}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px]">Vendor Info</span>
                          <span className="text-slate-400">{iface.vendor}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 4: SERVICES */}
              {activeTab === 'services' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                    <span>Active Background Daemons & Windows Services</span>
                    <span>Total Services: {data.services.length}</span>
                  </div>
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-[#11192c] border-b border-[#1c2842] text-slate-400 text-[11px]">
                        <th className="py-2.5 px-3">Service Name</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">Version</th>
                        <th className="py-2.5 px-3">Startup Type</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1c2842]">
                      {data.services.map((srv, idx) => (
                        <tr key={idx} className="hover:bg-[#141d30]">
                          <td className="py-2.5 px-3 font-semibold text-slate-200">{srv.service_name}</td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-700/50">
                              {srv.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-400">{srv.version}</td>
                          <td className="py-2.5 px-3 text-slate-400">{srv.startup_type}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* TAB 5: PORTS */}
              {activeTab === 'ports' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                    <span>Discovered Listening Ports (Nmap / Wazuh Syscollector)</span>
                    <span>Total Ports: {data.ports.length}</span>
                  </div>
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-[#11192c] border-b border-[#1c2842] text-slate-400 text-[11px]">
                        <th className="py-2.5 px-3">Port</th>
                        <th className="py-2.5 px-3">Protocol</th>
                        <th className="py-2.5 px-3">Service</th>
                        <th className="py-2.5 px-3">State</th>
                        <th className="py-2.5 px-3">Last Detected</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1c2842]">
                      {data.ports.map((p, idx) => (
                        <tr key={idx} className="hover:bg-[#141d30]">
                          <td className="py-2.5 px-3 font-bold text-cyan-400">{p.port}</td>
                          <td className="py-2.5 px-3 text-slate-400">{p.protocol}</td>
                          <td className="py-2.5 px-3 font-semibold text-slate-200">{p.service}</td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-700/50">
                              {p.state}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                            {new Date(p.last_detected).toLocaleTimeString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* TAB 6: SOFTWARE */}
              {activeTab === 'software' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                    <span>Installed Software Inventory (Wazuh Syscollector DB)</span>
                    <span>Installed Items: {data.software.length}</span>
                  </div>
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-[#11192c] border-b border-[#1c2842] text-slate-400 text-[11px]">
                        <th className="py-2.5 px-3">Software Name</th>
                        <th className="py-2.5 px-3">Version</th>
                        <th className="py-2.5 px-3">Publisher</th>
                        <th className="py-2.5 px-3">Installed Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1c2842]">
                      {data.software.map((sw, idx) => (
                        <tr key={idx} className="hover:bg-[#141d30]">
                          <td className="py-2.5 px-3 font-semibold text-slate-200">{sw.software_name}</td>
                          <td className="py-2.5 px-3 text-cyan-300 font-mono">{sw.version}</td>
                          <td className="py-2.5 px-3 text-slate-400">{sw.publisher}</td>
                          <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                            {new Date(sw.installed_date).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* TAB 7: SECURITY & WAZUH */}
              {activeTab === 'security' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-rose-400" />
                      Associated Security Events & Detections
                    </h3>
                    <span className="text-xs text-slate-400">
                      Wazuh Manager + OpenSearch Cluster
                    </span>
                  </div>

                  {data.security_alerts.length === 0 ? (
                    <div className="p-8 text-center bg-[#0d1321] border border-[#1c2842] rounded-lg text-slate-400">
                      <ShieldCheck className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                      <p className="text-xs font-bold text-slate-200">No active security alerts logged for this asset.</p>
                      <p className="text-[11px] text-slate-500 mt-1">Endpoint complies with baseline security policies.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {data.security_alerts.map((alt) => (
                        <div key={alt.alert_id} className="p-4 rounded-lg bg-[#0d1321] border border-rose-900/40 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-950 text-rose-300 border border-rose-600">
                                {alt.severity}
                              </span>
                              <span className="text-xs font-bold text-slate-100">{alt.alert_type}</span>
                            </div>
                            <span className="text-[11px] text-slate-500">
                              {new Date(alt.timestamp).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-xs text-slate-300">{alt.description}</p>
                          <div className="flex items-center justify-between pt-2 border-t border-[#1c2842] text-[11px] text-slate-400">
                            <span>Source: <strong className="text-cyan-400">{alt.source}</strong></span>
                            <span>Status: <strong className="text-amber-400">{alt.status}</strong></span>
                            <span>Assigned: <strong className="text-slate-300">{alt.assigned_analyst}</strong></span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
