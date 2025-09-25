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


  async function registerUser(
    email: string,
    password: string,
    username: string,
    roleId: number
  ) {
    loading.value = true;
    try {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: username,
            role: roleId,
          }
        }
        }
      );

      if (signUpError) {
        return { error: signUpError };
      }

      if (!signUpData.user) {
        return { error: new Error("Signup failed") };
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

      // Log user role ID from metadata
      const roleId = user.user_metadata?.role;
      console.log('getCurrentUser - User Role ID from metadata:', roleId);
      console.log('getCurrentUser - Full user metadata:', user.user_metadata);

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
          user_metadata: user.user_metadata,
          app_metadata: user.app_metadata,
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

    // Actions
    registerUser,
    signIn,
    signOut,
    initializeAuth,
    getCurrentUser,
    getAllUsers,
    updateUserMetadata,
  };
});

// Utility function for logout (can be used independently)
export async function doLogout() {
  const authStore = useAuthUserStore();
  return await authStore.signOut();
}
