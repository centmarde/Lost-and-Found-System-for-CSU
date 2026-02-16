<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useUserRolesStore } from '@/stores/roles'

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

// Load user role
const loadUserRole = async () => {
  if (props.selectedUser) {
    const roleId = props.selectedUser.user_metadata?.role || props.selectedUser.app_metadata?.role
    await getRoleTitle(roleId)
  }
}

// Utility functions
const formatDate = (dateString: string) => {
  if (!dateString) return 'N/A'
  return new Date(dateString).toLocaleDateString()
}

// Watch for dialog opening or user change
watch([() => props.modelValue, () => props.selectedUser], () => {
  if (props.modelValue && props.selectedUser) {
    loadUserRole()
  }
}, { immediate: true })

// Load roles when component mounts
onMounted(async () => {
  await rolesStore.fetchRoles()
  if (props.modelValue && props.selectedUser) {
    loadUserRole()
  }
})
</script>

<template>
   <!-- User Details Dialog -->
    <v-dialog v-model="userDialog" max-width="600">
      <v-card v-if="props.selectedUser">
        <v-card-title class="d-flex align-center">
          <v-icon class="me-2">mdi-account</v-icon>
          User Details
        </v-card-title>

        <v-card-text>
          <v-container>
            <v-row>
              <v-col cols="12" md="6">
                <v-text-field
                  label="ID"
                  :model-value="props.selectedUser.id"
                  readonly
                  variant="outlined"
                  density="comfortable"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  label="Email"
                  :model-value="props.selectedUser.email"
                  readonly
                  variant="outlined"
                  density="comfortable"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  label="Full Name"
                  :model-value="props.selectedUser.user_metadata?.full_name || 'Not provided'"
                  readonly
                  variant="outlined"
                  density="comfortable"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  label="Role"
                  :model-value="roleName"
                  readonly
                  variant="outlined"
                  density="comfortable"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  label="Created At"
                  :model-value="formatDate(props.selectedUser.created_at)"
                  readonly
                  variant="outlined"
                  density="comfortable"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  label="Email Verified"
                  :model-value="props.selectedUser.email_confirmed_at ? 'Yes' : 'No'"
                  readonly
                  variant="outlined"
                  density="comfortable"
                />
              </v-col>
            </v-row>
          </v-container>
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn color="primary" @click="userDialog = false">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
</template>
