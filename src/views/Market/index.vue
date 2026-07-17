<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';

import { fetchMarketListPaged, fetchMarketListCounts } from '@/api/match';
import { useAppStore } from '@/store/modules/app';
import { useLeagueFilterStore } from '@/store/modules/leagueFilter';
import EmptyState from '@/components/EmptyState.vue';
import HomeMatchCard from '@/views/Home/components/HomeMatchCard.vue';
import MarketLeagueFilterPopover from './components/MarketLeagueFilterPopover.vue';

const { t } = useI18n();
const router = useRouter();
const appStore = useAppStore();
const { isMobile } = storeToRefs(appStore);
const filterStore = useLeagueFilterStore();
const { selectedLeagues, isAllSelected } = storeToRefs(filterStore);

const matches = ref([]);
const loading = ref(true);
const loadingMore = ref(false);
const error = ref(false);
const searchQuery = ref('');
const trimmedQuery = computed(() => searchQuery.value.trim());
/** PC 联赛筛选弹层开关（H5 仍跳转筛选页） */
const filterPanelOpen = ref(false);

const activeFilter = ref('all');
const matchCounts = ref({ all: 0, today: 0, tomorrow: 0 });
const pageNum = ref(1);
const hasMore = ref(false);
const PAGE_SIZE = 20;
// 市场页仅展示全场盘口，对齐安卓端 period=FT（避免半场盘口造成同一赛事重复）。
const MARKET_PERIOD = 'FT';

/** 当前生效的联赛过滤列表。
 * - 全选：返回 [null]（不加 league 参数）
 * - 自选有勾选：返回联赛名数组
 * - 全部不选：返回 []（列表为空）
 */
function currentLeagueFilters() {
  if (isAllSelected.value) return [null];
  if (selectedLeagues.value.length === 0) return [];
  return [...selectedLeagues.value];
}

function currentDay() {
  return activeFilter.value === 'today' ? 'today'
    : activeFilter.value === 'tomorrow' ? 'tomorrow' : 'all';
}

function computeHasMore(page, requestedPage) {
  if (!page) return false;
  const total = page.total;
  const pages = page.pages;
  const current = page.current || requestedPage;
  const size = page.size || PAGE_SIZE;
  const recordsLen = (page.records || []).length;
  return pages != null
    ? current < pages
    : total != null
      ? current * size < total
      : recordsLen >= PAGE_SIZE;
}

/** 拉取市场列表（可翻页/追加）：按当前联赛过滤逐个请求后合并去重，对齐安卓 loadPage。 */
async function loadMarkets(append) {
  const day = currentDay();
  const leagueList = currentLeagueFilters();
  const page = append ? pageNum.value + 1 : 1;
  // PC/H5 球队搜索统一走服务端 teamName，并固定全场 period=FT
  const teamName = trimmedQuery.value || undefined;

  // 全部不选：不发请求，直接空列表
  if (leagueList.length === 0) {
    matches.value = append ? matches.value : [];
    pageNum.value = page;
    hasMore.value = false;
    return;
  }

  const results = await Promise.all(
    leagueList.map((lg) =>
      fetchMarketListPaged({
        pageNum: page,
        pageSize: PAGE_SIZE,
        day,
        league: lg || undefined,
        period: MARKET_PERIOD,
        teamName,
      }).catch(() => null),
    ),
  );

  const seen = new Set(append ? matches.value.map((m) => m._dedupeKey) : []);
  const merged = [];
  for (const res of results) {
    for (const r of (res?.data?.records || [])) {
      const norm = normalizeMarketRecord(r);
      if (!seen.has(norm._dedupeKey)) {
        seen.add(norm._dedupeKey);
        merged.push(norm);
      }
    }
  }

  matches.value = append ? [...matches.value, ...merged] : merged;
  pageNum.value = page;
  // 多联赛合并结果各自分页游标不同，不支持前端翻页；仅单请求时依据分页信息判断。
  hasMore.value = leagueList.length === 1 ? computeHasMore(results[0]?.data, page) : false;
}

/** 拉取各 Tab 场次统计（all/today/tomorrow），按联赛过滤求和，对齐安卓 marketCounts(period=FT)。 */
async function loadCounts() {
  const leagueList = currentLeagueFilters();
  if (leagueList.length === 0) {
    matchCounts.value = { all: 0, today: 0, tomorrow: 0 };
    return;
  }
  const results = await Promise.all(
    leagueList.map((lg) =>
      fetchMarketListCounts({ league: lg || undefined, period: MARKET_PERIOD }).catch(() => null),
    ),
  );
  const sum = (key, fallbackKey) => results.reduce((acc, r) => {
    const d = r?.data;
    if (!d) return acc;
    const v = d[key] ?? (fallbackKey ? d[fallbackKey] : 0) ?? 0;
    return acc + Number(v || 0);
  }, 0);
  matchCounts.value = {
    all: sum('all', 'total'),
    today: sum('today'),
    tomorrow: sum('tomorrow'),
  };
}

async function loadInitial() {
  try {
    loading.value = true;
    error.value = false;
    pageNum.value = 1;
    await Promise.all([loadMarkets(false), loadCounts()]);
  } catch {
    matches.value = [];
    error.value = true;
  } finally {
    loading.value = false;
  }
}

/** 按当前筛选重新加载（保留 loading 态） */
async function reload() {
  try {
    loading.value = true;
    error.value = false;
    pageNum.value = 1;
    await Promise.all([loadMarkets(false), loadCounts()]);
  } catch {
    matches.value = [];
    error.value = true;
  } finally {
    loading.value = false;
  }
}

function normalizeMarketRecord(r) {
  return {
    id: r.matchId || r.marketId || r.id,
    _dedupeKey: r.marketId || `${r.matchId}:${r.period}`,
    matchId: r.matchId,
    marketId: r.marketId,
    period: r.period,
    league: r.leagueShortName || r.leagueName || '',
    leagueId: r.leagueId,
    leagueIcon: r.leagueLogoUrl || '',
    homeTeam: r.homeTeamShortName || r.homeTeamName || '',
    awayTeam: r.awayTeamShortName || r.awayTeamName || '',
    homeTeamLogo: r.homeTeamLogoUrl || '',
    awayTeamLogo: r.awayTeamLogoUrl || '',
    kickoffAt: r.kickoffAt,
    date: r.kickoffAt ? r.kickoffAt.split('T')[0] : '',
    feeRate: r.feeRate,
    displayPool: r.displayPool,
    scores: r.scores || [],
    topPools: (r.scores || []).slice(0, 3).map((s) => ({
      score: s.score,
      probability: s.yieldPct != null ? `${Number(s.yieldPct).toFixed(2)}%` : '--',
      yieldPct: s.yieldPct,
      poolAmount: s.poolAmount,
      suspended: s.suspended,
    })),
    hotMarkets: r.hotMarkets || [],
  };
}

onMounted(loadInitial);

/**
 * PC 搜索对齐 H5 搜索页：回车触发服务端 teamName 查询；
 * 清空关键词后恢复当前筛选下的完整列表（不再做本地字符串过滤）。
 */
function onSearchEnter(e) {
  e?.preventDefault?.();
  if (!trimmedQuery.value) return;
  reload();
}

function onSearchInput() {
  if (!trimmedQuery.value) {
    reload();
  }
}

async function selectFilter(key) {
  if (activeFilter.value === key) return;
  activeFilter.value = key;
  await reload();
}

function loadMore() {
  if (loadingMore.value || !hasMore.value) return;
  loadingMore.value = true;
  loadMarkets(true)
    .catch(() => {})
    .finally(() => { loadingMore.value = false; });
}

function goToLeagueFilter() {
  // PC：打开 Figma 样式筛选弹层；H5：进入筛选页（不改动）
  if (isMobile.value) {
    router.push('/market/filter');
    return;
  }
  filterPanelOpen.value = !filterPanelOpen.value;
}

const filterTags = computed(() => [
  { key: 'all', label: t('全部赛事'), count: matchCounts.value.all },
  { key: 'today', label: t('今日赛事'), count: matchCounts.value.today },
  { key: 'tomorrow', label: t('明日赛事'), count: matchCounts.value.tomorrow },
]);

// 联赛筛选（筛选页写入 store）变化时重新加载，PC/H5 共用。
watch([selectedLeagues, isAllSelected], () => {
  reload();
});
</script>

<template>
  <div class="market-leagues">
    <section class="market-leagues__panel" aria-labelledby="market-leagues-title">
      <h2 id="market-leagues-title" class="visually-hidden">{{ t('全部赛事') }}</h2>

      <!-- PC 工具栏：筛选 + 日期间 Tab + 搜索（对齐 Figma 截图，复用 H5 筛选能力） -->
      <div v-if="!isMobile" class="market-leagues__toolbar">
        <div class="market-leagues__filter-bar market-leagues__filter-bar--pc">
          <div class="market-leagues__filter-anchor">
            <button
              type="button"
              class="market-leagues__filter-btn"
              :class="{ 'market-leagues__filter-btn--open': filterPanelOpen }"
              data-league-filter-trigger
              :aria-label="t('联赛筛选')"
              :aria-expanded="filterPanelOpen"
              @click="goToLeagueFilter"
            >
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <rect x="0.5" y="0.5" width="39" height="39" rx="19.5" stroke="#1C7BFF" stroke-width="1"/>
                <path d="M25.154 21.538H29.769M29.769 26.154H25.154M25.154 30.769H29.769M9.231 9.231H29.744L22.051 19.259V33.846L16.069 31.111V19.259L9.231 9.231Z" stroke="#1C7BFF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
            <MarketLeagueFilterPopover v-model="filterPanelOpen" />
          </div>
          <button
            v-for="tag in filterTags"
            :key="tag.key"
            type="button"
            class="market-leagues__filter-tag"
            :class="{ 'market-leagues__filter-tag--active': activeFilter === tag.key }"
            @click="selectFilter(tag.key)"
          >
            {{ tag.label }}({{ tag.count }})
          </button>
        </div>
        <label class="market-leagues__search" :aria-label="t('搜索球队名称')">
          <span class="market-leagues__search-icon" aria-hidden="true" />
          <input
            v-model="searchQuery"
            type="search"
            class="market-leagues__search-input"
            :placeholder="t('搜索球队名称')"
            autocomplete="off"
            enterkeyhint="search"
            @keydown.enter.prevent="onSearchEnter"
            @input="onSearchInput"
          />
        </label>
      </div>

      <!-- H5 筛选栏（保持原样，不改动） -->
      <div v-if="isMobile" class="market-leagues__filter-bar">
        <button
          type="button"
          class="market-leagues__filter-btn"
          :aria-label="t('联赛筛选')"
          @click="goToLeagueFilter"
        >
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <rect x="0.4" y="0.4" width="31.2" height="31.2" rx="15.6" stroke="#1C7BFF" stroke-width="0.8"/>
            <path d="M20.9232 17.2307H24.6155M24.6155 20.923H20.9232M20.9232 24.6153H24.6155M7.38477 7.38452H23.795L17.6412 15.4073V27.0768L12.8549 24.8888V15.4073L7.38477 7.38452Z" stroke="#1C7BFF" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <button
          v-for="tag in filterTags"
          :key="tag.key"
          type="button"
          class="market-leagues__filter-tag"
          :class="{ 'market-leagues__filter-tag--active': activeFilter === tag.key }"
          @click="selectFilter(tag.key)"
        >
          {{ tag.label }}({{ tag.count }})
        </button>
      </div>

      <!-- 状态 -->
      <div v-if="loading" class="market-leagues__state">
        <div class="market-leagues__spinner" />
        <span>{{ t('加载中') }}</span>
      </div>
      <div v-else-if="error" class="market-leagues__state">
        <span>{{ t('加载失败') }}</span>
        <button type="button" class="market-leagues__retry" @click="loadInitial">{{ t('重试') }}</button>
      </div>
      <EmptyState
        v-else-if="matches.length === 0"
        :text="t('暂无相关赛事')"
      />

      <!-- 列表 -->
      <div v-else class="market-leagues__grid">
        <HomeMatchCard
          v-for="match in matches"
          :key="match._dedupeKey || match.id"
          :match="match"
        />
      </div>

      <!-- 加载更多 -->
      <div v-if="!loading && hasMore" class="market-leagues__load-more">
        <button v-if="!loadingMore" type="button" class="market-leagues__load-more-btn" @click="loadMore">
          {{ t('加载更多') }}
        </button>
        <div v-else class="market-leagues__spinner" />
      </div>
    </section>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/tools.scss' as *;

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.market-leagues {
  @include container;
  @include web-main-column-max;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;

  @include web-only {
    padding-top: 20px;
    padding-bottom: 60px;
  }

  @include mobile-only {
    padding-top: 8px;
    padding-bottom: 30px;
  }

  &__panel {
    width: 100%;
    box-sizing: border-box;
    background: var(--surface-card);
    border: 1.5px solid var(--auxiliary-1);
    box-shadow: var(--shadow-card);

    @include web-only {
      position: relative;
      overflow: visible;
      border-radius: 50px;
      padding: 32px 24px 40px;
      box-shadow: 0 4px 8px 0 rgba(21, 58, 119, 0.18);
    }

    @include mobile-only {
      border-radius: 16px;
      padding: 16px 12px;
      background: #eaf1f9;
      border: 0.8px solid #fff;
      box-shadow: none;
    }
  }

  // PC：左侧筛选 + 右侧搜索（对齐截图）
  &__toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
    margin-bottom: 28px;
    position: relative;
    z-index: 5;
    overflow: visible;
  }

  &__filter-bar {
    display: flex;
    align-items: center;
    gap: 6px;
    overflow-x: auto;
    padding-bottom: 2px;
    margin-bottom: 12px;
    scrollbar-width: none;

    &::-webkit-scrollbar { display: none; }

    &--pc {
      flex: 1;
      min-width: 0;
      gap: 10px;
      margin-bottom: 0;
      padding-bottom: 0;
      overflow: visible;
    }
  }

  &__filter-btn {
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    padding: 0;
    border: none;
    background: transparent;
    cursor: pointer;

    @include web-only {
      width: 40px;
      height: 40px;
    }
  }

  &__filter-anchor {
    position: relative;
    flex: 0 0 auto;
  }

  &__filter-tag {
    flex: 0 0 auto;
    height: 32px;
    padding: 0 16px;
    border: 0.8px solid #d6e0eb;
    border-radius: 48px;
    background: #fff;
    color: #0b3462;
    font-family: $font-family-base;
    font-size: $font-size-sm;
    font-weight: 400;
    white-space: nowrap;
    cursor: pointer;
    box-shadow: 0 3px 8px rgba(21, 58, 119, 0.1);

    &--active {
      border-color: #1c7bff;
      background: #1c7bff;
      color: #fff;
      font-weight: 500;
    }

    // PC 日期间 Tab：对齐截图更大字号与高度
    @include web-only {
      height: 40px;
      padding: 0 20px;
      border: 1px solid #d6e0eb;
      font-size: 16px;
      color: #1c7bff;
      box-shadow: 0 3px 8px rgba(21, 58, 119, 0.1);

      &:not(.market-leagues__filter-tag--active) {
        background: #fff;
        border-color: rgba(28, 123, 255, 0.35);
      }

      &--active {
        border-color: #1c7bff;
        background: #1c7bff;
        color: #fff;
        font-weight: 500;
      }
    }
  }

  &__search {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
    width: 280px;
    max-width: 100%;
    height: 44px;
    padding: 0 16px;
    border-radius: $radius-pill;
    border: 1px solid #d6e0eb;
    background: #fff;
    box-sizing: border-box;
    cursor: text;
    box-shadow: 0 3px 8px rgba(21, 58, 119, 0.08);

    @include web-only {
      width: 320px;
      height: 40px;
    }

    &:focus-within {
      border-color: rgba(31, 124, 255, 0.45);
      box-shadow: 0 0 0 2px rgba(31, 124, 255, 0.08);
    }
  }

  &__search-icon {
    flex-shrink: 0;
    width: 18px;
    height: 18px;
    background: center / contain no-repeat url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 18 18' fill='none'%3E%3Ccircle cx='8' cy='8' r='5.25' stroke='%2394A8C4' stroke-width='1.2'/%3E%3Cpath d='M12.5 12.5L16 16' stroke='%2394A8C4' stroke-width='1.2' stroke-linecap='round'/%3E%3C/svg%3E");
  }

  &__search-input {
    flex: 1;
    min-width: 0;
    border: none;
    outline: none;
    background: transparent;
    font-size: $font-size-md;
    color: #0b3462;

    &::placeholder { color: rgba(11, 52, 98, 0.4); }
    &::-webkit-search-cancel-button { display: none; }
  }

  &__grid {
    display: grid;
    gap: 20px;

    @include web-only { grid-template-columns: repeat(4, minmax(0, 1fr)); }
    @include mobile-only { grid-template-columns: 1fr; gap: 10px; }
  }

  &__load-more {
    display: flex;
    justify-content: center;
    padding: 16px 0;
  }

  &__load-more-btn {
    height: 36px;
    padding: 0 24px;
    border: 1px solid #e4f0fe;
    border-radius: 18px;
    background: #fff;
    color: #1c7bff;
    font-size: 13px;
    cursor: pointer;
  }

  &__state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    min-height: 200px;
    color: var(--theme-text-1);
    font-size: $font-size-md;

    &--empty p {
      margin: 0;
      color: rgba(11, 52, 98, 0.45);
      font-size: $font-size-base;
      text-align: center;
    }
  }

  &__spinner {
    width: 28px;
    height: 28px;
    border: 3px solid var(--theme-divider);
    border-top-color: var(--theme-primary);
    border-radius: 50%;
    animation: market-leagues-spin 0.8s linear infinite;
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
}

@keyframes market-leagues-spin {
  to { transform: rotate(360deg); }
}
</style>
