import { ref, computed, onMounted } from 'vue'
import type { Ref } from 'vue'
import { useAuthUserStore } from '@/stores/authUser'

interface UserData {
  id: string
  email?: string
  created_at: string
  user_metadata?: Record<string, any>
  app_metadata?: Record<string, any>
}

export function useProfilesWidget() {
  const authStore = useAuthUserStore()

  // Local state
  const currentUser: Ref<UserData | null> = ref(null)
  const loading = ref(false)
  const error: Ref<string | null> = ref(null)

  // Computed properties
  const userDisplayName = computed(() => {
    if (!currentUser.value) return 'Unknown User'
    return currentUser.value.user_metadata?.full_name ||
           currentUser.value.email ||
           'Anonymous'
  })

  const userEmail = computed(() => currentUser.value?.email || '')

  const userRole = computed(() => {
    if (!currentUser.value) return null
    return currentUser.value.user_metadata?.role || null
  })

  const userCreatedAt = computed(() => {
    if (!currentUser.value?.created_at) return null
    return new Date(currentUser.value.created_at).toLocaleDateString()
  })

  const hasUserData = computed(() => currentUser.value !== null)

  // Methods
  const fetchCurrentUser = async () => {
    loading.value = true
    error.value = null

    try {
      const result = await authStore.getCurrentUser()

      if (result.error) {
        error.value = (result.error as any)?.message || 'Failed to fetch user data'
        currentUser.value = null
      } else if (result.user) {
        currentUser.value = result.user as UserData
      } else {
        currentUser.value = null
      }
    } catch (err) {
      error.value = 'An unexpected error occurred'
      currentUser.value = null
    } finally {
      loading.value = false
    }
  }

  const refreshUserData = async () => {
    await fetchCurrentUser()
  }

  // Update user metadata
  const updateUserMetadata = async (additionalData: Record<string, any>) => {
    if (!currentUser.value?.id) {
      error.value = 'No user ID available for update'
      return { error: new Error('No user ID available for update') }
    }

    loading.value = true
    error.value = null

    try {
      const result = await authStore.updateUserMetadata(currentUser.value.id, additionalData)

      if (result.error) {
        error.value = (result.error as any)?.message || 'Failed to update user metadata'
        return { error: result.error }
      }

      // Refresh user data after successful update
      await fetchCurrentUser()
      return { success: true }
    } catch (err) {
      error.value = 'An unexpected error occurred during update'
      return { error: new Error('An unexpected error occurred during update') }
    } finally {
      loading.value = false
    }
  }

  // Initialize on mount
  onMounted(() => {
    fetchCurrentUser()
  })

  return {
    // State
    currentUser,
    loading,
    error,

    // Computed
    userDisplayName,
    userEmail,
    userRole,
    userCreatedAt,
    hasUserData,

    // Methods
    fetchCurrentUser,
    refreshUserData,
    updateUserMetadata
  }
}
