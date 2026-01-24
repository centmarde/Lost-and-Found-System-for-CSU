// messages.ts
import { supabase } from '@/lib/supabase'
import type { Message } from '@/types/chat'

/**
 * Sends a new message to a conversation and broadcasts it
 */
export async function sendMessage(
  conversationId: string,
  messageText: string,
  userId: string
): Promise<Message> {
  try {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        message: messageText,
        user_id: userId,
      })
      .select()
      .single()

    if (error) throw error

    // Broadcast the new message to all subscribers
    const channel = supabase.channel(`conversation_${conversationId}`)
    await channel.send({
      type: 'broadcast',
      event: 'new_message',
      payload: data
    })

    return data
  } catch (error) {
    console.error('Error sending message:', error)
    throw new Error('Failed to send message')
  }
}

/**
 * Loads all messages for a conversation
 */
export async function loadMessages(conversationId: string): Promise<Message[]> {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error loading messages:', error)
    throw new Error('Failed to load messages')
  }
}

/**
 * Sets up real-time subscription for new messages in a conversation using broadcast
 */
export function setupMessageSubscription(
  conversationId: string,
  onNewMessage: (message: Message) => void,
  currentUserId: string
) {
  const channel = supabase.channel(`conversation_${conversationId}`)
  
  return channel
    .on(
      'broadcast',
      { event: 'new_message' },
      (payload: any) => {
        // Only trigger callback if message is not from current user
        if (payload.payload.user_id !== currentUserId) {
          onNewMessage(payload.payload as Message)
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload: any) => {
        // Fallback to postgres_changes if broadcast doesn't work
        // Only trigger callback if message is not from current user
        if (payload.new.user_id !== currentUserId) {
          onNewMessage(payload.new as Message)
        }
      }
    )
    .subscribe()
}

/**
 * Broadcasts a message to a conversation channel
 */
export async function broadcastMessage(
  conversationId: string,
  message: Message
): Promise<void> {
  try {
    const channel = supabase.channel(`conversation_${conversationId}`)
    await channel.send({
      type: 'broadcast',
      event: 'new_message',
      payload: message
    })
  } catch (error) {
    console.error('Error broadcasting message:', error)
  }
}

/**
 * Loads all items from the database
 */
export async function loadItems(): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error loading items:', error)
    throw new Error('Failed to load items')
  }
}

/**
 * Counts unread messages for a specific item
 * Returns the total count of messages where isread is false for all conversations related to the item
 */
export async function countUnreadMessagesForItem(itemId: number): Promise<number> {
  try {
    // First get all conversations for this item
    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select('id')
      .eq('item_id', itemId)

    if (convError) throw convError
    if (!conversations || conversations.length === 0) return 0

    // Get conversation IDs
    const conversationIds = conversations.map(conv => conv.id)

    // Count unread messages in these conversations
    const { count, error } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .in('conversation_id', conversationIds)
      .eq('isread', false)

    if (error) throw error
    return count || 0
  } catch (error) {
    console.error('Error counting unread messages for item:', error)
    return 0
  }
}

/**
 * Gets unread message counts for multiple items
 * Returns a map of item_id -> unread_count
 */
export async function getUnreadMessageCountsForItems(itemIds: number[]): Promise<Record<number, number>> {
  try {
    if (itemIds.length === 0) return {}

    // Get all conversations for these items
    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select('id, item_id')
      .in('item_id', itemIds)

    if (convError) throw convError
    if (!conversations || conversations.length === 0) return {}

    // Get conversation IDs
    const conversationIds = conversations.map(conv => conv.id)

    // Get all unread messages for these conversations
    const { data: unreadMessages, error: msgError } = await supabase
      .from('messages')
      .select('conversation_id')
      .in('conversation_id', conversationIds)
      .eq('isread', false)

    if (msgError) throw msgError

    // Create a map of conversation_id -> item_id
    const convToItemMap: Record<string, number> = {}
    conversations.forEach(conv => {
      if (conv.item_id) {
        convToItemMap[conv.id] = conv.item_id
      }
    })

    // Count unread messages per item
    const unreadCounts: Record<number, number> = {}
    itemIds.forEach(id => {
      unreadCounts[id] = 0
    })

    if (unreadMessages) {
      unreadMessages.forEach(msg => {
        const itemId = convToItemMap[msg.conversation_id]
        if (itemId) {
          unreadCounts[itemId] = (unreadCounts[itemId] || 0) + 1
        }
      })
    }

    return unreadCounts
  } catch (error) {
    console.error('Error getting unread message counts:', error)
    return {}
  }
}