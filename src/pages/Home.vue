<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useToast } from 'vue-toastification'
import InnerLayoutWrapper from '@/layouts/InnerLayoutWrapper.vue'
import AdminItemCard from '@/pages/admin/components/AdminCard.vue'
import UserItemCard from '@/pages/admin/components/ItemCard.vue'
import UserChatDialog from '@/pages/admin/components/userChatDialog.vue'
import AdminChatDialog from '@/pages/admin/components/AdminChatDialog.vue'
import NotificationDialog from '@/pages/admin/components/NotifDialog.vue'
import { supabase } from '@/lib/supabase'
import { useAuthUserStore } from '@/stores/authUser'
import { useUserChat } from '@/pages/admin/components/composables/useUserChat'
import { useAdminChat } from '@/pages/admin/components/composables/useAdminChat'
import { useAdminItemActions } from '@/pages/admin/components/composables/useAdminItems'
import { useNotifications } from '@/pages/admin/components/composables/useNotification'
import '@/styles/home.css'

interface Item {
  id: number
  title: string
  description: string
  status: 'lost' | 'found'
  user_id: string
  claimed_by: string
  created_at: string
}

const toast = useToast()

// Global state
const items = ref<Item[]>([])
const itemsLoading = ref(false)
const currentUser = ref<any>(null)
const isCurrentUserAdmin = ref(false)
const showNotificationBell = ref(false)
const showNotificationDialog = ref(false)

// Pagination and sorting
const page = ref(1)
const itemsPerPage = ref(8)
const sortBy = ref<'newest' | 'oldest'>('newest')
const filterByMonth = ref<string>('all')
const searchQuery = ref('')

// Use the new composables
const {
  showChatDialog,
  selectedItem,
  messages,
  messagesLoading,
  sendingMessage,
  handleContact,
  sendMessage,
  closeChatDialog,
} = useUserChat(currentUser)

const {
  showAdminConversationsDialog,
  selectedItemForConversations,
  adminConversations,
  selectedAdminConversation,
  adminMessages,
  newAdminMessage,
  loadingAdminConversations,
  loadingAdminMessages,
  sendingAdminMessage,
  handleOpenConversations,
  selectAdminConversation,
  sendAdminMessage,
  closeAdminConversationsDialog,
} = useAdminChat(currentUser)

// Initialize notifications composable
const {
  notifications,
  setupItemNotifications,
  markAsRead,
  clearNotifications,
  cleanup
} = useNotifications(currentUser, isCurrentUserAdmin)

// Available months from items
const availableMonths = computed(() => {
  const months = new Set<string>()
  items.value.forEach(item => {
    const date = new Date(item.created_at)
    const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    months.add(monthYear)
  })
  return Array.from(months).sort().reverse()
})

// Month display names
const getMonthName = (monthYear: string) => {
  const [year, month] = monthYear.split('-')
  const date = new Date(parseInt(year), parseInt(month) - 1)
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

// Filtered and sorted items
const filteredItems = computed(() => {
  let filtered = [...items.value]

  // Filter by search query
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(item => 
      item.title.toLowerCase().includes(query) ||
      item.description.toLowerCase().includes(query)
    )
  }

  // Filter by month
  if (filterByMonth.value !== 'all') {
    filtered = filtered.filter(item => {
      const date = new Date(item.created_at)
      const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      return monthYear === filterByMonth.value
    })
  }

  // Sort
  filtered.sort((a, b) => {
    const dateA = new Date(a.created_at).getTime()
    const dateB = new Date(b.created_at).getTime()
    return sortBy.value === 'newest' ? dateB - dateA : dateA - dateB
  })

  return filtered
})

// Paginated items
const paginatedItems = computed(() => {
  const start = (page.value - 1) * itemsPerPage.value
  const end = start + itemsPerPage.value
  return filteredItems.value.slice(start, end)
})

// Total pages
const totalPages = computed(() => {
  return Math.ceil(filteredItems.value.length / itemsPerPage.value)
})

// Reset page when filters change
watch([filterByMonth, sortBy, searchQuery], () => {
  page.value = 1
})

// Check if current user is admin
const checkIfUserIsAdmin = async (user: any) => {
  if (!user) return false

  try {
    const authStore = useAuthUserStore()
    const { users, error } = await authStore.getAllUsers()

    if (error) return false

    const currentUserData = users?.find(u => u.id === user.id)
    const roleId = currentUserData?.user_metadata?.role

    return roleId === 1
  } catch (error) {
    console.error('Error checking admin status:', error)
    return false
  }
}

// Get current user and check admin status
const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  currentUser.value = user

  if (user) {
    isCurrentUserAdmin.value = await checkIfUserIsAdmin(user)
    showNotificationBell.value = !isCurrentUserAdmin.value
    
    if (!isCurrentUserAdmin.value) {
      await setupItemNotifications() 
    }
  }
}

// Fetch items from database
const fetchItems = async () => {
  itemsLoading.value = true
  try {
    let query = supabase.from('items').select('*')

    if (!isCurrentUserAdmin.value) {
      const authStore = useAuthUserStore()
      const { users, error: usersError } = await authStore.getAllUsers()

      if (usersError) {
        console.error('Error fetching users:', usersError)
        toast.error('Failed to load admin users')
        return
      }

      const adminUsers = users?.filter(user => {
        const roleId = user.user_metadata?.role
        return roleId === 1
      }) || []

      if (adminUsers.length === 0) {
        items.value = []
        return
      }

      const adminUserIds = adminUsers.map(admin => admin.id)
      query = query.in('user_id', adminUserIds)
    } else {
      query = query.eq('user_id', currentUser.value.id)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching items:', error)
      toast.error('Failed to load items')
      return
    }

    items.value = data || []
  } catch (error) {
    console.error('Error:', error)
    toast.error('An unexpected error occurred while loading items')
  } finally {
    itemsLoading.value = false
  }
}

// Use the existing admin item actions
const {
  updatingItems,
  markAsClaimed,
  markAsUnclaimed,
} = useAdminItemActions(fetchItems)

// Handle item unclaiming (regular users)
const markItemAsUnclaimed = async (itemId: number) => {
  // existing logic
}

// Notification functions
const unreadCount = computed(() => {
  return notifications.value.filter(n => !n.read).length
})

const toggleNotifications = () => {
  showNotificationDialog.value = true
}

const handleMarkAsRead = (notificationId: number) => {
  markAsRead(notificationId)
}

const handleClearAllNotifications = () => {
  clearNotifications()
}

const pageTitle = computed(() => isCurrentUserAdmin.value ? 'Manage Lost & Found Items' : 'Lost & Found')
const pageSubtitle = computed(() => isCurrentUserAdmin.value ? 'Manage your posted items and view conversations' : 'Find your lost items or help others find theirs')

watch([currentUser, isCurrentUserAdmin], async ([user, isAdmin]) => {
  if (user && !isAdmin) {
    await setupItemNotifications()
  }
}, { immediate: false })

onMounted(async () => {
  await getCurrentUser()
  await fetchItems()
})
</script>

<template>
  <InnerLayoutWrapper>
    <template #content>
      <v-container fluid class="pa-6">
        <v-row class="mb-6">
          <v-col cols="12">
            <div class="text-center position-relative">
              <h1 class="text-h3 font-weight-bold text-primary mb-2">
                {{ pageTitle }}
              </h1>
              <p class="text-h6 text-grey-darken-1">
                {{ pageSubtitle }}
              </p>

              <!-- Notification Bell for Users -->
              <div 
                v-if="showNotificationBell" 
                class="notification-bell"
              >
                <v-btn
                  icon
                  size="large"
                  @click="toggleNotifications"
                  :color="unreadCount > 0 ? 'primary' : 'default'"
                >
                  <v-badge
                    :content="unreadCount"
                    :model-value="unreadCount > 0"
                    color="error"
                    overlap
                  >
                    <v-icon>mdi-bell</v-icon>
                  </v-badge>
                </v-btn>
              </div>
            </div>
          </v-col>
        </v-row>

        <v-row>
          <v-col cols="12">
            <v-card elevation="2" class="pa-4">
              <v-card-title class="text-h5 font-weight-bold mb-4 d-flex align-center flex-wrap">
                <div class="d-flex align-center">
                  <v-icon class="me-2" color="primary">mdi-package-variant-closed</v-icon>
                  {{ isCurrentUserAdmin ? 'Your Items' : 'Missing Items' }}
                </div>
                <v-spacer />
                <v-chip 
                  v-if="!itemsLoading" 
                  color="info" 
                  variant="tonal"
                  size="small"
                >
                  {{ filteredItems.length }} items
                </v-chip>
              </v-card-title>

              <!-- Filters and Sorting (Only for Users) -->
              <v-row v-if="!isCurrentUserAdmin && items.length > 0" class="mb-4">
                <v-col cols="12">
                  <v-text-field
                    v-model="searchQuery"
                    label="Search items..."
                    placeholder="Search by title or description"
                    prepend-inner-icon="mdi-magnify"
                    variant="outlined"
                    density="compact"
                    hide-details
                    clearable
                  />
                </v-col>
                <v-col cols="12" sm="6" md="4">
                  <v-select
                    v-model="filterByMonth"
                    label="Filter by Month"
                    :items="[{ title: 'All Months', value: 'all' }, ...availableMonths.map(m => ({ title: getMonthName(m), value: m }))]"
                    variant="outlined"
                    density="compact"
                    hide-details
                  />
                </v-col>
                <v-col cols="12" sm="6" md="4">
                  <v-select
                    v-model="sortBy"
                    label="Sort by"
                    :items="[
                      { title: 'Newest First', value: 'newest' },
                      { title: 'Oldest First', value: 'oldest' }
                    ]"
                    variant="outlined"
                    density="compact"
                    hide-details
                  />
                </v-col>
                <v-col cols="12" sm="12" md="4" class="d-flex align-center">
                  <v-chip class="me-2" size="small" variant="outlined">
                    Showing {{ paginatedItems.length }} of {{ filteredItems.length }}
                  </v-chip>
                </v-col>
              </v-row>

              <div v-if="itemsLoading" class="text-center py-12">
                <v-progress-circular
                  indeterminate
                  color="primary"
                  size="48"
                />
                <p class="text-body-1 mt-4">Loading items...</p>
              </div>

              <div v-else-if="items.length === 0" class="text-center py-12">
                <v-icon size="80" color="grey-lighten-1" class="mb-4">
                  mdi-package-variant-closed-remove
                </v-icon>
                <h3 class="text-h5 text-grey-darken-1 mb-2">
                  {{ isCurrentUserAdmin ? 'No items posted yet' : 'No missing items found' }}
                </h3>
                <p class="text-body-1 text-grey-darken-2 mb-4">
                  {{ isCurrentUserAdmin 
                    ? 'You haven\'t posted any missing items yet.' 
                    : 'There are currently no missing items posted by admins.' 
                  }}
                </p>
                <v-btn 
                  color="primary" 
                  variant="outlined"
                  prepend-icon="mdi-refresh"
                  @click="fetchItems"
                >
                  Refresh
                </v-btn>
              </div>

              <div v-else-if="filteredItems.length === 0" class="text-center py-12">
                <v-icon size="80" color="grey-lighten-1" class="mb-4">
                  mdi-filter-remove
                </v-icon>
                <h3 class="text-h5 text-grey-darken-1 mb-2">
                  No items found
                </h3>
                <p class="text-body-1 text-grey-darken-2 mb-4">
                  {{ searchQuery ? 'No items match your search.' : 'Try adjusting your filters' }}
                </p>
                <v-btn 
                  color="primary" 
                  variant="outlined"
                  @click="() => { filterByMonth = 'all'; searchQuery = '' }"
                >
                  Clear All Filters
                </v-btn>
              </div>

              <div v-else>
                <v-row class="items-grid">
                  <v-col
                    v-for="item in paginatedItems"
                    :key="item.id"
                    cols="12"
                    sm="6"
                    md="4"
                    lg="3"
                    xl="3"
                  >
                    <AdminItemCard
                      v-if="isCurrentUserAdmin"
                      :item="item"
                      :is-updating="updatingItems.has(item.id)"
                      @open-conversations="handleOpenConversations"
                      @mark-as-claimed="markAsClaimed"
                      @mark-as-unclaimed="markAsUnclaimed"
                    />
                    
                    <UserItemCard
                      v-else
                      :item="item"
                      :is-updating="false"
                      @contact="handleContact(item)"
                      @mark-as-unclaimed="markItemAsUnclaimed"
                    />
                  </v-col>
                </v-row>

                <!-- Pagination (Only for Users) -->
                <v-row v-if="!isCurrentUserAdmin && totalPages > 1" class="mt-4">
                  <v-col cols="12" class="d-flex justify-center">
                    <v-pagination
                      v-model="page"
                      :length="totalPages"
                      :total-visible="7"
                      rounded="circle"
                    />
                  </v-col>
                </v-row>
              </div>
            </v-card>
          </v-col>
        </v-row>

        <UserChatDialog
          v-model:show="showChatDialog"
          :item="selectedItem"
          :messages="messages"
          :messages-loading="messagesLoading"
          :sending-message="sendingMessage"
          @send-message="sendMessage"
        />

        <AdminChatDialog
          v-model:show="showAdminConversationsDialog"
          :item="selectedItemForConversations"
          :conversations="adminConversations"
          :messages="adminMessages"
          :selected-conversation="selectedAdminConversation"
          :loading-conversations="loadingAdminConversations"
          :loading-messages="loadingAdminMessages"
          :sending-message="sendingAdminMessage"
          @select-conversation="selectAdminConversation"
          @send-message="sendAdminMessage"
        />

        <NotificationDialog
          v-model="showNotificationDialog"
          :notifications="notifications"
          @mark-as-read="handleMarkAsRead"
          @clear-all="handleClearAllNotifications"
        />
      </v-container>
    </template>
  </InnerLayoutWrapper>
</template>

<style scoped>
.notification-bell {
  position: absolute;
  top: 0;
  right: 24px;
  z-index: 10;
}

@media (max-width: 768px) {
  .notification-bell {
    position: relative;
    margin-top: 16px;
  }
}

.items-grid {
  margin-top: 16px;
}
</style>