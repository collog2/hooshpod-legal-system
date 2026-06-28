<script setup lang="ts">
import { RouterView } from 'vue-router';
import Sidebar from './Sidebar.vue';
import TopBar from './TopBar.vue';
</script>

<template>
  <div class="flex min-h-screen bg-slate-50">
    <Sidebar />
    <div class="flex min-h-screen flex-1 flex-col">
      <TopBar />
      <main class="flex-1 p-6">
        <RouterView />
      </main>
    </div>
  </div>
</template>
