import { createRouter, createWebHistory } from 'vue-router';

import Home from '@/views/Home/index.vue';

const routes = [
  {
    path: '/',
    name: 'home',
    component: Home,
    meta: { titleKey: '首页' },
  },
  {
    path: '/register',
    name: 'register',
    component: () => import('@/views/Register/index.vue'),
    meta: { titleKey: '注册会员', bare: true },
  },
  {
    path: '/market',
    name: 'market',
    component: () => import('@/views/Market/index.vue'),
    meta: { titleKey: '全部赛事' },
  },
  {
    path: '/market/search',
    name: 'market-search',
    component: () => import('@/views/Market/Search/index.vue'),
    meta: { titleKey: '搜索', hideMobileTabBar: true },
  },
  {
    path: '/market/filter',
    name: 'market-filter',
    component: () => import('@/views/Market/Filter/index.vue'),
    meta: { titleKey: '筛选联赛', hideMobileTabBar: true, hideMobileHeader: true },
  },
  {
    path: '/market/league/:league',
    name: 'market-league',
    component: () => import('@/views/Market/League/index.vue'),
    meta: { titleKey: '联赛市场' },
  },
  {
    path: '/market/:id',
    name: 'market-detail',
    component: () => import('@/views/Market/Detail/index.vue'),
    meta: { titleKey: '比赛详情' },
  },
  {
    path: '/trade/purchases',
    name: 'trade-purchases',
    component: () => import('@/views/Trade/PurchaseDetails/index.vue'),
    meta: { titleKey: '买入明细' },
  },
  {
    path: '/finance',
    component: () => import('@/views/Finance/index.vue'),
    meta: { titleKey: '交易账务', requiresAuth: true, guestPreview: true },
    redirect: '/finance/records',
    children: [
      {
        path: 'deposit',
        name: 'finance-deposit',
        component: () => import('@/views/Finance/Deposit.vue'),
        meta: { titleKey: '充值' },
      },
      {
        path: 'withdraw',
        name: 'finance-withdraw',
        component: () => import('@/views/Finance/Withdraw.vue'),
        meta: { titleKey: '提领' },
      },
      {
        path: 'records',
        name: 'finance-records',
        component: () => import('@/views/Finance/Records.vue'),
        meta: { titleKey: '交易记录' },
      },
    ],
  },
  {
    path: '/profile',
    name: 'profile',
    component: () => import('@/views/Profile/index.vue'),
    meta: { titleKey: '我的', requiresAuth: true, guestPreview: true },
    children: [
      {
        path: '',
        name: 'profile-home',
        component: () => import('@/views/Profile/Overview.vue'),
        meta: { titleKey: '我的' },
      },
      {
        path: 'info',
        name: 'profile-info',
        component: () => import('@/views/Profile/Info.vue'),
        meta: { titleKey: '个人资料' },
      },
      {
        path: 'messages',
        name: 'profile-messages',
        component: () => import('@/views/Profile/Messages.vue'),
        meta: { titleKey: '消息中心' },
      },
      {
        path: 'verify',
        name: 'profile-verify',
        component: () => import('@/views/Profile/Verify.vue'),
        meta: { titleKey: '实名认证' },
      },
      {
        path: 'security',
        name: 'profile-security',
        component: () => import('@/views/Profile/Security.vue'),
        meta: { titleKey: '设置', hideMobileTabBar: true },
      },
      {
        path: 'about',
        name: 'profile-about',
        component: () => import('@/views/Profile/About.vue'),
        meta: { titleKey: '关于我们' },
      },
      {
        path: 'vipBenefits',
        name: 'vip-benefits',
        component: () => import('@/views/Profile/VipBenefits.vue'),
        // H5 使用 VIP 页面自身的返回栏和内容布局，不复用全局头部与底部 Tab。
        meta: {
          titleKey: 'VIP详情',
          requiresAuth: true,
          guestPreview: true,
          hideMobileHeader: true,
        },
      },
    ]
  },
  {
    path: '/service',
    name: 'service',
    component: () => import('@/views/Service/index.vue'),
    meta: { titleKey: '在线客服', requiresAuth: true, guestPreview: true, bare: true },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/views/NotFound.vue'),
    meta: { titleKey: '页面未找到' },
  },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior(to) {
    if (to.hash) {
      return { el: to.hash, behavior: 'smooth' };
    }
    return { top: 0 };
  },
});

router.beforeEach(async (to) => {
  if (to.matched.some((r) => r.meta.requiresAuth)) {
    if (to.matched.some((r) => r.meta.guestPreview)) return true;
    const { useUserStore } = await import('@/store/modules/user');
    const userStore = useUserStore();
    if (!userStore.isLoggedIn) {
      const { useAppStore } = await import('@/store/modules/app');
      const appStore = useAppStore();
      appStore.openLoginModal();
      return { name: 'home' };
    }
  }
});

export default router;
