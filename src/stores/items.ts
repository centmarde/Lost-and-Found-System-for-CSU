// stores/items.ts
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'

const updatingItems = ref<Set<number>>(new Set())

/**
 * Updates an item's status to 'claimed' and assigns the claimed_by user.
 * @param itemId The ID of the item to update.
 * @param claimedByUserId The ID of the user who is claiming the item.
 * @param refreshCallback Optional callback to refresh dashboard data after update
 * @throws An error if the Supabase update fails.
 */
export async function handleClaimItem(
  itemId: number, 
  claimedBy: string,
  refreshCallback?: () => Promise<void>
): Promise<void> {
  updatingItems.value.add(itemId)
  
  try {
    const { error } = await supabase
      .from('items')
      .update({ 
        claimed_by: claimedBy,
        status: 'claimed'
      })
      .eq('id', itemId)

    if (error) throw error

    // Call the refresh callback if provided
    if (refreshCallback) {
      await refreshCallback()
    }
  } catch (error) {
    console.error('Error marking item as claimed:', error)
    throw new Error('Failed to update item status')
  } finally {
    updatingItems.value.delete(itemId)
  }
}

export async function markItemAsClaimed(itemId: number, claimedByUserId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('items')
      .update({
        claimed_by: claimedByUserId,
        status: 'claimed',
      })
      .eq('id', itemId)

    if (error) {
      console.error("Supabase error marking item as claimed:", error)
      throw error
    }
  } catch (error) {
    console.error('Error in markItemAsClaimed:', error)
    throw new Error('Failed to update item status to claimed.')
  }
}

export async function markAsClaimedBy(itemId: number, claimedByUserId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('items')
      .update({
        claimed_by: claimedByUserId,
        status: 'claimed',
      })
      .eq('id', itemId)

    if (error) {
      console.error("Supabase error marking item as claimed:", error)
      throw error
    }
  } catch (error) {
    console.error('Error in markAsClaimedBy:', error)
    throw new Error('Failed to update item status to claimed.')
  }
}

export { updatingItems }