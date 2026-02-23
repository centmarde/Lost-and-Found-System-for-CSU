<template>
  <v-data-table
    :headers="headers"
    :items="users"
    :loading="loading"
    :search="search"
    :expanded="expanded"
    :show-expand="true"
    item-value="id"
    class="elevation-2"
    @click:row="handleRowClick"
  >
    <!-- User Column with Avatar -->
    <template #item.user="{ item }">
      <div class="d-flex align-center">
        <v-avatar
          color="info"
          size="40"
          class="me-3"
        >
          <span class="text-white font-weight-bold">
            {{ item.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 2) }}
          </span>
        </v-avatar>
        <div>
          <div class="text-subtitle-1 font-weight-bold">{{ item.full_name }}</div>
          <div class="text-caption text-grey-darken-1">{{ item.email }}</div>
        </div>
      </div>
    </template>

    <!-- Messages Column -->
    <template #item.messages="{ item }">
      <div class="d-flex align-center gap-2">
        <v-badge
          v-if="item.unread_count > 0"
          :content="item.unread_count"
          color="error"
          inline
        >
          <v-icon color="error">mdi-email-alert</v-icon>
        </v-badge>
        <span class="text-body-2">
          {{ item.conversations.length }} conversation{{ item.conversations.length !== 1 ? 's' : '' }}
        </span>
      </div>
    </template>

    <!-- Type Column -->
    <template #item.type="{ item }">
      <v-chip
        color="info"
        size="small"
        variant="flat"
      >
        <v-icon start>mdi-lifebuoy</v-icon>
        DIRECT SUPPORT
      </v-chip>
    </template>

    <!-- Last Message Date -->
    <template #item.latest_message_date="{ item }">
      <div class="text-body-2">
        {{ new Date(item.latest_message_date).toLocaleDateString() }}
      </div>
    </template>

    <!-- Actions Column -->
    <template #item.actions="{ item }">
      <v-btn
        color="info"
        variant="text"
        size="small"
        @click.stop="$emit('viewUser', item)"
      >
        View Messages
      </v-btn>
    </template>

    <!-- Expanded Row Content -->
    <template #expanded-row="{ item }">
      <tr>
        <td :colspan="headers.length" class="pa-4">
          <v-card variant="tonal" color="info" class="pa-4">
            <v-card-title class="text-h6 mb-3">
              <v-icon class="me-2">mdi-account-message</v-icon>
              User Details & Direct Messages
            </v-card-title>

            <v-row>
              <v-col cols="12" md="6">
                <div class="mb-3">
                  <div class="text-subtitle-2 font-weight-bold mb-1">Contact Information</div>
                  <div class="d-flex align-center mb-2">
                    <v-icon class="me-2">mdi-account</v-icon>
                    <span class="text-body-2">{{ item.full_name }}</span>
                  </div>
                  <div class="d-flex align-center mb-2">
                    <v-icon class="me-2">mdi-email</v-icon>
                    <span class="text-body-2">{{ item.email }}</span>
                  </div>
                </div>

                <div class="mb-3">
                  <div class="text-subtitle-2 font-weight-bold mb-1">Message Type</div>
                  <div class="text-body-2 text-grey-darken-1">
                    General support conversations not related to specific items
                  </div>
                </div>
              </v-col>

              <v-col cols="12" md="6">
                <div class="mb-3">
                  <div class="text-subtitle-2 font-weight-bold mb-1">Conversation Statistics</div>
                  <div class="d-flex align-center gap-2 mb-2">
                    <v-icon>mdi-message-text</v-icon>
                    <span>{{ item.conversations.length }} total conversation{{ item.conversations.length !== 1 ? 's' : '' }}</span>
                  </div>
                  <div class="d-flex align-center gap-2 mb-2">
                    <v-icon>mdi-clock-outline</v-icon>
                    <span>Last message: {{ new Date(item.latest_message_date).toLocaleString() }}</span>
                  </div>
                </div>

                <div v-if="item.unread_count > 0" class="mb-3">
                  <div class="text-subtitle-2 font-weight-bold mb-1">Unread Messages</div>
                  <v-chip color="error" size="small" variant="flat">
                    <v-icon start>mdi-email-alert</v-icon>
                    {{ item.unread_count }} unread message{{ item.unread_count !== 1 ? 's' : '' }}
                  </v-chip>
                </div>

                <div class="d-flex gap-2 mt-4">
                  <v-btn
                    color="info"
                    variant="flat"
                    prepend-icon="mdi-forum"
                    @click="$emit('viewUser', item)"
                  >
                    Open Messages
                  </v-btn>

                  <v-btn
                    v-if="item.unread_count > 0"
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
          mdi-account-message-outline
        </v-icon>
        <h3 class="text-h5 text-grey-darken-1 mb-2">
          No Users Found
        </h3>
        <p class="text-body-1 text-grey-darken-2">
          No users match your current search criteria.
        </p>
      </div>
    </template>
  </v-data-table>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

interface UsersDataTableProps {
  users: any[];
  loading?: boolean;
  search?: string;
}

interface UsersDataTableEmits {
  (e: 'viewUser', user: any): void;
  (e: 'markAsRead', user: any): void;
}

const props = defineProps<UsersDataTableProps>();
defineEmits<UsersDataTableEmits>();

const expanded = ref<string[]>([]);

const headers = computed(() => [
  {
    title: 'User',
    key: 'user',
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
    title: 'Type',
    key: 'type',
    sortable: false,
    width: '180px'
  },
  {
    title: 'Last Message',
    key: 'latest_message_date',
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
  background-color: rgba(var(--v-theme-info), 0.05);
}

:deep(.v-data-table__expanded__content) {
  box-shadow: none !important;
}
</style>
