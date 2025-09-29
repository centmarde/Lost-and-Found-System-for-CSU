// stores/conversations.ts

import { supabase } from '@/lib/supabase'
import { useAuthUserStore } from '@/stores/authUser'
import type { Conversation } from '@/types/chat' // Assuming you'll move interfaces to a types file

/**
 * Fetches conversations related to a specific item ID and enriches them with sender details.
 * @param itemId The ID of the item to retrieve conversations for.
 * @returns An array of enriched Conversation objects.
 * @throws An error if the Supabase query fails.
 */
export async function loadConversationsForItem(itemId: number): Promise<Conversation[]> {
  const authStore = useAuthUserStore()

  try {
    // 1. Fetch conversations
    const { data: conversations, error: conversationError } = await supabase
      .from('conversations')
      .select('*')
      .eq('item_id', itemId)
      .order('created_at', { ascending: false })

    if (conversationError) throw conversationError

    // 2. Fetch all users for enrichment
    const { users: allUsers, error: usersError } = await authStore.getAllUsers()
    if (usersError) console.warn('Could not load user details:', usersError)

    // 3. Map conversations and enrich with sender data
    const enrichedConversations: Conversation[] = conversations?.map(conv => ({
      ...conv,
      sender: allUsers?.find(user => user.id === conv.sender_id) || {
        id: conv.sender_id,
        email: 'Unknown User'
      },
    })) || []

    return enrichedConversations

  } catch (error) {
    console.error('Error in loadConversationsForItem:', error)
    throw new Error('Failed to load conversations from the database.')
  }
}