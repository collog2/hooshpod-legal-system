<script setup lang="ts">
import { ref } from 'vue';

defineProps<{
  disabled?: boolean;
}>();

const emit = defineEmits<{
  selected: [file: File];
}>();

const inputRef = ref<HTMLInputElement | null>(null);

function onChange(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];

  if (file) {
    emit('selected', file);
    target.value = '';
  }
}
</script>

<template>
  <div>
    <input
      ref="inputRef"
      type="file"
      class="hidden"
      :disabled="disabled"
      @change="onChange"
    />
    <button
      type="button"
      class="rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50 disabled:opacity-50"
      :disabled="disabled"
      @click="inputRef?.click()"
    >
      Choose file
    </button>
  </div>
</template>
