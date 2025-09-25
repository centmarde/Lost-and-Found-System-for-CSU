//useAdminItemActions.ts
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

export const useAdminItemActions = (refreshData: () => Promise<void>) => {
  const postingItem = ref(false)
  const showPostDialog = ref(false)
  const updatingItems = ref<Set<number>>(new Set())
  const showConversationsDialog = ref(false)
  const selectedItem = ref<Item | null>(null)
  
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
  const openConversations = (item: Item) => {
    selectedItem.value = item
    showConversationsDialog.value = true
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

  // Get all conversations for admin review
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

  // Get messages for a specific conversation
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

  // Send message as admin
  const sendAdminMessage = async (conversationId: string, message: string, attachImage?: string) => {
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
            attach_image: attachImage || null
          }
        ])
        .select()

      if (error) throw error

      return data[0]
    } catch (error) {
      console.error('Error sending admin message:', error)
      throw error
    }
  }

  return {
    postingItem,
    showPostDialog,
    updatingItems,
    showConversationsDialog,
    selectedItem,
    newItemForm,
    postMissingItem,
    openConversations,
    markAsClaimed,
    markAsUnclaimed,
    getAdminConversations,
    getConversationMessages,
    sendAdminMessage
  }
}