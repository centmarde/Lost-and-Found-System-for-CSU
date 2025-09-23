<script lang="ts" setup>
import { ref, onMounted } from 'vue'
import { createClient } from '@supabase/supabase-js'
import InnerLayoutWrapper from '@/layouts/InnerLayoutWrapper.vue'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

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

const fetchDashboardStats = async () => {
  loading.value = true
  try {
    // Fetch items stats
    const { data: items, error: itemsError } = await supabase
      .from('items')
      .select('*')

    if (itemsError) {
      console.error('Error fetching items:', itemsError)
      return
    }

    // Calculate stats from items data
    const totalItems = items?.length || 0
    const lostItems = items?.filter(item => item.status === 'lost').length || 0
    const foundItems = items?.filter(item => item.status === 'found').length || 0
    const resolvedItems = items?.filter(item => item.claimed_by !== null).length || 0

    // Get current authenticated user count (approximate)
    const { data: { session } } = await supabase.auth.getSession()
    const currentUserCount = session ? 1 : 0 

   

    // Fetch conversations count
    const { count: conversationsCount, error: conversationsError } = await supabase
      .from('conversations')
      .select('*', { count: 'exact', head: true })

    if (conversationsError) {
      console.error('Error fetching conversations count:', conversationsError)
    }

    // Fetch messages count
    const { count: messagesCount, error: messagesError } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })

    if (messagesError) {
      console.error('Error fetching messages count:', messagesError)
    }

    // Fetch recent activity - simplified without user joins
    const { data: recentItems, error: recentError } = await supabase
      .from('items')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5)

    if (recentError) {
      console.error('Error fetching recent activity:', recentError)
    }

    stats.value.totalItems = totalItems
    stats.value.lostItems = lostItems
    stats.value.foundItems = foundItems
    stats.value.resolvedItems = resolvedItems
    stats.value.totalUsers = currentUserCount 
    stats.value.totalConversations = conversationsCount || 0
    stats.value.totalMessages = messagesCount || 0

   
    stats.value.recentActivity = (recentItems || []).map((item: any) => ({
      id: item.id.toString(),
      type: item.claimed_by ? 'claimed' : item.status,
      title: item.title,
      user: 'User', 
      timestamp: item.created_at,
      status: item.claimed_by ? 'Claimed' : 'Active'
    }))

  } catch (error) {
    console.error('Error fetching dashboard data:', error)
  } finally {
    loading.value = false
  }
}

const postMissingItem = async () => {
  if (!newItemForm.value.title || !newItemForm.value.description) {
    return
  }

  postingItem.value = true
  
  try {
    // Get current user (if authenticated)
    const { data: { user } } = await supabase.auth.getUser()
    
    const insertData = {
      title: newItemForm.value.title,
      description: newItemForm.value.description,
      status: newItemForm.value.status,
      user_id: user?.id || null, 
      claimed_by: null
    }
    
    const { data, error } = await supabase
      .from('items')
      .insert([insertData])
      .select()

    if (error) {
      throw error
    }

    // Reset form
    newItemForm.value = {
      title: '',
      description: '',
      status: 'lost'
    }
    showPostDialog.value = false
    
    // Refresh dashboard data
    await fetchDashboardStats()
    
    console.log('Item posted successfully:', data)
    
  } catch (error) {
    console.error('Error posting item:', error)
    let errorMessage = 'An unknown error occurred'
    
    if (error && typeof error === 'object' && 'message' in error) {
      errorMessage = String(error.message)
    } else if (typeof error === 'string') {
      errorMessage = error
    }
    
    alert(`Error posting item: ${errorMessage}`)
  } finally {
    postingItem.value = false
  }
}


const getTotalUsersCount = async () => {
  try {
    const { data: items } = await supabase
      .from('items')
      .select('user_id')
    
    if (items) {
      const uniqueUserIds = new Set(items.filter(item => item.user_id).map(item => item.user_id))
      return uniqueUserIds.size
    }
    
    return 0
  } catch (error) {
    console.error('Error getting user count:', error)
    return 0
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

onMounted(async () => {
  await fetchDashboardStats()
  // Get more accurate user count
  const userCount = await getTotalUsersCount()
  stats.value.totalUsers = userCount
})
</script>

<template>
  <InnerLayoutWrapper>
    <template #content>
      <div class="dashboard">
        <div class="d-flex justify-space-between align-center mb-6">
          <h1 class="text-h4 font-weight-bold text-primary">
            CSU Lost & Found Dashboard
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
            

            <!-- System Stats -->
            <v-col cols="12" lg="4">
              

              <!-- Admin Note -->
              <v-card class="pa-4" elevation="2">
                <v-card-title class="text-h6 font-weight-bold mb-3">
                  <v-icon class="me-2">mdi-chat</v-icon>
                  Realtime Chat System
                </v-card-title>
                <v-card-text class="pa-0">
                  <p class="text-body-2 mb-2">
                    Students can start realtime chats to prove ownership of items.
                  </p>
                  <p class="text-body-2 text-grey-darken-1">
                    They describe item details for verification before claiming.
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
                      by {{ activity.user }} • {{ activity.status }}
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
                  prepend-inner-icon="mdi-text"
                  variant="outlined"
                  placeholder="e.g., iPhone 13, Blue Backpack, Student ID"
                  class="mb-3"
                />
                
                <v-textarea
                  v-model="newItemForm.description"
                  label="Item Description"
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
                    <v-icon>mdi-chat</v-icon>
                  </template>
                  Students can start a realtime chat to describe this item for ownership verification.
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