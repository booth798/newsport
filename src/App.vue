<script setup>
import { onBeforeUnmount, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { storeToRefs } from 'pinia';

import AppShell from '@/components/AppShell.vue';
import { getSiteConfig } from '@/config/site';
import { useTheme } from '@/hooks/useTheme';
import i18n from '@/i18n';
import { useAppStore } from '@/store/modules/app';

const appStore = useAppStore();
const route = useRoute();
const { locale, siteKey } = storeToRefs(appStore);

useTheme();

const syncViewport = () => {
  appStore.setViewportWidth(window.innerWidth);
};

const syncDocumentTitle = () => {
  const currentSite = getSiteConfig(siteKey.value);
  const pageTitle = i18n.global.t(route.meta?.titleKey || 'page.home', {
    siteName: currentSite.siteName,
  });

  document.title = `${pageTitle} | ${currentSite.siteName}`;
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

watch(siteKey, syncDocumentTitle, { immediate: true });
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
  <AppShell />
</template>
