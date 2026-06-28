<script setup lang="ts">
defineProps<{
  title: string;
  subtitle?: string;
}>();
</script>

<template>
  <div class="mb-6">
    <h2 class="text-2xl font-semibold text-slate-900">{{ title }}</h2>
    <p v-if="subtitle" class="mt-1 text-sm text-slate-500">{{ subtitle }}</p>
  </div>
</template>
