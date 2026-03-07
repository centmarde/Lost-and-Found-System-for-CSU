<script setup lang="ts">
interface Props {
  show: boolean
  item?: {
    id: number
    title: string
    claimed_by_email?: string
  } | null
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  show: false,
  item: null,
  loading: false
})

const emit = defineEmits<{
  'update:show': [show: boolean]
  'confirm': [itemId: number]
  'cancel': []
}>()

const handleConfirm = () => {
  if (props.item) {
    emit('confirm', props.item.id)
  }
}

const handleCancel = () => {
  emit('update:show', false)
  emit('cancel')
}
</script>

<template>
  <v-dialog
    :model-value="show"
    @update:model-value="$emit('update:show', $event)"
    max-width="500"
    persistent
  >
    <v-card>
      <v-card-title class="d-flex align-center">
        <v-icon color="warning" class="me-2">mdi-alert</v-icon>
        <span>Unclaim Item</span>
      </v-card-title>

      <v-card-text>
        <div v-if="item" class="py-2">
          <p class="text-body-1 mb-3">
            Are you sure you want to unclaim this item?
          </p>

          <v-card variant="outlined" class="mb-3">
            <v-card-text class="py-3">
              <div class="text-subtitle-2 font-weight-bold mb-1">{{ item.title }}</div>
              <div v-if="item.claimed_by_email" class="text-body-2 text-medium-emphasis d-flex align-center">
                <v-icon size="16" class="me-1">mdi-account</v-icon>
                Currently claimed by: {{ item.claimed_by_email }}
              </div>
            </v-card-text>
          </v-card>

          <v-alert
            type="warning"
            variant="tonal"
            density="compact"
            class="text-body-2"
          >
            This will mark the item as unclaimed and remove the current claimer.
          </v-alert>
        </div>
      </v-card-text>

      <v-card-actions class="px-6 pb-4">
        <v-spacer />
        <v-btn
          variant="text"
          @click="handleCancel"
          :disabled="loading"
        >
          Cancel
        </v-btn>
        <v-btn
          color="warning"
          variant="flat"
          @click="handleConfirm"
          :loading="loading"
          prepend-icon="mdi-undo"
        >
          Unclaim Item
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.v-card {
  border-radius: 12px;
}

.v-alert {
  border-radius: 8px;
}
</style>
