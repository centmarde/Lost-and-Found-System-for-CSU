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