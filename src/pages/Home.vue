<script setup lang="ts">
import { onMounted } from 'vue'
import InnerLayoutWrapper from '@/layouts/InnerLayoutWrapper.vue'
import ItemCards from '@/pages/admin/components/ItemCard.vue'
import { useItemsStore } from '@/stores/items'

const itemsStore = useItemsStore()

// Destructure store properties and methods
const {
  items,
  itemsLoading,
  updatingItemId,
  fetchItems,
  markItemAsClaimed,
  markItemAsUnclaimed
} = itemsStore

// Load items on component mount
onMounted(() => {
  fetchItems()
})
</script>

<template>
  <InnerLayoutWrapper>
    <template #content>
      <v-container fluid class="pa-6">
        <!-- Page Header -->
        <v-row class="mb-6">
          <v-col cols="12">
            <div class="text-start">
              <h1 class="text-h3 text-md-h2 font-weight-bold text-primary mb-2">
                Lost & Found
              </h1>
              <p class="text-h6 text-grey-darken-1">
                Help reunite lost items with their owners
              </p>
            </div>
          </v-col>
        </v-row>

        <!-- Items Section -->
        <v-row>
          <v-col cols="12">

              <v-card-title class="text-h5 font-weight-bold mb-4 d-flex align-center">
                <v-icon class="me-2" color="primary">mdi-package-variant-closed</v-icon>
                Recent Items
                <v-spacer />
                <v-chip
                  v-if="!itemsLoading"
                  color="info"
                  variant="tonal"
                  size="small"
                >
                  {{ items.length }} items
                </v-chip>
              </v-card-title>

              <!-- Loading State -->
              <div v-if="itemsLoading" class="text-center py-12">
                <v-progress-circular
                  indeterminate
                  color="primary"
                  size="48"
                />
                <p class="text-body-1 mt-4">Loading items...</p>
              </div>

              <!-- Empty State -->
              <div v-else-if="items.length === 0" class="text-center py-12">
                <v-icon size="80" color="grey-lighten-1" class="mb-4">
                  mdi-package-variant-closed-remove
                </v-icon>
                <h3 class="text-h5 text-grey-darken-1 mb-2">No items found</h3>
                <p class="text-body-1 text-grey-darken-2 mb-4">
                  There are currently no lost or found items to display.
                </p>
                <v-btn
                  color="primary"
                  variant="outlined"
                  prepend-icon="mdi-refresh"
                  @click="fetchItems"
                >
                  Refresh
                </v-btn>
              </div>

              <!-- Items Grid -->
              <v-row v-else class="items-grid">
                <v-col
                  v-for="item in items"
                  :key="item.id"
                  cols="12"
                  sm="6"
                  md="4"
                  lg="3"
                  xl="3"
                >
                  <ItemCards
                    :item="item"
                    :is-updating="updatingItemId === item.id"
                    @mark-as-claimed="markItemAsClaimed"
                    @mark-as-unclaimed="markItemAsUnclaimed"
                  />
                </v-col>
              </v-row>

          </v-col>
        </v-row>
      </v-container>
    </template>
  </InnerLayoutWrapper>
</template>

<style scoped>
.items-grid {
  min-height: 200px;
}

.v-card {
  border-radius: 12px;
}
</style>
