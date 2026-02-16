<template>
  <v-row>
    <v-col
      v-for="user in users"
      :key="user.id"
      cols="12"
      sm="6"
      md="4"
      lg="3"
    >
      <v-card
        class="user-card h-100"
        elevation="2"
        hover
        @click="$emit('userClick', user)"
      >
        <v-card-title class="d-flex justify-space-between align-start pb-2">
          <div class="d-flex align-center">
            <v-avatar
              color="info"
              size="40"
              class="me-2"
            >
              <span class="text-white font-weight-bold">
                {{ user.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 2) }}
              </span>
            </v-avatar>
            <div>
              <div class="text-subtitle-1 font-weight-bold">{{ user.full_name }}</div>
            </div>
          </div>
          <div class="d-flex align-center gap-1">
            <!-- Unread Messages Badge -->
            <v-badge
              v-if="user.unread_count > 0"
              :content="user.unread_count"
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
              DIRECT
            </v-chip>
          </div>
        </v-card-title>

        <v-card-text>
          <p class="text-body-2 text-grey-darken-1 mb-3" style="min-height: 60px;">
            {{ user.email }}<br/>
            <span class="text-caption">
              General support conversations not related to specific items
            </span>
          </p>

          <v-divider class="my-3" />

          <!-- Conversation Count and Unread Messages -->
          <div class="d-flex align-center justify-space-between">
            <div class="d-flex flex-column">
              <div class="d-flex align-center text-caption text-grey-darken-1 mb-1">
                <v-icon size="16" class="me-1">mdi-message-text</v-icon>
                {{ user.conversations.length }}
                {{ user.conversations.length === 1 ? 'conversation' : 'conversations' }}
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
            {{ new Date(user.latest_message_date).toLocaleDateString() }}
          </div>
        </v-card-text>

        <!-- Card Actions -->
        <v-card-actions class="pt-0">
          <v-spacer />
          <v-btn
            v-if="user.unread_count > 0"
            color="success"
            variant="outlined"
            size="small"
            prepend-icon="mdi-email-check"
            @click.stop="$emit('markAsRead', user)"
          >
            Mark as Read
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-col>
  </v-row>
</template>

<script setup lang="ts">
interface UsersCardViewProps {
  users: any[];
}

interface UsersCardViewEmits {
  (e: 'userClick', user: any): void;
  (e: 'markAsRead', user: any): void;
}

defineProps<UsersCardViewProps>();
defineEmits<UsersCardViewEmits>();
</script>

<style scoped>
.user-card {
  cursor: pointer;
  transition: all 0.3s ease;
}

.user-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15) !important;
}
</style>
