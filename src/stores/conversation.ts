//stores/conversation.ts
import { supabase } from '@/lib/supabase'
import { useAuthUserStore } from '@/stores/authUser'
import type { Conversation } from '@/types/chat'

/**
 * Fetches conversations related to a specific item ID and enriches them with sender details.
 */
export async function loadConversationsForItem(itemId: number): Promise<Conversation[]> {
  const authStore = useAuthUserStore()

  try {
    const { data: conversations, error: conversationError } = await supabase
      .from('conversations')
      .select('*')
      .eq('item_id', itemId)
      .order('created_at', { ascending: false })

    if (conversationError) throw conversationError

    const { users: allUsers, error: usersError } = await authStore.getAllUsers()
    if (usersError) console.warn('Could not load user details:', usersError)

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

/**
 * Fetches conversations for a specific item with full details including messages
 */
export async function fetchConversations(itemId: number): Promise<Conversation[]> {
  try {
    const { data, error } = await supabase
      .from('conversations')
      .select(
        `
          id,
          item_id,
          sender_id,
          receiver_id,
          created_at,
          sender_profile:profiles!conversations_sender_id_fkey (
            full_name,
            email
          ),
          messages (
            message,
            created_at
          )
        `
      )
      .eq('item_id', itemId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Supabase Error fetching conversations:", error);
      throw error;
    }

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
          : { message: "No messages yet", created_at: conv.created_at },
      message_count: conv.messages?.length || 0,
    }));

    return processedConversations;

  } catch (error) {
    throw error;
  }
}

/**
 * Gets all conversations for the current user (both as sender and receiver)
 */
export async function getUserConversations(userId: string) {
  try {
    const { data, error } = await supabase
      .from('conversations')
      .select(`
        *,
        items:item_id (
          id,
          title,
          description,
          status
        )
      `)
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order('created_at', { ascending: false })

    if (error) throw error

    return data || []
  } catch (error) {
    console.error('Error fetching user conversations:', error)
    throw new Error('Failed to fetch user conversations')
  }
}

/**
 * Loads an existing conversation between two users for a specific item
 */
export async function loadExistingConversation(
  itemId: number,
  senderId: string,
  receiverId: string
): Promise<Conversation | null> {
  try {
    const { data: existingConversation, error: checkError } = await supabase
      .from("conversations")
      .select("*")
      .eq("item_id", itemId)
      .eq("sender_id", senderId)
      .eq("receiver_id", receiverId)
      .single();

    if (checkError && checkError.code !== "PGRST116") {
      throw checkError;
    }

    return existingConversation || null;
  } catch (error) {
    console.error("Error loading existing conversation:", error);
    throw new Error("Failed to load existing conversation");
  }
}

/**
 * Creates a new conversation between two users for a specific item
 */
export async function createConversation(
  itemId: number,
  senderId: string,
  receiverId: string
): Promise<Conversation> {
  try {
    const { data: newConversation, error: createError } = await supabase
      .from("conversations")
      .insert([
        {
          item_id: itemId,
          sender_id: senderId,
          receiver_id: receiverId,
        },
      ])
      .select()
      .single();

    if (createError) throw createError;
    return newConversation;
  } catch (error) {
    console.error("Error creating conversation:", error);
    throw new Error("Failed to create conversation");
  }
}

/**
 * Gets the count of unique users who have chatted about a specific item
 * Returns the number of unique senders who have contacted about the item
 */
export async function getItemConversationCount(itemId: number): Promise<number> {
  try {
    const { data: conversations, error } = await supabase
      .from('conversations')
      .select('sender_id')
      .eq('item_id', itemId)

    if (error) throw error

    if (!conversations || conversations.length === 0) return 0

    // Get unique senders (people who contacted about this item)
    const uniqueSenders = new Set(conversations.map(conv => conv.sender_id))
    return uniqueSenders.size

  } catch (error) {
    console.error('Error getting item conversation count:', error)
    return 0
  }
}

/**
 * Gets conversation counts for multiple items
 * Returns a map of item_id -> conversation_count
 */
export async function getMultipleItemsConversationCounts(itemIds: number[]): Promise<Record<number, number>> {
  try {
    if (itemIds.length === 0) return {}

    const { data: conversations, error } = await supabase
      .from('conversations')
      .select('item_id, sender_id')
      .in('item_id', itemIds)

    if (error) throw error

    // Initialize counts
    const conversationCounts: Record<number, number> = {}
    itemIds.forEach(id => {
      conversationCounts[id] = 0
    })

    if (!conversations || conversations.length === 0) return conversationCounts

    // Group by item_id and count unique senders
    const itemSendersMap: Record<number, Set<string>> = {}

    conversations.forEach(conv => {
      if (!itemSendersMap[conv.item_id]) {
        itemSendersMap[conv.item_id] = new Set()
      }
      itemSendersMap[conv.item_id].add(conv.sender_id)
    })

    // Set the counts
    Object.keys(itemSendersMap).forEach(itemId => {
      const itemIdNum = parseInt(itemId)
      conversationCounts[itemIdNum] = itemSendersMap[itemIdNum].size
    })

    return conversationCounts

  } catch (error) {
    console.error('Error getting multiple items conversation counts:', error)
    return {}
  }
}
