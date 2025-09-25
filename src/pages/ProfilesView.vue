<script setup lang="ts">
import { ref, onMounted } from 'vue'
import InnerLayoutWrapper from '@/layouts/InnerLayoutWrapper.vue';
import ProfilesWidget from '@/pages/admin/components/ProfilesWidget.vue';
import { useAuthUserStore } from '@/stores/authUser';

const authStore = useAuthUserStore()

// Form data
const profileForm = ref({
  fullName: '',
  email: '',
  phoneNumber: '',
  address: '',
  bio: '',
  organization: '',
  studentNumber: ''
})

// Form state
const isUpdating = ref(false)
const formErrors = ref<Record<string, string>>({})
const successMessage = ref('')

// Load current user data into form
onMounted(async () => {
  const result = await authStore.getCurrentUser()
  if (result.user) {
    profileForm.value = {
      fullName: result.user.user_metadata?.full_name || '',
      email: result.user.email || '',
      phoneNumber: result.user.user_metadata?.phone_number || '',
      address: result.user.user_metadata?.address || '',
      bio: result.user.user_metadata?.bio || '',
      organization: result.user.user_metadata?.organization || '',
      studentNumber: result.user.user_metadata?.student_number || ''
    }
  }
})

// Handle profile update
const updateProfile = async () => {
  isUpdating.value = true
  formErrors.value = {}
  successMessage.value = ''

  try {
    // TODO: Implement profile update logic with Supabase
    // For now, just simulate the update
    await new Promise(resolve => setTimeout(resolve, 2000))

    successMessage.value = 'Profile updated successfully!'

    // Here you would typically call a Supabase update function
    console.log('Updating profile with data:', profileForm.value)

  } catch (error) {
    console.error('Error updating profile:', error)
    formErrors.value = { general: 'Failed to update profile. Please try again.' }
  } finally {
    isUpdating.value = false
  }
}

// Handle profile widget events
const handleEditProfile = () => {
  console.log('Edit profile clicked')
  // Focus on the form section
  document.getElementById('profile-form')?.scrollIntoView({ behavior: 'smooth' })
}

const handleViewPermissions = () => {
  console.log('View permissions clicked')
  // TODO: Navigate to permissions page or open modal
}
</script>

<template>
  <InnerLayoutWrapper #content>
    <div class="pa-4 pa-md-6" style="max-width: 1400px; margin: 0 auto;">
      <!-- Page Header -->
      <div class="text-center mb-8">
        <h1 class="text-h3 text-md-h2 font-weight-bold text-primary mb-2">
          User Profile
        </h1>
        <p class="text-h6 text-md-h5 text-medium-emphasis">
          View and manage your profile information
        </p>
      </div>

      <!-- Main Content Grid -->
      <v-row>
        <!-- Profile Widget Column -->
        <v-col cols="12" md="6" lg="4">
          <ProfilesWidget
            @edit-profile="handleEditProfile"
            @view-permissions="handleViewPermissions"
          />
        </v-col>

        <!-- Profile Form Column -->
        <v-col cols="12" md="6" lg="8">
          <v-card elevation="2" rounded="lg" id="profile-form">
            <v-card-title class="d-flex align-center">
              <v-icon class="mr-2" color="primary">mdi-account-edit</v-icon>
              <span class="text-h6">Edit Profile Information</span>
            </v-card-title>

            <v-divider></v-divider>

            <v-card-text class="pa-6">
              <!-- Success Message -->
              <v-alert
                v-if="successMessage"
                type="success"
                variant="tonal"
                class="mb-4"
                closable
                @click:close="successMessage = ''"
              >
                {{ successMessage }}
              </v-alert>

              <!-- Error Message -->
              <v-alert
                v-if="formErrors.general"
                type="error"
                variant="tonal"
                class="mb-4"
                closable
                @click:close="formErrors.general = ''"
              >
                {{ formErrors.general }}
              </v-alert>

              <!-- Profile Form -->
              <v-form @submit.prevent="updateProfile">
                <v-row>
                  <!-- Full Name -->
                  <v-col cols="12" md="6">
                    <v-text-field
                      v-model="profileForm.fullName"
                      label="Full Name"
                      prepend-inner-icon="mdi-account"
                      variant="outlined"
                      :disabled="isUpdating"
                    ></v-text-field>
                  </v-col>

                  <!-- Email -->
                  <v-col cols="12" md="6">
                    <v-text-field
                      v-model="profileForm.email"
                      label="Email Address"
                      prepend-inner-icon="mdi-email"
                      variant="outlined"
                      type="email"
                      :disabled="isUpdating"
                      readonly
                      hint="Email cannot be changed here"
                      persistent-hint
                    ></v-text-field>
                  </v-col>

                  <!-- Phone Number -->
                  <v-col cols="12" md="6">
                    <v-text-field
                      v-model="profileForm.phoneNumber"
                      label="Phone Number"
                      prepend-inner-icon="mdi-phone"
                      variant="outlined"
                      :disabled="isUpdating"
                    ></v-text-field>
                  </v-col>

                  <!-- Student Number -->
                  <v-col cols="12" md="6">
                    <v-text-field
                      v-model="profileForm.studentNumber"
                      label="Student Number"
                      prepend-inner-icon="mdi-school"
                      variant="outlined"
                      :disabled="isUpdating"
                    ></v-text-field>
                  </v-col>

                  <!-- Organization -->
                  <v-col cols="12">
                    <v-text-field
                      v-model="profileForm.organization"
                      label="Organization/Department"
                      prepend-inner-icon="mdi-domain"
                      variant="outlined"
                      :disabled="isUpdating"
                    ></v-text-field>
                  </v-col>

                  <!-- Address -->
                  <v-col cols="12">
                    <v-textarea
                      v-model="profileForm.address"
                      label="Address"
                      prepend-inner-icon="mdi-map-marker"
                      variant="outlined"
                      rows="2"
                      :disabled="isUpdating"
                    ></v-textarea>
                  </v-col>

                  <!-- Bio -->
                  <v-col cols="12">
                    <v-textarea
                      v-model="profileForm.bio"
                      label="Bio/About"
                      prepend-inner-icon="mdi-information"
                      variant="outlined"
                      rows="3"
                      :disabled="isUpdating"
                      counter="500"
                      hint="Tell us about yourself"
                      persistent-hint
                    ></v-textarea>
                  </v-col>
                </v-row>

                <!-- Update Button -->
                <div class="d-flex justify-end mt-4">
                  <v-btn
                    type="submit"
                    color="primary"
                    size="large"
                    :loading="isUpdating"
                    :disabled="isUpdating"
                    prepend-icon="mdi-content-save"
                  >
                    {{ isUpdating ? 'Updating...' : 'Update Profile' }}
                  </v-btn>
                </div>
              </v-form>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>


    </div>
  </InnerLayoutWrapper>
</template>
