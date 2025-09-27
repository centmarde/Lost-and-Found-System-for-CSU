//NotificationDialog.vue
<script lang="ts" setup>
import { computed } from "vue";
import { formatDate } from "@/utils/helpers";

interface Notification {
  id: number;
  title: string;
  status: "lost" | "found";
  created_at: string;
  read: boolean;
}

interface Props {
  modelValue: boolean;
  notifications: Notification[];
}

const props = defineProps<Props>();

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  "mark-as-read": [id: number];
  "clear-all": [];
}>();

const unreadCount = computed(() => {
  return props.notifications.filter((n) => !n.read).length;
});

const sortedNotifications = computed(() => {
  return [...props.notifications].sort((a, b) => {
    // Unread first, then by date
    if (a.read !== b.read) {
      return a.read ? 1 : -1;
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
});

const getStatusIcon = (status: string) => {
  return status === "lost" ? "mdi-alert-circle" : "mdi-check-circle";
};

const getStatusColor = (status: string) => {
  return status === "lost" ? "error" : "success";
};

const handleMarkAsRead = (notification: Notification) => {
  if (!notification.read) {
    emit("mark-as-read", notification.id);
  }
};

const handleClearAll = () => {
  emit("clear-all");
};

const closeDialog = () => {
  emit("update:modelValue", false);
};
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    max-width="500px"
    scrollable
  >
    <v-card>
      <v-card-title class="d-flex align-center justify-space-between">
        <div class="d-flex align-center">
          <v-icon class="me-2" color="primary">mdi-bell</v-icon>
          Notifications
          <v-chip
            v-if="unreadCount > 0"
            color="error"
            size="small"
            variant="flat"
            class="ml-2"
          >
            {{ unreadCount }} new
          </v-chip>
        </div>
        <v-btn icon variant="text" size="small" @click="closeDialog">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>

      <v-divider />

      <v-card-text class="pa-0" style="max-height: 400px">
        <div v-if="notifications.length === 0" class="text-center py-8">
          <v-icon size="64" color="grey-lighten-1">mdi-bell-off</v-icon>
          <div class="text-h6 text-grey-darken-1 mt-2">
            No notifications yet
          </div>
          <div class="text-body-2 text-grey-darken-1">
            You'll be notified when admins post new items
          </div>
        </div>

        <v-list v-else class="py-0">
          <v-list-item
            v-for="notification in sortedNotifications"
            :key="notification.id"
            @click="handleMarkAsRead(notification)"
            :class="{ 'bg-blue-lighten-5': !notification.read }"
            class="notification-item"
          >
            <template #prepend>
              <v-avatar :color="getStatusColor(notification.status)" size="40">
                <v-icon :color="'white'">
                  {{ getStatusIcon(notification.status) }}
                </v-icon>
              </v-avatar>
            </template>

            <v-list-item-title class="d-flex align-center">
              <span class="flex-grow-1">{{ notification.title }}</span>
              <v-chip
                v-if="!notification.read"
                color="primary"
                size="x-small"
                dot
                class="ml-2"
              />
            </v-list-item-title>

            <v-list-item-subtitle
              class="d-flex align-center justify-space-between"
            >
              <span>
                <v-chip
                  :color="getStatusColor(notification.status)"
                  size="small"
                  variant="tonal"
                  class="me-2"
                >
                  {{ notification.status === "lost" ? "Lost" : "Found" }}
                </v-chip>
              </span>
              <span class="text-caption">
                {{ formatDate(notification.created_at) }}
              </span>
            </v-list-item-subtitle>
          </v-list-item>
        </v-list>
      </v-card-text>

      <v-divider v-if="notifications.length > 0" />

      <v-card-actions v-if="notifications.length > 0">
        <v-btn
          v-if="unreadCount > 0"
          color="primary"
          variant="text"
          size="small"
          @click="notifications.forEach((n) => !n.read && handleMarkAsRead(n))"
        >
          Mark all as read
        </v-btn>
        <v-spacer />
        <v-btn
          color="error"
          variant="text"
          size="small"
          @click="handleClearAll"
        >
          Clear all
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.notification-item {
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.notification-item:hover {
  background-color: rgba(0, 0, 0, 0.04);
}

.bg-blue-lighten-5 {
  background-color: rgba(33, 150, 243, 0.08);
}

.bg-blue-lighten-5:hover {
  background-color: rgba(33, 150, 243, 0.12);
}
</style>
