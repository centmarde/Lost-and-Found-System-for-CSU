<script setup lang="ts">
import { computed } from 'vue'
import AdminItemCard from '@/pages/admin/components/AdminCard.vue'
import UserItemCard from '@/pages/student/components/ItemCard.vue'

// Props
interface Props {
  items: any[]
  filteredAndSortedItems: any[]
  paginatedItems: any[]
  itemsLoading: boolean
  isCurrentUserAdmin: boolean
  updatingItems: Set<number>
  emptyStateConfig: {
    sectionTitle: string
    noItemsTitle: string
    noItemsMessage: string
  }
  page: number
  itemsPerPage: number
  totalPages: number
  isGuestUser?: boolean // Add prop to indicate if user is a guest
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  'open-conversations': [item: any]
  'mark-as-claimed': [itemId: number]
  'contact': [item: any]
  'guest-contact': [item: any] // Add new emit for guest contact
  'fetch-items': []
  'clear-all-filters': []
  'update:page': [page: number]
}>()

// Computed properties
const showingStart = computed(() => (props.page - 1) * props.itemsPerPage + 1)
const showingEnd = computed(() => Math.min(props.page * props.itemsPerPage, props.filteredAndSortedItems.length))

// Event handlers
const handleOpenConversations = (item: any) => {
  emit('open-conversations', item)
}

const markAsClaimed = (itemId: number) => {
  emit('mark-as-claimed', itemId)
}

const handleContact = (item: any) => {
  emit('contact', item)
}

const handleGuestContact = (item: any) => {
  emit('guest-contact', item)
}

const fetchItems = () => {
  emit('fetch-items')
}

const clearAllFilters = () => {
  emit('clear-all-filters')
}
</script>

<template>
  <v-card elevation="2" class="pa-4">
    <v-card-title class="text-h5 font-weight-bold mb-4 d-flex align-center">
      <v-icon class="me-2" color="primary">mdi-package-variant-closed</v-icon>
      {{ emptyStateConfig.sectionTitle }}
      <v-spacer />
      <v-chip
        v-if="!itemsLoading"
        color="info"
        variant="tonal"
        :size="$vuetify.display.xs ? 'x-small' : 'small'"
      >
        <!-- Mobile view: shorter text -->
        <span class="d-sm-none">
          {{ filteredAndSortedItems.length }}/{{ items.length }}
        </span>
        <!-- Desktop view: full text -->
        <span class="d-none d-sm-inline">
          {{ filteredAndSortedItems.length }} of {{ items.length }} items
        </span>
      </v-chip>
    </v-card-title>

    <!-- Loading state -->
    <div v-if="itemsLoading" class="text-center py-12">
      <v-progress-circular indeterminate color="primary" size="48" />
      <p class="text-body-1 mt-4">Loading items...</p>
    </div>

    <!-- Empty state -->
    <div
      v-else-if="filteredAndSortedItems.length === 0"
      class="text-center py-12"
    >
      <v-icon size="80" color="grey-lighten-1" class="mb-4">
        mdi-package-variant-closed-remove
      </v-icon>
      <h3 class="text-h5 text-grey-darken-1 mb-2">
        {{
          items.length === 0
            ? emptyStateConfig.noItemsTitle
            : "No items match your filters"
        }}
      </h3>
      <p class="text-body-1 text-grey-darken-2 mb-4">
        {{
          items.length === 0
            ? emptyStateConfig.noItemsMessage
            : "Try adjusting your search or filters to see more items."
        }}
      </p>
      <v-btn
        v-if="items.length === 0"
        color="primary"
        variant="outlined"
        prepend-icon="mdi-refresh"
        @click="fetchItems"
      >
        Refresh
      </v-btn>
      <v-btn
        v-else
        color="primary"
        variant="outlined"
        prepend-icon="mdi-filter-remove"
        @click="clearAllFilters"
      >
        Clear Filters
      </v-btn>
    </div>

    <!-- Items grid -->
    <div v-else>
      <v-row class="items-grid">
        <v-col
          v-for="item in paginatedItems"
          :key="item.id"
          cols="12"
          sm="6"
          md="4"
          lg="3"
          xl="3"
        >
          <AdminItemCard
            v-if="isCurrentUserAdmin"
            :item="item"
            :is-updating="updatingItems.has(item.id)"
            @open-conversations="handleOpenConversations"
            @mark-as-claimed="markAsClaimed"
          />

          <UserItemCard
            v-else
            :item="item"
            :is-updating="false"
            :is-guest-user="isGuestUser"
            @contact="handleContact(item)"
            @guest-contact="handleGuestContact"
          />
        </v-col>
      </v-row>

      <!-- Pagination -->
      <v-row v-if="totalPages > 1" class="mt-6">
        <v-col cols="12">
          <div class="d-flex justify-center align-center flex-wrap gap-2">
            <v-pagination
              :model-value="page"
              :length="totalPages"
              :total-visible="7"
              rounded="circle"
              color="primary"
              @update:model-value="$emit('update:page', $event)"
            />

            <div class="text-caption text-grey-darken-1 ml-4">
              Showing {{ showingStart }}-{{ showingEnd }}
              of {{ filteredAndSortedItems.length }}
            </div>
          </div>
        </v-col>
      </v-row>
    </div>
  </v-card>
</template>
