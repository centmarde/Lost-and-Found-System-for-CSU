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
  viewMode: string
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

// Data table headers
const tableHeaders = computed(() => [
  { title: 'Title', key: 'title', align: 'start' as const },
  { title: 'Description', key: 'description', align: 'start' as const, sortable: false },
  { title: 'Status', key: 'status', align: 'center' as const },
  { title: 'Date', key: 'created_at', align: 'start' as const },
  { title: 'Actions', key: 'actions', align: 'center' as const, sortable: false },
] as const)

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

// Helper functions for table view
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

const getItemStatusColor = (item: any) => {
  if (item.claimed_by) return 'success'
  return item.status === 'lost' ? 'error' : 'info'
}

const getItemStatusText = (item: any) => {
  if (item.claimed_by) return 'Claimed'
  return item.status === 'lost' ? 'Lost' : 'Found'
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

    <!-- Items grid/table -->
    <div v-else>
      <!-- Grid View -->
      <v-row v-if="viewMode === 'grid'" class="items-grid">
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

      <!-- Table View -->
      <v-data-table
        v-else-if="viewMode === 'table'"
        :headers="tableHeaders"
        :items="paginatedItems"
        :loading="itemsLoading"
        item-key="id"
        class="elevation-1"
        hide-default-footer
      >
        <!-- Title column -->
        <template #item.title="{ item }">
          <div class="font-weight-medium">{{ item.title }}</div>
        </template>

        <!-- Description column -->
        <template #item.description="{ item }">
          <div class="text-truncate" style="max-width: 200px;">
            {{ item.description }}
          </div>
        </template>

        <!-- Status column -->
        <template #item.status="{ item }">
          <v-chip
            :color="getItemStatusColor(item)"
            size="small"
            variant="tonal"
          >
            {{ getItemStatusText(item) }}
          </v-chip>
        </template>

        <!-- Date column -->
        <template #item.created_at="{ item }">
          {{ formatDate(item.created_at) }}
        </template>

        <!-- Actions column -->
        <template #item.actions="{ item }">
          <div class="d-flex gap-2 justify-center">
            <v-btn
              v-if="isCurrentUserAdmin"
              size="small"
              color="primary"
              variant="outlined"
              prepend-icon="mdi-message"
              @click="handleOpenConversations(item)"
            >
              Messages
            </v-btn>
            <v-btn
              v-if="isCurrentUserAdmin && !item.claimed_by"
              size="small"
              color="success"
              variant="outlined"
              prepend-icon="mdi-check"
              :loading="updatingItems.has(item.id)"
              @click="markAsClaimed(item.id)"
            >
              Mark Claimed
            </v-btn>
            <v-btn
              v-else-if="!isCurrentUserAdmin"
              size="small"
              color="primary"
              variant="outlined"
              prepend-icon="mdi-message"
              @click="isGuestUser ? handleGuestContact(item) : handleContact(item)"
            >
              Contact
            </v-btn>
          </div>
        </template>
      </v-data-table>

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
