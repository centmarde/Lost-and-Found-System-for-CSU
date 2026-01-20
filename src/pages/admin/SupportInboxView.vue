<script setup lang="ts">
import { onMounted, onBeforeUnmount, computed, ref } from "vue";
import InnerLayoutWrapper from "@/layouts/InnerLayoutWrapper.vue";
import AdminSupportInbox from "@/pages/admin/components/AdminSupportInbox.vue";
import { supabase } from "@/lib/supabase";

// Composables
import { useAuth } from "@/pages/admin/components/composables/useAuth";
import { useAdminSupportInbox } from "@/pages/admin/components/composables/useAdminSupportInbox";

// Auth composable
const { currentUser, isCurrentUserAdmin, getCurrentUser } = useAuth();

// Items state
const items = ref<any[]>([]);
const loadingItems = ref(false);
const selectedItem = ref<any>(null);

// New message variable
const newMessage = ref('');

// Computed property to get current user role
const currentUserRole = computed(() => {
  console.log("Current User:", currentUser.value?.app_metadata);
  return currentUser.value?.app_metadata?.role || currentUser.value?.user_metadata?.role || null;
});

// Computed property to filter conversations based on selected item
const filteredConversations = computed(() => {
  if (!selectedItem.value) return [];
  
  // Filter conversations by selected item
  return supportConversations.value.filter(conversation => {
    return conversation.item_id === selectedItem.value.id;
  });
});

// Computed property to count conversations per item
const getItemConversationCount = (itemId: number) => {
  return supportConversations.value.filter(conv => conv.item_id === itemId).length;
};

// Computed property to filter items that have conversations
const itemsWithConversations = computed(() => {
  return items.value.filter(item => {
    return supportConversations.value.some(conv => conv.item_id === item.id);
  });
});

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

// Load all items
const loadItems = async () => {
  loadingItems.value = true;
  try {
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    items.value = data || [];
  } catch (error) {
    console.error('Error loading items:', error);
  } finally {
    loadingItems.value = false;
  }
};

// Select an item to view its support conversations
const selectItem = async (item: any) => {
  selectedItem.value = item;
  await loadSupportConversations(1);
};

// Go back to items list
const backToItems = () => {
  selectedItem.value = null;
  selectedSupportConversation.value = null;
};

// Message sending handlers
const handleSendMessage = async () => {
  if (newMessage.value.trim()) {
    await sendMessageToStudent(newMessage.value);
    newMessage.value = '';
  }
};

onMounted(async () => {
  await getCurrentUser();
  // Load items and conversations
  await loadItems();
  openInbox();
  console.log('SupportInboxView mounted - broadcast subscriptions initialized');
});

onBeforeUnmount(() => {
  // Cleanup subscriptions when component unmounts
  closeInbox();
  console.log('SupportInboxView unmounted - broadcast subscriptions cleaned up');
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
            <!-- Show Items Grid when no item is selected -->
            <div v-if="!selectedItem">
              <v-card elevation="2" class="pa-4 mb-4">
                <v-card-title class="text-h5 font-weight-bold mb-4 d-flex align-center">
                  <v-icon class="me-2" color="primary">mdi-package-variant</v-icon>
                  Items with Support Requests
                  <v-spacer />
                  <v-chip
                    v-if="!loadingItems"
                    color="info"
                    variant="tonal"
                    :size="$vuetify.display.xs ? 'x-small' : 'small'"
                  >
                    {{ itemsWithConversations.length }} {{ itemsWithConversations.length === 1 ? 'Item' : 'Items' }}
                  </v-chip>
                </v-card-title>

                <!-- Loading State -->
                <div v-if="loadingItems" class="text-center py-12">
                  <v-progress-circular indeterminate color="primary" size="48" />
                  <p class="text-body-1 mt-4">Loading items...</p>
                </div>

                <!-- Empty State -->
                <div v-else-if="itemsWithConversations.length === 0" class="text-center py-12">
                  <v-icon size="80" color="grey-lighten-1" class="mb-4">
                    mdi-package-variant-closed
                  </v-icon>
                  <h3 class="text-h5 text-grey-darken-1 mb-2">
                    No Items with Support Requests
                  </h3>
                  <p class="text-body-1 text-grey-darken-2 mb-4">
                    There are currently no items with student support conversations.
                  </p>
                </div>

                <!-- Items Grid -->
                <v-row v-else>
                  <v-col
                    v-for="item in itemsWithConversations"
                    :key="item.id"
                    cols="12"
                    sm="6"
                    md="4"
                    lg="3"
                  >
                    <v-card
                      class="item-card h-100"
                      elevation="2"
                      hover
                      @click="selectItem(item)"
                    >
                      <v-card-title class="d-flex justify-space-between align-start pb-2">
                        <div class="text-subtitle-1 font-weight-bold">{{ item.title }}</div>
                        <v-chip
                          :color="item.status === 'lost' ? 'error' : 'success'"
                          size="x-small"
                          variant="flat"
                        >
                          {{ item.status.toUpperCase() }}
                        </v-chip>
                      </v-card-title>

                      <v-card-text>
                        <p class="text-body-2 text-grey-darken-1 mb-3" style="min-height: 60px;">
                          {{ item.description.substring(0, 80) }}{{ item.description.length > 80 ? '...' : '' }}
                        </p>

                        <v-divider class="my-3" />

                        <!-- Conversation Count -->
                        <div class="d-flex align-center justify-space-between">
                          <div class="d-flex align-center text-caption text-grey-darken-1">
                            <v-icon size="16" class="me-1">mdi-message-text</v-icon>
                            {{ getItemConversationCount(item.id) }} 
                            {{ getItemConversationCount(item.id) === 1 ? 'conversation' : 'conversations' }}
                          </div>
                          <v-btn
                            color="primary"
                            variant="text"
                            size="small"
                            append-icon="mdi-chevron-right"
                          >
                            View
                          </v-btn>
                        </div>

                        <!-- Created Date -->
                        <div class="d-flex align-center text-caption text-grey mt-2">
                          <v-icon size="14" class="me-1">mdi-clock-outline</v-icon>
                          {{ new Date(item.created_at).toLocaleDateString() }}
                        </div>
                      </v-card-text>
                    </v-card>
                  </v-col>
                </v-row>
              </v-card>
            </div>

            <!-- Show Support Inbox when item is selected -->
            <v-card v-else elevation="2" class="pa-4">
              <!-- Back Button and Item Info Header -->
              <div class="d-flex align-center mb-4">
                <v-btn
                  icon="mdi-arrow-left"
                  variant="text"
                  @click="backToItems"
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
                  :size="$vuetify.display.xs ? 'x-small' : 'small'"
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
                  @click="backToItems"
                >
                  Back to Items
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
                        </v-card-title>

                        <div v-if="loadingSupportConversations" class="pa-4 text-center">
                          <v-progress-circular indeterminate color="primary" size="24" />
                          <p class="text-caption mt-2">Loading...</p>
                        </div>

                        <v-list v-else class="pa-0">
                          <v-list-item
                            v-for="conversation in filteredConversations"
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
                                <span class="text-white font-weight-bold">
                                  {{ (conversation.sender_profile?.full_name || 'U').split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 2) }}
                                </span>
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
                                    {{ conversation.item.status === 'lost' ? 'mdi-help' : 'mdi-check-circle' }}
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
                                <span class="text-white font-weight-bold">
                                  {{ (selectedSupportConversation.sender_profile?.full_name || 'U').split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 2) }}
                                </span>
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
                                </v-card-text>
                              </v-card>
                            </div>
                          </div>

                          <!-- Message Input - Always visible when conversation is selected -->
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
          </v-col>
        </v-row>
      </v-container>
    </template>
  </InnerLayoutWrapper>
</template>

<style scoped>
.item-card {
  cursor: pointer;
  transition: all 0.3s ease;
}

.item-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15) !important;
}

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
