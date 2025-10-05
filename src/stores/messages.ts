// messages.ts
import { supabase } from '@/lib/supabase'
import type { Message } from '@/types/chat'

/**
 * Sends a new message to a conversation
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
 * Sets up real-time subscription for new messages in a conversation
 */
export function setupMessageSubscription(
  conversationId: string,
  onNewMessage: (message: Message) => void,
  currentUserId: string
) {
  return supabase
    .channel(`message_${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload: any) => {
        // Only trigger callback if message is not from current user
        if (payload.new.user_id !== currentUserId) {
          onNewMessage(payload.new as Message)
        }
      }
    )
    .subscribe()
}