<script setup lang="ts">
defineProps<{
  label: string;
  value: string;
}>();
</script>

<template>
  <span
    class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium"
    :class="{
      'bg-blue-100 text-blue-800': value === 'OPEN' || value === 'IN_PROGRESS',
      'bg-yellow-100 text-yellow-800': value === 'ON_HOLD' || value === 'MEDIUM',
      'bg-green-100 text-green-800': value === 'CLOSED' || value === 'ACTIVE',
      'bg-red-100 text-red-800': value === 'CRITICAL' || value === 'HIGH',
      'bg-slate-100 text-slate-700':
        !['OPEN', 'IN_PROGRESS', 'ON_HOLD', 'MEDIUM', 'CLOSED', 'ACTIVE', 'CRITICAL', 'HIGH'].includes(value),
    }"
  >
    {{ label }}
  </span>
</template>
