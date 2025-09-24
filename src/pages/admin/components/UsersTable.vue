
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthUserStore } from '@/stores/authUser'
import { useToast } from 'vue-toastification'

// Store and utilities
const authStore = useAuthUserStore()
const toast = useToast()

// Reactive state
const users = ref<any[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const userDialog = ref(false)
const selectedUser = ref<any>(null)

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

const getRoleName = (roleId: number | undefined) => {
  switch (roleId) {
    case 1:
      return 'Admin'
    case 2:
      return 'Moderator'
    case 3:
      return 'Student'
    case 4:
      return 'Faculty'
    default:
      return 'Unknown'
  }
}

const getRoleColor = (roleId: number | undefined) => {
  switch (roleId) {
    case 1:
      return 'error'
    case 2:
      return 'warning'
    case 3:
      return 'primary'
    case 4:
      return 'success'
    default:
      return 'grey'
  }
}

// Lifecycle
onMounted(() => {
  fetchUsers()
})
</script>

<template>
  <div>
    <v-card>
      <v-card-title class="d-flex align-center justify-space-between">
        <div class="text-h5">User Management</div>
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
                  {{ item.user_metadata?.full_name || 'No name provided' }}
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
              :color="getRoleColor(item.user_metadata?.role)"
              size="small"
              variant="tonal"
            >
              {{ getRoleName(item.user_metadata?.role) }}
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
    </v-card>

    <!-- User Details Dialog -->
    <v-dialog v-model="userDialog" max-width="600">
      <v-card v-if="selectedUser">
        <v-card-title class="d-flex align-center">
          <v-icon class="me-2">mdi-account</v-icon>
          User Details
        </v-card-title>

        <v-card-text>
          <v-container>
            <v-row>
              <v-col cols="12" md="6">
                <v-text-field
                  label="ID"
                  :model-value="selectedUser.id"
                  readonly
                  variant="outlined"
                  density="comfortable"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  label="Email"
                  :model-value="selectedUser.email"
                  readonly
                  variant="outlined"
                  density="comfortable"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  label="Full Name"
                  :model-value="selectedUser.user_metadata?.full_name || 'Not provided'"
                  readonly
                  variant="outlined"
                  density="comfortable"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  label="Role"
                  :model-value="getRoleName(selectedUser.user_metadata?.role)"
                  readonly
                  variant="outlined"
                  density="comfortable"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  label="Created At"
                  :model-value="formatDate(selectedUser.created_at)"
                  readonly
                  variant="outlined"
                  density="comfortable"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  label="Email Verified"
                  :model-value="selectedUser.email_confirmed_at ? 'Yes' : 'No'"
                  readonly
                  variant="outlined"
                  density="comfortable"
                />
              </v-col>
            </v-row>
          </v-container>
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn color="primary" @click="userDialog = false">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<style scoped>
.v-data-table {
  border-radius: 8px;
}
</style>
