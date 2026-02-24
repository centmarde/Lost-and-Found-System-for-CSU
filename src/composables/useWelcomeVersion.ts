import { ref } from 'vue'
import axios from 'axios'

export interface LatestVersion {
  version: string
  date: string
  title: string
  changes: string[]
}

export const useWelcomeVersion = () => {
  const showWelcomeVersionDialog = ref(false)
  const showVersionDialog = ref(false)
  const latestVersionData = ref<LatestVersion | null>(null)

  const fetchLatestVersion = async () => {
    try {
      const response = await axios.get<{ versions: LatestVersion[] }>('/data/version.json')
      const versions = response.data.versions || []
      if (versions.length > 0) {
        latestVersionData.value = versions[0]
      }
    } catch (err) {
      console.error('Error fetching version data:', err)
    }
  }

  const openWelcomeDialog = async () => {
    await fetchLatestVersion()
    showWelcomeVersionDialog.value = true
  }

  const openChangelogs = () => {
    showWelcomeVersionDialog.value = false
    showVersionDialog.value = true
  }

  return {
    showWelcomeVersionDialog,
    showVersionDialog,
    latestVersionData,
    fetchLatestVersion,
    openWelcomeDialog,
    openChangelogs,
  }
}
