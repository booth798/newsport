<script setup>
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import HomeBanner from './components/HomeBanner.vue';
import HomeAnnouncement from './components/HomeAnnouncement.vue';
import HomeHotEvents from './components/HomeHotEvents.vue';
import { useAppStore } from '@/store/modules/app';

const { t, locale } = useI18n();
const appStore = useAppStore();
const { csHours } = storeToRefs(appStore);

const vipLevel = ref(0);
/** /api/home 的 hotMarkets 原始盘口（未归并），对齐安卓 cachedHotMarkets */
const homeHotMarkets = ref([]);
const homeBanners = ref([]);
/** 热门联赛 Tab 原始数据，对齐安卓 HomeFragment.hotLeagues */
const hotLeagues = ref([]);
/** /home（及并行的 /leagues/hot）是否已结束，供子组件结束加载态 */
const homeReady = ref(false);
// 接口只返回时段（如 09:00-21:00），前端按当前语言拼完整走马灯文案。
const announcementText = computed(() => {
  void locale.value;
  const hours = (csHours.value || '').trim();
  if (!hours) return '';
  return t('客服工作时间公告', { hours });
});

onMounted(async () => {
  try {
    // 对齐安卓 loadRemoteData：首页聚合与热门联赛 Tab 并行拉取，去掉原先 3s 延迟
    const { fetchHomeData, fetchHotLeagues } = await import('@/api/match');
    const [homeRes, leagueRes] = await Promise.all([
      fetchHomeData().catch(() => null),
      fetchHotLeagues().catch(() => null),
    ]);
    if (homeRes) {
      const data = homeRes.data || {};
      if (data.vip) vipLevel.value = data.vip.level || 0;
      // 原始盘口交给子组件按 onePerEvent 归并（与安卓一致）
      homeHotMarkets.value = Array.isArray(data.hotMarkets) ? data.hotMarkets : [];
      homeBanners.value = data.banners || [];
    }
    if (leagueRes) hotLeagues.value = leagueRes.data || [];
  } finally {
    homeReady.value = true;
  }
});
</script>

<template>
  <div class="home">
    <HomeBanner :banners="homeBanners" />

    <div class="home__inner">
      <HomeAnnouncement :text="announcementText" />
      <HomeHotEvents
        :preloaded-hot-markets="homeHotMarkets"
        :hot-leagues="hotLeagues"
        :home-ready="homeReady"
      />
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
