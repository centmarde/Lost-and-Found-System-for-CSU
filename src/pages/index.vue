<script lang="ts" setup>
import { onMounted, computed } from 'vue'
import { useLandingController } from '@/controller/landingController'
import { useTheme } from 'vuetify'
import OuterLayoutWrapper from '@/layouts/OuterLayoutWrapper.vue'

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
                <!-- Badge -->
                <v-chip
                  color="primary" 
                  variant="tonal" 
                  size="small"
                  class="mb-6 animate-fade-in"
                  prepend-icon="mdi-new-box"
                >
                  New Release Available
                </v-chip>

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

                <!-- Stats -->
                <v-row class="mt-12 animate-fade-in delay-3" justify="center">
                  <v-col v-for="stat in [
                    { number: '50K+', label: 'Downloads' },
                    { number: '4.9★', label: 'Rating' },
                    { number: '24/7', label: 'Support' }
                  ]" :key="stat.label" cols="4" sm="2" class="text-center">
                    <div class="text-h5 font-weight-bold text-primary">{{ stat.number }}</div>
                    <div class="text-caption text-medium-emphasis">{{ stat.label }}</div>
                  </v-col>
                </v-row>
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

<style scoped>
.landing-page {
  overflow-x: hidden;
}

.hero-section {
  min-height: 100vh;
  display: flex;
  align-items: center;
  position: relative;
}

.gradient-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1;
}

.gradient-light {
  background: linear-gradient(135deg, 
    rgba(25, 118, 210, 0.05) 0%, 
    rgba(156, 39, 176, 0.03) 50%, 
    rgba(255, 193, 7, 0.05) 100%);
}

.gradient-dark {
  background: linear-gradient(135deg, 
    rgba(25, 118, 210, 0.1) 0%, 
    rgba(156, 39, 176, 0.08) 50%, 
    rgba(255, 193, 7, 0.1) 100%);
}

.hero-content {
  position: relative;
  z-index: 2;
}

.hero-title {
  font-size: clamp(2.5rem, 5vw, 4rem);
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: -0.02em;
}

.hero-subtitle {
  font-size: clamp(1.1rem, 2vw, 1.4rem);
  opacity: 0.8;
  max-width: 600px;
  margin: 0 auto;
  line-height: 1.6;
}

.floating-elements {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1;
  overflow: hidden;
}

.float-element {
  position: absolute;
  border-radius: 50%;
  background: linear-gradient(45deg, rgba(25, 118, 210, 0.1), rgba(156, 39, 176, 0.1));
  animation: float 20s infinite linear;
}

.element-1 {
  width: 100px;
  height: 100px;
  top: 20%;
  left: 10%;
  animation-delay: -5s;
}

.element-2 {
  width: 60px;
  height: 60px;
  top: 60%;
  right: 15%;
  animation-delay: -15s;
}

.element-3 {
  width: 80px;
  height: 80px;
  top: 80%;
  left: 20%;
  animation-delay: -10s;
}

.scroll-indicator {
  position: absolute;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 2;
}

.scroll-arrow {
  animation: bounce 2s infinite;
}

/* Animations */
@keyframes float {
  from { transform: translateY(0px) rotate(0deg); }
  to { transform: translateY(-100vh) rotate(360deg); }
}

@keyframes bounce {
  0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
  40% { transform: translateY(-10px); }
  60% { transform: translateY(-5px); }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from { 
    opacity: 0; 
    transform: translateY(30px); 
  }
  to { 
    opacity: 1; 
    transform: translateY(0); 
  }
}

.animate-fade-in {
  animation: fadeIn 0.8s ease-out forwards;
}

.animate-slide-up {
  animation: slideUp 0.8s ease-out forwards;
}

.delay-1 { animation-delay: 0.2s; }
.delay-2 { animation-delay: 0.4s; }
.delay-3 { animation-delay: 0.6s; }

.min-h-screen {
  min-height: 100vh;
}
</style>