<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { formatDate } from '@/utils/helpers'
import { supabase } from '@/lib/supabase'

interface Message {
  id: string
  conversation_id: string
  message: string
  user_id: string
  created_at: string
}

const props = defineProps({
  show: { type: Boolean, required: true },
  messages: { type: Array as () => Message[], required: true },
  messagesLoading: { type: Boolean, required: true },
  sendingMessage: { type: Boolean, required: true },
  initializingChat: { type: Boolean, required: true },
})

const emit = defineEmits(['update:show', 'send-message', 'open-chat'])

const newMessage = ref('')
const currentUser = ref<any>(null)
const isMinimized = ref(false)

// Get current user
const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  currentUser.value = user
}
getCurrentUser()

const isMyMessage = (message: Message) => {
  return message.user_id === currentUser.value?.id
}

const handleKeyPress = (event: KeyboardEvent) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    sendMessage()
  }
}

const sendMessage = () => {
  if (newMessage.value.trim()) {
    emit('send-message', newMessage.value.trim())
    newMessage.value = ''
  }
}

const toggleMinimize = () => {
  isMinimized.value = !isMinimized.value
}

const openChat = () => {
  emit('update:show', true)
  emit('open-chat')
}

const closeChat = () => {
  emit('update:show', false)
  isMinimized.value = false
}

const unreadCount = computed(() => {
  // You can implement unread logic here if needed
  return 0
})

// Watch for show prop changes to trigger initialization
watch(() => props.show, (newVal) => {
  if (newVal) {
    emit('open-chat')
  }
})
</script>

<template>
  <!-- Floating Chat Button -->
  <div v-if="!show" class="floating-chat-button">
    <v-btn
      color="primary"
      size="x-large"
      elevation="8"
      @click="openChat"
      class="chat-fab"
    >
      <v-badge
        v-if="unreadCount > 0"
        :content="unreadCount"
        color="error"
        overlap
      >
        <v-icon size="32">mdi-message-text</v-icon>
      </v-badge>
      <v-icon v-else size="32">mdi-message-text</v-icon>
    </v-btn>
    <div class="chat-tooltip">Contact Admin</div>
  </div>

  <!-- Floating Chat Window -->
  <v-card
    v-else
    class="floating-chat-window"
    :class="{ minimized: isMinimized }"
    elevation="16"
  >
    <!-- Header -->
    <v-card-title class="chat-header d-flex align-center pa-3 bg-primary">
      <v-avatar size="32" class="me-2">
        <v-icon color="white">mdi-account-circle</v-icon>
      </v-avatar>
      <div class="text-white flex-grow-1">
        <div class="text-subtitle-1 font-weight-bold">Admin Support</div>
        <div class="text-caption opacity-80">
          {{ initializingChat ? 'Connecting...' : 'Online' }}
        </div>
      </div>
      <v-btn
        icon
        size="small"
        variant="text"
        color="white"
        @click="toggleMinimize"
      >
        <v-icon>{{ isMinimized ? 'mdi-window-maximize' : 'mdi-window-minimize' }}</v-icon>
      </v-btn>
      <v-btn
        icon
        size="small"
        variant="text"
        color="white"
        @click="closeChat"
      >
        <v-icon>mdi-close</v-icon>
      </v-btn>
    </v-card-title>

    <!-- Messages Container -->
    <div v-show="!isMinimized" class="chat-body">
      <div class="support-messages-container pa-4">
        <!-- Loading State -->
        <div v-if="messagesLoading || initializingChat" class="d-flex justify-center align-center" style="height: 100%;">
          <div class="text-center">
            <v-progress-circular indeterminate color="primary" size="40" />
            <p class="text-caption mt-2">{{ initializingChat ? 'Connecting to admin...' : 'Loading messages...' }}</p>
          </div>
        </div>

        <!-- Empty State -->
        <div v-else-if="messages.length === 0" class="empty-state text-center">
          <v-icon size="64" color="grey-lighten-1">mdi-chat-outline</v-icon>
          <p class="text-body-2 text-grey-darken-1 mt-3">
            Hi! How can we help you today?
          </p>
          <p class="text-caption text-grey">
            Send a message to start the conversation
          </p>
        </div>

        <!-- Messages -->
        <div v-else>
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

      <!-- Input Area -->
      <div class="chat-footer pa-3 bg-grey-lighten-4">
        <div class="d-flex align-center gap-2">
          <v-text-field
            v-model="newMessage"
            placeholder="Type your message..."
            variant="outlined"
            density="compact"
            hide-details
            @keypress="handleKeyPress"
            :disabled="sendingMessage || initializingChat"
            class="flex-grow-1"
          />
          <v-btn
            color="primary"
            icon
            :loading="sendingMessage"
            :disabled="!newMessage.trim() || initializingChat"
            @click="sendMessage"
          >
            <v-icon>mdi-send</v-icon>
          </v-btn>
        </div>
      </div>
    </div>
  </v-card>
</template>

<style scoped>
.floating-chat-button {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 1000;
}

.chat-fab {
  border-radius: 50% !important;
  width: 64px !important;
  height: 64px !important;
}

.chat-tooltip {
  position: absolute;
  bottom: 100%;
  right: 0;
  margin-bottom: 8px;
  padding: 8px 12px;
  background-color: rgba(0, 0, 0, 0.8);
  color: white;
  border-radius: 4px;
  font-size: 12px;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s;
}

.floating-chat-button:hover .chat-tooltip {
  opacity: 1;
}

.floating-chat-window {
  position: fixed;
  bottom: 24px;
  right: 24px;
  width: 380px;
  max-width: calc(100vw - 48px);
  z-index: 1000;
  border-radius: 12px !important;
  overflow: hidden;
  transition: height 0.3s ease;
}

.floating-chat-window:not(.minimized) {
  height: 600px;
  max-height: calc(100vh - 100px);
}

.floating-chat-window.minimized {
  height: auto;
}

.chat-header {
  cursor: pointer;
  user-select: none;
}

.chat-body {
  display: flex;
  flex-direction: column;
  height: calc(100% - 64px);
}

.support-messages-container {
  flex: 1;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #ccc transparent;
}

.support-messages-container::-webkit-scrollbar {
  width: 6px;
}

.support-messages-container::-webkit-scrollbar-track {
  background: transparent;
}

.support-messages-container::-webkit-scrollbar-thumb {
  background-color: #ccc;
  border-radius: 3px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 24px;
}

.message-bubble {
  display: flex;
  margin-bottom: 12px;
}

.message-bubble.my-message {
  justify-content: flex-end;
}

.message-content {
  max-width: 75%;
  padding: 10px 14px;
  border-radius: 16px;
  background-color: #f1f3f4;
  color: #212121;
}

.my-message .message-content {
  background-color: #1b5e20;
  color: white;
}

.message-text {
  word-wrap: break-word;
  line-height: 1.4;
}

.message-time {
  font-size: 0.7rem;
  opacity: 0.7;
  margin-top: 4px;
  color: #616161;
}

.my-message .message-time {
  color: rgba(255, 255, 255, 0.7);
}

.chat-footer {
  border-top: 1px solid #e0e0e0;
}

/* Mobile responsive */
@media (max-width: 600px) {
  .floating-chat-window {
    bottom: 0;
    right: 0;
    left: 0;
    width: 100%;
    max-width: 100%;
    border-radius: 12px 12px 0 0 !important;
  }

  .floating-chat-button {
    bottom: 16px;
    right: 16px;
  }
}
</style>