<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import FileUpload from '@/components/common/FileUpload.vue';
import LoadingSpinner from '@/components/common/LoadingSpinner.vue';
import {
  deleteDocument,
  downloadDocument,
  fetchDocuments,
  uploadDocument,
} from '@/api/documents.api';
import { usePermissions } from '@/composables/usePermissions';
import type { Document, EntityType } from '@/types';

const props = defineProps<{
  entityType: EntityType;
  entityId: string;
  ownerId: string;
}>();

const permissions = usePermissions();
const documents = ref<Document[]>([]);
const loading = ref(true);
const uploading = ref(false);
const error = ref<string | null>(null);
const description = ref('');
const selectedFile = ref<File | null>(null);

async function loadDocuments() {
  loading.value = true;
  error.value = null;

  try {
    const response = await fetchDocuments({
      entityType: props.entityType,
      entityId: props.entityId,
      limit: 50,
    });
    documents.value = response.data;
  } catch {
    error.value = 'Failed to load documents.';
  } finally {
    loading.value = false;
  }
}

function onFileSelected(file: File) {
  selectedFile.value = file;
}

async function handleUpload() {
  if (!selectedFile.value) {
    return;
  }

  uploading.value = true;
  error.value = null;

  try {
    await uploadDocument({
      file: selectedFile.value,
      entityType: props.entityType,
      entityId: props.entityId,
      description: description.value || undefined,
    });
    selectedFile.value = null;
    description.value = '';
    await loadDocuments();
  } catch {
    error.value = 'Failed to upload document.';
  } finally {
    uploading.value = false;
  }
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

watch(
  () => [props.entityType, props.entityId],
  () => loadDocuments(),
);

onMounted(loadDocuments);
</script>

<template>
  <div class="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
    <div class="mb-4 flex items-center justify-between">
      <h3 class="text-lg font-semibold text-slate-900">Documents</h3>
    </div>

    <div
      v-if="permissions.canUploadDocuments && permissions.canEditOwnedRecord(ownerId)"
      class="mb-6 space-y-3 rounded-md border border-dashed border-slate-300 p-4"
    >
      <div class="flex flex-wrap items-center gap-3">
        <FileUpload :disabled="uploading" @selected="onFileSelected" />
        <span v-if="selectedFile" class="text-sm text-slate-600">{{ selectedFile.name }}</span>
      </div>
      <input
        v-model="description"
        type="text"
        placeholder="Optional description"
        class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
      />
      <button
        type="button"
        class="rounded-md bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-50"
        :disabled="!selectedFile || uploading"
        @click="handleUpload"
      >
        {{ uploading ? 'Uploading...' : 'Upload document' }}
      </button>
    </div>

    <LoadingSpinner v-if="loading" message="Loading documents..." />

    <p v-else-if="error" class="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{{ error }}</p>

    <div v-else-if="documents.length === 0" class="text-sm text-slate-500">No documents attached.</div>

    <ul v-else class="divide-y divide-slate-200">
      <li
        v-for="document in documents"
        :key="document.id"
        class="flex flex-wrap items-center justify-between gap-3 py-3"
      >
        <div>
          <p class="text-sm font-medium text-slate-900">{{ document.originalFilename }}</p>
          <p class="text-xs text-slate-500">
            {{ formatSize(document.size) }} ·
            {{ document.uploadedBy.firstName }} {{ document.uploadedBy.lastName }}
          </p>
          <p v-if="document.description" class="text-xs text-slate-500">{{ document.description }}</p>
        </div>
        <div class="flex gap-2">
          <button
            type="button"
            class="text-sm text-brand-700 hover:text-brand-800"
            @click="handleDownload(document)"
          >
            Download
          </button>
          <button
            v-if="permissions.canEditOwnedRecord(ownerId)"
            type="button"
            class="text-sm text-red-600 hover:text-red-700"
            @click="handleDelete(document)"
          >
            Delete
          </button>
        </div>
      </li>
    </ul>
  </div>
</template>
