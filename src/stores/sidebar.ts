import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getTotalUnreadMessageCount } from '@/stores/messages'

export const useSidebarStore = defineStore('sidebar', () => {
  // State
  const totalUnreadMessages = ref(0)
  const isLoading = ref(false)

  // Getters
  const hasUnreadMessages = computed(() => totalUnreadMessages.value > 0)

  // Actions
  /**
   * Updates the total unread message count for the sidebar badge
   * Uses getTotalUnreadMessageCount from messages store to count:
   * - All unread messages across ALL conversations (item-based + direct messages)
   * - Only messages received by the user (excludes messages sent by the user)
   * - Messages where isread = false
   */
  const updateUnreadMessageCount = async (currentUserId: string) => {
    if (!currentUserId) {
      console.warn('[Sidebar Store] No user ID provided for updating unread count')
      return
    }

    try {
      isLoading.value = true
      const previousCount = totalUnreadMessages.value
      const count = await getTotalUnreadMessageCount(currentUserId)
      totalUnreadMessages.value = count
    } catch (error) {
    } finally {
      isLoading.value = false
    }
  }

  const resetUnreadCount = () => {
    totalUnreadMessages.value = 0
  }

  /**
   * @deprecated Avoid using this for real-time updates - use updateUnreadMessageCount instead
   * Optimistic increment can cause drift from actual database state
   */
  const incrementUnreadCount = () => {
    totalUnreadMessages.value++
  }

  /**
   * @deprecated Avoid using this for real-time updates - use updateUnreadMessageCount instead
   * Optimistic decrement can cause drift from actual database state
   */
  const decrementUnreadCount = (amount = 1) => {
    const previousCount = totalUnreadMessages.value
    totalUnreadMessages.value = Math.max(0, totalUnreadMessages.value - amount)
  }

  return {
    // State
    totalUnreadMessages,
    isLoading,
    // Getters
    hasUnreadMessages,
    // Actions
    updateUnreadMessageCount,
    resetUnreadCount,
    incrementUnreadCount,
    decrementUnreadCount
  }
})
