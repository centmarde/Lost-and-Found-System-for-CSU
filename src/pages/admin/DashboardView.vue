<script lang="ts" setup>
import { ref, onMounted, computed } from 'vue'
import { createClient } from '@supabase/supabase-js'
import InnerLayoutWrapper from '@/layouts/InnerLayoutWrapper.vue'
import AdminItemCard from '@/pages/admin/components/AdminCard.vue'
import StatsCards from '@/pages/admin/components/StatsCards.vue'
import SearchBar from '@/pages/admin/components/SearchBar.vue'
import SystemStats from '@/pages/admin/components/SystemStats.vue'
import QuickSummary from '@/pages/admin/components/Summary.vue'
import RecentActivity from '@/pages/admin/components/RecentActivity.vue'
import PostItemDialog from '@/pages/admin/components/PostItemDialog.vue'
import { useDashboardData } from '@/pages/admin/components/composables/useDashboardData'
import { useAdminItemActions } from '@/pages/admin/components/composables/useAdminItems'
import '@/styles/dashboardview.css'

const {
  loading,
  stats,
  items,
  fetchDashboardStats,
  getTotalUsersCount
} = useDashboardData()

const {
  postingItem,
  showPostDialog,
  updatingItems,
  newItemForm,
  postMissingItem,
  markAsClaimed,
  markAsUnclaimed
} = useAdminItemActions(fetchDashboardStats)

const searchQuery = ref('')

const filteredItems = computed(() => {
  if (!searchQuery.value.trim()) {
    return items.value
  }

  const query = searchQuery.value.toLowerCase().trim()
  return items.value.filter(item =>
    (item.title?.toLowerCase().includes(query)) ||
    (item.description?.toLowerCase().includes(query)) ||
    (item.status?.toLowerCase().includes(query))
  )
})

onMounted(async () => {
  await fetchDashboardStats()
  const userCount = await getTotalUsersCount()
  stats.value.totalUsers = userCount
})
</script>

<template>
  <InnerLayoutWrapper>
    <template #content>
      <div class="dashboard">
        <div class="d-flex justify-space-between align-center mb-6">
          <h1 class="text-h4 font-weight-bold text-primary">
            CSU Lost & Found Dashboard
          </h1>
          <div class="d-flex gap-2">
            <v-btn
              color="success"
              prepend-icon="mdi-plus-circle"
              @click="showPostDialog = true"
            >
              Post Missing Item
            </v-btn>
            <v-btn
              color="primary"
              variant="outlined"
              prepend-icon="mdi-refresh"
              @click="fetchDashboardStats"
              :loading="loading"
            >
              Refresh
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

          <v-row>
            <v-col cols="12" lg="8">
              <SearchBar v-model="searchQuery" />

              <div class="items-container">
                <div v-if="filteredItems.length === 0" class="text-center py-8">
                  <v-icon size="64" color="grey-lighten-1">
                    {{ searchQuery ? 'mdi-magnify' : 'mdi-inbox' }}
                  </v-icon>
                  <div class="text-h6 text-grey-darken-1 mt-2">
                    {{ searchQuery ? 'No items found' : 'No items posted yet' }}
                  </div>
                  <div class="text-body-2 text-grey-darken-1">
                    {{ searchQuery ? 'Try adjusting your search terms' : 'Posted items will appear here' }}
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
                    <AdminItemCard
                      :item="item"
                      :is-updating="updatingItems.has(item.id)"
                      @mark-as-claimed="markAsClaimed"
                      @mark-as-unclaimed="markAsUnclaimed"
                    />
                  </v-col>
                </v-row>
              </div>
            </v-col>

            <v-col cols="12" lg="4">
              <QuickSummary :stats="stats" />
              <SystemStats :stats="stats" />
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
      </div>
    </template>
  </InnerLayoutWrapper>
</template>