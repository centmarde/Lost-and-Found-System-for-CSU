<template>
  <v-card
    class="profiles-widget"
    elevation="2"
    rounded="lg"
  >
    <v-card-title class="d-flex align-center justify-space-between">
      <div class="d-flex align-center">
        <v-icon class="mr-2" color="primary">mdi-account-circle</v-icon>
        <span class="text-h6">Current Profile</span>
      </div>
      <v-btn
        icon
        size="small"
        variant="text"
        @click="refreshUserData"
        :loading="loading"
      >
        <v-icon>mdi-refresh</v-icon>
      </v-btn>
    </v-card-title>

    <v-divider></v-divider>

    <v-card-text>
      <!-- Loading State -->
      <div v-if="loading" class="text-center py-4">
        <v-progress-circular
          indeterminate
          color="primary"
          size="64"
        ></v-progress-circular>
        <p class="mt-3 text-body-2 text-medium-emphasis">Loading profile...</p>
      </div>

      <!-- Error State -->
      <v-alert
        v-else-if="error"
        type="error"
        variant="tonal"
        class="mb-0"
      >
        <template #title>Error Loading Profile</template>
        {{ error }}
        <template #append>
          <v-btn
            size="small"
            variant="text"
            @click="fetchCurrentUser"
          >
            Retry
          </v-btn>
        </template>
      </v-alert>

      <!-- Profile Content -->
      <div v-else-if="hasUserData" class="profile-content">
        <!-- User Avatar and Name -->
        <div class="d-flex align-center mb-4">
          <v-avatar
            size="64"
            color="primary"
            class="mr-4"
          >
            <v-icon size="32" color="white">mdi-account</v-icon>
          </v-avatar>
          <div>
            <h3 class="text-h6 mb-1">{{ userDisplayName }}</h3>
            <p class="text-body-2 text-medium-emphasis mb-0">{{ userEmail }}</p>
          </div>
        </div>

        <!-- Profile Details -->
        <v-list class="bg-transparent">
          <v-list-item
            v-if="userRole"
            prepend-icon="mdi-account-key"
            :title="`Role ID: ${userRole}`"
            subtitle="User Role Identifier"
          ></v-list-item>

          <v-list-item
            v-if="userCreatedAt"
            prepend-icon="mdi-calendar-plus"
            :title="`Joined: ${userCreatedAt}`"
            subtitle="Account Creation Date"
          ></v-list-item>

          <v-list-item
            v-if="currentUser?.id"
            prepend-icon="mdi-identifier"
            :title="`ID: ${currentUser.id.substring(0, 8)}...`"
            :subtitle="`Full ID: ${currentUser.id}`"
          ></v-list-item>
        </v-list>

        <!-- Update Profile Form -->
        <v-form v-if="showUpdateForm" class="mt-4">
          <v-text-field
            v-model="updateForm.student_number"
            label="Student Number"
            prepend-icon="mdi-school"
            variant="outlined"
            density="compact"
          ></v-text-field>

          <v-text-field
            v-model="updateForm.organization_id"
            label="Organization ID"
            prepend-icon="mdi-office-building"
            variant="outlined"
            density="compact"
            type="number"
          ></v-text-field>

          <v-select
            v-model="updateForm.status"
            label="Status"
            :items="statusOptions"
            prepend-icon="mdi-account-check"
            variant="outlined"
            density="compact"
          ></v-select>
        </v-form>

        <!-- Quick Actions -->
        <div class="d-flex gap-2 mt-4">
          <v-btn
            variant="outlined"
            size="small"
            prepend-icon="mdi-account-edit"
            @click="toggleUpdateForm"
          >
            {{ showUpdateForm ? 'Cancel' : 'Edit Profile' }}
          </v-btn>

          <v-btn
            v-if="showUpdateForm"
            variant="tonal"
            size="small"
            prepend-icon="mdi-content-save"
            @click="handleUpdateProfile"
            :loading="loading"
            color="primary"
          >
            Save Changes
          </v-btn>

          <v-btn
            variant="outlined"
            size="small"
            prepend-icon="mdi-shield-account"
            @click="$emit('view-permissions')"
          >
            Permissions
          </v-btn>
        </div>
      </div>

      <!-- No User Data State -->
      <div v-else class="text-center py-4">
        <v-icon size="64" color="grey-lighten-1">mdi-account-off</v-icon>
        <h4 class="text-h6 mt-3 mb-2">No Profile Data</h4>
        <p class="text-body-2 text-medium-emphasis mb-3">
          Unable to load profile information
        </p>
        <v-btn
          variant="outlined"
          @click="fetchCurrentUser"
        >
          Reload Profile
        </v-btn>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useProfilesWidget } from './composables/profilesWidget'

// Emits for parent component interactions
const emit = defineEmits<{
  'edit-profile': []
  'view-permissions': []
  'profile-updated': [data: Record<string, any>]
}>()

// Use the composable
const {
  currentUser,
  loading,
  error,
  userDisplayName,
  userEmail,
  userRole,
  userCreatedAt,
  hasUserData,
  fetchCurrentUser,
  refreshUserData,
  updateUserMetadata
} = useProfilesWidget()

// Form state
const showUpdateForm = ref(false)
const updateForm = ref({
  student_number: '',
  organization_id: null as number | null,
  status: 'active'
})

// Status options
const statusOptions = [
  { title: 'Active', value: 'active' },
  { title: 'Inactive', value: 'inactive' },
  { title: 'Blocked', value: 'blocked' }
]

// Toggle update form
const toggleUpdateForm = () => {
  showUpdateForm.value = !showUpdateForm.value

  // Reset form when opening
  if (showUpdateForm.value) {
    updateForm.value = {
      student_number: currentUser.value?.user_metadata?.student_number || '',
      organization_id: currentUser.value?.user_metadata?.organization_id || null,
      status: currentUser.value?.user_metadata?.status || 'active'
    }
  }
}

// Handle profile update
const handleUpdateProfile = async () => {
  // Prepare the data to update
  const additionalData = {
    student_number: updateForm.value.student_number,
    organization_id: updateForm.value.organization_id,
    status: updateForm.value.status,
    profile_updated_at: new Date().toISOString(),
    last_profile_update_source: 'admin_widget',
    widget_version: '1.0.0'
  }

  const result = await updateUserMetadata(additionalData)

  if (result.error) {
    console.error('Failed to update profile:', result.error)
  } else {
    console.log('Profile updated successfully')
    showUpdateForm.value = false // Close form after successful update
    // Emit event to parent component
    emit('profile-updated', additionalData)
  }
}
</script><style scoped>
.profiles-widget {
  max-width: 400px;
}

.profile-content {
  min-height: 200px;
}

.v-list-item {
  padding-left: 0;
  padding-right: 0;
}

.v-avatar {
  flex-shrink: 0;
}
</style>
