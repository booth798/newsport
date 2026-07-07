<script setup>
import Header from '@/components/Header.vue';
import FloatingService from '@/components/FloatingService.vue';
import LoginModal from '@/components/LoginModal.vue';
import MobileTabBar from '@/components/MobileTabBar.vue';
import GlobalToast from '@/components/GlobalToast.vue';

import { computed, onBeforeUnmount, onMounted, provide, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { storeToRefs } from 'pinia';

import { SITE_CONFIG } from '@/config/site';
import i18n from '@/i18n';
import { useAppStore } from '@/store/modules/app';

const appStore = useAppStore();
const route = useRoute();
const { locale, isMobile } = storeToRefs(appStore);
const isBarePage = computed(() => Boolean(route.meta?.bare));
const hideMobileTabBar = computed(() => Boolean(route.meta?.hideMobileTabBar));

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
  if (appStore.isLoggedIn) {
    appStore.clearWebLogin();
    appStore.openLoginModal();
  }
}

onMounted(() => {
  syncViewport();
  window.addEventListener('resize', syncViewport, { passive: true });
  window.addEventListener('mysport:session-expired', onSessionExpired);
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
</script>

<template>
  <Header v-if="!isBarePage" />
  <main class="main-content" :class="{ 'main-content--bare': isBarePage }">
    <RouterView />
  </main>
  <MobileTabBar v-if="isMobile && !isBarePage && !hideMobileTabBar" />
  <FloatingService v-if="!isBarePage" />
  <LoginModal :visible="appStore.loginModalOpen" @close="appStore.closeLoginModal" />
  <GlobalToast ref="toastRef" />
</template>

<style lang="scss" scoped>
@use '@/styles/tools.scss' as *;

.main-content {
  min-height: calc(100vh - 120px);

  @include mobile-only {
    padding-bottom: calc($mobile-tab-bar-offset + env(safe-area-inset-bottom, 0px));
  }

  &--bare {
    min-height: 100vh;
    padding-bottom: 0;
  }
}
</style>
