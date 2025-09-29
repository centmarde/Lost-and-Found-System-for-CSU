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
import { useFilterSortPagination } from '@/utils/helpers'
import { markItemAsClaimed } from '@/stores/items'
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

// ----------------------------------------------------------------------
// Filter, Sort, and Pagination Composable
// ----------------------------------------------------------------------
// Note: We initialize this with the items ref and the default itemsPerPage (12)
const {
  page,
  itemsPerPage,
  sortBy,
  selectedMonth,
  selectedDay,
  availableMonths,
  availableDays,
  filteredAndSortedItems,
  paginatedItems,
  totalPages,
  formatMonthLabel,
  formatDayLabel,
} = useFilterSortPagination(items, 12) // 👈 Implementation of the Composable

// ----------------------------------------------------------------------
// The following computed properties and watchers are REMOVED 
// as they are now handled by useFilterSortPagination:
//
// const availableMonths = computed(...)
// const availableDays = computed(...)
// const filteredAndSortedItems = computed(...)
// const paginatedItems = computed(...)
// const totalPages = computed(...)
// const formatMonthLabel = (monthValue: string) => {...}
// const formatDayLabel = (dayValue: string) => {...}
// watch([selectedMonth, selectedDay, sortBy, itemsPerPage], ...)
// watch(selectedMonth, () => ...)
// ----------------------------------------------------------------------

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

// ---
// Define core functions here
// ---

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
      // Only fetch items posted by the current admin user
      query = query.eq('user_id', currentUser.value.id)
    }

    // Always order by created_at newest first on initial fetch
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

const {
  updatingItems,
  markAsClaimed,
} = useAdminItemActions(fetchItems)





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

// Watch for user changes to setup notifications
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

        <v-row class="mb-4">
          <v-col cols="12">
            <v-card elevation="1" class="pa-4">
              <v-row align="center">
                <v-col cols="12" sm="6" md="3">
                  <v-select
                    v-model="sortBy"
                    :items="[
                      { title: 'Newest First', value: 'newest' },
                      { title: 'Oldest First', value: 'oldest' }
                    ]"
                    label="Sort By"
                    variant="outlined"
                    density="comfortable"
                    prepend-inner-icon="mdi-sort"
                    hide-details
                  />
                </v-col>

                <v-col cols="12" sm="6" md="3">
                  <v-select
                    v-model="selectedMonth"
                    :items="[
                      { title: 'All Months', value: 'all' },
                      ...availableMonths.map(m => ({ title: formatMonthLabel(m), value: m }))
                    ]"
                    label="Filter by Month"
                    variant="outlined"
                    density="comfortable"
                    prepend-inner-icon="mdi-calendar-month"
                    hide-details
                  />
                </v-col>

                <v-col cols="12" sm="6" md="3">
                  <v-select
                    v-model="selectedDay"
                    :items="[
                      { title: 'All Days', value: 'all' },
                      ...availableDays.map(d => ({ title: formatDayLabel(d), value: d }))
                    ]"
                    label="Filter by Day"
                    variant="outlined"
                    density="comfortable"
                    prepend-inner-icon="mdi-calendar"
                    :disabled="selectedMonth === 'all' || availableDays.length === 0"
                    hide-details
                  />
                </v-col>

                <v-col cols="12" sm="6" md="3">
                  <v-select
                    v-model="itemsPerPage"
                    :items="[8, 12, 16, 24, 48]"
                    label="Items per page"
                    variant="outlined"
                    density="comfortable"
                    prepend-inner-icon="mdi-view-grid"
                    hide-details
                  />
                </v-col>
              </v-row>

              <v-row v-if="selectedMonth !== 'all' || selectedDay !== 'all'" class="mt-2">
                <v-col cols="12">
                  <div class="d-flex align-center flex-wrap gap-2">
                    <span class="text-caption text-grey-darken-1">Active filters:</span>
                    
                    <v-chip
                      v-if="selectedMonth !== 'all'"
                      closable
                      size="small"
                      color="primary"
                      variant="tonal"
                      @click:close="selectedMonth = 'all'"
                    >
                      <v-icon start size="small">mdi-calendar-month</v-icon>
                      {{ formatMonthLabel(selectedMonth) }}
                    </v-chip>

                    <v-chip
                      v-if="selectedDay !== 'all'"
                      closable
                      size="small"
                      color="primary"
                      variant="tonal"
                      @click:close="selectedDay = 'all'"
                    >
                      <v-icon start size="small">mdi-calendar</v-icon>
                      {{ formatDayLabel(selectedDay) }}
                    </v-chip>

                    <v-btn
                      size="small"
                      variant="text"
                      color="error"
                      @click="selectedMonth = 'all'; selectedDay = 'all'"
                    >
                      Clear all
                    </v-btn>
                  </div>
                </v-col>
              </v-row>
            </v-card>
          </v-col>
        </v-row>

        <v-row>
          <v-col cols="12">
            <v-card elevation="2" class="pa-4">
              <v-card-title class="text-h5 font-weight-bold mb-4 d-flex align-center">
                <v-icon class="me-2" color="primary">mdi-package-variant-closed</v-icon>
                {{ isCurrentUserAdmin ? 'Your Items' : 'Missing Items' }}
                <v-spacer />
                <v-chip 
                  v-if="!itemsLoading" 
                  color="info" 
                  variant="tonal"
                  size="small"
                >
                  {{ filteredAndSortedItems.length }} of {{ items.length }} items
                </v-chip>
              </v-card-title>

              <div v-if="itemsLoading" class="text-center py-12">
                <v-progress-circular
                  indeterminate
                  color="primary"
                  size="48"
                />
                <p class="text-body-1 mt-4">Loading items...</p>
              </div>

              <div v-else-if="filteredAndSortedItems.length === 0" class="text-center py-12">
                <v-icon size="80" color="grey-lighten-1" class="mb-4">
                  mdi-package-variant-closed-remove
                </v-icon>
                <h3 class="text-h5 text-grey-darken-1 mb-2">
                  {{ items.length === 0 
                    ? (isCurrentUserAdmin ? 'No items posted yet' : 'No missing items found')
                    : 'No items match your filters'
                  }}
                </h3>
                <p class="text-body-1 text-grey-darken-2 mb-4">
                  {{ items.length === 0
                    ? (isCurrentUserAdmin 
                      ? 'You haven\'t posted any missing items yet.' 
                      : 'There are currently no missing items posted by admins.')
                    : 'Try adjusting your filters to see more items.'
                  }}
                </p>
                <v-btn 
                  v-if="items.length === 0"
                  color="primary" 
                  variant="outlined"
                  prepend-icon="mdi-refresh"
                  @click="fetchItems"
                >
                  Refresh
                </v-btn>
                <v-btn
                  v-else
                  color="primary"
                  variant="outlined"
                  prepend-icon="mdi-filter-remove"
                  @click="selectedMonth = 'all'; selectedDay = 'all'"
                >
                  Clear Filters
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
                    />
                    
                    <UserItemCard
                      v-else
                      :item="item"
                      :is-updating="false"
                      @contact="handleContact(item)"
                    />
                  </v-col>
                </v-row>

                <v-row v-if="totalPages > 1" class="mt-6">
                  <v-col cols="12">
                    <div class="d-flex justify-center align-center flex-wrap gap-2">
                      <v-pagination
                        v-model="page"
                        :length="totalPages"
                        :total-visible="7"
                        rounded="circle"
                        color="primary"
                      />
                      
                      <div class="text-caption text-grey-darken-1 ml-4">
                        Showing {{ (page - 1) * itemsPerPage + 1 }}-{{ Math.min(page * itemsPerPage, filteredAndSortedItems.length) }} of {{ filteredAndSortedItems.length }}
                      </div>
                    </div>
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
