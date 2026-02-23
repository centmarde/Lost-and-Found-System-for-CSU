<script lang="ts" setup>
import { ref, watch } from 'vue'
import { loadConversationsForItem } from '@/stores/conversation'
import { useNotificationsStore } from '@/stores/notificationsData'
import { useUserNotificationsStore } from '@/stores/userNotificationsData'

interface Item {
  id: number
  title: string
  description: string
  status: 'lost' | 'found'
  user_id: string
  claimed_by: string
  created_at: string
}

interface Conversation {
  id: string
  sender_id: string
  sender?: {
    id: string
    email: string
  }
}

interface Props {
  modelValue: boolean
  item: Item | null
  loading: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'claim-item': [itemId: number, claimedBy: string]
}>()

const conversations = ref<Conversation[]>([])
const loadingConversations = ref(false)
const selectedClaimant = ref<string>('')
const showConfirmDialog = ref(false)
const sendingNotification = ref(false)

// Initialize notification stores
const notificationsStore = useNotificationsStore()
const userNotificationsStore = useUserNotificationsStore()

// Load conversations when dialog opens using store function
const loadConversations = async (itemId: number) => {
  loadingConversations.value = true
  try {
    const conversationData = await loadConversationsForItem(itemId)

    // Get unique senders (people who contacted about this item)
    const uniqueSenders = new Map()
    conversationData?.forEach(conv => {
      uniqueSenders.set(conv.sender_id, conv)
    })

    conversations.value = Array.from(uniqueSenders.values())

  } catch (error) {
    console.error('Error loading conversations:', error)
    conversations.value = []
  } finally {
    loadingConversations.value = false
  }
}

// Watch for dialog opening
watch(
  () => ({ isOpen: props.modelValue, item: props.item }),
  ({ isOpen, item }) => {
    if (isOpen && item) {
      loadConversations(item.id)
      selectedClaimant.value = ''
    }
  }
)

const closeDialog = () => {
  emit('update:modelValue', false)
  conversations.value = []
  selectedClaimant.value = ''
  showConfirmDialog.value = false
  sendingNotification.value = false
}

const handleClaimClick = () => {
  if (selectedClaimant.value && props.item) {
    showConfirmDialog.value = true
  }
}

// Send notification to claimant about successful claim
const sendClaimNotification = async (claimantUserId: string, item: Item) => {
  sendingNotification.value = true
  try {
    // Create the notification
    const notificationResult = await notificationsStore.createNotification({
      title: `Item Claim Confirmed - ${item.title}`,
      description: `Great news! Your lost item "${item.title}" has been confirmed and is ready for pickup at the Lost & Found office. Please bring a valid ID when collecting your item. Office hours: Monday-Friday, 8:00 AM - 5:00 PM.`
    })

    if (notificationResult.data) {
      // Send notification to the specific user
      await userNotificationsStore.createUserNotification({
        user_id: claimantUserId,
        notification_id: notificationResult.data.id!,
        is_read: false
      })

      console.log('Claim notification sent successfully to user:', claimantUserId)
    } else {
      throw new Error('Failed to create notification')
    }
  } catch (error) {
    console.error('Error sending claim notification:', error)
    // Note: We don't block the claim process if notification fails
    // The admin should still be able to mark the item as claimed
  } finally {
    sendingNotification.value = false
  }
}

const confirmClaim = async () => {
  if (selectedClaimant.value && props.item) {
    // Send the claim notification first
    await sendClaimNotification(selectedClaimant.value, props.item)

    // Then emit the claim event
    emit('claim-item', props.item.id, selectedClaimant.value)
    closeDialog()
  }
}

const cancelConfirm = () => {
  showConfirmDialog.value = false
}

// Get selected user email for confirmation dialog
const getSelectedUserEmail = () => {
  const selectedConversation = conversations.value.find(conv => conv.sender_id === selectedClaimant.value)
  return selectedConversation?.sender?.email || 'Unknown User'
}
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    max-width="600px"
    persistent
  >
    <v-card>
      <v-card-title class="d-flex align-center">
        <v-icon class="me-2" color="success">mdi-check-circle</v-icon>
        Mark Item as Claimed
      </v-card-title>

      <v-card-subtitle v-if="item">
        {{ item.title }}
      </v-card-subtitle>

      <v-card-text>
        <div v-if="loadingConversations" class="text-center py-4">
          <v-progress-circular indeterminate color="primary" />
          <div class="mt-2">Loading people who contacted about this item...</div>
        </div>

        <div v-else-if="conversations.length === 0" class="text-center py-4">
          <v-icon size="48" color="grey-lighten-1">mdi-account-off</v-icon>
          <div class="text-h6 mt-2">No contacts found</div>
          <div class="text-body-2 text-grey-darken-1">
            No one has contacted about this item yet.
          </div>
        </div>

        <div v-else>
          <div class="text-subtitle-1 mb-3">
            Select the person who should be marked as the claimer:
          </div>

          <v-radio-group v-model="selectedClaimant">
            <v-radio
              v-for="conversation in conversations"
              :key="conversation.sender_id"
              :value="conversation.sender_id"
              color="success"
            >
              <template #label>
                <div class="d-flex align-center">
                  <v-avatar size="32" color="primary" class="me-3">
                    <span class="text-white text-body-2">
                      {{ conversation.sender?.email?.charAt(0).toUpperCase() || '?' }}
                    </span>
                  </v-avatar>
                  <div>
                    <div class="font-weight-medium">
                      {{ conversation.sender?.email || 'Unknown User' }}
                    </div>
                    <!-- <div class="text-caption text-grey-darken-1">
                      User ID: {{ conversation.sender_id }}
                    </div> -->
                  </div>
                </div>
              </template>
            </v-radio>
          </v-radio-group>
        </div>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn
          variant="text"
          @click="closeDialog"
        >
          Cancel
        </v-btn>
        <v-btn
          color="success"
          variant="flat"
          :disabled="!selectedClaimant || conversations.length === 0"
          :loading="loading"
          @click="handleClaimClick"
        >
          Mark as Claimed
        </v-btn>
      </v-card-actions>
    </v-card>

    <!-- Confirmation Dialog -->
    <v-dialog
      v-model="showConfirmDialog"
      max-width="500px"
      persistent
    >
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon class="me-2" color="warning">mdi-alert-circle</v-icon>
          Confirm Item Claim
        </v-card-title>

        <v-card-text>
          <div class="text-body-1 mb-4">
            Are you sure you want to mark this item as claimed?
          </div>

          <v-card
            variant="outlined"
            class="mb-4"
          >
            <v-card-text class="pb-2">
              <div class="d-flex align-center mb-2">
                <v-icon class="me-2" color="primary">mdi-package-variant</v-icon>
                <span class="font-weight-medium">Item:</span>
              </div>
              <div class="text-body-2 mb-3 ms-6">
                {{ item?.title }}
              </div>

              <div class="d-flex align-center mb-2">
                <v-icon class="me-2" color="success">mdi-account-check</v-icon>
                <span class="font-weight-medium">Claimant:</span>
              </div>
              <div class="text-body-2 ms-6">
                {{ getSelectedUserEmail() }}
              </div>
            </v-card-text>
          </v-card>

          <v-alert
            type="info"
            variant="tonal"
            class="mb-3"
          >
            <div class="text-body-2">
              <v-icon class="me-2" size="small">mdi-bell-outline</v-icon>
              A notification will be automatically sent to <strong>{{ getSelectedUserEmail() }}</strong> confirming that their lost item is ready for pickup at the office.
            </div>
          </v-alert>

          <v-alert
            type="warning"
            variant="tonal"
            class="mb-0"
          >
            <div class="text-body-2">
              <strong>Warning:</strong> This action cannot be undone. The item will be marked as claimed and removed from active listings.
            </div>
          </v-alert>
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn
            variant="text"
            color="grey"
            @click="cancelConfirm"
            :disabled="loading || sendingNotification"
          >
            Cancel
          </v-btn>
          <v-btn
            color="success"
            variant="flat"
            :loading="loading || sendingNotification"
            @click="confirmClaim"
          >
            <span v-if="sendingNotification">Sending Notification...</span>
            <span v-else>Yes, Mark as Claimed</span>
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-dialog>
</template>

<style scoped>
.v-radio-group :deep(.v-selection-control) {
  align-items: flex-start;
}

.v-radio-group :deep(.v-selection-control__wrapper) {
  margin-top: 8px;
}
</style>
