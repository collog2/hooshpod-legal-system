import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import * as authApi from '@/api/auth.api';
import type { AuthUser } from '@/types';
import { UserRole } from '@/types';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<AuthUser | null>(loadStoredUser());
  const loading = ref(false);
  const error = ref<string | null>(null);

  const isAuthenticated = computed(() => !!user.value);
  const isAdmin = computed(() => user.value?.role === UserRole.ADMIN);
  const isManager = computed(() => user.value?.role === UserRole.MANAGER);
  const canManageUsers = computed(
    () => user.value?.role === UserRole.ADMIN || user.value?.role === UserRole.MANAGER,
  );
  const canEditUsers = computed(() => user.value?.role === UserRole.ADMIN);

  function loadStoredUser(): AuthUser | null {
    const raw = localStorage.getItem('authUser');

    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as AuthUser;
    } catch {
      return null;
    }
  }

  async function login(email: string, password: string) {
    loading.value = true;
    error.value = null;

    try {
      const response = await authApi.login(email, password);
      localStorage.setItem('accessToken', response.accessToken);
      localStorage.setItem('authUser', JSON.stringify(response.user));
      user.value = response.user;
      return response;
    } catch (err: unknown) {
      error.value = extractErrorMessage(err, 'Login failed');
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function fetchProfile() {
    const profile = await authApi.getMe();
    const authUser: AuthUser = {
      id: profile.id,
      email: profile.email,
      firstName: profile.firstName,
      lastName: profile.lastName,
      role: profile.role,
    };
    user.value = authUser;
    localStorage.setItem('authUser', JSON.stringify(authUser));
    return profile;
  }

  function logout() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('authUser');
    user.value = null;
  }

  return {
    user,
    loading,
    error,
    isAuthenticated,
    isAdmin,
    isManager,
    canManageUsers,
    canEditUsers,
    login,
    fetchProfile,
    logout,
  };
});

function extractErrorMessage(err: unknown, fallback: string): string {
  if (typeof err === 'object' && err !== null && 'response' in err) {
    const response = (err as { response?: { data?: { message?: string | string[] } } }).response;

    if (Array.isArray(response?.data?.message)) {
      return response.data.message.join(', ');
    }

    if (typeof response?.data?.message === 'string') {
      return response.data.message;
    }
  }

  return fallback;
}
