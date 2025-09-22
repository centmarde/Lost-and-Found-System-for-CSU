<script lang="ts" setup>
import { onMounted, computed } from 'vue'
import { useLandingController } from '@/controller/landingController'
import { useTheme } from 'vuetify'
import OuterLayoutWrapper from '@/layouts/OuterLayoutWrapper.vue'

const { data, loading, error, fetchLandingData } = useLandingController()
const theme = useTheme()

onMounted(async () => {
  await fetchLandingData()
})

const scrollToFeatures = () => {
  document.querySelector('#features')?.scrollIntoView({ 
    behavior: 'smooth', 
    block: 'start' 
  })
}

const openGithub = () => window.open('https://github.com', '_blank', 'noopener,noreferrer')
const openDocumentation = () => window.open('https://vuetifyjs.com/', '_blank', 'noopener,noreferrer')

const formatDate = (dateString: string) => 
  new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

// Theme-aware computed properties
const isDark = computed(() => theme.global.current.value.dark)
</script>

<template>
  <OuterLayoutWrapper>
    <template #content>
      <!-- Loading State -->
      <v-container v-if="loading" class="d-flex justify-center align-center" style="min-height: 60vh;">
        <v-progress-circular color="primary" indeterminate size="48" />
      </v-container>

      <!-- Error State -->
      <v-container v-else-if="error" class="d-flex justify-center align-center" style="min-height: 60vh;">
        <v-alert color="error" variant="tonal" max-width="500">
          <template #title>Something went wrong</template>
          {{ error }}
        </v-alert>
      </v-container>

      <!-- Main Content -->
      <div v-else-if="data">
        <!-- Hero Section -->
        <v-sheet 
          color="primary" 
          class="position-relative overflow-hidden"
          min-height="100vh"
        >
          <!-- Background Pattern Overlay -->
          <div class="position-absolute w-100 h-100 opacity-10">
            <v-img
              v-if="data.backgroundImage?.src"
              :src="data.backgroundImage.src"
              :alt="data.backgroundImage.alt"
              cover
              class="w-100 h-100"
            />
          </div>
          
          <!-- Hero Content -->
          <v-container class="d-flex align-center justify-center h-screen">
            <v-row justify="center" align="center" class="text-center">
              <v-col cols="12" lg="10" xl="8">
                <!-- Title -->
                <h1 class="text-h2 text-lg-h1 font-weight-black mb-4 text-on-primary">
                  {{ data.title }}
                </h1>
                
                <!-- Subtitle -->
                <h2 class="text-h5 text-lg-h4 font-weight-light mb-6 text-on-primary" style="opacity: 0.87;">
                  {{ data.subtitle }}
                </h2>
                
                <!-- Description -->
                <p class="text-h6 text-lg-h5 font-weight-regular mb-8 mx-auto text-on-primary" style="max-width: 700px; opacity: 0.75;">
                  {{ data.description }}
                </p>
                
                <!-- Action Buttons -->
                <div class="d-flex flex-column flex-sm-row justify-center ga-4">
                  <v-btn
                    @click="scrollToFeatures"
                    color="surface"
                    variant="elevated"
                    size="x-large"
                    rounded="pill"
                    class="text-none px-8"
                  >
                    <template #prepend>
                      <v-icon>mdi-rocket-launch</v-icon>
                    </template>
                    Explore Features
                  </v-btn>
                  
                  <v-btn
                    @click="openGithub"
                    variant="outlined"
                    color="on-primary"
                    size="x-large"
                    rounded="pill"
                    class="text-none px-8"
                  >
                    <template #prepend>
                      <v-icon>mdi-github</v-icon>
                    </template>
                    View Source
                  </v-btn>
                </div>
              </v-col>
            </v-row>
          </v-container>
        </v-sheet>

       

        

        
      </div>
    </template>
  </OuterLayoutWrapper>
</template>

<style scoped>
.h-screen {
  min-height: 100vh;
}

.position-absolute {
  position: absolute;
}

.position-relative {
  position: relative;
}

.w-100 {
  width: 100%;
}

.h-100 {
  height: 100%;
}

.overflow-hidden {
  overflow: hidden;
}

.opacity-10 {
  opacity: 0.1;
}
</style>