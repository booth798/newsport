<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';

import { fetchLeagueList, fetchMarketListPaged, fetchMarketListCounts } from '@/api/match';
import { useAppStore } from '@/store/modules/app';
import { useLeagueFilterStore } from '@/store/modules/leagueFilter';
import EmptyState from '@/components/EmptyState.vue';
import HomeMatchCard from '@/views/Home/components/HomeMatchCard.vue';

import iconEventsUrl from '@/assets/images/events/icon_events.svg?url';

const { t, locale } = useI18n();
const router = useRouter();
const appStore = useAppStore();
const { isMobile } = storeToRefs(appStore);
const filterStore = useLeagueFilterStore();
const { selectedLeagues, isAllSelected } = storeToRefs(filterStore);

const leagues = ref([]);
const matches = ref([]);
const loading = ref(true);
const loadingMore = ref(false);
const error = ref(false);
const searchQuery = ref('');
const activeLeague = ref('全部');      // 当前 PC 联赛 Tab 的 key（仅用于高亮）
const activeLeagueValue = ref(null);   // 当前 PC 联赛 Tab 传给接口的 league 值（联赛名）

const activeFilter = ref('all');
const matchCounts = ref({ all: 0, today: 0, tomorrow: 0 });
const pageNum = ref(1);
const hasMore = ref(false);
const PAGE_SIZE = 20;
// 市场页仅展示全场盘口，对齐安卓端 period=FT（避免半场盘口造成同一赛事重复）。
const MARKET_PERIOD = 'FT';

/** 依据当前语言取联赛展示名（zh 用简称、en 用全称），用作 PC 联赛 Tab 的接口 league 过滤值。 */
function leagueDisplayName(league) {
  const name = (league.name || '').trim();
  const shortName = (league.shortName || '').trim();
  const isEn = String(locale.value || '').toLowerCase().startsWith('en');
  return isEn ? (name || shortName) : (shortName || name);
}

/** 当前生效的联赛过滤列表（联赛名数组；无筛选时为 [null]），对齐安卓 leagueFilters()。 */
function currentLeagueFilters() {
  if (isMobile.value) {
    // 移动端使用联赛筛选弹层（多选）；全选或未选均视为不加 league 过滤。
    if (isAllSelected.value || selectedLeagues.value.length === 0) return [null];
    return [...selectedLeagues.value];
  }
  // PC 端使用联赛 Tab（单选）。
  return activeLeagueValue.value ? [activeLeagueValue.value] : [null];
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

  const results = await Promise.all(
    leagueList.map((lg) =>
      fetchMarketListPaged({
        pageNum: page,
        pageSize: PAGE_SIZE,
        day,
        league: lg || undefined,
        period: MARKET_PERIOD,
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
    const leagueRes = await fetchLeagueList().catch(() => ({ data: [] }));
    leagues.value = leagueRes.data || [];
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

const trimmedQuery = computed(() => searchQuery.value.trim());
const hasQuery = computed(() => trimmedQuery.value.length > 0);

const leagueTabs = computed(() => [
  { key: '全部', label: '全部', value: null },
  ...leagues.value.slice(0, isMobile.value ? 5 : 8).map((item) => ({
    key: item.name || item.key || item.id,
    label: item.shortName || item.name || item.key,
    value: leagueDisplayName(item),
  })),
]);

const filteredMatches = computed(() => {
  let list = matches.value;
  // 联赛过滤已由服务端 league 参数完成，这里只做搜索过滤。
  if (hasQuery.value) {
    const q = trimmedQuery.value.toLowerCase();
    list = list.filter((m) =>
      [m.league, m.homeTeam, m.awayTeam, m.date].filter(Boolean).join(' ').toLowerCase().includes(q),
    );
  }
  return list;
});

function selectLeague(tab) {
  if (activeLeague.value === tab.key) return;
  activeLeague.value = tab.key;
  activeLeagueValue.value = tab.value ?? null;
  reload();
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
  router.push('/market/filter');
}

function goToSearch() {
  router.push('/market/search');
}

const filterTags = computed(() => [
  { key: 'all', label: t('全部赛事'), count: matchCounts.value.all },
  { key: 'today', label: t('今日赛事'), count: matchCounts.value.today },
  { key: 'tomorrow', label: t('明日赛事'), count: matchCounts.value.tomorrow },
]);

// 移动端联赛筛选（来自筛选弹层）变化时重新加载。
watch([selectedLeagues, isAllSelected], () => {
  if (isMobile.value) reload();
});
</script>

<template>
  <div class="market-leagues">
    <section class="market-leagues__panel" aria-labelledby="market-leagues-title">
      <!-- PC 标题 + 搜索 -->
      <header v-if="!isMobile" class="market-leagues__head">
        <div class="market-leagues__title-wrap">
          <img
            class="market-leagues__title-icon"
            :src="iconEventsUrl"
            width="48"
            height="48"
            alt=""
            aria-hidden="true"
          />
          <h2 id="market-leagues-title" class="market-leagues__title">{{ t('全部赛事') }}</h2>
        </div>
        <label class="market-leagues__search" :aria-label="t('搜索')">
          <span class="market-leagues__search-icon" aria-hidden="true" />
          <input
            v-model="searchQuery"
            type="search"
            class="market-leagues__search-input"
            :placeholder="t('搜索')"
            autocomplete="off"
          />
        </label>
      </header>

      <!-- H5 筛选栏 -->
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

      <!-- PC 联赛 Tab -->
      <div v-if="!isMobile" class="market-leagues__tabs">
        <button
          v-for="tab in leagueTabs"
          :key="tab.key"
          type="button"
          class="market-leagues__tab"
          :class="{ 'market-leagues__tab--active': activeLeague === tab.key }"
          @click="selectLeague(tab)"
        >
          {{ t(tab.label) }}
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
        v-else-if="filteredMatches.length === 0"
        :text="t('暂无相关赛事')"
      />

      <!-- 列表 -->
      <div v-else class="market-leagues__grid">
        <HomeMatchCard
          v-for="match in filteredMatches"
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
      border-radius: 50px;
      padding: 40px 24px;
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

  &__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 24px;
    margin-bottom: 32px;

    @include mobile-only {
      flex-direction: row;
      align-items: center;
      gap: 10px;
      margin-bottom: 12px;
    }
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
  }

  &__tabs {
    display: flex;
    align-items: center;
    gap: 10px;
    overflow-x: auto;
    padding-bottom: 2px;
    margin-bottom: 18px;
    scrollbar-width: none;

    &::-webkit-scrollbar { display: none; }

    @include web-only { margin-bottom: 24px; }
  }

  &__tab {
    flex: 0 0 auto;
    height: 34px;
    padding: 0 18px;
    border: 1px solid #d6e0eb;
    border-radius: $radius-pill;
    background: #fff;
    color: rgba(11, 52, 98, 0.72);
    font-size: $font-size-md;
    font-weight: 600;
    cursor: pointer;

    &--active {
      border-color: var(--theme-primary);
      background: var(--theme-primary);
      color: #fff;
      box-shadow: var(--shadow-primary-btn);
    }

    @include mobile-only {
      height: 30px;
      padding: 0 14px;
      font-size: $font-size-sm;
    }
  }

  &__title-wrap {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
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
      -webkit-text-fill-color: var(--theme-primary);
      color: var(--theme-primary);
      background: none;
    }
  }

  &__search {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
    width: 220px;
    max-width: 100%;
    height: 44px;
    padding: 0 16px;
    border-radius: $radius-pill;
    border: 1px solid #d6e0eb;
    background: #fff;
    box-sizing: border-box;
    cursor: text;

    @include mobile-only {
      width: 100%;
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
