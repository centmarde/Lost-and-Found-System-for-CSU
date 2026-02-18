<template>
  <v-dialog v-model="dialog" max-width="500px">
    <v-card>
      <v-card-title class="text-h5 text-center py-6">
        Forgot Password
      </v-card-title>

      <v-card-text class="px-6 pb-6">
        <div class="text-center mb-4">
          <v-icon size="64" color="info" class="mb-4">
            mdi-information-outline
          </v-icon>
          <h3 class="text-h6 mb-3">Feature Under Development</h3>
          <p class="text-body-1 text-medium-emphasis">
            The forgot password feature is currently under development and will be available in Phase 2 of the project.
          </p>
          <p class="text-body-2 text-medium-emphasis mt-3">
            For now, please contact your administrator if you need to reset your password.
          </p>
        </div>
      </v-card-text>

      <v-card-actions class="px-6 pb-6">
        <v-spacer />
        <v-btn
          color="primary"
          variant="elevated"
          @click="closeDialog"
        >
          Got it
        </v-btn>
        <v-spacer />
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

// Props
const props = defineProps<{
  modelValue: boolean;
}>();

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: boolean];
}>();

// Local state
const dialog = ref(false);

// Watch for prop changes
watch(() => props.modelValue, (newVal) => {
  dialog.value = newVal;
});

// Watch for dialog changes
watch(dialog, (newVal) => {
  emit('update:modelValue', newVal);
});

// Methods
const closeDialog = () => {
  dialog.value = false;
};
</script>

<style scoped>
/* Add any custom styles here if needed */
</style>
