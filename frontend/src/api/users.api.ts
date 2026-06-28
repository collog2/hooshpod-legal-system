import api from './client';
import type {
  CreateUserPayload,
  PaginatedResponse,
  UpdateUserPayload,
  User,
} from '@/types';

export interface UsersQuery {
  page?: number;
  limit?: number;
  role?: string;
  search?: string;
}

export async function fetchUsers(query: UsersQuery = {}): Promise<PaginatedResponse<User>> {
  const { data } = await api.get<PaginatedResponse<User>>('/users', { params: query });
  return data;
}

export async function fetchUser(id: string): Promise<User> {
  const { data } = await api.get<User>(`/users/${id}`);
  return data;
}

export async function createUser(payload: CreateUserPayload): Promise<User> {
  const { data } = await api.post<User>('/users', payload);
  return data;
}

export async function updateUser(id: string, payload: UpdateUserPayload): Promise<User> {
  const { data } = await api.patch<User>(`/users/${id}`, payload);
  return data;
}

export async function deleteUser(id: string): Promise<User> {
  const { data } = await api.delete<User>(`/users/${id}`);
  return data;
}
