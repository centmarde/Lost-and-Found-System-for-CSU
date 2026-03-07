// Role Change Notifications Utility
import { useNotificationsStore } from '@/stores/notificationsData'
import { useUserNotificationsStore } from '@/stores/userNotificationsData'
import { useUserRolesStore } from '@/stores/roles'

interface RoleChangeNotificationData {
  userId: string
  userEmail: string
  oldRoleId: number | null
  newRoleId: number
  adminEmail?: string
}

/**
 * Create and send notification when a user's role is changed
 */
export async function createRoleChangeNotification(data: RoleChangeNotificationData) {
  const notificationsStore = useNotificationsStore()
  const userNotificationsStore = useUserNotificationsStore()
  const rolesStore = useUserRolesStore()

  console.log('🔔 Creating role change notification:', {
    targetUserId: data.userId,
    targetUserEmail: data.userEmail,
    oldRoleId: data.oldRoleId,
    newRoleId: data.newRoleId,
    adminEmail: data.adminEmail
  })

  try {
    // Ensure roles are loaded
    if (rolesStore.roles.length === 0) {
      console.log('📋 Loading roles for notification...')
      await rolesStore.fetchRoles()
    }

    // Additional safeguard: Only skip if user was already an admin (demoting admin)
    // But allow notifications for users being promoted to admin
    const wasAdmin = data.oldRoleId === 1
    const isBeingPromotedToAdmin = data.newRoleId === 1 && data.oldRoleId !== 1

    // Skip notification only for admin-to-admin role changes (shouldn't happen in practice)
    if (wasAdmin && data.newRoleId === 1) {
      console.log('🚫 Skipping notification - admin-to-admin role change')
      return {
        success: true,
        message: 'Notification skipped for admin-to-admin change'
      }
    }

    // Log special cases for clarity
    if (isBeingPromotedToAdmin) {
      console.log('🎉 User being promoted to admin - notification will be sent')
    } else if (wasAdmin) {
      console.log('📉 Admin being demoted - notification will be sent')
    }

    // Get role names
    const oldRole = data.oldRoleId ? rolesStore.roles.find(r => r.id === data.oldRoleId) : null
    const newRole = rolesStore.roles.find(r => r.id === data.newRoleId)

    if (!newRole) {
      console.error('❌ New role not found:', data.newRoleId, 'Available roles:', rolesStore.roles.map(r => ({ id: r.id, title: r.title })))
      return { success: false, error: 'New role not found' }
    }

    console.log('✅ Role information found:', {
      oldRole: oldRole ? { id: oldRole.id, title: oldRole.title } : 'None',
      newRole: { id: newRole.id, title: newRole.title }
    })

    // Determine notification type and content
    const isPromotion = isRolePromotion(data.oldRoleId, data.newRoleId)
    const isDemotion = isRoleDemotion(data.oldRoleId, data.newRoleId)

    let title: string
    let description: string

    if (isPromotion) {
      if (newRole.title.toLowerCase().includes('admin')) {
        title = '🎉 Congratulations! You\'ve been promoted to Administrator'
        description = `Your account has been upgraded to Administrator role. You now have full access to the Lost and Found System management features. Welcome to the admin team!`
      } else {
        title = '🎉 Role Upgrade - You\'ve been promoted!'
        description = `Your role has been upgraded from ${oldRole?.title || 'previous role'} to ${newRole.title}. You now have additional privileges in the Lost and Found System.`
      }
    } else if (isDemotion) {
      if (oldRole?.title.toLowerCase().includes('admin') && newRole.title.toLowerCase().includes('claimant')) {
        title = '📝 Your role has been updated to Claimant'
        description = `Your account role has been changed from ${oldRole.title} to ${newRole.title}. You can now focus on managing lost and found item claims. Contact an administrator if you have questions about this change.`
      } else {
        title = '📝 Your account role has been updated'
        description = `Your role has been changed from ${oldRole?.title || 'previous role'} to ${newRole.title}. Contact an administrator if you have questions about this change.`
      }
    } else {
      title = '📝 Your account role has been updated'
      description = `Your role has been changed to ${newRole.title}${oldRole ? ` from ${oldRole.title}` : ''}. ${data.adminEmail ? `This change was made by ${data.adminEmail}.` : ''}`
    }

    // Create the notification (stored globally but delivered only to specific user)
    console.log('📝 Creating user-specific role change notification:', { title, description, targetUser: data.userEmail })
    const notificationResult = await notificationsStore.createNotification({
      title,
      description
    })

    if (!notificationResult.data) {
      console.error('❌ Failed to create notification:', notificationResult.error)
      return { success: false, error: 'Failed to create notification' }
    }

    console.log('✅ Role change notification created (will be delivered only to target user):', {
      id: notificationResult.data.id,
      title: notificationResult.data.title,
      targetUser: data.userEmail
    })

    // Assign the notification to the specific user
    console.log('👤 Assigning notification to user:', {
      userId: data.userId,
      notificationId: notificationResult.data.id
    })

    const userNotificationResult = await userNotificationsStore.createUserNotification({
      user_id: data.userId,
      notification_id: notificationResult.data.id!,
      is_read: false
    })

    if (!userNotificationResult.data) {
      console.error('❌ Failed to create user notification:', userNotificationResult.error)
      return { success: false, error: 'Failed to assign notification to user' }
    }

    console.log(`✅ Role change notification sent to user ${data.userId} (${data.userEmail}): ${oldRole?.title || 'no role'} → ${newRole.title}`)
    console.log(`📧 Notification created with ID: ${notificationResult.data.id}, assigned to user: ${data.userId}`)

    return {
      success: true,
      notification: notificationResult.data,
      userNotification: userNotificationResult.data,
      message: `Notification sent to ${data.userEmail} about role change`
    }

  } catch (error) {
    console.error('Error creating role change notification:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Determine if role change is a promotion
 */
function isRolePromotion(oldRoleId: number | null, newRoleId: number): boolean {
  // Role hierarchy (higher number = higher privilege)
  const roleHierarchy: Record<string, number> = {
    'student': 1,
    'claimant': 2,
    'faculty': 3,
    'staff': 3,
    'moderator': 4,
    'admin': 5,
    'administrator': 5,
    'super admin': 6,
    'superadmin': 6
  }

  // If no old role, it's considered a role assignment (promotion)
  if (!oldRoleId) return true

  const rolesStore = useUserRolesStore()
  const oldRole = rolesStore.roles.find(r => r.id === oldRoleId)
  const newRole = rolesStore.roles.find(r => r.id === newRoleId)

  if (!oldRole || !newRole) return false

  const oldLevel = getRoleLevel(oldRole.title, roleHierarchy)
  const newLevel = getRoleLevel(newRole.title, roleHierarchy)

  return newLevel > oldLevel
}

/**
 * Determine if role change is a demotion
 */
function isRoleDemotion(oldRoleId: number | null, newRoleId: number): boolean {
  if (!oldRoleId) return false

  const roleHierarchy: Record<string, number> = {
    'student': 1,
    'claimant': 2,
    'faculty': 3,
    'staff': 3,
    'moderator': 4,
    'admin': 5,
    'administrator': 5,
    'super admin': 6,
    'superadmin': 6
  }

  const rolesStore = useUserRolesStore()
  const oldRole = rolesStore.roles.find(r => r.id === oldRoleId)
  const newRole = rolesStore.roles.find(r => r.id === newRoleId)

  if (!oldRole || !newRole) return false

  const oldLevel = getRoleLevel(oldRole.title, roleHierarchy)
  const newLevel = getRoleLevel(newRole.title, roleHierarchy)

  return newLevel < oldLevel
}

/**
 * Get role level from hierarchy
 */
function getRoleLevel(roleTitle: string, hierarchy: Record<string, number>): number {
  const normalizedTitle = roleTitle.toLowerCase().trim()

  // Check exact matches first
  if (hierarchy[normalizedTitle]) {
    return hierarchy[normalizedTitle]
  }

  // Check partial matches
  for (const [key, level] of Object.entries(hierarchy)) {
    if (normalizedTitle.includes(key)) {
      return level
    }
  }

  // Default level for unknown roles
  return 2
}

/**
 * Create notification for multiple users (bulk role change)
 */
export async function createBulkRoleChangeNotifications(changes: RoleChangeNotificationData[]) {
  const results = []

  for (const change of changes) {
    const result = await createRoleChangeNotification(change)
    results.push({ ...change, result })
  }

  const successful = results.filter(r => r.result.success).length
  const failed = results.filter(r => !r.result.success).length

  console.log(`Bulk role change notifications: ${successful} successful, ${failed} failed`)

  return {
    success: failed === 0,
    results,
    summary: { successful, failed }
  }
}
