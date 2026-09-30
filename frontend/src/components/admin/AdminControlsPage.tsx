import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Settings, 
  Radio, 
  ShieldCheck, 
  Save, 
  UserPlus, 
  CheckCircle, 
  AlertTriangle,
  Server,
  Lock,
  Activity
} from 'lucide-react';
import { UserItem } from '../../types';
import { 
  fetchUsers, 
  createUser, 
  fetchSystemConfig, 
  updateSystemConfig, 
  fetchAgentsSummary, 
  getCurrentRole 
} from '../../services/api';

export const AdminControlsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'users' | 'discovery' | 'agents'>('users');
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loadingUsers, setLoadingUsers] = useState<boolean>(true);
  const [configs, setConfigs] = useState<Record<string, string>>({});
  const [savingConfig, setSavingConfig] = useState<boolean>(false);
  const [configSuccess, setConfigSuccess] = useState<string>('');
  const [agentSummary, setAgentSummary] = useState<any>(null);

  // New user form state
  const [showAddUser, setShowAddUser] = useState<boolean>(false);
  const [newUsername, setNewUsername] = useState<string>('');
  const [newEmail, setNewEmail] = useState<string>('');
  const [newFullName, setNewFullName] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [newRole, setNewRole] = useState<string>('SOC Analyst');
  const [userError, setUserError] = useState<string>('');

  const currentRole = getCurrentRole();
  const isSuperAdmin = currentRole === 'Super Admin';
  const isAdmin = ['Super Admin', 'SOC Admin'].includes(currentRole);

  useEffect(() => {
    if (isAdmin) {
      loadUsers();
      loadConfig();
    }
    fetchAgentsSummary().then(setAgentSummary).catch(console.error);
  }, [currentRole]);

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const data = await fetchUsers();
      setUsers(data);
    } catch (e: any) {
      setUserError(e.message || 'Permission denied to view users');
    } finally {
      setLoadingUsers(false);
    }
  };

  const loadConfig = async () => {
    try {
      const data = await fetchSystemConfig();
      setConfigs(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    setConfigSuccess('');
    try {
      await updateSystemConfig(configs);
      setConfigSuccess('System configurations successfully saved and synchronized.');
      setTimeout(() => setConfigSuccess(''), 4000);
    } catch (e: any) {
      alert(`Error saving configuration: ${e.message}`);
    } finally {
      setSavingConfig(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserError('');
    try {
      await createUser({
        username: newUsername,
        email: newEmail,
        full_name: newFullName,
        password: newPassword,
        role: newRole
      });
      setShowAddUser(false);
      setNewUsername('');
      setNewEmail('');
      setNewFullName('');
      setNewPassword('');
      loadUsers();
    } catch (e: any) {
      setUserError(e.message || 'Failed to create user');
    }
  };

  if (!isAdmin) {
    return (
      <div className="p-12 text-center bg-[#0d1321] border border-[#1c2842] rounded-xl font-mono">
        <Lock className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-white uppercase">RBAC Restricted Access</h2>
        <p className="text-xs text-slate-400 mt-2 max-w-md mx-auto">
          You are currently authenticated with role <strong className="text-cyan-400">{currentRole}</strong>. 
          Administrator controls require <strong>Super Admin</strong> or <strong>SOC Admin</strong> privileges enforced by the FastAPI backend.
        </p>
        <p className="text-[11px] text-slate-500 mt-4">
          Tip: You can use the persona switcher in the top right navbar to test with 'Super Admin'.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-[#0d1321] border border-[#1c2842] rounded-xl shadow-soc-panel overflow-hidden font-mono">
      {/* Header */}
      <div className="px-6 py-4 bg-[#11192c] border-b border-[#1c2842] flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Settings className="w-4 h-4 text-cyan-400" />
            SOC Enterprise Administration & RBAC Controls
          </h2>
          <p className="text-[11px] text-slate-400">
            Discovery Scanners, Telemetry Thresholds & Security Team Directory
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center px-6 bg-[#090d16] border-b border-[#1c2842] text-xs">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-4 py-3 border-b-2 font-semibold transition-all ${
            activeTab === 'users' ? 'border-cyan-400 text-cyan-400' : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>User & Role Management</span>
        </button>

        <button
          onClick={() => setActiveTab('discovery')}
          className={`flex items-center gap-2 px-4 py-3 border-b-2 font-semibold transition-all ${
            activeTab === 'discovery' ? 'border-cyan-400 text-cyan-400' : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Radio className="w-4 h-4" />
          <span>Discovery & API Configurations</span>
        </button>

        <button
          onClick={() => setActiveTab('agents')}
          className={`flex items-center gap-2 px-4 py-3 border-b-2 font-semibold transition-all ${
            activeTab === 'agents' ? 'border-cyan-400 text-cyan-400' : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Agent Fleet Status</span>
        </button>
      </div>

      <div className="p-6">
        {/* TAB 1: USERS */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-white uppercase">Authorized Operators ({users.length})</h3>
                <p className="text-[11px] text-slate-400">Strict server-side JWT verification for each session</p>
              </div>

              {isSuperAdmin && (
                <button
                  onClick={() => setShowAddUser(!showAddUser)}
                  className="px-3 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Add Operator</span>
                </button>
              )}
            </div>

            {/* Add User Modal / Inline Drawer */}
            {showAddUser && (
              <form onSubmit={handleCreateUser} className="p-4 rounded-lg bg-[#090d16] border border-[#1c2842] space-y-3">
                <h4 className="text-xs font-bold text-cyan-300 uppercase">Provision New SOC User</h4>
                {userError && <p className="text-xs text-rose-400">{userError}</p>}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Username</label>
                    <input
                      type="text"
                      required
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      className="w-full bg-[#0d1321] border border-[#1c2842] text-xs text-white rounded p-1.5 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Email</label>
                    <input
                      type="email"
                      required
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      className="w-full bg-[#0d1321] border border-[#1c2842] text-xs text-white rounded p-1.5 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Full Name</label>
                    <input
                      type="text"
                      required
                      value={newFullName}
                      onChange={(e) => setNewFullName(e.target.value)}
                      className="w-full bg-[#0d1321] border border-[#1c2842] text-xs text-white rounded p-1.5 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Role</label>
                    <select
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value)}
                      className="w-full bg-[#0d1321] border border-[#1c2842] text-xs text-white rounded p-1.5 outline-none"
                    >
                      <option value="Super Admin">Super Admin</option>
                      <option value="SOC Admin">SOC Admin</option>
                      <option value="SOC Analyst">SOC Analyst</option>
                      <option value="Viewer">Viewer</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Initial Password</label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full max-w-sm bg-[#0d1321] border border-[#1c2842] text-xs text-white rounded p-1.5 outline-none"
                  />
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button type="submit" className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white text-xs rounded">
                    Save User
                  </button>
                  <button type="button" onClick={() => setShowAddUser(false)} className="px-3 py-1 bg-slate-800 text-slate-300 text-xs rounded">
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {/* Users Table */}
            <div className="overflow-x-auto border border-[#1c2842] rounded-lg">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#11192c] border-b border-[#1c2842] text-slate-400 text-[10px] uppercase">
                    <th className="py-2.5 px-3">Username</th>
                    <th className="py-2.5 px-3">Full Name</th>
                    <th className="py-2.5 px-3">Email</th>
                    <th className="py-2.5 px-3">Role</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1c2842]">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-[#141d30]">
                      <td className="py-2.5 px-3 font-bold text-cyan-300">{u.username}</td>
                      <td className="py-2.5 px-3 text-slate-200">{u.full_name}</td>
                      <td className="py-2.5 px-3 text-slate-400">{u.email}</td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          u.role === 'Super Admin' ? 'bg-purple-950 text-purple-300 border border-purple-700' :
                          u.role === 'SOC Admin' ? 'bg-indigo-950 text-indigo-300 border border-indigo-700' :
                          u.role === 'SOC Analyst' ? 'bg-cyan-950 text-cyan-300 border border-cyan-700' :
                          'bg-slate-800 text-slate-300'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="text-emerald-400 font-bold text-[10px]">Active</span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: DISCOVERY CONFIG */}
        {activeTab === 'discovery' && (
          <form onSubmit={handleSaveConfig} className="space-y-4 max-w-3xl">
            {configSuccess && (
              <div className="p-3 rounded bg-emerald-950/80 border border-emerald-600 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                <span>{configSuccess}</span>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-200 block mb-1">
                  Active Asset Discovery IP Ranges (CIDR notation)
                </label>
                <input
                  type="text"
                  value={configs['discovery.ip_ranges'] || ''}
                  onChange={(e) => setConfigs({ ...configs, 'discovery.ip_ranges': e.target.value })}
                  className="w-full bg-[#090d16] border border-[#1c2842] text-xs text-white rounded p-2 outline-none font-mono"
                />
                <span className="text-[10px] text-slate-500">Comma-separated target subnets for ARP, SNMP and ICMP sweeps</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-200 block mb-1">
                    Scan Frequency (Minutes)
                  </label>
                  <input
                    type="number"
                    value={configs['discovery.scan_frequency_minutes'] || '15'}
                    onChange={(e) => setConfigs({ ...configs, 'discovery.scan_frequency_minutes': e.target.value })}
                    className="w-full bg-[#090d16] border border-[#1c2842] text-xs text-white rounded p-2 outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-200 block mb-1">
                    Heartbeat Warning Timeout (Seconds)
                  </label>
                  <input
                    type="number"
                    value={configs['status.heartbeat_timeout_sec'] || '120'}
                    onChange={(e) => setConfigs({ ...configs, 'status.heartbeat_timeout_sec': e.target.value })}
                    className="w-full bg-[#090d16] border border-[#1c2842] text-xs text-white rounded p-2 outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-200 block mb-1">
                  Wazuh Central Manager API URL
                </label>
                <input
                  type="text"
                  value={configs['wazuh.api_endpoint'] || ''}
                  onChange={(e) => setConfigs({ ...configs, 'wazuh.api_endpoint': e.target.value })}
                  className="w-full bg-[#090d16] border border-[#1c2842] text-xs text-white rounded p-2 outline-none font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-200 block mb-1">
                  OpenSearch Cluster SIEM Endpoint
                </label>
                <input
                  type="text"
                  value={configs['opensearch.cluster_url'] || ''}
                  onChange={(e) => setConfigs({ ...configs, 'opensearch.cluster_url': e.target.value })}
                  className="w-full bg-[#090d16] border border-[#1c2842] text-xs text-white rounded p-2 outline-none font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={savingConfig}
              className="px-4 py-2 rounded bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-2 transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{savingConfig ? 'Saving...' : 'Apply System Settings'}</span>
            </button>
          </form>
        )}

        {/* TAB 3: AGENTS */}
        {activeTab === 'agents' && (
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-white uppercase">Agent Architecture & Ingestion Telemetry</h3>
            {agentSummary && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-[#090d16] border border-emerald-900/40 space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase">Active Wazuh Agents</span>
                  <div className="text-2xl font-bold text-emerald-400">{agentSummary.wazuh_agents_active}</div>
                  <span className="text-[10px] text-slate-400">Continuously reporting heartbeats & integrity</span>
                </div>

                <div className="p-4 rounded-lg bg-[#090d16] border border-rose-900/40 space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase">Disconnected Agents</span>
                  <div className="text-2xl font-bold text-rose-400">{agentSummary.wazuh_agents_disconnected}</div>
                  <span className="text-[10px] text-slate-400">Offline endpoints or stopped service</span>
                </div>

                <div className="p-4 rounded-lg bg-[#090d16] border border-[#1c2842] space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase">Unmanaged Hardware</span>
                  <div className="text-2xl font-bold text-purple-400">{agentSummary.unmanaged_network_devices}</div>
                  <span className="text-[10px] text-slate-400">Switches, Cameras, Printers (Agentless)</span>
                </div>
              </div>
            )}

            <div className="p-4 rounded-lg bg-[#090d16] border border-[#1c2842] space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Wazuh Server Status:</span>
                <span className="text-emerald-400 font-bold">{agentSummary?.wazuh_server_status || 'Online'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">OpenSearch Cluster Status:</span>
                <span className="text-emerald-400 font-bold">{agentSummary?.opensearch_cluster_status || 'Green'}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
