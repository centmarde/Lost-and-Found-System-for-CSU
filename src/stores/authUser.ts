//authUser.ts
import { computed, ref } from "vue";
import type { Ref } from "vue";
import { defineStore } from "pinia";
import { useRouter } from "vue-router";
import { supabase, supabaseAdmin } from "@/lib/supabase";
interface UserData {
  id?: string;
  email?: string;
  created_at?: string;
  user_metadata?: Record<string, any>;
  app_metadata?: Record<string, any>;
}

interface SessionUser {
  id: string;
  email?: string;
  user_metadata: Record<string, any>;
}

export const useAuthUserStore = defineStore("authUser", () => {
  // States
  const userData: Ref<UserData | null> = ref(null);
  const authPages: Ref<string[]> = ref([]);
  const authBranchIds: Ref<number[]> = ref([]);
  const loading = ref(false);
  const router = useRouter();

  // Computed properties
  const isAuthenticated = computed(() => userData.value !== null);
  const userEmail = computed(() => userData.value?.email || null);
  const userName = computed(() => userData.value?.user_metadata?.full_name || userData.value?.email || null);
  const userRoleId = computed(() =>
    userData.value?.user_metadata?.role ||
    userData.value?.app_metadata?.role ||
    null
  );

  const isUserBanned = computed(() => userData.value?.app_metadata?.banned || false);
  const isUserDeleted = computed(() => userData.value?.app_metadata?.deleted || false);
  const isUserRestricted = computed(() => isUserBanned.value || isUserDeleted.value);
  const userStatus = computed(() => {
    if (isUserDeleted.value) return 'deleted';
    if (isUserBanned.value) return 'banned';
    return 'active';
  });


  async function registerUser(
    email: string,
    password: string,
    username: string,
    roleId: number
  ) {
    loading.value = true;
    try {
      // Create the user with profile data and role in user_metadata
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: username,
            role: roleId,
          }
        }
      });

      if (signUpError) {
        return { error: signUpError };
      }

      if (!signUpData.user) {
        return { error: new Error("Signup failed") };
      }

      // Optionally, also set app_metadata for admin-level role management
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        signUpData.user.id,
        {
          app_metadata: {
            role: roleId,
            permissions: [],
            status: 'active',
            created_by: 'system',
            created_at: new Date().toISOString()
          }
        }
      );

      if (updateError) {
        console.warn('Failed to set app_metadata:', updateError);
        // Continue with registration even if app_metadata update fails
      }

      return { data: { id: signUpData.user.id, email } };
    } finally {
      loading.value = false;
    }
  }

  async function signIn(email: string, password: string, rememberMe = false) {
    loading.value = true;
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { error };
      }

      if (!data.session) {
        return { error: new Error("No session") };
      }

      const user = data.user;
      localStorage.setItem("access_token", data.session.access_token);
      localStorage.setItem("refresh_token", data.session.refresh_token);
      localStorage.setItem("auth_id", user.id);

      // Update the store's userData with Supabase user data only
      userData.value = {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        user_metadata: user.user_metadata,
        app_metadata: user.app_metadata,
      };

      return { user };
    } finally {
      loading.value = false;
    }
  }

  async function signOut() {
    loading.value = true;
    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        return { error };
      }

      // Clear local storage
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("auth_id");

      // Clear user data
      userData.value = null;

      // Redirect to home or login page
      router.push("/");

      return { success: true };
    } finally {
      loading.value = false;
    }
  }

  // Initialize auth state on store creation
  async function initializeAuth() {
    loading.value = true;
    try {
      const { data: { user }, error } = await supabase.auth.getUser();

      if (error || !user) {
        userData.value = null;
        return;
      }

      // Set user data from Supabase auth user only
      userData.value = {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        user_metadata: user.user_metadata,
        app_metadata: user.app_metadata,
      };
    } catch (error) {
      console.error("Error initializing auth:", error);
      userData.value = null;
    } finally {
      loading.value = false;
    }
  }


  // Get current authenticated user
  async function getCurrentUser() {
    loading.value = true;
    try {
      const { data: { user }, error } = await supabase.auth.getUser();

      if (error) {
        return { error };
      }

      if (!user) {
        return { error: new Error("No authenticated user") };
      }

      const userData = {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        user_metadata: user.user_metadata,
        app_metadata: user.app_metadata,
      };

      // Log user role ID from both locations for debugging
      const roleIdFromUserMeta = user.user_metadata?.role;
      const roleIdFromAppMeta = user.app_metadata?.role;
      console.log('getCurrentUser - User Role ID from user_metadata:', roleIdFromUserMeta);
      console.log('getCurrentUser - User Role ID from app_metadata:', roleIdFromAppMeta);
      console.log('getCurrentUser - Full user_metadata:', user.user_metadata);
      console.log('getCurrentUser - Full app_metadata:', user.app_metadata);

      return { user: userData };
    } catch (error) {
      console.error("Error fetching current user:", error);
      return { error };
    } finally {
      loading.value = false;
    }
  }

  // Get all users (admin function)
  async function getAllUsers() {
    loading.value = true;
    try {
      // First, get all users from Supabase Auth using service role
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers();

      if (authError) {
        return { error: authError };
      }

      // Map auth users to consistent format
      const allUsers = authData.users.map(user => {
        return {
          id: user.id,
          email: user.email,
          created_at: user.created_at,
          raw_user_meta_data: user.user_metadata,
          raw_app_meta_data: user.app_metadata,
        };
      });

      return { users: allUsers };
    } catch (error) {
      console.error("Error fetching all users:", error);
      return { error };
    } finally {
      loading.value = false;
    }
  }

  // Update user metadata (admin function)
  async function updateUserMetadata(userId: string, additionalData: Record<string, any>) {
    loading.value = true;
    try {
      // First, get the current user to preserve existing metadata
      const { data: currentUser, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(userId);

      if (getUserError) {
        return { error: getUserError };
      }

      // Merge with existing user_metadata (not app_metadata)
      const existingUserMetadata = currentUser.user?.user_metadata || {};

      // Update user metadata using admin client
      const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        user_metadata: {
          ...existingUserMetadata,
          ...additionalData,
          last_updated: new Date().toISOString()
        }
      });

      if (error) {
        return { error };
      }      // If updating current user, refresh local userData
      if (userData.value?.id === userId) {
        await initializeAuth();
      }

      return { data };
    } catch (error) {
      console.error("Error updating user metadata:", error);
      return { error };
    } finally {
      loading.value = false;
    }
  }

  // Update app metadata (admin only - for roles, permissions, access control)
  async function updateUserAppMetadata(userId: string, appData: Record<string, any>) {
    loading.value = true;
    try {
      // First, get the current user to preserve existing app_metadata
      const { data: currentUser, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(userId);

      if (getUserError) {
        return { error: getUserError };
      }

      // Merge with existing app_metadata
      const existingAppMetadata = currentUser.user?.app_metadata || {};

      // Update app metadata using admin client (service role required)
      const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        app_metadata: {
          ...existingAppMetadata,
          ...appData,
          last_updated: new Date().toISOString(),
          updated_by: userData.value?.id || 'system'
        }
      });

      if (error) {
        return { error };
      }

      // If updating current user, refresh local userData
      if (userData.value?.id === userId) {
        await initializeAuth();
      }

      return { data };
    } catch (error) {
      console.error("Error updating user app metadata:", error);
      return { error };
    } finally {
      loading.value = false;
    }
  }

  // Ban user function (uses app_metadata)
  async function banUser(userId: string, banDuration: string = '24h', reason?: string) {
    const banData = {
      banned: true,
      ban_duration: banDuration,
      ban_reason: reason || 'Violation of terms',
      banned_at: new Date().toISOString(),
      banned_until: banDuration === 'none' ? null : new Date(Date.now() + parseDuration(banDuration)).toISOString()
    };

    return await updateUserAppMetadata(userId, banData);
  }

  // Unban user function
  async function unbanUser(userId: string) {
    const unbanData = {
      banned: false,
      ban_duration: 'none',
      ban_reason: null,
      banned_at: null,
      banned_until: null,
      unbanned_at: new Date().toISOString()
    };

    return await updateUserAppMetadata(userId, unbanData);
  }

  // Helper function to perform soft delete on user-related data
  async function softDeleteUserData(userId: string, userEmail: string): Promise<void> {
    console.log(`Starting soft delete for user: ${userEmail} (${userId})`);

    try {
      // 1. Soft delete user items by marking them as deleted
      const { error: itemsError } = await supabaseAdmin
        .from('items')
        .update({
          deleted_at: new Date().toISOString(),
          deleted_by: 'system_admin',
          deleted_reason: 'User account deleted'
        })
        .or(`user_id.eq.${userId},claimed_by.eq.${userId}`)
        .is('deleted_at', null); // Only update items that aren't already deleted

      if (itemsError) {
        console.warn('Error soft deleting items:', itemsError);
        // If the items table doesn't have deleted_at column, anonymize instead
        const { error: anonymizeError } = await supabaseAdmin
          .from('items')
          .update({
            title: '[Deleted User Item]',
            description: `Item from deleted user account (${userEmail})`,
            status: 'lost' // Keep a consistent status
          })
          .or(`user_id.eq.${userId},claimed_by.eq.${userId}`);

        if (anonymizeError) {
          console.warn('Error anonymizing items:', anonymizeError);
        } else {
          console.log('✓ Anonymized user items (table lacks soft delete support)');
        }
      } else {
        console.log('✓ Soft deleted user items');
      }

      // 2. Mark conversations as deleted instead of removing them
      const { error: conversationsError } = await supabaseAdmin
        .from('conversations')
        .update({
          deleted_at: new Date().toISOString(),
          deleted_by: 'system_admin',
          deleted_reason: 'User account deleted'
        })
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .is('deleted_at', null); // Only update conversations that aren't already deleted

      if (conversationsError) {
        console.warn('Error soft deleting conversations:', conversationsError);
        // If conversations table doesn't support soft delete, leave them as is
        console.log('! Conversations preserved (table lacks soft delete support)');
      } else {
        console.log('✓ Soft deleted user conversations');
      }

      // 3. Mark messages as deleted but preserve them for audit trail
      const { error: messagesError } = await supabaseAdmin
        .from('messages')
        .update({
          deleted_at: new Date().toISOString(),
          deleted_by: 'system_admin',
          original_message: null, // Store original in separate column if available
          message: '[Message from deleted user]'
        })
        .eq('user_id', userId)
        .is('deleted_at', null); // Only update messages that aren't already deleted

      if (messagesError) {
        console.warn('Error soft deleting messages:', messagesError);
        // If messages table doesn't have deleted_at column, anonymize the content
        const { error: anonymizeMessagesError } = await supabaseAdmin
          .from('messages')
          .update({
            message: '[Message from deleted user]'
          })
          .eq('user_id', userId);

        if (anonymizeMessagesError) {
          console.warn('Error anonymizing messages:', anonymizeMessagesError);
        } else {
          console.log('✓ Anonymized user messages (table lacks soft delete support)');
        }
      } else {
        console.log('✓ Soft deleted user messages');
      }

      console.log(`✓ Completed soft delete for user: ${userEmail}`);

    } catch (error) {
      console.error('Error during user data soft delete:', error);
      throw new Error(`Failed to soft delete user data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }  // Delete user function (admin only)
  async function deleteUser(userId: string) {
    loading.value = true;
    try {
      console.log(`Attempting to delete user with ID: ${userId}`);

      // First, check if user exists and get user info for better error messages
      const { data: existingUser, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(userId);

      if (getUserError) {
        console.error("Error fetching user before deletion:", getUserError);
        return {
          error: {
            message: "User not found or cannot be accessed",
            code: "user_not_found",
            details: getUserError
          }
        };
      }

      if (!existingUser.user) {
        return {
          error: {
            message: "User does not exist",
            code: "user_not_found"
          }
        };
      }

      // Soft delete related data before marking user as deleted
      await softDeleteUserData(userId, existingUser.user.email || 'unknown@email.com');

      console.log(`Soft deleting user: ${existingUser.user.email} (${userId})`);

      // Instead of hard deleting, mark user as deleted in app_metadata and disable account
      const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        app_metadata: {
          ...existingUser.user.app_metadata,
          deleted: true,
          deleted_at: new Date().toISOString(),
          deleted_by: userData.value?.id || 'admin',
          deleted_reason: 'Account deleted by administrator',
          original_email: existingUser.user.email,
          status: 'deleted',
          // Ban the user by setting ban metadata
          banned: true,
          ban_duration: 'permanent',
          ban_reason: 'Account deleted by administrator',
          banned_at: new Date().toISOString(),
          banned_until: null // Permanent ban
        },
        // Disable email confirmation to prevent login
        email_confirm: false
      });

      if (error) {
        console.error("Supabase soft delete user error:", error);

        // Provide more specific error messages based on the error
        let errorMessage = "Failed to soft delete user";
        let errorCode = "soft_deletion_failed";

        if (error.message?.includes("not found")) {
          errorMessage = "User not found";
          errorCode = "user_not_found";
        } else if (error.message?.includes("permission")) {
          errorMessage = "Insufficient permissions to delete user";
          errorCode = "permission_denied";
        } else {
          errorMessage = "An error occurred while marking user as deleted. The user account may still be active.";
          errorCode = "soft_delete_error";
        }

        return {
          error: {
            message: errorMessage,
            code: errorCode,
            originalError: error,
            userId: userId,
            userEmail: existingUser.user.email
          }
        };
      }

      console.log(`Successfully soft deleted user: ${existingUser.user.email} (${userId})`);
      return { data, softDeletedUser: existingUser.user, message: "User has been soft deleted and can be restored if needed" };

    } catch (error) {
      console.error("Unexpected error deleting user:", error);
      return {
        error: {
          message: "An unexpected error occurred while deleting the user",
          code: "unexpected_error",
          details: error
        }
      };
    } finally {
      loading.value = false;
    }
  }

  // Restore soft-deleted user function (admin only)
  async function restoreUser(userId: string) {
    loading.value = true;
    try {
      console.log(`Attempting to restore user with ID: ${userId}`);

      // First, check if user exists and is soft deleted
      const { data: existingUser, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(userId);

      if (getUserError) {
        console.error("Error fetching user before restore:", getUserError);
        return {
          error: {
            message: "User not found or cannot be accessed",
            code: "user_not_found",
            details: getUserError
          }
        };
      }

      if (!existingUser.user) {
        return {
          error: {
            message: "User does not exist",
            code: "user_not_found"
          }
        };
      }

      // Check if user is actually soft deleted
      const isDeleted = existingUser.user.app_metadata?.deleted;
      if (!isDeleted) {
        return {
          error: {
            message: "User is not deleted and doesn't need to be restored",
            code: "user_not_deleted"
          }
        };
      }

      console.log(`Restoring user: ${existingUser.user.email} (${userId})`);

      // Remove deletion metadata and unban the user
      const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        app_metadata: {
          ...existingUser.user.app_metadata,
          deleted: false,
          deleted_at: null,
          deleted_by: null,
          deleted_reason: null,
          status: 'active',
          // Remove ban metadata
          banned: false,
          ban_duration: null,
          ban_reason: null,
          banned_at: null,
          banned_until: null,
          // Add restoration metadata
          restored: true,
          restored_at: new Date().toISOString(),
          restored_by: userData.value?.id || 'admin'
        },
        // Re-enable email confirmation
        email_confirm: true
      });

      if (error) {
        console.error("Supabase restore user error:", error);
        return {
          error: {
            message: "Failed to restore user account",
            code: "restore_failed",
            originalError: error,
            userId: userId,
            userEmail: existingUser.user.email
          }
        };
      }

      // Restore related data
      await restoreUserData(userId, existingUser.user.email || 'unknown@email.com');

      console.log(`Successfully restored user: ${existingUser.user.email} (${userId})`);
      return { data, restoredUser: existingUser.user, message: "User has been successfully restored" };

    } catch (error) {
      console.error("Unexpected error restoring user:", error);
      return {
        error: {
          message: "An unexpected error occurred while restoring the user",
          code: "unexpected_error",
          details: error
        }
      };
    } finally {
      loading.value = false;
    }
  }

  // Helper function to restore user-related data
  async function restoreUserData(userId: string, userEmail: string): Promise<void> {
    console.log(`Starting data restoration for user: ${userEmail} (${userId})`);

    try {
      // 1. Restore user items
      const { error: itemsError } = await supabaseAdmin
        .from('items')
        .update({
          deleted_at: null,
          deleted_by: null,
          deleted_reason: null
        })
        .eq('deleted_by', 'system_admin')
        .or(`user_id.eq.${userId},claimed_by.eq.${userId}`)
        .not('deleted_at', 'is', null);

      if (itemsError) {
        console.warn('Error restoring items:', itemsError);
      } else {
        console.log('✓ Restored user items');
      }

      // 2. Restore conversations
      const { error: conversationsError } = await supabaseAdmin
        .from('conversations')
        .update({
          deleted_at: null,
          deleted_by: null,
          deleted_reason: null
        })
        .eq('deleted_by', 'system_admin')
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .not('deleted_at', 'is', null);

      if (conversationsError) {
        console.warn('Error restoring conversations:', conversationsError);
      } else {
        console.log('✓ Restored user conversations');
      }

      // 3. Restore messages
      const { error: messagesError } = await supabaseAdmin
        .from('messages')
        .update({
          deleted_at: null,
          deleted_by: null,
          message: '[Message restored]' // Could be improved with original message backup
        })
        .eq('user_id', userId)
        .eq('deleted_by', 'system_admin')
        .not('deleted_at', 'is', null);

      if (messagesError) {
        console.warn('Error restoring messages:', messagesError);
      } else {
        console.log('✓ Restored user messages');
      }

      console.log(`✓ Completed data restoration for user: ${userEmail}`);

    } catch (error) {
      console.error('Error during user data restoration:', error);
      throw new Error(`Failed to restore user data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Change password function
  async function changePassword(currentPassword: string, newPassword: string) {
    loading.value = true;
    try {
      // First verify the current password by attempting to sign in
      const currentUser = await supabase.auth.getUser();
      if (!currentUser.data.user?.email) {
        return { error: new Error("No authenticated user found") };
      }

      // Verify current password
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: currentUser.data.user.email,
        password: currentPassword,
      });

      if (verifyError) {
        return { error: new Error("Current password is incorrect") };
      }

      // Update password
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        return { error };
      }

      return { data };
    } catch (error) {
      console.error("Error changing password:", error);
      return { error };
    } finally {
      loading.value = false;
    }
  }

  // Helper function to parse duration strings
  function parseDuration(duration: string): number {
    const units: { [key: string]: number } = {
      'ns': 1e-6,
      'us': 1e-3, 'µs': 1e-3,
      'ms': 1,
      's': 1000,
      'm': 60000,
      'h': 3600000
    };

    const match = duration.match(/^(\d+(?:\.\d+)?)(ns|us|µs|ms|s|m|h)$/);
    if (!match) return 0;

    const [, value, unit] = match;
    return parseFloat(value) * units[unit];
  }

  // Get role title by role ID (for any user) - now uses roles store
  async function getRoleTitleById(roleId: number) {
    try {
      console.log('getRoleTitleById - Getting role title for ID:', roleId);

      if (!roleId) {
        console.log('getRoleTitleById - No role ID provided, returning null');
        return { title: null, error: null };
      }

      // This method is deprecated - use roles store directly
      console.warn('getRoleTitleById in authUser store is deprecated, use roles store instead');

      // For backward compatibility, return unknown role
      return { title: 'Unknown Role', error: null };
    } catch (error) {
      console.error('getRoleTitleById - Unexpected error:', error);
      return { title: null, error };
    }
  }

  // Get current user's role title - now uses roles store
  async function getCurrentUserRoleTitle() {
    try {
      const roleId = userData.value?.user_metadata?.role;
      console.log('getCurrentUserRoleTitle - Role ID:', roleId);

      if (!roleId) {
        console.log('getCurrentUserRoleTitle - No role ID found, returning null');
        return { title: null, error: null };
      }

      // This method is deprecated - use roles store directly
      console.warn('getCurrentUserRoleTitle in authUser store is deprecated, use roles store instead');

      // For backward compatibility, return unknown role
      return { title: 'Unknown Role', error: null };
    } catch (error) {
      console.error('getCurrentUserRoleTitle - Unexpected error:', error);
      return { title: null, error };
    }
  }

  // Call initialize on store creation
  initializeAuth();

  return {
    // State
    userData,
    authPages,
    authBranchIds,
    loading,

    // Computed
    isAuthenticated,
    userEmail,
    userName,
    userRoleId,
    isUserBanned,
    isUserDeleted,
    isUserRestricted,
    userStatus,

    // Actions
    registerUser,
    signIn,
    signOut,
    initializeAuth,
    getCurrentUser,
    getAllUsers,
    updateUserMetadata,
    updateUserAppMetadata,
    deleteUser,
    restoreUser,
    changePassword,
    banUser,
    unbanUser,
    getRoleTitleById,
    getCurrentUserRoleTitle,
  };
});

// Utility function for logout (can be used independently)
export async function doLogout() {
  const authStore = useAuthUserStore();
  return await authStore.signOut();
}
