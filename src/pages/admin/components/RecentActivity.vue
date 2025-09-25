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

const headers = [
  {
    title: 'Type',
    align: 'start' as const,
    sortable: true,
    key: 'type',
    width: '100px'
  },
  {
    title: 'Item',
    align: 'start' as const,
    sortable: true,
    key: 'title',
    width: '300px'
  },
  {
    title: 'User',
    align: 'start' as const,
    sortable: true,
    key: 'user',
    width: '150px'
  },
  {
    title: 'Status',
    align: 'start' as const,
    sortable: true,
    key: 'status',
    width: '120px'
  },
  {
    title: 'Time',
    align: 'end' as const,
    sortable: true,
    key: 'timestamp',
    width: '120px'
  }
]

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

        <v-data-table
          :headers="headers"
          :items="stats.recentActivity"
          :items-per-page="5"
          :items-per-page-options="[5, 10, 25, 50]"
          class="elevation-0"
          no-data-text="No recent activity"
        >
          <!-- Type column slot -->
          <template v-slot:item.type="{ item }">
            <v-chip
              :color="getActivityColor(item.type)"
              variant="flat"
              size="small"
              class="text-white"
            >
              <v-icon
                :icon="getActivityIcon(item.type)"
                start
                size="16"
              />
              {{ item.type.charAt(0).toUpperCase() + item.type.slice(1) }}
            </v-chip>
          </template>

          <!-- Title column slot -->
          <template v-slot:item.title="{ item }">
            <div class="font-weight-medium">
              {{ item.title }}
            </div>
          </template>

          <!-- Status column slot -->
          <template v-slot:item.status="{ item }">
            <v-chip
              variant="outlined"
              size="small"
              color="primary"
            >
              {{ item.status }}
            </v-chip>
          </template>

          <!-- Timestamp column slot -->
          <template v-slot:item.timestamp="{ item }">
            <div class="text-caption text-grey-darken-1">
              {{ formatTimestamp(item.timestamp) }}
            </div>
          </template>

          <!-- No data slot -->
          <template v-slot:no-data>
            <div class="text-center py-8">
              <v-icon size="64" color="grey-lighten-1">mdi-inbox</v-icon>
              <div class="text-h6 text-grey-darken-1 mt-2">No recent activity</div>
              <div class="text-body-2 text-grey-darken-1">Items and activities will appear here</div>
            </div>
          </template>
        </v-data-table>
      </v-card>
    </v-col>
  </v-row>
</template>
