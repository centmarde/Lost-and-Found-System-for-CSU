<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useToast } from 'vue-toastification'
import InnerLayoutWrapper from '@/layouts/InnerLayoutWrapper.vue'
import ItemCards from '@/pages/admin/components/ItemCard.vue' 
import { supabase } from '@/lib/supabase' 

interface Item {
  id: number
  title: string
  description: string
  status: 'lost' | 'found'
  user_id: string
  claimed_by: string
  created_at: string
}

const toast = useToast()

// Items state
const items = ref<Item[]>([])
const itemsLoading = ref(false)
const updatingItemId = ref<number | null>(null)

// Fetch items from database
const fetchItems = async () => {
  itemsLoading.value = true
  try {
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching items:', error)
      toast.error('Failed to load items')
      return
    }

    items.value = data || []
  } catch (error) {
    console.error('Error:', error)
    toast.error('An unexpected error occurred while loading items')
  } finally {
    itemsLoading.value = false
  }
}

// Mark item as claimed
const markItemAsClaimed = async (itemId: number) => {
  updatingItemId.value = itemId
  try {
    const { error } = await supabase
      .from('items')
      .update({ claimed_by: 'current_user' }) // You might want to handle user ID differently
      .eq('id', itemId)

    if (error) {
      console.error('Error claiming item:', error)
      toast.error('Failed to claim item')
      return
    }

    // Update local state
    const item = items.value.find(i => i.id === itemId)
    if (item) {
      item.claimed_by = 'current_user'
    }

    toast.success('Item marked as claimed!')
  } catch (error) {
    console.error('Error:', error)
    toast.error('An unexpected error occurred')
  } finally {
    updatingItemId.value = null
  }
}

// Mark item as unclaimed
const markItemAsUnclaimed = async (itemId: number) => {
  updatingItemId.value = itemId
  try {
    const { error } = await supabase
      .from('items')
      .update({ claimed_by: null })
      .eq('id', itemId)

    if (error) {
      console.error('Error unclaiming item:', error)
      toast.error('Failed to unclaim item')
      return
    }

    // Update local state
    const item = items.value.find(i => i.id === itemId)
    if (item) {
      item.claimed_by = ''
    }

    toast.success('Item marked as unclaimed!')
  } catch (error) {
    console.error('Error:', error)
    toast.error('An unexpected error occurred')
  } finally {
    updatingItemId.value = null
  }
}

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
            <div class="text-center">
              <h1 class="text-h3 font-weight-bold text-primary mb-2">
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
            <v-card elevation="2" class="pa-4">
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
            </v-card>
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

.text-primary {
  background: linear-gradient(45deg, #1976d2, #42a5f5);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
</style>