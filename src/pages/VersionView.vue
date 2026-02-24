<script setup lang="ts">
import VersionLog from '@/components/common/VersionLog.vue'
import InnerLayoutWrapper from '@/layouts/InnerLayoutWrapper.vue';
</script>

<template>
	<InnerLayoutWrapper>
    <template #content>
  <v-container class="py-8" fluid style="max-width: 1400px;">
    <div class="d-flex align-center mb-6">
      <v-icon color="primary" size="32" class="me-3">mdi-history</v-icon>
      <div>
        <h1 class="text-h4 font-weight-bold">Version History</h1>
        <p class="text-body-2 text-grey-darken-1 mt-1">Track all updates and changes to the system</p>
      </div>
    </div>

    <VersionLog />
  </v-container>
</template>
</InnerLayoutWrapper>
</template>


