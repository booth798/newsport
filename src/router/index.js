import { createRouter, createWebHistory } from 'vue-router';

import Home from '@/views/Home/index.vue';

const routes = [
  {
    path: '/',
    name: 'home',
    component: Home,
    meta: {
      titleKey: '首页',
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
