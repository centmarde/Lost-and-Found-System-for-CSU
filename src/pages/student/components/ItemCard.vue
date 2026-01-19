<script lang="ts" setup>
import { ref, onMounted, onUnmounted, nextTick } from "vue";
import {
  formatDate,
  getItemStatusColor,
  getItemStatusText,
} from "@/utils/helpers";
import { supabase } from "@/lib/supabase";
import { useToast } from "vue-toastification";
import {
  loadExistingConversation,
  createConversation,
} from "@/stores/conversation";
import {
  sendMessage as sendMessageToConversation,
  loadMessages as loadMessagesFromConversation,
  setupMessageSubscription as setupRealtimeSubscription,
} from "@/stores/messages";
import type { Message, Conversation } from "@/types/chat";

interface Item {
  id: number;
  title: string;
  description: string;
  status: "lost" | "found";
  user_id: string;
  claimed_by: string;
  created_at: string;
  user_email?: string;  // Add user email field
}

interface Props {
  item: Item;
  isUpdating: boolean;
}

const props = defineProps<Props>();

defineEmits<{
  contact: [id: number];
  markAsUnclaimed: [id: number];
}>();

const toast = useToast();

// Chat state
const showChatDialog = ref(false);
const conversation = ref<Conversation | null>(null);
const messages = ref<Message[]>([]);
const newMessage = ref("");
const messagesLoading = ref(false);
const sendingMessage = ref(false);
const currentUser = ref<any>(null);

// Real-time subscription
let messageSubscription: any = null;

// Get current user
const getCurrentUser = async () => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  currentUser.value = user;
};

// Load existing conversation and messages
const loadExistingConv = async () => {
  if (!currentUser.value) return;

  messagesLoading.value = true;

  try {
    const existingConversation = await loadExistingConversation(
      props.item.id,
      currentUser.value.id,
      props.item.user_id
    );

    if (existingConversation) {
      conversation.value = existingConversation;
      await loadMessages();
      setupMessageSubscription();
    }
  } catch (error) {
    console.error("Error loading existing conversation:", error);
    toast.error("Failed to load conversation");
  } finally {
    messagesLoading.value = false;
  }
};

// Load messages using the messages.ts function
const loadMessages = async () => {
  if (!conversation.value) return;

  try {
    const loadedMessages = await loadMessagesFromConversation(
      conversation.value.id
    );
    messages.value = loadedMessages;

    await nextTick();
    scrollToBottom();
  } catch (error) {
    console.error("Error loading messages:", error);
    toast.error("Failed to load messages");
  }
};

// Send message using the messages.ts function
const sendMessage = async () => {
  if (!newMessage.value.trim() || sendingMessage.value) return;

  if (!currentUser.value) {
    toast.error("Please log in to send messages");
    return;
  }

  const messageText = newMessage.value.trim();
  newMessage.value = "";
  sendingMessage.value = true;

  try {
    let currentConversation = conversation.value;

    // Create conversation if it doesn't exist
    if (!currentConversation) {
      currentConversation = await createConversation(
        props.item.id,
        currentUser.value.id,
        props.item.user_id
      );
      conversation.value = currentConversation;
      setupMessageSubscription();
      toast.success("Conversation started!");
    }

    // Ensure we have a conversation before proceeding
    if (!currentConversation) {
      throw new Error("Failed to create or get conversation");
    }

    // Send the message using the messages.ts function
    const sentMessage = await sendMessageToConversation(
      currentConversation.id,
      messageText,
      currentUser.value.id
    );

    // Add the message to the local array immediately
    messages.value.push(sentMessage);
    await nextTick();
    scrollToBottom();
  } catch (error) {
    console.error("Error sending message:", error);
    toast.error("Failed to send message");
    newMessage.value = messageText;
  } finally {
    sendingMessage.value = false;
  }
};

// Setup real-time message subscription using messages.ts function
const setupMessageSubscription = () => {
  if (!conversation.value || messageSubscription || !currentUser.value) return;

  messageSubscription = setupRealtimeSubscription(
    conversation.value.id,
    (newMessage: Message) => {
      messages.value.push(newMessage);
      nextTick(() => scrollToBottom());
    },
    currentUser.value.id
  );
};

// Handle contact button click - opens dialog
const handleContact = async () => {
  if (!currentUser.value) {
    toast.error("Please log in to contact the admin");
    return;
  }

  showChatDialog.value = true;

  // Load existing conversation if it exists
  await loadExistingConv();
};

// Close chat dialog
const closeChatDialog = () => {
  showChatDialog.value = false;
  conversation.value = null;
  messages.value = [];
  newMessage.value = "";

  if (messageSubscription) {
    messageSubscription.unsubscribe();
    messageSubscription = null;
  }
};

// Scroll to bottom
const scrollToBottom = () => {
  const messagesContainer = document.querySelector(".messages-container");
  if (messagesContainer) {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }
};

// Handle key press
const handleKeyPress = (event: KeyboardEvent) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    sendMessage();
  }
};

// Check if message is from current user
const isMyMessage = (message: Message) => {
  return message.user_id === currentUser.value?.id;
};

// Initialize
onMounted(async () => {
  await getCurrentUser();
});

// Cleanup
onUnmounted(() => {
  if (messageSubscription) {
    messageSubscription.unsubscribe();
  }
});
</script>

<template>
  <v-card class="item-card h-100" elevation="2">
    <v-card-title class="d-flex justify-space-between align-start">
      <div class="text-h6 font-weight-bold">{{ item.title }}</div>
      <v-chip :color="getItemStatusColor(item)" size="small" variant="flat">
        {{ getItemStatusText(item) }}
      </v-chip>
    </v-card-title>

    <v-card-text>
      <p class="text-body-2 mb-3">{{ item.description }}</p>

      <!-- User Email -->
      <div class="d-flex align-center text-caption text-grey-darken-1 mb-2">
        <v-icon size="16" class="me-1">mdi-account-circle</v-icon>
        Posted by: {{ item.user_email || 'Unknown user' }}
      </div>

      <!-- Created Date -->
      <div class="d-flex align-center text-caption text-grey-darken-1">
        <v-icon size="16" class="me-1">mdi-clock-outline</v-icon>
        {{ formatDate(item.created_at) }}
      </div>
    </v-card-text>

    <v-card-actions class="pt-0">
      <v-spacer />
      <v-btn
        color="primary"
        variant="flat"
        size="small"
        :prepend-icon="
          item.claimed_by ? 'mdi-check-circle' : 'mdi-message-text'
        "
        @click="handleContact"
        :loading="isUpdating"
        :disabled="!!item.claimed_by"
      >
        {{ item.claimed_by ? "Item Claimed" : "Contact Admin" }}
      </v-btn>
    </v-card-actions>

    <!-- Chat Dialog -->
    <v-dialog v-model="showChatDialog" max-width="600px" persistent>
      <v-card class="chat-dialog">
        <v-card-title class="d-flex align-center pa-4 bg-primary">
          <v-icon class="me-2 text-white">mdi-message-text</v-icon>
          <div class="text-white">
            <div class="text-h6">{{ item.title }}</div>
            <div class="text-caption opacity-80">
              Chat with admin about this {{ item.status }} item
            </div>
          </div>
          <v-spacer />
          <v-btn
            icon="mdi-close"
            variant="text"
            color="white"
            @click="closeChatDialog"
          />
        </v-card-title>

        <div class="messages-container" style="height: 400px; overflow-y: auto">
          <!-- Loading messages -->
          <div
            v-if="messagesLoading"
            class="d-flex justify-center align-center pa-8"
          >
            <v-progress-circular indeterminate color="primary" />
            <span class="ml-3">Loading messages...</span>
          </div>

          <!-- Empty state -->
          <div v-else-if="messages.length === 0" class="text-center pa-8">
            <v-icon size="48" color="grey-lighten-1"
              >mdi-message-outline</v-icon
            >
            <div class="text-body-1 text-grey-darken-1 mt-2">
              Start the conversation by sending a message
            </div>
            <div class="text-caption text-grey-darken-2">
              Describe the item or ask questions to verify ownership
            </div>
          </div>

          <!-- Messages -->
          <div v-else class="pa-4">
            <div
              v-for="message in messages"
              :key="message.id"
              class="message-bubble mb-3"
              :class="{ 'my-message': isMyMessage(message) }"
            >
              <div class="message-content">
                <div class="message-text">{{ message.message }}</div>
                <div class="message-time">
                  {{ formatDate(message.created_at) }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <v-card-actions class="pa-4 bg-grey-lighten-5">
          <div class="d-flex align-center w-100">
            <v-text-field
              v-model="newMessage"
              placeholder="Type your message..."
              variant="outlined"
              density="compact"
              hide-details
              @keypress="handleKeyPress"
              :disabled="sendingMessage"
              class="flex-grow-1"
            />
            <v-btn
              color="primary"
              icon="mdi-send"
              :loading="sendingMessage"
              :disabled="!newMessage.trim()"
              @click="sendMessage"
              class="ml-2"
            />
          </div>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-card>
</template>

<style scoped>
.item-card {
 transition: transform 0.2s ease-in-out;
}

.item-card:hover {
 transform: translateY(-2px);
}

.chat-dialog {
 border-radius: 12px !important;
 overflow: hidden;
}

.messages-container {
 /* In a proper dark mode setup, this background should change.
     For now, we ensure message text is readable. */
 background: #f5f5f5;
}

.message-bubble {
 display: flex;
}

.message-bubble.my-message {
 justify-content: flex-end;
}

.message-content {
 max-width: 70%;
 background: white;
 border-radius: 18px;
 padding: 12px 16px;
 box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
 color: #212121;
}

.my-message .message-content {
 background: #1b5e20;
 color: white;
}

.message-text {
 font-size: 14px;
 line-height: 1.4;
 word-wrap: break-word;
}

.message-time {
 font-size: 11px;
 opacity: 0.7;
 margin-top: 4px;
 text-align: right;
 color: #616161;
}

.my-message .message-time {

 color: rgba(255, 255, 255, 0.7);
}
</style>
