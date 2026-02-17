<template>
  <v-card rounded="xl" elevation="2" variant="outlined">
    <v-card-title class="d-flex align-center justify-space-between">
      <div class="d-flex align-center">
        <v-icon color="primary" class="me-2">mdi-history</v-icon>
        <span class="text-h6">Version History</span>
      </div>
      <v-btn
        :icon="isExpanded ? 'mdi-chevron-up' : 'mdi-chevron-down'"
        variant="text"
        size="small"
        @click="toggleExpanded"
      />
    </v-card-title>

    <v-expand-transition>
      <div v-show="isExpanded">
        <v-divider />

        <v-card-text>
          <div v-if="loading" class="text-center py-4">
            <v-progress-circular
              indeterminate
              color="primary"
              size="40"
            />
            <p class="text-body-2 text-grey-darken-1 mt-2">Loading version history...</p>
          </div>

          <div v-else-if="error" class="text-center py-4">
            <v-icon color="error" size="large" class="mb-2">mdi-alert-circle</v-icon>
            <p class="text-body-2 text-error">{{ error }}</p>
            <v-btn
              variant="outlined"
              color="primary"
              size="small"
              @click="fetchVersions"
              class="mt-2"
            >
              Retry
            </v-btn>
          </div>

          <div v-else>
            <v-list
              lines="three"
              class="pa-0"
              style="max-height: 400px; overflow-y: auto;"
            >
              <v-list-item
                v-for="(version, index) in versions"
                :key="version.version"
                class="mb-2"
              >
                <template #prepend>
                  <v-avatar
                    :color="index === 0 ? 'success' : 'primary'"
                    size="40"
                  >
                    <v-icon color="white" size="small">
                      {{ index === 0 ? 'mdi-new-box' : 'mdi-tag' }}
                    </v-icon>
                  </v-avatar>
                </template>

                <template #title>
                  <div class="d-flex align-center justify-space-between">
                    <v-chip
                      :color="index === 0 ? 'success' : 'primary'"
                      size="small"
                      variant="tonal"
                    >
                      {{ version.version }}
                    </v-chip>
                    <v-chip
                      variant="text"
                      size="small"
                      color="grey-darken-1"
                    >
                      {{ formatDate(version.date) }}
                    </v-chip>
                  </div>
                </template>

                <template #subtitle>
                  <div class="text-subtitle-2 font-weight-medium mb-2">
                    {{ version.title }}
                  </div>

                  <v-list density="compact" class="pa-0">
                    <v-list-item
                      v-for="(change, changeIndex) in version.changes"
                      :key="changeIndex"
                      class="px-0 py-1"
                    >
                      <template #prepend>
                        <v-icon
                          color="success"
                          size="small"
                          class="me-2"
                        >
                          mdi-check-circle
                        </v-icon>
                      </template>
                      <v-list-item-title class="text-body-2">
                        {{ change }}
                      </v-list-item-title>
                    </v-list-item>
                  </v-list>
                </template>

                <v-divider
                  v-if="index < versions.length - 1"
                  class="mt-4"
                />
              </v-list-item>
            </v-list>

            <div v-if="versions.length === 0" class="text-center py-4">
              <v-icon color="grey-lighten-1" size="large" class="mb-2">mdi-history</v-icon>
              <p class="text-body-2 text-grey-darken-1">No version history available</p>
            </div>
          </div>
        </v-card-text>
      </div>
    </v-expand-transition>
  </v-card>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import axios from 'axios'

interface Version {
  version: string
  date: string
  title: string
  changes: string[]
}

interface VersionData {
  versions: Version[]
}

// Reactive state
const versions = ref<Version[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const isExpanded = ref(true)

// Methods
const toggleExpanded = () => {
  isExpanded.value = !isExpanded.value

  // Fetch versions when first expanded
  if (isExpanded.value && versions.value.length === 0) {
    fetchVersions()
  }
}

const fetchVersions = async () => {
  loading.value = true
  error.value = null

  try {
    const response = await axios.get<VersionData>('/data/version.json')
    versions.value = response.data.versions || []
  } catch (err) {
    error.value = 'Failed to load version history'
    console.error('Error fetching version data:', err)
  } finally {
    loading.value = false
  }
}

const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  } catch {
    return dateString
  }
}

// Lifecycle
onMounted(() => {
  // Fetch versions on mount since component is expanded by default
  fetchVersions()
})
</script>


