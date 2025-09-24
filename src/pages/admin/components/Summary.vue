<script lang="ts" setup>
interface Props {
  stats: {
    totalItems: number
    resolvedItems: number
  }
}

defineProps<Props>()
</script>

<template>
  <v-card class="pa-4 mb-4" elevation="2">
    <v-card-title class="text-h6 font-weight-bold mb-4">
      <v-icon class="me-2">mdi-chart-donut</v-icon>
      Quick Summary
    </v-card-title>
    <div class="d-flex justify-center align-center mb-4">
      <v-progress-circular
        :model-value="stats.totalItems > 0 ? (stats.resolvedItems / stats.totalItems) * 100 : 0"
        size="120"
        width="12"
        color="success"
      >
        <span class="text-h5 font-weight-bold">
          {{ stats.totalItems > 0 ? Math.round((stats.resolvedItems / stats.totalItems) * 100) : 0 }}%
        </span>
      </v-progress-circular>
    </div>
    <div class="text-center text-subtitle-2 text-grey-darken-1">Resolution Rate</div>
  </v-card>
</template>