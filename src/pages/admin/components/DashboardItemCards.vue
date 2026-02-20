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
  updateTitle: [itemId: number, newTitle: string]
}>()

// State for editing description
const isEditingDescription = ref(false)
const editedDescription = ref('')
const updatingDescription = ref(false)

// State for editing title
const isEditingTitle = ref(false)
const editedTitle = ref('')
const updatingTitle = ref(false)

// State for edit dialog
const showEditDialog = ref(false)
const editingField = ref<'title' | 'description' | 'both'>('both')

// Watch for changes in the item to reset editing state
watch(() => props.item, (newItem) => {
  if (newItem) {
    editedDescription.value = newItem.description
    editedTitle.value = newItem.title
    isEditingDescription.value = false
    isEditingTitle.value = false
  }
}, { immediate: true })



// Start editing title
const startEditingTitle = () => {
  editedTitle.value = props.item.title
  editedDescription.value = props.item.description
  editingField.value = 'title'
  showEditDialog.value = true
}

// Open edit dialog for both fields
const openEditDialog = () => {
  editedTitle.value = props.item.title
  editedDescription.value = props.item.description
  editingField.value = 'both'
  showEditDialog.value = true
}

// Cancel editing
const cancelEditing = () => {
  editedDescription.value = props.item.description
  editedTitle.value = props.item.title
  showEditDialog.value = false
  updatingDescription.value = false
  updatingTitle.value = false
}

// Save changes from dialog
const saveChanges = async () => {
  const titleChanged = editedTitle.value.trim() !== props.item.title.trim()
  const descriptionChanged = editedDescription.value.trim() !== props.item.description.trim()

  if (!titleChanged && !descriptionChanged) {
    showEditDialog.value = false
    return
  }

  try {
    if (titleChanged) {
      updatingTitle.value = true
      emit('updateTitle', props.item.id, editedTitle.value.trim())
    }

    if (descriptionChanged) {
      updatingDescription.value = true
      emit('updateDescription', props.item.id, editedDescription.value.trim())
    }

    // Wait a bit for the updates to complete
    setTimeout(() => {
      updatingDescription.value = false
      updatingTitle.value = false
      showEditDialog.value = false
    }, 1000)
  } catch (error) {
    console.error('Error updating item:', error)
    updatingDescription.value = false
    updatingTitle.value = false
  }
}

// Start editing description (opens dialog)
const startEditingDescription = () => {
  editedTitle.value = props.item.title
  editedDescription.value = props.item.description
  editingField.value = 'description'
  showEditDialog.value = true
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
      <div class="d-flex align-center flex-grow-1">
        <div class="text-h6 font-weight-bold flex-grow-1">{{ item.title }}</div>
        <v-btn
          icon="mdi-pencil"
          size="x-small"
          variant="text"
          class="ml-2"
          @click="openEditDialog"
          :disabled="isUpdating"
        />
      </div>

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
      <!-- Description Display -->
      <div class="description-display mb-3">
        <div class="d-flex align-center justify-space-between">
          <p class="text-body-2 mb-0 flex-grow-1">{{ item.description }}</p>

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

    <!-- Edit Dialog -->
    <v-dialog v-model="showEditDialog" max-width="600" persistent>
      <v-card>
        <v-card-title class="d-flex align-center justify-space-between">
          <span class="text-h5">Edit Item</span>
          <v-btn
            icon="mdi-close"
            variant="text"
            @click="cancelEditing"
            :disabled="updatingTitle || updatingDescription"
          />
        </v-card-title>

        <v-card-text class="pb-0">
          <v-form>
            <!-- Title Field -->
            <v-text-field
              v-model="editedTitle"
              label="Title"
              variant="outlined"
              density="comfortable"
              :loading="updatingTitle"
              :disabled="updatingTitle || updatingDescription"
              class="mb-4"
            />

            <!-- Description Field -->
            <v-textarea
              v-model="editedDescription"
              label="Description"
              variant="outlined"
              density="comfortable"
              rows="4"
              auto-grow
              :loading="updatingDescription"
              :disabled="updatingTitle || updatingDescription"
            />
          </v-form>
        </v-card-text>

        <v-card-actions class="px-6 pb-6">
          <v-spacer />
          <v-btn
            variant="text"
            @click="cancelEditing"
            :disabled="updatingTitle || updatingDescription"
          >
            Cancel
          </v-btn>
          <v-btn
            color="primary"
            variant="flat"
            @click="saveChanges"
            :loading="updatingTitle || updatingDescription"
            prepend-icon="mdi-check"
          >
            Save Changes
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
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

/* Hover edit styles */
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
</style>
