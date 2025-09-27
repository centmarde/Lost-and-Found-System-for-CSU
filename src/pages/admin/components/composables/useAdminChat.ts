import { ref, onUnmounted, nextTick } from 'vue'
import { useToast } from 'vue-toastification'
import { supabase } from '@/lib/supabase'
import { useAuthUserStore } from '@/stores/authUser'

interface Item {
  id: number
  title: string
}

interface Conversation {
  id: string
  item_id: number
  sender_id: string
  receiver_id: string
  created_at: string
  sender?: {
    id: string
    email: string
  }
}

interface Message {
  id: string
  conversation_id: string
  message: string
  user_id: string
  created_at: string
}

interface SendMessagePayload {
  conversationId: string
  message: string
  userId: string
}

export function useAdminChat(currentUser: any) {
  const toast = useToast()
  const authStore = useAuthUserStore()

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

  // Helper to scroll messages to the bottom
  const scrollAdminMessagesToBottom = () => {
    nextTick(() => {
      const messagesContainer = document.querySelector('.admin-messages-container')
      if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight
      }
    })
  }

  // Opens the admin conversations dialog and loads conversations for a specific item
  const handleOpenConversations = async (item: Item) => {
    console.log('Opening conversations for item:', item.id, item.title)
    
    // Clean up previous state
    selectedAdminConversation.value = null
    adminMessages.value = []
    if (adminMessageSubscription) {
      adminMessageSubscription.unsubscribe()
      adminMessageSubscription = null
    }
    currentConversationId = null
    
    selectedItemForConversations.value = item
    showAdminConversationsDialog.value = true
    await loadAdminConversationsForItem(item.id)
  }

  // Loads conversations for a specific item
  const loadAdminConversationsForItem = async (itemId: number) => {
    loadingAdminConversations.value = true
    try {
      console.log('Loading conversations for item ID:', itemId)
      
      const { data: conversations, error: conversationError } = await supabase
        .from('conversations')
        .select('*')
        .eq('item_id', itemId)
        .order('created_at', { ascending: false })

      if (conversationError) throw conversationError

      console.log('Found conversations:', conversations?.length || 0)

      const { users: allUsers, error: usersError } = await authStore.getAllUsers()
      if (usersError) console.warn('Could not load user details:', usersError)

      adminConversations.value = conversations?.map(conv => ({
        ...conv,
        sender: allUsers?.find(user => user.id === conv.sender_id) || { 
          id: conv.sender_id, 
          email: 'Unknown User' 
        },
      })) || []
      
    } catch (error) {
      console.error('Error loading admin conversations:', error)
      toast.error('Failed to load conversations')
      adminConversations.value = []
    } finally {
      loadingAdminConversations.value = false
    }
  }

  // Selects a conversation and loads its messages
  const selectAdminConversation = async (conversation: Conversation) => {
    console.log('Selecting conversation:', conversation.id)
    
    // Clean up previous subscription
    if (adminMessageSubscription) {
      console.log('Unsubscribing from previous conversation:', currentConversationId)
      adminMessageSubscription.unsubscribe()
      adminMessageSubscription = null
    }
    
    // Clear previous messages immediately
    adminMessages.value = []
    selectedAdminConversation.value = conversation
    currentConversationId = conversation.id
    
    // Load messages for the new conversation
    await loadAdminMessages(conversation.id)
    
    // Setup subscription for the new conversation
    setupAdminMessageSubscription(conversation.id)
  }

  // Loads messages for a specific conversation
  const loadAdminMessages = async (conversationId: string) => {
    console.log('Loading messages for conversation:', conversationId)
    loadingAdminMessages.value = true
    
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })

      if (error) throw error
      
      console.log('Loaded messages:', data?.length || 0)
      adminMessages.value = data || []
      scrollAdminMessagesToBottom()
    } catch (error) {
      console.error('Error loading admin messages:', error)
      toast.error('Failed to load messages')
      adminMessages.value = []
    } finally {
      loadingAdminMessages.value = false
    }
  }

  // Sends a new message from the admin
  const sendAdminMessage = async (payload?: SendMessagePayload) => {
    let messageData: SendMessagePayload
    
    if (payload) {
      // Message sent from dialog component
      messageData = payload
    } else {
      // Message sent from composable (fallback)
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
      
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: messageData.conversationId,
          message: messageData.message,
          user_id: messageData.userId,
        })
        .select()
        .single()

      if (error) throw error
      
      // Only add the message if it belongs to the current conversation
      if (messageData.conversationId === currentConversationId) {
        adminMessages.value.push(data)
        scrollAdminMessagesToBottom()
        console.log('Message added to current conversation')
      } else {
        console.log('Message sent to different conversation, not adding to current view')
      }
      
    } catch (error) {
      console.error('Error sending admin message:', error)
      toast.error('Failed to send message')
    } finally {
      sendingAdminMessage.value = false
    }
  }

  // Subscribes to new messages in real-time for admin chat
  const setupAdminMessageSubscription = (conversationId: string) => {
    console.log('Setting up subscription for conversation:', conversationId)
    
    adminMessageSubscription = supabase
      .channel(`admin_message_${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload: any) => {
          console.log('Received real-time message for conversation:', conversationId)
          
          // Only add the message if it's for the currently selected conversation
          if (conversationId === currentConversationId) {
            const newMessage = payload.new as Message
            
            // Check if the message is not already in the array (prevent duplicates)
            const messageExists = adminMessages.value.some(msg => msg.id === newMessage.id)
            if (!messageExists) {
              adminMessages.value.push(newMessage)
              scrollAdminMessagesToBottom()
              console.log('Added real-time message to current conversation')
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('Subscription status for conversation', conversationId, ':', status)
      })
  }

  // Closes the admin conversations dialog and cleans up
  const closeAdminConversationsDialog = () => {
    console.log('Closing admin conversations dialog')
    
    showAdminConversationsDialog.value = false
    selectedItemForConversations.value = null
    selectedAdminConversation.value = null
    adminConversations.value = []
    adminMessages.value = []
    newAdminMessage.value = ''
    currentConversationId = null
    
    if (adminMessageSubscription) {
      console.log('Cleaning up subscription on dialog close')
      adminMessageSubscription.unsubscribe()
      adminMessageSubscription = null
    }
  }

  onUnmounted(() => {
    console.log('useAdminChat unmounting, cleaning up subscriptions')
    if (adminMessageSubscription) {
      adminMessageSubscription.unsubscribe()
    }
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