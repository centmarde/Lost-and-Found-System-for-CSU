<script lang="ts" setup>
import { onMounted, computed, ref } from 'vue'
import { useLandingController } from '@/controller/landingController'
import { useTheme } from 'vuetify'
import OuterLayoutWrapper from '@/layouts/OuterLayoutWrapper.vue'

// Import external CSS
import '@/styles/landing.css';

const { data, loading, error, fetchLandingData } = useLandingController()
const theme = useTheme()
const isDark = computed(() => theme.global.current.value.dark)

// Animation states
const isVisible = ref(false)
const searchText = ref('')
const placeholderIndex = ref(0)
const typedText = ref('')
const currentFeature = ref(0)

const placeholders = [
  'Lost your phone?', 
  'Missing wallet?', 
  'Can\'t find keys?', 
  'Lost jewelry?',
  'Missing laptop?'
]

const features = [
  {
    icon: 'mdi-alert-circle-outline',
    title: 'Report Lost Items',
    description: 'Quick and easy reporting with detailed descriptions and location tracking',
    color: 'error',
    stats: '2,847 reports'
  },
  {
    icon: 'mdi-treasure-chest',
    title: 'Found Items Registry',
    description: 'Comprehensive database of found items with smart matching algorithms',
    color: 'success',
    stats: '1,923 found'
  },
  {
    icon: 'mdi-account-group',
    title: 'Community Network',
    description: 'Connect with local community members to increase recovery chances',
    color: 'primary',
    stats: '15K+ members'
  },
  {
    icon: 'mdi-shield-check',
    title: 'Secure Verification',
    description: 'Identity verification and secure communication to prevent fraud',
    color: 'warning',
    stats: '99.9% secure'
  }
]

const stats = [
  { number: '12,847', label: 'Items Reported', icon: 'mdi-file-document-outline' },
  { number: '9,234', label: 'Successfully Reunited', icon: 'mdi-heart-outline' },
  { number: '15,000+', label: 'Active Members', icon: 'mdi-account-group-outline' },
  { number: '98%', label: 'Success Rate', icon: 'mdi-chart-line' }
]

onMounted(() => {
  fetchLandingData()
  
  setTimeout(() => {
    isVisible.value = true
  }, 100)
  
  // Rotating placeholder animation
  setInterval(() => {
    placeholderIndex.value = (placeholderIndex.value + 1) % placeholders.length
  }, 3500)
  
  // Feature carousel
  setInterval(() => {
    currentFeature.value = (currentFeature.value + 1) % features.length
  }, 4000)
  
  // Typewriter effect for hero subtitle
  const subtitle = "Reuniting people with their precious belongings through community and technology"
  let i = 0
  const typeWriter = () => {
    if (i < subtitle.length) {
      typedText.value += subtitle.charAt(i)
      i++
      setTimeout(typeWriter, 50)
    }
  }
  setTimeout(typeWriter, 1500)
})

const scrollToSection = (sectionId: string) => {
  document.querySelector(`#${sectionId}`)?.scrollIntoView({ behavior: 'smooth' })
}

const openGithub = () => window.open('https://github.com', '_blank', 'noopener,noreferrer')
</script>

<template>
  <OuterLayoutWrapper>
    <template #content>
      <!-- Loading State -->
      <v-container v-if="loading" class="loading-wrapper">
        <div class="loading-content">
          <div class="search-animation">
            <v-icon size="60" color="primary" class="search-icon">mdi-magnify</v-icon>
            <div class="pulse-rings">
              <div class="pulse-ring"></div>
              <div class="pulse-ring delay-1"></div>
              <div class="pulse-ring delay-2"></div>
            </div>
          </div>
          <h2 class="loading-text">Searching for your content...</h2>
          <div class="loading-bar">
            <div class="loading-progress"></div>
          </div>
        </div>
      </v-container>

      <!-- Error State -->
      <v-alert v-else-if="error" type="error" class="error-state" rounded="lg">
        <template #prepend>
          <v-icon size="large">mdi-alert-circle</v-icon>
        </template>
        <div>
          <h3 class="text-h6 mb-2">Oops! Something went missing</h3>
          <p>{{ error }}</p>
        </div>
      </v-alert>

      <!-- Main Content -->
      <div v-else-if="data" class="landing-page">
        
        <!-- Hero Section -->
        <section class="hero-section">
          <div class="hero-background">
            <!-- Animated particles -->
            <div class="particles">
              <div v-for="i in 20" :key="`particle-${i}`" class="particle" 
                :style="{ 
                  left: Math.random() * 100 + '%', 
                  animationDelay: Math.random() * 20 + 's',
                  animationDuration: (15 + Math.random() * 10) + 's'
                }">
              </div>
            </div>
            
            <!-- Gradient mesh -->
            <div class="gradient-mesh">
              <div class="mesh-gradient mesh-1"></div>
              <div class="mesh-gradient mesh-2"></div>
              <div class="mesh-gradient mesh-3"></div>
            </div>
          </div>

          <v-container class="hero-container" fluid>
            <v-row align="center" justify="center" class="hero-row">
              <v-col cols="12" lg="10" xl="8">
                <div class="hero-content">
                  
                  <!-- Badge -->
                  <div class="hero-badge" :class="{ 'visible': isVisible }">
                    <v-chip size="large" rounded="xl" color="primary" variant="tonal">
                      <v-icon start>mdi-trending-up</v-icon>
                      #1 Lost & Found Platform
                    </v-chip>
                  </div>

                  <!-- Main Title -->
                  <div class="hero-title-section">
                    <h1 class="hero-title" :class="{ 'visible': isVisible }">
                      <span class="title-highlight">Lost Something?</span><br>
                      <span class="title-main">We'll Help You Find It</span>
                    </h1>
                    
                    <div class="title-decoration">
                      <div class="decoration-line"></div>
                      <v-icon color="primary" size="24">mdi-diamond</v-icon>
                      <div class="decoration-line"></div>
                    </div>
                  </div>

                  <!-- Animated Subtitle -->
                  <p class="hero-subtitle" :class="{ 'visible': isVisible }">
                    {{ typedText }}<span class="cursor">|</span>
                  </p>

                  <!-- Interactive Search Preview -->
                  <div class="search-preview" :class="{ 'visible': isVisible }">
                    <div class="search-container">
                      <v-text-field
                        v-model="searchText"
                        :placeholder="placeholders[placeholderIndex]"
                        prepend-inner-icon="mdi-magnify"
                        append-inner-icon="mdi-microphone"
                        variant="solo"
                        rounded="xl"
                        hide-details
                        class="search-input"
                        readonly
                      >
                        <template #append>
                          <v-btn 
                            color="primary" 
                            rounded="xl" 
                            class="search-btn"
                          >
                            Search
                          </v-btn>
                        </template>
                      </v-text-field>
                      
                      <!-- Search suggestions -->
                      <div class="search-suggestions">
                        <v-chip-group>
                          <v-chip size="small" variant="outlined" rounded="xl">
                            <v-icon start size="16">mdi-cellphone</v-icon>
                            Phone
                          </v-chip>
                          <v-chip size="small" variant="outlined" rounded="xl">
                            <v-icon start size="16">mdi-key</v-icon>
                            Keys
                          </v-chip>
                          <v-chip size="small" variant="outlined" rounded="xl">
                            <v-icon start size="16">mdi-wallet</v-icon>
                            Wallet
                          </v-chip>
                        </v-chip-group>
                      </div>
                    </div>
                  </div>

                  <!-- CTA Buttons -->
                  <div class="cta-section" :class="{ 'visible': isVisible }">
                    <v-btn
                      @click="scrollToSection('features')"
                      size="x-large"
                      rounded="xl"
                      color="primary"
                      class="cta-primary"
                    >
                      <v-icon start>mdi-rocket-launch</v-icon>
                      Get Started
                      <template #append>
                        <v-icon>mdi-arrow-right</v-icon>
                      </template>
                    </v-btn>

                    <v-btn
                      @click="scrollToSection('how-it-works')"
                      size="x-large"
                      rounded="xl"
                      variant="outlined"
                      class="cta-secondary"
                    >
                      <v-icon start>mdi-play-circle</v-icon>
                      How It Works
                    </v-btn>
                  </div>

                  <!-- Stats Preview -->
                  <div class="stats-preview" :class="{ 'visible': isVisible }">
                    <v-row class="stats-row">
                      <v-col v-for="stat in stats.slice(0, 3)" :key="stat.label" cols="4">
                        <div class="stat-item">
                          <div class="stat-number">{{ stat.number }}</div>
                          <div class="stat-label">{{ stat.label }}</div>
                        </div>
                      </v-col>
                    </v-row>
                  </div>

                </div>
              </v-col>
            </v-row>
          </v-container>

          <!-- Scroll indicator -->
          <div class="scroll-indicator" :class="{ 'visible': isVisible }">
            <v-btn 
              @click="scrollToSection('features')" 
              icon 
              variant="text" 
              class="scroll-btn"
            >
              <v-icon class="bounce">mdi-chevron-down</v-icon>
            </v-btn>
          </div>
        </section>

        <!-- Features Section -->
        <section id="features" class="features-section">
          <v-container>
            <div class="section-header">
              <div class="section-badge">
                <v-chip color="primary" variant="tonal" rounded="xl">
                  <v-icon start>mdi-star</v-icon>
                  Features
                </v-chip>
              </div>
              <h2 class="section-title">Powerful Tools for Recovery</h2>
              <p class="section-subtitle">
                Everything you need to report, search, and recover lost items efficiently
              </p>
            </div>

            <!-- Feature Cards Grid -->
            <v-row class="features-grid">
              <v-col v-for="(feature, index) in features" :key="feature.title" 
                cols="12" sm="6" lg="3">
                <v-card 
                  class="feature-card" 
                  :class="{ 'featured': index === currentFeature }"
                  rounded="xl" 
                  elevation="0"
                >
                  <v-card-text class="feature-content">
                    <div class="feature-icon-container">
                      <div class="feature-icon-wrapper" :class="`color-${feature.color}`">
                        <v-icon :color="feature.color" size="32">{{ feature.icon }}</v-icon>
                      </div>
                      <div class="feature-stats">{{ feature.stats }}</div>
                    </div>
                    
                    <h3 class="feature-title">{{ feature.title }}</h3>
                    <p class="feature-description">{{ feature.description }}</p>
                    
                    <v-btn 
                      variant="text" 
                      :color="feature.color"
                      class="feature-btn"
                      rounded="lg"
                    >
                      Learn More
                      <v-icon end>mdi-arrow-right</v-icon>
                    </v-btn>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>
          </v-container>
        </section>

        <!-- How It Works Section -->
        <section id="how-it-works" class="how-it-works-section">
          <v-container>
            <div class="section-header">
              <div class="section-badge">
                <v-chip color="success" variant="tonal" rounded="xl">
                  <v-icon start>mdi-lightbulb</v-icon>
                  Process
                </v-chip>
              </div>
              <h2 class="section-title">How It Works</h2>
              <p class="section-subtitle">
                Simple steps to reunite with your belongings
              </p>
            </div>

            <div class="process-flow">
              <div class="process-step">
                <div class="step-number">1</div>
                <div class="step-content">
                  <h3>Report Your Loss</h3>
                  <p>Provide details about your lost item including photos, location, and description</p>
                </div>
                <div class="step-connector"></div>
              </div>

              <div class="process-step">
                <div class="step-number">2</div>
                <div class="step-content">
                  <h3>Smart Matching</h3>
                  <p>Our AI searches through found items and notifies potential matches</p>
                </div>
                <div class="step-connector"></div>
              </div>

              <div class="process-step">
                <div class="step-number">3</div>
                <div class="step-content">
                  <h3>Secure Reunion</h3>
                  <p>Connect safely with finders through our verified communication system</p>
                </div>
              </div>
            </div>
          </v-container>
        </section>

        <!-- CTA Section -->
        <section class="final-cta-section">
          <v-container>
            <div class="cta-content">
              <div class="cta-icon">
                <v-icon size="64" color="primary">mdi-heart</v-icon>
              </div>
              <h2 class="cta-title">Ready to Find What's Lost?</h2>
              <p class="cta-description">
                Join thousands of people who have successfully recovered their belongings
              </p>
              <div class="cta-buttons">
                <v-btn 
                  size="x-large" 
                  rounded="xl" 
                  color="primary"
                  class="cta-main"
                >
                  Start Your Search
                  <v-icon end>mdi-magnify</v-icon>
                </v-btn>
                <v-btn 
                  @click="openGithub"
                  size="large" 
                  rounded="xl" 
                  variant="outlined"
                  class="cta-github"
                >
                  <v-icon start>mdi-github</v-icon>
                  View Source
                </v-btn>
              </div>
            </div>
          </v-container>
        </section>

      </div>
    </template>
  </OuterLayoutWrapper>
</template>