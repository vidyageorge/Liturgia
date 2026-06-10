import type {
  AssignmentInput,
  ChangeLogEntry,
  CommunityRole,
  Mass,
  MassType,
  Member,
  MemberHistoryEntry,
  Priest,
  Stats,
} from './types';

const API_URL = import.meta.env.VITE_API_URL ?? '/api';

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error || 'Request failed');
  }
  if (response.status === 204) return undefined as T;
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) return undefined as T;
  return response.json();
}

export const api = {
  getStats: () => request<Stats>('/stats'),
  getMembers: () => request<Member[]>('/members'),
  getMember: (id: number) => request<Member>(`/members/${id}`),
  createMember: (data: Partial<Member>) =>
    request<Member>('/members', { method: 'POST', body: JSON.stringify(data) }),
  updateMember: (id: number, data: Partial<Member>) =>
    request<Member>(`/members/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteMember: (id: number) =>
    request<{ message: string }>(`/members/${id}`, { method: 'DELETE' }),
  addMemberRole: (memberId: number, roleId: number) =>
    request<Member>(`/members/${memberId}/roles`, {
      method: 'POST',
      body: JSON.stringify({ role_id: roleId }),
    }),
  removeMemberRole: (memberId: number, roleId: number) =>
    request<Member>(`/members/${memberId}/roles/${roleId}`, { method: 'DELETE' }),
  getMemberHistory: (id: number) => request<MemberHistoryEntry[]>(`/members/${id}/history`),

  getPriests: () => request<Priest[]>('/priests'),
  createPriest: (data: { name: string; title?: string; phone?: string }) =>
    request<Priest>('/priests', { method: 'POST', body: JSON.stringify(data) }),
  updatePriest: (id: number, data: Partial<Priest>) =>
    request<Priest>(`/priests/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deletePriest: (id: number) =>
    request<{ message: string }>(`/priests/${id}`, { method: 'DELETE' }),

  getRoles: () => request<CommunityRole[]>('/roles'),
  createRole: (data: { name: string; category?: string; description?: string }) =>
    request<CommunityRole>('/roles', { method: 'POST', body: JSON.stringify(data) }),

  getMassTypes: () => request<MassType[]>('/mass-types'),
  getMasses: () => request<Mass[]>('/masses'),
  getUpcomingMasses: () => request<Mass[]>('/masses/upcoming'),
  getPastMasses: () => request<Mass[]>('/masses/past'),
  getMass: (id: number) => request<Mass>(`/masses/${id}`),
  createMass: (data: {
    mass_type_id: number;
    date: string;
    time?: string;
    celebrant?: string;
    notes?: string;
  }) => request<Mass>('/masses', { method: 'POST', body: JSON.stringify(data) }),
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
  ) => request<Mass>(`/masses/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteMass: (id: number) =>
    request<{ message: string }>(`/masses/${id}`, { method: 'DELETE' }),
  bulkUpdateAssignments: (
    massId: number,
    assignments: AssignmentInput[],
    changeReason?: string,
    changedBy?: string
  ) =>
    request<Mass>(`/masses/${massId}/assignments/bulk-update`, {
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
    request<Mass>(`/masses/${massId}/apostles`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  deleteApostle: (massId: number, apostleId: number) =>
    request<{ message: string }>(`/masses/${massId}/apostles/${apostleId}`, {
      method: 'DELETE',
    }),
  getDepartedSouls: (massId: number) =>
    request<{ id: number; name: string; family_name?: string }[]>(
      `/masses/${massId}/departed-souls`
    ),
  addDepartedSoul: (massId: number, data: { name: string; family_name?: string }) =>
    request(`/masses/${massId}/departed-souls`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  deleteDepartedSoul: (massId: number, soulId: number) =>
    request(`/masses/${massId}/departed-souls/${soulId}`, { method: 'DELETE' }),

  getChangelog: (limit?: number) =>
    request<ChangeLogEntry[]>(`/changelog${limit ? `?limit=${limit}` : ''}`),

  exportMassesUrl: (params: { year?: string; start_date?: string; end_date?: string }) => {
    const query = new URLSearchParams();
    if (params.year) query.set('year', params.year);
    if (params.start_date) query.set('start_date', params.start_date);
    if (params.end_date) query.set('end_date', params.end_date);
    return `${API_URL}/masses/export?${query.toString()}`;
  },
};
