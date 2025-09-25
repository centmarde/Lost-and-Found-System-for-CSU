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

export const useItemActions = (refreshData: () => Promise<void>) => {
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

  // New function to open conversations dialog
  const openConversations = (item: Item) => {
    selectedItem.value = item
    showConversationsDialog.value = true
  }

  // Legacy function - kept for backward compatibility but modified
  const markAsClaimed = async (itemId: number) => {
    // This function is now replaced by openConversations
    // but kept for compatibility with existing code
    console.warn('markAsClaimed is deprecated, use openConversations instead')
    updatingItems.value.add(itemId);

    try {
      const { error } = await supabase
        .from('items')
        .update({ status: 'claimed' })
        .eq('id', itemId);

      if (error) throw error;

      await refreshData();
    } catch (error) {
      console.error('Error marking item as claimed:', error);
      alert('Error updating item status');
    } finally {
      updatingItems.value.delete(itemId);
    }
  };

  const markAsUnclaimed = async (itemId: number) => {
    updatingItems.value.add(itemId);

    try {
      const { error } = await supabase
        .from('items')
        .update({ 
          status: 'lost',
          claimed_by: null 
        })
        .eq('id', itemId);

      if (error) throw error;

      await refreshData();
    } catch (error) {
      console.error('Error marking item as unclaimed:', error);
      alert('Error updating item status');
    } finally {
      updatingItems.value.delete(itemId);
    }
  };

  return {
    postingItem,
    showPostDialog,
    updatingItems,
    showConversationsDialog,
    selectedItem,
    newItemForm,
    postMissingItem,
    openConversations,
    markAsClaimed, // Legacy - kept for compatibility
    markAsUnclaimed
  }
}