<template>
  <v-footer
    v-if="config?.showFooter && footerConfig"
    app
    class="professional-footer"
    :class="{ 'dark-mode': isDark }"
  >
    <!-- Decorative top border -->
    <div class="footer-border"></div>
    
    <!-- Background gradient overlay -->
    <div class="footer-background">
      <div class="gradient-orb orb-1"></div>
      <div class="gradient-orb orb-2"></div>
      <div class="floating-elements">
        <div v-for="i in 6" :key="`float-${i}`" class="floating-element" 
          :style="{ 
            left: Math.random() * 100 + '%',
            animationDelay: Math.random() * 10 + 's'
          }">
          <v-icon size="12" :color="isDark ? 'grey-lighten-2' : 'grey-lighten-1'" opacity="0.3">
            {{ floatingIcons[Math.floor(Math.random() * floatingIcons.length)] }}
          </v-icon>
        </div>
      </div>
    </div>

    <v-container class="footer-content">
      <!-- Main Footer Content -->
      <v-row class="main-footer-section" align="start" justify="space-between">
        
        <!-- Company Info Section -->
        <v-col cols="12" lg="4" md="6">
          <div class="company-section">
            <div class="company-header">
              <div class="company-icon-wrapper">
                <v-icon 
                  :icon="footerConfig.icon" 
                  size="48" 
                  color="primary"
                  class="company-icon"
                />
                <div class="icon-glow"></div>
              </div>
              
              <div class="company-info">
                <h3 class="company-name">
                  {{ footerConfig.companyName }}
                </h3>
                <p class="company-tagline">
                  {{ footerConfig.tagline }}
                </p>
              </div>
            </div>
            
            <p class="company-description">
              Connecting communities to reunite people with their precious belongings through innovative technology and human compassion.
            </p>
            
            <!-- Social Links -->
            <div class="social-section">
              <h4 class="social-title">Follow Us</h4>
              <div class="social-links">
                <v-btn
                  v-for="social in footerConfig.socialLinks"
                  :key="social.platform"
                  :aria-label="social.label"
                  class="social-btn"
                  :color="getSocialColor(social.platform)"
                  icon
                  variant="flat"
                  size="large"
                  rounded="lg"
                  @click="openLink(social.url)"
                >
                  <v-icon :icon="social.icon" />
                  <v-tooltip activator="parent" location="top">
                    {{ social.label }}
                  </v-tooltip>
                </v-btn>
              </div>
            </div>
          </div>
        </v-col>

        <!-- Quick Links Section -->
        <v-col cols="12" sm="6" lg="2" md="3">
          <div class="links-section">
            <h4 class="section-title">Quick Links</h4>
            <ul class="footer-links">
              <li><a href="#features" @click="scrollTo('features')">Features</a></li>
              <li><a href="#how-it-works" @click="scrollTo('how-it-works')">How It Works</a></li>
              <li><a href="#about">About Us</a></li>
              <li><a href="#contact">Contact</a></li>
              <li><a href="#faq">FAQ</a></li>
            </ul>
          </div>
        </v-col>

        <!-- Support Section -->
        <v-col cols="12" sm="6" lg="2" md="3">
          <div class="links-section">
            <h4 class="section-title">Support</h4>
            <ul class="footer-links">
              <li><a href="#help">Help Center</a></li>
              <li><a href="#privacy">Privacy Policy</a></li>
              <li><a href="#terms">Terms of Service</a></li>
              <li><a href="#security">Security</a></li>
              <li><a href="#report">Report Issue</a></li>
            </ul>
          </div>
        </v-col>

        <!-- Newsletter Section -->
        <v-col cols="12" lg="4">
          <div class="newsletter-section">
            <h4 class="section-title">Stay Updated</h4>
            <p class="newsletter-description">
              Get notified about new features and recovery success stories in your area.
            </p>
            
            <div class="newsletter-form">
              <v-text-field
                v-model="newsletterEmail"
                placeholder="Enter your email"
                variant="outlined"
                rounded="lg"
                hide-details
                class="newsletter-input"
                :prepend-inner-icon="'mdi-email-outline'"
              >
                <template #append-inner>
                  <v-btn
                    color="primary"
                    variant="flat"
                    rounded="lg"
                    class="newsletter-btn"
                    @click="subscribeNewsletter"
                  >
                    <v-icon>mdi-arrow-right</v-icon>
                  </v-btn>
                </template>
              </v-text-field>
            </div>
            
            <div class="trust-badges">
              <div class="trust-badge">
                <v-icon color="success" size="16">mdi-shield-check</v-icon>
                <span>Secure & Private</span>
              </div>
              <div class="trust-badge">
                <v-icon color="primary" size="16">mdi-email-lock</v-icon>
                <span>No Spam</span>
              </div>
            </div>
          </div>
        </v-col>
      </v-row>

      <!-- Thesis Team Section -->
      <template v-if="footerConfig.thesisTeam?.enabled">
        <div class="divider-section">
          <v-divider class="custom-divider" />
        </div>

        <v-row class="thesis-section">
          <v-col cols="12">
            <div class="thesis-header">
              <div class="thesis-badge">
                <v-chip color="primary" variant="tonal" rounded="xl" size="large">
                  <v-icon start>mdi-school</v-icon>
                  {{ footerConfig.thesisTeam.title }}
                </v-chip>
              </div>
              <p class="thesis-subtitle">
                {{ footerConfig.thesisTeam.subtitle }}
              </p>
            </div>

            <v-row justify="center" class="team-members">
              <v-col
                v-for="(member, index) in footerConfig.thesisTeam.members"
                :key="member.name"
                cols="12"
                sm="6"
                lg="3"
                class="member-col"
              >
                <div class="team-member" :style="{ animationDelay: (index * 0.1) + 's' }">
                  <div class="member-avatar-container">
                    <v-avatar
                      :image="member.avatar"
                      size="64"
                      class="member-avatar"
                      :color="member.avatar ? undefined : 'primary'"
                    >
                      <v-icon
                        v-if="!member.avatar"
                        icon="mdi-account"
                        size="32"
                      />
                    </v-avatar>
                    <div class="avatar-ring"></div>
                  </div>

                  <div class="member-info">
                    <h5 class="member-name">{{ member.name }}</h5>
                    <p class="member-role">{{ member.role }}</p>
                  </div>
                </div>
              </v-col>
            </v-row>
          </v-col>
        </v-row>
      </template>

      <!-- Bottom Section -->
      <div class="divider-section">
        <v-divider class="custom-divider" />
      </div>

      <v-row class="bottom-section" align="center">
        <v-col cols="12" md="6">
          <div class="copyright-section">
            <p class="copyright-text">
              {{ currentYear }} © {{ footerConfig.copyright }}. All rights reserved.
            </p>
            <div class="legal-links">
              <a href="#privacy">Privacy</a>
              <span class="separator">•</span>
              <a href="#terms">Terms</a>
              <span class="separator">•</span>
              <a href="#cookies">Cookies</a>
            </div>
          </div>
        </v-col>

        <v-col cols="12" md="6" class="text-md-end text-center">
          <div class="tech-section">
            <div class="tech-stack">
              <span class="built-with-text">Built with</span>
              <div class="technologies">
                <template
                  v-for="(tech, index) in footerConfig.technologies"
                  :key="tech.name"
                >
                  <div class="tech-item">
                    <v-icon
                      :color="tech.color"
                      :icon="tech.icon"
                      size="18"
                      class="tech-icon"
                    />
                    <span class="tech-name">{{ tech.name }}</span>
                  </div>
                  <span v-if="index < footerConfig.technologies.length - 1" class="tech-separator">
                    +
                  </span>
                </template>
              </div>
            </div>
          </div>
        </v-col>
      </v-row>
    </v-container>
  </v-footer>
</template>

<script lang="ts" setup>
import type { UIConfig } from "@/controller/landingController";
import { computed, ref } from "vue";
import { useTheme } from 'vuetify'
import '@/styles/outerfooter.css';


interface Props {
  config?: UIConfig | null;
}

const props = defineProps<Props>();
const theme = useTheme()
const isDark = computed(() => theme.global.current.value.dark)

const footerConfig = computed(() => props.config?.footer);
const currentYear = computed(() => new Date().getFullYear());
const newsletterEmail = ref('')

const floatingIcons = [
  'mdi-magnify',
  'mdi-key',
  'mdi-cellphone',
  'mdi-wallet',
  'mdi-heart',
  'mdi-star'
]

function openLink(url: string) {
  window.open(url, "_blank", "noopener,noreferrer");
}

function scrollTo(elementId: string) {
  document.querySelector(`#${elementId}`)?.scrollIntoView({ 
    behavior: 'smooth' 
  });
}

function subscribeNewsletter() {
  if (newsletterEmail.value) {
    // Handle newsletter subscription
    console.log('Newsletter subscription:', newsletterEmail.value);
    newsletterEmail.value = '';
  }
}

function getSocialColor(platform: string) {
  const colors: Record<string, string> = {
    facebook: '#1877f2',
    twitter: '#1da1f2', 
    instagram: '#e4405f',
    linkedin: '#0077b5',
    github: '#333',
    youtube: '#ff0000'
  };
  return colors[platform.toLowerCase()] || 'primary';
}
</script>

