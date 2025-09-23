<script lang="ts" setup>
import { onMounted, computed } from 'vue'
import { useLandingController } from '@/controller/landingController'
import { useTheme } from 'vuetify'
import OuterLayoutWrapper from '@/layouts/OuterLayoutWrapper.vue'

// Import external CSS
import '@/styles/landing.css';

const { data, loading, error, fetchLandingData } = useLandingController()
const theme = useTheme()
const isDark = computed(() => theme.global.current.value.dark)

onMounted(() => fetchLandingData())

const scrollToFeatures = () => {
  document.querySelector('#features')?.scrollIntoView({ behavior: 'smooth' })
}

const openGithub = () => window.open('https://github.com', '_blank', 'noopener,noreferrer')
</script>


<template>
  <OuterLayoutWrapper>
    <template #content>
      <!-- Loading -->
      <v-container v-if="loading" class="d-flex justify-center align-center min-h-screen">
        <v-progress-circular color="primary" size="64" indeterminate />
      </v-container>

      <!-- Error -->
      <v-alert v-else-if="error" type="error" class="ma-4">
        Something went wrong: {{ error }}
      </v-alert>

      <!-- Main Content -->
      <div v-else-if="data" class="landing-page">
        <!-- Hero Section -->
        <v-sheet
          :color="isDark ? 'grey-darken-4' : 'grey-lighten-5'"
          class="hero-section position-relative"
        >
          <!-- Gradient Overlay -->
          <div
            class="gradient-overlay"
            :class="isDark ? 'gradient-dark' : 'gradient-light'"
          />

          <!-- Floating Elements -->
          <div class="floating-elements">
            <div class="float-element element-1" />
            <div class="float-element element-2" />
            <div class="float-element element-3" />
          </div>

          <v-container class="hero-content">
            <v-row justify="center" align="center" class="text-center">
              <v-col cols="12" md="10" lg="8">


                <!-- Main Title -->
                <h1 class="hero-title mb-6 animate-slide-up">
                  {{ data.title }}
                </h1>

                <!-- Subtitle -->
                <p class="hero-subtitle mb-8 animate-slide-up delay-1">
                  {{ data.description }}
                </p>

                <!-- CTA Buttons -->
                <div class="d-flex flex-column flex-sm-row justify-center ga-4 animate-slide-up delay-2">
                  <v-btn
                    @click="scrollToFeatures"
                    color="primary"
                    size="x-large"
                    rounded="xl"
                    class="text-none px-8 py-3 font-weight-medium"
                    elevation="0"
                  >
                    <v-icon start>mdi-rocket-launch</v-icon>
                    Get Started
                  </v-btn>

                  <v-btn
                    @click="openGithub"
                    variant="outlined"
                    size="x-large"
                    rounded="xl"
                    class="text-none px-8 py-3"
                  >
                    <v-icon start>mdi-github</v-icon>
                    View on GitHub
                  </v-btn>
                </div>
              </v-col>
            </v-row>
          </v-container>

          <!-- Scroll Indicator -->
          <div class="scroll-indicator">
            <v-icon class="scroll-arrow" color="primary">mdi-chevron-down</v-icon>
          </div>
        </v-sheet>
      </div>
    </template>
  </OuterLayoutWrapper>
</template>

