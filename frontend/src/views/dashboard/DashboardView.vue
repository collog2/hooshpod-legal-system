<script setup lang="ts">
import PageHeader from '@/components/common/PageHeader.vue';
import { useAuthStore } from '@/stores/auth.store';

const auth = useAuthStore();
</script>

<template>
  <div>
    <PageHeader
      title="Dashboard"
      subtitle="Overview of your legal workspace"
    />

    <div class="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <p class="text-slate-700">
        Welcome back, {{ auth.user?.firstName }}. Additional dashboard modules will appear here as
        they are implemented.
      </p>
      <p class="mt-3 text-sm text-slate-500">
        Use the sidebar to manage users if you have administrator or manager access.
      </p>
    </div>
  </div>
</template>
