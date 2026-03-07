<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useUserRolesStore } from '@/stores/roles'
import { supabaseAdmin } from '@/lib/supabase'

// Store
const rolesStore = useUserRolesStore()

// Props
interface Props {
  modelValue: boolean
  selectedUser: any
}

// Emits
interface Emits {
  (e: 'update:modelValue', value: boolean): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Reactive state
const roleName = ref<string>('Loading...')
const detailedUser = ref<any>(null)
const loading = ref(false)
const error = ref<string | null>(null)

// Computed properties
const userDialog = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value)
})

// Methods
const getRoleTitle = async (roleId: number) => {
  if (!roleId) {
    roleName.value = 'No Role'
    return
  }

  try {
    // First try to find in existing roles
    const existingRole = rolesStore.roles.find(r => r.id === roleId)
    if (existingRole) {
      roleName.value = existingRole.title
      return
    }

    // If not found, fetch the specific role
    const role = await rolesStore.fetchRoleById(roleId)
    if (role) {
      roleName.value = role.title
    } else {
      roleName.value = 'Unknown Role'
    }
  } catch (error) {
    console.error('Error fetching role:', error)
    roleName.value = 'Unknown Role'
  }
}

// Load detailed user data using supabaseAdmin
const loadDetailedUserData = async (userId: string) => {
  if (!userId) return

  loading.value = true
  error.value = null

  try {
    // Fetch complete user data using supabaseAdmin
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId)

    if (userError) {
      throw userError
    }

    detailedUser.value = userData.user
    console.log('Detailed user data:', userData.user)

    // Load role title
    const roleId = userData.user?.user_metadata?.role || userData.user?.app_metadata?.role
    await getRoleTitle(roleId)

  } catch (err) {
    console.error('Error fetching detailed user data:', err)
    error.value = 'Failed to load detailed user information'
    detailedUser.value = null
  } finally {
    loading.value = false
  }
}

// Utility functions
const formatDate = (dateString: string) => {
  if (!dateString) return 'N/A'
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatDuration = (dateString: string) => {
  if (!dateString) return 'N/A'
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

  if (diffDays > 0) {
    return `${diffDays} days, ${diffHours} hours ago`
  } else if (diffHours > 0) {
    return `${diffHours} hours ago`
  } else {
    return 'Less than an hour ago'
  }
}

const getUserStatus = (user: any) => {
  if (!user) return 'Unknown'

  if (user.app_metadata?.deleted) return 'Deleted'
  if (user.app_metadata?.banned) return 'Banned'
  if (!user.email_confirmed_at) return 'Email Unverified'
  return 'Active'
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'Active': return 'success'
    case 'Banned': return 'error'
    case 'Deleted': return 'error'
    case 'Email Unverified': return 'warning'
    default: return 'grey'
  }
}

const getBanStatus = (user: any) => {
  if (!user?.app_metadata?.banned) return null

  const banData = user.app_metadata
  return {
    duration: banData.ban_duration || 'Unknown',
    reason: banData.ban_reason || 'No reason provided',
    bannedAt: banData.banned_at ? formatDate(banData.banned_at) : 'Unknown',
    bannedUntil: banData.banned_until ? formatDate(banData.banned_until) : 'Permanent'
  }
}

// Watch for dialog opening or user change
watch([() => props.modelValue, () => props.selectedUser], () => {
  if (props.modelValue && props.selectedUser?.id) {
    loadDetailedUserData(props.selectedUser.id)
  }
}, { immediate: true })

// Load roles when component mounts
onMounted(async () => {
  await rolesStore.fetchRoles()
  if (props.modelValue && props.selectedUser?.id) {
    loadDetailedUserData(props.selectedUser.id)
  }
})
</script>

<template>
  <!-- User Details Dialog -->
  <v-dialog v-model="userDialog" max-width="900" max-height="80vh" scrollable>
    <v-card v-if="props.selectedUser">
      <v-card-title class="d-flex align-center bg-primary">
        <v-icon class="me-2" color="white">mdi-account-details</v-icon>
        <span class="text-white">Comprehensive User Details</span>
      </v-card-title>

      <!-- Loading State -->
      <v-card-text v-if="loading" class="text-center py-8">
        <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
        <div class="mt-4">Loading detailed user information...</div>
      </v-card-text>

      <!-- Error State -->
      <v-card-text v-else-if="error" class="text-center py-8">
        <v-icon size="64" color="error">mdi-alert-circle</v-icon>
        <div class="text-h6 mt-2 text-error">{{ error }}</div>
      </v-card-text>

      <!-- User Data -->
      <v-card-text v-else-if="detailedUser">
        <v-container>
          <!-- Account Status -->
          <v-row class="mb-4">
            <v-col cols="12">
              <div class="d-flex align-center mb-3">
                <v-icon class="me-2">mdi-account-check</v-icon>
                <span class="text-h6">Account Status</span>
              </div>
              <v-chip
                :color="getStatusColor(getUserStatus(detailedUser))"
                variant="elevated"
                size="large"
              >
                <v-icon start>mdi-circle</v-icon>
                {{ getUserStatus(detailedUser) }}
              </v-chip>
            </v-col>
          </v-row>

          <v-divider class="my-4"></v-divider>

          <!-- Basic Information -->
          <v-row class="mb-4">
            <v-col cols="12">
              <div class="d-flex align-center mb-3">
                <v-icon class="me-2">mdi-account</v-icon>
                <span class="text-h6">Basic Information</span>
              </div>
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                label="User ID"
                :model-value="detailedUser.id"
                readonly
                variant="outlined"
                density="comfortable"
                prepend-inner-icon="mdi-identifier"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                label="Email Address"
                :model-value="detailedUser.email || 'N/A'"
                readonly
                variant="outlined"
                density="comfortable"
                prepend-inner-icon="mdi-email"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                label="Full Name"
                :model-value="detailedUser.user_metadata?.full_name || 'Not provided'"
                readonly
                variant="outlined"
                density="comfortable"
                prepend-inner-icon="mdi-account-outline"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                label="Role"
                :model-value="roleName"
                readonly
                variant="outlined"
                density="comfortable"
                prepend-inner-icon="mdi-shield-account"
              />
            </v-col>
          </v-row>

          <v-divider class="my-4"></v-divider>

          <!-- Account Timestamps -->
          <v-row class="mb-4">
            <v-col cols="12">
              <div class="d-flex align-center mb-3">
                <v-icon class="me-2">mdi-clock</v-icon>
                <span class="text-h6">Account Timestamps</span>
              </div>
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                label="Account Created"
                :model-value="formatDate(detailedUser.created_at)"
                readonly
                variant="outlined"
                density="comfortable"
                prepend-inner-icon="mdi-calendar-plus"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                label="Account Age"
                :model-value="formatDuration(detailedUser.created_at)"
                readonly
                variant="outlined"
                density="comfortable"
                prepend-inner-icon="mdi-timer"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                label="Email Confirmed At"
                :model-value="detailedUser.email_confirmed_at ? formatDate(detailedUser.email_confirmed_at) : 'Not verified'"
                readonly
                variant="outlined"
                density="comfortable"
                prepend-inner-icon="mdi-email-check"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                label="Last Sign In"
                :model-value="detailedUser.last_sign_in_at ? formatDate(detailedUser.last_sign_in_at) : 'Never'"
                readonly
                variant="outlined"
                density="comfortable"
                prepend-inner-icon="mdi-login"
              />
            </v-col>
          </v-row>

          <!-- Ban Information (if applicable) -->
          <template v-if="getBanStatus(detailedUser)">
            <v-divider class="my-4"></v-divider>
            <v-row class="mb-4">
              <v-col cols="12">
                <div class="d-flex align-center mb-3">
                  <v-icon class="me-2" color="error">mdi-account-cancel</v-icon>
                  <span class="text-h6 text-error">Ban Information</span>
                </div>
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  label="Ban Duration"
                  :model-value="getBanStatus(detailedUser)?.duration"
                  readonly
                  variant="outlined"
                  density="comfortable"
                  prepend-inner-icon="mdi-timer-sand"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  label="Banned Until"
                  :model-value="getBanStatus(detailedUser)?.bannedUntil"
                  readonly
                  variant="outlined"
                  density="comfortable"
                  prepend-inner-icon="mdi-calendar-end"
                />
              </v-col>
              <v-col cols="12">
                <v-textarea
                  label="Ban Reason"
                  :model-value="getBanStatus(detailedUser)?.reason"
                  readonly
                  variant="outlined"
                  density="comfortable"
                  prepend-inner-icon="mdi-text"
                  rows="2"
                />
              </v-col>
            </v-row>
          </template>

          <!-- User Metadata -->
          <v-divider class="my-4"></v-divider>
          <v-row class="mb-4">
            <v-col cols="12">
              <div class="d-flex align-center mb-3">
                <v-icon class="me-2">mdi-code-json</v-icon>
                <span class="text-h6">User Metadata</span>
              </div>
            </v-col>
            <v-col cols="12" md="6">
              <v-card variant="outlined">
                <v-card-title class="text-subtitle-1 bg-grey-lighten-4">
                  <v-icon class="me-2">mdi-account-cog</v-icon>
                  User Metadata
                </v-card-title>
                <v-card-text>
                  <pre class="text-caption">{{ JSON.stringify(detailedUser.user_metadata || {}, null, 2) }}</pre>
                </v-card-text>
              </v-card>
            </v-col>
            <v-col cols="12" md="6">
              <v-card variant="outlined">
                <v-card-title class="text-subtitle-1 bg-grey-lighten-4">
                  <v-icon class="me-2">mdi-shield-cog</v-icon>
                  App Metadata (Admin)
                </v-card-title>
                <v-card-text>
                  <pre class="text-caption">{{ JSON.stringify(detailedUser.app_metadata || {}, null, 2) }}</pre>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>

          <!-- Authentication Details -->
          <v-divider class="my-4"></v-divider>
          <v-row class="mb-4">
            <v-col cols="12">
              <div class="d-flex align-center mb-3">
                <v-icon class="me-2">mdi-security</v-icon>
                <span class="text-h6">Authentication Details</span>
              </div>
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                label="Phone"
                :model-value="detailedUser.phone || 'Not provided'"
                readonly
                variant="outlined"
                density="comfortable"
                prepend-inner-icon="mdi-phone"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                label="Phone Confirmed"
                :model-value="detailedUser.phone_confirmed_at ? 'Yes' : 'No'"
                readonly
                variant="outlined"
                density="comfortable"
                prepend-inner-icon="mdi-phone-check"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                label="Recovery Sent At"
                :model-value="detailedUser.recovery_sent_at ? formatDate(detailedUser.recovery_sent_at) : 'Never'"
                readonly
                variant="outlined"
                density="comfortable"
                prepend-inner-icon="mdi-key"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                label="Email Change Sent At"
                :model-value="detailedUser.email_change_sent_at ? formatDate(detailedUser.email_change_sent_at) : 'Never'"
                readonly
                variant="outlined"
                density="comfortable"
                prepend-inner-icon="mdi-email-edit"
              />
            </v-col>
          </v-row>

          <!-- Additional Information -->
          <v-divider class="my-4"></v-divider>
          <v-row>
            <v-col cols="12">
              <div class="d-flex align-center mb-3">
                <v-icon class="me-2">mdi-information</v-icon>
                <span class="text-h6">Additional Information</span>
              </div>
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                label="Audience"
                :model-value="detailedUser.aud || 'N/A'"
                readonly
                variant="outlined"
                density="comfortable"
                prepend-inner-icon="mdi-account-group"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                label="Role (Direct)"
                :model-value="detailedUser.role || 'N/A'"
                readonly
                variant="outlined"
                density="comfortable"
                prepend-inner-icon="mdi-badge-account"
              />
            </v-col>
          </v-row>
        </v-container>
      </v-card-text>

      <v-card-actions class="px-6 py-4">
        <v-spacer />
        <v-btn color="primary" variant="elevated" @click="userDialog = false">
          <v-icon start>mdi-close</v-icon>
          Close
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
