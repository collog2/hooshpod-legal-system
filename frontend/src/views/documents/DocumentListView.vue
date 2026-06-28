<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import PageHeader from '@/components/common/PageHeader.vue';
import LoadingSpinner from '@/components/common/LoadingSpinner.vue';
import { deleteDocument, downloadDocument, fetchDocuments } from '@/api/documents.api';
import { usePermissions } from '@/composables/usePermissions';
import { EntityType, type Document } from '@/types';

const permissions = usePermissions();
const documents = ref<Document[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);
const search = ref('');
const entityType = ref<EntityType | ''>('');
const page = ref(1);
const totalPages = ref(1);

async function loadDocuments() {
  loading.value = true;
  error.value = null;

  try {
    const response = await fetchDocuments({
      page: page.value,
      limit: 20,
      search: search.value || undefined,
      entityType: entityType.value || undefined,
    });
    documents.value = response.data;
    totalPages.value = response.meta.totalPages;
  } catch {
    error.value = 'Failed to load documents.';
  } finally {
    loading.value = false;
  }
}

function handleSearch() {
  page.value = 1;
  loadDocuments();
}

async function handleDownload(document: Document) {
  await downloadDocument(document.id, document.originalFilename);
}

async function handleDelete(document: Document) {
  if (!window.confirm(`Delete ${document.originalFilename}?`)) {
    return;
  }

  try {
    await deleteDocument(document.id);
    await loadDocuments();
  } catch {
    error.value = 'Failed to delete document.';
  }
}

function formatSize(size: number) {
  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

onMounted(loadDocuments);
</script>

<template>
  <div>
    <PageHeader title="Documents" subtitle="Browse uploaded files across accessible records" />

    <div class="mb-4 flex flex-wrap gap-2">
      <input
        v-model="search"
        type="search"
        placeholder="Search filename or description"
        class="w-full max-w-sm rounded-md border border-slate-300 px-3 py-2 text-sm"
        @keyup.enter="handleSearch"
      />
      <select v-model="entityType" class="rounded-md border border-slate-300 px-3 py-2 text-sm" @change="handleSearch">
        <option value="">All entity types</option>
        <option :value="EntityType.CASE">Case</option>
      </select>
      <button
        type="button"
        class="rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
        @click="handleSearch"
      >
        Apply
      </button>
    </div>

    <LoadingSpinner v-if="loading" message="Loading documents..." />

    <p v-else-if="error" class="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{{ error }}</p>

    <div v-else class="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <table class="min-w-full divide-y divide-slate-200">
        <thead class="bg-slate-50">
          <tr>
            <th class="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Filename</th>
            <th class="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Entity</th>
            <th class="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Size</th>
            <th class="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Uploaded by</th>
            <th class="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-200">
          <tr v-for="document in documents" :key="document.id" class="hover:bg-slate-50">
            <td class="px-4 py-3 text-sm font-medium text-slate-900">{{ document.originalFilename }}</td>
            <td class="px-4 py-3 text-sm text-slate-600">
              {{ document.entityType }}
              <RouterLink
                v-if="document.entityType === EntityType.CASE"
                :to="`/cases/${document.entityId}`"
                class="ml-1 text-brand-700 hover:text-brand-800"
              >
                View
              </RouterLink>
            </td>
            <td class="px-4 py-3 text-sm text-slate-600">{{ formatSize(document.size) }}</td>
            <td class="px-4 py-3 text-sm text-slate-600">
              {{ document.uploadedBy.firstName }} {{ document.uploadedBy.lastName }}
            </td>
            <td class="px-4 py-3 text-right text-sm">
              <button
                type="button"
                class="mr-3 text-brand-700 hover:text-brand-800"
                @click="handleDownload(document)"
              >
                Download
              </button>
              <button
                v-if="permissions.canUploadDocuments"
                type="button"
                class="text-red-600 hover:text-red-700"
                @click="handleDelete(document)"
              >
                Delete
              </button>
            </td>
          </tr>
          <tr v-if="documents.length === 0">
            <td colspan="5" class="px-4 py-8 text-center text-sm text-slate-500">No documents found.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="totalPages > 1" class="mt-4 flex justify-end gap-2">
      <button
        type="button"
        class="rounded border border-slate-300 px-3 py-1 text-sm disabled:opacity-50"
        :disabled="page <= 1"
        @click="page--; loadDocuments()"
      >
        Previous
      </button>
      <span class="px-2 py-1 text-sm text-slate-600">Page {{ page }} of {{ totalPages }}</span>
      <button
        type="button"
        class="rounded border border-slate-300 px-3 py-1 text-sm disabled:opacity-50"
        :disabled="page >= totalPages"
        @click="page++; loadDocuments()"
      >
        Next
      </button>
    </div>
  </div>
</template>
