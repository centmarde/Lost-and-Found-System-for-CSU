<script lang="ts" setup>
import { onMounted, computed, ref } from "vue";
import { useRouter } from "vue-router";
import { useLandingController } from "@/controller/landingController";
import { useTheme } from "vuetify";
import OuterLayoutWrapper from "@/layouts/OuterLayoutWrapper.vue";
import ItemsDisplay from "@/components/common/ItemsDisplay.vue";

// Import composables for items functionality
import { useItems } from "@/pages/admin/components/composables/useItem";
import { useFilterSortPagination } from "@/utils/helpers";

// Import external CSS
import "@/styles/landing.css";

const { data, loading, error, fetchLandingData } = useLandingController();
const theme = useTheme();
const isDark = computed(() => theme.global.current.value.dark);
const router = useRouter();

// Authentication dialog state
const showAuthDialog = ref(false);

// Guest user for items fetching (no authentication required)
const guestUser = ref(null);

// Items functionality for guest users
const { items, itemsLoading, fetchItems } = useItems(
  computed(() => false), // isCurrentUserAdmin is false for guests
  guestUser
);

// Empty state config for guest users
const emptyStateConfig = {
  sectionTitle: "Available Items",
  noItemsTitle: "No items available",
  noItemsMessage: "Check back later for new lost and found items."
};

// Filter, Sort, and Pagination for guest users
const {
  page,
  itemsPerPage,
  sortBy,
  selectedMonth,
  selectedDay,
  searchQuery,
  statusFilter,
  availableMonths,
  availableDays,
  filteredAndSortedItems,
  paginatedItems,
  totalPages,
  formatMonthLabel,
  formatDayLabel,
} = useFilterSortPagination(items, 12);

// View mode state for guest users
const viewMode = ref('grid');

// Animation states
const isVisible = ref(false);
const searchText = ref("");
const placeholderIndex = ref(0);
const typedText = ref("");
const currentFeature = ref(0);

const placeholders = [
  "Lost your student ID?",
  "Missing wallet?",
  "Can't find your laptop?",
  "Lost your notes?",
  "Missing phone?",
];

onMounted(() => {
  fetchLandingData();
  fetchItems(); // Fetch items for guest users

  setTimeout(() => {
    isVisible.value = true;
  }, 100);

  // Rotating placeholder animation
  setInterval(() => {
    placeholderIndex.value = (placeholderIndex.value + 1) % placeholders.length;
  }, 3500);

  // Typewriter effect for hero subtitle
  const subtitle =
    "Helping CSU students reunite with their lost belongings through technology and community";
  let i = 0;
  const typeWriter = () => {
    if (i < subtitle.length) {
      typedText.value += subtitle.charAt(i);
      i++;
      setTimeout(typeWriter, 50);
    }
  };
  setTimeout(typeWriter, 1500);
});

// Helper functions for guest user interactions
const handleGuestContact = (item: any) => {
  // Show authentication dialog instead of allowing direct contact
  showAuthDialog.value = true;
};

// Navigation functions
const redirectToAuth = () => {
  showAuthDialog.value = false;
  router.push('/auth');
};

const closeAuthDialog = () => {
  showAuthDialog.value = false;
};

const clearAllFilters = () => {
  selectedMonth.value = 'all';
  selectedDay.value = 'all';
  searchQuery.value = '';
  statusFilter.value = 'active';
};

// Dummy functions for admin-only actions (not used by guests)
const handleOpenConversations = () => {
  // Not applicable for guest users
};

const markAsClaimed = () => {
  // Not applicable for guest users
};

const updatingItems = ref(new Set<number>());
</script>

<template>
  <OuterLayoutWrapper>
    <template #content>
      <!-- Loading State -->
      <v-container v-if="loading" class="loading-wrapper">
        <div class="loading-content">
          <div class="search-animation">
            <v-icon size="60" color="primary" class="search-icon"
              >mdi-magnify</v-icon
            >
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
              <div
                v-for="i in 20"
                :key="`particle-${i}`"
                class="particle"
                :style="{
                  left: Math.random() * 100 + '%',
                  animationDelay: Math.random() * 20 + 's',
                  animationDuration: 15 + Math.random() * 10 + 's',
                }"
              ></div>
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


                  <!-- Main Title -->
                  <div class="hero-title-section">
                    <h1 class="hero-title" :class="{ visible: isVisible }">
                      <span class="title-highlight">Lost Something?</span><br />
                      <span class="title-main">We'll Help You Find It</span>
                    </h1>

                    <div class="title-decoration">
                      <div class="decoration-line"></div>
                      <v-icon color="primary" size="24">mdi-diamond</v-icon>
                      <div class="decoration-line"></div>
                    </div>
                  </div>

                  <!-- Animated Subtitle -->
                  <p class="hero-subtitle" :class="{ visible: isVisible }">
                    {{ typedText }}<span class="cursor">|</span>
                  </p>

                  <!-- Interactive Search Preview -->
                  <div class="search-preview" :class="{ visible: isVisible }">
                    <!-- <div class="search-container">
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
                          <v-chip size="small" variant="outlined" rounded="xl">
                            <v-icon start size="16">mdi-laptop</v-icon>
                            Laptop
                          </v-chip>
                          <v-chip size="small" variant="outlined" rounded="xl">
                            <v-icon start size="16">mdi-notebook</v-icon>
                            Notebook
                          </v-chip>

                          <v-chip size="small" variant="outlined" rounded="xl">
                            <v-icon start size="16">mdi-dots-horizontal</v-icon>
                            Others
                          </v-chip>
                        </v-chip-group>
                      </div>
                    </div> -->
                  </div>
                </div>
              </v-col>
            </v-row>
          </v-container>
        </section>

        <!-- Items Section for Guest Users -->
        <section class="items-section py-12">
          <v-container fluid>
            <v-row class="mb-6">
              <v-col cols="12">
                <div class="text-center mb-8">
                  <h2 class="text-h3 font-weight-bold text-primary mb-2">
                    Browse Lost & Found Items
                  </h2>
                  <p class="text-h6 text-grey-darken-1">
                    See what's been found and contact owners as a guest
                  </p>
                </div>
              </v-col>
            </v-row>

            <v-row class="mb-4">
              <v-col cols="12">
                <v-card elevation="1" class="pa-4">
                  <v-card-title class="text-h6 mb-4">Filter Items</v-card-title>
                  <v-row>
                    <v-col cols="12" sm="6" md="3">
                      <v-text-field
                        v-model="searchQuery"
                        prepend-inner-icon="mdi-magnify"
                        label="Search items..."
                        variant="outlined"
                        density="compact"
                        hide-details
                      />
                    </v-col>
                    <v-col cols="12" sm="6" md="3">
                      <v-select
                        v-model="sortBy"
                        :items="[
                          { text: 'Newest First', value: 'newest' },
                          { text: 'Oldest First', value: 'oldest' },
                          { text: 'Title A-Z', value: 'title-asc' },
                          { text: 'Title Z-A', value: 'title-desc' }
                        ]"
                        label="Sort by"
                        variant="outlined"
                        density="compact"
                        hide-details
                        item-title="text"
                        item-value="value"
                      />
                    </v-col>
                    <v-col cols="12" sm="6" md="3">
                      <v-select
                        v-model="statusFilter"
                        :items="[
                          { text: 'Active Items', value: 'active' },
                          { text: 'All Items', value: 'all' }
                        ]"
                        label="Status"
                        variant="outlined"
                        density="compact"
                        hide-details
                        item-title="text"
                        item-value="value"
                      />
                    </v-col>
                    <v-col cols="12" sm="6" md="3">
                      <v-btn
                        color="primary"
                        variant="outlined"
                        prepend-icon="mdi-filter-remove"
                        @click="clearAllFilters"
                        block
                      >
                        Clear Filters
                      </v-btn>
                    </v-col>
                  </v-row>
                </v-card>
              </v-col>
            </v-row>

            <v-row>
              <v-col cols="12">
                <ItemsDisplay
                  :items="items"
                  :filtered-and-sorted-items="filteredAndSortedItems"
                  :paginated-items="paginatedItems"
                  :items-loading="itemsLoading"
                  :is-current-user-admin="false"
                  :is-guest-user="true"
                  :updating-items="updatingItems"
                  :view-mode="viewMode"
                  :empty-state-config="emptyStateConfig"
                  v-model:page="page"
                  :items-per-page="itemsPerPage"
                  :total-pages="totalPages"
                  @open-conversations="handleOpenConversations"
                  @mark-as-claimed="markAsClaimed"
                  @contact="handleGuestContact"
                  @guest-contact="handleGuestContact"
                  @fetch-items="fetchItems"
                  @clear-all-filters="clearAllFilters"
                />
              </v-col>
            </v-row>
          </v-container>
        </section>
      </div>

      <!-- Authentication Required Dialog -->
      <v-dialog
        v-model="showAuthDialog"
        max-width="500"
        persistent
      >
        <v-card rounded="xl" class="pa-2">
          <v-card-title class="text-center pb-2">
            <div class="d-flex align-center justify-center mb-2">
              <v-icon color="primary" size="48" class="me-3">
                mdi-shield-lock
              </v-icon>
              <div>
                <h3 class="text-h5 font-weight-bold text-primary">
                  Authentication Required
                </h3>
                <p class="text-body-2 text-grey-darken-1 mb-0">
                  Secure Contact System
                </p>
              </div>
            </div>
          </v-card-title>

          <v-card-text class="text-center py-4">
            <v-alert
              type="info"
              variant="tonal"
              rounded="lg"
              class="mb-4"
            >
              <template #prepend>
                <v-icon>mdi-information</v-icon>
              </template>
              <div class="text-start">
                <h4 class="text-h6 mb-2">Security Notice</h4>
                <p class="mb-2">
                  To ensure the safety and security of our community, we require user authentication before allowing contact with item owners.
                </p>
                <p class="mb-0">
                  <strong>Why we need this:</strong>
                </p>
                <ul class="text-start mt-2">
                  <li>Verify identity of claimants</li>
                  <li>Prevent spam and fraudulent claims</li>
                  <li>Maintain conversation history</li>
                  <li>Ensure accountability</li>
                </ul>
              </div>
            </v-alert>

            <div class="text-body-1 mb-4">
              Please <strong>sign in</strong> or <strong>create an account</strong> to contact the item owner safely and securely.
            </div>

            <v-card
              variant="outlined"
              rounded="lg"
              class="pa-3 mb-4 bg-grey-lighten-5"
            >
              <div class="d-flex align-center">
                <v-icon color="success" class="me-2">mdi-check-circle</v-icon>
                <div class="text-start">
                  <div class="font-weight-medium">Quick & Easy Registration</div>
                  <div class="text-caption text-grey-darken-1">
                    Sign up with your CSU email in seconds
                  </div>
                </div>
              </div>
            </v-card>
          </v-card-text>

          <v-card-actions class="px-6 pb-6">
            <v-row>
              <v-col cols="6">
                <v-btn
                  variant="outlined"
                  color="grey-darken-1"
                  block
                  rounded="lg"
                  @click="closeAuthDialog"
                >
                  <v-icon start>mdi-arrow-left</v-icon>
                  Back to Browse
                </v-btn>
              </v-col>
              <v-col cols="6">
                <v-btn
                  color="primary"
                  variant="elevated"
                  block
                  rounded="lg"
                  @click="redirectToAuth"
                >
                  <v-icon start>mdi-login</v-icon>
                  Sign In / Register
                </v-btn>
              </v-col>
            </v-row>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </template>
  </OuterLayoutWrapper>
</template>

<style scoped>
.items-section {
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  min-height: 60vh;
}

.items-section .v-card {
  transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
}

.items-section .v-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
}
</style>
