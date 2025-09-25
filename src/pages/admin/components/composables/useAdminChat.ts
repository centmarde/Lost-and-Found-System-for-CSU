// src/composables/useAdminChat.ts
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
    selectedItemForConversations.value = item
    showAdminConversationsDialog.value = true
    await loadAdminConversationsForItem(item.id)
  }

  // Loads conversations for a specific item
  const loadAdminConversationsForItem = async (itemId: number) => {
    loadingAdminConversations.value = true
    try {
      const { data: conversations, error: conversationError } = await supabase
        .from('conversations')
        .select('*')
        .eq('item_id', itemId)
        .order('created_at', { ascending: false })

      if (conversationError) throw conversationError

      const { users: allUsers, error: usersError } = await authStore.getAllUsers()
      if (usersError) console.warn('Could not load user details:', usersError)

      adminConversations.value = conversations?.map(conv => ({
        ...conv,
        sender: allUsers?.find(user => user.id === conv.sender_id) || { id: conv.sender_id, email: 'Unknown User' },
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
    selectedAdminConversation.value = conversation
    await loadAdminMessages(conversation.id)
    setupAdminMessageSubscription(conversation.id)
  }

  // Loads messages for a specific conversation
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
  const sendAdminMessage = async () => {
    if (!newAdminMessage.value.trim() || !selectedAdminConversation.value || sendingAdminMessage.value) return
    const messageText = newAdminMessage.value.trim()
    newAdminMessage.value = ''
    sendingAdminMessage.value = true

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: selectedAdminConversation.value.id,
          message: messageText,
          user_id: currentUser.value.id,
        })
        .select()
        .single()

      if (error) throw error
      adminMessages.value.push(data)
      scrollAdminMessagesToBottom()
    } catch (error) {
      console.error('Error sending admin message:', error)
      toast.error('Failed to send message')
      newAdminMessage.value = messageText
    } finally {
      sendingAdminMessage.value = false
    }
  }

  // Subscribes to new messages in real-time for admin chat
  const setupAdminMessageSubscription = (conversationId: string) => {
    if (adminMessageSubscription) adminMessageSubscription.unsubscribe()

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
          adminMessages.value.push(payload.new as Message)
          scrollAdminMessagesToBottom()
        }
      )
      .subscribe()
  }

  // Closes the admin conversations dialog and cleans up
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

  onUnmounted(() => {
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