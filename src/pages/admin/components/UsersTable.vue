
<!--
  UsersTable Component

  Features:
  - Search by name or email
  - Filter by role and ban status
  - Sort by multiple criteria (date, email, role, name)
  - Date range filtering
  - Responsive design with desktop table and mobile cards
  - Real-time filter application
  - Filter state preservation during user operations
-->
<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useAuthUserStore } from '@/stores/authUser'
import { useUserRolesStore } from '@/stores/roles'
import { useToast } from 'vue-toastification'
import { getRoleColor } from '@/utils/usersTableHelpers'
import { useUserActions } from '@/composables/useUserActions'
import UserDetailsDialog from './dialogs/UserDetailsDialog.vue'
import EditUserDialog from './dialogs/EditUserDialog.vue'
import ConfirmationDialog from './dialogs/ConfirmationDialog.vue'
import UserSearchFilters from './UserSearchFilters.vue'

// Store and utilities
const authStore = useAuthUserStore()
const rolesStore = useUserRolesStore()
const toast = useToast()

// User actions composable
const {
  // Loading states
  editingUser,
  deletingUser,
  // Dialog states
  showEditDialog,
  showConfirmationDialog,
  // Form data
  selectedUser: editingSelectedUser,
  editForm,
  // Actions
  openEditDialog,
  closeEditDialog,
  updateUser,
  confirmDeleteUser,
  restoreUser,
  confirmBanUser,
  confirmUnbanUser,
  closeConfirmationDialog,
  executeConfirmedAction,
} = useUserActions()

// Reactive state
const users = ref<any[]>([])
const allUsers = ref<any[]>([]) // Store all users for filtering
const loading = ref(false)
const error = ref<string | null>(null)
const userDialog = ref(false)
const selectedUser = ref<any>(null)
const roleCache = ref<Record<number, string>>({}) // Cache for role titles from roles store



// Filter state
interface FilterData {
  search: string
  roleFilter: number | null
  statusFilter: string
  sortBy: string
  sortOrder: 'asc' | 'desc'
  dateFrom: string
  dateTo: string
}

const currentFilters = ref<FilterData>({
  search: '',
  roleFilter: null,
  statusFilter: 'all',
  sortBy: 'created_at',
  sortOrder: 'desc',
  dateFrom: '',
  dateTo: '',
})

// Table headers
const headers = [
  {
    title: 'User',
    align: 'start' as const,
    sortable: false,
    key: 'email',
  },
  {
    title: 'Created Date',
    align: 'start' as const,
    sortable: false,
    key: 'created_at',
  },
  {
    title: 'Role',
    align: 'center' as const,
    sortable: false,
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
const getRoleTitleById = async (roleId: number): Promise<string> => {
  if (!roleId) return 'No Role'

  // Check cache first
  if (roleCache.value[roleId]) {
    return roleCache.value[roleId]
  }

  try {
    // Find role in the roles store
    const role = rolesStore.roles.find(r => r.id === roleId)
    if (role) {
      roleCache.value[roleId] = role.title
      return role.title
    }

    // If not found in store, fetch a specific role
    const fetchedRole = await rolesStore.fetchRoleById(roleId)
    if (fetchedRole) {
      roleCache.value[roleId] = fetchedRole.title
      return fetchedRole.title
    }

    return 'Unknown Role'
  } catch (error) {
    console.error('Error fetching role title:', error)
    return 'Unknown Role'
  }
}

const fetchUsers = async () => {
  loading.value = true
  error.value = null

  try {
    // First, fetch all roles to populate the store
    await rolesStore.fetchRoles()

    // Then fetch users
    const result = await authStore.getAllUsers()

    if (result.error) {
      const errorMessage = typeof result.error === 'string'
        ? result.error
        : (result.error as any)?.message || 'Failed to fetch users'
      error.value = errorMessage
      toast.error('Failed to load users')
    } else if (result.users) {
      allUsers.value = result.users // Store all users

      // Preload role titles from roles store for all unique role IDs
      const roleIds = new Set<number>()
      result.users.forEach(user => {
        const roleId = user.raw_user_meta_data?.role || user.raw_app_meta_data?.role
        if (roleId && typeof roleId === 'number') {
          roleIds.add(roleId)
        }
      })

      // Populate cache with role titles from the store
      for (const roleId of roleIds) {
        await getRoleTitleById(roleId)
      }

      // Apply current filters
      applyFilters()

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

// Filter methods
const applyFilters = () => {
  let filteredUsers = [...allUsers.value]

  // Apply search filter
  if (currentFilters.value.search) {
    const searchTerm = currentFilters.value.search.toLowerCase()
    filteredUsers = filteredUsers.filter(user => {
      const email = user.email?.toLowerCase() || ''
      const fullName = user.raw_user_meta_data?.full_name?.toLowerCase() || ''
      return email.includes(searchTerm) || fullName.includes(searchTerm)
    })
  }

  // Apply role filter
  if (currentFilters.value.roleFilter !== null) {
    filteredUsers = filteredUsers.filter(user => {
      const userRole = user.raw_user_meta_data?.role || user.raw_app_meta_data?.role
      return userRole === currentFilters.value.roleFilter
    })
  }

  // Apply status filter
  filteredUsers = filteredUsers.filter(user => {
    const isBanned = user.raw_app_meta_data?.banned || user.raw_app_meta_data?.deleted
    if (currentFilters.value.statusFilter === 'banned') {
      return isBanned
    } else {
      // For 'all' and 'active' status, exclude banned/deleted users
      return !isBanned
    }
  })

  // Apply date filters
  if (currentFilters.value.dateFrom) {
    const fromDate = new Date(currentFilters.value.dateFrom)
    filteredUsers = filteredUsers.filter(user => {
      const createdDate = new Date(user.created_at)
      return createdDate >= fromDate
    })
  }

  if (currentFilters.value.dateTo) {
    const toDate = new Date(currentFilters.value.dateTo)
    toDate.setHours(23, 59, 59, 999) // Include the entire day
    filteredUsers = filteredUsers.filter(user => {
      const createdDate = new Date(user.created_at)
      return createdDate <= toDate
    })
  }

  // Apply sorting
  filteredUsers.sort((a, b) => {
    let aValue, bValue
    let isAlphabetical = false
    let isDescending = false

    switch (currentFilters.value.sortBy) {
      case 'email':
        aValue = a.email?.toLowerCase() || ''
        bValue = b.email?.toLowerCase() || ''
        break
      case 'email_alpha_asc':
        aValue = a.email?.toLowerCase() || ''
        bValue = b.email?.toLowerCase() || ''
        isAlphabetical = true
        break
      case 'email_alpha_desc':
        aValue = a.email?.toLowerCase() || ''
        bValue = b.email?.toLowerCase() || ''
        isAlphabetical = true
        isDescending = true
        break
      case 'full_name':
        aValue = a.raw_user_meta_data?.full_name?.toLowerCase() || ''
        bValue = b.raw_user_meta_data?.full_name?.toLowerCase() || ''
        break
      case 'name_alpha_asc':
        aValue = a.raw_user_meta_data?.full_name?.toLowerCase() || ''
        bValue = b.raw_user_meta_data?.full_name?.toLowerCase() || ''
        isAlphabetical = true
        break
      case 'name_alpha_desc':
        aValue = a.raw_user_meta_data?.full_name?.toLowerCase() || ''
        bValue = b.raw_user_meta_data?.full_name?.toLowerCase() || ''
        isAlphabetical = true
        isDescending = true
        break
      case 'role':
        aValue = getRoleTitleSync(a.raw_user_meta_data?.role || a.raw_app_meta_data?.role).toLowerCase()
        bValue = getRoleTitleSync(b.raw_user_meta_data?.role || b.raw_app_meta_data?.role).toLowerCase()
        break
      case 'role_alpha_asc':
        aValue = getRoleTitleSync(a.raw_user_meta_data?.role || a.raw_app_meta_data?.role).toLowerCase()
        bValue = getRoleTitleSync(b.raw_user_meta_data?.role || b.raw_app_meta_data?.role).toLowerCase()
        isAlphabetical = true
        break
      case 'role_alpha_desc':
        aValue = getRoleTitleSync(a.raw_user_meta_data?.role || a.raw_app_meta_data?.role).toLowerCase()
        bValue = getRoleTitleSync(b.raw_user_meta_data?.role || b.raw_app_meta_data?.role).toLowerCase()
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

    if (aValue < bValue) {
      return currentFilters.value.sortOrder === 'asc' ? -1 : 1
    }
    if (aValue > bValue) {
      return currentFilters.value.sortOrder === 'asc' ? 1 : -1
    }
    return 0
  })

  users.value = filteredUsers
}

const handleFiltersUpdate = (filters: FilterData) => {
  currentFilters.value = filters
  applyFilters()
}

const handleFiltersReset = () => {
  currentFilters.value = {
    search: '',
    roleFilter: null,
    statusFilter: 'all',
    sortBy: 'created_at',
    sortOrder: 'desc',
    dateFrom: '',
    dateTo: '',
  }
  applyFilters()
}



const getRoleTitleSync = (roleId: number): string => {
  if (!roleId) return 'No Role'

  // Return from cache if available (from roles store)
  if (roleCache.value[roleId]) {
    return roleCache.value[roleId]
  }

  // Try to find in current roles store
  const role = rolesStore.roles.find(r => r.id === roleId)
  if (role) {
    roleCache.value[roleId] = role.title
    return role.title
  }

  // Return unknown if not found
  return 'Unknown Role'
}

const refreshUsers = () => {
  fetchUsers()
}

// Computed property for available roles to pass to filter component
const availableRoles = computed(() => {
  return rolesStore.roles || []
})



const viewUser = (user: any) => {
  selectedUser.value = user
  userDialog.value = true
}

const editUser = (user: any) => {
  openEditDialog(user)
}

const deleteUser = (user: any) => {
  confirmDeleteUser(user)
}

// Handle user restoration
const handleUserRestore = async (user: any) => {
  const result = await restoreUser(user)
  if (result.success) {
    await fetchUsers() // Refresh the users list
  }
}

// Handle user update with refresh
const handleUserUpdate = async () => {
  const result = await updateUser()
  if (result.success) {
    await fetchUsers() // Refresh the users list with current filters
  }
}

// Handle user deletion with refresh
const handleUserDeletion = async () => {
  await executeConfirmedAction()
  await fetchUsers() // Refresh the users list with current filters
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
    <v-row class="mb-4 mb-md-6">
      <v-col cols="12">
        <div class="d-flex flex-column flex-sm-row justify-center justify-sm-space-between align-center gap-3 gap-sm-0">
          <div class="flex-grow-1 text-center text-sm-start">
            <h1 class="text-h5 text-sm-h4 text-md-h3 text-lg-h2 font-weight-bold text-primary mb-1 mb-sm-2 user-management-title">
              User Management
            </h1>
            <p class="text-body-2 text-sm-body-1 text-grey-darken-1 mb-0">
              Manage system users and details
            </p>
          </div>

          <!-- Control buttons -->
          <div class="d-flex align-center flex-shrink-0 gap-2">

            <!-- Refresh button -->
            <v-btn
              color="primary"
              variant="tonal"
              @click="refreshUsers"
              :loading="loading"
              class="refresh-btn"
              size="small"
            >
              <v-icon size="16" class="mr-1">mdi-refresh</v-icon>
              <span class="d-none d-sm-inline">Refresh</span>
            </v-btn>
          </div>
        </div>
      </v-col>
    </v-row>

    <!-- Search and Filters Component -->
    <UserSearchFilters
      :loading="loading"
      :roles="availableRoles"
      @update:filters="handleFiltersUpdate"
      @reset:filters="handleFiltersReset"
    />



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

        <!-- Results Summary -->
        <div v-if="!loading && allUsers.length > 0" class="mb-3">
          <div class="d-flex justify-space-between align-center">
            <div class="text-body-2 text-medium-emphasis">
              Showing {{ users.length }} of {{ allUsers.length }} users
            </div>
            <div v-if="users.length !== allUsers.length" class="text-caption text-primary">
              {{ allUsers.length - users.length }} users filtered out
            </div>
          </div>


        </div>

        <!-- Desktop view - Data table for larger screens -->
        <div class="d-none d-md-block">
          <v-data-table
            :headers="headers"
            :items="users"
            :loading="loading"
            :items-per-page="10"
            class="elevation-1"
            item-key="id"
            :sort-by="[]"
            disable-sort
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
              <div class="d-flex flex-column align-center gap-1">
                <v-chip
                  :color="getRoleColor(item.raw_user_meta_data?.role || item.raw_app_meta_data?.role)"
                  size="small"
                  variant="tonal"
                >
                  {{ getRoleTitleSync(item.raw_user_meta_data?.role || item.raw_app_meta_data?.role) }}
                </v-chip>

                <!-- Ban/Delete status indicator -->
                <v-chip
                  v-if="item.raw_app_meta_data?.deleted"
                  color="warning"
                  size="x-small"
                  variant="tonal"
                >
                  <v-icon start size="12">mdi-delete</v-icon>
                  Deleted
                </v-chip>
                <v-chip
                  v-else-if="item.raw_app_meta_data?.banned"
                  color="error"
                  size="x-small"
                  variant="tonal"
                >
                  <v-icon start size="12">mdi-account-cancel</v-icon>
                  Banned
                </v-chip>
              </div>
            </template>

            <!-- Actions column -->
            <template v-slot:item.actions="{ item }">
              <div class="d-flex justify-center align-center gap-1">
                <v-btn
                  icon="mdi-eye"
                  size="small"


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
                  :loading="editingUser"
                  :disabled="item.raw_app_meta_data?.deleted"
                >
                  <v-icon>mdi-pencil</v-icon>
                  <v-tooltip activator="parent" location="top">
                    Edit User
                  </v-tooltip>
                </v-btn>

                <!-- Restore button (only for deleted users) -->
                <v-btn
                  v-if="item.raw_app_meta_data?.deleted"
                  icon="mdi-restore"
                  size="small"
                  variant="text"
                  color="success"
                  @click="handleUserRestore(item)"
                  :loading="deletingUser"
                >
                  <v-icon>mdi-restore</v-icon>
                  <v-tooltip activator="parent" location="top">
                    Restore User
                  </v-tooltip>
                </v-btn>

                <!-- Action Menu -->
                <v-menu>
                  <template v-slot:activator="{ props: menuProps }">
                    <v-btn
                      icon="mdi-dots-vertical"
                      size="small"
                      variant="text"
                      color="grey"
                      v-bind="menuProps"
                    >
                      <v-icon>mdi-dots-vertical</v-icon>
                      <v-tooltip activator="parent" location="top">
                        More Actions
                      </v-tooltip>
                    </v-btn>
                  </template>

                  <v-list density="compact" min-width="160">
                    <!-- Ban/Unban Actions (only for active users) -->
                    <template v-if="!item.raw_app_meta_data?.deleted">
                      <v-list-item
                        v-if="!item.raw_app_meta_data?.banned"
                        @click="confirmBanUser(item)"
                        prepend-icon="mdi-account-cancel"
                      >
                        <v-list-item-title>Ban User</v-list-item-title>
                      </v-list-item>

                      <v-list-item
                        v-else
                        @click="confirmUnbanUser(item)"
                        prepend-icon="mdi-account-check"
                        class="text-success"
                      >
                        <v-list-item-title>Unban User</v-list-item-title>
                      </v-list-item>
                    </template>

                    <v-divider v-if="!item.raw_app_meta_data?.deleted" class="my-1"></v-divider>

                    <!-- Delete Action (only for active users) -->
                    <v-list-item
                      v-if="!item.raw_app_meta_data?.deleted"
                      @click="deleteUser(item)"
                      prepend-icon="mdi-delete"
                      class="text-error"
                      :disabled="deletingUser"
                    >
                      <v-list-item-title>Soft Delete User</v-list-item-title>
                    </v-list-item>
                  </v-list>
                </v-menu>
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
        </div>

        <!-- Mobile view - Cards for smaller screens -->
        <div class="d-block d-md-none">
          <!-- Loading skeleton for mobile -->
          <div v-if="loading" class="mb-4">
            <v-skeleton-loader
              v-for="i in 3"
              :key="i"
              type="card"
              class="mb-3"
            ></v-skeleton-loader>
          </div>

          <!-- No data message for mobile -->
          <div v-else-if="users.length === 0" class="text-center py-8">
            <v-icon size="64" color="grey">mdi-account-off</v-icon>
            <div class="text-h6 mt-4">No users found</div>
            <div class="text-body-2 text-medium-emphasis">
              No users are currently registered in the system.
            </div>
          </div>

          <!-- User cards -->
          <div v-else class="user-cards-container">
            <v-card
              v-for="user in users"
              :key="user.id"
              class="mb-3 elevation-2"
              :class="{ 'opacity-60': loading }"
            >
              <v-card-text class="pa-4">
                <!-- User info section -->
                <div class="d-flex align-center mb-3">
                  <v-avatar size="40" class="me-3">
                    <v-icon size="24">mdi-account</v-icon>
                  </v-avatar>
                  <div class="flex-grow-1 min-width-0">
                    <div class="font-weight-medium text-truncate">
                      {{ user.email }}
                    </div>
                    <div class="text-caption text-medium-emphasis text-truncate">
                      {{ user.raw_user_meta_data?.full_name || 'No name provided' }}
                    </div>
                    <!-- Role chip moved below user info -->
                    <div class="mt-2 d-flex flex-wrap gap-1">
                      <v-chip
                        :color="getRoleColor(user.raw_user_meta_data?.role || user.raw_app_meta_data?.role)"
                        size="small"
                        variant="tonal"
                      >
                        {{ getRoleTitleSync(user.raw_user_meta_data?.role || user.raw_app_meta_data?.role) }}
                      </v-chip>

                      <!-- Ban/Delete status indicator -->
                      <v-chip
                        v-if="user.raw_app_meta_data?.deleted"
                        color="warning"
                        size="small"
                        variant="tonal"
                      >
                        <v-icon start size="12">mdi-delete</v-icon>
                        Deleted
                      </v-chip>
                      <v-chip
                        v-else-if="user.raw_app_meta_data?.banned"
                        color="error"
                        size="small"
                        variant="tonal"
                      >
                        <v-icon start size="12">mdi-account-cancel</v-icon>
                        Banned
                      </v-chip>
                    </div>
                  </div>
                </div>

                <!-- Created date section -->
                <div class="d-flex align-center mb-3">
                  <v-icon size="16" color="medium-emphasis" class="me-2">
                    mdi-calendar
                  </v-icon>
                  <div class="text-body-2">
                    <span class="text-medium-emphasis">Joined:</span>
                    {{ formatDate(user.created_at) }} at {{ formatTime(user.created_at) }}
                  </div>
                </div>

                <!-- Actions section -->
                <div class="d-flex justify-end align-center mobile-actions-container">
                  <v-btn
                    size="x-small"
                    variant="tonal"

                    @click="viewUser(user)"
                    class="mobile-action-btn"
                    density="compact"
                  >
                    <v-icon size="14" class="me-1">mdi-eye</v-icon>
                    <span class="mobile-btn-text">View</span>
                  </v-btn>

                  <!-- Restore button (only for deleted users) -->
                  <v-btn
                    v-if="user.raw_app_meta_data?.deleted"
                    size="x-small"
                    variant="tonal"
                    color="success"
                    @click="handleUserRestore(user)"
                    class="mobile-action-btn mx-1"
                    density="compact"
                    :loading="deletingUser"
                  >
                    <v-icon size="14" class="me-1">mdi-restore</v-icon>
                    <span class="mobile-btn-text">Restore</span>
                  </v-btn>

                  <v-btn
                    v-else
                    size="x-small"
                    variant="tonal"
                    color="orange"
                    @click="editUser(user)"
                    class="mobile-action-btn mx-2"
                    density="compact"
                    :loading="editingUser"
                  >
                    <v-icon size="14" class="me-1">mdi-pencil</v-icon>
                    <span class="mobile-btn-text">Edit</span>
                  </v-btn>

                  <!-- Action Menu for mobile -->
                  <v-menu>
                    <template v-slot:activator="{ props: menuProps }">
                      <v-btn
                        size="x-small"
                        variant="text"
                        color="grey"
                        class="mobile-action-btn"
                        density="compact"
                        v-bind="menuProps"
                        icon
                      >
                        <v-icon size="14">mdi-dots-vertical</v-icon>
                      </v-btn>
                    </template>

                    <v-list density="compact" min-width="140">
                      <!-- Ban Action (only for active, non-banned users) -->
                      <v-list-item
                        v-if="!user.raw_app_meta_data?.deleted && !user.raw_app_meta_data?.banned"
                        @click="confirmBanUser(user)"
                        prepend-icon="mdi-account-cancel"
                        density="compact"
                      >
                        <v-list-item-title class="text-caption">Ban</v-list-item-title>
                      </v-list-item>

                      <!-- Unban Action (only for active, banned users) -->
                      <v-list-item
                        v-if="!user.raw_app_meta_data?.deleted && user.raw_app_meta_data?.banned"
                        @click="confirmUnbanUser(user)"
                        prepend-icon="mdi-account-check"
                        class="text-success"
                        density="compact"
                      >
                        <v-list-item-title class="text-caption">Unban</v-list-item-title>
                      </v-list-item>

                      <!-- Restore Action (only for deleted users) -->
                      <v-list-item
                        v-if="user.raw_app_meta_data?.deleted"
                        @click="restoreUser(user)"
                        prepend-icon="mdi-restore"
                        class="text-success"
                        density="compact"
                        :disabled="deletingUser"
                      >
                        <v-list-item-title class="text-caption">Restore</v-list-item-title>
                      </v-list-item>

                      <v-divider v-if="!user.raw_app_meta_data?.deleted" class="my-1"></v-divider>

                      <!-- Delete Action (only for active users) -->
                      <v-list-item
                        v-if="!user.raw_app_meta_data?.deleted"
                        @click="deleteUser(user)"
                        prepend-icon="mdi-delete"
                        class="text-error"
                        density="compact"
                        :disabled="deletingUser"
                      >
                        <v-list-item-title class="text-caption">Soft Delete</v-list-item-title>
                      </v-list-item>
                    </v-list>
                  </v-menu>
                </div>
              </v-card-text>
            </v-card>
          </div>
        </div>
      </v-card-text>

    <!-- User Details Dialog Component -->
    <UserDetailsDialog
      v-model="userDialog"
      :selected-user="selectedUser"
    />

    <!-- Edit User Dialog Component -->
    <EditUserDialog
      v-model="showEditDialog"
      :user="editingSelectedUser"
      :edit-form="editForm"
      :loading="editingUser"
      @update:edit-form="editForm = $event"
      @save="handleUserUpdate"
      @cancel="closeEditDialog"
    />

    <!-- Confirmation Dialog Component -->
    <ConfirmationDialog
      v-model="showConfirmationDialog.show"
      :title="showConfirmationDialog.title"
      :message="showConfirmationDialog.message"
      :loading="deletingUser"
      @confirm="handleUserDeletion"
      @cancel="closeConfirmationDialog"
    />

  </div>
</template>

<style scoped>
.v-data-table {
  border-radius: 8px;
}

.user-cards-container {
  max-height: 600px;
  overflow-y: auto;
}

.min-width-0 {
  min-width: 0;
}

/* Smooth transitions for loading states */
.user-cards-container .v-card {
  transition: opacity 0.3s ease;
}

/* Mobile responsive styling */
.mobile-actions-container {
  gap: 4px;
}

.mobile-action-btn {
  min-width: auto !important;
  padding: 4px 8px !important;
  height: 28px !important;
  font-size: 0.75rem !important;
}

.mobile-btn-text {
  font-size: 0.7rem;
  font-weight: 500;
}

/* Better spacing for mobile cards */
@media (max-width: 768px) {
  .user-cards-container {
    padding: 0 4px;
  }

  .user-cards-container .v-card {
    border-radius: 12px;
  }

  .mobile-action-btn {
    min-width: auto !important;
    padding: 2px 6px !important;
    height: 24px !important;
    font-size: 0.7rem !important;
  }

  .mobile-btn-text {
    font-size: 0.65rem;
  }

  .mobile-actions-container {
    gap: 2px;
  }
}

/* Header responsive styles */
.user-management-title {
  word-break: break-word;
  line-height: 1.2;
}

.refresh-btn {
  flex-shrink: 0 !important;
  min-width: 36px !important;
  height: 36px !important;
}

/* Ensure buttons are visible on all screen sizes */
.refresh-btn .v-btn__content {
  display: flex !important;
  align-items: center !important;
  gap: 4px !important;
}

/* Mobile-first responsive breakpoints */
@media (max-width: 599px) {
  .user-management-title {
    font-size: 1.25rem !important;
    line-height: 1.3;
    margin-bottom: 4px !important;
  }

  .refresh-btn {
    min-width: auto !important;
    padding: 0 12px !important;
  }

  .refresh-btn .v-btn__content {
    font-size: 0.875rem;
  }
}

/* Small screens */
@media (max-width: 480px) {
  .user-management-title {
    font-size: 1.125rem !important;
    line-height: 1.4;
  }

  .refresh-btn {
    min-width: 32px !important;
    padding: 0 8px !important;
  }

  .mobile-action-btn {
    padding: 1px 4px !important;
    height: 22px !important;
  }

  .mobile-btn-text {
    font-size: 0.6rem;
  }

  .mobile-actions-container {
    gap: 1px;
  }
}

/* Medium screens and up */
@media (min-width: 600px) {
  .user-management-title {
    line-height: 1.2;
  }
}
</style>
