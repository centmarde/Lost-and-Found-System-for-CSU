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

        <!-- Features Section -->
        <v-sheet id="features" class="py-16">
          <v-container>
            <!-- Section Header -->
            <div class="text-center mb-12">
              <v-chip 
                color="primary" 
                variant="elevated" 
                size="large" 
                class="mb-4 font-weight-bold"
              >
                Key Features
              </v-chip>
              <h2 class="text-h3 font-weight-bold mb-4">
                Why Choose Our System
              </h2>
              <p class="text-h6 mx-auto" style="max-width: 600px;">
                Built specifically for modern campus management needs
              </p>
            </div>

            <!-- Features Grid -->
            <v-row>
              <v-col
                v-for="(feature, index) in data.features"
                :key="index"
                cols="12"
                sm="6"
                lg="3"
              >
                <v-card
                  class="h-100 text-center"
                  variant="elevated"
                  elevation="4"
                  hover
                  rounded="xl"
                >
                  <v-card-text class="pa-8">
                    <!-- Feature Icon -->
                    <v-avatar
                      color="primary"
                      size="80"
                      class="mb-6"
                    >
                      <v-icon :icon="feature.icon" size="40" />
                    </v-avatar>

                    <!-- Feature Title -->
                    <h3 class="text-h5 font-weight-bold mb-4 text-primary">
                      {{ feature.title }}
                    </h3>

                    <!-- Feature Description -->
                    <p class="text-body-1 text-left">
                      {{ feature.description }}
                    </p>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>
          </v-container>
        </v-sheet>

        <!-- About Section -->
        <v-sheet id="about" color="surface-variant" class="py-16">
          <v-container>
            <v-row justify="center">
              <v-col cols="12" lg="10">
                <v-card
                  variant="elevated"
                  elevation="8"
                  rounded="xl"
                  class="pa-8"
                >
                  <v-row align="center" justify="space-between">
                    <v-col cols="12" md="8">
                      <!-- Version Badge -->
                      <v-chip
                        color="primary"
                        variant="elevated"
                        size="large"
                        class="mb-4 font-weight-bold"
                      >
                        <template #prepend>
                          <v-icon>mdi-tag</v-icon>
                        </template>
                        Version {{ data.version }}
                      </v-chip>

                      <!-- About Title -->
                      <h3 class="text-h4 font-weight-bold mb-4 text-primary">
                        About This System
                      </h3>

                      <!-- Author Info -->
                      <div class="mb-4">
                        <p class="text-h6 mb-2">
                          <v-icon class="me-2 text-primary">mdi-account-group</v-icon>
                          Created by {{ data.author }}
                        </p>
                        <p class="text-body-1">
                          <v-icon class="me-2 text-primary">mdi-calendar</v-icon>
                          Last updated: {{ formatDate(data.lastUpdated) }}
                        </p>
                      </div>
                    </v-col>

                    <v-col cols="12" md="4" class="text-center text-md-right">
                      <v-btn
                        @click="openDocumentation"
                        color="primary"
                        variant="elevated"
                        size="x-large"
                        rounded="xl"
                        class="text-none px-8"
                      >
                        <template #prepend>
                          <v-icon>mdi-book-open</v-icon>
                        </template>
                        Documentation
                      </v-btn>
                    </v-col>
                  </v-row>
                </v-card>
              </v-col>
            </v-row>
          </v-container>
        </v-sheet>

        <!-- Call to Action Section -->
        <v-sheet color="primary" class="py-16">
          <v-container>
            <v-row justify="center">
              <v-col cols="12" lg="8" class="text-center">
                <h2 class="text-h3 font-weight-bold mb-4 text-on-primary">
                  Ready to Get Started?
                </h2>
                <p class="text-h6 mb-8 text-on-primary" style="opacity: 0.87;">
                  Join CSU's digital transformation in lost and found management
                </p>
                <v-btn
                  color="surface"
                  variant="elevated"
                  size="x-large"
                  rounded="pill"
                  class="text-none px-12"
                >
                  <template #prepend>
                    <v-icon>mdi-login</v-icon>
                  </template>
                  Access System
                </v-btn>
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