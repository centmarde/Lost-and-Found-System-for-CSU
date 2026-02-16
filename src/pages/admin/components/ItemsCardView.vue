<template>
  <v-row>
    <v-col
      v-for="item in items"
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
        @click="$emit('itemClick', item)"
      >
        <v-card-title class="d-flex justify-space-between align-start pb-2">
          <div class="text-subtitle-1 font-weight-bold">{{ item.title }}</div>
          <div class="d-flex align-center gap-1">
            <!-- Unread Messages Badge -->
            <v-badge
              v-if="getUnreadCount(item.id) > 0"
              :content="getUnreadCount(item.id)"
              color="error"
              inline
              class="me-2"
            >
              <v-icon color="error" size="20">mdi-email-alert</v-icon>
            </v-badge>
            <v-chip
              :color="item.status === 'lost' ? 'error' : 'success'"
              size="x-small"
              variant="flat"
            >
              {{ item.status.toUpperCase() }}
            </v-chip>
          </div>
        </v-card-title>

        <v-card-text>
          <p class="text-body-2 text-grey-darken-1 mb-3" style="min-height: 60px;">
            {{ item.description.substring(0, 80) }}{{ item.description.length > 80 ? '...' : '' }}
          </p>

          <v-divider class="my-3" />

          <!-- Conversation Count and Unread Messages -->
          <div class="d-flex align-center justify-space-between">
            <div class="d-flex flex-column">
              <div class="d-flex align-center text-caption text-grey-darken-1 mb-1">
                <v-icon size="16" class="me-1">mdi-message-text</v-icon>
                {{ getConversationCount(item.id) }}
                {{ getConversationCount(item.id) === 1 ? 'conversation' : 'conversations' }}
              </div>
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

        <!-- Card Actions -->
        <v-card-actions class="pt-0">
          <v-spacer />
          <v-btn
            v-if="getUnreadCount(item.id) > 0"
            color="success"
            variant="outlined"
            size="small"
            prepend-icon="mdi-email-check"
            @click.stop="$emit('markAsRead', item)"
          >
            Mark as Read
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-col>
  </v-row>
</template>

<script setup lang="ts">
interface ItemsCardViewProps {
  items: any[];
  unreadCounts: Record<number, number>;
  conversationCounts: Record<number, number>;
}

interface ItemsCardViewEmits {
  (e: 'itemClick', item: any): void;
  (e: 'markAsRead', item: any): void;
}

const props = defineProps<ItemsCardViewProps>();
defineEmits<ItemsCardViewEmits>();

const getUnreadCount = (itemId: number): number => {
  return props.unreadCounts[itemId] || 0;
};

const getConversationCount = (itemId: number): number => {
  return props.conversationCounts[itemId] || 0;
};
</script>

<style scoped>
.item-card {
  cursor: pointer;
  transition: all 0.3s ease;
}

.item-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15) !important;
}
</style>
