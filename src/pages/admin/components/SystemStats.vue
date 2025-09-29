<script lang="ts" setup>
import { ref, onMounted } from 'vue'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

const stats = ref({
  totalUsers: 0,
  totalConversations: 0,
  totalMessages: 0
})

const loading = ref(true)

const fetchSystemStats = async () => {
  loading.value = true
  try {
    // Fetch total users (unique user_ids from items table)
    const { data: items } = await supabase
      .from('items')
      .select('user_id')
      .not('user_id', 'is', null)

    if (items) {
      const uniqueUserIds = new Set(items.map(item => item.user_id))
      stats.value.totalUsers = uniqueUserIds.size
    }

    // Fetch total conversations (assuming you have a conversations table)
    const { count: conversationsCount } = await supabase
      .from('conversations')
      .select('*', { count: 'exact', head: true })

    stats.value.totalConversations = conversationsCount || 0

    // Fetch total messages (assuming you have a messages table)
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
      <v-icon class="me-2">mdi-database</v-icon>
      System Stats
    </v-card-title>
    
    <div v-if="loading" class="text-center pa-4">
      <v-progress-circular indeterminate color="primary"></v-progress-circular>
    </div>

    <div v-else>
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
    </div>
  </v-card>
</template>