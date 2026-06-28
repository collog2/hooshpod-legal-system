import api from './client';
import type { AuthResponse, AuthUser } from '@/types';

export async function login(email: string, password: string): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/auth/login', { email, password });
  return data;
}

export async function getMe(): Promise<AuthUser & { isActive: boolean; createdAt: string; updatedAt: string }> {
  const { data } = await api.get('/auth/me');
  return data;
}
