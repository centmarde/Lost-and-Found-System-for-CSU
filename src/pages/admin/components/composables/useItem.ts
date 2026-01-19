import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import { useAuthUserStore } from '@/stores/authUser'
import { useToast } from 'vue-toastification'

interface Item {
  id: number
  title: string
  description: string
  status: 'lost' | 'found'
  user_id: string
  claimed_by: string
  created_at: string
}

export function useItems(isCurrentUserAdmin: any, currentUser: any) {
  const toast = useToast()
  const items = ref<Item[]>([])
  const itemsLoading = ref(false)

  /**
   * Fetch items from database based on user role
   */
  const fetchItems = async () => {
    itemsLoading.value = true
    try {
      let query = supabase.from('items').select('*')

      if (!isCurrentUserAdmin.value) {
        // Regular users: fetch items posted by admins
        const authStore = useAuthUserStore()
        const { users, error: usersError } = await authStore.getAllUsers()

        if (usersError) {
          console.error('Error fetching users:', usersError)
          toast.error('Failed to load admin users')
          return
        }

        const adminUsers = users?.filter(user => {
          const roleId = user.raw_user_meta_data?.role
          return roleId === 1
        }) || []

        if (adminUsers.length === 0) {
          items.value = []
          return
        }

        const adminUserIds = adminUsers.map(admin => admin.id)
        query = query.in('user_id', adminUserIds)
      } else {
        // Admin users: only fetch their own items
        query = query.eq('user_id', currentUser.value.id)
      }

      const { data, error } = await query.order('created_at', { ascending: false })

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

  return {
    items,
    itemsLoading,
    fetchItems,
  }
}
