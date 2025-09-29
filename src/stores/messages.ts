// stores/messages.ts

import { supabase } from '@/lib/supabase'
import type { Message, SendMessagePayload } from '@/types/chat' // Assuming you'll move interfaces

/**
 * Loads the message history for a specific conversation.
 * @param conversationId The ID of the conversation.
 * @returns An array of Message objects.
 * @throws An error if the Supabase query fails.
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
    console.error('Error in loadMessages:', error)
    throw new Error('Failed to load message history.')
  }
}

/**
 * Inserts a new message into the database.
 * @param payload Message data (conversationId, message, userId).
 * @returns The newly created Message object.
 * @throws An error if the Supabase insert fails.
 */
export async function sendMessage(payload: SendMessagePayload): Promise<Message> {
  try {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: payload.conversationId,
        message: payload.message,
        user_id: payload.userId,
      })
      .select()
      .single()

    if (error) throw error

    return data as Message
  } catch (error) {
    console.error('Error in sendMessage:', error)
    throw new Error('Failed to send message.')
  }
}

/**
 * Sets up a real-time subscription for new messages in a conversation.
 * @param conversationId The ID of the conversation to subscribe to.
 * @param onNewMessage A callback function to execute when a new message is received.
 * @returns The Supabase subscription object, which can be unsubscribed from.
 */
export function setupMessageSubscription(
  conversationId: string,
  onNewMessage: (message: Message) => void
) {
  const channelName = `admin_message_${conversationId}`
  
  return supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload: any) => {
        const newMessage = payload.new as Message
        onNewMessage(newMessage)
      }
    )
    .subscribe((status) => {
      console.log('Subscription status for conversation', conversationId, ':', status)
    })
}