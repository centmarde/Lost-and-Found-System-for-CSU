<script lang="ts" setup>
interface NewItemForm {
  title: string
  description: string
  status: 'lost' | 'found'
}

interface Props {
  posting: boolean
  form: NewItemForm
}

const props = defineProps<Props>()
const model = defineModel<boolean>()
const emit = defineEmits<{
  submit: []
}>()

const handleSubmit = () => {
  if (props.form.title && props.form.description) {
    emit('submit')
  }
}
</script>

<template>
  <v-dialog v-model="model" max-width="600">
    <v-card>
      <v-card-title class="text-h5 font-weight-bold">
        <v-icon class="me-2">mdi-plus-circle</v-icon>
        Post Missing Item
      </v-card-title>

      <v-card-text>
        <v-form @submit.prevent="handleSubmit">
          <v-select
            v-model="form.status"
            :items="[
              { title: 'Lost Item', value: 'lost' },
            ]"
            label="Item Type"
            prepend-inner-icon="mdi-tag"
            variant="outlined"
            class="mb-3"
          />

          <v-text-field
            v-model="form.title"
            label="Item Title"
            prepend-inner-icon="mdi-text"
            variant="outlined"
            placeholder="e.g., iPhone 13, Blue Backpack, Student ID"
            class="mb-3"
          />

          <v-textarea
            v-model="form.description"
            label="Item Description"
            prepend-inner-icon="mdi-text-long"
            variant="outlined"
            placeholder="Detailed description including color, brand, location found/lost, distinguishing features..."
            rows="4"
          />

          <v-alert
            type="info"
            variant="tonal"
            class="mt-3"
          >
            <template #prepend>
              <v-icon>mdi-chat</v-icon>
            </template>
            Students can start a realtime chat to describe this item for ownership verification.
          </v-alert>
        </v-form>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn
          variant="text"
          @click="model = false"
          :disabled="posting"
        >
          Cancel
        </v-btn>
       <v-btn
  color="success"
  @click="handleSubmit"
  :loading="posting"
  :disabled="!form.title || !form.description"
>
  Post Item
</v-btn>

      </v-card-actions>
    </v-card>
  </v-dialog>
</template>