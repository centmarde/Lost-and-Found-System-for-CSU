<template>
  <v-data-table
    :headers="headers"
    :items="items"
    :loading="loading"
    :search="search"
    :expanded="expanded"
    :show-expand="true"
    item-value="id"
    class="elevation-2"
    @click:row="handleRowClick"
  >
    <!-- Status Column -->
    <template #item.status="{ item }">
      <v-chip
        :color="item.status === 'lost' ? 'error' : 'success'"
        size="small"
        variant="flat"
      >
        <v-icon start>
          {{ item.status === 'lost' ? 'mdi-help' : 'mdi-check-circle' }}
        </v-icon>
        {{ item.status.toUpperCase() }}
      </v-chip>
    </template>

    <!-- Title Column with Description Preview -->
    <template #item.title="{ item }">
      <div>
        <div class="text-subtitle-1 font-weight-bold mb-1">{{ item.title }}</div>
        <div class="text-caption text-grey-darken-1">
          {{ item.description.substring(0, 60) }}{{ item.description.length > 60 ? '...' : '' }}
        </div>
      </div>
    </template>

    <!-- Messages Column -->
    <template #item.messages="{ item }">
      <div class="d-flex align-center gap-2">
        <v-badge
          v-if="getUnreadCount(item.id) > 0"
          :content="getUnreadCount(item.id)"
          color="error"
          inline
        >
          <v-icon color="error">mdi-email-alert</v-icon>
        </v-badge>
        <span class="text-body-2">
          {{ getConversationCount(item.id) }} conversation{{ getConversationCount(item.id) !== 1 ? 's' : '' }}
        </span>
      </div>
    </template>

    <!-- Created Date Column -->
    <template #item.created_at="{ item }">
      <div class="text-body-2">
        {{ new Date(item.created_at).toLocaleDateString() }}
      </div>
    </template>

    <!-- Actions Column -->
    <template #item.actions="{ item }">
      <v-btn
        color="primary"
        variant="text"
        size="small"
        @click.stop="$emit('viewItem', item)"
      >
        View Details
      </v-btn>
    </template>

    <!-- Expanded Row Content -->
    <template #expanded-row="{ item }">
      <tr>
        <td :colspan="headers.length" class="pa-4">
          <v-card variant="tonal" class="pa-4">
            <v-card-title class="text-h6 mb-3">
              <v-icon class="me-2">mdi-package-variant</v-icon>
              Item Details
            </v-card-title>

            <v-row>
              <v-col cols="12" md="6">
                <div class="mb-3">
                  <div class="text-subtitle-2 font-weight-bold mb-1">Description</div>
                  <div class="text-body-2">{{ item.description }}</div>
                </div>

                <div class="mb-3">
                  <div class="text-subtitle-2 font-weight-bold mb-1">Status</div>
                  <v-chip
                    :color="item.status === 'lost' ? 'error' : 'success'"
                    size="small"
                    variant="flat"
                  >
                    {{ item.status.toUpperCase() }}
                  </v-chip>
                </div>

                <div class="mb-3">
                  <div class="text-subtitle-2 font-weight-bold mb-1">Created</div>
                  <div class="text-body-2">{{ new Date(item.created_at).toLocaleString() }}</div>
                </div>
              </v-col>

              <v-col cols="12" md="6">
                <div class="mb-3">
                  <div class="text-subtitle-2 font-weight-bold mb-1">Support Conversations</div>
                  <div class="d-flex align-center gap-2">
                    <v-icon>mdi-message-text</v-icon>
                    <span>{{ getConversationCount(item.id) }} active conversation{{ getConversationCount(item.id) !== 1 ? 's' : '' }}</span>
                  </div>
                </div>

                <div v-if="getUnreadCount(item.id) > 0" class="mb-3">
                  <div class="text-subtitle-2 font-weight-bold mb-1">Unread Messages</div>
                  <v-chip color="error" size="small" variant="flat">
                    <v-icon start>mdi-email-alert</v-icon>
                    {{ getUnreadCount(item.id) }} unread
                  </v-chip>
                </div>

                <div class="d-flex gap-2 mt-4">
                  <v-btn
                    color="primary"
                    variant="flat"
                    prepend-icon="mdi-forum"
                    @click="$emit('viewItem', item)"
                  >
                    View Conversations
                  </v-btn>

                  <v-btn
                    v-if="getUnreadCount(item.id) > 0"
                    color="success"
                    variant="outlined"
                    prepend-icon="mdi-email-check"
                    size="small"
                    @click="$emit('markAsRead', item)"
                  >
                    Mark as Read
                  </v-btn>
                </div>
              </v-col>
            </v-row>
          </v-card>
        </td>
      </tr>
    </template>

    <!-- No Data Slot -->
    <template #no-data>
      <div class="text-center py-12">
        <v-icon size="80" color="grey-lighten-1" class="mb-4">
          mdi-package-variant-closed
        </v-icon>
        <h3 class="text-h5 text-grey-darken-1 mb-2">
          No Items Found
        </h3>
        <p class="text-body-1 text-grey-darken-2">
          No items match your current search criteria.
        </p>
      </div>
    </template>
  </v-data-table>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

interface ItemsDataTableProps {
  items: any[];
  loading?: boolean;
  search?: string;
  unreadCounts: Record<number, number>;
  conversationCounts: Record<number, number>;
}

interface ItemsDataTableEmits {
  (e: 'viewItem', item: any): void;
  (e: 'markAsRead', item: any): void;
}

const props = defineProps<ItemsDataTableProps>();
defineEmits<ItemsDataTableEmits>();

const expanded = ref<string[]>([]);

const headers = computed(() => [
  {
    title: 'Status',
    key: 'status',
    sortable: true,
    width: '120px'
  },
  {
    title: 'Item Details',
    key: 'title',
    sortable: true,
    width: '40%'
  },
  {
    title: 'Messages',
    key: 'messages',
    sortable: false,
    width: '150px'
  },
  {
    title: 'Created Date',
    key: 'created_at',
    sortable: true,
    width: '150px'
  },
  {
    title: 'Actions',
    key: 'actions',
    sortable: false,
    width: '120px'
  }
]);

const getUnreadCount = (itemId: number): number => {
  return props.unreadCounts[itemId] || 0;
};

const getConversationCount = (itemId: number): number => {
  return props.conversationCounts[itemId] || 0;
};

const handleRowClick = (event: Event, { item }: { item: any }) => {
  // Toggle expanded state
  const itemIdString = String(item.id);
  const index = expanded.value.findIndex((id: string) => id === itemIdString);
  if (index > -1) {
    expanded.value.splice(index, 1);
  } else {
    expanded.value.push(itemIdString);
  }
};
</script>

<style scoped>
:deep(.v-data-table__tr--clickable:hover) {
  background-color: rgba(var(--v-theme-primary), 0.05);
}

:deep(.v-data-table__expanded__content) {
  box-shadow: none !important;
}
</style>
