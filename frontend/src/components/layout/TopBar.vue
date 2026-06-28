<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth.store';

const auth = useAuthStore();
const router = useRouter();

function logout() {
  auth.logout();
  router.push({ name: 'login' });
}
</script>

<template>
  <header class="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
    <div>
      <p class="text-sm text-slate-500">Signed in as</p>
      <p class="text-sm font-medium text-slate-900">
        {{ auth.user?.firstName }} {{ auth.user?.lastName }}
        <span class="ml-2 rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
          {{ auth.user?.role }}
        </span>
      </p>
    </div>

    <button
      type="button"
      class="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
      @click="logout"
    >
      Sign out
    </button>
  </header>
</template>
