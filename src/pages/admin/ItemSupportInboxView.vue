<script setup lang="ts">
import { onMounted, onBeforeUnmount, computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import InnerLayoutWrapper from '@/layouts/InnerLayoutWrapper.vue';
import ItemSupportInbox from '@/pages/admin/components/ItemSupportInbox.vue';
import { supabase } from '@/lib/supabase';
import { loadItems as loadItemsFromStore, updateUnreadCountForConversation as updateUnreadCountForConversationStore } from '@/stores/messages';
import { useSidebarStore } from '@/stores/sidebar';
import { getUserDetails } from '@/stores/adminSupport';
import { useAuth } from '@/pages/admin/components/composables/useAuth';
import { useAdminSupportInbox } from '@/pages/admin/components/composables/useAdminSupportInbox';

const route = useRoute();
const router = useRouter();

// Auth
const { currentUser, getCurrentUser } = useAuth();

// Admin Support Inbox composable
const {
  supportConversations,
  selectedConversation: selectedSupportConversation,
  messages: supportInboxMessages,
  loadingConversations: loadingSupportConversations,
  loadingMessages: loadingSupportMessages,
  sendingMessage: sendingSupportInboxMessage,
  unreadCounts: conversationUnreadCounts,
  isOtherUserTyping,
  otherUserTypingName,
  conversationTypingStatus,
  currentPage,
  pageSize,
  totalCount,
  totalPages,
  openInbox,
  closeInbox,
  selectConversation: selectSupportConversation,
  sendMessageToStudent,
  loadSupportConversations,
  handleTyping,
  goToPage,
  changePageSize,
} = useAdminSupportInbox(currentUser);

const sidebarStore = useSidebarStore();

// Item state
const selectedItem = ref<any>(null);
const loadingItem = ref(false);

// New message
const newMessage = ref('');

// Real-time subscription
let messagesSubscription: any = null;

// Computed: filter conversations for the selected item
const filteredConversations = computed(() => {
  if (!selectedItem.value) return [];
  return supportConversations.value.filter(
    (conv) => conv.item_id === selectedItem.value.id
  );
});

// Display names cache
const conversationDisplayNames = ref<Record<string, string>>({});

const getDisplayNameId = (conversation: any) => {
  if (currentUser.value && conversation.sender_id === currentUser.value.id) {
    return conversation.receiver_id;
  }
  return conversation.sender_id;
};

const fetchAllConversationDisplayNames = async (conversations: any[]) => {
  for (const conv of conversations) {
    const displayNameId = getDisplayNameId(conv);
    if (!conversationDisplayNames.value[conv.id]) {
      const user = await getUserDetails(displayNameId);
      conversationDisplayNames.value[conv.id] = user?.email || 'No email';
    }
  }
};

watch(
  () => supportConversations.value,
  (newConvs) => {
    if (Array.isArray(newConvs)) {
      fetchAllConversationDisplayNames(newConvs);
    }
  },
  { immediate: true }
);

// Load the item by ID from route param
const loadItemById = async (itemId: number) => {
  loadingItem.value = true;
  try {
    const items = await loadItemsFromStore();
    selectedItem.value = items.find((i: any) => i.id === itemId) || null;
  } catch (error) {
    console.error('Error loading item:', error);
  } finally {
    loadingItem.value = false;
  }
};

// Unread count updater
const updateUnreadCountForConversation = async (conversationId: string) => {
  try {
    if (!currentUser.value) return;
    const count = await updateUnreadCountForConversationStore(conversationId, currentUser.value.id);
    conversationUnreadCounts.value[conversationId] = count;

    if (selectedItem.value) {
      const itemConversations = supportConversations.value.filter(
        (conv) => conv.item_id === selectedItem.value.id
      );
      // Update sidebar
    }
    await sidebarStore.updateUnreadMessageCount(currentUser.value.id);
  } catch (error) {
    console.error('Error updating unread count:', error);
  }
};

// Real-time subscription
const setupMessagesRealtimeSubscription = () => {
  messagesSubscription = supabase
    .channel('item-support-inbox-messages')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages' },
      async (payload) => {
        const message = payload.new as any;
        await updateUnreadCountForConversation(message.conversation_id);
      }
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'messages' },
      async (payload) => {
        const message = payload.new as any;
        await updateUnreadCountForConversation(message.conversation_id);
      }
    )
    .subscribe();
};

const cleanupMessagesSubscription = () => {
  if (messagesSubscription) {
    supabase.removeChannel(messagesSubscription);
    messagesSubscription = null;
  }
};

// Handlers
const handleSendMessage = async () => {
  if (newMessage.value.trim()) {
    await sendMessageToStudent(newMessage.value);
    newMessage.value = '';
  }
};

const handleBack = () => {
  router.push('/admin/support-inbox');
};

onMounted(async () => {
  await getCurrentUser();
  const itemId = Number((route.params as Record<string, string>).itemId);
  if (itemId) {
    await loadItemById(itemId);
  }
  openInbox();
  await loadSupportConversations(1);
  setupMessagesRealtimeSubscription();
});

onBeforeUnmount(() => {
  closeInbox();
  cleanupMessagesSubscription();
});
</script>

<template>
  <InnerLayoutWrapper>
    <template #content>
      <v-container fluid class="pa-6">
        <!-- Loading item state -->
        <div v-if="loadingItem" class="text-center py-16">
          <v-progress-circular indeterminate color="primary" size="48" />
          <p class="text-body-1 mt-4">Loading item...</p>
        </div>

        <!-- Item not found -->
        <v-card v-else-if="!selectedItem" elevation="2" class="pa-8 text-center">
          <v-icon size="80" color="grey-lighten-1" class="mb-4">mdi-package-variant-closed</v-icon>
          <h3 class="text-h5 text-grey-darken-1 mb-2">Item Not Found</h3>
          <p class="text-body-1 text-grey-darken-2 mb-4">
            The item you are looking for could not be found.
          </p>
          <v-btn color="primary" variant="outlined" prepend-icon="mdi-arrow-left" @click="handleBack">
            Back to Support Inbox
          </v-btn>
        </v-card>

        <!-- Item Support Inbox Component -->
        <ItemSupportInbox
          v-else
          v-model:new-message="newMessage"
          :selected-item="selectedItem"
          :filtered-conversations="filteredConversations"
          :support-conversations="supportConversations"
          :loading-support-conversations="loadingSupportConversations"
          :loading-support-messages="loadingSupportMessages"
          :sending-support-inbox-message="sendingSupportInboxMessage"
          :selected-support-conversation="selectedSupportConversation"
          :support-inbox-messages="supportInboxMessages"
          :conversation-unread-counts="conversationUnreadCounts"
          :conversation-display-names="conversationDisplayNames"
          :conversation-typing-status="conversationTypingStatus"
          :is-other-user-typing="isOtherUserTyping"
          :other-user-typing-name="otherUserTypingName"
          :current-user="currentUser"
          :current-page="currentPage"
          :page-size="pageSize"
          :total-count="totalCount"
          :total-pages="totalPages"
          @back="handleBack"
          @select-conversation="selectSupportConversation"
          @send-message="handleSendMessage"
          @refresh="loadSupportConversations(currentPage)"
          @go-to-page="goToPage"
          @change-page-size="changePageSize"
          @typing="handleTyping"
        />
      </v-container>
    </template>
  </InnerLayoutWrapper>
</template>
