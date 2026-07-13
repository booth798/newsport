<script setup>
import Header from '@/components/Header.vue';
import FloatingService from '@/components/FloatingService.vue';
import LoginModal from '@/components/LoginModal.vue';
import AppLogoutConfirm from '@/components/AppLogoutConfirm.vue';
import AppCustomerServiceConfirm from '@/components/AppCustomerServiceConfirm.vue';
import MobileTabBar from '@/components/MobileTabBar.vue';
import GlobalToast from '@/components/GlobalToast.vue';
import GlobalLoading from '@/components/GlobalLoading.vue';
import NetworkBar from '@/components/NetworkBar.vue';

import { computed, onBeforeUnmount, onMounted, provide, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';

import { SITE_CONFIG } from '@/config/site';
import i18n from '@/i18n';
import { useAppStore } from '@/store/modules/app';
import { useUserStore } from '@/store/modules/user';
import { useWalletWs } from '@/hooks/useWalletWs';

function getRouteDepth(path) {
  return path.replace(/\/$/, '').split('/').filter(Boolean).length;
}

function getRootRouteKey(viewRoute) {
  // 顶层视图只按最外层路由记录复用，避免子路由切换时重建父布局与侧栏。
  return viewRoute.matched[0]?.path || viewRoute.path;
}

const appStore = useAppStore();
const userStore = useUserStore();
const route = useRoute();
const router = useRouter();
const { locale, isMobile } = storeToRefs(appStore);
const { isLoggedIn } = storeToRefs(userStore);
const isBarePage = computed(() => Boolean(route.meta?.bare));
const hideMobileTabBar = computed(() => Boolean(route.meta?.hideMobileTabBar));
const hideMobileHeader = computed(() => isMobile.value && Boolean(route.meta?.hideMobileHeader));

const transitionName = ref('page-fade');

router.afterEach((to, from) => {
  if (!from.name) {
    transitionName.value = 'page-fade';
    return;
  }
  const toDepth = getRouteDepth(to.path);
  const fromDepth = getRouteDepth(from.path);
  if (toDepth > fromDepth) {
    transitionName.value = 'page-slide-left';
  } else if (toDepth < fromDepth) {
    transitionName.value = 'page-slide-right';
  } else {
    transitionName.value = 'page-fade';
  }
});

// 统一记录窗口宽度，方便页面按需判断当前是否处于移动端布局。
const syncViewport = () => {
  appStore.setViewportWidth(window.innerWidth);
};

// 页面标题始终跟随当前路由和当前站点名称变化。
const syncDocumentTitle = () => {
  let pageTitle;
  if (route.name === 'market-league' && route.params.league) {
    const league = String(route.params.league);
    pageTitle = i18n.global.t('联赛市场', { league: i18n.global.t(league) });
  } else {
    pageTitle = i18n.global.t(route.meta?.titleKey || '首页', {
      siteName: SITE_CONFIG.siteName,
    });
  }

  document.title = `${pageTitle} | ${SITE_CONFIG.siteName}`;
};

watch(
  locale,
  (nextLocale) => {
    i18n.global.locale.value = nextLocale;
    document.documentElement.lang = nextLocale;
    syncDocumentTitle();
  },
  { immediate: true },
);

watch(() => route.fullPath, syncDocumentTitle);

function onSessionExpired() {
  const wasLoggedIn = isLoggedIn.value;
  userStore.clearWebLogin();
  if (wasLoggedIn) appStore.openLoginModal();
}

onMounted(async () => {
  syncViewport();
  window.addEventListener('resize', syncViewport, { passive: true });
  window.addEventListener('mysport:session-expired', onSessionExpired);

  appStore.loadPublicConfig().catch(() => {});

  if (isLoggedIn.value) {
    try {
      await userStore.loadUserProfile();
    } catch { /* non-critical */ }
  }
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', syncViewport);
  window.removeEventListener('mysport:session-expired', onSessionExpired);
});

const toastRef = ref(null);
provide('toast', {
  success: (msg) => toastRef.value?.show(msg, { type: 'success' }),
  error: (msg) => toastRef.value?.show(msg, { type: 'error' }),
  info: (msg) => toastRef.value?.show(msg, { type: 'info' }),
});

useWalletWs({
  onPayout(msg) {
    const amount = msg.amount ? `¥${msg.amount}` : '';
    toastRef.value?.show(
      i18n.global.t('派奖到账', { amount }) || `派奖到账 ${amount}`,
      { type: 'success' },
    );
  },
});
</script>

<template>
  <Header v-if="!isBarePage && !hideMobileHeader" />
  <main class="main-content" :class="{ 'main-content--bare': isBarePage }">
    <RouterView v-slot="{ Component, route: viewRoute }">
      <Transition :name="transitionName" mode="out-in">
        <component :is="Component" :key="getRootRouteKey(viewRoute)" />
      </Transition>
    </RouterView>
  </main>
  <MobileTabBar v-if="isMobile && !isBarePage && !hideMobileTabBar" />
  <FloatingService v-if="!isBarePage" />
  <LoginModal :visible="appStore.loginModalOpen" @close="appStore.closeLoginModal" />
  <AppLogoutConfirm />
  <AppCustomerServiceConfirm />
  <GlobalToast ref="toastRef" />
  <GlobalLoading />
  <NetworkBar />
</template>

<style lang="scss" scoped>
@use '@/styles/tools.scss' as *;

.main-content {
  min-height: calc(100vh - 120px);
  min-height: calc(100dvh - 120px);
  overflow-x: hidden;

  @include mobile-only {
    padding-bottom: calc($mobile-tab-bar-offset + env(safe-area-inset-bottom, 0px));
  }

  &--bare {
    min-height: 100vh;
    min-height: 100dvh;
    padding-bottom: 0;
  }
}
</style>

<style lang="scss">
// 同级切换：淡入淡出
.page-fade-enter-active,
.page-fade-leave-active {
  transition: opacity 0.22s ease;
}
.page-fade-enter-from {
  opacity: 0;
}
.page-fade-leave-to {
  opacity: 0;
}

// 前进（进入更深页面）：新页面从右侧滑入
.page-slide-left-enter-active,
.page-slide-left-leave-active {
  transition: transform 0.28s cubic-bezier(0.4, 0, 0.2, 1),
              opacity 0.28s cubic-bezier(0.4, 0, 0.2, 1);
  will-change: transform, opacity;
}
.page-slide-left-enter-from {
  transform: translateX(40px);
  opacity: 0;
}
.page-slide-left-leave-to {
  transform: translateX(-20px);
  opacity: 0;
}

// 返回（回到上级页面）：新页面从左侧滑入
.page-slide-right-enter-active,
.page-slide-right-leave-active {
  transition: transform 0.28s cubic-bezier(0.4, 0, 0.2, 1),
              opacity 0.28s cubic-bezier(0.4, 0, 0.2, 1);
  will-change: transform, opacity;
}
.page-slide-right-enter-from {
  transform: translateX(-40px);
  opacity: 0;
}
.page-slide-right-leave-to {
  transform: translateX(20px);
  opacity: 0;
}
</style>
