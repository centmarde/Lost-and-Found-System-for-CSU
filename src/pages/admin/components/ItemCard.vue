<script lang="ts" setup>

import { formatDate } from '@/utils/helpers'


interface Item {
  id: number
  title: string
  description: string
  status: 'lost' | 'found'
  user_id: string
  claimed_by: string
  created_at: string
}

interface Props {
  item: Item
  isUpdating: boolean
}

defineProps<Props>()

defineEmits<{
  openConversations: [id: number]
  markAsUnclaimed: [id: number]
}>()

const getItemStatusColor = (item: Item) => {
  if (item.claimed_by) return 'success'
  return item.status === 'lost' ? 'error' : 'info'
}

const getItemStatusText = (item: Item) => {
  if (item.claimed_by) return 'Claimed'
  return item.status === 'lost' ? 'Lost' : 'Found'
}

</script>

<template>
  <v-card class="item-card h-100" elevation="2">
    <v-card-title class="d-flex justify-space-between align-start">
      <div class="text-h6 font-weight-bold">{{ item.title }}</div>
      <v-chip
        :color="getItemStatusColor(item)"
        size="small"
        variant="flat"
      >
        {{ getItemStatusText(item) }}
      </v-chip>
    </v-card-title>

    <v-card-text>
      <p class="text-body-2 mb-3">{{ item.description }}</p>
      <div class="d-flex align-center text-caption text-grey-darken-1">
        <v-icon size="16" class="me-1">mdi-clock-outline</v-icon>
        {{ formatDate(item.created_at) }}
      </div>
    </v-card-text>

    <v-card-actions class="pt-0">
      <v-spacer />
      <v-btn
        v-if="!item.claimed_by"
        color="primary"
        variant="flat"
        size="small"
        prepend-icon="mdi-message-text-outline"
        @click="$emit('openConversations', item.id)"
        :loading="isUpdating"
      >
        Open Conversations
      </v-btn>
      <v-btn
        v-else
        color="warning"
        variant="outlined"
        size="small"
        prepend-icon="mdi-undo"
        @click="$emit('markAsUnclaimed', item.id)"
        :loading="isUpdating"
      >
        Mark as Unclaimed
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<style scoped>
.item-card {
  transition: transform 0.2s ease-in-out;
}

.item-card:hover {
  transform: translateY(-2px);
}
</style>