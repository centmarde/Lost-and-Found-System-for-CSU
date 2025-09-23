<script lang="ts" setup>
import { ref, onMounted, computed } from 'vue'
import InnerLayoutWrapper from '@/layouts/InnerLayoutWrapper.vue'

interface DashboardStats {
  totalItems: number
  lostItems: number
  foundItems: number
  resolvedItems: number
  totalUsers: number
  totalConversations: number
  totalMessages: number
  recentActivity: Array<{
    id: string
    type: 'lost' | 'found' | 'resolved' | 'claimed'
    title: string
    user: string
    timestamp: string
    status: string
  }>
}

interface NewItemForm {
  title: string
  description: string
  status: 'lost' | 'found'
}

const loading = ref(true)
const postingItem = ref(false)
const showPostDialog = ref(false)

const stats = ref<DashboardStats>({
  totalItems: 0,
  lostItems: 0,
  foundItems: 0,
  resolvedItems: 0,
  totalUsers: 0,
  totalConversations: 0,
  totalMessages: 0,
  recentActivity: []
})

const newItemForm = ref<NewItemForm>({
  title: '',
  description: '',
  status: 'lost'
})

const formRules = {
  title: [(v: string) => !!v || 'Item title is required'],
  description: [(v: string) => !!v || 'Item description is required']
}

// API functions - replace these with your actual API calls
const fetchDashboardStats = async () => {
  try {
    // Replace with actual API endpoint
    // const response = await fetch('/api/admin/dashboard-stats')
    // const data = await response.json()
    
    // For now, fetch from your actual endpoints
    const [itemsRes, usersRes, conversationsRes, messagesRes] = await Promise.all([
      // fetch('/api/items/stats'),
      // fetch('/api/users/count'),
      // fetch('/api/conversations/count'),
      // fetch('/api/messages/count')
      
      // Simulated API calls - replace with actual ones
      new Promise(resolve => setTimeout(() => resolve({ 
        total: 0, lost: 0, found: 0, resolved: 0 
      }), 500)),
      new Promise(resolve => setTimeout(() => resolve({ count: 0 }), 500)),
      new Promise(resolve => setTimeout(() => resolve({ count: 0 }), 500)),
      new Promise(resolve => setTimeout(() => resolve({ count: 0 }), 500))
    ])
    
    // Process actual API responses here
    // For demo purposes, using sample data
    stats.value = {
      totalItems: 0, // itemsRes.total
      lostItems: 0,  // itemsRes.lost
      foundItems: 0, // itemsRes.found
      resolvedItems: 0, // itemsRes.resolved
      totalUsers: 0, // usersRes.count
      totalConversations: 0, // conversationsRes.count
      totalMessages: 0, // messagesRes.count
      recentActivity: [] // await fetchRecentActivity()
    }
  } catch (error) {
    console.error('Error fetching dashboard data:', error)
  } finally {
    loading.value = false
  }
}

const fetchRecentActivity = async () => {
  try {
    // Replace with actual API endpoint
    // const response = await fetch('/api/items/recent-activity?limit=5')
    // return await response.json()
    return []
  } catch (error) {
    console.error('Error fetching recent activity:', error)
    return []
  }
}

const postMissingItem = async () => {
  if (!newItemForm.value.title || !newItemForm.value.description) {
    return
  }

  postingItem.value = true
  
  try {
    // Replace with actual API endpoint
    const response = await fetch('/api/items', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('admin_token')}` // or however you handle auth
      },
      body: JSON.stringify({
        title: newItemForm.value.title,
        description: newItemForm.value.description,
        status: newItemForm.value.status,
        user_id: null, // Posted by admin
        created_at: new Date().toISOString()
      })
    })

    if (response.ok) {
      // Reset form
      newItemForm.value = {
        title: '',
        description: '',
        status: 'lost'
      }
      showPostDialog.value = false
      
      // Refresh dashboard data
      await fetchDashboardStats()
      
      // Show success message
      console.log('Item posted successfully')
    } else {
      throw new Error('Failed to post item')
    }
  } catch (error) {
    console.error('Error posting item:', error)
  } finally {
    postingItem.value = false
  }
}

const getActivityColor = (type: string) => {
  switch (type) {
    case 'lost': return 'error'
    case 'found': return 'success'
    case 'resolved': return 'primary'
    case 'claimed': return 'info'
    default: return 'grey'
  }
}

const getActivityIcon = (type: string) => {
  switch (type) {
    case 'lost': return 'mdi-alert-circle'
    case 'found': return 'mdi-check-circle'
    case 'resolved': return 'mdi-handshake'
    case 'claimed': return 'mdi-account-check'
    default: return 'mdi-circle'
  }
}

const formatTimestamp = (timestamp: string) => {
  // Format timestamp to relative time
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  
  if (minutes < 60) return `${minutes} minutes ago`
  if (hours < 24) return `${hours} hours ago`
  return `${days} days ago`
}

onMounted(() => {
  fetchDashboardStats()
})
</script>

<template>
  <InnerLayoutWrapper>
    <template #content>
      <div class="dashboard">
        <div class="d-flex justify-space-between align-center mb-6">
          <h1 class="text-h4 font-weight-bold text-primary">
            University Lost & Found Dashboard
          </h1>
          <div class="d-flex gap-2">
            <v-btn
              color="success"
              prepend-icon="mdi-plus-circle"
              @click="showPostDialog = true"
            >
              Post Missing Item
            </v-btn>
            <v-btn
              color="primary"
              variant="outlined"
              prepend-icon="mdi-refresh"
              @click="fetchDashboardStats"
              :loading="loading"
            >
              Refresh
            </v-btn>
          </div>
        </div>

        <v-row v-if="loading">
          <v-col cols="12">
            <div class="d-flex justify-center align-center" style="height: 400px;">
              <v-progress-circular size="64" indeterminate color="primary" />
            </div>
          </v-col>
        </v-row>

        <template v-else>
          <!-- Stats Cards -->
          <v-row class="mb-6">
            <v-col cols="12" md="3" sm="6">
              <v-card class="pa-4 text-center stat-card" elevation="2">
                <v-icon size="48" color="primary" class="mb-2">mdi-package-variant</v-icon>
                <div class="text-h4 font-weight-bold text-primary">{{ stats.totalItems }}</div>
                <div class="text-subtitle-1 text-grey-darken-1">Total Items</div>
              </v-card>
            </v-col>
            
            <v-col cols="12" md="3" sm="6">
              <v-card class="pa-4 text-center stat-card" elevation="2">
                <v-icon size="48" color="error" class="mb-2">mdi-alert-circle</v-icon>
                <div class="text-h4 font-weight-bold text-error">{{ stats.lostItems }}</div>
                <div class="text-subtitle-1 text-grey-darken-1">Lost Items</div>
              </v-card>
            </v-col>
            
            <v-col cols="12" md="3" sm="6">
              <v-card class="pa-4 text-center stat-card" elevation="2">
                <v-icon size="48" color="success" class="mb-2">mdi-check-circle</v-icon>
                <div class="text-h4 font-weight-bold text-success">{{ stats.foundItems }}</div>
                <div class="text-subtitle-1 text-grey-darken-1">Found Items</div>
              </v-card>
            </v-col>
            
            <v-col cols="12" md="3" sm="6">
              <v-card class="pa-4 text-center stat-card" elevation="2">
                <v-icon size="48" color="info" class="mb-2">mdi-handshake</v-icon>
                <div class="text-h4 font-weight-bold text-info">{{ stats.resolvedItems }}</div>
                <div class="text-subtitle-1 text-grey-darken-1">Resolved</div>
              </v-card>
            </v-col>
          </v-row>

          <v-row>
            <!-- Chart Section -->
            <v-col cols="12" lg="8">
              <v-card class="pa-4" elevation="2">
                <v-card-title class="text-h6 font-weight-bold mb-4">
                  <v-icon class="me-2">mdi-chart-pie</v-icon>
                  Items Overview
                </v-card-title>
                <div class="d-flex justify-center align-center" style="height: 300px;">
                  <div class="text-center">
                    <v-progress-circular
                      :model-value="stats.totalItems > 0 ? (stats.resolvedItems / stats.totalItems) * 100 : 0"
                      size="200"
                      width="20"
                      color="success"
                      class="mb-4"
                    >
                      <span class="text-h4 font-weight-bold">
                        {{ stats.totalItems > 0 ? Math.round((stats.resolvedItems / stats.totalItems) * 100) : 0 }}%
                      </span>
                    </v-progress-circular>
                    <div class="text-subtitle-1 text-grey-darken-1">Resolution Rate</div>
                  </div>
                </div>
              </v-card>
            </v-col>

            <!-- System Stats -->
            <v-col cols="12" lg="4">
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

              <!-- Admin Note -->
              <v-card class="pa-4" elevation="2">
                <v-card-title class="text-h6 font-weight-bold mb-3">
                  <v-icon class="me-2">mdi-information</v-icon>
                  Admin Process
                </v-card-title>
                <v-card-text class="pa-0">
                  <p class="text-body-2 mb-2">
                    When posting missing items, users can start a realtime chat for ownership verification.
                  </p>
                  <p class="text-body-2 text-grey-darken-1">
                    They will describe the item details to verify ownership before claiming.
                  </p>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>

          <!-- Recent Activity -->
          <v-row class="mt-4">
            <v-col cols="12">
              <v-card class="pa-4" elevation="2">
                <v-card-title class="text-h6 font-weight-bold mb-4">
                  <v-icon class="me-2">mdi-clock-outline</v-icon>
                  Recent Activity
                </v-card-title>
                <div v-if="stats.recentActivity.length === 0" class="text-center py-8">
                  <v-icon size="64" color="grey-lighten-1">mdi-inbox</v-icon>
                  <div class="text-h6 text-grey-darken-1 mt-2">No recent activity</div>
                  <div class="text-body-2 text-grey-darken-1">Items and activities will appear here</div>
                </div>
                <v-list v-else>
                  <v-list-item
                    v-for="activity in stats.recentActivity"
                    :key="activity.id"
                    class="px-0"
                  >
                    <template #prepend>
                      <v-avatar :color="getActivityColor(activity.type)" size="40">
                        <v-icon :icon="getActivityIcon(activity.type)" color="white" />
                      </v-avatar>
                    </template>
                    
                    <v-list-item-title class="font-weight-medium">
                      {{ activity.title }}
                    </v-list-item-title>
                    <v-list-item-subtitle>
                      {{ activity.type.charAt(0).toUpperCase() + activity.type.slice(1) }} 
                      {{ activity.user ? `by ${activity.user}` : 'by Admin' }} • {{ activity.status }}
                    </v-list-item-subtitle>
                    
                    <template #append>
                      <div class="text-caption text-grey-darken-1">
                        {{ formatTimestamp(activity.timestamp) }}
                      </div>
                    </template>
                  </v-list-item>
                </v-list>
              </v-card>
            </v-col>
          </v-row>
        </template>

        <!-- Post Missing Item Dialog -->
        <v-dialog v-model="showPostDialog" max-width="600">
          <v-card>
            <v-card-title class="text-h5 font-weight-bold">
              <v-icon class="me-2">mdi-plus-circle</v-icon>
              Post Missing Item
            </v-card-title>
            
            <v-card-text>
              <v-form @submit.prevent="postMissingItem">
                <v-select
                  v-model="newItemForm.status"
                  :items="[
                    { title: 'Lost Item', value: 'lost' },
                    { title: 'Found Item', value: 'found' }
                  ]"
                  label="Item Type"
                  prepend-inner-icon="mdi-tag"
                  variant="outlined"
                  class="mb-3"
                />
                
                <v-text-field
                  v-model="newItemForm.title"
                  label="Item Title"
                  :rules="formRules.title"
                  prepend-inner-icon="mdi-text"
                  variant="outlined"
                  placeholder="e.g., iPhone 13, Blue Backpack, Student ID"
                  class="mb-3"
                />
                
                <v-textarea
                  v-model="newItemForm.description"
                  label="Item Description"
                  :rules="formRules.description"
                  prepend-inner-icon="mdi-text-long"
                  variant="outlined"
                  placeholder="Detailed description including color, brand, location found/lost, distinguishing features..."
                  rows="4"
                />
                
                <v-alert
                  type="info"
                  variant="tonal"
                  class="mt-3"
                >
                  <template #prepend>
                    <v-icon>mdi-information</v-icon>
                  </template>
                  Users will be able to start a realtime chat to describe this item for ownership verification.
                </v-alert>
              </v-form>
            </v-card-text>
            
            <v-card-actions>
              <v-spacer />
              <v-btn 
                variant="text" 
                @click="showPostDialog = false"
                :disabled="postingItem"
              >
                Cancel
              </v-btn>
              <v-btn
                color="success"
                @click="postMissingItem"
                :loading="postingItem"
                :disabled="!newItemForm.title || !newItemForm.description"
              >
                Post Item
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>
      </div>
    </template>
  </InnerLayoutWrapper>
</template>

<style scoped>
.dashboard {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
}

.stat-card {
  transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important;
}

.v-card {
  border-radius: 12px;
}

.v-chip {
  font-weight: 600;
}

.gap-2 {
  gap: 8px;
}
</style>