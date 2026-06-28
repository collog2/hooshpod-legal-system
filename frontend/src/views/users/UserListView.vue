<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import PageHeader from '@/components/common/PageHeader.vue';
import LoadingSpinner from '@/components/common/LoadingSpinner.vue';
import { fetchUsers } from '@/api/users.api';
import { useAuthStore } from '@/stores/auth.store';
import type { User } from '@/types';

const auth = useAuthStore();
const users = ref<User[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);
const search = ref('');
const page = ref(1);
const totalPages = ref(1);

async function loadUsers() {
  loading.value = true;
  error.value = null;

  try {
    const response = await fetchUsers({
      page: page.value,
      limit: 20,
      search: search.value || undefined,
    });
    users.value = response.data;
    totalPages.value = response.meta.totalPages;
  } catch {
    error.value = 'Failed to load users.';
  } finally {
    loading.value = false;
  }
}

function handleSearch() {
  page.value = 1;
  loadUsers();
}

onMounted(loadUsers);
</script>

<template>
  <div>
    <div class="mb-6 flex flex-wrap items-center justify-between gap-4">
      <PageHeader title="Users" subtitle="Manage system users and roles" />
      <RouterLink
        v-if="auth.canEditUsers"
        to="/users/new"
        class="rounded-md bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800"
      >
        Add user
      </RouterLink>
    </div>

    <div class="mb-4 flex gap-2">
      <input
        v-model="search"
        type="search"
        placeholder="Search by name or email"
        class="w-full max-w-sm rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600"
        @keyup.enter="handleSearch"
      />
      <button
        type="button"
        class="rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
        @click="handleSearch"
      >
        Search
      </button>
    </div>

    <LoadingSpinner v-if="loading" message="Loading users..." />

    <p v-else-if="error" class="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{{ error }}</p>

    <div v-else class="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <table class="min-w-full divide-y divide-slate-200">
        <thead class="bg-slate-50">
          <tr>
            <th class="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Name</th>
            <th class="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Email</th>
            <th class="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Role</th>
            <th class="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Status</th>
            <th v-if="auth.canEditUsers" class="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">
              Actions
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-200">
          <tr v-for="user in users" :key="user.id" class="hover:bg-slate-50">
            <td class="px-4 py-3 text-sm font-medium text-slate-900">
              {{ user.firstName }} {{ user.lastName }}
            </td>
            <td class="px-4 py-3 text-sm text-slate-600">{{ user.email }}</td>
            <td class="px-4 py-3 text-sm text-slate-600">{{ user.role }}</td>
            <td class="px-4 py-3 text-sm">
              <span
                class="rounded-full px-2 py-0.5 text-xs font-medium"
                :class="user.isActive ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-600'"
              >
                {{ user.isActive ? 'Active' : 'Inactive' }}
              </span>
            </td>
            <td v-if="auth.canEditUsers" class="px-4 py-3 text-right text-sm">
              <RouterLink
                :to="`/users/${user.id}/edit`"
                class="text-brand-700 hover:text-brand-800"
              >
                Edit
              </RouterLink>
            </td>
          </tr>
          <tr v-if="users.length === 0">
            <td colspan="5" class="px-4 py-8 text-center text-sm text-slate-500">No users found.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="totalPages > 1" class="mt-4 flex justify-end gap-2">
      <button
        type="button"
        class="rounded border border-slate-300 px-3 py-1 text-sm disabled:opacity-50"
        :disabled="page <= 1"
        @click="page--; loadUsers()"
      >
        Previous
      </button>
      <span class="px-2 py-1 text-sm text-slate-600">Page {{ page }} of {{ totalPages }}</span>
      <button
        type="button"
        class="rounded border border-slate-300 px-3 py-1 text-sm disabled:opacity-50"
        :disabled="page >= totalPages"
        @click="page++; loadUsers()"
      >
        Next
      </button>
    </div>
  </div>
</template>
