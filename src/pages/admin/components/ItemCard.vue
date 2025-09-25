<script lang="ts" setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { formatDate } from '@/utils/helpers'
import { supabase } from '@/lib/supabase'
import { useToast } from 'vue-toastification'

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

interface Props {
  item: Item
  isUpdating: boolean
}

const props = defineProps<Props>()

defineEmits<{
  contact: [id: number]
  markAsUnclaimed: [id: number]
}>()

const toast = useToast()

// Chat state
const showChatDialog = ref(false)
const conversation = ref<Conversation | null>(null)
const messages = ref<Message[]>([])
const newMessage = ref('')
const messagesLoading = ref(false)
const sendingMessage = ref(false)
const loadingConversation = ref(false)
const currentUser = ref<any>(null)

// Real-time subscription
let messageSubscription: any = null

const getItemStatusColor = (item: Item) => {
  if (item.claimed_by) return 'success'
  return item.status === 'lost' ? 'error' : 'info'
}

const getItemStatusText = (item: Item) => {
  if (item.claimed_by) return 'Claimed'
  return item.status === 'lost' ? 'Lost' : 'Found'
}

// Get current user
const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  currentUser.value = user
}

// Load or create conversation
const loadOrCreateConversation = async () => {
  if (!currentUser.value) {
    toast.error('Please log in to start a conversation')
    return
  }

  loadingConversation.value = true

  try {
    // Check if conversation already exists
    const { data: existingConversation, error: checkError } = await supabase
      .from('conversations')
      .select('*')
      .eq('item_id', props.item.id)
      .eq('sender_id', currentUser.value.id)
      .eq('receiver_id', props.item.user_id)
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError
    }

    if (existingConversation) {
      conversation.value = existingConversation
    } else {
      // Create new conversation
      const { data: newConversation, error: createError } = await supabase
        .from('conversations')
        .insert([
          {
            item_id: props.item.id,
            sender_id: currentUser.value.id,
            receiver_id: props.item.user_id
          }
        ])
        .select()
        .single()

      if (createError) {
        throw createError
      }

      conversation.value = newConversation
      toast.success('Conversation started!')
    }

    await loadMessages()
    setupMessageSubscription()

  } catch (error) {
    console.error('Error loading/creating conversation:', error)
    toast.error('Failed to start conversation')
  } finally {
    loadingConversation.value = false
  }
}

// Load messages
const loadMessages = async () => {
  if (!conversation.value) return

  messagesLoading.value = true

  try {
    // First, let's check what columns actually exist by selecting all
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversation.value.id)
      .order('created_at', { ascending: true })

    if (error) throw error

    messages.value = data || []
    
    await nextTick()
    scrollToBottom()
  } catch (error) {
    console.error('Error loading messages:', error)
    toast.error('Failed to load messages')
  } finally {
    messagesLoading.value = false
  }
}

// Send message
const sendMessage = async () => {
  if (!newMessage.value.trim() || !conversation.value || sendingMessage.value) return

  const messageText = newMessage.value.trim()
  newMessage.value = ''
  sendingMessage.value = true

  try {
    // Based on your schema, only insert the columns that actually exist
    const { data, error } = await supabase
      .from('messages')
      .insert([
        {
          conversation_id: conversation.value.id,
          message: messageText,
          attach_image: null
        }
      ])
      .select('*')

    if (error) {
      console.error('Insert error details:', error)
      throw error
    }

    // Add the message to the local array immediately
    if (data && data[0]) {
      messages.value.push(data[0])
      await nextTick()
      scrollToBottom()
    }

  } catch (error) {
    console.error('Error sending message:', error)
    toast.error('Failed to send message')
    newMessage.value = messageText
  } finally {
    sendingMessage.value = false
  }
}

// Setup real-time message subscription
const setupMessageSubscription = () => {
  if (!conversation.value || messageSubscription) return

  messageSubscription = supabase
    .channel(`messages:${conversation.value.id}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversation.value.id}`
      },
      (payload) => {
        // Only add if it's not from current user (to avoid duplicates)
        if (payload.new.sender_id !== currentUser.value?.id) {
          messages.value.push(payload.new as Message)
          nextTick(() => scrollToBottom())
        }
      }
    )
    .subscribe()
}

// Handle contact button click
const handleContact = async () => {
  if (!currentUser.value) {
    toast.error('Please log in to contact the admin')
    return
  }

  showChatDialog.value = true
  await loadOrCreateConversation()
}

// Close chat dialog
const closeChatDialog = () => {
  showChatDialog.value = false
  conversation.value = null
  messages.value = []
  newMessage.value = ''
  
  if (messageSubscription) {
    messageSubscription.unsubscribe()
    messageSubscription = null
  }
}

// Scroll to bottom
const scrollToBottom = () => {
  const messagesContainer = document.querySelector('.messages-container')
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

// Check if message is from current user
const isMyMessage = (message: any) => {
  // Try different possible column names for the sender
  const senderId = message.sender_id || message.user_id || message.from_user
  return senderId === currentUser.value?.id
}

// Initialize
onMounted(async () => {
  await getCurrentUser()
})

// Cleanup
onUnmounted(() => {
  if (messageSubscription) {
    messageSubscription.unsubscribe()
  }
})
</script>

<template>
  <v-card class="item-card h-100" elevation="2">
    <v-card-title class="d-flex justify-space-between align-start">
      <div class="text-h6 font-weight-bold">{{ item.title }}</div>
      <v-chip
        :color="getItemStatusColor(item)"
        size="small"
        variant="flat"
      >
        {{ getItemStatusText(item) }}
      </v-chip>
    </v-card-title>

    <v-card-text>
      <p class="text-body-2 mb-3">{{ item.description }}</p>
      <div class="d-flex align-center text-caption text-grey-darken-1">
        <v-icon size="16" class="me-1">mdi-clock-outline</v-icon>
        {{ formatDate(item.created_at) }}
      </div>
    </v-card-text>

    <v-card-actions class="pt-0">
      <v-spacer />
      <v-btn
        v-if="!item.claimed_by"
        color="primary"
        variant="flat"
        size="small"
        prepend-icon="mdi-message-text"
        @click="handleContact"
        :loading="isUpdating"
      >
        Contact Admin
      </v-btn>
      <v-btn
        v-else
        color="warning"
        variant="outlined"
        size="small"
        prepend-icon="mdi-undo"
        @click="$emit('markAsUnclaimed', item.id)"
        :loading="isUpdating"
      >
        Mark as Unclaimed
      </v-btn>
    </v-card-actions>

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
            <div class="text-h6">{{ item.title }}</div>
            <div class="text-caption opacity-80">
              Chat with admin about this {{ item.status }} item
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
          <!-- Loading conversation -->
          <div v-if="loadingConversation" class="d-flex justify-center align-center pa-8">
            <v-progress-circular indeterminate color="primary" />
            <span class="ml-3">Starting conversation...</span>
          </div>

          <!-- Loading messages -->
          <div v-else-if="messagesLoading" class="d-flex justify-center align-center pa-8">
            <v-progress-circular indeterminate color="primary" />
            <span class="ml-3">Loading messages...</span>
          </div>

          <!-- Empty state -->
          <div v-else-if="messages.length === 0" class="text-center pa-8">
            <v-icon size="48" color="grey-lighten-1">mdi-message-outline</v-icon>
            <div class="text-body-1 text-grey-darken-1 mt-2">
              Start the conversation by sending a message
            </div>
            <div class="text-caption text-grey-darken-2">
              Describe the item or ask questions to verify ownership
            </div>
          </div>

          <!-- Messages -->
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
            :disabled="sendingMessage || loadingConversation"
          />
          <v-btn
            color="primary"
            icon="mdi-send"
            :loading="sendingMessage"
            :disabled="!newMessage.trim() || loadingConversation"
            @click="sendMessage"
            class="ml-2"
          />
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-card>
</template>

<style scoped>
.item-card {
  transition: transform 0.2s ease-in-out;
}

.item-card:hover {
  transform: translateY(-2px);
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