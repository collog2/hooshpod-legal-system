<script setup lang="ts">
defineProps<{
  message?: string;
}>();
</script>

<template>
  <div class="flex items-center justify-center py-12">
    <div class="h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
    <span v-if="message" class="ml-3 text-sm text-slate-600">{{ message }}</span>
  </div>
</template>
