// pages/admin/components/composables/useAdminSupportInbox.ts
import { ref, onUnmounted, nextTick } from 'vue'
import { useToast } from 'vue-toastification'
import type { Conversation, Message } from '@/types/chat'
import {
  getAllAdminSupportConversations,
  setupAdminSupportConversationsSubscription
} from '@/stores/adminSupport'
import {
  loadMessages,
  sendMessage,
  setupMessageSubscription
} from '@/stores/messages'

export function useAdminSupportInbox(currentUser: any) {
  const toast = useToast()

  // State
  const showInbox = ref(false)
  const supportConversations = ref<Conversation[]>([])
  const selectedConversation = ref<Conversation | null>(null)
  const messages = ref<Message[]>([])
  const newMessage = ref('')
  const loadingConversations = ref(false)
  const loadingMessages = ref(false)
  const sendingMessage = ref(false)

  // Pagination state
  const currentPage = ref(1)
  const pageSize = ref(10)
  const totalCount = ref(0)
  const totalPages = ref(0)

  let messageSubscription: any = null
  let conversationsSubscription: any = null
  let currentConversationId: string | null = null

  // Helper to scroll messages to bottom
  const scrollToBottom = () => {
    nextTick(() => {
      const container = document.querySelector('.admin-support-messages-container')
      if (container) {
        container.scrollTop = container.scrollHeight
      }
    })
  }

  // Load all admin support conversations with pagination
  const loadSupportConversations = async (page: number = currentPage.value) => {
    loadingConversations.value = true
    try {
      const result = await getAllAdminSupportConversations(page, pageSize.value)
      supportConversations.value = result.conversations
      totalCount.value = result.totalCount
      totalPages.value = result.totalPages
      currentPage.value = result.currentPage
      console.log('Loaded support conversations:', result.conversations.length, 'Total:', result.totalCount)
    } catch (error) {
      console.error('Error loading support conversations:', error)
      toast.error('Failed to load support conversations')
      supportConversations.value = []
    } finally {
      loadingConversations.value = false
    }
  }

  // Select a conversation and load its messages
  const selectConversation = async (conversation: Conversation) => {
    console.log('Selecting support conversation:', conversation.id)

    // Cleanup previous subscription
    if (messageSubscription) {
      messageSubscription.unsubscribe()
      messageSubscription = null
    }

    // Clear and set new conversation
    messages.value = []
    selectedConversation.value = conversation
    currentConversationId = conversation.id

    // Load messages
    await loadConversationMessages(conversation.id)

    // Setup subscription
    setupMessageSubscriptionForConversation(conversation.id)
  }

  // Load messages for selected conversation
  const loadConversationMessages = async (conversationId: string) => {
    loadingMessages.value = true
    try {
      const loadedMessages = await loadMessages(conversationId)
      messages.value = loadedMessages
      scrollToBottom()
      console.log('Loaded messages:', loadedMessages.length)
    } catch (error) {
      console.error('Error loading messages:', error)
      toast.error('Failed to load messages')
      messages.value = []
    } finally {
      loadingMessages.value = false
    }
  }

  // Send message to student
  const sendMessageToStudent = async (messageText?: string) => {
    const textToSend = messageText || newMessage.value.trim()

    if (!textToSend || !selectedConversation.value || sendingMessage.value) return

    if (!currentUser.value) {
      toast.error('Authentication required')
      return
    }

    // Clear input
    if (!messageText) {
      newMessage.value = ''
    }

    sendingMessage.value = true

    try {
      const sentMessage = await sendMessage(
        selectedConversation.value.id,
        textToSend,
        currentUser.value.id
      )

      // Only add if it's for current conversation
      if (selectedConversation.value.id === currentConversationId) {
        messages.value.push(sentMessage)
        scrollToBottom()
      }

      console.log('Message sent successfully')
    } catch (error) {
      console.error('Error sending message:', error)
      toast.error('Failed to send message')
      // Restore message on error
      if (!messageText) {
        newMessage.value = textToSend
      }
    } finally {
      sendingMessage.value = false
    }
  }

  // Setup message subscription for a conversation
  const setupMessageSubscriptionForConversation = (conversationId: string) => {
    console.log('Setting up subscription for support conversation:', conversationId)

    messageSubscription = setupMessageSubscription(
      conversationId,
      (newMessage: Message) => {
        // Only add if it's for current conversation
        if (conversationId === currentConversationId) {
          // Prevent duplicates
          const exists = messages.value.some(msg => msg.id === newMessage.id)
          if (!exists) {
            messages.value.push(newMessage)
            scrollToBottom()
            console.log('Added real-time message')
          }
        }
      },
      currentUser.value.id
    )
  }

  // Setup subscription for new conversations
  const setupConversationsSubscription = () => {
    console.log('Setting up conversations subscription')

    conversationsSubscription = setupAdminSupportConversationsSubscription(
      (newConversation: Conversation) => {
        // Add new conversation to the list
        const exists = supportConversations.value.some(
          conv => conv.id === newConversation.id
        )
        if (!exists) {
          supportConversations.value.unshift(newConversation)
          toast.info('New support conversation started')
          console.log('New support conversation added')
        }
      }
    )
  }

  // Pagination functions
  const goToPage = async (page: number) => {
    if (page >= 1 && page <= totalPages.value) {
      await loadSupportConversations(page)
    }
  }

  const nextPage = async () => {
    if (currentPage.value < totalPages.value) {
      await goToPage(currentPage.value + 1)
    }
  }

  const previousPage = async () => {
    if (currentPage.value > 1) {
      await goToPage(currentPage.value - 1)
    }
  }

  const changePageSize = async (newPageSize: number) => {
    pageSize.value = newPageSize
    currentPage.value = 1 // Reset to first page
    await loadSupportConversations(1)
  }

  // Open inbox dialog
  const openInbox = async () => {
    showInbox.value = true
    await loadSupportConversations()
    setupConversationsSubscription()
  }

  // Close inbox dialog
  const closeInbox = () => {
    showInbox.value = false
    selectedConversation.value = null
    messages.value = []
    newMessage.value = ''

    // Cleanup subscriptions
    if (messageSubscription) {
      messageSubscription.unsubscribe()
      messageSubscription = null
    }
    if (conversationsSubscription) {
      conversationsSubscription.unsubscribe()
      conversationsSubscription = null
    }

    currentConversationId = null
    console.log('Inbox closed, subscriptions cleaned up')
  }

  // Cleanup on unmount
  onUnmounted(() => {
    if (messageSubscription) {
      messageSubscription.unsubscribe()
    }
    if (conversationsSubscription) {
      conversationsSubscription.unsubscribe()
    }
  })

  return {
    showInbox,
    supportConversations,
    selectedConversation,
    messages,
    newMessage,
    loadingConversations,
    loadingMessages,
    sendingMessage,
    // Pagination state
    currentPage,
    pageSize,
    totalCount,
    totalPages,
    // Functions
    openInbox,
    closeInbox,
    selectConversation,
    sendMessageToStudent,
    loadSupportConversations,
    // Pagination functions
    goToPage,
    nextPage,
    previousPage,
    changePageSize,
  }
}
