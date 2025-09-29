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

    // Process conversations to calculate latest message and count
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
    // Re-throw the error so the calling component can handle its loading state
    throw error;
  }
}

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

