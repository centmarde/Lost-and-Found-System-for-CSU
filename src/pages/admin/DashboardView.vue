<script lang="ts" setup>
import { ref, onMounted, computed } from 'vue'
import InnerLayoutWrapper from '@/layouts/InnerLayoutWrapper.vue'
import AdminDashboardItemCard from '@/pages/admin/components/DashboardItemCards.vue'
import ClaimItemDialog from '@/pages/admin/components/ClaimItemDialog.vue'
import StatsCards from '@/pages/admin/components/StatsCards.vue'
import SearchBar from '@/pages/admin/components/SearchBar.vue'
import RecentActivity from '@/pages/admin/components/RecentActivity.vue'
import PostItemDialog from '@/pages/admin/components/PostItemDialog.vue'
import ConfirmationDialog from '@/components/common/ConfirmationDialog.vue'
import ErrorDialog from '@/components/common/ErrorDialog.vue'
import DashboardFilters from '@/pages/admin/components/DashboardFilters.vue'
import { useDashboardData } from '@/pages/admin/components/composables/useDashboardData'
import { useAdminItemActions } from '@/pages/admin/components/composables/useAdminItems'
// import { handleClaimItem } from '@/stores/items'
import { markItemAsClaimed, updateItemDescription } from '@/stores/items'
import { getMultipleItemsConversationCounts } from '@/stores/conversation'


import '@/styles/dashboardview.css'

interface Item {
  id: number
  title: string
  description: string
  status: 'lost' | 'found'
  user_id: string
  claimed_by: string
  created_at: string
}

const {
  loading,
  stats,
  items,
  fetchDashboardStats,
  getTotalUsersCount
} = useDashboardData()

// Filter state
interface FilterData {
  search: string
  statusFilter: string
  sortBy: string
  sortOrder: 'asc' | 'desc'
  dateFrom: string
  dateTo: string
  showClaimed: boolean
}

const allItems = ref<Item[]>([]) // Store all items for filtering
const conversationCounts = ref<Record<number, number>>({}) // Store conversation counts per item
const currentFilters = ref<FilterData>({
  search: '',
  statusFilter: 'all',
  sortBy: 'created_at',
  sortOrder: 'desc',
  dateFrom: '',
  dateTo: '',
  showClaimed: false,
})

// Apply filters to items
const applyFilters = () => {
  let filteredData = [...allItems.value]

  // Apply search filter
  if (currentFilters.value.search) {
    const searchTerm = currentFilters.value.search.toLowerCase()
    filteredData = filteredData.filter(item => {
      const title = item.title?.toLowerCase() || ''
      const description = item.description?.toLowerCase() || ''
      return title.includes(searchTerm) || description.includes(searchTerm)
    })
  }

  // Apply status filter
  if (currentFilters.value.statusFilter !== 'all') {
    filteredData = filteredData.filter(item => {
      return item.status === currentFilters.value.statusFilter
    })
  }

  // Apply claimed filter
  if (!currentFilters.value.showClaimed) {
    filteredData = filteredData.filter(item => {
      return !item.claimed_by || item.claimed_by === ''
    })
  }

  // Apply date filters
  if (currentFilters.value.dateFrom) {
    const fromDate = new Date(currentFilters.value.dateFrom)
    filteredData = filteredData.filter(item => {
      const createdDate = new Date(item.created_at)
      return createdDate >= fromDate
    })
  }

  if (currentFilters.value.dateTo) {
    const toDate = new Date(currentFilters.value.dateTo)
    toDate.setHours(23, 59, 59, 999) // Include the entire day
    filteredData = filteredData.filter(item => {
      const createdDate = new Date(item.created_at)
      return createdDate <= toDate
    })
  }

  // Apply sorting
  filteredData.sort((a, b) => {
    let aValue, bValue
    let isAlphabetical = false
    let isDescending = false

    switch (currentFilters.value.sortBy) {
      case 'title':
        aValue = a.title?.toLowerCase() || ''
        bValue = b.title?.toLowerCase() || ''
        break
      case 'title_alpha_asc':
        aValue = a.title?.toLowerCase() || ''
        bValue = b.title?.toLowerCase() || ''
        isAlphabetical = true
        break
      case 'title_alpha_desc':
        aValue = a.title?.toLowerCase() || ''
        bValue = b.title?.toLowerCase() || ''
        isAlphabetical = true
        isDescending = true
        break
      case 'status':
        aValue = a.status?.toLowerCase() || ''
        bValue = b.status?.toLowerCase() || ''
        break
      case 'status_alpha_asc':
        aValue = a.status?.toLowerCase() || ''
        bValue = b.status?.toLowerCase() || ''
        isAlphabetical = true
        break
      case 'status_alpha_desc':
        aValue = a.status?.toLowerCase() || ''
        bValue = b.status?.toLowerCase() || ''
        isAlphabetical = true
        isDescending = true
        break
      case 'created_at':
      default:
        aValue = new Date(a.created_at).getTime()
        bValue = new Date(b.created_at).getTime()
        break
    }

    // For alphabetical sorts, use predefined order
    if (isAlphabetical) {
      if (aValue < bValue) return isDescending ? 1 : -1
      if (aValue > bValue) return isDescending ? -1 : 1
      return 0
    }

    // For regular sorts, use sortOrder
    if (aValue < bValue) {
      return currentFilters.value.sortOrder === 'asc' ? -1 : 1
    }
    if (aValue > bValue) {
      return currentFilters.value.sortOrder === 'asc' ? 1 : -1
    }
    return 0
  })

  items.value = filteredData
}

// Enhanced fetch function that stores all items
const fetchAndApplyFilters = async () => {
  await fetchDashboardStats()
  allItems.value = [...items.value] // Store all items before filtering

  // Load conversation counts for all items
  if (allItems.value.length > 0) {
    const itemIds = allItems.value.map(item => item.id)
    try {
      conversationCounts.value = await getMultipleItemsConversationCounts(itemIds)
    } catch (error) {
      console.error('Error loading conversation counts:', error)
      conversationCounts.value = {}
    }
  }

  applyFilters() // Apply current filters
}

const {
  postingItem,
  showPostDialog,
  updatingItems,
  newItemForm,
  postMissingItem,
  deleteItemById,
  showErrorDialog,
  errorMessage
} = useAdminItemActions(fetchAndApplyFilters)

// Claim dialog state
const showClaimDialog = ref(false)
const selectedItemForClaim = ref<Item | null>(null)

// Delete confirmation dialog state
const showDeleteDialog = ref(false)
const selectedItemForDelete = ref<Item | null>(null)
const deletingItem = ref(false)

// Handle showing claim dialog
const handleShowClaimDialog = (item: Item) => {
  selectedItemForClaim.value = item
  showClaimDialog.value = true
}

// Handle claim item with refresh
const onClaimItem = async (itemId: number, claimedBy: string) => {
  await markItemAsClaimed(itemId, claimedBy)
  await fetchAndApplyFilters()
}

// Handle update item description
const handleUpdateDescription = async (itemId: number, newDescription: string) => {
  try {
    await updateItemDescription(itemId, newDescription)
    // Refresh the items to show the updated description
    await fetchAndApplyFilters()
  } catch (error) {
    console.error('Failed to update item description:', error)
    // You could show an error dialog here if needed
  }
}

// Handle delete item with confirmation
const handleDeleteItem = async (item: Item) => {
  selectedItemForDelete.value = item
  showDeleteDialog.value = true
}

// Confirm delete item
const confirmDeleteItem = async () => {
  if (!selectedItemForDelete.value) return

  deletingItem.value = true
  try {
    await deleteItemById(selectedItemForDelete.value.id)
    showDeleteDialog.value = false
    selectedItemForDelete.value = null
  } catch (error) {
    // Error is handled by the composable
  } finally {
    deletingItem.value = false
  }
}

// Cancel delete item
const cancelDeleteItem = () => {
  selectedItemForDelete.value = null
}

// Filter handlers
const handleFiltersUpdate = (filters: FilterData) => {
  currentFilters.value = filters
  applyFilters()
}

const handleFiltersReset = () => {
  currentFilters.value = {
    search: '',
    statusFilter: 'all',
    sortBy: 'created_at',
    sortOrder: 'desc',
    dateFrom: '',
    dateTo: '',
    showClaimed: false,
  }
  applyFilters()
}

const filteredItems = computed(() => {
  return items.value
})

// Check if any filters are active
const hasActiveFilters = computed(() => {
  return currentFilters.value.search !== '' ||
         currentFilters.value.statusFilter !== 'all' ||
         currentFilters.value.dateFrom !== '' ||
         currentFilters.value.dateTo !== '' ||
         currentFilters.value.showClaimed !== false ||
         currentFilters.value.sortBy !== 'created_at' ||
         currentFilters.value.sortOrder !== 'desc'
})

onMounted(async () => {
  await fetchAndApplyFilters()
  const userCount = await getTotalUsersCount()
  stats.value.totalUsers = userCount
})
</script>

<template>
  <InnerLayoutWrapper>
    <template #content>
      <div  class="dashboard container-fluid mx-2 mx-md-5 my-3 my-md-5">
        <div class="d-flex flex-column flex-sm-row justify-space-between align-start align-sm-center mb-4 mb-md-6 gap-3">
          <h1 class="text-h5 text-sm-h4 font-weight-bold text-green-darken-4">
            <span class="d-none d-sm-inline">CSU Lost & Found Dashboard</span>
            <span class="d-inline d-sm-none">CSU Dashboard</span>
          </h1>
          <div class="d-flex flex-column flex-sm-row gap-2 w-100 w-sm-auto">
            <v-btn
              color="success"
              prepend-icon="mdi-plus-circle"
              @click="showPostDialog = true"
              size="small"
              class="text-caption text-sm-body-2"
              block
              :class="{ 'mb-2 mb-sm-0': true }"
            >
              <span class="d-none d-sm-inline">Post Missing Item</span>
              <span class="d-inline d-sm-none">Post Item</span>
            </v-btn>

          </div>
        </div>

        <v-row v-if="loading">
          <v-col cols="12">
            <div class="d-flex justify-center align-center" style="height: 400px;">
              <v-progress-circular size="64" indeterminate color="primary" />
            </div>
          </v-col>
        </v-row>

        <template v-else>
          <StatsCards :stats="stats" />

          <!-- Dashboard Filters -->
          <DashboardFilters
            :loading="loading"
            @update:filters="handleFiltersUpdate"
            @reset:filters="handleFiltersReset"
          />

          <!-- Results Summary -->
          <div v-if="!loading && filteredItems.length > 0" class="mb-3 d-flex justify-space-between align-center">
            <div class="text-body-2 text-medium-emphasis">
              Showing {{ filteredItems.length }} of {{ allItems.length }} items
            </div>
            <div v-if="filteredItems.length !== allItems.length" class="text-caption text-primary">
              {{ allItems.length - filteredItems.length }} items filtered out
            </div>
          </div>

          <v-row>
            <v-col cols="12" lg="12">
              <div class="items-container">
                <div v-if="filteredItems.length === 0" class="text-center py-8">
                  <v-icon size="64" color="grey-lighten-1">
                    {{ hasActiveFilters ? 'mdi-magnify' : 'mdi-inbox' }}
                  </v-icon>
                  <div class="text-h6 text-grey-darken-1 mt-2">
                    {{ hasActiveFilters ? 'No items found' : 'No items posted yet' }}
                  </div>
                  <div class="text-body-2 text-grey-darken-1">
                    {{ hasActiveFilters ? 'Try adjusting your search filters' : 'Posted items will appear here' }}
                  </div>
                </div>

                <v-row v-else>
                  <v-col
                    v-for="item in filteredItems"
                    :key="item.id"
                    cols="12"
                    md="6"
                    class="mb-3"
                  >
                    <AdminDashboardItemCard
                      :item="item"
                      :is-updating="updatingItems.has(item.id)"
                      :conversation-count="conversationCounts[item.id] || 0"
                      @show-claim-dialog="handleShowClaimDialog"
                      @delete-item="handleDeleteItem"
                      @update-description="handleUpdateDescription"
                    />
                  </v-col>
                </v-row>
              </div>
            </v-col>


          </v-row>

          <RecentActivity :stats="stats" />
        </template>

        <PostItemDialog
          v-model="showPostDialog"
          :posting="postingItem"
          :form="newItemForm"
          @submit="postMissingItem"
        />

        <ClaimItemDialog
          v-model="showClaimDialog"
          :item="selectedItemForClaim"
          :loading="selectedItemForClaim ? updatingItems.has(selectedItemForClaim.id) : false"
          @claim-item="onClaimItem"
        />

        <ConfirmationDialog
          v-model="showDeleteDialog"
          title="Delete Item"
          :message="`Are you sure you want to delete '${selectedItemForDelete?.title}'? This action cannot be undone.`"
          confirm-text="Delete"
          cancel-text="Cancel"
          confirm-color="error"
          :loading="deletingItem"
          @confirm="confirmDeleteItem"
          @cancel="cancelDeleteItem"
        />

        <ErrorDialog
          v-model="showErrorDialog"
          :message="errorMessage"
        />
      </div>
    </template>
  </InnerLayoutWrapper>
</template>
