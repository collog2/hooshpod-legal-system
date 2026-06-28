<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter, RouterLink } from 'vue-router';
import PageHeader from '@/components/common/PageHeader.vue';
import LoadingSpinner from '@/components/common/LoadingSpinner.vue';
import StatusBadge from '@/components/common/StatusBadge.vue';
import EntityDocumentsPanel from '@/components/domain/EntityDocumentsPanel.vue';
import { deleteCase, fetchCase } from '@/api/cases.api';
import { usePermissions } from '@/composables/usePermissions';
import { EntityType, type Case } from '@/types';

const route = useRoute();
const router = useRouter();
const permissions = usePermissions();

const caseRecord = ref<Case | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);

const canEdit = computed(() =>
  caseRecord.value ? permissions.canEditOwnedRecord(caseRecord.value.ownerId) : false,
);

async function loadCase() {
  loading.value = true;
  error.value = null;

  try {
    caseRecord.value = await fetchCase(route.params.id as string);
  } catch {
    error.value = 'Failed to load case.';
  } finally {
    loading.value = false;
  }
}

async function handleDelete() {
  if (!caseRecord.value || !window.confirm('Delete this case?')) {
    return;
  }

  try {
    await deleteCase(caseRecord.value.id);
    router.push({ name: 'cases' });
  } catch {
    error.value = 'Failed to delete case.';
  }
}

onMounted(loadCase);
</script>

<template>
  <div>
    <LoadingSpinner v-if="loading" message="Loading case..." />

    <template v-else-if="caseRecord">
      <div class="mb-6 flex flex-wrap items-center justify-between gap-4">
        <PageHeader
          :title="caseRecord.title"
          :subtitle="caseRecord.referenceCode"
        />
        <div class="flex gap-2">
          <RouterLink
            v-if="canEdit"
            :to="`/cases/${caseRecord.id}/edit`"
            class="rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
          >
            Edit
          </RouterLink>
          <button
            v-if="canEdit"
            type="button"
            class="rounded-md border border-red-300 px-4 py-2 text-sm text-red-700 hover:bg-red-50"
            @click="handleDelete"
          >
            Delete
          </button>
        </div>
      </div>

      <div class="mb-6 grid gap-6 lg:grid-cols-2">
        <div class="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <dl class="grid gap-4 sm:grid-cols-2">
            <div>
              <dt class="text-xs font-semibold uppercase text-slate-500">Status</dt>
              <dd class="mt-1"><StatusBadge :label="caseRecord.status" :value="caseRecord.status" /></dd>
            </div>
            <div>
              <dt class="text-xs font-semibold uppercase text-slate-500">Priority</dt>
              <dd class="mt-1"><StatusBadge :label="caseRecord.priority" :value="caseRecord.priority" /></dd>
            </div>
            <div>
              <dt class="text-xs font-semibold uppercase text-slate-500">Type</dt>
              <dd class="mt-1 text-sm text-slate-900">{{ caseRecord.type }}</dd>
            </div>
            <div>
              <dt class="text-xs font-semibold uppercase text-slate-500">Owner</dt>
              <dd class="mt-1 text-sm text-slate-900">
                {{ caseRecord.owner.firstName }} {{ caseRecord.owner.lastName }}
              </dd>
            </div>
            <div v-if="caseRecord.openedDate">
              <dt class="text-xs font-semibold uppercase text-slate-500">Opened</dt>
              <dd class="mt-1 text-sm text-slate-900">{{ caseRecord.openedDate.slice(0, 10) }}</dd>
            </div>
            <div v-if="caseRecord.closedDate">
              <dt class="text-xs font-semibold uppercase text-slate-500">Closed</dt>
              <dd class="mt-1 text-sm text-slate-900">{{ caseRecord.closedDate.slice(0, 10) }}</dd>
            </div>
          </dl>

          <div v-if="caseRecord.description" class="mt-6">
            <h3 class="text-xs font-semibold uppercase text-slate-500">Description</h3>
            <p class="mt-2 text-sm text-slate-700">{{ caseRecord.description }}</p>
          </div>

          <div v-if="caseRecord.involvedParties.length" class="mt-6">
            <h3 class="text-xs font-semibold uppercase text-slate-500">Involved parties</h3>
            <ul class="mt-2 space-y-1 text-sm text-slate-700">
              <li v-for="(party, index) in caseRecord.involvedParties" :key="index">
                {{ party.name }}<span v-if="party.role"> — {{ party.role }}</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <EntityDocumentsPanel
        :entity-type="EntityType.CASE"
        :entity-id="caseRecord.id"
        :owner-id="caseRecord.ownerId"
      />
    </template>

    <p v-else-if="error" class="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{{ error }}</p>
  </div>
</template>
