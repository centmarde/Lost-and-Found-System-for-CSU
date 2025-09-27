import { ref, onUnmounted } from 'vue'
import { useToast, POSITION } from 'vue-toastification'
import { supabase } from '@/lib/supabase'
import { useAuthUserStore } from '@/stores/authUser'

interface Item {
  id: number
  title: string
  description: string
  status: 'lost' | 'found'
  user_id: string
  created_at: string
}

export function useNotifications(currentUser: any, isCurrentUserAdmin: boolean) {
  const toast = useToast()
  let itemSubscription: any = null
  const notifications = ref<any[]>([])

  // Check if a user is admin
  const checkIfUserIsAdmin = async (userId: string): Promise<boolean> => {
    try {
      const authStore = useAuthUserStore()
      const { users, error } = await authStore.getAllUsers()

      if (error) return false

      const userData = users?.find(u => u.id === userId)
      const roleId = userData?.user_metadata?.role

      return roleId === 1
    } catch (error) {
      console.error('Error checking admin status:', error)
      return false
    }
  }

  // Setup real-time subscription for new items
  const setupItemNotifications = async () => {
    // Only setup notifications for non-admin users
    if (!currentUser || isCurrentUserAdmin) return

    itemSubscription = supabase
      .channel('item-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'items'
        },
        async (payload) => {
          const newItem = payload.new as Item

          // Check if the item was posted by an admin
          const isAdminPost = await checkIfUserIsAdmin(newItem.user_id)

          if (isAdminPost) {
            // Show notification to user
            const statusText = newItem.status === 'lost' ? 'Lost Item' : 'Found Item'
            const statusColor = newItem.status === 'lost' ? '🔴' : '🟢'
            
            toast.info(
              `${statusColor} New ${statusText}: ${newItem.title}`,
              {
                timeout: 5000,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
                position: POSITION.TOP_RIGHT,
              }
            )

            // Add to notifications array for potential future use
            notifications.value.unshift({
              id: newItem.id,
              title: newItem.title,
              status: newItem.status,
              created_at: newItem.created_at,
              read: false
            })

            // Keep only last 10 notifications
            if (notifications.value.length > 10) {
              notifications.value = notifications.value.slice(0, 10)
            }
          }
        }
      )
      .subscribe()
  }

  // Cleanup subscription
  const cleanup = () => {
    if (itemSubscription) {
      itemSubscription.unsubscribe()
      itemSubscription = null
    }
  }

  // Mark notification as read
  const markAsRead = (notificationId: number) => {
    const notification = notifications.value.find(n => n.id === notificationId)
    if (notification) {
      notification.read = true
    }
  }

  // Clear all notifications
  const clearNotifications = () => {
    notifications.value = []
  }

  onUnmounted(() => {
    cleanup()
  })

  return {
    notifications,
    setupItemNotifications,
    markAsRead,
    clearNotifications,
    cleanup
  }
}