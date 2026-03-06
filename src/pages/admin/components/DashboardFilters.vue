<script setup lang="ts">
import { ref, computed, watch } from 'vue'

// Define props
interface Props {
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
})

// Define emits
interface FilterData {
  search: string
  statusFilter: string
  sortBy: string
  sortOrder: 'asc' | 'desc'
  dateFrom: string
  dateTo: string
  showClaimed: boolean
}

const emit = defineEmits<{
  'update:filters': [filters: FilterData]
  'reset:filters': []
}>()

// Reactive state
const searchTerm = ref('')
const selectedStatus = ref('lost') // Default to lost items
const sortBy = ref('created_at')
const sortOrder = ref<'asc' | 'desc'>('desc')
const dateFrom = ref('')
const dateTo = ref('')
const showClaimed = ref(false)
const showAdvancedFilters = ref(false)

// Sort options for items
const sortOptions = [
  { value: 'created_at', title: 'Date Created' },
  { value: 'title', title: 'Title' },
  { value: 'status', title: 'Status' },
  { value: 'title_alpha_asc', title: 'Title (A → Z)' },
  { value: 'title_alpha_desc', title: 'Title (Z → A)' },
  { value: 'status_alpha_asc', title: 'Status (A → Z)' },
  { value: 'status_alpha_desc', title: 'Status (Z → A)' },
]

// Computed properties
const currentFilters = computed((): FilterData => ({
  search: searchTerm.value,
  statusFilter: selectedStatus.value,
  sortBy: sortBy.value,
  sortOrder: sortOrder.value,
  dateFrom: dateFrom.value,
  dateTo: dateTo.value,
  showClaimed: showClaimed.value,
}))

const isAlphabeticalSort = computed(() => {
  return sortBy.value.includes('_alpha_')
})

const hasActiveFilters = computed(() => {
  return (
    searchTerm.value !== '' ||
    selectedStatus.value !== 'lost' ||
    dateFrom.value !== '' ||
    dateTo.value !== '' ||
    sortBy.value !== 'created_at' ||
    sortOrder.value !== 'desc' ||
    showClaimed.value !== false
  )
})

// Watch for filter changes and emit updates
watch(currentFilters, (newFilters) => {
  emit('update:filters', newFilters)
}, { deep: true })

// Watch for status changes and sync with showClaimed
watch(selectedStatus, (newStatus) => {
  if (newStatus === 'lost') {
    showClaimed.value = false
  } else if (newStatus === 'claimed') {
    showClaimed.value = true
  }
})

// Methods
const clearAllFilters = () => {
  searchTerm.value = ''
  selectedStatus.value = 'lost'
  sortBy.value = 'created_at'
  sortOrder.value = 'desc'
  dateFrom.value = ''
  dateTo.value = ''
  showClaimed.value = false
  showAdvancedFilters.value = false
  emit('reset:filters')
}

const toggleSortOrder = () => {
  sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
}

// Expose methods for parent component
defineExpose({
  clearAllFilters,
  currentFilters,
})
</script>

<template>
  <v-card class="dashboard-filters mb-4" elevation="2">
    <v-card-text class="pb-2">
      <!-- Main Search Row -->
      <v-row class="align-center mb-2">
        <!-- Search Field -->
        <v-col cols="12" md="8">
          <v-text-field
            v-model="searchTerm"
            prepend-inner-icon="mdi-magnify"
            label="Search items..."
            placeholder="Search by title or description"
            variant="outlined"
            density="compact"
            hide-details
            clearable
            :disabled="loading"
          />
        </v-col>

        <!-- Sort Options -->
        <v-col cols="12" md="2">
          <v-select
            v-model="sortBy"
            :items="sortOptions"
            item-title="title"
            item-value="value"
            label="Sort by"
            variant="outlined"
            density="compact"
            hide-details
            :disabled="loading"
          >
            <template v-slot:prepend-inner>
              <v-icon size="20">mdi-sort</v-icon>
            </template>
            <template v-slot:append>
              <v-btn
                v-if="!isAlphabeticalSort"
                icon
                size="small"
                variant="text"
                @click="toggleSortOrder"
                :disabled="loading"
              >
                <v-icon>
                  {{ sortOrder === 'asc' ? 'mdi-sort-ascending' : 'mdi-sort-descending' }}
                </v-icon>
                <v-tooltip activator="parent" location="top">
                  {{ sortOrder === 'asc' ? 'Ascending' : 'Descending' }}
                </v-tooltip>
              </v-btn>
              <v-icon
                v-else
                size="20"
                color="primary"
                class="me-2"
              >
                {{ sortBy.includes('_desc') ? 'mdi-sort-alphabetical-descending' : 'mdi-sort-alphabetical-ascending' }}
              </v-icon>
            </template>
          </v-select>
        </v-col>

        <!-- Actions Column -->
        <v-col cols="12" md="2" class="d-flex justify-end gap-2">
          <v-btn
            icon="mdi-tune"
            size="small"
            color="primary"
            @click="showAdvancedFilters = !showAdvancedFilters"
            :disabled="loading"
          >
            <v-icon>mdi-tune</v-icon>
            <v-tooltip activator="parent" location="top">
              {{ showAdvancedFilters ? 'Hide' : 'Show' }} Advanced Filters
            </v-tooltip>
          </v-btn>

          <v-btn
            v-if="hasActiveFilters"
            icon="mdi-filter-off"
            size="small"
            variant="tonal"
            color="error"
            @click="clearAllFilters"
            :disabled="loading"
          >
            <v-icon>mdi-filter-off</v-icon>
            <v-tooltip activator="parent" location="top">
              Clear All Filters
            </v-tooltip>
          </v-btn>
        </v-col>
      </v-row>

      <!-- Status Filter Row -->
      <v-row class="align-center mb-3">
        <v-col cols="12" class="d-flex align-center gap-3">

          <v-btn-toggle
            v-model="selectedStatus"
            mandatory
            variant="text"
            density="compact"
            class="minimal-toggle"
            :disabled="loading"
          >
            <v-btn
              value="lost"
              size="small"
              class="minimal-btn"
            >
              Lost
            </v-btn>
            <v-btn
              value="claimed"
              size="small"
              class="minimal-btn"
            >
              Claimed
            </v-btn>
          </v-btn-toggle>
        </v-col>
      </v-row>

      <!-- Advanced Filters (Collapsible) -->
      <v-expand-transition>
        <div v-show="showAdvancedFilters">
          <v-divider class="mb-4"></v-divider>

          <v-row class="align-center">
            <!-- Show Claimed Toggle -->
            <v-col v-if="selectedStatus === 'lost'" cols="12" md="4">
              <v-checkbox
                v-model="showClaimed"
                label="Include items claimed by someone"
                density="compact"
                hide-details
                :disabled="loading"
              >
                <template v-slot:prepend>
                  <v-icon size="20" color="primary">mdi-check-circle</v-icon>
                </template>
              </v-checkbox>
            </v-col>

            <!-- Date From -->
            <v-col cols="12" md="4">
              <v-text-field
                v-model="dateFrom"
                type="date"
                label="Created From"
                variant="outlined"
                density="compact"
                hide-details
                :disabled="loading"
              >
                <template v-slot:prepend-inner>
                  <v-icon size="20">mdi-calendar-start</v-icon>
                </template>
              </v-text-field>
            </v-col>

            <!-- Date To -->
            <v-col cols="12" md="4">
              <v-text-field
                v-model="dateTo"
                type="date"
                label="Created To"
                variant="outlined"
                density="compact"
                hide-details
                :disabled="loading"
              >
                <template v-slot:prepend-inner>
                  <v-icon size="20">mdi-calendar-end</v-icon>
                </template>
              </v-text-field>
            </v-col>
          </v-row>
        </div>
      </v-expand-transition>

      <!-- Active Filters Summary (Mobile Friendly) -->
      <div v-if="hasActiveFilters" class="mt-3">
        <div class="d-flex flex-wrap gap-2 align-center">
          <span class="text-caption text-medium-emphasis">Active filters:</span>

          <v-chip
            v-if="searchTerm"
            size="small"
            closable
            @click:close="searchTerm = ''"
            color="primary"
            variant="tonal"
          >
            <v-icon start size="16">mdi-magnify</v-icon>
            "{{ searchTerm }}"
          </v-chip>

          <v-chip
            v-if="selectedStatus !== 'lost'"
            size="small"
            closable
            @click:close="selectedStatus = 'lost'"
            color="info"
            variant="tonal"
          >
            <v-icon start size="16">{{ selectedStatus === 'claimed' ? 'mdi-check-circle' : 'mdi-help-circle' }}</v-icon>
            {{ selectedStatus === 'claimed' ? 'Items Claimed by Someone' : 'Lost Items' }}
          </v-chip>

          <v-chip
            v-if="showClaimed"
            size="small"
            closable
            @click:close="showClaimed = false"
            color="success"
            variant="tonal"
          >
            <v-icon start size="16">mdi-check-circle</v-icon>
            Including Claimed Items
          </v-chip>

          <v-chip
            v-if="sortBy !== 'created_at' || sortOrder !== 'desc'"
            size="small"
            closable
            @click:close="sortBy = 'created_at'; sortOrder = 'desc'"
            color="warning"
            variant="tonal"
          >
            <v-icon start size="16">
              {{ isAlphabeticalSort ?
                (sortBy.includes('_desc') ? 'mdi-sort-alphabetical-descending' : 'mdi-sort-alphabetical-ascending') :
                (sortOrder === 'asc' ? 'mdi-sort-ascending' : 'mdi-sort-descending')
              }}
            </v-icon>
            {{ sortOptions.find(s => s.value === sortBy)?.title || 'Custom Sort' }}
          </v-chip>

          <v-chip
            v-if="dateFrom"
            size="small"
            closable
            @click:close="dateFrom = ''"
            color="secondary"
            variant="tonal"
          >
            <v-icon start size="16">mdi-calendar-start</v-icon>
            From: {{ new Date(dateFrom).toLocaleDateString() }}
          </v-chip>

          <v-chip
            v-if="dateTo"
            size="small"
            closable
            @click:close="dateTo = ''"
            color="secondary"
            variant="tonal"
          >
            <v-icon start size="16">mdi-calendar-end</v-icon>
            To: {{ new Date(dateTo).toLocaleDateString() }}
          </v-chip>
        </div>
      </div>
    </v-card-text>
  </v-card>
</template>

<style scoped>
.dashboard-filters {
  border-radius: 12px;
}

.v-text-field .v-field__input {
  min-height: 40px;
}

.v-select .v-field__input {
  min-height: 40px;
}

/* Mobile responsive adjustments */
@media (max-width: 768px) {
  .dashboard-filters .v-card-text {
    padding: 16px 12px;
  }

  .v-text-field,
  .v-select {
    margin-bottom: 8px;
  }

  .d-flex.gap-2 {
    gap: 4px !important;
  }
}

/* Ensure proper spacing for chips */
.v-chip {
  margin: 2px;
}

/* Custom button styling */
.v-btn--icon {
  transition: all 0.2s ease;
}

.v-btn--icon:hover {
  transform: scale(1.1);
}

/* Checkbox styling */
.v-checkbox {
  margin-top: 8px;
}

/* Minimal status toggle styling */
.minimal-toggle {
  border-radius: 6px;
  background-color: rgba(var(--v-theme-surface-variant), 0.3);
  padding: 2px;
}

.minimal-btn {
  border-radius: 4px !important;
  text-transform: none !important;
  font-weight: 500 !important;
  letter-spacing: normal !important;
  transition: all 0.2s ease !important;
  min-width: 60px !important;
  height: 32px !important;
  padding: 0 12px !important;
}

.minimal-btn.v-btn--active {
  background-color: rgb(var(--v-theme-primary)) !important;
  color: rgb(var(--v-theme-on-primary)) !important;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12) !important;
}

.minimal-btn:not(.v-btn--active) {
  color: rgb(var(--v-theme-on-surface-variant)) !important;
}

.minimal-btn:not(.v-btn--active):hover {
  background-color: rgba(var(--v-theme-primary), 0.08) !important;
}

/* Mobile responsive for minimal toggle */
@media (max-width: 768px) {
  .minimal-btn {
    min-width: 50px !important;
    height: 28px !important;
    padding: 0 8px !important;
    font-size: 0.875rem !important;
  }
}
</style>
