<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useI18n } from 'vue-i18n';

import { useAppStore } from '@/store/modules/app';
import EmptyState from '@/components/EmptyState.vue';
import HomeMatchCard from './HomeMatchCard.vue';
import { fetchHotMatches, fetchHotLeagues, fetchHomeLeagueMatches } from '@/api/match';

import iconEventsUrl from '@/assets/images/events/icon_events.svg?url';
import iconHotUrl from '@/assets/images/events/icon_hot.svg?url';
import iconMoreUrl from '@/assets/images/events/icon_more.svg?url';

const { t } = useI18n();
const appStore = useAppStore();
const { isMobile } = storeToRefs(appStore);

const props = defineProps({
  preloadedMatches: { type: Array, default: () => [] },
});

const matchList = ref([]);
const loading = ref(true);
const error = ref(false);

watch(
  () => props.preloadedMatches,
  (val) => {
    if (val && val.length) {
      matchList.value = val;
      loading.value = false;
      error.value = false;
    }
  },
  { immediate: true },
);

const dynamicLeagueTabs = ref([]);

onMounted(async () => {
  if (matchList.value.length) {
    loading.value = false;
    loadLeagueTabs();
    return;
  }
  // 父组件通过 /api/home 提供 preloadedMatches，watcher 会即时更新 UI。
  // 给父组件数据一个到达窗口，避免请求不存在的 /matches/hot。
  await new Promise((r) => setTimeout(r, 3000));
  if (matchList.value.length) {
    loadLeagueTabs();
    return;
  }
  try {
    loading.value = true;
    error.value = false;
    const res = await fetchHotMatches();
    matchList.value = res.data || [];
  } catch {
    error.value = true;
  } finally {
    loading.value = false;
  }
  loadLeagueTabs();
});

async function loadLeagueTabs() {
  try {
    // 对齐安卓首页：热门联赛 Tab 取自 /leagues/hot。
    const res = await fetchHotLeagues();
    const hotLeagues = res.data || [];
    // 使用联赛 id 作为 key，避免同名联赛（如 Serie A）导致 Tab 重复选中；
    // query 取联赛名（回退简称），用作 /markets/list 的 league 过滤值（对齐安卓 leagueQuery）。
    dynamicLeagueTabs.value = hotLeagues.map(l => ({
      key: l.id,
      query: (l.name || '').trim() || (l.shortName || '').trim(),
      labelKey: `${l.shortName || l.name}赛事`,
      shortLabelKey: l.shortName || l.name,
      icon: l.logoUrl || iconEventsUrl,
    }));
  } catch { /* 静默 */ }
}

// 各联赛 Tab 的赛事数据缓存（key → 已归并赛事数组），避免重复请求。
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
  activeLeague.value = key;
  scrollTabToCenter(key);
  // 联赛 Tab：切换时按需请求该联赛盘口（对齐安卓首页联赛 Tab 拉取 /markets/list）。
  if (key !== 'hot') loadLeagueTab(key);
}

// 当前展示的赛事：热门 Tab 用首页 hotMarkets；联赛 Tab 用该联赛请求结果。
const displayMatches = computed(() => {
  if (activeLeague.value === 'hot') return matchList.value;
  return leagueMatchesCache.value[activeLeague.value] || [];
});

// 三态随当前 Tab 切换：热门 Tab 用首页加载态，联赛 Tab 用其独立加载态。
const isLoading = computed(() =>
  activeLeague.value === 'hot' ? loading.value : tabLoading.value,
);
const isError = computed(() =>
  activeLeague.value === 'hot' ? error.value : tabError.value,
);

async function reload() {
  try {
    loading.value = true;
    error.value = false;
    const res = await fetchHotMatches();
    matchList.value = res.data || [];
  } catch {
    error.value = true;
  } finally {
    loading.value = false;
  }
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
    <div v-else class="hot-events__grid">
      <HomeMatchCard v-for="match in displayMatches" :key="match.id" :match="match" />
    </div>
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
}
</style>
