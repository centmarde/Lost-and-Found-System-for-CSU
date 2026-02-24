<template>
  <!-- Blur overlay -->
  <Teleport to="body">
    <Transition name="blur-overlay">
      <div v-if="modelValue" class="welcome-blur-overlay" />
    </Transition>
  </Teleport>

  <v-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    max-width="500"
    persistent
    :scrim="false"
  >
    <v-card rounded="xl" elevation="8">
      <v-card-text class="pa-8 text-center">
        <v-avatar color="primary" size="64" class="mb-4">
          <v-icon size="36" color="white">mdi-party-popper</v-icon>
        </v-avatar>

        <div class="text-overline text-primary font-weight-bold mb-1">What's New</div>

        <h2 class="text-h4 font-weight-bold mb-1" v-if="latestVersion">
          Welcome to {{ latestVersion.version }}
        </h2>

        <p class="text-body-1 text-grey-darken-1 mb-2" v-if="latestVersion">
          {{ latestVersion.title }}
        </p>

        <v-chip
          v-if="latestVersion"
          color="primary"
          variant="tonal"
          size="small"
          prepend-icon="mdi-calendar"
          class="mb-6"
        >
          {{ formatDate(latestVersion.date) }}
        </v-chip>

        <v-list
          v-if="latestVersion"
          density="compact"
          class="text-left mb-6 pa-0"
        >
          <v-list-item
            v-for="(change, i) in latestVersion.changes"
            :key="i"
            class="px-0 py-1"
          >
            <template #prepend>
              <v-icon color="success" size="small" class="me-2">mdi-check-circle</v-icon>
            </template>
            <v-list-item-title class="text-body-2">{{ change }}</v-list-item-title>
          </v-list-item>
        </v-list>

        <div class="d-flex flex-column ga-2">
          <v-btn
            color="primary"
            variant="elevated"
            block
            rounded="lg"
            prepend-icon="mdi-history"
            @click="$emit('open-changelogs')"
          >
            Show Full Changelogs
          </v-btn>
          <v-btn
            variant="text"
            block
            rounded="lg"
            @click="$emit('update:modelValue', false)"
          >
            Continue to App
          </v-btn>
        </div>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import type { LatestVersion } from '@/composables/useWelcomeVersion'

defineProps<{
  modelValue: boolean
  latestVersion: LatestVersion | null
}>()

defineEmits<{
  'update:modelValue': [value: boolean]
  'open-changelogs': []
}>()

const formatDate = (dateString: string): string => {
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  } catch {
    return dateString
  }
}
</script>

<style scoped>
.welcome-blur-overlay {
  position: fixed;
  inset: 0;
  z-index: 2000;
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  background: rgba(0, 0, 0, 0.35);
  pointer-events: none;
}

.blur-overlay-enter-active,
.blur-overlay-leave-active {
  transition: opacity 0.3s ease, backdrop-filter 0.3s ease;
}

.blur-overlay-enter-from,
.blur-overlay-leave-to {
  opacity: 0;
}
</style>
