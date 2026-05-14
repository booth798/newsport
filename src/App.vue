<script setup>
import Header from '@/components/Header.vue';
import Footer from '@/components/Footer.vue';
import FloatingService from '@/components/FloatingService.vue';
import LoginModal from '@/components/LoginModal.vue';
import MobileTabBar from '@/components/MobileTabBar.vue';

import { onBeforeUnmount, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { storeToRefs } from 'pinia';

import { SITE_CONFIG } from '@/config/site';
import i18n from '@/i18n';
import { useAppStore } from '@/store/modules/app';

const appStore = useAppStore();
const route = useRoute();
const { locale, isMobile } = storeToRefs(appStore);

// 统一记录窗口宽度，方便页面按需判断当前是否处于移动端布局。
const syncViewport = () => {
  appStore.setViewportWidth(window.innerWidth);
};

// 页面标题始终跟随当前路由和当前站点名称变化。
const syncDocumentTitle = () => {
  const pageTitle = i18n.global.t(route.meta?.titleKey || '首页', {
    siteName: SITE_CONFIG.siteName,
  });

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

onMounted(() => {
  syncViewport();
  window.addEventListener('resize', syncViewport, { passive: true });
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', syncViewport);
});
</script>

<template>
  <Header />
  <main class="main-content">
    <RouterView />
  </main>
  <Footer />
  <MobileTabBar v-if="isMobile" />
  <FloatingService />
  <LoginModal :visible="appStore.loginModalOpen" @close="appStore.closeLoginModal" />
</template>

<style lang="scss" scoped>
@use '@/styles/tools.scss' as *;

.main-content {
  min-height: calc(100vh - 120px - 180px);

  @include mobile-only {
    padding-bottom: calc($mobile-tab-bar-offset + env(safe-area-inset-bottom, 0px));
  }
}
</style>
