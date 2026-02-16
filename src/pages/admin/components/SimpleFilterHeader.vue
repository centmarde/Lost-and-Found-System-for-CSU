<template>
  <v-card elevation="2" class="mb-4">
    <v-card-text class="pa-4">
      <v-row align="center">
        <v-col cols="12" md="8">
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

        <v-col cols="12" md="4">
          <div class="d-flex align-center justify-end gap-2">
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

            <v-chip
              v-if="filteredItems !== totalItems"
              color="info"
              variant="tonal"
              size="small"
            >
              {{ filteredItems }} of {{ totalItems }}
            </v-chip>
          </div>
        </v-col>
      </v-row>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';

export interface SimpleFilterHeaderProps {
  searchQuery?: string;
  loading?: boolean;
  totalItems?: number;
  filteredItems?: number;
}

export interface SimpleFilterHeaderEmits {
  (e: 'update:searchQuery', value: string): void;
  (e: 'clearFilters'): void;
}

const props = withDefaults(defineProps<SimpleFilterHeaderProps>(), {
  searchQuery: '',
  loading: false,
  totalItems: 0,
  filteredItems: 0,
});

const emit = defineEmits<SimpleFilterHeaderEmits>();

// Local reactive state
const localSearchQuery = ref(props.searchQuery);

// Computed properties
const hasActiveFilters = computed(() => {
  return localSearchQuery.value.trim() !== '';
});

// Watch for prop changes
watch(() => props.searchQuery, (newValue) => {
  localSearchQuery.value = newValue;
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

const handleClearAllFilters = () => {
  localSearchQuery.value = '';
  emit('clearFilters');
};
</script>

<style scoped>
.gap-2 > * + * {
  margin-left: 8px;
}
</style>
