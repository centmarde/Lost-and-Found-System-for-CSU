<script setup lang="ts">
import { onMounted, onBeforeUnmount, computed, ref } from "vue";
import { useRouter } from "vue-router";
import InnerLayoutWrapper from "@/layouts/InnerLayoutWrapper.vue";
import AdminSupportInbox from "@/pages/admin/components/AdminSupportInbox.vue";
import FilterHeader from "@/pages/admin/components/FilterHeader.vue";
import ItemsDataTable from "@/pages/admin/components/ItemsDataTable.vue";
import UsersDataTable from "@/pages/admin/components/UsersDataTable.vue";
import ItemsCardView from "@/pages/admin/components/ItemsCardView.vue";
import UsersCardView from "@/pages/admin/components/UsersCardView.vue";
import { supabase } from "@/lib/supabase";
import { loadItems as loadItemsFromStore, getUnreadMessageCountsForItems, updateUnreadCountForConversation as updateUnreadCountForConversationStore, markAllUnreadMessagesAsRead, getUnreadConversationsDetails } from "@/stores/messages";
import { useSidebarStore } from "@/stores/sidebar";
import { useToast } from 'vue-toastification';
import { getUserDetails } from "@/stores/adminSupport";
// Composables
import { useAuth } from "@/pages/admin/components/composables/useAuth";
import { useAdminSupportInbox } from "@/pages/admin/components/composables/useAdminSupportInbox";


// Auth composable
const { currentUser, isCurrentUserAdmin, getCurrentUser } = useAuth();

// Router
const router = useRouter();
// Admin Support Inbox composable
const {
  showInbox: showAdminSupportInbox,
  supportConversations,
  selectedConversation: selectedSupportConversation,
  messages: supportInboxMessages,
  loadingConversations: loadingSupportConversations,
  loadingMessages: loadingSupportMessages,
  sendingMessage: sendingSupportInboxMessage,
  unreadCounts: conversationUnreadCounts,
  isOtherUserTyping,
  otherUserTypingName,
  conversationTypingStatus, // For showing typing in conversation list
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
  handleTyping,
  // Pagination functions
  goToPage,
  nextPage,
  previousPage,
  changePageSize,
} = useAdminSupportInbox(currentUser);


// Sidebar store for updating badge
const sidebarStore = useSidebarStore();

// Toast for notifications
const toast = useToast();

// Items state
const items = ref<any[]>([]);
const loadingItems = ref(false);
const selectedItem = ref<any>(null);
const unreadMessageCounts = ref<Record<number, number>>({});

// Direct message state
const showDirectMessages = ref(false);
const directMessageUnreadCount = ref(0);
const selectedUser = ref<any>(null);

// View mode: 'items' | 'direct-messages' | 'user-messages'
const viewMode = ref<'items' | 'direct-messages' | 'user-messages'>('items');

// Filter and view state
const searchQuery = ref('');
const sortBy = ref('name');
const itemViewMode = ref<'table' | 'cards'>('cards');
const userViewMode = ref<'table' | 'cards'>('cards');

// Real-time subscription
let messagesSubscription: any = null;

// New message variable
const newMessage = ref('');

// Computed property to get current user role
const currentUserRole = computed(() => {
  return currentUser.value?.app_metadata?.role || currentUser.value?.user_metadata?.role || null;
});

// Computed property to filter conversations based on selected item or user
const filteredConversations = computed(() => {
  if (viewMode.value === 'direct-messages') {
    // Show direct message conversations (no item_id)
    return supportConversations.value.filter(conversation => {
      return conversation.item_id === null || conversation.item_id === undefined;
    });
  }

  if (viewMode.value === 'user-messages' && selectedUser.value) {
    // Show conversations for selected user
    return supportConversations.value.filter(conversation => {
      return (conversation.item_id === null || conversation.item_id === undefined) &&
             conversation.sender_id === selectedUser.value.id;
    });
  }

  if (!selectedItem.value) return [];

  // Filter conversations by selected item
  return supportConversations.value.filter(conversation => {
    return conversation.item_id === selectedItem.value.id;
  });
});

// Computed property for direct message conversations (no item associated)
const directMessageConversations = computed(() => {
  return supportConversations.value.filter(conversation => {
    return conversation.item_id === null || conversation.item_id === undefined;
  });
});

// Computed property for direct messages where current user is sender or receiver
const directMessageFilteredConversations = computed(() => {
  if (!currentUser.value) return [];
  return supportConversations.value.filter(conversation => {
    const isDirect = conversation.item_id === null || conversation.item_id === undefined;
    const isParticipant = conversation.sender_id === currentUser.value.id || conversation.receiver_id === currentUser.value.id;
    return isDirect && isParticipant;
  });
});

// Computed property for direct message conversation count for current user
const directMessageConversationCount = computed(() => {
  return directMessageFilteredConversations.value.length;
});


// Computed property to count conversations per item
const getItemConversationCount = (itemId: number) => {
  return supportConversations.value.filter(conv => conv.item_id === itemId).length;
};

// Get unread message count for an item
const getUnreadMessageCount = (itemId: number) => {
  return unreadMessageCounts.value[itemId] || 0;
};

// Get unread count for direct messages
const getDirectMessageUnreadCount = () => {
  return directMessageConversations.value.reduce((total, conv) => {
    return total + (conversationUnreadCounts.value[conv.id] || 0);
  }, 0);
};

// Computed property to filter items that have conversations
const itemsWithConversations = computed(() => {
  return items.value.filter(item => {
    return supportConversations.value.some(conv => conv.item_id === item.id);
  });
});

// Computed property for filtered and sorted items
const filteredAndSortedItems = computed(() => {
  let filtered = itemsWithConversations.value;

  // Apply search filter
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter(item =>
      item.title.toLowerCase().includes(query) ||
      item.description.toLowerCase().includes(query) ||
      item.status.toLowerCase().includes(query)
    );
  }

  // Apply sorting
  filtered = [...filtered].sort((a, b) => {
    switch (sortBy.value) {
      case 'name':
        return a.title.localeCompare(b.title);
      case 'name_desc':
        return b.title.localeCompare(a.title);
      case 'date':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      case 'date_asc':
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      case 'unread':
        return getUnreadMessageCount(b.id) - getUnreadMessageCount(a.id);
      case 'conversations':
        return getItemConversationCount(b.id) - getItemConversationCount(a.id);
      default:
        return 0;
    }
  });

  return filtered;
});

// Computed property for filtered and sorted users
const filteredAndSortedUsers = computed(() => {
  let filtered = usersWithDirectMessages.value;

  // Apply search filter
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter(user =>
      (user.full_name || '').toLowerCase().includes(query) ||
      (user.email || '').toLowerCase().includes(query)
    );
  }

  // Apply sorting
  filtered = [...filtered].sort((a, b) => {
    switch (sortBy.value) {
      case 'name':
        return (a.full_name || 'Unknown').localeCompare(b.full_name || 'Unknown');
      case 'name_desc':
        return (b.full_name || 'Unknown').localeCompare(a.full_name || 'Unknown');
      case 'date':
        return new Date(b.latest_message_date).getTime() - new Date(a.latest_message_date).getTime();
      case 'date_asc':
        return new Date(a.latest_message_date).getTime() - new Date(b.latest_message_date).getTime();
      case 'unread':
        return b.unread_count - a.unread_count;
      case 'conversations':
        return b.conversations.length - a.conversations.length;
      default:
        return 0;
    }
  });

  return filtered;
});// Computed property for conversation counts per item
const itemConversationCounts = computed(() => {
  const counts: Record<number, number> = {};
  items.value.forEach(item => {
    counts[item.id] = getItemConversationCount(item.id);
  });
  return counts;
});

// Computed property to get unique users with direct messages
const usersWithDirectMessages = computed(() => {
  const userMap = new Map();

  directMessageConversations.value.forEach(conv => {
    if (conv.sender_profile || conv.sender_id) {
      const userId = conv.sender_id;
      const userProfile = conv.sender_profile;

      if (!userMap.has(userId)) {
        userMap.set(userId, {
          id: userId,
          full_name: userProfile?.full_name || 'Unknown User',
          email: userProfile?.email || 'No email',
          conversations: [],
          unread_count: 0,
          latest_message_date: conv.created_at
        });
      }

      const user = userMap.get(userId);
      user.conversations.push(conv);
      user.unread_count += conversationUnreadCounts.value[conv.id] || 0;

      // Update latest message date
      if (new Date(conv.created_at) > new Date(user.latest_message_date)) {
        user.latest_message_date = conv.created_at;
      }
    }
  });

  return Array.from(userMap.values()).sort((a, b) =>
    new Date(b.latest_message_date).getTime() - new Date(a.latest_message_date).getTime()
  );
});

// Page title and description
const pageTitle = computed(() => "Support Inbox");
const pageDescription = computed(() => "Manage student support conversations and provide assistance");

// Load all items
const loadItems = async () => {
  loadingItems.value = true;
  try {
    items.value = await loadItemsFromStore();

    // Load unread message counts for all items
    const itemIds = items.value.map(item => item.id);
    if (itemIds.length > 0 && currentUser.value) {
      unreadMessageCounts.value = await getUnreadMessageCountsForItems(itemIds, currentUser.value.id);

      // Update sidebar store with fresh total unread count
      await sidebarStore.updateUnreadMessageCount(currentUser.value.id);
    }
  } catch (error) {
    console.error('Error loading items:', error);
  } finally {
    loadingItems.value = false;
  }
};

// Select an item to view its support conversations — navigates to the dedicated page
const selectItem = (item: any) => {
  router.push(`/admin/support-inbox/item/${item.id}`);
};

// Select a user to view their direct messages
const selectUser = async (user: any) => {
  selectedUser.value = user;
  viewMode.value = 'user-messages';
  selectedSupportConversation.value = null;
  await loadSupportConversations(1);
};

// Go back to items list
const backToItems = () => {
  selectedItem.value = null;
  selectedSupportConversation.value = null;
  viewMode.value = 'items';
};

// Go back to main view (from direct messages)
const backToMainView = () => {
  viewMode.value = 'items';
  selectedUser.value = null;
  selectedSupportConversation.value = null;
};

// Go back to users list (from specific user messages)
const backToUsers = () => {
  viewMode.value = 'direct-messages';
  selectedUser.value = null;
  selectedSupportConversation.value = null;
};

// Filter handlers
const handleSearchChange = (query: string) => {
  searchQuery.value = query;
};

const handleSortChange = (sort: string) => {
  sortBy.value = sort;
};

const handleItemViewModeChange = (mode: 'table' | 'cards') => {
  itemViewMode.value = mode;
};

const handleUserViewModeChange = (mode: 'table' | 'cards') => {
  userViewMode.value = mode;
};

const handleClearFilters = () => {
  searchQuery.value = '';
  sortBy.value = 'name';
};

// Handle marking item messages as read
const handleMarkItemAsRead = async (item: any) => {
  if (!currentUser.value) return;

  try {
    toast.info('Marking item messages as read...');

    // Find all conversations for this item and mark their messages as read
    const itemConversations = supportConversations.value.filter(conv => conv.item_id === item.id);
    let totalMarked = 0;

    for (const conversation of itemConversations) {
      const count = await updateUnreadCountForConversationStore(conversation.id, currentUser.value.id);
      totalMarked += (conversationUnreadCounts.value[conversation.id] || 0);
      conversationUnreadCounts.value[conversation.id] = 0;
    }

    // Update item unread count
    unreadMessageCounts.value[item.id] = 0;

    if (totalMarked > 0) {
      toast.success(`✅ Marked ${totalMarked} message${totalMarked > 1 ? 's' : ''} as read for "${item.title}"`);
    } else {
      toast.info('No unread messages for this item');
    }

    // Update sidebar badge
    await sidebarStore.updateUnreadMessageCount(currentUser.value.id);
  } catch (error) {
    toast.error('Failed to mark messages as read');
  }
};

// Handle marking user messages as read
const handleMarkUserAsRead = async (user: any) => {
  if (!currentUser.value) return;

  try {
    toast.info('Marking user messages as read...');

    // Find all conversations for this user and mark their messages as read
    let totalMarked = 0;

    for (const conversation of user.conversations) {
      const count = await updateUnreadCountForConversationStore(conversation.id, currentUser.value.id);
      totalMarked += (conversationUnreadCounts.value[conversation.id] || 0);
      conversationUnreadCounts.value[conversation.id] = 0;
    }

    // Update user unread count
    user.unread_count = 0;

    if (totalMarked > 0) {
      toast.success(`✅ Marked ${totalMarked} message${totalMarked > 1 ? 's' : ''} as read from "${user.full_name || 'Unknown User'}"`);
    } else {
      toast.info('No unread messages from this user');
    }

    // Update sidebar badge
    await sidebarStore.updateUnreadMessageCount(currentUser.value.id);
  } catch (error) {
    toast.error('Failed to mark messages as read');
  }
};

// Message sending handlers
const handleSendMessage = async () => {
  if (newMessage.value.trim()) {
    await sendMessageToStudent(newMessage.value);
    newMessage.value = '';
  }
};

// Mark all unread messages as read
const handleMarkAllAsRead = async () => {
  if (!currentUser.value) return;

  try {
    toast.info('Marking all messages as read...');
    const count = await markAllUnreadMessagesAsRead(currentUser.value.id);

    if (count > 0) {
      toast.success(`✅ Marked ${count} message${count > 1 ? 's' : ''} as read`);

      // Refresh all unread counts
      await sidebarStore.updateUnreadMessageCount(currentUser.value.id);
      await loadItems();
      await loadSupportConversations(currentPage.value);

      // Reset conversation unread counts
      conversationUnreadCounts.value = {};
    } else {
      toast.info('No unread messages to mark');
    }
  } catch (error) {
    toast.error('Failed to mark messages as read');
  }
};

// Cache for conversation display names
const conversationDisplayNames = ref<Record<string, string>>({});

// Helper to determine display name id
const getDisplayNameId = (conversation: any) => {
  if (currentUser.value && conversation.sender_id === currentUser.value.id) {
    return conversation.receiver_id;
  } else {
    return conversation.sender_id;
  }
};

// Pre-fetch and cache display names for all conversations
const fetchAllConversationDisplayNames = async (conversations: any[]) => {
  for (const conv of conversations) {
    const displayNameId = getDisplayNameId(conv);
    if (!conversationDisplayNames.value[conv.id]) {
      const user = await getUserDetails(displayNameId);
      conversationDisplayNames.value[conv.id] = user?.email || 'No email';
    }
  }
};

// Watch for changes in conversations and fetch display names
import { watch } from 'vue';
watch(
  () => supportConversations.value,
  (newConvs) => {
    if (Array.isArray(newConvs)) {
      fetchAllConversationDisplayNames(newConvs);
    }
  },
  { immediate: true }
);


const getConversationInitials = (conversation: any) => {
  if (currentUser.value && conversation.sender_id === currentUser.value.id) {
    return 'A';
  }
  const name = conversation.sender_profile?.full_name || 'U';
  return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 2);
};

// Update unread count for a conversation and its item
const updateUnreadCountForConversation = async (conversationId: string) => {
  try {
    if (!currentUser.value) {
      return;
    }

    // Find the conversation
    const conversation = supportConversations.value.find(conv => conv.id === conversationId);
    if (!conversation) {
      // Still update sidebar badge even if conversation not found locally
      await sidebarStore.updateUnreadMessageCount(currentUser.value.id);
      return;
    }


    // Get unread count from store for this specific conversation
    const count = await updateUnreadCountForConversationStore(conversationId, currentUser.value.id);

    // Update conversation unread count
    conversationUnreadCounts.value[conversationId] = count;

    // If conversation has an item_id, recalculate item unread count
    if (conversation.item_id) {
      const itemId = conversation.item_id;
      const itemConversations = supportConversations.value.filter(conv => conv.item_id === itemId);
      let totalUnread = 0;

      for (const conv of itemConversations) {
        totalUnread += conversationUnreadCounts.value[conv.id] || 0;
      }

      unreadMessageCounts.value[itemId] = totalUnread;
    }

    // Always update sidebar store with fresh total count (includes both item and direct messages)
    await sidebarStore.updateUnreadMessageCount(currentUser.value.id);
  } catch (error) {
    console.error('[SupportInbox] Error updating unread count:', error);
  }
};

// Setup real-time subscription for messages
const setupMessagesRealtimeSubscription = () => {
  messagesSubscription = supabase
    .channel('messages-changes')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      },
      async (payload) => {
        const message = payload.new as any;
        await updateUnreadCountForConversation(message.conversation_id);
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
      },
      async (payload) => {
        const message = payload.new as any;
        await updateUnreadCountForConversation(message.conversation_id);
      }
    )
    .subscribe();
};

// Cleanup real-time subscription
const cleanupMessagesSubscription = () => {
  if (messagesSubscription) {
    supabase.removeChannel(messagesSubscription);
    messagesSubscription = null;
  }
};

onMounted(async () => {
  await getCurrentUser();
  // Load items and conversations
  await loadItems();
  openInbox();

  // Setup real-time subscription for messages
  setupMessagesRealtimeSubscription();
});

onBeforeUnmount(() => {
  // Cleanup subscriptions when component unmounts
  closeInbox();
  cleanupMessagesSubscription();
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
              <h1 class="text-h5 text-sm-h4 font-weight-bold text-green-darken-4 mb-2">
                {{ pageTitle }}
              </h1>
              <p>
                {{ pageDescription }}
              </p>
              <!-- Mark All as Read Button -->
              <v-btn
                v-if="sidebarStore.hasUnreadMessages"
                color="primary"
                variant="tonal"
                class="mt-4"
                prepend-icon="mdi-email-check"
                @click="handleMarkAllAsRead"
              >
                Mark All {{ sidebarStore.totalUnreadMessages }} Message{{ sidebarStore.totalUnreadMessages > 1 ? 's' : '' }} as Read
              </v-btn>
            </div>
          </v-col>
        </v-row>

        <!-- Support Inbox Content -->
        <v-row>
          <v-col cols="12">
            <!-- Show Items Grid and Direct Messages when no specific item is selected and not in direct messages view -->
            <div v-if="!selectedItem && viewMode === 'items'">
              <!-- Items with Support Requests Section -->
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
                    {{ filteredAndSortedItems.length }} of {{ itemsWithConversations.length }} {{ itemsWithConversations.length === 1 ? 'Item' : 'Items' }}
                  </v-chip>
                </v-card-title>

                <!-- Filter Header for Items -->
                <FilterHeader
                  :search-query="searchQuery"
                  :sort-by="sortBy"
                  :view-mode="itemViewMode"
                  :loading="loadingItems"
                  :total-items="itemsWithConversations.length"
                  :filtered-items="filteredAndSortedItems.length"
                  @update:search-query="handleSearchChange"
                  @update:sort-by="handleSortChange"
                  @update:view-mode="handleItemViewModeChange"
                  @clear-filters="handleClearFilters"
                />

                <!-- Items Display -->
                <div v-if="!loadingItems && itemsWithConversations.length > 0">
                  <!-- Table View -->
                  <ItemsDataTable
                    v-if="itemViewMode === 'table'"
                    :items="filteredAndSortedItems"
                    :loading="loadingItems"
                    :search="searchQuery"
                    :unread-counts="unreadMessageCounts"
                    :conversation-counts="itemConversationCounts"
                    @view-item="selectItem"
                    @mark-as-read="handleMarkItemAsRead"
                  />

                  <!-- Card View -->
                  <ItemsCardView
                    v-else
                    :items="filteredAndSortedItems"
                    :unread-counts="unreadMessageCounts"
                    :conversation-counts="itemConversationCounts"
                    @item-click="selectItem"
                    @mark-as-read="handleMarkItemAsRead"
                  />
                </div>

                <!-- Loading State -->
                <div v-else-if="loadingItems" class="text-center py-12">
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

                <!-- No Filtered Results -->
                <div v-else-if="filteredAndSortedItems.length === 0" class="text-center py-12">
                  <v-icon size="80" color="grey-lighten-1" class="mb-4">
                    mdi-magnify
                  </v-icon>
                  <h3 class="text-h5 text-grey-darken-1 mb-2">
                    No Items Found
                  </h3>
                  <p class="text-body-1 text-grey-darken-2 mb-4">
                    No items match your current filters. Try adjusting your search or filters.
                  </p>
                  <v-btn
                    color="primary"
                    variant="outlined"
                    @click="handleClearFilters"
                  >
                    Clear Filters
                  </v-btn>
                </div>
              </v-card>

              <!-- Direct Messages Card -->
              <v-card elevation="2" class="pa-4">
                <v-card-title class="text-h5 font-weight-bold mb-4 d-flex align-center">
                  <v-icon class="me-2" color="info">mdi-account-message</v-icon>
                  Direct Messages
                  <v-spacer />
                </v-card-title>

                <!-- Filter Header for Users -->
                <FilterHeader
                  :search-query="searchQuery"
                  :sort-by="sortBy"
                  :view-mode="userViewMode"
                  :loading="loadingSupportConversations"
                  :total-items="usersWithDirectMessages.length"
                  :filtered-items="filteredAndSortedUsers.length"
                  @update:search-query="handleSearchChange"
                  @update:sort-by="handleSortChange"
                  @update:view-mode="handleUserViewModeChange"
                  @clear-filters="handleClearFilters"
                />

                <!-- Users Display -->
                <div v-if="!loadingSupportConversations && usersWithDirectMessages.length > 0">
                  <!-- Table View -->
                  <UsersDataTable
                    v-if="userViewMode === 'table'"
                    :users="filteredAndSortedUsers"
                    :loading="loadingSupportConversations"
                    :search="searchQuery"
                    @view-user="selectUser"
                    @mark-as-read="handleMarkUserAsRead"
                  />

                  <!-- Card View -->
                  <UsersCardView
                    v-else
                    :users="filteredAndSortedUsers"
                    @user-click="selectUser"
                    @mark-as-read="handleMarkUserAsRead"
                  />
                </div>

                <!-- Loading State -->
                <div v-else-if="loadingSupportConversations" class="text-center py-12">
                  <v-progress-circular indeterminate color="primary" size="48" />
                  <p class="text-body-1 mt-4">Loading direct messages...</p>
                </div>

                <!-- Empty State -->
                <div v-else-if="directMessageConversationCount === 0" class="text-center py-12">
                  <v-icon size="48" color="grey-lighten-1" class="mb-4">mdi-message-text</v-icon>
                  <h3 class="text-h6 text-grey-darken-1 mb-2">No direct conversation initiated</h3>
                  <p class="text-body-2 text-grey-darken-2 mb-0">No students have started a direct message yet.</p>
                </div>

                <!-- Single Direct Messages Card -->
                <v-row v-else>
                  <v-col cols="12" sm="6" md="4" lg="3">
                    <v-card
                      class="item-card h-100"
                      elevation="2"
                      hover
                      @click="viewMode = 'direct-messages'; selectedUser = null; loadSupportConversations(1)"
                    >
                      <v-card-title class="d-flex justify-space-between align-start pb-2">
                        <div class="d-flex align-center gap-1">
                          <!-- Unread Messages Badge -->
                          <v-badge
                            v-if="getDirectMessageUnreadCount() > 0"
                            :content="getDirectMessageUnreadCount()"
                            color="error"
                            inline
                            class="me-2"
                          >
                            <v-icon color="error" size="20">mdi-email-alert</v-icon>
                          </v-badge>
                          <v-chip
                            color="info"
                            size="x-small"
                            variant="flat"
                          >
                            DIRECT MESSAGES
                          </v-chip>
                        </div>
                      </v-card-title>

                      <v-card-text>
                        <p class="text-body-2 text-grey-darken-1 mb-3" style="min-height: 60px;">
                          <span class="text-caption">
                            General support conversations not related to specific items
                          </span>
                        </p>

                        <v-divider class="my-3" />

                        <div class="d-flex align-center justify-space-between">
                          <div class="d-flex flex-column">
                            <div class="d-flex align-center text-caption text-grey-darken-1 mb-1">
                              <v-icon size="16" class="me-1">mdi-message-text</v-icon>
                              {{ directMessageConversationCount }}
                              {{ directMessageConversationCount === 1 ? 'conversation' : 'conversations' }}
                            </div>
                          </div>
                          <v-btn
                            color="info"
                            variant="text"
                            size="small"
                            append-icon="mdi-chevron-right"
                          >
                            View
                          </v-btn>
                        </div>

                        <!-- Latest Message Date -->
                        <div class="d-flex align-center text-caption text-grey mt-2">
                          <v-icon size="14" class="me-1">mdi-clock-outline</v-icon>
                          {{ directMessageConversations.length > 0 ? new Date(Math.max(...directMessageConversations.map(c => new Date(c.created_at).getTime()))).toLocaleDateString() : 'N/A' }}
                        </div>
                      </v-card-text>
                    </v-card>
                  </v-col>
                </v-row>
              </v-card>
            </div>

            <!-- Show Direct Messages View -->
            <div v-else-if="viewMode === 'direct-messages'">
              <v-card elevation="2" class="pa-4">
                <!-- Back Button and Header -->
                <div class="d-flex align-center mb-4">
                  <v-btn
                    icon="mdi-arrow-left"
                    variant="text"
                    @click="backToMainView"
                  />
                  <div class="flex-grow-1">
                    <div class="d-flex align-center">
                      <v-chip
                        color="info"
                        size="large"
                        variant="flat"
                        class="ml-3"
                      >
                        <v-icon start>mdi-lifebuoy</v-icon>
                        DIRECT MESSAGES
                      </v-chip>
                    </div>
                  </div>
                </div>

                <v-divider class="mb-4" />

                <v-card-title class="text-h6 font-weight-bold mb-4 d-flex align-center px-0">
                  <v-icon class="me-2" color="info">mdi-inbox</v-icon>
                  All Direct Messages
                  <v-spacer />
                </v-card-title>

                <!-- Loading State -->
                <div v-if="loadingSupportConversations && supportConversations.length === 0" class="text-center py-12">
                  <v-progress-circular indeterminate color="primary" size="48" />
                  <p class="text-body-1 mt-4">Loading direct messages...</p>
                </div>

                <!-- Empty State -->
                <div
                  v-else-if="!loadingSupportConversations && filteredConversations.length === 0"
                  class="text-center py-12"
                >
                  <v-icon size="80" color="grey-lighten-1" class="mb-4">
                    mdi-message-outline
                  </v-icon>
                  <h3 class="text-h5 text-grey-darken-1 mb-2">
                    No Direct Messages
                  </h3>
                  <p class="text-body-1 text-grey-darken-2 mb-4">
                    No direct messages found.
                  </p>
                  <v-btn
                    color="info"
                    variant="outlined"
                    prepend-icon="mdi-arrow-left"
                    @click="backToMainView"
                  >
                    Back to Main View
                  </v-btn>
                </div>

                <!-- Direct Messages Inbox -->
                <div v-else>
                  <!-- Same structure as item-based conversations but for direct messages -->
                  <div class="support-inbox-container">
                    <!-- Conversations List -->
                    <v-row>
                      <v-col cols="12" md="4">
                        <v-card variant="outlined" class="conversation-list">
                          <v-card-title class="text-h6 py-3 px-4 border-b d-flex justify-space-between align-center">
                            <div class="d-flex align-center">
                              <v-icon class="me-2">mdi-forum</v-icon>
                              Conversations
                            </div>
                          </v-card-title>

                          <div v-if="loadingSupportConversations" class="pa-4 text-center">
                            <v-progress-circular indeterminate color="primary" size="24" />
                            <p class="text-caption mt-2">Loading...</p>
                          </div>

                          <div v-else class="pa-2">
                            <v-card
                              v-for="conversation in filteredConversations"
                              :key="conversation.id"
                              @click="selectSupportConversation(conversation)"
                              :class="{
                                'conversation-card-active': selectedSupportConversation?.id === conversation.id,
                                'conversation-card': true
                              }"
                              class="mb-3 pa-3"
                              elevation="2"
                              hover
                            >
                              <!-- Sender Information Header -->
                              <div class="d-flex align-start mb-2">
                                <v-badge
                                  v-if="conversationUnreadCounts[conversation.id] > 0"
                                  :content="conversationUnreadCounts[conversation.id]"
                                  color="error"
                                  overlap
                                >
                                  <v-avatar
                                    color="info"
                                    size="40"
                                    class="me-2"
                                  >
                                    <span class="text-white font-weight-bold">
                                      {{ getConversationInitials(conversation) }}
                                    </span>
                                  </v-avatar>
                                </v-badge>
                                <v-avatar
                                  v-else
                                  color="info"
                                  size="40"
                                  class="me-2"
                                >
                                  <span class="text-white font-weight-bold">
                                    {{ getConversationInitials(conversation) }}
                                  </span>
                                </v-avatar>

                                <div class="flex-grow-1" style="min-width: 0;">
                                  <div class="d-flex align-center justify-space-between mb-1">
                                    <h3 class="text-subtitle-1 font-weight-bold text-truncate" style="max-width: 200px;">
                                      {{ conversationDisplayNames[conversation.id] || 'Loading...' }}
                                    </h3>
                                    <div class="d-flex align-center flex-shrink-0">
                                      <!-- Unread indicator -->
                                      <v-icon
                                        v-if="conversationUnreadCounts[conversation.id] > 0"
                                        color="error"
                                        size="16"
                                        class="me-1"
                                      >
                                        mdi-circle
                                      </v-icon>
                                    </div>
                                  </div>

                                  <!-- Typing indicator or message preview -->
                                  <div class="text-caption text-grey-darken-1 mb-1">
                                    <span v-if="conversationTypingStatus[conversation.id]?.isTyping" class="text-primary">
                                      typing...
                                    </span>
                                    <span v-else class="text-truncate d-block">
                                      Direct message to admin support
                                    </span>
                                  </div>

                                  <!-- Date -->
                                  <div class="text-caption text-grey d-flex align-center">
                                    <v-icon size="12" class="me-1">mdi-clock-outline</v-icon>
                                    {{ new Date(conversation.created_at).toLocaleDateString() }}
                                  </div>
                                </div>
                              </div>
                            </v-card>
                          </div>

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

                      <!-- Messages Area for Direct Messages -->
                      <v-col cols="12" md="8">
                        <v-card variant="outlined" class="messages-area">
                          <v-card-title v-if="selectedSupportConversation" class="py-4 px-4 border-b">
                            <div class="d-flex flex-column w-100">
                              <!-- User Info Header -->
                              <div class="d-flex align-center mb-3">
                                <v-avatar
                                  color="info"
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

                              <!-- Direct Message Card -->
                              <v-card variant="tonal" color="info" class="pa-3">
                                <div class="d-flex align-center">
                                  <v-chip color="info" variant="elevated" class="font-weight-bold">
                                    <v-icon start>mdi-lifebuoy</v-icon>
                                    GENERAL SUPPORT
                                  </v-chip>
                                </div>
                                <div class="text-body-2 mt-2">
                                  Direct conversation with student - No specific item involved
                                </div>
                              </v-card>
                            </div>
                          </v-card-title>

                          <v-card-title v-else class="text-h6 py-3 px-4 border-b text-center text-grey">
                            <v-icon class="me-2">mdi-message-outline</v-icon>
                            Select a direct message conversation to view
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
                                  @input="handleTyping"
                                />
                              </v-form>
                            </div>
                          </template>

                          <!-- No conversation selected state -->
                          <div v-else class="pa-8 text-center">
                            <v-icon size="60" color="grey-lighten-2">mdi-message-outline</v-icon>
                            <p class="text-h6 text-grey mt-4">Select a direct message to start responding</p>
                          </div>
                        </v-card>
                      </v-col>
                    </v-row>
                  </div>
                </div>
              </v-card>
            </div>

            <!-- Show User Messages View -->
            <div v-else-if="viewMode === 'user-messages' && selectedUser">
              <v-card elevation="2" class="pa-4">
                <!-- Back Button and User Info Header -->
                <div class="d-flex align-center mb-4">
                  <v-btn
                    icon="mdi-arrow-left"
                    variant="text"
                    @click="backToUsers"
                  />
                  <div class="flex-grow-1">
                    <div class="d-flex align-center">
                      <v-avatar
                        color="info"
                        size="40"
                        class="me-3"
                      >
                        <span class="text-white font-weight-bold">
                          {{ selectedUser.full_name ? selectedUser.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 2) : 'U' }}
                        </span>
                      </v-avatar>
                      <div>
                        <h2 class="text-h5 font-weight-bold">{{ selectedUser.full_name || 'Unknown User' }}</h2>
                        <p class="text-body-2 text-grey-darken-1 mb-0">{{ selectedUser.email || 'No email' }}</p>
                      </div>
                      <v-chip
                        color="info"
                        size="small"
                        variant="flat"
                        class="ml-3"
                      >
                        <v-icon start>mdi-account-message</v-icon>
                        DIRECT MESSAGES
                      </v-chip>
                    </div>
                  </div>
                </div>

                <v-divider class="mb-4" />

                <v-card-title class="text-h6 font-weight-bold mb-4 d-flex align-center px-0">
                  <v-icon class="me-2" color="info">mdi-inbox</v-icon>
                  Messages from {{ selectedUser.full_name || 'User' }}
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
                  <p class="text-body-1 mt-4">Loading user messages...</p>
                </div>

                <!-- Empty State -->
                <div
                  v-else-if="!loadingSupportConversations && filteredConversations.length === 0"
                  class="text-center py-12"
                >
                  <v-icon size="80" color="grey-lighten-1" class="mb-4">
                    mdi-message-outline
                  </v-icon>
                  <h3 class="text-h5 text-grey-darken-1 mb-2">
                    No Messages from {{ selectedUser.full_name || 'User' }}
                  </h3>
                  <p class="text-body-1 text-grey-darken-2 mb-4">
                    This user hasn't sent any messages yet.
                  </p>
                  <v-btn
                    color="info"
                    variant="outlined"
                    prepend-icon="mdi-arrow-left"
                    @click="backToUsers"
                  >
                    Back to Users
                  </v-btn>
                </div>

                <!-- User Messages Inbox -->
                <div v-else>
                  <div class="support-inbox-container">
                    <!-- Conversations List -->
                    <v-row>
                      <v-col cols="12" md="4">
                        <v-card variant="outlined" class="conversation-list">
                          <v-card-title class="text-h6 py-3 px-4 border-b d-flex justify-space-between align-center">
                            <div class="d-flex align-center">
                              <v-icon class="me-2">mdi-forum</v-icon>
                              Conversations
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
                                  color="info"
                                  size="40"
                                >
                                  <span class="text-white font-weight-bold">
                                    {{ getConversationInitials(conversation) }}
                                  </span>
                                </v-avatar>
                              </template>

                              <!-- Main Content -->
                              <div class="d-flex flex-column">
                                <div class="d-flex align-center justify-space-between mb-1">
                                  <span class="text-subtitle-2 font-weight-bold">
                                    Direct Message
                                  </span>
                                  <span class="text-caption text-grey">
                                    {{ new Date(conversation.created_at).toLocaleDateString() }}
                                  </span>
                                </div>

                                <div class="text-body-2 text-grey-darken-1 mb-1">
                                  {{ conversation.latest_message?.message || 'No messages yet' }}
                                </div>

                                <div class="d-flex align-center text-caption text-grey">
                                  <v-icon size="14" class="me-1">mdi-message</v-icon>
                                  {{ conversation.message_count || 0 }} message{{ (conversation.message_count || 0) !== 1 ? 's' : '' }}
                                </div>
                              </div>

                              <template v-slot:append>
                                <div class="d-flex flex-column align-center">
                                  <v-badge
                                    v-if="conversationUnreadCounts[conversation.id] > 0"
                                    :content="conversationUnreadCounts[conversation.id]"
                                    color="error"
                                    inline
                                  >
                                    <v-icon color="error" size="20">mdi-email-alert</v-icon>
                                  </v-badge>
                                  <div
                                    v-if="conversationTypingStatus[conversation.id]"
                                    class="typing-indicator mt-1"
                                  >
                                    <span class="text-caption text-info">typing...</span>
                                  </div>
                                </div>
                              </template>
                            </v-list-item>
                          </v-list>

                          <!-- Pagination Controls -->
                          <v-divider />
                          <div class="pa-3">
                            <div class="d-flex justify-space-between align-center">
                              <div class="text-caption text-grey">
                                Page {{ currentPage }} of {{ totalPages }}
                              </div>
                              <div class="d-flex align-center">
                                <span class="text-caption me-2">Per page:</span>
                                <v-select
                                  :model-value="pageSize"
                                  @update:model-value="changePageSize"
                                  :items="[10, 25, 50]"
                                  density="compact"
                                  variant="outlined"
                                  hide-details
                                  style="max-width: 80px;"
                                />
                              </div>
                            </div>

                            <div class="d-flex justify-center mt-2">
                              <v-pagination
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
                                  color="info"
                                  size="48"
                                  class="me-3"
                                >
                                  <span class="text-white font-weight-bold">
                                    {{ selectedUser.full_name ? selectedUser.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 2) : 'U' }}
                                  </span>
                                </v-avatar>
                                <div>
                                  <h3 class="text-h6 font-weight-bold">{{ selectedUser.full_name || 'Unknown User' }}</h3>
                                  <p class="text-body-2 text-grey-darken-1 mb-0">{{ selectedUser.email || 'No email' }}</p>
                                </div>
                              </div>

                              <!-- General Support Card -->
                              <v-card variant="tonal" color="info" class="pa-3">
                                <div class="d-flex align-center">
                                  <v-icon class="me-2" color="info">mdi-lifebuoy</v-icon>
                                  <div>
                                    <div class="text-subtitle-2 font-weight-bold">General Support</div>
                                    <div class="text-body-2">Direct message conversation with student</div>
                                  </div>
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

                              <!-- Empty state when no messages -->
                              <div v-if="supportInboxMessages.length === 0" class="text-center py-8">
                                <v-icon size="48" color="grey-lighten-1" class="mb-3">mdi-message-outline</v-icon>
                                <p class="text-body-1 text-grey">No messages in this conversation yet.</p>
                              </div>
                            </div>

                            <!-- Typing Indicator -->
                            <div v-if="isOtherUserTyping" class="px-4 pb-2">
                              <div class="d-flex align-center">
                                <v-avatar size="24" color="info" class="me-2">
                                  <span class="text-caption text-white">{{ otherUserTypingName || 'User' }}</span>
                                </v-avatar>
                                <div class="typing-indicator">
                                  <span class="text-caption text-grey me-2">{{ otherUserTypingName || 'User' }} is typing</span>
                                  <div class="typing-dots">
                                    <span class="dot"></span>
                                    <span class="dot"></span>
                                    <span class="dot"></span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <!-- Message Input - Always visible when conversation is selected -->
                            <v-divider />
                            <div class="pa-4">
                              <v-form @submit.prevent="handleSendMessage">
                                <v-textarea
                                  v-model="newMessage"
                                  placeholder="Type your message here..."
                                  variant="outlined"
                                  rows="2"
                                  auto-grow
                                  max-rows="4"
                                  :loading="sendingSupportInboxMessage"
                                  @input="handleTyping"
                                >
                                  <template v-slot:append-inner>
                                    <v-btn
                                      :disabled="!newMessage.trim() || sendingSupportInboxMessage"
                                      color="primary"
                                      variant="flat"
                                      size="small"
                                      icon="mdi-send"
                                      @click="handleSendMessage"
                                    />
                                  </template>
                                </v-textarea>
                              </v-form>
                            </div>
                          </template>

                          <!-- No conversation selected state -->
                          <div v-else class="pa-8 text-center">
                            <v-icon size="60" color="grey-lighten-2">mdi-message-outline</v-icon>
                            <p class="text-h6 text-grey mt-4">Select a conversation to view messages</p>
                          </div>
                        </v-card>
                      </v-col>
                    </v-row>
                  </div>
                </div>
              </v-card>
            </div>

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

.conversation-card {
  cursor: pointer;
  transition: all 0.3s ease;
  border: 2px solid transparent;
}

.conversation-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
  border-color: rgba(var(--v-theme-info), 0.3);
}

.conversation-card-active {
  background-color: rgba(var(--v-theme-info), 0.1) !important;
  border-color: rgb(var(--v-theme-info)) !important;
  box-shadow: 0 4px 16px rgba(var(--v-theme-info), 0.3) !important;
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

/* Typing Indicator Styles */
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

.typing-dots .dot:nth-child(1) {
  animation-delay: 0s;
}

.typing-dots .dot:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-dots .dot:nth-child(3) {
  animation-delay: 0.4s;
}

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
