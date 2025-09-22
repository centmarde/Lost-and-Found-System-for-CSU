<script lang="ts" setup>
import type { CTAButton, NavigationItem, UIConfig } from '@/controller/landingController'
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useTheme } from '@/composables/useTheme'
import { useDisplay } from 'vuetify'

interface Props {
  config?: UIConfig | null
}

const props = defineProps<Props>()
const router = useRouter()

// Responsive breakpoints
const { mobile } = useDisplay()

// Mobile drawer state
const drawer = ref(false)

// Scroll state for navbar styling
const isScrolled = ref(false)

// Theme management
const { toggleTheme: handleToggleTheme, getCurrentTheme, isLoadingTheme } = useTheme()

// Scroll detection
const handleScroll = () => {
  isScrolled.value = window.scrollY > 20
  
  // Close mobile drawer when scrolling down
  if (mobile.value && drawer.value) {
    drawer.value = false
  }
}

onMounted(() => {
  window.addEventListener('scroll', handleScroll, { passive: true })
  handleScroll() // Check initial scroll position
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})

const navbarConfig = computed(() => props.config?.navbar)

// Theme toggle computed properties
const currentTheme = computed(() => getCurrentTheme())
const themeIcon = computed(() => {
  return currentTheme.value === 'dark' ? 'mdi-white-balance-sunny' : 'mdi-weather-night'
})
const themeTooltip = computed(() => {
  return `Switch to ${currentTheme.value === 'dark' ? 'light' : 'dark'} mode`
})

function toggleTheme() {
  handleToggleTheme()
}

function handleNavigation(item: NavigationItem) {
  drawer.value = false

  switch (item.action) {
    case 'scroll': {
      scrollToSection(item.target)
      break
    }
    case 'navigate': {
      router.push(item.target)
      break
    }
    case 'external': {
      window.open(item.target, '_blank', 'noopener,noreferrer')
      break
    }
  }
}

function handleCTAAction(button: CTAButton) {
  drawer.value = false

  switch (button.action) {
    case 'scroll': {
      scrollToSection(button.target)
      break
    }
    case 'navigate': {
      router.push(button.target)
      break
    }
    case 'external': {
      window.open(button.target, '_blank', 'noopener,noreferrer')
      break
    }
  }
}

function scrollToSection(sectionId: string) {
  const element = document.querySelector(`#${sectionId}`)
  if (element) {
    element.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
  }
}
</script>

<template>
  <div v-if="config?.showNavbar && navbarConfig">
    <!-- Modern App Bar -->
    <v-app-bar
      app
      :elevation="isScrolled ? 8 : 0"
      density="comfortable"
      flat
      scroll-behavior="elevate"
      scroll-threshold="20"
      :class="[
        'navbar-modern',
        isScrolled ? 'navbar-scrolled' : 'navbar-transparent'
      ]"
    >
      <!-- Logo and Brand Section -->
      <template #prepend>
        <div class="d-flex align-center">
          <!-- Logo/Icon -->
          <v-avatar
            v-if="!navbarConfig.logo?.src"
            color="primary"
            size="42"
            class="me-3"
          >
            <v-icon :icon="navbarConfig.icon || 'mdi-magnify'" size="24" />
          </v-avatar>
          
          <v-img
            v-else
            :src="navbarConfig.logo.src"
            :alt="navbarConfig.logo.alt"
            :width="navbarConfig.logo.width || 42"
            :height="navbarConfig.logo.height || 42"
            class="me-3"
            contain
          >
            <template #error>
              <v-avatar color="primary" size="42" class="me-3">
                <v-icon :icon="navbarConfig.icon || 'mdi-magnify'" size="24" />
              </v-avatar>
            </template>
          </v-img>

          <!-- Brand Text -->
          <div class="brand-text">
            <h1 class="text-h6 font-weight-bold mb-0">
              {{ navbarConfig.title }}
            </h1>
            <p class="text-caption mb-0 brand-subtitle">
              Digital Solutions
            </p>
          </div>
        </div>
      </template>

      <v-spacer />

      <!-- Desktop Navigation -->
      <template #append>
        <div class="d-none d-lg-flex align-center ga-2">
          <!-- Navigation Links -->
          <v-btn
            v-for="item in navbarConfig.navigationItems"
            :key="item.label"
            variant="text"
            size="default"
            rounded="pill"
            class="nav-link px-4"
            @click="handleNavigation(item)"
          >
            {{ item.label }}
          </v-btn>

          <!-- Theme Toggle -->
          <v-btn
            :icon="themeIcon"
            variant="text"
            size="default"
            rounded="pill"
            class="theme-toggle mx-2"
            :loading="isLoadingTheme"
            @click="toggleTheme"
          >
            <v-icon :icon="themeIcon" />
            <v-tooltip activator="parent" location="bottom">
              {{ themeTooltip }}
            </v-tooltip>
          </v-btn>

          <!-- CTA Button -->
          <v-btn
            v-if="navbarConfig.ctaButton"
            color="primary"
            variant="elevated"
            size="default"
            rounded="pill"
            class="cta-button px-6 ml-2"
            @click="handleCTAAction(navbarConfig.ctaButton)"
          >
            <template #prepend>
              <v-icon size="18">mdi-rocket-launch</v-icon>
            </template>
            {{ navbarConfig.ctaButton.label }}
          </v-btn>
        </div>

        <!-- Mobile Menu Button -->
        <v-btn
          icon="mdi-menu"
          variant="text"
          size="default"
          class="d-lg-none mobile-menu-btn"
          @click="drawer = !drawer"
        >
          <v-icon>mdi-menu</v-icon>
        </v-btn>
      </template>
    </v-app-bar>

    <!-- Mobile Navigation Drawer -->
    <v-navigation-drawer
      v-model="drawer"
      location="end"
      temporary
      width="320"
      class="d-lg-none mobile-drawer"
      :scrim="true"
    >
      <!-- Mobile Header -->
      <div class="mobile-header pa-6">
        <div class="d-flex align-center mb-4">
          <v-avatar
            v-if="!navbarConfig.logo?.src"
            color="primary"
            size="48"
            class="me-3"
          >
            <v-icon :icon="navbarConfig.icon || 'mdi-magnify'" size="28" />
          </v-avatar>
          
          <v-img
            v-else
            :src="navbarConfig.logo.src"
            :alt="navbarConfig.logo.alt"
            :width="48"
            :height="48"
            class="me-3"
            contain
          >
            <template #error>
              <v-avatar color="primary" size="48" class="me-3">
                <v-icon :icon="navbarConfig.icon || 'mdi-magnify'" size="28" />
              </v-avatar>
            </template>
          </v-img>

          <div>
            <h2 class="text-h6 font-weight-bold">
              {{ navbarConfig.title }}
            </h2>
            <p class="text-caption mb-0">
              Digital Solutions
            </p>
          </div>
        </div>
      </div>

      <v-divider />

      <!-- Mobile Navigation Items -->
      <v-list class="pa-4" nav>
        <!-- Navigation Links -->
        <v-list-item
          v-for="item in navbarConfig.navigationItems"
          :key="item.label"
          :title="item.label"
          rounded="xl"
          class="mb-2 mobile-nav-item"
          @click="handleNavigation(item)"
        >
          <template #prepend>
            <v-icon size="20">mdi-chevron-right</v-icon>
          </template>
        </v-list-item>

        <v-divider class="my-4" />

        <!-- Theme Toggle -->
        <v-list-item
          :title="themeTooltip"
          rounded="xl"
          class="mb-2 mobile-nav-item"
          @click="toggleTheme"
        >
          <template #prepend>
            <v-icon :icon="themeIcon" size="20" />
          </template>
        </v-list-item>

        <!-- CTA Button -->
        <div v-if="navbarConfig.ctaButton" class="pa-2 mt-4">
          <v-btn
            color="primary"
            variant="elevated"
            size="large"
            rounded="xl"
            block
            class="mobile-cta"
            @click="handleCTAAction(navbarConfig.ctaButton)"
          >
            <template #prepend>
              <v-icon size="20">mdi-rocket-launch</v-icon>
            </template>
            {{ navbarConfig.ctaButton.label }}
          </v-btn>
        </div>
      </v-list>
    </v-navigation-drawer>
  </div>
</template>

<style scoped>
/* Modern Navbar Styling */
.navbar-modern {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}

.navbar-transparent {
  background: rgba(var(--v-theme-surface), 0.8) !important;
  border-bottom: 1px solid rgba(var(--v-theme-outline), 0.12);
}

.navbar-scrolled {
  background: rgb(var(--v-theme-surface)) !important;
  border-bottom: 1px solid rgba(var(--v-theme-outline), 0.2);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

/* Brand Styling */
.brand-text h1 {
  line-height: 1.2;
}

.brand-subtitle {
  opacity: 0.7;
  line-height: 1;
}

/* Navigation Links */
.nav-link {
  font-weight: 500;
  position: relative;
  transition: all 0.3s ease;
}

.nav-link:hover {
  background: rgba(var(--v-theme-primary), 0.08);
  transform: translateY(-1px);
}

/* Theme Toggle */
.theme-toggle {
  transition: all 0.3s ease;
}

.theme-toggle:hover {
  background: rgba(var(--v-theme-primary), 0.08);
  transform: rotate(180deg);
}

/* CTA Button */
.cta-button {
  font-weight: 600;
  box-shadow: 0 4px 12px rgba(var(--v-theme-primary), 0.3);
  transition: all 0.3s ease;
}

.cta-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(var(--v-theme-primary), 0.4);
}

/* Mobile Menu Button */
.mobile-menu-btn {
  transition: all 0.3s ease;
}

.mobile-menu-btn:hover {
  background: rgba(var(--v-theme-primary), 0.08);
  transform: scale(1.05);
}

/* Mobile Drawer */
.mobile-drawer {
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}

.mobile-header {
  background: linear-gradient(135deg, 
    rgba(var(--v-theme-primary), 0.1) 0%, 
    rgba(var(--v-theme-surface), 1) 100%);
  border-bottom: 1px solid rgba(var(--v-theme-outline), 0.12);
}

/* Mobile Navigation Items */
.mobile-nav-item {
  transition: all 0.3s ease;
  font-weight: 500;
}

.mobile-nav-item:hover {
  background: rgba(var(--v-theme-primary), 0.08);
  transform: translateX(4px);
}

/* Mobile CTA */
.mobile-cta {
  font-weight: 600;
  box-shadow: 0 4px 12px rgba(var(--v-theme-primary), 0.3);
  transition: all 0.3s ease;
}

.mobile-cta:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(var(--v-theme-primary), 0.4);
}

/* Responsive adjustments */
@media (max-width: 1264px) {
  .brand-text h1 {
    font-size: 1.1rem;
  }
  
  .brand-subtitle {
    font-size: 0.75rem;
  }
}

/* Animation for drawer */
.v-navigation-drawer--temporary {
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
}

/* Ensure proper contrast in all themes */
.v-app-bar {
  color: rgb(var(--v-theme-on-surface));
}

/* Smooth transitions for theme changes */
* {
  transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease;
}
</style>