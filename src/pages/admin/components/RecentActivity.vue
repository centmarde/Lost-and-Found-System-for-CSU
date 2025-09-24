<script lang="ts" setup>
interface ActivityItem {
  id: string
  type: 'lost' | 'found' | 'resolved' | 'claimed'
  title: string
  user: string
  timestamp: string
  status: string
}

interface Props {
  stats: {
    recentActivity: ActivityItem[]
  }
}

defineProps<Props>()

const getActivityColor = (type: string) => {
  switch (type) {
    case 'lost': return 'error'
    case 'found': return 'success'
    case 'resolved': return 'primary'
    case 'claimed': return 'info'
    default: return 'grey'
  }
}

const getActivityIcon = (type: string) => {
  switch (type) {
    case 'lost': return 'mdi-alert-circle'
    case 'found': return 'mdi-check-circle'
    case 'resolved': return 'mdi-handshake'
    case 'claimed': return 'mdi-account-check'
    default: return 'mdi-circle'
  }
}

const formatTimestamp = (timestamp: string) => {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 60) return `${minutes} minutes ago`
  if (hours < 24) return `${hours} hours ago`
  return `${days} days ago`
}
</script>

<template>
  <v-row class="mt-4">
    <v-col cols="12">
      <v-card class="pa-4" elevation="2">
        <v-card-title class="text-h6 font-weight-bold mb-4">
          <v-icon class="me-2">mdi-clock-outline</v-icon>
          Recent Activity
        </v-card-title>
        <div v-if="stats.recentActivity.length === 0" class="text-center py-8">
          <v-icon size="64" color="grey-lighten-1">mdi-inbox</v-icon>
          <div class="text-h6 text-grey-darken-1 mt-2">No recent activity</div>
          <div class="text-body-2 text-grey-darken-1">Items and activities will appear here</div>
        </div>
        <v-list v-else>
          <v-list-item
            v-for="activity in stats.recentActivity"
            :key="activity.id"
            class="px-0"
          >
            <template #prepend>
              <v-avatar :color="getActivityColor(activity.type)" size="40">
                <v-icon :icon="getActivityIcon(activity.type)" color="white" />
              </v-avatar>
            </template>

            <v-list-item-title class="font-weight-medium">
              {{ activity.title }}
            </v-list-item-title>
            <v-list-item-subtitle>
              {{ activity.type.charAt(0).toUpperCase() + activity.type.slice(1) }}
              by {{ activity.user }} • {{ activity.status }}
            </v-list-item-subtitle>

            <template #append>
              <div class="text-caption text-grey-darken-1">
                {{ formatTimestamp(activity.timestamp) }}
              </div>
            </template>
          </v-list-item>
        </v-list>
      </v-card>
    </v-col>
  </v-row>
</template>