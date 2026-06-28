<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import PageHeader from '@/components/common/PageHeader.vue';
import LoadingSpinner from '@/components/common/LoadingSpinner.vue';
import StatusBadge from '@/components/common/StatusBadge.vue';
import { fetchCases } from '@/api/cases.api';
import { usePermissions } from '@/composables/usePermissions';
import { CaseStatus, CaseType, type Case } from '@/types';

const permissions = usePermissions();
const cases = ref<Case[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);
const search = ref('');
const status = ref('');
const type = ref('');
const page = ref(1);
const totalPages = ref(1);

async function loadCases() {
  loading.value = true;
  error.value = null;

  try {
    const response = await fetchCases({
      page: page.value,
      limit: 20,
      search: search.value || undefined,
      status: status.value || undefined,
      type: type.value || undefined,
    });
    cases.value = response.data;
    totalPages.value = response.meta.totalPages;
  } catch {
    error.value = 'Failed to load cases.';
  } finally {
    loading.value = false;
  }
}

function handleSearch() {
  page.value = 1;
  loadCases();
}

onMounted(loadCases);
</script>

<template>
  <div>
    <div class="mb-6 flex flex-wrap items-center justify-between gap-4">
      <PageHeader title="Cases" subtitle="Manage legal cases and matters" />
      <RouterLink
        v-if="permissions.canCreateRecords"
        to="/cases/new"
        class="rounded-md bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800"
      >
        New case
      </RouterLink>
    </div>

    <div class="mb-4 flex flex-wrap gap-2">
      <input
        v-model="search"
        type="search"
        placeholder="Search title or reference"
        class="w-full max-w-sm rounded-md border border-slate-300 px-3 py-2 text-sm"
        @keyup.enter="handleSearch"
      />
      <select v-model="status" class="rounded-md border border-slate-300 px-3 py-2 text-sm" @change="handleSearch">
        <option value="">All statuses</option>
        <option v-for="item in Object.values(CaseStatus)" :key="item" :value="item">{{ item }}</option>
      </select>
      <select v-model="type" class="rounded-md border border-slate-300 px-3 py-2 text-sm" @change="handleSearch">
        <option value="">All types</option>
        <option v-for="item in Object.values(CaseType)" :key="item" :value="item">{{ item }}</option>
      </select>
      <button
        type="button"
        class="rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
        @click="handleSearch"
      >
        Apply
      </button>
    </div>

    <LoadingSpinner v-if="loading" message="Loading cases..." />

    <p v-else-if="error" class="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{{ error }}</p>

    <div v-else class="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <table class="min-w-full divide-y divide-slate-200">
        <thead class="bg-slate-50">
          <tr>
            <th class="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Reference</th>
            <th class="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Title</th>
            <th class="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Owner</th>
            <th class="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Status</th>
            <th class="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Priority</th>
            <th class="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-200">
          <tr v-for="item in cases" :key="item.id" class="hover:bg-slate-50">
            <td class="px-4 py-3 text-sm font-medium text-slate-900">{{ item.referenceCode }}</td>
            <td class="px-4 py-3 text-sm text-slate-700">{{ item.title }}</td>
            <td class="px-4 py-3 text-sm text-slate-600">
              {{ item.owner.firstName }} {{ item.owner.lastName }}
            </td>
            <td class="px-4 py-3 text-sm">
              <StatusBadge :label="item.status" :value="item.status" />
            </td>
            <td class="px-4 py-3 text-sm">
              <StatusBadge :label="item.priority" :value="item.priority" />
            </td>
            <td class="px-4 py-3 text-right text-sm">
              <RouterLink :to="`/cases/${item.id}`" class="text-brand-700 hover:text-brand-800">
                View
              </RouterLink>
            </td>
          </tr>
          <tr v-if="cases.length === 0">
            <td colspan="6" class="px-4 py-8 text-center text-sm text-slate-500">No cases found.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="totalPages > 1" class="mt-4 flex justify-end gap-2">
      <button
        type="button"
        class="rounded border border-slate-300 px-3 py-1 text-sm disabled:opacity-50"
        :disabled="page <= 1"
        @click="page--; loadCases()"
      >
        Previous
      </button>
      <span class="px-2 py-1 text-sm text-slate-600">Page {{ page }} of {{ totalPages }}</span>
      <button
        type="button"
        class="rounded border border-slate-300 px-3 py-1 text-sm disabled:opacity-50"
        :disabled="page >= totalPages"
        @click="page++; loadCases()"
      >
        Next
      </button>
    </div>
  </div>
</template>
