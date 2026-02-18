<script lang="ts" setup>
import { ref, watch } from 'vue'
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
  conversationCount: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
  showClaimDialog: [item: Item]
  deleteItem: [item: Item]
  updateDescription: [itemId: number, newDescription: string]
}>()

// State for editing description
const isEditingDescription = ref(false)
const editedDescription = ref('')
const updatingDescription = ref(false)

// Watch for changes in the item to reset editing state
watch(() => props.item, (newItem) => {
  if (newItem) {
    editedDescription.value = newItem.description
    isEditingDescription.value = false
  }
}, { immediate: true })

// Start editing description
const startEditingDescription = () => {
  editedDescription.value = props.item.description
  isEditingDescription.value = true
}

// Cancel editing
const cancelEditing = () => {
  editedDescription.value = props.item.description
  isEditingDescription.value = false
}

// Save description
const saveDescription = async () => {
  if (editedDescription.value.trim() !== props.item.description.trim()) {
    updatingDescription.value = true
    try {
      emit('updateDescription', props.item.id, editedDescription.value.trim())
      // Wait a bit for the update to complete
      setTimeout(() => {
        updatingDescription.value = false
        isEditingDescription.value = false
      }, 1000)
    } catch (error) {
      console.error('Error updating description:', error)
      updatingDescription.value = false
    }
  } else {
    isEditingDescription.value = false
  }
}

const getItemStatusColor = (item: Item) => {
  if (item.claimed_by) return 'success'
  return item.status === 'lost' ? 'error' : 'info'
}

const getItemStatusText = (item: Item) => {
  if (item.claimed_by) return 'Claimed'
  return item.status === 'lost' ? 'Lost' : 'Found'
}

const getItemStatusIcon = (item: Item) => {
  if (item.claimed_by) return 'mdi-check-circle'
  return item.status === 'lost' ? 'mdi-alert-circle' : 'mdi-information'
}
</script>

<template>
  <v-card class="item-card h-100" elevation="2">
    <v-card-title class="d-flex justify-space-between align-start">
      <div class="text-h6 font-weight-bold">{{ item.title }}</div>
      <div class="d-flex align-center gap-2 flex-wrap">
        <!-- Conversation count chip -->
        <v-tooltip
          v-if="conversationCount > 0"
          location="top"
        >
          <template #activator="{ props }">
            <v-chip
              v-bind="props"
              color="primary"
              size="small"
              variant="tonal"
              prepend-icon="mdi-account-group"
            >
              {{ conversationCount }}
            </v-chip>
          </template>
          <span>{{ conversationCount }} {{ conversationCount === 1 ? 'person has' : 'people have' }} contacted about this item</span>
        </v-tooltip>

        <v-chip
          :color="getItemStatusColor(item)"
          size="small"
          variant="flat"
          :prepend-icon="getItemStatusIcon(item)"
        >
          {{ getItemStatusText(item) }}
        </v-chip>
        <v-btn
          icon="mdi-delete"
          size="small"
          color="error"
          variant="text"
          :loading="isUpdating"
          @click="$emit('deleteItem', item)"
        />
      </div>
    </v-card-title>

    <v-card-text>
      <!-- Editable Description Section -->
      <div v-if="!isEditingDescription" class="description-display mb-3">
        <div class="d-flex align-center justify-space-between">
          <p class="text-body-2 mb-0 flex-grow-1">{{ item.description }}</p>
          <v-btn
            icon="mdi-pencil"
            size="x-small"
            variant="text"
            class="ml-2"
            @click="startEditingDescription"
            :disabled="isUpdating"
          />
        </div>
      </div>

      <!-- Edit Mode -->
      <div v-else class="description-edit mb-3">
        <v-textarea
          v-model="editedDescription"
          label="Description"
          variant="outlined"
          density="compact"
          rows="3"
          auto-grow
          :loading="updatingDescription"
          :disabled="updatingDescription"
        />
        <div class="d-flex gap-2 mt-2">
          <v-btn
            size="small"
            color="success"
            variant="flat"
            prepend-icon="mdi-check"
            :loading="updatingDescription"
            @click="saveDescription"
          >
            Save
          </v-btn>
          <v-btn
            size="small"
            variant="text"
            prepend-icon="mdi-close"
            :disabled="updatingDescription"
            @click="cancelEditing"
          >
            Cancel
          </v-btn>
        </div>
      </div>

      <div class="d-flex align-center text-caption text-grey-darken-1">
        <v-icon size="16" class="me-1">mdi-clock-outline</v-icon>
        {{ formatDate(item.created_at) }}
      </div>
    </v-card-text>

    <v-card-actions class="pt-0 d-flex gap-2">
      <!-- Dashboard admin controls for managing item status -->
      <v-btn
        v-if="!item.claimed_by"
        color="success"
        variant="flat"
        size="small"
        prepend-icon="mdi-check"
        @click="$emit('showClaimDialog', item)"
        :loading="isUpdating"
      >
        Mark as Claimed
      </v-btn>
      <v-chip
        v-else
        color="success"
        variant="flat"
        size="small"
        prepend-icon="mdi-check-circle"
      >
        Item Claimed
      </v-chip>
    </v-card-actions>
  </v-card>
</template>

<style scoped>
.item-card {
  transition: transform 0.2s ease-in-out;
  border-radius: 12px;
}

.item-card:hover {
  transform: translateY(-2px);
}

.v-chip {
  border-radius: 8px;
}

.gap-2 {
  gap: 8px;
}

.v-btn--icon.v-btn--size-small {
  width: 32px;
  height: 32px;
}

/* Description editing styles */
.description-display {
  position: relative;
}

.description-display:hover .v-btn {
  opacity: 1;
}

.description-display .v-btn {
  opacity: 0.3;
  transition: opacity 0.2s ease;
}

.description-edit .v-textarea {
  margin-bottom: 0;
}
</style>
