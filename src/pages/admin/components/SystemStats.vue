<script lang="ts" setup>
import { ref, onMounted } from 'vue'
import { supabase } from '@/lib/supabase'
import { useAuthUserStore } from '@/stores/authUser'



const authStore = useAuthUserStore()

const stats = ref({
  totalUsers: 0,
  totalItems: 0,
  activeConversations: 0,
  totalMessages: 0
})

const loading = ref(true)

const fetchSystemStats = async () => {
  loading.value = true
  try {
    // Fetch total users from auth (includes all registered users)
    const { users, error: usersError } = await authStore.getAllUsers()
    
    if (!usersError && users) {
      stats.value.totalUsers = users.length
    }

    // Fetch total items (lost & found)
    // const { count: itemsCount } = await supabase
    //   .from('items')
    //   .select('*', { count: 'exact', head: true })

    // stats.value.totalItems = itemsCount || 0

    // Fetch total active conversations
    const { count: conversationsCount } = await supabase
      .from('conversations')
      .select('*', { count: 'exact', head: true })

    stats.value.activeConversations = conversationsCount || 0

    // Fetch total messages exchanged
    const { count: messagesCount } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })

    stats.value.totalMessages = messagesCount || 0

  } catch (error) {
    console.error('Error fetching system stats:', error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchSystemStats()
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
      
      <!-- <div class="d-flex justify-space-between align-center mb-3">
        <div class="d-flex align-center">
          <v-icon class="me-2" size="small" color="secondary">mdi-package-variant</v-icon>
          <span class="text-body-1">Total Items</span>
        </div>
        <v-chip color="secondary" variant="flat">{{ stats.totalItems }}</v-chip>
      </div> -->

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