<script lang="ts" setup>
import { onMounted } from 'vue'
import { useSystemStatsStore } from '@/stores/stats'
import { storeToRefs } from 'pinia'

const systemStatsStore = useSystemStatsStore()
const { stats, loading } = storeToRefs(systemStatsStore)

onMounted(() => {
  systemStatsStore.fetchSystemStats()
})
</script>

<template>
  <v-card class="pa-4 mb-4 system-stats-card" elevation="2">
    <v-card-title class="text-h6 font-weight-bold mb-4">
      <v-icon class="me-2">mdi-chart-box-outline</v-icon>
      System Overview
    </v-card-title>
    
    <div v-if="loading" class="text-center pa-4">
      <v-progress-circular indeterminate color="primary"></v-progress-circular>
    </div>

    <div v-else>
      <div class="d-flex justify-space-between align-center mb-3">
        <div class="d-flex align-center">
          <v-icon class="me-2" size="small" color="primary">mdi-account-group</v-icon>
          <span class="text-body-1">Total Users</span>
        </div>
        <v-chip color="primary" variant="flat">{{ stats.totalUsers }}</v-chip>
      </div>
      

      <div class="d-flex justify-space-between align-center mb-3">
        <div class="d-flex align-center">
          <v-icon class="me-2" size="small" color="info">mdi-message-text</v-icon>
          <span class="text-body-1">Active Chats</span>
        </div>
        <v-chip color="info" variant="flat">{{ stats.activeConversations }}</v-chip>
      </div>
      
      <div class="d-flex justify-space-between align-center">
        <div class="d-flex align-center">
          <v-icon class="me-2" size="small" color="success">mdi-chat</v-icon>
          <span class="text-body-1">Messages Sent</span>
        </div>
        <v-chip color="success" variant="flat">{{ stats.totalMessages }}</v-chip>
      </div>
    </div>
  </v-card>
</template>