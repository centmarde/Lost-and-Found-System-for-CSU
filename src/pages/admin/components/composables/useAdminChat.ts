// useAdminChat.ts

import { ref, onUnmounted, nextTick, type Ref } from 'vue'
import { useToast } from 'vue-toastification'
// Removed direct Supabase import as it's now in stores
// Removed useAuthUserStore import as it's now used in stores/conversations.ts

import { loadConversationsForItem } from '@/stores/conversation'
import { loadMessages, sendMessage, setupMessageSubscription } from '@/stores/messages'

import type { Item, Conversation, Message, SendMessagePayload } from '@/types/chat'


export function useAdminChat(currentUser: Ref<any>) {
  const toast = useToast()

  // --- State Variables ---
  const showAdminConversationsDialog = ref(false)
  const selectedItemForConversations = ref<Item | null>(null)
  const adminConversations = ref<Conversation[]>([])
  const selectedAdminConversation = ref<Conversation | null>(null)
  const adminMessages = ref<Message[]>([])
  const newAdminMessage = ref('')
  
  const loadingAdminConversations = ref(false)
  const loadingAdminMessages = ref(false)
  const sendingAdminMessage = ref(false)
  
  let adminMessageSubscription: any = null
  let currentConversationId: string | null = null

  // --- Helper Functions ---

  const scrollAdminMessagesToBottom = () => {
    nextTick(() => {
      const messagesContainer = document.querySelector('.admin-messages-container')
      if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight
      }
    })
  }
  
  const cleanupSubscription = () => {
    if (adminMessageSubscription) {
      console.log('Cleaning up chat subscription.')
      adminMessageSubscription.unsubscribe()
      adminMessageSubscription = null
    }
  }

  // --- Core Logic Functions (Simplified) ---
  
  /**
   * Loads conversations for a specific item using the stores/conversations logic.
   */
  const loadAdminConversationsForItem = async (itemId: number) => {
    loadingAdminConversations.value = true
    try {
      console.log('Loading conversations for item ID:', itemId)
      // 🟢 CALLS THE EXTERNAL STORE FUNCTION
      adminConversations.value = await loadConversationsForItem(itemId)
      
      console.log('Found conversations:', adminConversations.value.length)
      
    } catch (error) {
      console.error('Error loading admin conversations:', error)
      toast.error('Failed to load conversations')
      adminConversations.value = []
    } finally {
      loadingAdminConversations.value = false
    }
  }

  /**
   * Loads messages for a specific conversation using the stores/messages logic.
   */
  const loadAdminMessages = async (conversationId: string) => {
    loadingAdminMessages.value = true
    
    try {
      console.log('Loading messages for conversation:', conversationId)
      // 🟢 CALLS THE EXTERNAL STORE FUNCTION
      adminMessages.value = await loadMessages(conversationId)
      
      scrollAdminMessagesToBottom()
    } catch (error) {
      console.error('Error loading admin messages:', error)
      toast.error('Failed to load messages')
      adminMessages.value = []
    } finally {
      loadingAdminMessages.value = false
    }
  }

  /**
   * Sends a new message using the stores/messages logic.
   */
  const sendAdminMessage = async (payload?: SendMessagePayload) => {
    let messageData: SendMessagePayload
    
    if (payload) {
      messageData = payload
    } else {
      if (!newAdminMessage.value.trim() || !selectedAdminConversation.value) return
      messageData = {
        conversationId: selectedAdminConversation.value.id,
        message: newAdminMessage.value.trim(),
        userId: currentUser.value.id
      }
      newAdminMessage.value = ''
    }

    if (sendingAdminMessage.value) return
    sendingAdminMessage.value = true

    try {
      console.log('Sending message to conversation:', messageData.conversationId)
      
      // 🟢 CALLS THE EXTERNAL STORE FUNCTION
      const newMessage = await sendMessage(messageData)
      
      // Manually add to UI state for immediate feedback
      if (messageData.conversationId === currentConversationId) {
        adminMessages.value.push(newMessage)
        scrollAdminMessagesToBottom()
      }
      
    } catch (error) {
      console.error('Error sending admin message:', error)
      toast.error('Failed to send message')
    } finally {
      sendingAdminMessage.value = false
    }
  }

  /**
   * Sets up subscription using the stores/messages logic and handles real-time updates.
   */
  const setupAdminMessageSubscription = (conversationId: string) => {
    cleanupSubscription() 
    
    console.log('Setting up subscription for conversation:', conversationId)
    
    // 🟢 CALLS THE EXTERNAL STORE FUNCTION, passing a local callback
    adminMessageSubscription = setupMessageSubscription(
      conversationId,
      (newMessage: Message) => {
        console.log('Received real-time message for conversation:', conversationId)
        
        if (conversationId === currentConversationId) {
          const messageExists = adminMessages.value.some(msg => msg.id === newMessage.id)
          if (!messageExists) {
            adminMessages.value.push(newMessage)
            scrollAdminMessagesToBottom()
            console.log('Added real-time message to current conversation')
          }
        }
      }
    )
  }

  // --- Actions Called by the Component (Main Entry Points) ---

  const handleOpenConversations = async (item: Item) => {
    console.log('Opening conversations for item:', item.id, item.title)
    
    closeAdminConversationsDialog() // Cleans up current state/subscription
    
    selectedItemForConversations.value = item
    showAdminConversationsDialog.value = true
    await loadAdminConversationsForItem(item.id)
  }

  const selectAdminConversation = async (conversation: Conversation) => {
    console.log('Selecting conversation:', conversation.id)
    
    cleanupSubscription()
    
    adminMessages.value = []
    selectedAdminConversation.value = conversation
    currentConversationId = conversation.id
    
    await loadAdminMessages(conversation.id)
    setupAdminMessageSubscription(conversation.id)
  }

  const closeAdminConversationsDialog = () => {
    console.log('Closing admin conversations dialog')
    
    showAdminConversationsDialog.value = false
    selectedItemForConversations.value = null
    selectedAdminConversation.value = null
    adminConversations.value = []
    adminMessages.value = []
    newAdminMessage.value = ''
    currentConversationId = null
    
    cleanupSubscription()
  }

  onUnmounted(() => {
    console.log('useAdminChat unmounting, cleaning up subscriptions')
    cleanupSubscription()
  })

  return {
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
  }
}