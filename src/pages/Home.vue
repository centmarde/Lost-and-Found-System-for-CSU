<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useToast } from 'vue-toastification'
import InnerLayoutWrapper from '@/layouts/InnerLayoutWrapper.vue'
import AdminItemCard from '@/pages/admin/components/AdminCard.vue'
import UserItemCard from '@/pages/admin/components/ItemCard.vue'
import UserChatDialog from '@/pages/admin/components/userChatDialog.vue'
import AdminChatDialog from '@/pages/admin/components/AdminChatDialog.vue'
import { supabase } from '@/lib/supabase'
import { useAuthUserStore } from '@/stores/authUser'
import { useUserChat } from '@/pages/admin/components/composables/useUserChat'
import { useAdminChat } from '@/pages/admin/components/composables/useAdminChat'
import { useAdminItemActions } from '@/pages/admin/components/composables/useAdminItems'
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

// ---
// End of core functions
// ---

// Use the existing admin item actions
const {
  updatingItems,
  markAsClaimed,
  markAsUnclaimed,
} = useAdminItemActions(fetchItems)

// Handle item unclaiming (regular users) - This can stay here as it's a global action
const markItemAsUnclaimed = async (itemId: number) => {
  // ... (existing logic)
}

const pageTitle = computed(() => isCurrentUserAdmin.value ? 'Manage Lost & Found Items' : 'Lost & Found')
const pageSubtitle = computed(() => isCurrentUserAdmin.value ? 'Manage your posted items and view conversations' : 'Find your lost items or help others find theirs')

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
            <div class="text-center">
              <h1 class="text-h3 font-weight-bold text-primary mb-2">
                {{ pageTitle }}
              </h1>
              <p class="text-h6 text-grey-darken-1">
                {{ pageSubtitle }}
              </p>
            </div>
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
                  {{ items.length }} items
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

              <v-row v-else class="items-grid">
                <v-col
                  v-for="item in items"
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
      </v-container>
    </template>
  </InnerLayoutWrapper>
</template>