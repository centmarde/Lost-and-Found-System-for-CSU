//AdminItemCards.ts
import { ref } from 'vue'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

interface NewItemForm {
  title: string
  description: string
  status: 'lost' | 'found'
}

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
  user_id: string
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

export const useAdminItemActions = (refreshData: () => Promise<void>) => {
  const postingItem = ref(false)
  const showPostDialog = ref(false)
  const updatingItems = ref<Set<number>>(new Set())
  const showConversationsDialog = ref(false)
  const selectedItem = ref<Item | null>(null)
  const conversations = ref<Conversation[]>([])
  const selectedConversation = ref<Conversation | null>(null)
  const messages = ref<Message[]>([])
  const newMessage = ref('')
  const loadingConversations = ref(false)
  const loadingMessages = ref(false)
  const sendingMessage = ref(false)
  
  const newItemForm = ref<NewItemForm>({
    title: '',
    description: '',
    status: 'lost'
  })

  const postMissingItem = async () => {
    if (!newItemForm.value.title || !newItemForm.value.description) {
      return
    }

    postingItem.value = true

    try {
      const { data: { user } } = await supabase.auth.getUser()

      const insertData = {
        title: newItemForm.value.title,
        description: newItemForm.value.description,
        status: newItemForm.value.status,
        user_id: user?.id || null,
        claimed_by: null
      }

      const { data, error } = await supabase
        .from('items')
        .insert([insertData])
        .select()

      if (error) {
        throw error
      }

      newItemForm.value = {
        title: '',
        description: '',
        status: 'lost'
      }
      showPostDialog.value = false

      await refreshData()

      console.log('Item posted successfully:', data)

    } catch (error) {
      console.error('Error posting item:', error)
      let errorMessage = 'An unknown error occurred'

      if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = String(error.message)
      } else if (typeof error === 'string') {
        errorMessage = error
      }

      alert(`Error posting item: ${errorMessage}`)
    } finally {
      postingItem.value = false
    }
  }

  // Open conversations dialog for an item
  const openConversations = async (item: Item) => {
    selectedItem.value = item
    showConversationsDialog.value = true
    await loadConversationsForItem(item.id)
  }

  // Load conversations for a specific item
  const loadConversationsForItem = async (itemId: number) => {
    loadingConversations.value = true
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          *,
          items:item_id (
            id,
            title,
            description,
            status
          ),
          sender:sender_id (
            id,
            email
          )
        `)
        .eq('item_id', itemId)
        .order('created_at', { ascending: false })

      if (error) throw error

      conversations.value = data || []
    } catch (error) {
      console.error('Error loading conversations:', error)
      conversations.value = []
    } finally {
      loadingConversations.value = false
    }
  }

  // Select a conversation to view messages
  const selectConversation = async (conversation: Conversation) => {
    selectedConversation.value = conversation
    await loadMessages(conversation.id)
  }

  // Load messages for a conversation
  const loadMessages = async (conversationId: string) => {
    loadingMessages.value = true
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })

      if (error) throw error

      messages.value = data || []
    } catch (error) {
      console.error('Error loading messages:', error)
      messages.value = []
    } finally {
      loadingMessages.value = false
    }
  }

  // Send message as admin
  const sendAdminMessage = async () => {
    if (!newMessage.value.trim() || !selectedConversation.value || sendingMessage.value) return

    const messageText = newMessage.value.trim()
    newMessage.value = ''
    sendingMessage.value = true

    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        throw new Error('User not authenticated')
      }

      const { data, error } = await supabase
        .from('messages')
        .insert([
          {
            conversation_id: selectedConversation.value.id,
            message: messageText,
            sender_id: user.id
          }
        ])
        .select()

      if (error) throw error

      // Message will be added via real-time subscription
    } catch (error) {
      console.error('Error sending admin message:', error)
      newMessage.value = messageText // Restore message on error
      throw error
    } finally {
      sendingMessage.value = false
    }
  }

  // Subscribe to real-time message updates for admin
  const subscribeToConversationMessages = (conversationId: string, callback: (message: Message) => void) => {
    return supabase
      .channel(`admin-messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          callback(payload.new as Message)
        }
      )
      .subscribe()
  }

  // Close conversations dialog
  const closeConversationsDialog = () => {
    showConversationsDialog.value = false
    selectedItem.value = null
    selectedConversation.value = null
    conversations.value = []
    messages.value = []
    newMessage.value = ''
  }

  // Admin function to mark item as claimed
  const markAsClaimed = async (itemId: number) => {
    updatingItems.value.add(itemId)

    try {
      const { data: { user } } = await supabase.auth.getUser()

      const { error } = await supabase
        .from('items')
        .update({ 
          claimed_by: user?.id || null
        })
        .eq('id', itemId)

      if (error) throw error

      await refreshData()
    } catch (error) {
      console.error('Error marking item as claimed:', error)
      alert('Error updating item status')
    } finally {
      updatingItems.value.delete(itemId)
    }
  }

  // Admin function to mark item as unclaimed  
  const markAsUnclaimed = async (itemId: number) => {
    updatingItems.value.add(itemId)

    try {
      const { error } = await supabase
        .from('items')
        .update({ 
          claimed_by: null
        })
        .eq('id', itemId)

      if (error) throw error

      await refreshData()
    } catch (error) {
      console.error('Error marking item as unclaimed:', error)
      alert('Error updating item status')
    } finally {
      updatingItems.value.delete(itemId)
    }
  }

  // Get all conversations for admin review (legacy function)
  const getAdminConversations = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        throw new Error('User not authenticated')
      }

      // Get conversations where admin is the receiver (items posted by admin)
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          *,
          items:item_id (
            id,
            title,
            description,
            status
          ),
          sender:sender_id (
            id,
            email
          )
        `)
        .eq('receiver_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      return data
    } catch (error) {
      console.error('Error fetching admin conversations:', error)
      throw error
    }
  }

  // Get messages for a specific conversation (legacy function)
  const getConversationMessages = async (conversationId: string) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })

      if (error) throw error

      return data
    } catch (error) {
      console.error('Error fetching conversation messages:', error)
      throw error
    }
  }

  return {
    postingItem,
    showPostDialog,
    updatingItems,
    showConversationsDialog,
    selectedItem,
    conversations,
    selectedConversation,
    messages,
    newMessage,
    loadingConversations,
    loadingMessages,
    sendingMessage,
    newItemForm,
    postMissingItem,
    openConversations,
    selectConversation,
    loadMessages,
    sendAdminMessage,
    subscribeToConversationMessages,
    closeConversationsDialog,
    markAsClaimed,
    markAsUnclaimed,
    getAdminConversations,
    getConversationMessages
  }
}