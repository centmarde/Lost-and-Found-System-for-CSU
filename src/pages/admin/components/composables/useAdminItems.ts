import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import { 
  createItem, 
  markItemAsClaimed, 
  markItemAsUnclaimed,
  updatingItems,
  type NewItemForm,
  type Item
} from '@/stores/items'
import { loadConversationsForItem } from '@/stores/conversation'
import { 
  loadMessages, 
  sendMessage, 
  setupMessageSubscription 
} from '@/stores/messages'
import type { Message, Conversation } from '@/types/chat'

export const useAdminItemActions = (refreshData: () => Promise<void>) => {
  // Item posting state
  const postingItem = ref(false)
  const showPostDialog = ref(false)
  const newItemForm = ref<NewItemForm>({
    title: '',
    description: '',
    status: 'lost'
  })

  // Conversations state
  const showConversationsDialog = ref(false)
  const selectedItem = ref<Item | null>(null)
  const conversations = ref<Conversation[]>([])
  const selectedConversation = ref<Conversation | null>(null)
  const messages = ref<Message[]>([])
  const newMessage = ref('')
  const loadingConversations = ref(false)
  const loadingMessages = ref(false)
  const sendingMessage = ref(false)

  let messageSubscription: any = null

  // Post a new missing/found item using store function
  const postMissingItem = async () => {
    if (!newItemForm.value.title || !newItemForm.value.description) {
      return
    }

    postingItem.value = true

    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        throw new Error('User not authenticated')
      }

      await createItem(newItemForm.value, user.id)

      // Reset form
      newItemForm.value = {
        title: '',
        description: '',
        status: 'lost'
      }
      showPostDialog.value = false

      await refreshData()

    } catch (error) {
      console.error('Error posting item:', error)
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred'
      alert(`Error posting item: ${errorMessage}`)
    } finally {
      postingItem.value = false
    }
  }

  // Open conversations dialog for an item using store function
  const openConversations = async (item: Item) => {
    selectedItem.value = item
    showConversationsDialog.value = true
    await loadConversationsForSelectedItem(item.id)
  }

  // Load conversations for a specific item using store function
  const loadConversationsForSelectedItem = async (itemId: number) => {
    loadingConversations.value = true
    try {
      const loadedConversations = await loadConversationsForItem(itemId)
      conversations.value = loadedConversations
    } catch (error) {
      console.error('Error loading conversations:', error)
      conversations.value = []
    } finally {
      loadingConversations.value = false
    }
  }

  // Select a conversation to view messages using store function
  const selectConversation = async (conversation: Conversation) => {
    // Clean up previous subscription
    if (messageSubscription) {
      messageSubscription.unsubscribe()
      messageSubscription = null
    }

    selectedConversation.value = conversation
    messages.value = []
    await loadMessagesForConversation(conversation.id)
    await setupMessageSubscriptionForConversation(conversation.id)
  }

  // Load messages for a conversation using store function
  const loadMessagesForConversation = async (conversationId: string) => {
    loadingMessages.value = true
    try {
      const loadedMessages = await loadMessages(conversationId)
      messages.value = loadedMessages
    } catch (error) {
      console.error('Error loading messages:', error)
      messages.value = []
    } finally {
      loadingMessages.value = false
    }
  }

  // Send message as admin using store function
  const sendAdminMessage = async () => {
    if (!newMessage.value.trim() || !selectedConversation.value || sendingMessage.value) {
      return
    }

    const messageText = newMessage.value.trim()
    newMessage.value = ''
    sendingMessage.value = true

    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        throw new Error('User not authenticated')
      }

      const sentMessage = await sendMessage(
        selectedConversation.value.id,
        messageText,
        user.id
      )

      // Add message to local array immediately
      messages.value.push(sentMessage)

    } catch (error) {
      console.error('Error sending admin message:', error)
      newMessage.value = messageText // Restore message on error
      throw error
    } finally {
      sendingMessage.value = false
    }
  }

  // Setup real-time subscription for messages using store function
  const setupMessageSubscriptionForConversation = async (conversationId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) return

      messageSubscription = setupMessageSubscription(
        conversationId,
        (newMsg: Message) => {
          // Check for duplicates before adding
          const messageExists = messages.value.some(msg => msg.id === newMsg.id)
          if (!messageExists) {
            messages.value.push(newMsg)
          }
        },
        user.id
      )
    } catch (error) {
      console.error('Error setting up message subscription:', error)
    }
  }

  // Close conversations dialog
  const closeConversationsDialog = () => {
    showConversationsDialog.value = false
    selectedItem.value = null
    selectedConversation.value = null
    conversations.value = []
    messages.value = []
    newMessage.value = ''

    if (messageSubscription) {
      messageSubscription.unsubscribe()
      messageSubscription = null
    }
  }

  // Mark item as claimed using store function
  const markAsClaimed = async (itemId: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        throw new Error('User not authenticated')
      }

      await markItemAsClaimed(itemId, user.id)
      await refreshData()
    } catch (error) {
      console.error('Error marking item as claimed:', error)
      alert('Error updating item status')
    }
  }

  // Mark item as unclaimed using store function
  const markAsUnclaimed = async (itemId: number) => {
    try {
      await markItemAsUnclaimed(itemId)
      await refreshData()
    } catch (error) {
      console.error('Error marking item as unclaimed:', error)
      alert('Error updating item status')
    }
  }

  return {
    // Item posting
    postingItem,
    showPostDialog,
    newItemForm,
    postMissingItem,
    
    // Item status
    updatingItems,
    markAsClaimed,
    markAsUnclaimed,
    
    // Conversations
    showConversationsDialog,
    selectedItem,
    conversations,
    selectedConversation,
    messages,
    newMessage,
    loadingConversations,
    loadingMessages,
    sendingMessage,
    openConversations,
    selectConversation,
    sendAdminMessage,
    closeConversationsDialog,
  }
}