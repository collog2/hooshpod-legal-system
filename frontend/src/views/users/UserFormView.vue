<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import PageHeader from '@/components/common/PageHeader.vue';
import LoadingSpinner from '@/components/common/LoadingSpinner.vue';
import { createUser, fetchUser, updateUser } from '@/api/users.api';
import { UserRole, type CreateUserPayload } from '@/types';

const route = useRoute();
const router = useRouter();

const isEdit = computed(() => !!route.params.id);
const loading = ref(false);
const saving = ref(false);
const error = ref<string | null>(null);

const form = ref<CreateUserPayload>({
  email: '',
  password: '',
  firstName: '',
  lastName: '',
  role: UserRole.COUNSEL,
  isActive: true,
});

const roles = Object.values(UserRole);

onMounted(async () => {
  if (!isEdit.value) {
    return;
  }

  loading.value = true;

  try {
    const user = await fetchUser(route.params.id as string);
    form.value = {
      email: user.email,
      password: '',
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isActive: user.isActive,
    };
  } catch {
    error.value = 'Failed to load user.';
  } finally {
    loading.value = false;
  }
});

async function handleSubmit() {
  saving.value = true;
  error.value = null;

  try {
    if (isEdit.value) {
      const payload = { ...form.value };

      if (!payload.password) {
        delete (payload as { password?: string }).password;
      }

      await updateUser(route.params.id as string, payload);
    } else {
      await createUser(form.value);
    }

    router.push({ name: 'users' });
  } catch (err: unknown) {
    error.value = extractErrorMessage(err, 'Failed to save user.');
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
      :title="isEdit ? 'Edit user' : 'Add user'"
      subtitle="Configure account details and role"
    />

    <LoadingSpinner v-if="loading" />

    <form
      v-else
      class="max-w-xl space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
      @submit.prevent="handleSubmit"
    >
      <div class="grid gap-4 sm:grid-cols-2">
        <div>
          <label class="mb-1 block text-sm font-medium text-slate-700">First name</label>
          <input
            v-model="form.firstName"
            required
            class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600"
          />
        </div>
        <div>
          <label class="mb-1 block text-sm font-medium text-slate-700">Last name</label>
          <input
            v-model="form.lastName"
            required
            class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600"
          />
        </div>
      </div>

      <div>
        <label class="mb-1 block text-sm font-medium text-slate-700">Email</label>
        <input
          v-model="form.email"
          type="email"
          required
          class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600"
        />
      </div>

      <div>
        <label class="mb-1 block text-sm font-medium text-slate-700">
          Password
          <span v-if="isEdit" class="font-normal text-slate-500">(leave blank to keep current)</span>
        </label>
        <input
          v-model="form.password"
          type="password"
          :required="!isEdit"
          minlength="8"
          class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600"
        />
      </div>

      <div class="grid gap-4 sm:grid-cols-2">
        <div>
          <label class="mb-1 block text-sm font-medium text-slate-700">Role</label>
          <select
            v-model="form.role"
            class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600"
          >
            <option v-for="role in roles" :key="role" :value="role">{{ role }}</option>
          </select>
        </div>
        <div class="flex items-end">
          <label class="flex items-center gap-2 text-sm text-slate-700">
            <input v-model="form.isActive" type="checkbox" class="rounded border-slate-300" />
            Active account
          </label>
        </div>
      </div>

      <p v-if="error" class="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{{ error }}</p>

      <div class="flex gap-3 pt-2">
        <button
          type="submit"
          :disabled="saving"
          class="rounded-md bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-60"
        >
          {{ saving ? 'Saving...' : 'Save user' }}
        </button>
        <button
          type="button"
          class="rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
          @click="router.push({ name: 'users' })"
        >
          Cancel
        </button>
      </div>
    </form>
  </div>
</template>
