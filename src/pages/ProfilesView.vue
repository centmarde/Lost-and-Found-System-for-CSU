<script setup lang="ts">
import InnerLayoutWrapper from '@/layouts/InnerLayoutWrapper.vue';
</script>

<template>
<InnerLayoutWrapper #content>
  <div class="flex flex-col items-center justify-center h-full">
    <h1 class="text-3xl font-bold mb-4">Profiles View</h1>
    <p class="text-lg text-gray-600">This is where user profiles will be displayed.</p>
  </div>
</InnerLayoutWrapper>
</template>
