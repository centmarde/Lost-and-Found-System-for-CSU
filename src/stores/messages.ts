import { supabase } from '@/lib/supabase'
import type { Message } from '@/types/chat'

export async function sendMessage(
  conversationId: string,
  messageText: string
): Promise<Message> {
  try {
    const { data, error } = await supabase
      .from("messages")
      .insert([
        {
          conversation_id: conversationId,
          message: messageText,
          attach_image: null,
        },
      ])
      .select("*")
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error sending message:", error);
    throw new Error("Failed to send message");
  }
}

export async function loadMessages(conversationId: string): Promise<Message[]> {
  try {
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error loading messages:", error);
    throw new Error("Failed to load messages");
  }
}

export function setupMessageSubscription(
  conversationId: string,
  onNewMessage: (message: Message) => void,
  currentUserId: string
) {
  return supabase
    .channel(`messages:${conversationId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        // Only trigger callback if message is not from current user
        if (payload.new.sender_id !== currentUserId) {
          onNewMessage(payload.new as Message);
        }
      }
    )
    .subscribe();
}