
<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useAuthUserStore } from '@/stores/authUser'
import { useToast } from 'vue-toastification'
import { getRoleName, getRoleColor } from '@/utils/usersTableHelpers'
import UserDetailsDialog from './dialogs/UserDetailsDialog.vue'

// Store and utilities
const authStore = useAuthUserStore()
const toast = useToast()

// Reactive state
const users = ref<any[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const userDialog = ref(false)
const selectedUser = ref<any>(null)
const roleCache = ref<Record<number, string>>({}) // Cache for role titles from database

// Table headers
const headers = [
  {
    title: 'User',
    align: 'start' as const,
    sortable: true,
    key: 'email',
  },
  {
    title: 'Created Date',
    align: 'start' as const,
    sortable: true,
    key: 'created_at',
  },
  {
    title: 'Role',
    align: 'center' as const,
    sortable: true,
    key: 'role',
  },
  {
    title: 'Actions',
    align: 'center' as const,
    sortable: false,
    key: 'actions',
  },
]

// Methods
const getRoleTitleAsync = async (roleId: number): Promise<string> => {
  if (!roleId) return 'No Role'

  // Check cache first
  if (roleCache.value[roleId]) {
    return roleCache.value[roleId]
  }

  try {
    const result = await authStore.getRoleTitleById(roleId)

    if (result.title) {
      roleCache.value[roleId] = result.title
      return result.title
    } else {
      // Fallback to helper function if database query fails
      return getRoleName(roleId)
    }
  } catch (error) {
    console.error('Error fetching role title:', error)
    // Fallback to helper function
    return getRoleName(roleId)
  }
}

const fetchUsers = async () => {
  loading.value = true
  error.value = null

  try {
    const result = await authStore.getAllUsers()

    if (result.error) {
      const errorMessage = typeof result.error === 'string'
        ? result.error
        : (result.error as any)?.message || 'Failed to fetch users'
      error.value = errorMessage
      toast.error('Failed to load users')
    } else if (result.users) {
      users.value = result.users

      // Preload role titles from database for all unique role IDs
      const roleIds = new Set<number>()
      result.users.forEach(user => {
        const roleId = user.raw_user_meta_data?.role
        if (roleId && typeof roleId === 'number') {
          roleIds.add(roleId)
        }
      })

      // Fetch all role titles from database
      for (const roleId of roleIds) {
        await getRoleTitleAsync(roleId)
      }

      //toast.success(`Loaded ${result.users.length} users`)
    }
  } catch (err) {
    error.value = 'An unexpected error occurred'
    toast.error('An unexpected error occurred')
    console.error('Error fetching users:', err)
  } finally {
    loading.value = false
  }
}

const getRoleTitleSync = (roleId: number): string => {
  if (!roleId) return 'No Role'

  // Return from cache if available (database value)
  if (roleCache.value[roleId]) {
    return roleCache.value[roleId]
  }

  // Fallback to helper function while loading
  return getRoleName(roleId)
}

const refreshUsers = () => {
  fetchUsers()
}

const viewUser = (user: any) => {
  selectedUser.value = user
  userDialog.value = true
}

const editUser = (user: any) => {
  // TODO: Implement edit functionality
  toast.info(`Edit functionality for ${user.email} coming soon`)
}

const deleteUser = (user: any) => {
  // TODO: Implement delete functionality
  toast.warning(`Delete functionality for ${user.email} coming soon`)
}

// Utility functions
const formatDate = (dateString: string) => {
  if (!dateString) return 'N/A'
  return new Date(dateString).toLocaleDateString()
}

const formatTime = (dateString: string) => {
  if (!dateString) return 'N/A'
  return new Date(dateString).toLocaleTimeString()
}

// Lifecycle
onMounted(() => {
  fetchUsers()
})
</script>

<template>
  <div>
     <!-- Header Section -->
    <v-row class="mb-6">
      <v-col cols="12">
        <div class="d-flex justify-space-between align-center">
          <div>
            <h1 class="text-h3 text-md-h2 font-weight-bold text-primary mb-2">User Management</h1>
            <p class="text-body-1 text-grey-darken-1">
              Manage system users and details
            </p>
          </div>

        </div>
      </v-col>
    </v-row>

      <v-card-title class="d-flex align-center justify-space-between">
        <div class="text-h5 text-green-darken-4">User Management</div>
        <v-btn
          color="primary"
          prepend-icon="mdi-refresh"
          @click="refreshUsers"
          :loading="loading"
        >
          Refresh
        </v-btn>
      </v-card-title>

      <v-card-text>
        <!-- Loading indicator -->
        <v-progress-linear
          v-if="loading"
          indeterminate
          color="primary"
          class="mb-4"
        ></v-progress-linear>

        <!-- Error message -->
        <v-alert
          v-if="error"
          type="error"
          variant="tonal"
          closable
          class="mb-4"
          @click:close="error = null"
        >
          {{ error }}
        </v-alert>

        <!-- Users table -->
        <v-data-table
          :headers="headers"
          :items="users"
          :loading="loading"
          :items-per-page="10"
          class="elevation-1"
          item-key="id"
        >
          <!-- Email column with avatar -->
          <template v-slot:item.email="{ item }">
            <div class="d-flex align-center">
              <v-avatar size="32" class="me-3">
                <v-icon>mdi-account</v-icon>
              </v-avatar>
              <div>
                <div class="font-weight-medium">{{ item.email }}</div>
                <div class="text-caption text-medium-emphasis">
                  {{ item.raw_user_meta_data?.full_name || 'No name provided' }}
                </div>
              </div>
            </div>
          </template>

          <!-- Created date column -->
          <template v-slot:item.created_at="{ item }">
            <div>
              <div>{{ formatDate(item.created_at) }}</div>
              <div class="text-caption text-medium-emphasis">
                {{ formatTime(item.created_at) }}
              </div>
            </div>
          </template>

          <!-- Role column -->
          <template v-slot:item.role="{ item }">
            <v-chip
              :color="getRoleColor(item.raw_user_meta_data?.role)"
              size="small"
              variant="tonal"
            >
              {{ getRoleTitleSync(item.raw_user_meta_data?.role) }}
            </v-chip>
          </template>

          <!-- Actions column -->
          <template v-slot:item.actions="{ item }">
            <div class="d-flex justify-center align-center gap-1">
              <v-btn
                icon="mdi-eye"
                size="small"
                variant="text"
                color="primary"
                @click="viewUser(item)"
              >
                <v-icon>mdi-eye</v-icon>
                <v-tooltip activator="parent" location="top">
                  View Details
                </v-tooltip>
              </v-btn>

              <v-btn
                icon="mdi-pencil"
                size="small"
                variant="text"
                color="orange"
                @click="editUser(item)"
              >
                <v-icon>mdi-pencil</v-icon>
                <v-tooltip activator="parent" location="top">
                  Edit User
                </v-tooltip>
              </v-btn>

              <v-btn
                icon="mdi-delete"
                size="small"
                variant="text"
                color="error"
                @click="deleteUser(item)"
              >
                <v-icon>mdi-delete</v-icon>
                <v-tooltip activator="parent" location="top">
                  Delete User
                </v-tooltip>
              </v-btn>
            </div>
          </template>

          <!-- No data message -->
          <template v-slot:no-data>
            <div class="text-center py-8">
              <v-icon size="64" color="grey">mdi-account-off</v-icon>
              <div class="text-h6 mt-4">No users found</div>
              <div class="text-body-2 text-medium-emphasis">
                No users are currently registered in the system.
              </div>
            </div>
          </template>

          <!-- Loading message -->
          <template v-slot:loading>
            <v-skeleton-loader type="table-row@10"></v-skeleton-loader>
          </template>
        </v-data-table>
      </v-card-text>

    <!-- User Details Dialog Component -->
    <UserDetailsDialog
      v-model="userDialog"
      :selected-user="selectedUser"
    />

  </div>
</template>

<style scoped>
.v-data-table {
  border-radius: 8px;
}
</style>
