import { createRouter, createWebHistory } from 'vue-router';

import HomeView from '@/views/HomeView.vue';
import SiteWorkbenchView from '@/views/SiteWorkbenchView.vue';

const routes = [
  {
    path: '/',
    name: 'home',
    component: HomeView,
    meta: {
      titleKey: 'page.home',
    },
  },
  {
    path: '/site-workbench',
    name: 'site-workbench',
    component: SiteWorkbenchView,
    meta: {
      titleKey: 'page.siteWorkbench',
    },
  },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior() {
    return { top: 0 };
  },
});

export default router;

