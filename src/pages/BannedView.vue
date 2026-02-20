<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useTheme } from "vuetify";
import { useAuthUserStore } from "@/stores/authUser";
import { createDynamicThemeConfigFromExternal } from "@/themes/index";

// Composables
const router = useRouter();
const theme = useTheme();
const authStore = useAuthUserStore();

// Reactive state
const themeLoading = ref(true);
const themeError = ref<string | null>(null);
const userInfo = ref<any>(null);

// Methods
const signOut = async () => {
  try {
    await authStore.signOut();
    router.push("/auth");
  } catch (error) {
    console.error("Error signing out:", error);
  }
};

// Load dynamic theme configuration
const loadDynamicTheme = async () => {
  try {
    themeLoading.value = true;
    themeError.value = null;

    const themeConfig = await createDynamicThemeConfigFromExternal();

    // Apply the theme configuration to Vuetify
    theme.themes.value.light = themeConfig.themes.light;
    theme.themes.value.dark = themeConfig.themes.dark;

    console.log('Dynamic theme loaded successfully');
  } catch (error) {
    console.error('Failed to load dynamic theme:', error);
    themeError.value = error instanceof Error ? error.message : 'Failed to load theme';
  } finally {
    themeLoading.value = false;
  }
};

// Get user ban/deletion info
const getUserInfo = () => {
  const userData = authStore.userData;
  if (userData) {
    userInfo.value = {
      email: userData.email,
      isBanned: authStore.isUserBanned,
      isDeleted: authStore.isUserDeleted,
      banReason: userData.app_metadata?.ban_reason || 'No reason provided',
      bannedAt: userData.app_metadata?.banned_at,
      deletedAt: userData.app_metadata?.deleted_at,
      deletedReason: userData.app_metadata?.deleted_reason || 'Account deleted by administrator',
    };
  }
};

// Lifecycle
onMounted(async () => {
  // Load dynamic theme configuration
  await loadDynamicTheme();
  // Get user information
  getUserInfo();
});
</script>

<template>
  <!-- Theme Loading State -->
  <v-overlay v-if="themeLoading" class="d-flex align-center justify-center">
    <v-progress-circular
      indeterminate
      size="64"
      color="primary"
    />
    <div class="text-h6 ml-4">Loading theme...</div>
  </v-overlay>

  <!-- Theme Error State -->
  <v-alert
    v-if="themeError && !themeLoading"
    type="error"
    class="ma-4"
    closable
    @click:close="themeError = null"
  >
    <v-alert-title>Theme Loading Error</v-alert-title>
    {{ themeError }}
  </v-alert>

  <!-- Main Content -->
  <v-container v-if="!themeLoading" fluid class="fill-height">
    <v-row align="center" justify="center" class="fill-height">
      <v-col cols="12" sm="8" md="6" lg="5">
        <v-card class="mx-auto text-center" elevation="8" rounded="lg">
          <v-card-text class="py-8">
            <!-- Ban/Delete Icon -->
            <v-icon
              size="120"
              :color="userInfo?.isDeleted ? 'error' : 'warning'"
              class="mb-4"
            >
              {{ userInfo?.isDeleted ? 'mdi-account-remove' : 'mdi-account-cancel' }}
            </v-icon>

            <!-- Status Title -->
            <div class="text-h3 font-weight-bold mb-2" :class="userInfo?.isDeleted ? 'text-error' : 'text-warning'">
              {{ userInfo?.isDeleted ? 'Account Deleted' : 'Account Suspended' }}
            </div>

            <!-- User Email -->
            <div class="text-h6 text-medium-emphasis mb-4">
              {{ userInfo?.email }}
            </div>

            <!-- Status Description -->
            <div class="text-body-1 text-medium-emphasis mb-6">
              <span v-if="userInfo?.isDeleted">
                Your account has been deleted and you no longer have access to the system.
              </span>
              <span v-else-if="userInfo?.isBanned">
                Your account has been suspended and you cannot access protected areas of the system.
              </span>
              <span v-else>
                Your account access has been restricted.
              </span>
            </div>



            <!-- Contact Information -->
            <v-alert
              type="info"
              variant="tonal"
              class="mb-6 text-left"
              icon="mdi-help-circle"
            >
              <v-alert-title class="text-h6">Need Help?</v-alert-title>
              <div class="mt-2">
                <p v-if="userInfo?.isDeleted">
                  If you believe your account was deleted in error, please contact the system administrator.
                </p>
                <p v-else>
                  If you believe your account was suspended in error or would like to appeal this decision,
                  please contact the system administrator.
                </p>
                <ul class="mt-2">
                  <li>Contact your system administrator</li>
                  <li>Check your email for additional information</li>
                  <li v-if="!userInfo?.isDeleted">Wait for the suspension period to expire</li>
                </ul>
              </div>
            </v-alert>

            <!-- Action Buttons -->
            <v-row no-gutters justify="center" class="mb-4">
              <v-col cols="auto" class="mx-2">
                <v-btn
                  color="error"
                  variant="elevated"
                  size="large"
                  prepend-icon="mdi-logout"
                  @click="signOut"
                >
                  Sign Out
                </v-btn>
              </v-col>
            </v-row>

            <!-- Additional Help -->
            <div class="text-caption text-medium-emphasis">
              For immediate assistance, contact your system administrator.
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Background Pattern -->
    <div class="background-pattern">
      <v-row no-gutters class="fill-height">
        <v-col
          v-for="i in 15"
          :key="i"
          cols="1"
          class="d-flex align-center justify-center"
        >
          <v-icon
            :size="Math.random() * 25 + 10"
            :color="userInfo?.isDeleted ? 'error' : 'warning'"
            :style="{
              opacity: Math.random() * 0.08 + 0.02,
              transform: `rotate(${Math.random() * 360}deg)`
            }"
          >
            {{ userInfo?.isDeleted ? 'mdi-account-remove' : 'mdi-account-cancel' }}
          </v-icon>
        </v-col>
      </v-row>
    </div>
  </v-container>
</template>

<style scoped>
.background-pattern {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: -1;
  pointer-events: none;
  overflow: hidden;
}

.v-card {
  position: relative;
  z-index: 1;
  backdrop-filter: blur(10px);
  background-color: rgba(255, 255, 255, 0.95);
}

/* Dark theme adjustments */
.v-theme--dark .v-card {
  background-color: rgba(33, 37, 41, 0.95);
}

/* Enhance card shadow and border */
.v-card {
  border: 1px solid rgba(0, 0, 0, 0.1);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
}

.v-theme--dark .v-card {
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.3);
}
</style>
