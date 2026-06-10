import type {
  AssignmentInput,
  ChangeLogEntry,
  CommunityRole,
  Mass,
  MassType,
  Member,
  MemberPickerItem,
  MemberHistoryEntry,
  Priest,
  Stats,
} from './types';

export const API_URL =
  import.meta.env.VITE_API_URL ??
  (import.meta.env.PROD ? '/api' : 'http://localhost:3000/api');

const getCache = new Map<string, Promise<unknown>>();

export function invalidateApiCache() {
  getCache.clear();
}

function cachedGet<T>(endpoint: string): Promise<T> {
  if (!getCache.has(endpoint)) {
    const promise = request<T>(endpoint).catch((err) => {
      getCache.delete(endpoint);
      throw err;
    });
    getCache.set(endpoint, promise);
  }
  return getCache.get(endpoint) as Promise<T>;
}

function mutate<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  return request<T>(endpoint, options).then((result) => {
    invalidateApiCache();
    return result;
  });
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const text = await response.text();
    if (text.trimStart().toLowerCase().startsWith('<!doctype') || text.trimStart().startsWith('<html')) {
      throw new Error('Server is waking up. Wait a moment and try again.');
    }
    throw new Error(text.slice(0, 120) || `Request failed (${response.status})`);
  }
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Request failed');
  }
  if (response.status === 204) return undefined as T;
  return data;
}

export const api = {
  getStats: () => cachedGet<Stats>('/stats'),
  getMembers: () => cachedGet<Member[]>('/members'),
  getMemberPickerList: () => cachedGet<MemberPickerItem[]>('/members/picker'),
  getMember: (id: number) => cachedGet<Member>(`/members/${id}`),
  createMember: (data: Partial<Member>) =>
    mutate<Member>('/members', { method: 'POST', body: JSON.stringify(data) }),
  updateMember: (id: number, data: Partial<Member>) =>
    mutate<Member>(`/members/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteMember: (id: number) =>
    mutate<{ message: string }>(`/members/${id}`, { method: 'DELETE' }),
  addMemberRole: (memberId: number, roleId: number) =>
    mutate<Member>(`/members/${memberId}/roles`, {
      method: 'POST',
      body: JSON.stringify({ role_id: roleId }),
    }),
  removeMemberRole: (memberId: number, roleId: number) =>
    mutate<Member>(`/members/${memberId}/roles/${roleId}`, { method: 'DELETE' }),
  getMemberHistory: (id: number) =>
    cachedGet<MemberHistoryEntry[]>(`/members/${id}/history`),

  getPriests: () => cachedGet<Priest[]>('/priests'),
  createPriest: (data: { name: string; title?: string; phone?: string }) =>
    mutate<Priest>('/priests', { method: 'POST', body: JSON.stringify(data) }),
  updatePriest: (id: number, data: Partial<Priest>) =>
    mutate<Priest>(`/priests/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deletePriest: (id: number) =>
    mutate<{ message: string }>(`/priests/${id}`, { method: 'DELETE' }),

  getRoles: () => cachedGet<CommunityRole[]>('/roles'),
  createRole: (data: { name: string; category?: string; description?: string }) =>
    mutate<CommunityRole>('/roles', { method: 'POST', body: JSON.stringify(data) }),

  getMassTypes: () => cachedGet<MassType[]>('/mass-types'),
  getMasses: () => cachedGet<Mass[]>('/masses'),
  getUpcomingMasses: () => cachedGet<Mass[]>('/masses/upcoming'),
  getPastMasses: () => cachedGet<Mass[]>('/masses/past'),
  getMass: (id: number) => cachedGet<Mass>(`/masses/${id}`),
  createMass: (data: {
    mass_type_id: number;
    date: string;
    time?: string;
    celebrant?: string;
    notes?: string;
  }) => mutate<Mass>('/masses', { method: 'POST', body: JSON.stringify(data) }),
  updateMass: (
    id: number,
    data: {
      mass_type_id?: number;
      date?: string;
      time?: string;
      celebrant?: string;
      notes?: string;
      change_reason: string;
      changed_by?: string;
    }
  ) => mutate<Mass>(`/masses/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteMass: (id: number) =>
    mutate<{ message: string }>(`/masses/${id}`, { method: 'DELETE' }),
  bulkUpdateAssignments: (
    massId: number,
    assignments: AssignmentInput[],
    changeReason?: string,
    changedBy?: string
  ) =>
    mutate<Mass>(`/masses/${massId}/assignments/bulk-update`, {
      method: 'POST',
      body: JSON.stringify({
        assignments,
        change_reason: changeReason,
        changed_by: changedBy,
      }),
    }),
  addApostle: (
    massId: number,
    data: { apostle_name: string; member_id?: number; member_name_override?: string }
  ) =>
    mutate<Mass>(`/masses/${massId}/apostles`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  deleteApostle: (massId: number, apostleId: number) =>
    mutate<{ message: string }>(`/masses/${massId}/apostles/${apostleId}`, {
      method: 'DELETE',
    }),
  getDepartedSouls: (massId: number) =>
    cachedGet<{ id: number; name: string; family_name?: string }[]>(
      `/masses/${massId}/departed-souls`
    ),
  addDepartedSoul: (massId: number, data: { name: string; family_name?: string }) =>
    mutate(`/masses/${massId}/departed-souls`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  deleteDepartedSoul: (massId: number, soulId: number) =>
    mutate(`/masses/${massId}/departed-souls/${soulId}`, { method: 'DELETE' }),

  getChangelog: (limit?: number) =>
    cachedGet<ChangeLogEntry[]>(`/changelog${limit ? `?limit=${limit}` : ''}`),

  exportMassesUrl: (params: { year?: string; start_date?: string; end_date?: string }) => {
    const query = new URLSearchParams();
    if (params.year) query.set('year', params.year);
    if (params.start_date) query.set('start_date', params.start_date);
    if (params.end_date) query.set('end_date', params.end_date);
    return `${API_URL}/masses/export?${query.toString()}`;
  },
};
