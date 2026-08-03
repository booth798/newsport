import { createRouter, createWebHistory } from 'vue-router';

import { resetGlobalLoadingSession } from '@/api/request';
import Home from '@/views/Home/index.vue';
import { isChunkLoadError, lazyView, notifyChunkLoadError } from '@/router/lazyView';
import { captureRegisterAttributionFromQuery } from '@/utils/registerAttribution';

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
    component: lazyView(() => import('@/views/Register/index.vue')),
    meta: { titleKey: '注册会员', bare: true },
  },
  {
    path: '/market',
    name: 'market',
    component: lazyView(() => import('@/views/Market/index.vue')),
    meta: { titleKey: '全部赛事', requiresAuth: true },
  },
  {
    path: '/market/search',
    name: 'market-search',
    component: lazyView(() => import('@/views/Market/Search/index.vue')),
    // H5：自带紧凑头；赛事结果搜索（mode=match）额外藏底部 Tab（见 App.vue）
    meta: { titleKey: '搜索', hideMobileHeader: true, requiresAuth: true },
  },
  {
    path: '/market/filter',
    name: 'market-filter',
    component: lazyView(() => import('@/views/Market/Filter/index.vue')),
    meta: { titleKey: '筛选联赛', hideMobileTabBar: true, hideMobileHeader: true, requiresAuth: true },
  },
  {
    path: '/market/league/:league',
    name: 'market-league',
    component: lazyView(() => import('@/views/Market/League/index.vue')),
    meta: { titleKey: '联赛市场', requiresAuth: true },
  },
  {
    path: '/market/:id',
    name: 'market-detail',
    component: lazyView(() => import('@/views/Market/Detail/index.vue')),
    meta: { titleKey: '比赛详情', requiresAuth: true },
  },
  {
    path: '/trade/purchases',
    name: 'trade-purchases',
    component: lazyView(() => import('@/views/Trade/PurchaseDetails/index.vue')),
    meta: { titleKey: '买入明细' },
  },
  {
    path: '/live-scores',
    name: 'live-scores',
    // 即时比分页面自带返回栏与北京时间，使用 bare 隐藏全局头部。
    component: lazyView(() => import('@/views/LiveScores/index.vue')),
    meta: { titleKey: '即时比分', bare: true, requiresAuth: true, guestPreview: true },
  },
  {
    path: '/match-results',
    name: 'match-results',
    // 赛事结果页面自带返回栏与北京时间，使用 bare 隐藏全局头部。
    component: lazyView(() => import('@/views/MatchResults/index.vue')),
    meta: { titleKey: '赛事结果', bare: true, requiresAuth: true, guestPreview: true },
  },
  {
    path: '/upcoming-matches',
    name: 'upcoming-matches',
    // 未开赛页面自带返回栏与北京时间，使用 bare 隐藏全局头部。
    component: lazyView(() => import('@/views/UpcomingMatches/index.vue')),
    meta: { titleKey: '未开赛', bare: true, requiresAuth: true, guestPreview: true },
  },
  {
    path: '/finance',
    name: 'finance',
    component: lazyView(() => import('@/views/Finance/index.vue')),
    meta: { titleKey: '交易账务', requiresAuth: true },
    redirect: { name: 'finance-records' },
    children: [
      {
        path: 'deposit',
        name: 'finance-deposit',
        component: lazyView(() => import('@/views/Finance/Deposit.vue')),
        // H5：返回顶栏 + 标题 + 右侧月份筛选，隐藏底部 Tab。
        meta: { titleKey: '充值', compactHeader: true, hideMobileTabBar: true },
      },
      {
        path: 'withdraw',
        name: 'finance-withdraw',
        component: lazyView(() => import('@/views/Finance/Withdraw.vue')),
        // H5：返回顶栏 + 标题 + 右侧月份筛选，隐藏底部 Tab（对齐会员互转）。
        meta: { titleKey: '银行卡提现', compactHeader: true, hideMobileTabBar: true },
      },
      {
        path: 'withdraw-chain',
        name: 'finance-withdraw-chain',
        component: lazyView(() => import('@/views/Finance/WithdrawChain.vue')),
        meta: { titleKey: '区块链提现', compactHeader: true, hideMobileTabBar: true },
      },
      {
        path: 'vip-transfer',
        name: 'finance-vip-transfer',
        component: lazyView(() => import('@/views/Finance/VipTransfer.vue')),
        // H5 使用页面自身的返回栏，PC 继续复用财务页公共头部与侧栏。
        meta: {
          titleKey: '会员互转',
          // H5 二级页：返回 + 标题 + 右侧月份筛选（Header 内 MonthSelector）。
          compactHeader: true,
          hideMobileTabBar: true,
        },
      },
      {
        path: 'records',
        name: 'finance-records',
        component: lazyView(() => import('@/views/Finance/Records.vue')),
        meta: { titleKey: '交易记录' },
      },
    ],
  },
  {
    path: '/profile',
    name: 'profile',
    component: lazyView(() => import('@/views/Profile/index.vue')),
    meta: { titleKey: '我的', requiresAuth: true },
    children: [
      {
        path: '',
        name: 'profile-home',
        component: lazyView(() => import('@/views/Profile/Overview.vue')),
        meta: { titleKey: '我的' },
      },
      {
        path: 'info',
        // 旧个人资料页已废弃，统一走弹窗；保留路径重定向避免外链 404
        redirect: '/profile',
      },
      {
        path: 'messages',
        name: 'profile-messages',
        component: lazyView(() => import('@/views/Profile/Messages.vue')),
        // 消息详情页：PC 用紧凑顶栏（返回 + 更多）；H5 仍走 profile 子页紧凑头。
        meta: { titleKey: '系统消息', hideMobileTabBar: true },
      },
      {
        path: 'verify',
        name: 'profile-verify',
        component: lazyView(() => import('@/views/Profile/Verify.vue')),
        meta: { titleKey: '实名认证', hideMobileTabBar: true },
      },
      {
        path: 'security',
        name: 'profile-security',
        component: lazyView(() => import('@/views/Profile/Security.vue')),
        // H5 对齐 App SettingActivity：自带返回顶栏，隐藏全局头与底栏。
        meta: {
          titleKey: '设置',
          hideMobileHeader: true,
          hideMobileTabBar: true,
        },
      },
      {
        path: 'bindings',
        name: 'profile-bindings',
        component: lazyView(() => import('@/views/Profile/Bindings.vue')),
        // H5 对齐 App BindingListActivity：自带返回顶栏，隐藏全局头与底栏。
        meta: {
          titleKey: '绑定信息',
          hideMobileHeader: true,
          hideMobileTabBar: true,
        },
      },
      {
        path: 'about',
        name: 'profile-about',
        component: lazyView(() => import('@/views/Profile/About.vue')),
        // H5 使用页面自身返回栏与品牌区，不复用全局头部与底部 Tab。
        meta: {
          titleKey: '关于我们',
          hideMobileHeader: true,
          hideMobileTabBar: true,
        },
      },
      {
        path: 'vipBenefits',
        name: 'vip-benefits',
        component: lazyView(() => import('@/views/Profile/VipBenefits.vue')),
        // H5 使用 VIP 页面自身的返回栏和内容布局，不复用全局头部与底部 Tab。
        meta: {
          titleKey: 'VIP详情',
          requiresAuth: true,
          guestPreview: true,
          hideMobileHeader: true,
          hideMobileTabBar: true,
        },
      },
    ],
  },
  {
    path: '/service',
    name: 'service',
    component: lazyView(() => import('@/views/Service/index.vue')),
    meta: { titleKey: '在线客服', requiresAuth: true, guestPreview: true, bare: true },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: lazyView(() => import('@/views/NotFound.vue')),
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

router.beforeEach(async (to, from) => {
  // 代理推广链接 ?ac= → 暂存 agentCode，供注册页 / 登录弹窗注册使用
  captureRegisterAttributionFromQuery(to.query);

  // 进入新页面时重置全局 loading 会话（本页只展示一轮）；同步执行，早于页面发请求
  if (to.path !== from.path || to.name !== from.name) {
    resetGlobalLoadingSession();
  }

  if (to.matched.some((r) => r.meta.requiresAuth)) {
    if (to.matched.some((r) => r.meta.guestPreview)) return true;
    const { useUserStore } = await import('@/store/modules/user');
    const userStore = useUserStore();
    if (!userStore.isLoggedIn) {
      const { useAppStore } = await import('@/store/modules/app');
      const appStore = useAppStore();
      // 未登录先进「请先登录」确认框，点登录后再打开登录弹窗。
      appStore.openLoginConfirm();
      return { name: 'home' };
    }
  }
});

// 捕获导航期懒加载失败（如 Couldn't resolve component "default" at "/finance"）
router.onError((err) => {
  if (!isChunkLoadError(err)) return;
  notifyChunkLoadError(err);
  try {
    const key = 'mysport-chunk-auto-reload';
    if (!sessionStorage.getItem(key)) {
      sessionStorage.setItem(key, '1');
      window.location.reload();
    }
  } catch {
    /* ignore */
  }
});

export default router;
