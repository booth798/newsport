<script setup>
import { computed, nextTick, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useI18n } from 'vue-i18n';

import { useAppStore } from '@/store/modules/app';
import { useUserStore } from '@/store/modules/user';
import EmptyState from '@/components/EmptyState.vue';
import HomeMatchCard from './HomeMatchCard.vue';
import {
  fetchHomeHotMarketPage,
  fetchHomeLeagueMatches,
  normalizeHomeMarkets,
  homeTabHasNextPage,
  HOME_TAB_PAGE_SIZE,
} from '@/api/match';

import iconEventsUrl from '@/assets/images/events/icon_events.svg?url';
import iconHotUrl from '@/assets/images/events/icon_hot.svg?url';
import iconMoreUrl from '@/assets/images/events/icon_more.svg?url';

const { t } = useI18n();
const appStore = useAppStore();
const userStore = useUserStore();
const { isMobile } = storeToRefs(appStore);
const { isLoggedIn } = storeToRefs(userStore);

const props = defineProps({
  /** /api/home 的 hotMarkets 原始盘口，对齐安卓 cachedHotMarkets */
  preloadedHotMarkets: { type: Array, default: () => [] },
  /** 来自 /api/leagues/hot，由父组件与 /home 并行拉取（对齐安卓） */
  hotLeagues: { type: Array, default: () => [] },
  /** 父组件首页请求是否已结束 */
  homeReady: { type: Boolean, default: false },
});

const matchList = ref([]);
/** 热门 Tab 累积的原始盘口（翻页后再次 onePerEvent） */
const rawHotMarkets = ref([]);
const hotPageNum = ref(1);
const hotHasMore = ref(false);
const hotLoadingMore = ref(false);
const loading = ref(true);
const error = ref(false);

/** 热门 Tab：缓存为空或翻页时请求 /markets/list（对齐安卓 HomeTabPageFragment） */
async function loadHotFromMarketsList(pageNum = 1, append = false) {
  if (append) {
    if (hotLoadingMore.value || !hotHasMore.value) return;
    hotLoadingMore.value = true;
  } else {
    loading.value = true;
    error.value = false;
  }
  try {
    const res = await fetchHomeHotMarketPage(pageNum);
    const pageRecords = res.records || [];
    const merged = append ? [...rawHotMarkets.value, ...pageRecords] : pageRecords;
    rawHotMarkets.value = merged;
    matchList.value = normalizeHomeMarkets(merged);
    hotPageNum.value = pageNum;
    hotHasMore.value = homeTabHasNextPage(res.page, pageRecords.length, pageNum);
    error.value = false;
  } catch {
    if (!append) {
      error.value = true;
      matchList.value = [];
    }
  } finally {
    loading.value = false;
    hotLoadingMore.value = false;
  }
}

// 对齐安卓：优先用 /home 的 cachedHotMarkets；为空则拉 /markets/list
watch(
  () => [props.preloadedHotMarkets, props.homeReady],
  ([raw, ready]) => {
    if (!ready) return;
    if (Array.isArray(raw) && raw.length) {
      rawHotMarkets.value = raw;
      matchList.value = normalizeHomeMarkets(raw);
      hotPageNum.value = 1;
      // 安卓：hasMorePages = cachedHotMarkets.size >= PAGE_SIZE
      hotHasMore.value = raw.length >= HOME_TAB_PAGE_SIZE;
      loading.value = false;
      error.value = false;
      return;
    }
    loadHotFromMarketsList(1, false);
  },
  { immediate: true },
);

function loadMoreHot() {
  loadHotFromMarketsList(hotPageNum.value + 1, true);
}

/** 将 /leagues/hot 转为 Tab：id 作 key，name 作 /markets/list 的 league 过滤值 */
function mapHotLeagueTabs(leagues) {
  return (leagues || []).map((l) => ({
    key: l.id,
    query: (l.name || '').trim() || (l.shortName || '').trim(),
    labelKey: `${l.shortName || l.name}赛事`,
    shortLabelKey: l.shortName || l.name,
    icon: l.logoUrl || iconEventsUrl,
  }));
}

const dynamicLeagueTabs = ref(mapHotLeagueTabs(props.hotLeagues));

watch(
  () => props.hotLeagues,
  (leagues) => {
    dynamicLeagueTabs.value = mapHotLeagueTabs(leagues);
  },
);

const leagueMatchesCache = ref({});
const tabLoading = ref(false);
const tabError = ref(false);

/** 加载指定联赛 Tab 的赛事（force=true 时忽略缓存重新请求）。 */
async function loadLeagueTab(key, force = false) {
  if (!force && leagueMatchesCache.value[key]) return;
  const tab = dynamicLeagueTabs.value.find((item) => item.key === key);
  if (!tab || !tab.query) return;
  try {
    tabLoading.value = true;
    tabError.value = false;
    const res = await fetchHomeLeagueMatches(tab.query);
    leagueMatchesCache.value = { ...leagueMatchesCache.value, [key]: res.data || [] };
  } catch {
    tabError.value = true;
  } finally {
    tabLoading.value = false;
  }
}

const leagueTabs = computed(() => [
  { key: 'hot', labelKey: '热门赛事', shortLabelKey: '热门', icon: iconHotUrl },
  ...dynamicLeagueTabs.value,
]);

const tabLabel = (tab) => {
  if (isMobile.value && tab.shortLabelKey) return t(tab.shortLabelKey);
  return t(tab.labelKey);
};

const activeLeague = ref('hot');
const tabsRef = ref(null);

function scrollTabToCenter(key) {
  nextTick(() => {
    const container = tabsRef.value;
    if (!container) return;
    const btn = container.querySelector(`[data-tab-key="${key}"]`);
    if (!btn) return;
    const containerRect = container.getBoundingClientRect();
    const btnRect = btn.getBoundingClientRect();
    const offset = btnRect.left - containerRect.left + btnRect.width / 2 - containerRect.width / 2;
    container.scrollBy({ left: offset, behavior: 'smooth' });
  });
}

function selectTab(key) {
  // 对齐安卓：未登录点击非「热门」Tab 时拦截，弹出「请先登录」确认框
  if (key !== 'hot' && !isLoggedIn.value) {
    appStore.openLoginConfirm();
    return;
  }
  activeLeague.value = key;
  scrollTabToCenter(key);
  if (key !== 'hot') loadLeagueTab(key);
}

const displayMatches = computed(() => {
  if (activeLeague.value === 'hot') return matchList.value;
  return leagueMatchesCache.value[activeLeague.value] || [];
});

const isLoading = computed(() =>
  activeLeague.value === 'hot' ? loading.value : tabLoading.value,
);
const isError = computed(() =>
  activeLeague.value === 'hot' ? error.value : tabError.value,
);

async function reload() {
  // 对齐安卓 requestRefreshFromParent → markets/list 第 1 页
  await loadHotFromMarketsList(1, false);
}

function retry() {
  if (activeLeague.value === 'hot') reload();
  else loadLeagueTab(activeLeague.value, true);
}
</script>

<template>
  <section class="hot-events">
    <div class="hot-events__head">
      <div class="hot-events__title-wrap">
        <img class="hot-events__title-icon" :src="iconEventsUrl" alt="" />
        <h2 class="hot-events__title">{{ t('热门赛事') }}</h2>
      </div>

      <div ref="tabsRef" class="hot-events__tabs" role="tablist" :aria-label="t('热门赛事')">
        <button
          v-for="tab in leagueTabs"
          :key="tab.key"
          type="button"
          role="tab"
          class="hot-events__tab"
          :class="{ 'hot-events__tab--active': activeLeague === tab.key }"
          :aria-selected="activeLeague === tab.key"
          :data-tab-key="tab.key"
          @click="selectTab(tab.key)"
        >
          <img class="hot-events__tab-icon" :src="tab.icon" alt="" />
          <span class="hot-events__tab-label">{{ tabLabel(tab) }}</span>
        </button>
      </div>

      <RouterLink
        to="/market"
        class="hot-events__more"
      >
        <span class="hot-events__more-label">{{ t('更多市场') }}</span>
        <img class="hot-events__more-icon" :src="iconMoreUrl" alt="" />
      </RouterLink>
    </div>

    <div v-if="isLoading" class="hot-events__loading">
      <div class="hot-events__spinner" />
      <span>{{ t('加载中') }}</span>
    </div>
    <div v-else-if="isError" class="hot-events__error">
      <span>{{ t('加载失败') }}</span>
      <button type="button" class="hot-events__retry" @click="retry">{{ t('重试') }}</button>
    </div>
    <EmptyState v-else-if="!displayMatches.length" />
    <template v-else>
      <div class="hot-events__grid">
        <HomeMatchCard v-for="match in displayMatches" :key="match.id" :match="match" />
      </div>
      <!-- 热门 Tab 加载更多：对齐安卓分页 pageSize=20 -->
      <div
        v-if="activeLeague === 'hot' && hotHasMore"
        class="hot-events__more-wrap"
      >
        <button
          type="button"
          class="hot-events__load-more"
          :disabled="hotLoadingMore"
          @click="loadMoreHot"
        >
          {{ hotLoadingMore ? t('加载中') : t('加载更多') }}
        </button>
      </div>
    </template>
  </section>
</template>

<style lang="scss" scoped>
@use '@/styles/tools.scss' as *;

.hot-events {
  background: var(--surface-card);
  border: 1.5px solid var(--auxiliary-1);
  box-shadow: var(--shadow-card);

  @include web-only {
    border-radius: 50px;
    padding: 40px 24px;
    box-shadow: 0 4px 8px 0 rgba(21, 58, 119, 0.18);
  }

  @include mobile-only {
    border-radius: 20px;
    /* 稿：上 15px、左右 12px（与标题区标注一致） */
    padding: 15px 12px 16px;
    background: #EAF1F9;
    box-shadow: 0 4px 8px 0 rgba(21, 58, 119, 0.18);
  }

  &__head {
    @include web-only {
      display: grid;
      grid-template-columns: auto 1fr auto;
      /* 与 `__tabs` 仅 `padding-bottom` 留阴影位搭配：`center` 会把不对称的 tabs 整体上移，与左侧标题顶不齐 */
      align-items: start;
      column-gap: 24px;
      /* 标题栏与下方卡片区间距（稿约 32–40px） */
      margin-bottom: 32px;
    }

    @include mobile-only {
      display: grid;
      grid-template-columns: 1fr auto;
      grid-template-rows: auto auto;
      column-gap: 8px;
      row-gap: 10px;
      margin-bottom: 12px;
    }
  }

  &__title-wrap {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;

    @include mobile-only {
      grid-column: 1;
      grid-row: 1;
      gap: 8px;
      min-width: 0;
    }
  }

  &__title-icon {
    flex-shrink: 0;
    display: block;
    width: 48px;
    height: 48px;
    object-fit: contain;

    @include mobile-only {
      width: 28px;
      height: 28px;
    }
  }

  &__title {
    margin: 0;
    font-family: $font-family-base;
    font-size: 34px;
    font-weight: 700;
    line-height: 1;
    letter-spacing: 0;
    background: radial-gradient(circle at 50% 100%, #68b3fd, #0d6cfb);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    color: transparent;

    @include mobile-only {
      font-size: 18px;
      font-weight: 700;
      line-height: 1;
      letter-spacing: 0;
      -webkit-text-fill-color: var(--theme-primary);
      color: var(--theme-primary);
      background: none;
    }
  }

  &__more {
    position: relative;
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    width: 154px;
    height: 48px;
    padding: 0 10px;
    margin: 0;
    border: 0;
    border-radius: 32px;
    gap: 4px;
    color: #fff;
    font-family: $font-family-base;
    font-size: 18px;
    font-weight: 500;
    line-height: 26px;
    white-space: nowrap;
    text-decoration: none;
    background: #1c7bff;
    box-shadow: 0 3px 8px rgba(21, 58, 119, 0.1);
    transition:
      opacity 0.2s ease,
      transform 0.2s ease;

    &:hover {
      opacity: 0.82;
    }

    &:active {
      transform: translateY(1px);
    }

    &:focus-visible {
      outline: 2px solid #1c7bff;
      outline-offset: 2px;
    }

    @include web-only {
      grid-column: 3;
      grid-row: 1;
      align-self: start;

      &::before,
      &::after {
        content: '';
        position: absolute;
        left: calc(50% - 5px);
        pointer-events: none;
      }

      &::before {
        top: 39px;
        width: 96px;
        height: 22px;
        border-radius: 38px;
        background: #a6b5fe;
        filter: blur(16px);
        transform: translateX(-50%);
      }

      &::after {
        bottom: 1px;
        width: 66px;
        height: 1px;
        background: linear-gradient(
          90deg,
          rgba(255, 255, 255, 0) 0%,
          rgba(255, 255, 255, 0.25) 35%,
          #fff 50%,
          rgba(255, 255, 255, 0.25) 65%,
          rgba(255, 255, 255, 0) 100%
        );
        transform: translateX(-50%);
      }
    }

    @include mobile-only {
      grid-column: 2;
      grid-row: 1;
      align-self: center;
      width: 108px;
      height: 41px;
      padding: 0 14px;
      gap: 4px;
      font-size: 14px;

      &:lang(en) {
        width: 116px;
        padding-inline: 6px;
        font-size: 12px;
      }
    }
  }

  &__more-label {
    position: relative;
    z-index: 1;
    min-width: 0;
  }

  &__more-icon {
    position: relative;
    z-index: 1;
    flex-shrink: 0;
    display: block;
    width: 20px;
    height: 20px;

    @include mobile-only {
      width: 16px;
      height: 16px;
    }
  }

  &__tabs {
    display: flex;
    flex-wrap: nowrap;
    align-items: center;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;

    &::-webkit-scrollbar {
      display: none;
    }

    @include web-only {
      gap: 6px;
      min-width: 0;
      grid-column: 2;
      grid-row: 1;
      /* overflow-x: auto 会令 overflow-y 变为 auto，子元素 box-shadow 会被裁切；留出与阴影相当的底部内边距 */
      padding-bottom: 14px;
    }

    @include mobile-only {
      gap: 10px;
      grid-column: 1 / -1;
      grid-row: 2;
      width: 100%;
      min-width: 0;
      padding-bottom: 12px;
      margin: 0;
    }
  }

  &__tab {
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    cursor: pointer;
    font-family: $font-family-base;
    border: none;
    transition:
      background 0.2s ease,
      border-color 0.2s ease,
      color 0.2s ease,
      box-shadow 0.2s ease;

    @include web-only {
      min-width: 120px;
      min-height: 40px;
      padding: 10px 14px;
      gap: 10px;
      border-radius: 48px;
      border: 1px solid #d6e0eb;
      background: #EAF1F9;
      box-shadow: 0 2px 8px rgba(21, 58, 119, 0.1);
      font-size: 16px;
      font-weight: 400;
      line-height: 1;
      letter-spacing: 0;
      color: var(--theme-text);

      &:hover:not(.hot-events__tab--active) {
        border-color: rgba(31, 124, 255, 0.45);
        background: #f5f9ff;
        box-shadow: 0 3px 10px rgba(21, 58, 119, 0.12);
      }

      &--active {
        border-color: #1f7cff;
        background: #f0f7ff;
        color: #1f7cff;
        box-shadow: 0 3px 10px rgba(21, 58, 119, 0.14);
      }
    }

    @include mobile-only {
      height: 26px;
      min-width: 70px;
      padding: 0 10px;
      gap: 4px;
      border-radius: 48px;
      border: 1px solid rgba(214, 224, 235, 0.55);
      background: transparent;
      box-shadow: none;
      font-size: 12px;
      font-weight: 400;
      line-height: 1;
      color: var(--theme-text);

      &--active {
        border: 1px solid #1f7cff;
        background: #fff;
        color: #1f7cff;
        box-shadow: 0 3px 8px 0 rgba(21, 58, 119, 0.1);
      }
    }
  }

  &__tab-icon {
    flex-shrink: 0;
    object-fit: contain;
    display: block;

    @include web-only {
      width: 24px;
      height: 24px;
    }

    @include mobile-only {
      width: 18px;
      height: 18px;
    }
  }

  &__tab-label {
    white-space: nowrap;
  }

  &__loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 48px 16px;
    color: var(--theme-text-1);
    font-size: $font-size-md;
  }

  &__spinner {
    width: 28px;
    height: 28px;
    border: 3px solid var(--theme-divider);
    border-top-color: var(--theme-primary);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  &__error {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 48px 16px;
    color: var(--theme-text-1);
    font-size: $font-size-md;
  }

  &__retry {
    padding: 8px 24px;
    border-radius: $radius-pill;
    border: 1.5px solid var(--theme-primary);
    background: transparent;
    color: var(--theme-primary);
    font-size: $font-size-md;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
      background: var(--theme-primary);
      color: #fff;
    }
  }

  &__grid {
    display: grid;
    gap: 20px;

    @include web-only {
      grid-template-columns: repeat(4, 1fr);
    }

    @include mobile-only {
      grid-template-columns: 1fr;
      gap: 10px;
    }
  }

  &__more-wrap {
    display: flex;
    justify-content: center;
    margin-top: 20px;
  }

  &__load-more {
    min-width: 120px;
    padding: 10px 24px;
    border-radius: $radius-pill;
    border: 1.5px solid var(--theme-primary);
    background: transparent;
    color: var(--theme-primary);
    font-size: $font-size-md;
    cursor: pointer;
    transition: all 0.2s;

    &:hover:not(:disabled) {
      background: var(--theme-primary);
      color: #fff;
    }

    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  }
}
</style>
