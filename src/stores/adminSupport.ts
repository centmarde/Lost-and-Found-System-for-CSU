// stores/adminSupport.ts
import { supabase } from '@/lib/supabase'
import type { Conversation, Message } from '@/types/chat'

/**
 * Gets or creates an admin support conversation for a student
 * Admin support conversations have item_id = null
 */
export async function getOrCreateAdminSupportConversation(
  studentId: string,
  adminId: string
): Promise<Conversation> {
  try {
    // First, try to find existing admin support conversation
    const { data: existingConv, error: findError } = await supabase
      .from('conversations')
      .select('*')
      .is('item_id', null) // Admin support conversations have no item
      .eq('sender_id', studentId)
      .eq('receiver_id', adminId)
      .single()

    if (existingConv) {
      return existingConv
    }

    // If not found (PGRST116 error), create new conversation
    if (findError && findError.code !== 'PGRST116') {
      throw findError
    }

    // Create new admin support conversation
    const { data: newConv, error: createError } = await supabase
      .from('conversations')
      .insert({
        item_id: null, // NULL indicates admin support chat
        sender_id: studentId,
        receiver_id: adminId,
      })
      .select()
      .single()

    if (createError) throw createError
    return newConv
  } catch (error) {
    console.error('Error getting/creating admin support conversation:', error)
    throw new Error('Failed to initialize admin support conversation')
  }
}

/**
 * Gets all admin support conversations (for admin inbox)
 * Returns conversations where item_id is null
 */
export async function getAllAdminSupportConversations(): Promise<Conversation[]> {
  try {
    const { data, error } = await supabase
      .from('conversations')
      .select(`
        *,
        sender_profile:profiles!conversations_sender_id_fkey (
          full_name,
          email
        ),
        messages (
          message,
          created_at
        )
      `)
      .is('item_id', null) // Only get admin support conversations
      .order('created_at', { ascending: false })

    if (error) throw error

    // Process conversations to add latest message info
    const processedConversations: Conversation[] = (data || []).map((conv: any) => ({
      id: conv.id,
      item_id: conv.item_id,
      sender_id: conv.sender_id,
      receiver_id: conv.receiver_id,
      created_at: conv.created_at,
      sender_profile: conv.sender_profile,
      messages: conv.messages,
      latest_message:
        conv.messages && conv.messages.length > 0
          ? conv.messages[conv.messages.length - 1]
          : { message: 'No messages yet', created_at: conv.created_at },
      message_count: conv.messages?.length || 0,
    }))

    return processedConversations
  } catch (error) {
    console.error('Error fetching admin support conversations:', error)
    throw new Error('Failed to load admin support conversations')
  }
}

/**
 * Gets the admin user ID using a database function
 * This queries auth.users to find user with role = 1 in metadata
 * 
 * IMPORTANT: You need to create this database function first!
 * Run this SQL in your Supabase SQL Editor:
 * 
 * CREATE OR REPLACE FUNCTION get_admin_user_id()
 * RETURNS uuid
 * LANGUAGE plpgsql
 * SECURITY DEFINER
 * AS $$
 * BEGIN
 *   RETURN (
 *     SELECT id 
 *     FROM auth.users 
 *     WHERE (raw_user_meta_data->>'role')::int = 1
 *     LIMIT 1
 *   );
 * END;
 * $$;
 * 
 * -- Grant execute permission to authenticated users
 * GRANT EXECUTE ON FUNCTION get_admin_user_id() TO authenticated;
 */
export async function getAdminUserId(): Promise<string> {
  try {
    // Call the database function to get admin user ID
    const { data, error } = await supabase.rpc('get_admin_user_id')
    
    if (error) {
      console.error('Error calling get_admin_user_id:', error)
      throw error
    }

    if (!data) {
      throw new Error('No admin user found. Please ensure at least one user has role = 1 in their metadata.')
    }

    console.log('Found admin user ID:', data)
    return data
  } catch (error) {
    console.error('Error finding admin user:', error)
    throw new Error('Failed to find admin user. Please contact support.')
  }
}

/**
 * Setup real-time subscription for admin support conversations
 * This notifies admin when new support conversations are created
 */
export function setupAdminSupportConversationsSubscription(
  onNewConversation: (conversation: Conversation) => void
) {
  return supabase
    .channel('admin_support_conversations')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'conversations',
        filter: 'item_id=is.null',
      },
      async (payload: any) => {
        // Fetch the full conversation with sender details
        const { data } = await supabase
          .from('conversations')
          .select(`
            *,
            sender_profile:profiles!conversations_sender_id_fkey (
              full_name,
              email
            )
          `)
          .eq('id', payload.new.id)
          .single()

        if (data) {
          onNewConversation(data as Conversation)
        }
      }
    )
    .subscribe()
}

/**
 * Get unread message count for admin support (optional feature)
 */
export async function getUnreadAdminSupportCount(adminId: string): Promise<number> {
  try {
    // Get all admin support conversations
    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select('id')
      .is('item_id', null)
      .eq('receiver_id', adminId)

    if (convError) throw convError

    if (!conversations || conversations.length === 0) {
      return 0
    }

    // Count unread messages (you'll need to add a 'read' field to messages table for this)
    // For now, returning 0 as placeholder
    return 0
  } catch (error) {
    console.error('Error getting unread count:', error)
    return 0
  }
}