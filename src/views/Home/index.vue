<script setup>
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import HomeBanner from './components/HomeBanner.vue';
import HomeAnnouncement from './components/HomeAnnouncement.vue';
import HomeHotEvents from './components/HomeHotEvents.vue';

const { t } = useI18n();
const router = useRouter();

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
    if (data.banners) {
      homeBanners.value = data.banners;
    }
  } catch { /* non-critical */ }
});

function goVip() { router.push('/vip'); }
function goService() { router.push('/service'); }
</script>

<template>
  <div class="home">
    <HomeBanner :banners="homeBanners" />

    <div class="home__inner">
      <HomeAnnouncement />

      <div class="home__quick-actions">
        <button v-if="vipLevel > 0" type="button" class="quick-action" @click="goVip">
          <span class="quick-action__icon quick-action__icon--vip">VIP</span>
          <span class="quick-action__label">{{ t('VIP中心') }}</span>
        </button>
        <button type="button" class="quick-action" @click="goService">
          <span class="quick-action__icon">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 1a9 9 0 0 0-9 9v4a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3.07A7 7 0 0 1 10 3a7 7 0 0 1 6.93 6H16a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h.5a2.5 2.5 0 0 1-2.5 2.5H12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
          </span>
          <span class="quick-action__label">{{ t('在线客服') }}</span>
        </button>
      </div>

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
