<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import PageHeader from '@/components/common/PageHeader.vue';
import LoadingSpinner from '@/components/common/LoadingSpinner.vue';
import { createCase, fetchCase, updateCase } from '@/api/cases.api';
import { fetchUsers } from '@/api/users.api';
import { useAuthStore } from '@/stores/auth.store';
import { usePermissions } from '@/composables/usePermissions';
import {
  CasePriority,
  CaseStatus,
  CaseType,
  type CreateCasePayload,
  type User,
} from '@/types';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const permissions = usePermissions();

const isEdit = computed(() => !!route.params.id);
const loading = ref(false);
const saving = ref(false);
const error = ref<string | null>(null);
const owners = ref<User[]>([]);

const form = ref<CreateCasePayload>({
  title: '',
  referenceCode: '',
  type: CaseType.LITIGATION,
  status: CaseStatus.OPEN,
  priority: CasePriority.MEDIUM,
  ownerId: auth.user?.id,
  involvedParties: [{ name: '', role: '' }],
  description: '',
  openedDate: '',
  closedDate: '',
});

const caseTypes = Object.values(CaseType);
const caseStatuses = Object.values(CaseStatus);
const casePriorities = Object.values(CasePriority);

onMounted(async () => {
  if (permissions.canReassignOwnership.value) {
    try {
      const response = await fetchUsers({ limit: 100 });
      owners.value = response.data.filter((user) => user.isActive);
    } catch {
      owners.value = [];
    }
  }

  if (!isEdit.value) {
    return;
  }

  loading.value = true;

  try {
    const record = await fetchCase(route.params.id as string);
    form.value = {
      title: record.title,
      referenceCode: record.referenceCode,
      type: record.type,
      status: record.status,
      priority: record.priority,
      ownerId: record.ownerId,
      involvedParties: record.involvedParties.length ? record.involvedParties : [{ name: '', role: '' }],
      description: record.description ?? '',
      openedDate: record.openedDate ? record.openedDate.slice(0, 10) : '',
      closedDate: record.closedDate ? record.closedDate.slice(0, 10) : '',
    };
  } catch {
    error.value = 'Failed to load case.';
  } finally {
    loading.value = false;
  }
});

function addParty() {
  form.value.involvedParties = [...(form.value.involvedParties ?? []), { name: '', role: '' }];
}

function removeParty(index: number) {
  const parties = [...(form.value.involvedParties ?? [])];
  parties.splice(index, 1);
  form.value.involvedParties = parties.length ? parties : [{ name: '', role: '' }];
}

async function handleSubmit() {
  saving.value = true;
  error.value = null;

  const payload: CreateCasePayload = {
    ...form.value,
    involvedParties: (form.value.involvedParties ?? []).filter((party) => party.name.trim()),
    description: form.value.description || undefined,
    openedDate: form.value.openedDate || undefined,
    closedDate: form.value.closedDate || undefined,
  };

  try {
    if (isEdit.value) {
      await updateCase(route.params.id as string, payload);
      router.push({ name: 'case-detail', params: { id: route.params.id } });
    } else {
      const created = await createCase(payload);
      router.push({ name: 'case-detail', params: { id: created.id } });
    }
  } catch (err: unknown) {
    error.value = extractErrorMessage(err, 'Failed to save case.');
  } finally {
    saving.value = false;
  }
}

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
</script>

<template>
  <div>
    <PageHeader
      :title="isEdit ? 'Edit case' : 'New case'"
      subtitle="Capture case details and ownership"
    />

    <LoadingSpinner v-if="loading" />

    <form
      v-else
      class="max-w-3xl space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
      @submit.prevent="handleSubmit"
    >
      <div class="grid gap-4 sm:grid-cols-2">
        <div class="sm:col-span-2">
          <label class="mb-1 block text-sm font-medium text-slate-700">Title</label>
          <input v-model="form.title" required class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label class="mb-1 block text-sm font-medium text-slate-700">Reference code</label>
          <input
            v-model="form.referenceCode"
            required
            class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div v-if="permissions.canReassignOwnership">
          <label class="mb-1 block text-sm font-medium text-slate-700">Owner</label>
          <select v-model="form.ownerId" class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
            <option v-for="owner in owners" :key="owner.id" :value="owner.id">
              {{ owner.firstName }} {{ owner.lastName }}
            </option>
          </select>
        </div>
        <div>
          <label class="mb-1 block text-sm font-medium text-slate-700">Type</label>
          <select v-model="form.type" class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
            <option v-for="item in caseTypes" :key="item" :value="item">{{ item }}</option>
          </select>
        </div>
        <div>
          <label class="mb-1 block text-sm font-medium text-slate-700">Status</label>
          <select v-model="form.status" class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
            <option v-for="item in caseStatuses" :key="item" :value="item">{{ item }}</option>
          </select>
        </div>
        <div>
          <label class="mb-1 block text-sm font-medium text-slate-700">Priority</label>
          <select v-model="form.priority" class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
            <option v-for="item in casePriorities" :key="item" :value="item">{{ item }}</option>
          </select>
        </div>
        <div>
          <label class="mb-1 block text-sm font-medium text-slate-700">Opened date</label>
          <input v-model="form.openedDate" type="date" class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label class="mb-1 block text-sm font-medium text-slate-700">Closed date</label>
          <input v-model="form.closedDate" type="date" class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
        </div>
      </div>

      <div>
        <label class="mb-1 block text-sm font-medium text-slate-700">Description</label>
        <textarea v-model="form.description" rows="4" class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
      </div>

      <div>
        <div class="mb-2 flex items-center justify-between">
          <label class="text-sm font-medium text-slate-700">Involved parties</label>
          <button type="button" class="text-sm text-brand-700" @click="addParty">Add party</button>
        </div>
        <div
          v-for="(party, index) in form.involvedParties"
          :key="index"
          class="mb-2 grid gap-2 sm:grid-cols-[1fr_1fr_auto]"
        >
          <input v-model="party.name" placeholder="Name" class="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <input v-model="party.role" placeholder="Role" class="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <button type="button" class="text-sm text-red-600" @click="removeParty(index)">Remove</button>
        </div>
      </div>

      <p v-if="error" class="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{{ error }}</p>

      <div class="flex gap-3 pt-2">
        <button
          type="submit"
          :disabled="saving"
          class="rounded-md bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-60"
        >
          {{ saving ? 'Saving...' : 'Save case' }}
        </button>
        <button
          type="button"
          class="rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
          @click="router.back()"
        >
          Cancel
        </button>
      </div>
    </form>
  </div>
</template>
