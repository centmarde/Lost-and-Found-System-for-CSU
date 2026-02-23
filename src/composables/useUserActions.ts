import { ref } from 'vue'
import { useAuthUserStore } from '@/stores/authUser'
import { useToast } from 'vue-toastification'

interface User {
  id: string
  email?: string
  created_at?: string
  raw_user_meta_data?: Record<string, any>
  raw_app_meta_data?: Record<string, any>
}

interface EditUserData {
  full_name?: string
  role?: number
  [key: string]: any
}

interface ConfirmationDialogData {
  show: boolean
  title: string
  message: string
  action: (() => Promise<void>) | null
}

// Type definitions for auth store result types
interface AuthError {
  message: string
  code: string
  details?: any
  originalError?: any
  userId?: string
  userEmail?: string
}

interface DeleteUserSuccess {
  data: any
  softDeletedUser: User
  message: string
}

interface DeleteUserError {
  error: AuthError
}

type DeleteUserResult = DeleteUserSuccess | DeleteUserError

interface RestoreUserSuccess {
  data: any
  restoredUser: User
  message: string
}

interface RestoreUserError {
  error: AuthError
}

type RestoreUserResult = RestoreUserSuccess | RestoreUserError

interface BanUserSuccess {
  data: any
  message?: string
}

interface BanUserError {
  error: AuthError | string
}

type BanUserResult = BanUserSuccess | BanUserError

interface UpdateUserSuccess {
  data: any
}

interface UpdateUserError {
  error: AuthError | string
}

type UpdateUserResult = UpdateUserSuccess | UpdateUserError

export function useUserActions() {
  const authStore = useAuthUserStore()
  const toast = useToast()

  // Loading states
  const editingUser = ref(false)
  const deletingUser = ref(false)

  // Dialog states
  const showEditDialog = ref(false)
  const showConfirmationDialog = ref<ConfirmationDialogData>({
    show: false,
    title: '',
    message: '',
    action: null
  })

  // Form data
  const selectedUser = ref<User | null>(null)
  const editForm = ref<EditUserData>({})

  /**
   * Open edit dialog for a user
   */
  const openEditDialog = (user: User) => {
    selectedUser.value = user
    editForm.value = {
      full_name: user.raw_user_meta_data?.full_name || '',
      role: user.raw_user_meta_data?.role || user.raw_app_meta_data?.role || 3, // Default to Student (role 3)
    }
    showEditDialog.value = true
  }

  /**
   * Close edit dialog
   */
  const closeEditDialog = () => {
    showEditDialog.value = false
    selectedUser.value = null
    editForm.value = {}
  }

  /**
   * Update user information
   */
  const updateUser = async (): Promise<{ success: boolean; error?: string }> => {
    if (!selectedUser.value) {
      return { success: false, error: 'No user selected' }
    }

    editingUser.value = true

    try {
      // Update user metadata (name AND role)
      const userMetadataResult = await authStore.updateUserMetadata(
        selectedUser.value.id,
        {
          full_name: editForm.value.full_name,
          role: editForm.value.role  // Add role to user_metadata too
        }
      ) as UpdateUserResult

      if ('error' in userMetadataResult) {
        const errorMsg = typeof userMetadataResult.error === 'string'
          ? userMetadataResult.error
          : (userMetadataResult.error as AuthError)?.message || 'Failed to update user metadata'
        throw new Error(errorMsg)
      }

      // Update app metadata (role for admin-level access control)
      const appMetadataResult = await authStore.updateUserAppMetadata(
        selectedUser.value.id,
        {
          role: editForm.value.role
        }
      ) as UpdateUserResult

      if ('error' in appMetadataResult) {
        const errorMsg = typeof appMetadataResult.error === 'string'
          ? appMetadataResult.error
          : (appMetadataResult.error as AuthError)?.message || 'Failed to update user role'
        throw new Error(errorMsg)
      }

      toast.success(`Successfully updated ${selectedUser.value.email}`)
      closeEditDialog()
      return { success: true }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update user'
      toast.error(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      editingUser.value = false
    }
  }

  /**
   * Show delete confirmation dialog
   */
  const confirmDeleteUser = (user: User) => {
    showConfirmationDialog.value = {
      show: true,
      title: 'Soft Delete User',
      message: `Are you sure you want to delete ${user.email}? The user will be disabled but can be restored later if needed.`,
      action: () => executeDeleteUser(user)
    }
  }

  /**
   * Execute user deletion
   */
  const executeDeleteUser = async (user: User): Promise<void> => {
    deletingUser.value = true

    try {
      console.log(`Attempting to delete user: ${user.email} (${user.id})`)
      const result = await authStore.deleteUser(user.id) as DeleteUserResult

      if ('error' in result) {
        console.error('Delete user error:', result.error)

        // Handle different types of error objects
        let errorMessage = 'Failed to delete user'

        if (typeof result.error === 'string') {
          errorMessage = result.error
        } else if (result.error && typeof result.error === 'object') {
          // Handle our enhanced error object structure
          const errorObj = result.error

          if (errorObj.message) {
            errorMessage = errorObj.message
          } else if ('error' in errorObj && (errorObj as any).error?.message) {
            errorMessage = (errorObj as any).error.message
          } else if (errorObj.originalError?.message) {
            errorMessage = errorObj.originalError.message
          }

          // Log additional error details for debugging
          if (errorObj.code) {
            console.error(`Error code: ${errorObj.code}`)
          }
          if (errorObj.details) {
            console.error('Error details:', errorObj.details)
          }
          if (errorObj.originalError) {
            console.error('Original error:', errorObj.originalError)
          }
        }

        // Show user-friendly error message
        throw new Error(errorMessage)
      }

      // Success case
      const deletedUserEmail = result.softDeletedUser?.email || user.email
      const successMessage = result.message || `Successfully soft deleted ${deletedUserEmail}`
      toast.success(successMessage)
      console.log(`Successfully soft deleted user: ${deletedUserEmail}`)
      closeConfirmationDialog()

    } catch (error) {
      console.error('Unexpected error in executeDeleteUser:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete user'

      // Show error toast with more context
      toast.error(`Delete Failed: ${errorMessage}`, {
        timeout: 8000, // Show error longer
        closeOnClick: true
      })
    } finally {
      deletingUser.value = false
    }
  }

  /**
   * Restore soft-deleted user
   */
  const restoreUser = async (user: User): Promise<{ success: boolean }> => {
    deletingUser.value = true

    try {
      console.log(`Attempting to restore user: ${user.email} (${user.id})`)
      const result = await authStore.restoreUser(user.id) as RestoreUserResult

      if ('error' in result) {
        console.error('Restore user error:', result.error)

        let errorMessage = 'Failed to restore user'

        if (typeof result.error === 'string') {
          errorMessage = result.error
        } else if (result.error && typeof result.error === 'object') {
          const errorObj = result.error
          if (errorObj.message) {
            errorMessage = errorObj.message
          } else if (errorObj.originalError?.message) {
            errorMessage = errorObj.originalError.message
          }

          if (errorObj.code) {
            console.error(`Error code: ${errorObj.code}`)
          }
        }

        throw new Error(errorMessage)
      }

      // Success case
      const restoredUserEmail = result.restoredUser?.email || user.email
      const successMessage = result.message || `Successfully restored ${restoredUserEmail}`
      toast.success(successMessage)
      console.log(`Successfully restored user: ${restoredUserEmail}`)

      return { success: true }

    } catch (error) {
      console.error('Unexpected error in restoreUser:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to restore user'

      toast.error(`Restore Failed: ${errorMessage}`, {
        timeout: 8000,
        closeOnClick: true
      })

      return { success: false }
    } finally {
      deletingUser.value = false
    }
  }

  /**
   * Close confirmation dialog
   */
  const closeConfirmationDialog = () => {
    showConfirmationDialog.value = {
      show: false,
      title: '',
      message: '',
      action: null
    }
  }

  /**
   * Execute confirmed action
   */
  const executeConfirmedAction = async () => {
    if (showConfirmationDialog.value.action) {
      await showConfirmationDialog.value.action()
    }
  }

  /**
   * Ban user with confirmation
   */
  const confirmBanUser = (user: User, duration: string = '24h', reason?: string) => {
    showConfirmationDialog.value = {
      show: true,
      title: 'Ban User',
      message: `Are you sure you want to ban ${user.email} for ${duration}?${reason ? ` Reason: ${reason}` : ''}`,
      action: () => executeBanUser(user, duration, reason)
    }
  }

  /**
   * Execute user ban
   */
  const executeBanUser = async (user: User, duration: string = '24h', reason?: string): Promise<void> => {
    try {
      const result = await authStore.banUser(user.id, duration, reason) as BanUserResult

      if ('error' in result) {
        const errorMsg = typeof result.error === 'string'
          ? result.error
          : (result.error as AuthError)?.message || 'Failed to ban user'
        throw new Error(errorMsg)
      }

      toast.success(`Successfully banned ${user.email}`)
      closeConfirmationDialog()

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to ban user'
      toast.error(errorMessage)
    }
  }

  /**
   * Unban user with confirmation
   */
  const confirmUnbanUser = (user: User) => {
    showConfirmationDialog.value = {
      show: true,
      title: 'Unban User',
      message: `Are you sure you want to unban ${user.email}?`,
      action: () => executeUnbanUser(user)
    }
  }

  /**
   * Execute user unban
   */
  const executeUnbanUser = async (user: User): Promise<void> => {
    try {
      const result = await authStore.unbanUser(user.id) as BanUserResult

      if ('error' in result) {
        const errorMsg = typeof result.error === 'string'
          ? result.error
          : (result.error as AuthError)?.message || 'Failed to unban user'
        throw new Error(errorMsg)
      }

      toast.success(`Successfully unbanned ${user.email}`)
      closeConfirmationDialog()

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to unban user'
      toast.error(errorMessage)
    }
  }

  return {
    // Loading states
    editingUser,
    deletingUser,

    // Dialog states
    showEditDialog,
    showConfirmationDialog,

    // Form data
    selectedUser,
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
  }
}
