export interface Item {
  id: number
  title: string
  status: 'lost' | 'found'
  user_id: string
}


export interface User {
  id: string
  email: string
}

export interface Conversation {
  id: string
  item_id: number
  sender_id: string
  receiver_id: string
  created_at: string
  sender?: User
}

export interface Message {
  id: string
  conversation_id: string
  message: string
  user_id: string
  created_at: string
}

export interface SendMessagePayload {
  conversationId: string
  message: string
  userId: string
}

