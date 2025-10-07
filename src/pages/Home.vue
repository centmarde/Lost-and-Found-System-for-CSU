<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import InnerLayoutWrapper from '@/layouts/InnerLayoutWrapper.vue'
import AdminItemCard from '@/pages/admin/components/AdminCard.vue'
import UserItemCard from '@/pages/admin/components/ItemCard.vue'
import UserChatDialog from '@/pages/admin/components/userChatDialog.vue'
import AdminChatDialog from '@/pages/admin/components/AdminChatDialog.vue'
import NotificationDialog from '@/pages/admin/components/NotifDialog.vue'

// Composables
import { useAuth } from '@/pages/admin/components/composables/useAuth'
import { useItems } from '@/pages/admin/components/composables/useItem'
import { usePageConfig } from '@/pages/admin/components/composables/usePageConfig'
import { useUserChat } from '@/pages/admin/components/composables/useUserChat'
import { useAdminChat } from '@/pages/admin/components/composables/useAdminChat'
import { useAdminItemActions } from '@/pages/admin/components/composables/useAdminItems'
import { useNotifications } from '@/pages/admin/components/composables/useNotification'
import { useFilterSortPagination } from '@/utils/helpers'

import '@/styles/home.css'

// Auth composable
const { currentUser, isCurrentUserAdmin, getCurrentUser } = useAuth()

// Items composable
const { items, itemsLoading, fetchItems } = useItems(isCurrentUserAdmin, currentUser)

// Page config composable
const { pageTitle, pageSubtitle, emptyStateConfig } = usePageConfig(isCurrentUserAdmin)

// Filter, Sort, and Pagination
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
} = useFilterSortPagination(items, 12)

// User chat composable
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

// Admin chat composable
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

// Admin actions composable
const { updatingItems, markAsClaimed } = useAdminItemActions(fetchItems)

// Notifications composable
const showNotificationBell = ref(false)
const showNotificationDialog = ref(false)

const {
  notifications,
  setupItemNotifications,
  markAsRead,
  clearNotifications,
  cleanup
} = useNotifications(currentUser, isCurrentUserAdmin)

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

// Watch for user changes to setup notifications
watch([currentUser, isCurrentUserAdmin], async ([user, isAdmin]) => {
  if (user && !isAdmin) {
    await setupItemNotifications()
    showNotificationBell.value = true
  } else {
    showNotificationBell.value = false
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
              <h1 class="text-h3 font-weight-bold text-green-darken-4 mb-2">
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
                {{ emptyStateConfig.sectionTitle }}
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
                    ? emptyStateConfig.noItemsTitle
                    : 'No items match your filters'
                  }}
                </h3>
                <p class="text-body-1 text-grey-darken-2 mb-4">
                  {{ items.length === 0
                    ? emptyStateConfig.noItemsMessage
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