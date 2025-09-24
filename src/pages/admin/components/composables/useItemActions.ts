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

export const useItemActions = (refreshData: () => Promise<void>) => {
  const postingItem = ref(false)
  const showPostDialog = ref(false)
  const updatingItems = ref<Set<number>>(new Set())
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

  const markAsClaimed = async (itemId: number) => {
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
        .update({ status: 'lost' })
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
    newItemForm,
    postMissingItem,
    markAsClaimed,
    markAsUnclaimed
  }
}