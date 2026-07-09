<script setup>
import { onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import HomeBanner from './components/HomeBanner.vue';
import HomeAnnouncement from './components/HomeAnnouncement.vue';
import HomeHotEvents from './components/HomeHotEvents.vue';

const { t } = useI18n();

const vipLevel = ref(0);
const homeMatches = ref([]);
const homeBanners = ref([]);

onMounted(async () => {
  const hasToken = Boolean(localStorage.getItem('mysport:token'));
  if (!hasToken) return;
  try {
    const { fetchHomeData, normalizeHomeMarkets } = await import('@/api/match');
    const res = await fetchHomeData();
    const data = res.data || {};
    if (data.vip) {
      vipLevel.value = data.vip.level || 0;
    }
    if (data.hotMarkets) {
      homeMatches.value = normalizeHomeMarkets(data.hotMarkets);
    }
    homeBanners.value = data.banners || [];
  } catch { /* non-critical */ }
});

</script>

<template>
  <div class="home">
    <HomeBanner :banners="homeBanners" />

    <div class="home__inner">
      <HomeAnnouncement />
      <HomeHotEvents :preloaded-matches="homeMatches" />
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/tools.scss' as *;

.home {
  &__inner {
    @include container;
    @include web-main-column-max;
    display: flex;
    flex-direction: column;

    @include web-only {
      gap: 20px;
      padding-bottom: 60px;
    }

    @include mobile-only {
      gap: 8px;
      padding-bottom: 30px;
    }
  }

  &__quick-actions {
    display: flex;
    gap: 10px;

    @include web-only {
      gap: 14px;
    }
  }
}

.quick-action {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border: 1.5px solid var(--auxiliary-1);
  border-radius: $radius-pill;
  background: var(--surface-card);
  box-shadow: var(--shadow-card);
  color: var(--theme-primary);
  font-size: $font-size-md;
  font-weight: 600;
  cursor: pointer;
  text-decoration: none;
  transition: all 0.2s;

  &:hover {
    border-color: var(--theme-primary);
    box-shadow: 0 2px 12px rgba(28, 123, 255, 0.18);
  }

  &__icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    color: var(--theme-primary);

    &--vip {
      width: auto;
      padding: 2px 6px;
      border-radius: 4px;
      background: linear-gradient(135deg, #ffd700, #ffaa00);
      color: #fff;
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.5px;
    }
  }

  &__label {
    white-space: nowrap;
  }
}
</style>
