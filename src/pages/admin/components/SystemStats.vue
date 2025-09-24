<script lang="ts" setup>
interface Props {
  stats: {
    totalUsers: number
    totalConversations: number
    totalMessages: number
  }
}

defineProps<Props>()
</script>

<template>
  <v-card class="pa-4 mb-4" elevation="2">
    <v-card-title class="text-h6 font-weight-bold mb-4">
      <v-icon class="me-2">mdi-database</v-icon>
      System Stats
    </v-card-title>
    <div class="d-flex justify-space-between align-center mb-3">
      <span class="text-body-1">Active Users</span>
      <v-chip color="primary" variant="flat">{{ stats.totalUsers }}</v-chip>
    </div>
    <div class="d-flex justify-space-between align-center mb-3">
      <span class="text-body-1">Conversations</span>
      <v-chip color="secondary" variant="flat">{{ stats.totalConversations }}</v-chip>
    </div>
    <div class="d-flex justify-space-between align-center">
      <span class="text-body-1">Messages</span>
      <v-chip color="info" variant="flat">{{ stats.totalMessages }}</v-chip>
    </div>
  </v-card>
</template>