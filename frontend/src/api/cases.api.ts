import api from './client';
import type { Case, CreateCasePayload, PaginatedResponse, UpdateCasePayload } from '@/types';

export interface CasesQuery {
  page?: number;
  limit?: number;
  status?: string;
  type?: string;
  priority?: string;
  ownerId?: string;
  search?: string;
}

export async function fetchCases(query: CasesQuery = {}): Promise<PaginatedResponse<Case>> {
  const { data } = await api.get<PaginatedResponse<Case>>('/cases', { params: query });
  return data;
}

export async function fetchCase(id: string): Promise<Case> {
  const { data } = await api.get<Case>(`/cases/${id}`);
  return data;
}

export async function createCase(payload: CreateCasePayload): Promise<Case> {
  const { data } = await api.post<Case>('/cases', payload);
  return data;
}

export async function updateCase(id: string, payload: UpdateCasePayload): Promise<Case> {
  const { data } = await api.patch<Case>(`/cases/${id}`, payload);
  return data;
}

export async function reassignCaseOwner(id: string, ownerId: string): Promise<Case> {
  const { data } = await api.patch<Case>(`/cases/${id}/owner`, { ownerId });
  return data;
}

export async function deleteCase(id: string): Promise<Case> {
  const { data } = await api.delete<Case>(`/cases/${id}`);
  return data;
}
