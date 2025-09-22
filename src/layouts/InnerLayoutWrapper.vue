
<script lang="ts" setup>
  import { onMounted } from 'vue'

  import Sidebar from '@/components/common/sideBar/Sidebar.vue'
  import { useLandingController } from '@/controller/landingController'

  const { data, fetchLandingData } = useLandingController()

  onMounted(async () => {
    await fetchLandingData()
  })
</script>

<template>
  <v-app>

    <Sidebar/>
    <!-- Dynamic Navbar Selection -->
    <InsideNavbar1
      v-if="data?.ui?.navbarComponent === '1'"
      :config="data?.ui"
    />

    <InsideNavbar2
      v-else-if="data?.ui?.navbarComponent === '2'"
      :config="data?.ui"
    />

    <InsideNavbar3
      v-else-if="data?.ui?.navbarComponent === '3'"
      :config="data?.ui"
    />

    <InsideNavbar4
      v-else-if="data?.ui?.navbarComponent === '4'"
      :config="data?.ui"
    />

    <v-main>
      <slot name="content"></slot>
    </v-main>

    <!-- Dynamic Footer Selection -->
    <!-- TODO: Create InnerFooter component when needed -->
    <!-- <InnerFooter
      v-if="data?.ui?.footerComponent === '1'"
      :config="data?.ui"
    /> -->
  </v-app>
</template>


<style scoped>
  /* Layout-specific styles can be added here */
</style>
