import {
  KPISummary,
  CategorySummary,
  AssetItem,
  AssetDetailResponse,
  SecurityAlertItem,
  SubnetItem,
  BrandItem,
  AuditLogItem,
  UserItem
} from '../types';

// Dynamic API resolution for production and development
const getApiBaseUrl = () => {
  const envUrl = (import.meta as any).env?.VITE_API_URL;
  if (envUrl) {
    return `${envUrl.replace(/\/$/, '')}/api/v1`;
  }
  // If hosted in production, use relative /api/v1 (or same origin)
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return '/api/v1';
  }
  return 'http://127.0.0.1:8000/api/v1';
};

const API_BASE_URL = getApiBaseUrl();

// Token storage in memory
let authToken: string | null = null;
let currentRole: string = 'Super Admin';
let currentUserFullName: string = 'Security Administrator';

export const getAuthToken = () => authToken;
export const setAuthToken = (token: string | null, role?: string, name?: string) => {
  authToken = token;
  if (role) currentRole = role;
  if (name) currentUserFullName = name;
};
export const getCurrentRole = () => currentRole;
export const getCurrentUserFullName = () => currentUserFullName;

const getHeaders = () => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  return headers;
};

// Auto initialize with superadmin token on first load
export const initializeAuth = async () => {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/switch-persona/Super%20Admin`, {
      method: 'POST',
    });
    if (res.ok) {
      const data = await res.json();
      setAuthToken(data.access_token, data.role, data.full_name);
      return data;
    }
  } catch (e) {
    console.warn('Backend not yet ready for auto-auth:', e);
  }
  return null;
};

export const switchUserPersona = async (role: string) => {
  const encodedRole = encodeURIComponent(role);
  const res = await fetch(`${API_BASE_URL}/auth/switch-persona/${encodedRole}`, {
    method: 'POST',
  });
  if (!res.ok) {
    throw new Error(`Failed to switch role to ${role}`);
  }
  const data = await res.json();
  setAuthToken(data.access_token, data.role, data.full_name);
  return data;
};

export const fetchKPIs = async (): Promise<KPISummary> => {
  const res = await fetch(`${API_BASE_URL}/kpis`);
  if (!res.ok) throw new Error('Failed to load KPIs');
  return res.json();
};

export const fetchCategories = async (): Promise<CategorySummary[]> => {
  const res = await fetch(`${API_BASE_URL}/categories`);
  if (!res.ok) throw new Error('Failed to load categories');
  return res.json();
};

export interface AssetQueryParams {
  page?: number;
  page_size?: number;
  search?: string;
  category?: string;
  status?: string;
  vendor?: string;
  risk?: string;
  subnet?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export const fetchAssets = async (params: AssetQueryParams) => {
  const query = new URLSearchParams();
  if (params.page) query.append('page', params.page.toString());
  if (params.page_size) query.append('page_size', params.page_size.toString());
  if (params.search) query.append('search', params.search);
  if (params.category && params.category !== 'All') query.append('category', params.category);
  if (params.status && params.status !== 'All') query.append('status', params.status);
  if (params.vendor && params.vendor !== 'All') query.append('vendor', params.vendor);
  if (params.risk && params.risk !== 'All') query.append('risk', params.risk);
  if (params.subnet && params.subnet !== 'All') query.append('subnet', params.subnet);
  if (params.sort_by) query.append('sort_by', params.sort_by);
  if (params.sort_order) query.append('sort_order', params.sort_order);

  const res = await fetch(`${API_BASE_URL}/assets?${query.toString()}`);
  if (!res.ok) throw new Error('Failed to load assets');
  return res.json();
};

export const fetchAssetDetail = async (assetId: string): Promise<AssetDetailResponse> => {
  const res = await fetch(`${API_BASE_URL}/assets/${assetId}`);
  if (!res.ok) throw new Error(`Asset ${assetId} not found`);
  return res.json();
};

export const updateAsset = async (assetId: string, payload: Record<string, any>) => {
  const res = await fetch(`${API_BASE_URL}/assets/${assetId}`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Failed to update asset' }));
    throw new Error(errorData.detail || 'Failed to update asset');
  }
  return res.json();
};

export const getExportCsvUrl = (category?: string, status?: string, subnet?: string) => {
  const query = new URLSearchParams();
  if (category && category !== 'All') query.append('category', category);
  if (status && status !== 'All') query.append('status', status);
  if (subnet && subnet !== 'All') query.append('subnet', subnet);
  return `${API_BASE_URL}/assets/export/csv?${query.toString()}`;
};

export const fetchAlerts = async (params: { page?: number; page_size?: number; severity?: string; status?: string; search?: string }) => {
  const query = new URLSearchParams();
  if (params.page) query.append('page', params.page.toString());
  if (params.page_size) query.append('page_size', params.page_size.toString());
  if (params.severity && params.severity !== 'All') query.append('severity', params.severity);
  if (params.status && params.status !== 'All') query.append('status', params.status);
  if (params.search) query.append('search', params.search);

  const res = await fetch(`${API_BASE_URL}/alerts?${query.toString()}`);
  if (!res.ok) throw new Error('Failed to load alerts');
  return res.json();
};

export const updateAlertStatus = async (alertId: string, status: string, assignedAnalyst?: string) => {
  const res = await fetch(`${API_BASE_URL}/alerts/${alertId}`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify({ status, assigned_analyst: assignedAnalyst })
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Failed to update alert' }));
    throw new Error(errorData.detail || 'Failed to update alert');
  }
  return res.json();
};

export const fetchSubnets = async (): Promise<SubnetItem[]> => {
  const res = await fetch(`${API_BASE_URL}/network/subnets`);
  if (!res.ok) throw new Error('Failed to load subnets');
  return res.json();
};

export const fetchBrands = async (): Promise<BrandItem[]> => {
  const res = await fetch(`${API_BASE_URL}/brands`);
  if (!res.ok) throw new Error('Failed to load brand inventory');
  return res.json();
};

export const fetchAuditLogs = async (params: { page?: number; user?: string; action?: string; result?: string }) => {
  const query = new URLSearchParams();
  if (params.page) query.append('page', params.page.toString());
  if (params.user && params.user !== 'All') query.append('user', params.user);
  if (params.action) query.append('action', params.action);
  if (params.result && params.result !== 'All') query.append('result', params.result);

  const res = await fetch(`${API_BASE_URL}/audit-logs?${query.toString()}`, {
    headers: getHeaders()
  });
  if (!res.ok) throw new Error('Failed to load audit logs');
  return res.json();
};

export const fetchUsers = async (): Promise<UserItem[]> => {
  const res = await fetch(`${API_BASE_URL}/admin/users`, {
    headers: getHeaders()
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Forbidden' }));
    throw new Error(errorData.detail || 'Failed to load users');
  }
  return res.json();
};

export const createUser = async (userData: any) => {
  const res = await fetch(`${API_BASE_URL}/admin/users`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(userData)
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Failed to create user' }));
    throw new Error(errorData.detail || 'Failed to create user');
  }
  return res.json();
};

export const deleteUser = async (userId: number) => {
  const res = await fetch(`${API_BASE_URL}/admin/users/${userId}`, {
    method: 'DELETE',
    headers: getHeaders()
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Failed to delete user' }));
    throw new Error(errorData.detail || 'Failed to delete user');
  }
  return res.json();
};

export const fetchSystemConfig = async () => {
  const res = await fetch(`${API_BASE_URL}/admin/config`, {
    headers: getHeaders()
  });
  if (!res.ok) throw new Error('Failed to load system config');
  return res.json();
};

export const updateSystemConfig = async (configs: Record<string, string>) => {
  const res = await fetch(`${API_BASE_URL}/admin/config`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(configs)
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Failed to save config' }));
    throw new Error(errorData.detail || 'Failed to save config');
  }
  return res.json();
};

export const fetchAgentsSummary = async () => {
  const res = await fetch(`${API_BASE_URL}/admin/agents-summary`);
  if (!res.ok) throw new Error('Failed to load agents summary');
  return res.json();
};
