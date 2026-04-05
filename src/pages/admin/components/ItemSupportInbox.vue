<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue';
import { useDisplay } from 'vuetify';
import { useAuthUserStore } from '@/stores/authUser';

// Props
const props = defineProps<{
  selectedItem: any;
  filteredConversations: any[];
  supportConversations: any[];
  loadingSupportConversations: boolean;
  loadingSupportMessages: boolean;
  sendingSupportInboxMessage: boolean;
  selectedSupportConversation: any;
  supportInboxMessages: any[];
  conversationUnreadCounts: Record<string, number>;
  conversationDisplayNames: Record<string, string>;
  conversationTypingStatus: Record<string, any>;
  isOtherUserTyping: boolean;
  otherUserTypingName: string;
  currentUser: any;
  // Pagination
  currentPage: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}>();

// Emits
const emit = defineEmits<{
  (e: 'back'): void;
  (e: 'select-conversation', conversation: any): void;
  (e: 'send-message'): void;
  (e: 'refresh'): void;
  (e: 'go-to-page', page: number): void;
  (e: 'change-page-size', size: number): void;
  (e: 'typing'): void;
}>();

const { xs } = useDisplay();
const authStore = useAuthUserStore();

// Local new message model (v-model synced with parent via emit)
const newMessage = defineModel<string>('newMessage', { default: '' });

// Store for user email mapping
const userEmailMap = ref<Record<string, string>>({});

const getConversationInitials = (conversation: any) => {
  if (props.currentUser && conversation.sender_id === props.currentUser.id) {
    return 'A';
  }
  const name = conversation.sender_profile?.full_name || 'U';
  return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 2);
};

// Get user email by user ID
const getUserEmail = (userId: string) => {
  const email = userEmailMap.value[userId];
  if (email) {
    return email;
  }
  
  console.log(`Email not found for user ID: ${userId}`);
  console.log('Available email mappings:', userEmailMap.value);
  console.log('Total mappings available:', Object.keys(userEmailMap.value).length);
  
  // Fallback: check if this user is the current user
  if (props.currentUser && userId === props.currentUser.id) {
    const currentUserEmail = props.currentUser.email || props.currentUser.user_metadata?.email;
    if (currentUserEmail) {
      console.log(`Using current user email for ${userId}: ${currentUserEmail}`);
      return currentUserEmail;
    }
  }
  
  // Check if the user is in supportInboxMessages sender data
  const messageFromThisUser = props.supportInboxMessages?.find(msg => msg.user_id === userId);
  if (messageFromThisUser && messageFromThisUser.user_email) {
    console.log(`Found email from message data for ${userId}: ${messageFromThisUser.user_email}`);
    return messageFromThisUser.user_email;
  }
  
  // If email not found and we haven't loaded emails yet, try to reload
  if (Object.keys(userEmailMap.value).length === 0) {
    console.log('No emails loaded, attempting to reload...');
    loadUserEmails();
    return 'Loading email...';
  }
  
  return `User ${userId.substring(0, 8)}...`;
};

// Load all users and create email mapping
const loadUserEmails = async () => {
  try {
    console.log('Loading user emails...');
    const response = await authStore.getAllUsers();
    
    console.log('getAllUsers response:', response);
    
    if (response.error) {
      console.error('Error loading users:', response.error);
      return;
    }
    
    if (response.users && response.users.length > 0) {
      const emailMapping: Record<string, string> = {};
      response.users.forEach(user => {
        console.log('Processing user:', user);
        if (user.id && user.email) {
          emailMapping[user.id] = user.email;
          console.log(`✓ Mapped user ${user.id} -> ${user.email}`);
        } else {
          console.warn(`⚠ User missing id or email:`, { id: user.id, email: user.email });
        }
      });
      userEmailMap.value = emailMapping;
      console.log('✓ Email mapping completed. Total users mapped:', Object.keys(emailMapping).length);
      console.log('Email mapping object:', emailMapping);
    } else {
      console.warn('No users returned from getAllUsers(). Response:', response);
    }
  } catch (error) {
    console.error('Error loading user emails:', error);
  }
};

// Watch for changes in supportInboxMessages to ensure emails are loaded
watch(
  () => props.supportInboxMessages,
  (newMessages) => {
    if (newMessages && newMessages.length > 0 && Object.keys(userEmailMap.value).length === 0) {
      console.log('Messages loaded but no email mapping, loading emails...');
      loadUserEmails();
    }
  },
  { immediate: true }
);

// Also watch for changes in selectedSupportConversation
watch(
  () => props.selectedSupportConversation,
  (newConversation) => {
    if (newConversation && Object.keys(userEmailMap.value).length === 0) {
      console.log('Conversation selected but no email mapping, loading emails...');
      loadUserEmails();
    }
  },
  { immediate: true }
);

// Initialize user emails when component mounts
onMounted(() => {
  loadUserEmails();
});
</script>

<template>
  <v-card elevation="2" class="pa-4">
    <!-- Back Button and Item Info Header -->
    <div class="d-flex align-center mb-4">
      <v-btn
        icon="mdi-arrow-left"
        variant="text"
        @click="emit('back')"
        class="me-3"
      />
      <div class="flex-grow-1">
        <div class="d-flex align-center">
          <v-icon class="me-2" color="primary">mdi-package-variant</v-icon>
          <h2 class="text-h5 font-weight-bold">{{ selectedItem.title }}</h2>
          <v-chip
            :color="selectedItem.status === 'lost' ? 'error' : 'success'"
            size="small"
            variant="flat"
            class="ml-3"
          >
            <v-icon start>
              {{ selectedItem.status === 'lost' ? 'mdi-help' : 'mdi-check-circle' }}
            </v-icon>
            {{ selectedItem.status.toUpperCase() }} ITEM
          </v-chip>
        </div>
        <p class="text-body-2 text-grey-darken-1 mt-2 mb-0">
          {{ selectedItem.description }}
        </p>
      </div>
    </div>

    <v-divider class="mb-4" />

    <v-card-title class="text-h6 font-weight-bold mb-4 d-flex align-center px-0">
      <v-icon class="me-2" color="primary">mdi-inbox</v-icon>
      Support Conversations for this Item
      <v-spacer />
      <v-chip
        v-if="!loadingSupportConversations"
        color="info"
        variant="tonal"
        :size="xs ? 'x-small' : 'small'"
      >
        {{ filteredConversations.length }}
        {{ filteredConversations.length === 1 ? 'Conversation' : 'Conversations' }}
      </v-chip>
    </v-card-title>

    <!-- Loading State -->
    <div v-if="loadingSupportConversations && supportConversations.length === 0" class="text-center py-12">
      <v-progress-circular indeterminate color="primary" size="48" />
      <p class="text-body-1 mt-4">Loading support conversations...</p>
    </div>

    <!-- Empty State -->
    <div
      v-else-if="!loadingSupportConversations && filteredConversations.length === 0"
      class="text-center py-12"
    >
      <v-icon size="80" color="grey-lighten-1" class="mb-4">
        mdi-inbox-outline
      </v-icon>
      <h3 class="text-h5 text-grey-darken-1 mb-2">
        No Support Messages for this Item
      </h3>
      <p class="text-body-1 text-grey-darken-2 mb-4">
        No students have contacted support about this item yet.
      </p>
      <v-btn
        color="primary"
        variant="outlined"
        prepend-icon="mdi-arrow-left"
        @click="emit('back')"
      >
        Back to Items
      </v-btn>
    </div>

    <!-- Support Inbox Component -->
    <div v-else>
      <div class="support-inbox-container">
        <v-row>
          <!-- Conversations List -->
          <v-col cols="12" md="4">
            <v-card variant="outlined" class="conversation-list">
              <v-card-title class="text-h6 py-3 px-4 border-b d-flex justify-space-between align-center">
                <div class="d-flex align-center">
                  <v-icon class="me-2">mdi-forum</v-icon>
                  Conversations
                  <v-btn
                    icon="mdi-refresh"
                    variant="text"
                    size="small"
                    class="ml-2"
                    :loading="loadingSupportConversations"
                    @click="emit('refresh')"
                  />
                </div>
              </v-card-title>

              <div v-if="loadingSupportConversations" class="pa-4 text-center">
                <v-progress-circular indeterminate color="primary" size="24" />
                <p class="text-caption mt-2">Loading...</p>
              </div>

              <v-list v-else class="pa-0">
                <v-list-item
                  v-for="conversation in filteredConversations"
                  :key="conversation.id"
                  @click="emit('select-conversation', conversation)"
                  :class="{ 'v-list-item--active': selectedSupportConversation?.id === conversation.id }"
                  class="conversation-item py-3"
                  lines="three"
                >
                  <template v-slot:prepend>
                    <v-badge
                      v-if="conversationUnreadCounts[conversation.id] > 0"
                      :content="conversationUnreadCounts[conversation.id]"
                      color="error"
                      overlap
                    >
                      <v-avatar
                        :color="conversation.item ? (conversation.item.status === 'lost' ? 'error' : 'success') : 'primary'"
                        size="45"
                        class="me-3"
                      >
                        <span class="text-white font-weight-bold">
                          {{ getConversationInitials(conversation) }}
                        </span>
                      </v-avatar>
                    </v-badge>
                    <v-avatar
                      v-else
                      :color="conversation.item ? (conversation.item.status === 'lost' ? 'error' : 'success') : 'primary'"
                      size="45"
                      class="me-3"
                    >
                      <span class="text-white font-weight-bold">
                        {{ getConversationInitials(conversation) }}
                      </span>
                    </v-avatar>
                  </template>

                  <!-- Main Content -->
                  <div class="d-flex flex-column">
                    <div class="d-flex align-center justify-space-between mb-1">
                      <div class="d-flex align-center">
                        <v-list-item-title class="font-weight-bold">
                          {{ conversationDisplayNames[conversation.id] || 'Loading...' }}
                        </v-list-item-title>
                        <!-- Typing indicator in conversation list -->
                        <span
                          v-if="conversationTypingStatus[conversation.id]?.isTyping"
                          class="text-caption text-primary ml-2"
                        >
                          typing...
                        </span>
                      </div>
                      <v-icon
                        v-if="conversationUnreadCounts[conversation.id] > 0"
                        color="error"
                        size="20"
                        class="ml-2"
                      >
                        mdi-email-alert
                      </v-icon>
                    </div>
                  </div>

                  <template v-slot:append>
                    <div class="text-caption text-grey">
                      {{ new Date(conversation.created_at).toLocaleDateString() }}
                    </div>
                  </template>
                </v-list-item>
              </v-list>

              <!-- Pagination Controls -->
              <v-divider />
              <div class="pa-3">
                <div class="d-flex justify-space-between align-center">
                  <!-- Page Info -->
                  <div class="text-caption text-grey">
                    Showing {{ Math.min((currentPage - 1) * pageSize + 1, totalCount) }} -
                    {{ Math.min(currentPage * pageSize, totalCount) }} of {{ totalCount }} conversations
                  </div>

                  <!-- Page Size Selector -->
                  <div class="d-flex align-center">
                    <span class="text-caption me-2">Per page:</span>
                    <v-select
                      :model-value="pageSize"
                      @update:model-value="(val) => emit('change-page-size', val)"
                      :items="[5, 10, 20, 50]"
                      variant="outlined"
                      density="compact"
                      style="max-width: 80px;"
                      hide-details
                      :disabled="loadingSupportConversations"
                    />
                  </div>
                </div>

                <!-- Pagination Buttons -->
                <div class="d-flex justify-center mt-2">
                  <v-pagination
                    v-if="totalPages > 1"
                    :model-value="currentPage"
                    @update:model-value="(val) => emit('go-to-page', val)"
                    :length="totalPages"
                    :total-visible="5"
                    size="small"
                    :disabled="loadingSupportConversations"
                  />
                </div>
              </div>
            </v-card>
          </v-col>

          <!-- Messages Area -->
          <v-col cols="12" md="8">
            <v-card variant="outlined" class="messages-area">
              <v-card-title v-if="selectedSupportConversation" class="py-4 px-4 border-b">
                <div class="d-flex flex-column w-100">
                  <!-- User Info Header -->
                  <div class="d-flex align-center mb-3">
                    <v-avatar
                      :color="selectedSupportConversation.item ? (selectedSupportConversation.item.status === 'lost' ? 'error' : 'success') : 'primary'"
                      size="40"
                      class="me-3"
                    >
                      <span class="text-white font-weight-bold">
                        {{ getConversationInitials(selectedSupportConversation) }}
                      </span>
                    </v-avatar>
                    <div>
                      <div class="text-h6 font-weight-bold">
                        {{ conversationDisplayNames[selectedSupportConversation?.id] || 'Loading...' }}
                      </div>
                    </div>
                  </div>

                  <!-- Item Information Card -->
                  <v-card
                    v-if="selectedSupportConversation.item"
                    variant="tonal"
                    :color="selectedSupportConversation.item.status === 'lost' ? 'error' : 'success'"
                    class="pa-3"
                  >
                    <div class="d-flex align-center">
                      <v-chip
                        :color="selectedSupportConversation.item.status === 'lost' ? 'error' : 'success'"
                        variant="elevated"
                        class="me-3 font-weight-bold"
                      >
                        <v-icon start>
                          {{ selectedSupportConversation.item.status === 'lost' ? 'mdi-help' : 'mdi-check-circle' }}
                        </v-icon>
                        {{ selectedSupportConversation.item.status.toUpperCase() }} ITEM
                      </v-chip>
                    </div>
                    <div class="text-h6 font-weight-bold mt-2 mb-1">
                      📦 {{ selectedSupportConversation.item.title }}
                    </div>
                    <div v-if="selectedSupportConversation.item.description" class="text-body-2">
                      {{ selectedSupportConversation.item.description }}
                    </div>
                  </v-card>

                  <!-- General Support Card -->
                  <v-card v-else variant="tonal" color="info" class="pa-3">
                    <div class="d-flex align-center">
                      <v-chip color="info" variant="elevated" class="font-weight-bold">
                        <v-icon start>mdi-lifebuoy</v-icon>
                        GENERAL SUPPORT
                      </v-chip>
                    </div>
                    <div class="text-body-2 mt-2">
                      General support conversation - No specific item involved
                    </div>
                  </v-card>
                </div>
              </v-card-title>

              <v-card-title v-else class="text-h6 py-3 px-4 border-b text-center text-grey">
                <v-icon class="me-2">mdi-message-outline</v-icon>
                Select a conversation to view messages
              </v-card-title>

              <!-- Content when conversation is selected -->
              <template v-if="selectedSupportConversation">
                <!-- Messages Display Container -->
                <div v-if="loadingSupportMessages" class="pa-4 text-center" style="height: 400px;">
                  <v-progress-circular indeterminate color="primary" size="24" />
                  <p class="text-caption mt-2">Loading messages...</p>
                </div>

                <div v-else class="pa-4" style="height: 400px; overflow-y: auto;">
                  <div
                    v-for="message in supportInboxMessages"
                    :key="message.id"
                    class="message-item mb-3"
                    :class="{
                      'message-sent': message.user_id === currentUser?.id,
                      'message-received': message.user_id !== currentUser?.id
                    }"
                  >
                    <v-card
                      variant="flat"
                      :color="message.user_id === currentUser?.id ? 'primary' : 'grey-lighten-4'"
                      :class="message.user_id === currentUser?.id ? 'ml-auto' : 'mr-auto'"
                      style="max-width: 75%;"
                    >
                      <v-card-text class="py-2 px-3">
                        <p class="mb-1" :class="message.user_id === currentUser?.id ? 'text-white' : ''">
                          {{ message.message }}
                        </p>
                        <div
                          class="text-caption"
                          :class="message.user_id === currentUser?.id ? 'text-grey-lighten-1' : 'text-grey'"
                        >
                          {{ new Date(message.created_at).toLocaleString() }}
                        </div>
                        <div
                          class="text-caption mt-1"
                          :class="message.user_id === currentUser?.id ? 'text-grey-lighten-2' : 'text-grey-darken-1'"
                        >
                          <v-icon 
                            size="12" 
                            :class="message.user_id === currentUser?.id ? 'text-grey-lighten-2' : 'text-grey-darken-1'"
                            class="me-1"
                          >
                            mdi-email-outline
                          </v-icon>
                          delivered by {{ getUserEmail(message.user_id) }}
                          <v-btn
                            v-if="!userEmailMap[message.user_id] && Object.keys(userEmailMap).length === 0"
                            icon="mdi-refresh"
                            size="x-small"
                            variant="text"
                            class="ml-2"
                            @click="loadUserEmails"
                            :class="message.user_id === currentUser?.id ? 'text-grey-lighten-2' : 'text-grey-darken-1'"
                          />
                        </div>
                      </v-card-text>
                    </v-card>
                  </div>
                </div>

                <!-- Typing Indicator -->
                <div v-if="isOtherUserTyping" class="px-4 pb-2">
                  <div class="d-flex align-center">
                    <v-avatar size="24" color="primary" class="me-2">
                      <v-icon size="14" color="white">mdi-account</v-icon>
                    </v-avatar>
                    <div class="typing-indicator">
                      <span class="text-caption text-grey-darken-1">
                        {{ otherUserTypingName }} is typing
                      </span>
                      <span class="typing-dots">
                        <span class="dot"></span>
                        <span class="dot"></span>
                        <span class="dot"></span>
                      </span>
                    </div>
                  </div>
                </div>

                <!-- Message Input -->
                <v-divider />
                <div class="pa-4">
                  <v-form @submit.prevent="emit('send-message')">
                    <v-text-field
                      v-model="newMessage"
                      label="Type your message..."
                      variant="outlined"
                      density="comfortable"
                      :disabled="sendingSupportInboxMessage"
                      append-inner-icon="mdi-send"
                      @click:append-inner="emit('send-message')"
                      @keyup.enter="emit('send-message')"
                      @input="emit('typing')"
                    />
                  </v-form>
                </div>
              </template>

              <!-- No conversation selected state -->
              <div v-else class="pa-8 text-center">
                <v-icon size="60" color="grey-lighten-2">mdi-message-outline</v-icon>
                <p class="text-h6 text-grey mt-4">Select a conversation to start messaging</p>
              </div>
            </v-card>
          </v-col>
        </v-row>
      </div>
    </div>
  </v-card>
</template>

<style scoped>
.support-inbox-container {
  min-height: 600px;
}

.conversation-list {
  height: 600px;
  display: flex;
  flex-direction: column;
}

.conversation-list .v-list {
  flex: 1;
  overflow-y: auto;
}

.conversation-item {
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  cursor: pointer;
  transition: all 0.3s ease;
  padding: 12px 16px !important;
}

.conversation-item:hover {
  background-color: rgba(var(--v-theme-primary), 0.05);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.v-list-item--active {
  background-color: rgba(var(--v-theme-primary), 0.1) !important;
  border-right: 4px solid rgb(var(--v-theme-primary));
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
}

.messages-area {
  height: 600px;
  display: flex;
  flex-direction: column;
}

.message-item {
  display: flex;
  width: 100%;
}

.message-sent {
  justify-content: flex-end;
}

.message-received {
  justify-content: flex-start;
}

.border-b {
  border-bottom: 1px solid rgba(0, 0, 0, 0.12);
}

.typing-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
}

.typing-dots {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 0 8px;
}

.typing-dots .dot {
  width: 6px;
  height: 6px;
  background-color: #666;
  border-radius: 50%;
  display: inline-block;
  animation: typingDot 1.4s infinite ease-in-out;
}

.typing-dots .dot:nth-child(1) { animation-delay: 0s; }
.typing-dots .dot:nth-child(2) { animation-delay: 0.2s; }
.typing-dots .dot:nth-child(3) { animation-delay: 0.4s; }

@keyframes typingDot {
  0%, 60%, 100% {
    transform: translateY(0);
    opacity: 0.5;
  }
  30% {
    transform: translateY(-10px);
    opacity: 1;
  }
}
</style>
