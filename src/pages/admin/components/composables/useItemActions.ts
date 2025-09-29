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

// Corrected Message interface to use 'user_id' instead of 'sender_id'
export interface Message {
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
}

export const useItemActions = (refreshData?: () => Promise<void>) => {
  const postingItem = ref(false)
  const showPostDialog = ref(false)
  const updatingItems = ref<Set<number>>(new Set())
  const startingConversation = ref<Set<number>>(new Set())
  
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

      if (refreshData) await refreshData()

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

  // Contact function - initiates conversation with admin who posted the item
  const contactAdmin = async (itemId: number, adminId: string) => {
    startingConversation.value.add(itemId)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        throw new Error('User not authenticated')
      }

      // Check if conversation already exists
      const { data: existingConversation, error: checkError } = await supabase
        .from('conversations')
        .select('*')
        .eq('item_id', itemId)
        .eq('sender_id', user.id)
        .eq('receiver_id', adminId)
        .single()

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError
      }

      if (existingConversation) {
        return { conversation: existingConversation, isNew: false }
      } else {
        // Create new conversation
        const { data: newConversation, error: createError } = await supabase
          .from('conversations')
          .insert([
            {
              item_id: itemId,
              sender_id: user.id,
              receiver_id: adminId
            }
          ])
          .select()
          .single()

        if (createError) {
          throw createError
        }

        return { conversation: newConversation, isNew: true }
      }

    } catch (error) {
      console.error('Error contacting admin:', error)
      throw error
    } finally {
      startingConversation.value.delete(itemId)
    }
  }

  // Load or create conversation between user and admin
  const loadOrCreateConversation = async (itemId: number, adminId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        throw new Error('User not authenticated')
      }

      // Check if conversation already exists
      const { data: existingConversation, error: checkError } = await supabase
        .from('conversations')
        .select('*')
        .eq('item_id', itemId)
        .eq('sender_id', user.id)
        .eq('receiver_id', adminId)
        .single()

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError
      }

      if (existingConversation) {
        return { conversation: existingConversation, isNew: false }
      } else {
        // Create new conversation
        const { data: newConversation, error: createError } = await supabase
          .from('conversations')
          .insert([
            {
              item_id: itemId,
              sender_id: user.id,
              receiver_id: adminId
            }
          ])
          .select()
          .single()

        if (createError) {
          throw createError
        }

        return { conversation: newConversation, isNew: true }
      }

    } catch (error) {
      console.error('Error loading/creating conversation:', error)
      throw error
    }
  }

  // Load messages for a conversation
  const loadMessages = async (conversationId: string) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })

      if (error) throw error

      // Return data with correct type
      return data as Message[]
    } catch (error) {
      console.error('Error loading messages:', error)
      throw error
    }
  }

  // Send message in conversation
  const sendMessage = async (conversationId: string, message: string, attachImage?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        throw new Error('User not authenticated')
      }

      const { data, error } = await supabase
        .from('messages')
        .insert([
          {
            conversation_id: conversationId,
            message: message,
            attach_image: attachImage || null,
            // Changed from sender_id to user_id to match the corrected interface and table
            user_id: user.id
          }
        ])
        .select()

      if (error) throw error

      return data[0] as Message
    } catch (error) {
      console.error('Error sending message:', error)
      throw error
    }
  }

  // Get conversations for current user
  const getUserConversations = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        throw new Error('User not authenticated')
      }

      const { data, error } = await supabase
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
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false })

      if (error) throw error

      return data
    } catch (error) {
      console.error('Error fetching conversations:', error)
      throw error
    }
  }

  // Subscribe to real-time message updates
  const subscribeToMessages = (conversationId: string, callback: (message: Message) => void) => {
    return supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          // Changed the type assertion to match the corrected interface
          callback(payload.new as Message)
        }
      )
      .subscribe()
  }

  // Legacy functions for backward compatibility
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

      if (refreshData) await refreshData()
    } catch (error) {
      console.error('Error marking item as claimed:', error)
      alert('Error updating item status')
    } finally {
      updatingItems.value.delete(itemId)
    }
  }

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

      if (refreshData) await refreshData()
    } catch (error) {
      console.error('Error marking item as unclaimed:', error)
      alert('Error updating item status')
    } finally {
      updatingItems.value.delete(itemId)
    }
  }

  return {
    postingItem,
    showPostDialog,
    updatingItems,
    startingConversation,
    newItemForm,
    postMissingItem,
    contactAdmin,
    loadOrCreateConversation,
    loadMessages,
    sendMessage,
    getUserConversations,
    subscribeToMessages,
    markAsClaimed,
    markAsUnclaimed
  }
}