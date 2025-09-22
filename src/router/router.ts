import { setupLayouts } from 'virtual:generated-layouts';
import { createRouter, createWebHistory } from 'vue-router';

import Hero from '@/pages/index.vue';
import Auth from '@/pages/Auth.vue';
import Home from '@/pages/Home.vue';
import NotFound from '@/pages/NotFound.vue';
import ForbiddenView from '@/pages/ForbiddenView.vue';

/**
 * Route definitions for the application
 */
const routes = setupLayouts([
  {
    path: '/',
    component: Hero
  },
  {
    path: '/auth',
    component: Auth,
  },
  {
    path: '/home',
    component: Home,
  },
  {
    path: '/forbidden',
    component: ForbiddenView,
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: NotFound,
  },
]);

/**
 * Create and configure the router instance
 */
export const createAppRouter = () => {
  return createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes,
  });
};
