import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useToast } from 'vue-toastification'
import { supabase } from '@/lib/supabase'

export interface Item {
  id: number
  title: string
  description: string
  status: 'lost' | 'found'
  user_id: string
  claimed_by: string
  created_at: string
}

export const useItemsStore = defineStore('items', () => {
  // State
  const items = ref<Item[]>([])
  const itemsLoading = ref(false)
  const updatingItemId = ref<number | null>(null)

  const toast = useToast()

  // Actions
  const fetchItems = async () => {
    itemsLoading.value = true
    try {
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching items:', error)
        toast.error('Failed to load items')
        return
      }

      items.value = data || []
    } catch (error) {
      console.error('Error:', error)
      toast.error('An unexpected error occurred while loading items')
    } finally {
      itemsLoading.value = false
    }
  }

  const markItemAsClaimed = async (itemId: number) => {
    updatingItemId.value = itemId
    try {
      const { error } = await supabase
        .from('items')
        .update({ claimed_by: 'current_user' }) // You might want to handle user ID differently
        .eq('id', itemId)

      if (error) {
        console.error('Error claiming item:', error)
        toast.error('Failed to claim item')
        return
      }

      // Update local state
      const item = items.value.find(i => i.id === itemId)
      if (item) {
        item.claimed_by = 'current_user'
      }

      toast.success('Item marked as claimed!')
    } catch (error) {
      console.error('Error:', error)
      toast.error('An unexpected error occurred')
    } finally {
      updatingItemId.value = null
    }
  }

  const markItemAsUnclaimed = async (itemId: number) => {
    updatingItemId.value = itemId
    try {
      const { error } = await supabase
        .from('items')
        .update({ claimed_by: null })
        .eq('id', itemId)

      if (error) {
        console.error('Error unclaiming item:', error)
        toast.error('Failed to unclaim item')
        return
      }

      // Update local state
      const item = items.value.find(i => i.id === itemId)
      if (item) {
        item.claimed_by = ''
      }

      toast.success('Item marked as unclaimed!')
    } catch (error) {
      console.error('Error:', error)
      toast.error('An unexpected error occurred')
    } finally {
      updatingItemId.value = null
    }
  }

  return {
    // State
    items,
    itemsLoading,
    updatingItemId,
    // Actions
    fetchItems,
    markItemAsClaimed,
    markItemAsUnclaimed
  }
})
