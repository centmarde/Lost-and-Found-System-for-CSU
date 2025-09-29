<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import InnerLayoutWrapper from '@/layouts/InnerLayoutWrapper.vue'
// Component Imports
import AdminItemCard from '@/pages/admin/components/AdminCard.vue'
import UserItemCard from '@/pages/admin/components/ItemCard.vue'
import UserChatDialog from '@/pages/admin/components/userChatDialog.vue'
import AdminChatDialog from '@/pages/admin/components/AdminChatDialog.vue'
import NotificationDialog from '@/pages/admin/components/NotifDialog.vue'
// Composables
import { useUserChat } from '@/pages/admin/components/composables/useUserChat'
import { useAdminChat } from '@/pages/admin/components/composables/useAdminChat'
import { useAdminItemActions } from '@/pages/admin/components/composables/useAdminItems'
import { useNotifications } from '@/pages/admin/components/composables/useNotification'
import useHomeData from '@/pages/admin/components/composables/useHomeData'
import type { Item } from '@/pages/admin/components/composables/useHomeData'

import '@/styles/home.css'

const {
  // State
  itemsLoading,
  isCurrentUserAdmin,
  currentUser,
  showNotificationBell,
  showNotificationDialog,
  
  // Data
  filteredItems,
  paginatedItems,
  availableMonths,

  // Filtering/Sorting/Pagination
  page,
  itemsPerPage,
  sortBy,
  filterByMonth,
  searchQuery,
  totalPages,
  getMonthName,
  
  // Actions
  fetchItems,
  clearAllFilters,
  
  // Computed Properties for UI
  pageTitle,
  pageSubtitle,
} = useHomeData()

// 2. Chat Composables (Remain here as they depend on currentUser from useHomeData)
const {
  showChatDialog,
  selectedItem,
  messages,
  messagesLoading,
  sendingMessage,
  handleContact,
  sendMessage,
} = useUserChat(currentUser)

const {
  showAdminConversationsDialog,
  selectedItemForConversations,
  adminConversations,
  selectedAdminConversation,
  adminMessages,
  loadingAdminConversations,
  loadingAdminMessages,
  sendingAdminMessage,
  handleOpenConversations,
  selectAdminConversation,
  sendAdminMessage,
  closeAdminConversationsDialog,
} = useAdminChat(currentUser)

// 3. Notification Composable (Remains here)
const {
  notifications,
  setupItemNotifications, // Called inside useHomeData now, but exposed for clarity
  markAsRead,
  clearNotifications,
  cleanup,
} = useNotifications(currentUser, isCurrentUserAdmin)

// Computed property for notification count
const unreadCount = computed(() => {
  return notifications.value.filter(n => !n.read).length
})

// Notification action handlers
const toggleNotifications = () => {
  showNotificationDialog.value = true
}
const handleMarkAsRead = (notificationId: number) => markAsRead(notificationId)
const handleClearAllNotifications = () => clearNotifications()

// 4. Admin Item Actions Composable (Remains here)
const {
  updatingItems,
  markAsClaimed,
  markAsUnclaimed,
} = useAdminItemActions(fetchItems)

// 5. User-side item actions (Simplified placeholder)
// Note: The logic for markItemAsUnclaimed should ideally be in a useUserItemActions composable
// or directly here if it's very simple. Sticking with the existing structure for refactoring.
const markItemAsUnclaimed = async (itemId: number) => {
  // Existing logic...
}

// 6. Lifecycle hooks
onMounted(async () => {
  // getCurrentUser and initial fetchItems are now handled inside useHomeData
})

// Cleanup notifications when the component is unmounted
onUnmounted(() => {
  cleanup()
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

              <v-row v-if="!isCurrentUserAdmin && filteredItems.length > 0" class="mb-4">
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
                <v-col cols="12" sm="6" md="4">
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
              </v-row>

              <div v-if="itemsLoading" class="text-center py-12">
                <v-progress-circular
                  indeterminate
                  color="primary"
                  size="48"
                />
                <p class="text-body-1 mt-4">Loading items...</p>
              </div>

              <div v-else-if="itemsLoading === false && filteredItems.length === 0 && !searchQuery && filterByMonth === 'all'" class="text-center py-12">
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
                  @click="clearAllFilters"
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
                      @contact="handleContact(item as Item)"
                      @mark-as-unclaimed="markItemAsUnclaimed"
                    />
                  </v-col>
                </v-row>

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
          @close-dialog="closeAdminConversationsDialog"
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