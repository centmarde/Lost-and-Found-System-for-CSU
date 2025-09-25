<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, computed } from 'vue'
import { useToast } from 'vue-toastification'
import InnerLayoutWrapper from '@/layouts/InnerLayoutWrapper.vue'
import AdminItemCard from '@/pages/admin/components/AdminCard.vue'
import UserItemCard from '@/pages/admin/components/ItemCard.vue'
import { supabase } from '@/lib/supabase'
import { formatDate } from '@/utils/helpers'
import { useAuthUserStore } from '@/stores/authUser'
import { useItemActions } from '@/pages/admin/components/composables/useItemActions'
import { useAdminItemActions } from '@/pages/admin/components/composables/useAdminItems'

interface Item {
  id: number
  title: string
  description: string
  status: 'lost' | 'found'
  user_id: string
  claimed_by: string
  created_at: string
}

interface Message {
  id: string
  conversation_id: string
  message: string
  attach_image: string | null
  created_at: string
  sender_id: string
}

interface Conversation {
  id: string
  item_id: number
  sender_id: string
  receiver_id: string
  created_at: string
  items?: {
    id: number
    title: string
    description: string
    status: string
  }
  sender?: {
    id: string
    email: string
  }
}

const toast = useToast()

// Items state
const items = ref<Item[]>([])
const itemsLoading = ref(false)
const updatingItemId = ref<number | null>(null)

// User state
const currentUser = ref<any>(null)
const isCurrentUserAdmin = ref(false)

// Chat state (for regular users)
const showChatDialog = ref(false)
const selectedItem = ref<Item | null>(null)
const currentConversation = ref<Conversation | null>(null)
const messages = ref<Message[]>([])
const newMessage = ref('')
const messagesLoading = ref(false)
const sendingMessage = ref(false)

// Admin conversations state
const showAdminConversationsDialog = ref(false)
const selectedItemForConversations = ref<Item | null>(null)
const adminConversations = ref<Conversation[]>([])
const selectedAdminConversation = ref<Conversation | null>(null)
const adminMessages = ref<Message[]>([])
const newAdminMessage = ref('')
const loadingAdminConversations = ref(false)
const loadingAdminMessages = ref(false)
const sendingAdminMessage = ref(false)

// Real-time subscriptions
let messageSubscription: any = null
let adminMessageSubscription: any = null

// Use composables
const { 
  contactAdmin, 
  startingConversation, 
  loadMessages: loadMessagesFromActions,
  sendMessage: sendMessageFromActions,
  subscribeToMessages 
} = useItemActions()

// Check if current user is admin
const checkIfUserIsAdmin = async (user: any) => {
  if (!user) return false
  
  try {
    const authStore = useAuthUserStore()
    const { users, error } = await authStore.getAllUsers()
    
    if (error) return false
    
    const currentUserData = users?.find(u => u.id === user.id)
    const roleId = currentUserData?.user_metadata?.role
    
    return roleId === 1 // Assuming admin role has ID 1
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
      // For regular users, show only admin-posted items
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
      // For admins, show all items or just their own items
      // You can modify this logic based on your requirements
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

// Use admin composable after fetchItems is declared
const {
  updatingItems,
  markAsClaimed,
  markAsUnclaimed,
  subscribeToConversationMessages
} = useAdminItemActions(fetchItems)

// Handle contact button click (for regular users)
const handleContact = async (itemId: number) => {
  if (!currentUser.value) {
    toast.error('Please log in to contact the admin')
    return
  }

  const item = items.value.find(i => i.id === itemId)
  if (!item) return

  selectedItem.value = item
  
  try {
    const result = await contactAdmin(itemId, item.user_id)
    
    if (result.isNew) {
      toast.success('Conversation started!')
    }
    
    currentConversation.value = result.conversation
    showChatDialog.value = true
    
    await loadMessages()
    setupMessageSubscription()
    
  } catch (error) {
    console.error('Error contacting admin:', error)
    toast.error('Failed to start conversation')
  }
}

// Handle admin open conversations
const handleOpenConversations = async (item: Item) => {
  selectedItemForConversations.value = item
  showAdminConversationsDialog.value = true
  await loadAdminConversationsForItem(item.id)
}

// Load admin conversations for item
const loadAdminConversationsForItem = async (itemId: number) => {
  loadingAdminConversations.value = true
  try {
    // First, get conversations without trying to join users
    const { data: conversations, error: conversationError } = await supabase
      .from('conversations')
      .select(`
        *,
        items:item_id (
          id,
          title,
          description,
          status
        )
      `)
      .eq('item_id', itemId)
      .order('created_at', { ascending: false })

    if (conversationError) throw conversationError

    // Then get user emails separately using the auth store
    const authStore = useAuthUserStore()
    const { users: allUsers, error: usersError } = await authStore.getAllUsers()

    if (usersError) {
      console.warn('Could not load user details:', usersError)
      // Use conversations without user email details
      adminConversations.value = conversations?.map(conv => ({
        ...conv,
        sender: { id: conv.sender_id, email: 'Unknown User' }
      })) || []
    } else {
      // Map user emails to conversations
      adminConversations.value = conversations?.map(conv => {
        const senderUser = allUsers?.find(user => user.id === conv.sender_id)
        return {
          ...conv,
          sender: { 
            id: conv.sender_id, 
            email: senderUser?.email || 'Unknown User' 
          }
        }
      }) || []
    }
  } catch (error) {
    console.error('Error loading admin conversations:', error)
    toast.error('Failed to load conversations')
    adminConversations.value = []
  } finally {
    loadingAdminConversations.value = false
  }
}

// Select admin conversation
const selectAdminConversation = async (conversation: Conversation) => {
  selectedAdminConversation.value = conversation
  await loadAdminMessages(conversation.id)
  setupAdminMessageSubscription(conversation.id)
}

// Load admin messages
const loadAdminMessages = async (conversationId: string) => {
  loadingAdminMessages.value = true
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })

    if (error) throw error

    adminMessages.value = data || []
    
    await nextTick()
    scrollAdminMessagesToBottom()
  } catch (error) {
    console.error('Error loading admin messages:', error)
    toast.error('Failed to load messages')
    adminMessages.value = []
  } finally {
    loadingAdminMessages.value = false
  }
}

// Send admin message
const sendAdminMessage = async () => {
  if (!newAdminMessage.value.trim() || !selectedAdminConversation.value || sendingAdminMessage.value) return

  const messageText = newAdminMessage.value.trim()
  newAdminMessage.value = ''
  sendingAdminMessage.value = true

  try {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      throw new Error('User not authenticated')
    }

    const { data, error } = await supabase
      .from('messages')
      .insert([
        {
          conversation_id: selectedAdminConversation.value.id,
          message: messageText,
          sender_id: user.id
        }
      ])
      .select()

    if (error) throw error

    // Message will be added via real-time subscription
  } catch (error) {
    console.error('Error sending admin message:', error)
    toast.error('Failed to send message')
    newAdminMessage.value = messageText
  } finally {
    sendingAdminMessage.value = false
  }
}

// Setup admin message subscription
const setupAdminMessageSubscription = (conversationId: string) => {
  if (adminMessageSubscription) {
    adminMessageSubscription.unsubscribe()
  }

  adminMessageSubscription = subscribeToConversationMessages(
    conversationId,
    (message: Message) => {
      adminMessages.value.push(message)
      nextTick(() => scrollAdminMessagesToBottom())
    }
  )
}

// Load messages for current conversation (regular users)
const loadMessages = async () => {
  if (!currentConversation.value) return

  try {
    messagesLoading.value = true
    const messagesData = await loadMessagesFromActions(currentConversation.value.id)
    messages.value = messagesData || []
    
    await nextTick()
    scrollToBottom()
  } catch (error) {
    console.error('Error loading messages:', error)
    toast.error('Failed to load messages')
  } finally {
    messagesLoading.value = false
  }
}

// Set up regular message subscription
const setupMessageSubscription = () => {
  if (!currentConversation.value || messageSubscription) return

  messageSubscription = subscribeToMessages(
    currentConversation.value.id,
    (message: Message) => {
      messages.value.push(message)
      nextTick(() => scrollToBottom())
    }
  )
}

// Send message (regular users)
const sendMessage = async () => {
  if (!newMessage.value.trim() || !currentConversation.value || sendingMessage.value) return

  const messageText = newMessage.value.trim()
  newMessage.value = ''
  sendingMessage.value = true

  try {
    await sendMessageFromActions(currentConversation.value.id, messageText)
  } catch (error) {
    console.error('Error sending message:', error)
    toast.error('Failed to send message')
    newMessage.value = messageText
  } finally {
    sendingMessage.value = false
  }
}

// Close chat dialog
const closeChatDialog = () => {
  showChatDialog.value = false
  selectedItem.value = null
  currentConversation.value = null
  messages.value = []
  newMessage.value = ''
  
  if (messageSubscription) {
    messageSubscription.unsubscribe()
    messageSubscription = null
  }
}

// Close admin conversations dialog
const closeAdminConversationsDialog = () => {
  showAdminConversationsDialog.value = false
  selectedItemForConversations.value = null
  selectedAdminConversation.value = null
  adminConversations.value = []
  adminMessages.value = []
  newAdminMessage.value = ''
  
  if (adminMessageSubscription) {
    adminMessageSubscription.unsubscribe()
    adminMessageSubscription = null
  }
}

// Scroll functions
const scrollToBottom = () => {
  const messagesContainer = document.querySelector('.messages-container')
  if (messagesContainer) {
    messagesContainer.scrollTop = messagesContainer.scrollHeight
  }
}

const scrollAdminMessagesToBottom = () => {
  const messagesContainer = document.querySelector('.admin-messages-container')
  if (messagesContainer) {
    messagesContainer.scrollTop = messagesContainer.scrollHeight
  }
}

// Handle key press
const handleKeyPress = (event: KeyboardEvent) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    sendMessage()
  }
}

const handleAdminKeyPress = (event: KeyboardEvent) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    sendAdminMessage()
  }
}

// Check if message is from current user
const isMyMessage = (message: Message) => {
  return message.sender_id === currentUser.value?.id
}

// Mark item as unclaimed (for regular users)
const markItemAsUnclaimed = async (itemId: number) => {
  updatingItemId.value = itemId
  try {
    const { error } = await supabase
      .from('items')
      .update({ claimed_by: null })
      .eq('id', itemId)

    if (error) {
      console.error('Error unclaiming item:', error)
      toast.error('Failed to unclaim item')
      return
    }

    const item = items.value.find(i => i.id === itemId)
    if (item) {
      item.claimed_by = ''
    }

    toast.success('Item marked as unclaimed!')
    await fetchItems()
  } catch (error) {
    console.error('Error:', error)
    toast.error('An unexpected error occurred')
  } finally {
    updatingItemId.value = null
  }
}

// Computed property for page title
const pageTitle = computed(() => {
  return isCurrentUserAdmin.value ? 'Manage Lost & Found Items' : 'Lost & Found'
})

const pageSubtitle = computed(() => {
  return isCurrentUserAdmin.value 
    ? 'Manage your posted items and view conversations' 
    : 'Find your lost items or help others find theirs'
})

// Cleanup on unmount
onUnmounted(() => {
  if (messageSubscription) {
    messageSubscription.unsubscribe()
  }
  if (adminMessageSubscription) {
    adminMessageSubscription.unsubscribe()
  }
})

// Load data on component mount
onMounted(async () => {
  await getCurrentUser()
  await fetchItems()
})
</script>

<template>
  <InnerLayoutWrapper>
    <template #content>
      <v-container fluid class="pa-6">
        <!-- Page Header -->
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

        <!-- Items Section -->
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

              <!-- Loading State -->
              <div v-if="itemsLoading" class="text-center py-12">
                <v-progress-circular
                  indeterminate
                  color="primary"
                  size="48"
                />
                <p class="text-body-1 mt-4">Loading items...</p>
              </div>

              <!-- Empty State -->
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

              <!-- Items Grid -->
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
                  <!-- Admin Card -->
                  <AdminItemCard
                    v-if="isCurrentUserAdmin"
                    :item="item"
                    :is-updating="updatingItems.has(item.id) || updatingItemId === item.id"
                    @open-conversations="handleOpenConversations"
                    @mark-as-claimed="markAsClaimed"
                    @mark-as-unclaimed="markAsUnclaimed"
                  />
                  
                  <!-- User Card -->
                  <UserItemCard
                    v-else
                    :item="item"
                    :is-updating="startingConversation.has(item.id) || updatingItemId === item.id"
                    @contact="handleContact"
                    @mark-as-unclaimed="markItemAsUnclaimed"
                  />
                </v-col>
              </v-row>
            </v-card>
          </v-col>
        </v-row>

        <!-- Regular User Chat Dialog -->
        <v-dialog
          v-model="showChatDialog"
          max-width="600px"
          persistent
        >
          <v-card class="chat-dialog">
            <v-card-title class="d-flex align-center pa-4 bg-primary">
              <v-icon class="me-2 text-white">mdi-message-text</v-icon>
              <div class="text-white">
                <div class="text-h6">{{ selectedItem?.title }}</div>
                <div class="text-caption opacity-80">
                  Chat with admin about this {{ selectedItem?.status }} item
                </div>
              </div>
              <v-spacer />
              <v-btn
                icon="mdi-close"
                variant="text"
                color="white"
                @click="closeChatDialog"
              />
            </v-card-title>

            <div class="messages-container" style="height: 400px; overflow-y: auto;">
              <div v-if="messagesLoading" class="d-flex justify-center align-center pa-8">
                <v-progress-circular indeterminate color="primary" />
              </div>

              <div v-else-if="messages.length === 0" class="text-center pa-8">
                <v-icon size="48" color="grey-lighten-1">mdi-message-outline</v-icon>
                <div class="text-body-1 text-grey-darken-1 mt-2">
                  Start the conversation by sending a message
                </div>
                <div class="text-caption text-grey-darken-2">
                  Describe the item or ask questions to verify ownership
                </div>
              </div>

              <div v-else class="pa-4">
                <div
                  v-for="message in messages"
                  :key="message.id"
                  class="message-bubble mb-3"
                  :class="{ 'my-message': isMyMessage(message) }"
                >
                  <div class="message-content">
                    <div class="message-text">{{ message.message }}</div>
                    <div class="message-time">
                      {{ formatDate(message.created_at) }}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <v-card-actions class="pa-4 bg-grey-lighten-5">
              <v-text-field
                v-model="newMessage"
                placeholder="Type your message..."
                variant="outlined"
                density="compact"
                hide-details
                @keypress="handleKeyPress"
                :disabled="sendingMessage"
              />
              <v-btn
                color="primary"
                icon="mdi-send"
                :loading="sendingMessage"
                :disabled="!newMessage.trim()"
                @click="sendMessage"
                class="ml-2"
              />
            </v-card-actions>
          </v-card>
        </v-dialog>

        <!-- Admin Conversations Dialog -->
        <v-dialog
          v-model="showAdminConversationsDialog"
          max-width="800px"
          persistent
        >
          <v-card class="admin-conversations-dialog">
            <v-card-title class="d-flex align-center pa-4 bg-primary">
              <v-icon class="me-2 text-white">mdi-forum</v-icon>
              <div class="text-white">
                <div class="text-h6">Conversations</div>
                <div class="text-caption opacity-80">
                  {{ selectedItemForConversations?.title }}
                </div>
              </div>
              <v-spacer />
              <v-btn
                icon="mdi-close"
                variant="text"
                color="white"
                @click="closeAdminConversationsDialog"
              />
            </v-card-title>

            <div class="d-flex" style="height: 500px;">
              <!-- Conversations List -->
              <div class="conversations-list" style="width: 300px; border-right: 1px solid #e0e0e0;">
                <div v-if="loadingAdminConversations" class="d-flex justify-center align-center pa-8">
                  <v-progress-circular indeterminate color="primary" size="32" />
                </div>

                <div v-else-if="adminConversations.length === 0" class="text-center pa-8">
                  <v-icon size="48" color="grey-lighten-1">mdi-message-outline</v-icon>
                  <div class="text-body-2 text-grey-darken-1 mt-2">
                    No conversations yet
                  </div>
                </div>

                <v-list v-else class="pa-0">
                  <v-list-item
                    v-for="conversation in adminConversations"
                    :key="conversation.id"
                    @click="selectAdminConversation(conversation)"
                    :active="selectedAdminConversation?.id === conversation.id"
                    class="conversation-item"
                  >
                    <v-list-item-title class="text-subtitle-2">
                      {{ conversation.sender?.email }}
                    </v-list-item-title>
                    <v-list-item-subtitle class="text-caption">
                      {{ formatDate(conversation.created_at) }}
                    </v-list-item-subtitle>
                  </v-list-item>
                </v-list>
              </div>

              <!-- Messages Area -->
              <div class="flex-grow-1 d-flex flex-column">
                <div v-if="!selectedAdminConversation" class="d-flex justify-center align-center flex-grow-1">
                  <div class="text-center">
                    <v-icon size="64" color="grey-lighten-1">mdi-message-text-outline</v-icon>
                    <div class="text-body-1 text-grey-darken-1 mt-2">
                      Select a conversation to view messages
                    </div>
                  </div>
                </div>

                <template v-else>
                  <!-- Messages Container -->
                  <div class="admin-messages-container flex-grow-1 pa-4" style="overflow-y: auto;">
                    <div v-if="loadingAdminMessages" class="d-flex justify-center align-center pa-8">
                      <v-progress-circular indeterminate color="primary" />
                    </div>

                    <div v-else-if="adminMessages.length === 0" class="text-center pa-8">
                      <div class="text-body-2 text-grey-darken-1">
                        No messages in this conversation yet
                      </div>
                    </div>

                    <div v-else>
                      <div
                        v-for="message in adminMessages"
                        :key="message.id"
                        class="message-bubble mb-3"
                        :class="{ 'my-message': isMyMessage(message) }"
                      >
                        <div class="message-content">
                          <div class="message-text">{{ message.message }}</div>
                          <div class="message-time">
                            {{ formatDate(message.created_at) }}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Message Input -->
                  <div class="pa-4 bg-grey-lighten-5" style="border-top: 1px solid #e0e0e0;">
                    <div class="d-flex align-center">
                      <v-text-field
                        v-model="newAdminMessage"
                        placeholder="Type your message..."
                        variant="outlined"
                        density="compact"
                        hide-details
                        @keypress="handleAdminKeyPress"
                        :disabled="sendingAdminMessage"
                      />
                      <v-btn
                        color="primary"
                        icon="mdi-send"
                        :loading="sendingAdminMessage"
                        :disabled="!newAdminMessage.trim()"
                        @click="sendAdminMessage"
                        class="ml-2"
                      />
                    </div>
                  </div>
                </template>
              </div>
            </div>
          </v-card>
        </v-dialog>
      </v-container>
    </template>
  </InnerLayoutWrapper>
</template>

<style scoped>
.items-grid {
  min-height: 200px;
}

.v-card {
  border-radius: 12px;
}

.text-primary {
  background: linear-gradient(45deg, #1976d2, #42a5f5);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.chat-dialog, .admin-conversations-dialog {
  border-radius: 12px !important;
  overflow: hidden;
}

.messages-container, .admin-messages-container {
  background: #f5f5f5;
}

.message-bubble {
  display: flex;
}

.message-bubble.my-message {
  justify-content: flex-end;
}

.message-content {
  max-width: 70%;
  background: white;
  border-radius: 18px;
  padding: 12px 16px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.1);
}

.my-message .message-content {
  background: #1976d2;
  color: white;
}

.message-text {
  font-size: 14px;
  line-height: 1.4;
  word-wrap: break-word;
}

.message-time {
  font-size: 11px;
  opacity: 0.7;
  margin-top: 4px;
  text-align: right;
}

.my-message .message-time {
  color: rgba(255,255,255,0.7);
}

.conversations-list {
  background: #fafafa;
}

.conversation-item:hover {
  background-color: #f0f0f0;
}

.conversation-item.v-list-item--active {
  background-color: #e3f2fd;
}
</style>