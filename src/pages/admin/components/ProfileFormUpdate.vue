<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useAuthUserStore } from '@/stores/authUser'
import { useUserRolesStore } from '@/stores/roles'
import {
  requiredValidator,
  passwordValidator,
  confirmedValidator,
  lengthValidator,
  isEmpty,
  emailValidator,
  alphaDashValidator
} from '@/lib/validator'

const authStore = useAuthUserStore()
const rolesStore = useUserRolesStore()

// Tab state
const activeTab = ref('profile')

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

// Password form data
const passwordForm = ref({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})

// Get current user role
const currentUserRole = computed(() => {
  const roleId = authStore.userData?.user_metadata?.role ||
                 authStore.userData?.app_metadata?.role;

  if (roleId) {
    return rolesStore.roles.find(role => role.id === roleId);
  }
  return null;
})

// Check if current user is a student (should show student number field)
const isStudent = computed(() => {
  if (!currentUserRole.value) return false;

  // Check if the role title contains "student" (case insensitive)
  return currentUserRole.value.title.toLowerCase().includes('student');
})

// Check if current user is admin (for backward compatibility)
const isAdmin = computed(() => {
  if (!currentUserRole.value) return false;

  // Check if the role title contains "admin" (case insensitive)
  return currentUserRole.value.title.toLowerCase().includes('admin');
})

// Real-time password validation using validator.ts
const isPasswordValid = computed(() => {
  if (isEmpty(passwordForm.value.newPassword)) return true
  return passwordValidator(passwordForm.value.newPassword) === true
})

const passwordValidationMessage = computed(() => {
  if (isEmpty(passwordForm.value.newPassword)) return ''
  const result = passwordValidator(passwordForm.value.newPassword)
  return typeof result === 'string' ? result : ''
})

const doPasswordsMatch = computed(() => {
  if (isEmpty(passwordForm.value.confirmPassword)) return true
  return confirmedValidator(passwordForm.value.confirmPassword, passwordForm.value.newPassword) === true
})

const passwordMatchMessage = computed(() => {
  if (isEmpty(passwordForm.value.confirmPassword)) return ''
  const result = confirmedValidator(passwordForm.value.confirmPassword, passwordForm.value.newPassword)
  return typeof result === 'string' ? result : ''
})

const isNewPasswordDifferent = computed(() => {
  if (isEmpty(passwordForm.value.newPassword) || isEmpty(passwordForm.value.currentPassword)) return true
  return passwordForm.value.newPassword !== passwordForm.value.currentPassword
})

// Helper computed for template error binding (ensures boolean type)
const showPasswordMatchError = computed(() => {
  return Boolean(passwordForm.value.confirmPassword && !doPasswordsMatch.value)
})

const passwordStrength = computed(() => {
  const password = passwordForm.value.newPassword
  if (isEmpty(password)) return { level: 0, text: '', color: '' }

  let score = 0
  const checks = {
    length: password.length >= 8,
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    numbers: /\d/.test(password),
    special: /[!@#$%&*()]/.test(password)
  }

  score = Object.values(checks).filter(Boolean).length

  if (score <= 1) return { level: 1, text: 'Weak', color: 'error' }
  if (score <= 3) return { level: 2, text: 'Fair', color: 'warning' }
  if (score <= 4) return { level: 3, text: 'Good', color: 'info' }
  return { level: 4, text: 'Strong', color: 'success' }
})

// Real-time validation messages
const confirmPasswordHint = computed(() => {
  if (isEmpty(passwordForm.value.confirmPassword)) return 'Re-enter your new password to confirm'
  if (!doPasswordsMatch.value) return passwordMatchMessage.value
  return 'Passwords match!'
})

const newPasswordHint = computed(() => {
  if (isEmpty(passwordForm.value.newPassword)) return 'Password must be at least 8 characters long and include uppercase, lowercase, number, and special character'
  if (!isPasswordValid.value) return passwordValidationMessage.value
  if (!isNewPasswordDifferent.value) return 'New password must be different from current password'
  return `Password strength: ${passwordStrength.value.text}`
})

// Profile form validation
const isFullNameValid = computed(() => {
  return requiredValidator(profileForm.value.fullName) === true
})

const isEmailValid = computed(() => {
  if (isEmpty(profileForm.value.email)) return true
  return emailValidator(profileForm.value.email) === true
})

const isBioValid = computed(() => {
  if (isEmpty(profileForm.value.bio)) return true
  return lengthValidator(profileForm.value.bio, 0) === true && profileForm.value.bio.length <= 500
})

// Form state
const isUpdating = ref(false)
const isChangingPassword = ref(false)
const formErrors = ref<Record<string, string>>({})
const passwordErrors = ref<Record<string, string>>({})
const successMessage = ref('')
const passwordSuccessMessage = ref('')

// Watch for password changes to clear errors in real-time
watch([() => passwordForm.value.newPassword, () => passwordForm.value.confirmPassword], () => {
  // Clear specific field errors when user starts typing
  if (passwordErrors.value.newPassword || passwordErrors.value.confirmPassword) {
    const { general, ...otherErrors } = passwordErrors.value
    passwordErrors.value = { general } // Keep general errors but clear field-specific ones
  }
}, { deep: true })

// Clear current password error when user types
watch(() => passwordForm.value.currentPassword, () => {
  if (passwordErrors.value.currentPassword) {
    delete passwordErrors.value.currentPassword
  }
})

// Load current user data into form
onMounted(async () => {
  // Load roles if not already loaded
  if (rolesStore.roles.length === 0) {
    await rolesStore.fetchRoles()
  }

  await loadCurrentUserData()
})

// Handle profile update using validator.ts
const updateProfile = async () => {
  isUpdating.value = true
  formErrors.value = {}
  successMessage.value = ''

  try {
    // Validate full name using requiredValidator
    const fullNameValidation = requiredValidator(profileForm.value.fullName)
    if (fullNameValidation !== true) {
      formErrors.value = { general: typeof fullNameValidation === 'string' ? fullNameValidation : 'Full name is required.' }
      return
    }

    // Validate email format if provided
    if (!isEmpty(profileForm.value.email)) {
      const emailValidation = emailValidator(profileForm.value.email)
      if (emailValidation !== true) {
        formErrors.value = { general: typeof emailValidation === 'string' ? emailValidation : 'Invalid email format.' }
        return
      }
    }

    // Validate bio length if provided
    if (!isEmpty(profileForm.value.bio) && profileForm.value.bio.length > 500) {
      formErrors.value = { general: 'Bio must be 500 characters or less.' }
      return
    }

    // Get current user to get the user ID
    const currentUserResult = await authStore.getCurrentUser()
    if (currentUserResult.error || !currentUserResult.user) {
      formErrors.value = { general: 'Unable to get current user information.' }
      return
    }

    const userId = currentUserResult.user.id

    // Prepare the metadata update object with trimmed values
    const metadataUpdate: Record<string, string> = {
      full_name: profileForm.value.fullName.trim(),
      phone_number: profileForm.value.phoneNumber.trim(),
      address: profileForm.value.address.trim(),
      bio: profileForm.value.bio.trim(),
      organization: profileForm.value.organization.trim()
    }

    // Only include student number if the user is a student
    if (isStudent.value) {
      metadataUpdate.student_number = profileForm.value.studentNumber.trim()
    }

    // Call the updateUserMetadata function from authUser store
    const result = await authStore.updateUserMetadata(userId, metadataUpdate)

    if (result.error) {
      const errorMessage = (result.error as any)?.message || 'Failed to update profile. Please try again.'
      formErrors.value = { general: errorMessage }
      return
    }

    // Success - show success message and refresh user data
    successMessage.value = 'Profile updated successfully!'

    // Refresh the form with updated data after a short delay
    setTimeout(async () => {
      await loadCurrentUserData()
    }, 500)

  } catch (error) {
    console.error('Error updating profile:', error)
    formErrors.value = { general: 'An unexpected error occurred. Please try again.' }
  } finally {
    isUpdating.value = false
  }
}

// Extract user data loading into separate function for reuse
const loadCurrentUserData = async () => {
  const result = await authStore.getCurrentUser()
  if (result.user) {
    profileForm.value = {
      fullName: result.user.user_metadata?.full_name || '',
      email: result.user.email || '',
      phoneNumber: result.user.user_metadata?.phone_number || '',
      address: result.user.user_metadata?.address || '',
      bio: result.user.user_metadata?.bio || '',
      organization: result.user.user_metadata?.organization || '',
      // Only load student number if the user is a student
      studentNumber: isStudent.value ? (result.user.user_metadata?.student_number || '') : ''
    }
  }
}

// Handle password change using validator.ts
const changePassword = async () => {
  isChangingPassword.value = true
  passwordErrors.value = {}
  passwordSuccessMessage.value = ''

  try {
    // Validate current password using requiredValidator
    const currentPasswordValidation = requiredValidator(passwordForm.value.currentPassword)
    if (currentPasswordValidation !== true) {
      passwordErrors.value = { currentPassword: typeof currentPasswordValidation === 'string' ? currentPasswordValidation : 'Current password is required.' }
      return
    }

    // Validate new password using passwordValidator
    const newPasswordValidation = passwordValidator(passwordForm.value.newPassword)
    if (newPasswordValidation !== true) {
      passwordErrors.value = { newPassword: typeof newPasswordValidation === 'string' ? newPasswordValidation : 'Invalid password format.' }
      return
    }

    // Validate password confirmation using confirmedValidator
    const confirmPasswordValidation = confirmedValidator(passwordForm.value.confirmPassword, passwordForm.value.newPassword)
    if (confirmPasswordValidation !== true) {
      passwordErrors.value = { confirmPassword: typeof confirmPasswordValidation === 'string' ? confirmPasswordValidation : 'Passwords do not match.' }
      return
    }

    // Check if new password is different from current password
    if (passwordForm.value.currentPassword === passwordForm.value.newPassword) {
      passwordErrors.value = { newPassword: 'New password must be different from current password.' }
      return
    }

    // Call the changePassword function from authUser store
    const result = await authStore.changePassword(
      passwordForm.value.currentPassword,
      passwordForm.value.newPassword
    )

    if (result.error) {
      const errorMessage = (result.error as any)?.message || 'Failed to change password. Please try again.'
      passwordErrors.value = { general: errorMessage }
      return
    }

    // Success - show success message and clear form
    passwordSuccessMessage.value = 'Password changed successfully!'

    // Clear the password form
    passwordForm.value = {
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    }

  } catch (error) {
    console.error('Error changing password:', error)
    passwordErrors.value = { general: 'An unexpected error occurred. Please try again.' }
  } finally {
    isChangingPassword.value = false
  }
}

// Clear messages when switching tabs
const onTabChange = (tab: unknown) => {
  activeTab.value = tab as string
  successMessage.value = ''
  passwordSuccessMessage.value = ''
  formErrors.value = {}
  passwordErrors.value = {}
}
</script>

<template>
  <v-card elevation="2" rounded="lg" id="profile-form">
    <v-card-title class="d-flex align-center">
      <v-icon class="mr-2" color="primary">mdi-account-edit</v-icon>
      <span class="text-h6">Profile Settings</span>
    </v-card-title>

    <v-divider></v-divider>

    <!-- Tabs -->
    <v-tabs v-model="activeTab" @update:model-value="onTabChange" class="px-6 pt-4">
      <v-tab value="profile" prepend-icon="mdi-account">
        Profile Information
      </v-tab>
      <v-tab value="password" prepend-icon="mdi-lock">
        Change Password
      </v-tab>
    </v-tabs>

    <v-card-text class="pa-6">
      <!-- Profile Tab -->
      <v-window v-model="activeTab">
        <v-window-item value="profile">
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

              <!-- Student Number (only show for student roles) -->
              <v-col v-if="isStudent" cols="12" md="6">
                <v-text-field
                  v-model="profileForm.studentNumber"
                  label="Student Number"
                  prepend-inner-icon="mdi-school"
                  variant="outlined"
                  :disabled="isUpdating"
                  hint="Only visible to users with Student role"
                  persistent-hint
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
        </v-window-item>

        <!-- Password Tab -->
        <v-window-item value="password">
          <!-- Success Message -->
          <v-alert
            v-if="passwordSuccessMessage"
            type="success"
            variant="tonal"
            class="mb-4"
            closable
            @click:close="passwordSuccessMessage = ''"
          >
            {{ passwordSuccessMessage }}
          </v-alert>

          <!-- Error Message -->
          <v-alert
            v-if="passwordErrors.general"
            type="error"
            variant="tonal"
            class="mb-4"
            closable
            @click:close="passwordErrors.general = ''"
          >
            {{ passwordErrors.general }}
          </v-alert>

          <!-- Password Form -->
          <v-form @submit.prevent="changePassword">
            <v-row>
              <!-- Current Password -->
              <v-col cols="12">
                <v-text-field
                  v-model="passwordForm.currentPassword"
                  label="Current Password"
                  prepend-inner-icon="mdi-lock"
                  variant="outlined"
                  type="password"
                  :disabled="isChangingPassword"
                  :error-messages="passwordErrors.currentPassword"
                  hint="Enter your current password to verify your identity"
                  persistent-hint
                ></v-text-field>
              </v-col>

              <!-- New Password -->
              <v-col cols="12">
                <v-text-field
                  v-model="passwordForm.newPassword"
                  label="New Password"
                  prepend-inner-icon="mdi-lock-plus"
                  variant="outlined"
                  type="password"
                  :disabled="isChangingPassword"
                  :error-messages="passwordErrors.newPassword"
                  :hint="newPasswordHint"
                  :persistent-hint="true"
                  :color="passwordForm.newPassword ? passwordStrength.color : undefined"
                ></v-text-field>

                <!-- Password Strength Indicator -->
                <v-progress-linear
                  v-if="passwordForm.newPassword"
                  :model-value="(passwordStrength.level / 4) * 100"
                  :color="passwordStrength.color"
                  class="mt-1"
                  height="4"
                  rounded
                ></v-progress-linear>
              </v-col>

              <!-- Confirm Password -->
              <v-col cols="12">
                <v-text-field
                  v-model="passwordForm.confirmPassword"
                  label="Confirm New Password"
                  prepend-inner-icon="mdi-lock-check"
                  variant="outlined"
                  type="password"
                  :disabled="isChangingPassword"
                  :error-messages="passwordErrors.confirmPassword"
                  :hint="confirmPasswordHint"
                  :persistent-hint="true"
                  :color="passwordForm.confirmPassword && doPasswordsMatch ? 'success' : undefined"
                  :error="showPasswordMatchError"
                ></v-text-field>

                <!-- Match indicator -->
                <div v-if="passwordForm.confirmPassword" class="d-flex align-center mt-1">
                  <v-icon
                    :color="doPasswordsMatch ? 'success' : 'error'"
                    size="small"
                    class="mr-1"
                  >
                    {{ doPasswordsMatch ? 'mdi-check-circle' : 'mdi-close-circle' }}
                  </v-icon>
                  <span
                    :class="doPasswordsMatch ? 'text-success' : 'text-error'"
                    class="text-caption"
                  >
                    {{ doPasswordsMatch ? 'Passwords match' : 'Passwords do not match' }}
                  </span>
                </div>
              </v-col>
            </v-row>

            <!-- Change Password Button -->
            <div class="d-flex justify-end mt-4">
              <v-btn
                type="submit"
                color="primary"
                size="large"
                :loading="isChangingPassword"
                :disabled="isChangingPassword"
                prepend-icon="mdi-key"
              >
                {{ isChangingPassword ? 'Changing Password...' : 'Change Password' }}
              </v-btn>
            </div>
          </v-form>

          <!-- Security Tips -->
          <v-card variant="outlined" class="mt-6">
            <v-card-title class="text-h6">
              <v-icon class="mr-2" color="info">mdi-shield-check</v-icon>
              Password Requirements
            </v-card-title>
            <v-card-text>
              <v-list density="compact">
                <v-list-item>
                  <template #prepend>
                    <v-icon
                      :color="passwordForm.newPassword.length >= 8 ? 'success' : 'grey'"
                      size="small"
                    >
                      {{ passwordForm.newPassword.length >= 8 ? 'mdi-check-circle' : 'mdi-circle-outline' }}
                    </v-icon>
                  </template>
                  <v-list-item-title
                    :class="passwordForm.newPassword.length >= 8 ? 'text-success' : ''"
                  >
                    At least 8 characters
                  </v-list-item-title>
                </v-list-item>

                <v-list-item>
                  <template #prepend>
                    <v-icon
                      :color="/[a-z]/.test(passwordForm.newPassword) && /[A-Z]/.test(passwordForm.newPassword) ? 'success' : 'grey'"
                      size="small"
                    >
                      {{ /[a-z]/.test(passwordForm.newPassword) && /[A-Z]/.test(passwordForm.newPassword) ? 'mdi-check-circle' : 'mdi-circle-outline' }}
                    </v-icon>
                  </template>
                  <v-list-item-title
                    :class="/[a-z]/.test(passwordForm.newPassword) && /[A-Z]/.test(passwordForm.newPassword) ? 'text-success' : ''"
                  >
                    Uppercase and lowercase letters
                  </v-list-item-title>
                </v-list-item>

                <v-list-item>
                  <template #prepend>
                    <v-icon
                      :color="/\d/.test(passwordForm.newPassword) ? 'success' : 'grey'"
                      size="small"
                    >
                      {{ /\d/.test(passwordForm.newPassword) ? 'mdi-check-circle' : 'mdi-circle-outline' }}
                    </v-icon>
                  </template>
                  <v-list-item-title
                    :class="/\d/.test(passwordForm.newPassword) ? 'text-success' : ''"
                  >
                    At least one number
                  </v-list-item-title>
                </v-list-item>

                <v-list-item>
                  <template #prepend>
                    <v-icon
                      :color="/[!@#$%&*()]/.test(passwordForm.newPassword) ? 'success' : 'grey'"
                      size="small"
                    >
                      {{ /[!@#$%&*()]/.test(passwordForm.newPassword) ? 'mdi-check-circle' : 'mdi-circle-outline' }}
                    </v-icon>
                  </template>
                  <v-list-item-title
                    :class="/[!@#$%&*()]/.test(passwordForm.newPassword) ? 'text-success' : ''"
                  >
                    Special characters (!@#$%&*())
                  </v-list-item-title>
                </v-list-item>

                <v-list-item>
                  <template #prepend>
                    <v-icon
                      :color="isNewPasswordDifferent ? 'success' : 'grey'"
                      size="small"
                    >
                      {{ isNewPasswordDifferent ? 'mdi-check-circle' : 'mdi-circle-outline' }}
                    </v-icon>
                  </template>
                  <v-list-item-title
                    :class="isNewPasswordDifferent ? 'text-success' : ''"
                  >
                    Different from current password
                  </v-list-item-title>
                </v-list-item>
              </v-list>
            </v-card-text>
          </v-card>
        </v-window-item>
      </v-window>
    </v-card-text>
  </v-card>
</template>
