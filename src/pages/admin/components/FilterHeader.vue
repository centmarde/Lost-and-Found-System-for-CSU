<template>
  <v-card elevation="2" class="mb-4">
    <v-card-text class="pa-4">
      <v-row align="center" class="mb-3">
        <v-col cols="12" md="6">
          <v-text-field
            v-model="localSearchQuery"
            :loading="loading"
            label="Search items, users, or conversations..."
            placeholder="Type to search..."
            variant="outlined"
            density="comfortable"
            prepend-inner-icon="mdi-magnify"
            clearable
            hide-details
            @update:model-value="handleSearch"
            @click:clear="handleClearSearch"
          />
        </v-col>

        <v-col cols="12" md="6">
          <div class="d-flex align-center justify-end gap-2">
            <!-- Sort Selector -->
            <v-select
              :model-value="localSortBy"
              :items="sortOptions"
              label="Sort by"
              variant="outlined"
              density="comfortable"
              hide-details
              style="min-width: 180px;"
              @update:model-value="handleSortChange"
            >
              <template #prepend-inner>
                <v-icon size="20">mdi-sort</v-icon>
              </template>

              <template #item="{ props: itemProps, item }">
                <v-list-item
                  v-bind="itemProps"
                  :prepend-icon="item.raw.icon"
                >
                  <v-list-item-title>{{ item.raw.title }}</v-list-item-title>
                </v-list-item>
              </template>

              <template #selection="{ item }">
                <div class="d-flex align-center">
                  <v-icon v-if="item.raw.icon" size="16" class="me-2">
                    {{ item.raw.icon }}
                  </v-icon>
                  {{ item.raw.title }}
                </div>
              </template>
            </v-select>

            <!-- View Toggle -->
            <v-btn-toggle
              :model-value="localViewMode"
              mandatory
              variant="outlined"
              divided
              @update:model-value="handleViewModeChange"
            >
              <v-btn
                value="table"
                size="small"
                :variant="localViewMode === 'table' ? 'flat' : 'outlined'"
              >
                <v-icon>mdi-table</v-icon>
                <v-tooltip activator="parent" location="bottom">
                  Table View
                </v-tooltip>
              </v-btn>

              <v-btn
                value="cards"
                size="small"
                :variant="localViewMode === 'cards' ? 'flat' : 'outlined'"
              >
                <v-icon>mdi-view-grid</v-icon>
                <v-tooltip activator="parent" location="bottom">
                  Card View
                </v-tooltip>
              </v-btn>
            </v-btn-toggle>

            <v-btn
              v-if="hasActiveFilters"
              color="error"
              variant="outlined"
              size="small"
              prepend-icon="mdi-filter-off"
              @click="handleClearAllFilters"
            >
              Clear Filters
            </v-btn>
          </div>
        </v-col>
      </v-row>

      <!-- Filter Summary -->
      <v-row v-if="hasActiveFilters || filteredItems !== totalItems">
        <v-col cols="12">
          <div class="d-flex align-center justify-space-between pa-2 bg-grey-lighten-4 rounded">
            <div class="d-flex align-center flex-wrap gap-2">
              <!-- Active Search -->
              <v-chip
                v-if="localSearchQuery.trim()"
                color="info"
                variant="tonal"
                size="small"
                closable
                @click:close="handleClearSearch"
              >
                <v-icon start>mdi-magnify</v-icon>
                Search: "{{ localSearchQuery }}"
              </v-chip>

              <!-- Active Sort -->
              <v-chip
                v-if="localSortBy !== 'name'"
                color="primary"
                variant="tonal"
                size="small"
              >
                <v-icon start>{{ getSortIcon(localSortBy) }}</v-icon>
                {{ getSortLabel(localSortBy) }}
              </v-chip>

              <!-- View Mode -->
              <v-chip
                color="secondary"
                variant="tonal"
                size="small"
              >
                <v-icon start>{{ localViewMode === 'table' ? 'mdi-table' : 'mdi-view-grid' }}</v-icon>
                {{ localViewMode === 'table' ? 'Table' : 'Card' }} View
              </v-chip>
            </div>

            <div class="text-caption text-grey-darken-1">
              <template v-if="filteredItems !== totalItems">
                Showing {{ filteredItems }} of {{ totalItems }} items
              </template>
              <template v-else>
                {{ totalItems }} {{ totalItems === 1 ? 'item' : 'items' }}
              </template>
            </div>
          </div>
        </v-col>
      </v-row>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';

export interface SortOption {
  value: string;
  title: string;
  icon?: string;
}

export interface FilterHeaderProps {
  searchQuery?: string;
  sortBy?: string;
  viewMode?: 'table' | 'cards';
  loading?: boolean;
  totalItems?: number;
  filteredItems?: number;
  sortOptions?: SortOption[];
}

export interface FilterHeaderEmits {
  (e: 'update:searchQuery', value: string): void;
  (e: 'update:sortBy', value: string): void;
  (e: 'update:viewMode', value: 'table' | 'cards'): void;
  (e: 'clearFilters'): void;
}

const props = withDefaults(defineProps<FilterHeaderProps>(), {
  searchQuery: '',
  sortBy: 'name',
  viewMode: 'cards',
  loading: false,
  totalItems: 0,
  filteredItems: 0,
  sortOptions: () => [
    { value: 'name', title: 'Name (A-Z)', icon: 'mdi-sort-alphabetical-ascending' },
    { value: 'name_desc', title: 'Name (Z-A)', icon: 'mdi-sort-alphabetical-descending' },
    { value: 'date', title: 'Date (Newest)', icon: 'mdi-sort-calendar-descending' },
    { value: 'date_asc', title: 'Date (Oldest)', icon: 'mdi-sort-calendar-ascending' },
    { value: 'unread', title: 'Unread Messages', icon: 'mdi-email-alert' },
    { value: 'conversations', title: 'Most Conversations', icon: 'mdi-forum' }
  ]
});

const emit = defineEmits<FilterHeaderEmits>();

// Local reactive state
const localSearchQuery = ref(props.searchQuery);
const localSortBy = ref(props.sortBy);
const localViewMode = ref(props.viewMode);

// Computed properties
const hasActiveFilters = computed(() => {
  return localSearchQuery.value.trim() !== '' || localSortBy.value !== 'name';
});

// Watch for prop changes
watch(() => props.searchQuery, (newValue) => {
  localSearchQuery.value = newValue;
});

watch(() => props.sortBy, (newValue) => {
  localSortBy.value = newValue;
});

watch(() => props.viewMode, (newValue) => {
  localViewMode.value = newValue;
});

// Debounce timer
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

// Event handlers
const handleSearch = (value: string) => {
  // Clear existing timer
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  // Set new timer for debounced search
  debounceTimer = setTimeout(() => {
    emit('update:searchQuery', value);
  }, 300);
};

const handleClearSearch = () => {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
  localSearchQuery.value = '';
  emit('update:searchQuery', '');
};

const handleSortChange = (value: string) => {
  emit('update:sortBy', value);
};

const handleViewModeChange = (value: 'table' | 'cards') => {
  emit('update:viewMode', value);
};

const handleClearAllFilters = () => {
  localSearchQuery.value = '';
  localSortBy.value = 'name';
  localViewMode.value = 'cards';
  emit('clearFilters');
};

const getSortIcon = (sortBy: string): string => {
  const iconMap: Record<string, string> = {
    'name': 'mdi-sort-alphabetical-ascending',
    'name_desc': 'mdi-sort-alphabetical-descending',
    'date': 'mdi-sort-calendar-descending',
    'date_asc': 'mdi-sort-calendar-ascending',
    'unread': 'mdi-email-alert',
    'conversations': 'mdi-forum'
  };
  return iconMap[sortBy] || 'mdi-sort';
};

const getSortLabel = (sortBy: string): string => {
  const labelMap: Record<string, string> = {
    'name': 'Name (A-Z)',
    'name_desc': 'Name (Z-A)',
    'date': 'Date (Newest)',
    'date_asc': 'Date (Oldest)',
    'unread': 'Unread Messages',
    'conversations': 'Most Conversations'
  };
  return labelMap[sortBy] || sortBy;
};
</script>

<style scoped>
.gap-2 > * + * {
  margin-left: 8px;
}
</style>
