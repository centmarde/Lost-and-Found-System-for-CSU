//useUserChat.ts
import { ref, onUnmounted, nextTick } from 'vue'
import { useToast } from 'vue-toastification'
import { supabase } from '@/lib/supabase'

interface Item {
  id: number
  title: string
  status: 'lost' | 'found'
  user_id: string
}

interface Conversation {
  id: string
  item_id: number
  sender_id: string
  receiver_id: string
  created_at: string
}

interface Message {
  id: string
  conversation_id: string
  message: string
  user_id: string
  created_at: string
}

export function useUserChat(currentUser: any) {
  const toast = useToast()

  const showChatDialog = ref(false)
  const selectedItem = ref<Item | null>(null)
  const currentConversation = ref<Conversation | null>(null)
  const messages = ref<Message[]>([])
  const newMessage = ref('')
  const messagesLoading = ref(false)
  const sendingMessage = ref(false)
  let messageSubscription: any = null

  // Helper to scroll messages to the bottom
  const scrollToBottom = () => {
    nextTick(() => {
      const messagesContainer = document.querySelector('.messages-container')
      if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight
      }
    })
  }

  // Load existing conversation if it exists
  const loadExistingConversation = async (item: Item) => {
    messagesLoading.value = true

    try {
      // Check for existing conversation
      const { data: existingConv } = await supabase
        .from('conversations')
        .select('*')
        .eq('item_id', item.id)
        .eq('sender_id', currentUser.value.id)
        .single()

      if (existingConv) {
        currentConversation.value = existingConv
        await loadMessages()
        setupMessageSubscription()
      }
    } catch (error) {
      console.error('Error loading existing conversation:', error)
    } finally {
      messagesLoading.value = false
    }
  }

  // Creates a new conversation
  const createConversation = async (item: Item) => {
    const { data: newConv, error } = await supabase
      .from('conversations')
      .insert({
        item_id: item.id,
        sender_id: currentUser.value.id,
        receiver_id: item.user_id,
      })
      .select()
      .single()

    if (error) throw error
    
    currentConversation.value = newConv
    setupMessageSubscription()
    toast.success('Conversation started!')
    
    return newConv
  }

  // Opens chat dialog and loads existing conversation if available
  const handleContact = async (item: Item) => {
    if (!currentUser.value) {
      toast.error('Please log in to contact the admin')
      return
    }

    selectedItem.value = item
    showChatDialog.value = true

    // Load existing conversation if it exists, but don't create a new one
    await loadExistingConversation(item)
  }

  // Loads messages for the current conversation
  const loadMessages = async () => {
    if (!currentConversation.value) return
    
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', currentConversation.value.id)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error loading messages:', error)
      toast.error('Failed to load messages')
      return
    }
    messages.value = data || []
    scrollToBottom()
  }

  // Sends a new message
  const sendMessage = async () => {
    if (!newMessage.value.trim() || sendingMessage.value) return
    
    if (!currentUser.value) {
      toast.error('Please log in to send messages')
      return
    }

    if (!selectedItem.value) {
      toast.error('No item selected')
      return
    }

    const messageText = newMessage.value.trim()
    newMessage.value = ''
    sendingMessage.value = true

    try {
      let conversation = currentConversation.value

      // Create conversation if it doesn't exist
      if (!conversation) {
        conversation = await createConversation(selectedItem.value)
        currentConversation.value = conversation
      }

      // Ensure we have a conversation before proceeding
      if (!conversation) {
        throw new Error('Failed to create or get conversation')
      }

      // Send the message
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversation.id,
          message: messageText,
          user_id: currentUser.value.id,
        })
        .select()
        .single()

      if (error) throw error
      
      messages.value.push(data)
      scrollToBottom()
    } catch (error) {
      console.error('Error sending message:', error)
      toast.error('Failed to send message')
      newMessage.value = messageText
    } finally {
      sendingMessage.value = false
    }
  }

  // Subscribes to new messages in real-time
  const setupMessageSubscription = () => {
    if (messageSubscription) messageSubscription.unsubscribe()
    if (!currentConversation.value) return

    messageSubscription = supabase
      .channel(`message_${currentConversation.value.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${currentConversation.value.id}`,
        },
        (payload: any) => {
          // Only add if it's not from current user (to avoid duplicates)
          if (payload.new.user_id !== currentUser.value?.id) {
            messages.value.push(payload.new as Message)
            scrollToBottom()
          }
        }
      )
      .subscribe()
  }

  // Closes the chat dialog and cleans up
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

  onUnmounted(() => {
    if (messageSubscription) {
      messageSubscription.unsubscribe()
    }
  })

  return {
    showChatDialog,
    selectedItem,
    messages,
    newMessage,
    messagesLoading,
    sendingMessage,
    handleContact,
    sendMessage,
    closeChatDialog,
  }
}