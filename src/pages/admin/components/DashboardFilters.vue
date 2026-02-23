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
const selectedStatus = ref('all')
const sortBy = ref('created_at')
const sortOrder = ref<'asc' | 'desc'>('desc')
const dateFrom = ref('')
const dateTo = ref('')
const showClaimed = ref(false)
const showAdvancedFilters = ref(false)

// Status options for lost and found items
const statusOptions = [
  { value: 'all', title: 'All Items' },
  { value: 'lost', title: 'Lost Items' },
  { value: 'found', title: 'Found Items' },
]

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
    selectedStatus.value !== 'all' ||
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

// Methods
const clearAllFilters = () => {
  searchTerm.value = ''
  selectedStatus.value = 'all'
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
      <v-row class="align-center mb-3">
        <!-- Search Field -->
        <v-col cols="12" md="5">
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

        <!-- Status Filter -->
        <v-col cols="12" md="2">
          <v-select
            v-model="selectedStatus"
            :items="statusOptions"
            item-title="title"
            item-value="value"
            label="Filter by Status"
            variant="outlined"
            density="compact"
            hide-details
            :disabled="loading"
          >
            <template v-slot:prepend-inner>
              <v-icon size="20">mdi-bookmark</v-icon>
            </template>
          </v-select>
        </v-col>

        <!-- Sort Options -->
        <v-col cols="12" md="3">
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

      <!-- Advanced Filters (Collapsible) -->
      <v-expand-transition>
        <div v-show="showAdvancedFilters">
          <v-divider class="mb-4"></v-divider>

          <v-row class="align-center">
            <!-- Show Claimed Toggle -->
            <v-col cols="12" md="4">
              <v-checkbox
                v-model="showClaimed"
                label="Show claimed items"
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
            v-if="selectedStatus !== 'all'"
            size="small"
            closable
            @click:close="selectedStatus = 'all'"
            color="info"
            variant="tonal"
          >
            <v-icon start size="16">mdi-bookmark</v-icon>
            {{ statusOptions.find(s => s.value === selectedStatus)?.title }}
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
            Show Claimed
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
</style>
