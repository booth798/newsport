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
    path: '/market',
    name: 'market',
    component: () => import('@/views/Market/index.vue'),
    meta: { titleKey: '市场' },
  },
  {
    path: '/market/:id',
    name: 'market-detail',
    component: () => import('@/views/Market/Detail/index.vue'),
    meta: { titleKey: '市场' },
  },
  {
    path: '/finance',
    name: 'finance',
    component: () => import('@/views/Finance/index.vue'),
    redirect: '/finance/deposit',
    meta: { titleKey: '交易账务' },
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
    meta: { titleKey: '我的' },
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
        meta: { titleKey: '安全设置' },
      },
      {
        path: 'bank-card',
        name: 'profile-bank-card',
        component: () => import('@/views/Profile/BankCard.vue'),
        meta: { titleKey: '银行卡' },
      },
      {
        path: 'blockchain',
        name: 'profile-blockchain',
        component: () => import('@/views/Profile/Blockchain.vue'),
        meta: { titleKey: '区块链' },
      },
    ],
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
