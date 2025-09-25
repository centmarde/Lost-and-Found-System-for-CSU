//Home.vue
<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { useToast } from 'vue-toastification'
import InnerLayoutWrapper from '@/layouts/InnerLayoutWrapper.vue'
import MissingItemCard from '@/pages/admin/components/ItemCard.vue' 
import { supabase } from '@/lib/supabase'
import { formatDate } from '@/utils/helpers'

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
}

const toast = useToast()

// Items state
const items = ref<Item[]>([])
const itemsLoading = ref(false)
const updatingItemId = ref<number | null>(null)

// Chat state
const showChatDialog = ref(false)
const selectedItem = ref<Item | null>(null)
const currentConversation = ref<Conversation | null>(null)
const messages = ref<Message[]>([])
const newMessage = ref('')
const messagesLoading = ref(false)
const sendingMessage = ref(false)
const currentUser = ref<any>(null)

// Real-time subscription
let messageSubscription: any = null

// Get current user
const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  currentUser.value = user
}

// Fetch items from database (only admin-posted items)
const fetchItems = async () => {
  itemsLoading.value = true
  try {
    // Get admin users first
    const { data: adminUsers, error: adminError } = await supabase
      .from('roles')
      .select('user_id')
      .eq('role', 'admin')

    if (adminError) {
      console.error('Error fetching admin users:', adminError)
      toast.error('Failed to load admin users')
      return
    }

    const adminUserIds = adminUsers?.map(admin => admin.user_id) || []

    if (adminUserIds.length === 0) {
      items.value = []
      return
    }

    // Fetch items posted by admins only
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .in('user_id', adminUserIds)
      .order('created_at', { ascending: false })

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

// Open conversation dialog
const openConversations = async (itemId: number) => {
  if (!currentUser.value) {
    toast.error('Please log in to start a conversation')
    return
  }

  const item = items.value.find(i => i.id === itemId)
  if (!item) return

  selectedItem.value = item
  showChatDialog.value = true
  
  await loadOrCreateConversation(itemId, item.user_id)
}

// Load or create conversation
const loadOrCreateConversation = async (itemId: number, adminId: string) => {
  try {
    messagesLoading.value = true

    // Check if conversation already exists
    const { data: existingConversation, error: checkError } = await supabase
      .from('conversations')
      .select('*')
      .eq('item_id', itemId)
      .eq('sender_id', currentUser.value.id)
      .eq('receiver_id', adminId)
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking existing conversation:', checkError)
      toast.error('Failed to load conversation')
      return
    }

    if (existingConversation) {
      // Use existing conversation
      currentConversation.value = existingConversation
    } else {
      // Create new conversation
      const { data: newConversation, error: createError } = await supabase
        .from('conversations')
        .insert([
          {
            item_id: itemId,
            sender_id: currentUser.value.id,
            receiver_id: adminId
          }
        ])
        .select()
        .single()

      if (createError) {
        console.error('Error creating conversation:', createError)
        toast.error('Failed to create conversation')
        return
      }

      currentConversation.value = newConversation
      toast.success('Conversation started!')
    }

    // Load messages
    await loadMessages()
    
    // Set up real-time subscription
    setupMessageSubscription()

  } catch (error) {
    console.error('Error loading conversation:', error)
    toast.error('An unexpected error occurred')
  } finally {
    messagesLoading.value = false
  }
}

// Load messages for current conversation
const loadMessages = async () => {
  if (!currentConversation.value) return

  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', currentConversation.value.id)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error loading messages:', error)
      return
    }

    messages.value = data || []
    
    // Scroll to bottom
    await nextTick()
    scrollToBottom()
  } catch (error) {
    console.error('Error loading messages:', error)
  }
}

// Set up real-time message subscription
const setupMessageSubscription = () => {
  if (!currentConversation.value || messageSubscription) return

  messageSubscription = supabase
    .channel(`messages:${currentConversation.value.id}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${currentConversation.value.id}`
      },
      (payload) => {
        messages.value.push(payload.new as Message)
        nextTick(() => scrollToBottom())
      }
    )
    .subscribe()
}

// Send message
const sendMessage = async () => {
  if (!newMessage.value.trim() || !currentConversation.value || sendingMessage.value) return

  const messageText = newMessage.value.trim()
  newMessage.value = ''
  sendingMessage.value = true

  try {
    const { error } = await supabase
      .from('messages')
      .insert([
        {
          conversation_id: currentConversation.value.id,
          message: messageText,
          sender_id: currentUser.value.id
        }
      ])

    if (error) {
      console.error('Error sending message:', error)
      toast.error('Failed to send message')
      newMessage.value = messageText // Restore message on error
      return
    }

  } catch (error) {
    console.error('Error sending message:', error)
    toast.error('An unexpected error occurred')
    newMessage.value = messageText // Restore message on error
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
  
  // Clean up subscription
  if (messageSubscription) {
    messageSubscription.unsubscribe()
    messageSubscription = null
  }
}

// Scroll to bottom of messages
const scrollToBottom = () => {
  const messagesContainer = document.querySelector('.messages-container')
  if (messagesContainer) {
    messagesContainer.scrollTop = messagesContainer.scrollHeight
  }
}

// Handle Enter key in message input
const handleKeyPress = (event: KeyboardEvent) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    sendMessage()
  }
}

// Check if message is from current user
const isMyMessage = (message: Message) => {
  return message.sender_id === currentUser.value?.id
}

// Mark item as unclaimed (legacy function)
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

    // Update local state
    const item = items.value.find(i => i.id === itemId)
    if (item) {
      item.claimed_by = ''
    }

    toast.success('Item marked as unclaimed!')
    await fetchItems() // Refresh items
  } catch (error) {
    console.error('Error:', error)
    toast.error('An unexpected error occurred')
  } finally {
    updatingItemId.value = null
  }
}

// Cleanup on unmount
onUnmounted(() => {
  if (messageSubscription) {
    messageSubscription.unsubscribe()
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
                Lost & Found
              </h1>
              <p class="text-h6 text-grey-darken-1">
                Find your lost items or help others find theirs
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
                Missing Items
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
                <h3 class="text-h5 text-grey-darken-1 mb-2">No missing items found</h3>
                <p class="text-body-1 text-grey-darken-2 mb-4">
                  There are currently no missing items posted by admins.
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
                  <MissingItemCard
                    :item="item"
                    :is-updating="updatingItemId === item.id"
                    @open-conversations="openConversations"
                    @mark-as-unclaimed="markItemAsUnclaimed"
                  />
                </v-col>
              </v-row>
            </v-card>
          </v-col>
        </v-row>

        <!-- Chat Dialog -->
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

            <!-- Messages Container -->
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

            <!-- Message Input -->
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

.chat-dialog {
  border-radius: 12px !important;
  overflow: hidden;
}

.messages-container {
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
</style>