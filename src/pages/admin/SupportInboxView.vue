<script setup lang="ts">
import { onMounted, computed, ref } from "vue";
import InnerLayoutWrapper from "@/layouts/InnerLayoutWrapper.vue";
import AdminSupportInbox from "@/pages/admin/components/AdminSupportInbox.vue";

// Composables
import { useAuth } from "@/pages/admin/components/composables/useAuth";
import { useAdminSupportInbox } from "@/pages/admin/components/composables/useAdminSupportInbox";

// Auth composable
const { currentUser, isCurrentUserAdmin, getCurrentUser } = useAuth();

// New message variable
const newMessage = ref('');

// Admin Support Inbox composable
const {
  showInbox: showAdminSupportInbox,
  supportConversations,
  selectedConversation: selectedSupportConversation,
  messages: supportInboxMessages,
  loadingConversations: loadingSupportConversations,
  loadingMessages: loadingSupportMessages,
  sendingMessage: sendingSupportInboxMessage,
  // Pagination state
  currentPage,
  pageSize,
  totalCount,
  totalPages,
  // Functions
  openInbox,
  closeInbox,
  selectConversation: selectSupportConversation,
  sendMessageToStudent,
  loadSupportConversations,
  // Pagination functions
  goToPage,
  nextPage,
  previousPage,
  changePageSize,
} = useAdminSupportInbox(currentUser);

// Page title and description
const pageTitle = computed(() => "Support Inbox");
const pageDescription = computed(() => "Manage student support conversations and provide assistance");

// Message sending handlers
const handleSendMessage = async () => {
  if (newMessage.value.trim()) {
    await sendMessageToStudent(newMessage.value);
    newMessage.value = '';
  }
};

onMounted(async () => {
  await getCurrentUser();
  // Automatically open the inbox when the view loads
  openInbox();
});
</script>

<template>
  <InnerLayoutWrapper>
    <template #content>
      <v-container fluid class="pa-6">
        <!-- Page Header -->
        <v-row class="mb-6">
          <v-col cols="12">
            <div class="text-center mb-4 mb-md-6">
              <h1 class="text-h2 text-sm-h1 font-weight-bold text-green-darken-4 mb-2">
                {{ pageTitle }}
              </h1>
              <p class="text-h6 text-sm-h5 text-grey-darken-1 mb-0">
                {{ pageDescription }}
              </p>
            </div>
          </v-col>
        </v-row>

        <!-- Support Inbox Content -->
        <v-row>
          <v-col cols="12">
            <v-card elevation="2" class="pa-4">
              <v-card-title class="text-h5 font-weight-bold mb-4 d-flex align-center">
                <v-icon class="me-2" color="primary">mdi-inbox</v-icon>
                Student Support Messages
                <v-spacer />
                <v-chip
                  v-if="!loadingSupportConversations"
                  color="info"
                  variant="tonal"
                  :size="$vuetify.display.xs ? 'x-small' : 'small'"
                >
                  {{ supportConversations.length }}
                  {{ supportConversations.length === 1 ? 'Conversation' : 'Conversations' }}
                </v-chip>
              </v-card-title>

              <!-- Loading State -->
              <div v-if="loadingSupportConversations && supportConversations.length === 0" class="text-center py-12">
                <v-progress-circular indeterminate color="primary" size="48" />
                <p class="text-body-1 mt-4">Loading support conversations...</p>
              </div>

              <!-- Empty State -->
              <div
                v-else-if="!loadingSupportConversations && supportConversations.length === 0"
                class="text-center py-12"
              >
                <v-icon size="80" color="grey-lighten-1" class="mb-4">
                  mdi-inbox-outline
                </v-icon>
                <h3 class="text-h5 text-grey-darken-1 mb-2">
                  No Support Messages
                </h3>
                <p class="text-body-1 text-grey-darken-2 mb-4">
                  There are currently no student support conversations to display.
                </p>
                <v-btn
                  color="primary"
                  variant="outlined"
                  prepend-icon="mdi-refresh"
                  @click="openInbox"
                >
                  Refresh
                </v-btn>
              </div>

              <!-- Support Inbox Component -->
              <div v-else>
                <!-- Embedded Support Inbox without dialog wrapper -->
                <div class="support-inbox-container">
                  <!-- Conversations List -->
                  <v-row>
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
                              @click="loadSupportConversations(currentPage)"
                            />
                          </div>
                          <v-chip
                            v-if="!loadingSupportConversations"
                            color="info"
                            variant="tonal"
                            size="small"
                          >
                            {{ totalCount }} Total
                          </v-chip>
                        </v-card-title>

                        <div v-if="loadingSupportConversations" class="pa-4 text-center">
                          <v-progress-circular indeterminate color="primary" size="24" />
                          <p class="text-caption mt-2">Loading...</p>
                        </div>

                        <v-list v-else class="pa-0">
                          <v-list-item
                            v-for="conversation in supportConversations"
                            :key="conversation.id"
                            @click="selectSupportConversation(conversation)"
                            :class="{ 'v-list-item--active': selectedSupportConversation?.id === conversation.id }"
                            class="conversation-item py-3"
                            lines="three"
                          >
                            <template v-slot:prepend>
                              <v-avatar
                                :color="conversation.item ? (conversation.item.status === 'lost' ? 'error' : 'success') : 'primary'"
                                size="45"
                                class="me-3"
                              >
                                <v-icon color="white">
                                  {{ conversation.item ? (conversation.item.status === 'lost' ? 'mdi-help-circle' : 'mdi-check-circle') : 'mdi-account' }}
                                </v-icon>
                              </v-avatar>
                            </template>

                            <!-- Main Content -->
                            <div class="d-flex flex-column">
                              <!-- User Info -->
                              <v-list-item-title class="font-weight-bold mb-1">
                                {{ conversation.sender_profile?.full_name || 'Student User' }}
                              </v-list-item-title>

                              <!-- Item Information - Made More Prominent -->
                              <div v-if="conversation.item" class="mb-2">
                                <v-chip
                                  :color="conversation.item.status === 'lost' ? 'error' : 'success'"
                                  variant="elevated"
                                  size="small"
                                  class="me-2 font-weight-bold"
                                >
                                  <v-icon start>
                                    {{ conversation.item.status === 'lost' ? 'mdi-help-circle' : 'mdi-check-circle' }}
                                  </v-icon>
                                  {{ conversation.item.status.toUpperCase() }} ITEM
                                </v-chip>
                                <div class="text-subtitle-2 font-weight-medium text-primary mt-1">
                                  📦 {{ conversation.item.title }}
                                </div>
                                <div v-if="conversation.item.description" class="text-caption text-grey-darken-1 mt-1">
                                  {{ conversation.item.description.substring(0, 60) }}{{ conversation.item.description.length > 60 ? '...' : '' }}
                                </div>
                              </div>

                              <div v-else class="mb-2">
                                <v-chip
                                  color="info"
                                  variant="elevated"
                                  size="small"
                                  class="font-weight-bold"
                                >
                                  <v-icon start>mdi-lifebuoy</v-icon>
                                  GENERAL SUPPORT
                                </v-chip>
                              </div>

                              <!-- User Email -->
                              <v-list-item-subtitle class="text-caption">
                                {{ conversation.sender_profile?.email }}
                              </v-list-item-subtitle>
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
                                @update:model-value="changePageSize"
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
                              @update:model-value="goToPage"
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
                                <v-icon color="white">
                                  {{ selectedSupportConversation.item ? (selectedSupportConversation.item.status === 'lost' ? 'mdi-help-circle' : 'mdi-check-circle') : 'mdi-account' }}
                                </v-icon>
                              </v-avatar>
                              <div>
                                <div class="text-h6 font-weight-bold">
                                  {{ selectedSupportConversation.sender_profile?.full_name || 'Student User' }}
                                </div>
                                <div class="text-caption text-grey-darken-1">
                                  {{ selectedSupportConversation.sender_profile?.email }}
                                </div>
                              </div>
                            </div>

                            <!-- Item Information Card -->
                            <v-card v-if="selectedSupportConversation.item" variant="tonal" :color="selectedSupportConversation.item.status === 'lost' ? 'error' : 'success'" class="pa-3">
                              <div class="d-flex align-center">
                                <v-chip
                                  :color="selectedSupportConversation.item.status === 'lost' ? 'error' : 'success'"
                                  variant="elevated"
                                  class="me-3 font-weight-bold"
                                >
                                  <v-icon start>
                                    {{ selectedSupportConversation.item.status === 'lost' ? 'mdi-help-circle' : 'mdi-check-circle' }}
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

                        <!-- Messages Display -->
                        <div v-if="selectedSupportConversation" class="messages-container">
                          <div v-if="loadingSupportMessages" class="pa-4 text-center">
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
                                </v-card-text>
                              </v-card>
                            </div>
                          </div>

                          <!-- Message Input -->
                          <v-divider />
                          <div class="pa-4">
                            <v-form @submit.prevent="handleSendMessage">
                              <v-text-field
                                v-model="newMessage"
                                label="Type your message..."
                                variant="outlined"
                                density="comfortable"
                                :disabled="sendingSupportInboxMessage"
                                append-inner-icon="mdi-send"
                                @click:append-inner="handleSendMessage"
                                @keyup.enter="handleSendMessage"
                              />
                            </v-form>
                          </div>
                        </div>

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
          </v-col>
        </v-row>
      </v-container>
    </template>
  </InnerLayoutWrapper>
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

.messages-container {
  flex: 1;
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
</style>
