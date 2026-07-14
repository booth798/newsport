<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';

import { fetchLeagueList, fetchMarketListPaged, fetchMarketListCounts } from '@/api/match';
import { useAppStore } from '@/store/modules/app';
import HomeMatchCard from '@/views/Home/components/HomeMatchCard.vue';

import iconEventsUrl from '@/assets/images/events/icon_events.svg?url';

const { t } = useI18n();
const router = useRouter();
const appStore = useAppStore();
const { isMobile } = storeToRefs(appStore);

const leagues = ref([]);
const matches = ref([]);
const loading = ref(true);
const loadingMore = ref(false);
const error = ref(false);
const searchQuery = ref('');
const activeLeague = ref('全部');

const activeFilter = ref('all');
const matchCounts = ref({ all: 0, today: 0, tomorrow: 0 });
const pageNum = ref(1);
const hasMore = ref(false);
const PAGE_SIZE = 20;

const selectedLeagueNames = ref([]);

async function loadInitial() {
  try {
    loading.value = true;
    error.value = false;

    const [leagueRes, marketRes, countsRes] = await Promise.all([
      fetchLeagueList().catch(() => ({ data: [] })),
      fetchMarketListPaged({ pageSize: PAGE_SIZE, day: 'all' }).catch(() => null),
      fetchMarketListCounts().catch(() => null),
    ]);

    leagues.value = leagueRes.data || [];
    processMarketResponse(marketRes, false);
    processCounts(countsRes);
  } catch {
    leagues.value = [];
    matches.value = [];
    error.value = true;
  } finally {
    loading.value = false;
  }
}

function processMarketResponse(res, append) {
  if (!res?.data) {
    if (!append) matches.value = [];
    return;
  }
  const page = res.data;
  const records = page.records || [];
  const normalized = records.map(normalizeMarketRecord);

  if (append) {
    const existingIds = new Set(matches.value.map((m) => m._dedupeKey));
    const newItems = normalized.filter((m) => !existingIds.has(m._dedupeKey));
    matches.value = [...matches.value, ...newItems];
  } else {
    matches.value = normalized;
  }

  const total = page.total;
  const pages = page.pages;
  const current = page.current || pageNum.value;
  const size = page.size || PAGE_SIZE;
  hasMore.value = pages != null
    ? current < pages
    : total != null
      ? current * size < total
      : records.length >= PAGE_SIZE;
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

function processCounts(res) {
  if (!res?.data) return;
  const d = res.data;
  matchCounts.value = {
    all: d.all ?? d.total ?? 0,
    today: d.today ?? 0,
    tomorrow: d.tomorrow ?? 0,
  };
}

onMounted(loadInitial);

const trimmedQuery = computed(() => searchQuery.value.trim());
const hasQuery = computed(() => trimmedQuery.value.length > 0);

const leagueTabs = computed(() => [
  { key: '全部', label: '全部' },
  ...leagues.value.slice(0, isMobile.value ? 5 : 8).map((item) => ({
    key: item.name || item.key,
    label: item.shortName || item.name || item.key,
  })),
]);

const filteredMatches = computed(() => {
  let list = matches.value;
  if (activeLeague.value !== '全部' && !isMobile.value) {
    list = list.filter((m) => m.league === activeLeague.value);
  }
  if (hasQuery.value) {
    const q = trimmedQuery.value.toLowerCase();
    list = list.filter((m) =>
      [m.league, m.homeTeam, m.awayTeam, m.date].filter(Boolean).join(' ').toLowerCase().includes(q),
    );
  }
  return list;
});

function selectLeague(leagueKey) {
  activeLeague.value = leagueKey;
  pageNum.value = 1;
  loadWithFilters();
}

async function loadWithFilters() {
  try {
    loading.value = true;
    error.value = false;
    pageNum.value = 1;

    const dayParam = activeFilter.value === 'today' ? 'today'
      : activeFilter.value === 'tomorrow' ? 'tomorrow' : 'all';
    const leagueParam = activeLeague.value !== '全部' ? activeLeague.value : undefined;

    if (selectedLeagueNames.value.length > 0) {
      const results = await Promise.all(
        selectedLeagueNames.value.map((name) =>
          fetchMarketListPaged({ pageSize: PAGE_SIZE, day: dayParam, league: name }).catch(() => null),
        ),
      );
      const allRecords = [];
      const seen = new Set();
      for (const res of results) {
        for (const r of (res?.data?.records || [])) {
          const key = r.marketId || `${r.matchId}:${r.period}`;
          if (!seen.has(key)) {
            seen.add(key);
            allRecords.push(normalizeMarketRecord(r));
          }
        }
      }
      matches.value = allRecords;
      hasMore.value = false;
    } else {
      const res = await fetchMarketListPaged({
        pageSize: PAGE_SIZE,
        day: dayParam,
        league: leagueParam,
      });
      processMarketResponse(res, false);
    }
  } catch {
    matches.value = [];
    error.value = true;
  } finally {
    loading.value = false;
  }
}

async function selectFilter(key) {
  if (activeFilter.value === key) return;
  activeFilter.value = key;
  await loadWithFilters();
}

function loadMore() {
  if (loadingMore.value || !hasMore.value) return;
  loadingMore.value = true;
  const dayParam = activeFilter.value === 'today' ? 'today'
    : activeFilter.value === 'tomorrow' ? 'tomorrow' : 'all';
  const leagueParam = activeLeague.value !== '全部' ? activeLeague.value : undefined;
  const nextPage = pageNum.value + 1;

  fetchMarketListPaged({ pageNum: nextPage, pageSize: PAGE_SIZE, day: dayParam, league: leagueParam })
    .then((res) => {
      pageNum.value = nextPage;
      processMarketResponse(res, true);
    })
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

watch(selectedLeagueNames, () => {
  loadWithFilters();
});

function onFilterResult(names) {
  selectedLeagueNames.value = names || [];
}

defineExpose({ onFilterResult });
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
          @click="selectLeague(tab.key)"
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
      <div v-else-if="filteredMatches.length === 0" class="market-leagues__state market-leagues__state--empty">
        <p>{{ t('暂无相关赛事') }}</p>
      </div>

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
    padding: 0 12px;
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
