<script setup>
import { computed, nextTick, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';

import { fetchMarketListPaged } from '@/api/match';
import { useAppStore } from '@/store/modules/app';
import EmptyState from '@/components/EmptyState.vue';
import HomeMatchCard from '@/views/Home/components/HomeMatchCard.vue';

import iconNavBackMarketUrl from '@/assets/images/common/icon_nav_back_market.svg?url';

const { t } = useI18n();
const router = useRouter();
const appStore = useAppStore();
const { isMobile } = storeToRefs(appStore);

const searchInputRef = ref(null);
const searchQuery = ref('');
const allMatches = ref([]);
const loading = ref(false);
const hasSearched = ref(false);

const HOT_KEYWORDS = ['欧冠', '英超', '西甲', '德甲', '意甲', '法甲'];

const SEARCH_HISTORY_KEY = 'mysport:search-history';
const searchHistory = ref([]);

function loadHistory() {
  try {
    const raw = localStorage.getItem(SEARCH_HISTORY_KEY);
    searchHistory.value = raw ? JSON.parse(raw) : [];
  } catch {
    searchHistory.value = [];
  }
}

function saveHistory(keyword) {
  const kw = keyword.trim();
  if (!kw) return;
  const list = searchHistory.value.filter((h) => h !== kw);
  list.unshift(kw);
  searchHistory.value = list.slice(0, 10);
  localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(searchHistory.value));
}

function clearHistory() {
  searchHistory.value = [];
  localStorage.removeItem(SEARCH_HISTORY_KEY);
}

const trimmedQuery = computed(() => searchQuery.value.trim().toLowerCase());

const filteredMatches = computed(() => {
  if (!trimmedQuery.value) return [];
  return allMatches.value.filter((m) =>
    [m.league, m.homeTeam, m.awayTeam, m.date]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(trimmedQuery.value),
  );
});

const showInitial = computed(() => !hasSearched.value && !trimmedQuery.value);
const showEmpty = computed(() => hasSearched.value && trimmedQuery.value && filteredMatches.value.length === 0);
const showResults = computed(() => hasSearched.value && filteredMatches.value.length > 0);

// 与市场列表页一致：/markets/list 记录含盘口 scores（赔率）与 kickoffAt（开赛倒数），
// 映射出 topPools 供 HomeMatchCard 显示赔率，kickoffAt 供卡片计算实时倒数。
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
  };
}

async function loadAllMatches() {
  try {
    const res = await fetchMarketListPaged({ pageSize: 100, day: 'all' });
    const records = res?.data?.records ?? [];
    // 同一场比赛可能有多个盘口（FT/HT），按 matchId 去重，只展示一张卡片
    const seen = new Set();
    const list = [];
    for (const r of records) {
      const norm = normalizeMarketRecord(r);
      const key = norm.matchId || norm.id;
      if (key == null || seen.has(key)) continue;
      seen.add(key);
      list.push(norm);
    }
    allMatches.value = list;
  } catch {
    allMatches.value = [];
  }
}

function doSearch() {
  const kw = searchQuery.value.trim();
  if (!kw) return;
  saveHistory(kw);
  hasSearched.value = true;
}

function onHotKeyword(keyword) {
  searchQuery.value = keyword;
  doSearch();
}

function onHistoryKeyword(keyword) {
  searchQuery.value = keyword;
  doSearch();
}

function onInputChange() {
  if (!searchQuery.value.trim()) {
    hasSearched.value = false;
  }
}

function clearInput() {
  searchQuery.value = '';
  hasSearched.value = false;
  nextTick(() => searchInputRef.value?.focus());
}

function goBack() {
  router.back();
}

onMounted(async () => {
  loadHistory();
  loading.value = true;
  await loadAllMatches();
  loading.value = false;
  await nextTick();
  searchInputRef.value?.focus();
});
</script>

<template>
  <div class="search-page">
    <!-- H5：紧凑头（返回 + 居中标题）+ 独立搜索框行（对齐设计稿） -->
    <template v-if="isMobile">
      <header class="search-page__m-header">
        <button type="button" class="search-page__m-back" :aria-label="t('返回')" @click="goBack">
          <img :src="iconNavBackMarketUrl" width="36" height="36" alt="" />
        </button>
        <span class="search-page__m-title">{{ t('搜索') }}</span>
      </header>
      <div class="search-page__m-search">
        <label class="search-page__search-box">
          <svg class="search-page__search-icon" width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <circle cx="8" cy="8" r="5.25" stroke="#94A8C4" stroke-width="1.2"/>
            <path d="M12.5 12.5L16 16" stroke="#94A8C4" stroke-width="1.2" stroke-linecap="round"/>
          </svg>
          <input
            ref="searchInputRef"
            v-model="searchQuery"
            type="search"
            class="search-page__search-input"
            :placeholder="t('搜索球队名称')"
            autocomplete="off"
            enterkeyhint="search"
            @keydown.enter.prevent="doSearch"
            @input="onInputChange"
          />
          <button
            v-if="searchQuery"
            type="button"
            class="search-page__m-clear"
            :aria-label="t('清空')"
            @click="clearInput"
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <circle cx="10" cy="10" r="8" fill="#C3CFDF"/>
              <path d="M7.5 7.5l5 5M12.5 7.5l-5 5" stroke="#fff" stroke-width="1.3" stroke-linecap="round"/>
            </svg>
          </button>
        </label>
      </div>
    </template>

    <!-- 桌面端：原导航栏（返回 + 搜索框 + 搜索按钮），保持不变 -->
    <header v-else class="search-page__header">
      <div class="search-page__nav-bar">
        <button type="button" class="search-page__back" :aria-label="t('返回')" @click="goBack">
          <img :src="iconNavBackMarketUrl" width="36" height="36" alt="" />
        </button>
        <label class="search-page__search-box">
          <svg class="search-page__search-icon" width="16" height="16" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <circle cx="8" cy="8" r="5.25" stroke="#94A8C4" stroke-width="1.2"/>
            <path d="M12.5 12.5L16 16" stroke="#94A8C4" stroke-width="1.2" stroke-linecap="round"/>
          </svg>
          <input
            ref="searchInputRef"
            v-model="searchQuery"
            type="search"
            class="search-page__search-input"
            :placeholder="t('搜索赛事、联赛、球队')"
            autocomplete="off"
            enterkeyhint="search"
            @keydown.enter.prevent="doSearch"
            @input="onInputChange"
          />
        </label>
        <button type="button" class="search-page__search-btn" @click="doSearch">
          {{ t('搜索') }}
        </button>
      </div>
    </header>

    <!-- 加载中 -->
    <div v-if="loading" class="search-page__state">
      <div class="search-page__spinner" />
      <span>{{ t('加载中') }}</span>
    </div>

    <!-- 初始态：热门搜索 + 搜索历史 -->
    <div v-else-if="showInitial" class="search-page__initial">
      <section class="search-page__section">
        <h3 class="search-page__section-title">{{ t('热门搜索') }}</h3>
        <div class="search-page__tags">
          <button
            v-for="kw in HOT_KEYWORDS"
            :key="kw"
            type="button"
            class="search-page__tag"
            @click="onHotKeyword(kw)"
          >
            {{ kw }}
          </button>
        </div>
      </section>

      <section v-if="searchHistory.length" class="search-page__section">
        <div class="search-page__section-head">
          <h3 class="search-page__section-title">{{ t('搜索历史') }}</h3>
          <button type="button" class="search-page__clear-btn" @click="clearHistory">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M4 5h8v7.5a1.5 1.5 0 0 1-1.5 1.5h-5A1.5 1.5 0 0 1 4 12.5V5Z" stroke="#94A8C4" stroke-width="1"/>
              <path d="M2.5 5h11M6 3h4" stroke="#94A8C4" stroke-width="1" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
        <div class="search-page__tags">
          <button
            v-for="kw in searchHistory"
            :key="kw"
            type="button"
            class="search-page__tag search-page__tag--history"
            @click="onHistoryKeyword(kw)"
          >
            {{ kw }}
          </button>
        </div>
      </section>
    </div>

    <!-- 搜索结果 -->
    <div v-else-if="showResults" class="search-page__results">
      <p class="search-page__result-count">
        {{ t('搜索到') }} <strong>{{ filteredMatches.length }}</strong> {{ t('条相关赛事') }}
      </p>
      <div class="search-page__grid">
        <HomeMatchCard
          v-for="match in filteredMatches"
          :key="match.id"
          :match="match"
        />
      </div>
    </div>

    <!-- 无结果 -->
    <EmptyState
      v-else-if="showEmpty"
      :text="t('没有相关内容，请重新尝试')"
    />
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/tools.scss' as *;

.search-page {
  min-height: 100vh;
  min-height: 100dvh;
  background: #e3ecfb;
  box-sizing: border-box;

  @include mobile-only {
    padding-top: env(safe-area-inset-top, 0px);
    padding-bottom: 30px;
  }

  @include web-only {
    @include container;
    @include web-main-column-max;
    padding-top: 20px;
    padding-bottom: 60px;
  }

  &__header {
    @include mobile-only {
      position: sticky;
      top: 0;
      z-index: 10;
      padding: 6px 8px;
      box-sizing: border-box;
    }
  }

  &__nav-bar {
    display: flex;
    align-items: center;
    gap: 8px;

    @include mobile-only {
      height: 48px;
      padding: 0 8px;
      background: #eaf1f9;
      border: 0.8px solid #fff;
      border-radius: 30px;
      box-sizing: border-box;
    }

    @include web-only {
      margin-bottom: 20px;
      gap: 12px;
    }
  }

  &__back {
    flex-shrink: 0;
    width: 36px;
    height: 36px;
    padding: 0;
    border: none;
    background: transparent;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;

    img {
      display: block;
      width: 36px;
      height: 36px;
    }
  }

  &__search-box {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
    height: 34px;
    padding: 0 10px;
    background: #fff;
    border: 0.8px solid #d6e0eb;
    border-radius: 48px;
    box-sizing: border-box;
    cursor: text;

    &:focus-within {
      border-color: rgba(28, 123, 255, 0.45);
    }
  }

  &__search-icon {
    flex-shrink: 0;
    width: 16px;
    height: 16px;
  }

  &__search-input {
    flex: 1;
    min-width: 0;
    border: none;
    outline: none;
    background: transparent;
    font-size: 14px;
    color: #0b3462;

    &::placeholder {
      color: rgba(11, 52, 98, 0.4);
    }

    &::-webkit-search-cancel-button {
      display: none;
    }
  }

  &__search-btn {
    flex-shrink: 0;
    padding: 0;
    border: none;
    background: transparent;
    font-size: 14px;
    font-weight: 500;
    color: #1c7bff;
    cursor: pointer;
    white-space: nowrap;
  }

  /* ── H5 紧凑头（返回 + 居中标题）+ 独立搜索框行 ── */
  &__m-header {
    position: sticky;
    top: 0;
    z-index: 10;
    display: flex;
    align-items: center;
    height: 52px;
    margin: 8px 8px 0;
    padding: 0 8px;
    background: #eaf1f9;
    border: 0.8px solid #fff;
    border-radius: 30px;
    box-sizing: border-box;
  }

  &__m-back {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    padding: 0;
    border: none;
    background: transparent;
    cursor: pointer;

    img {
      display: block;
      width: 36px;
      height: 36px;
    }
  }

  &__m-title {
    flex: 1;
    min-width: 0;
    margin-right: 36px; // 抵消返回按钮宽度，让标题视觉居中
    text-align: center;
    font-size: 15px;
    font-weight: 700;
    color: #0b3462;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__m-search {
    padding: 12px 12px 0;

    .search-page__search-box {
      height: 48px;
      padding: 0 12px;
      gap: 8px;
      border-radius: 14px;
      border-color: #d6e0eb;
    }

    .search-page__search-input {
      font-size: 15px;
    }
  }

  &__m-clear {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    padding: 0;
    border: none;
    background: transparent;
    cursor: pointer;

    svg {
      display: block;
    }
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
  }

  &__spinner {
    width: 28px;
    height: 28px;
    border: 3px solid var(--theme-divider);
    border-top-color: var(--theme-primary);
    border-radius: 50%;
    animation: search-spin 0.8s linear infinite;
  }

  @keyframes search-spin {
    to { transform: rotate(360deg); }
  }

  &__initial {
    @include mobile-only {
      padding: 16px 16px 0;
    }

    @include web-only {
      padding: 0;
    }
  }

  &__section {
    margin-bottom: 24px;
  }

  &__section-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
  }

  &__section-title {
    margin: 0 0 12px;
    font-size: 16px;
    font-weight: 600;
    color: #0b3462;

    .search-page__section-head & {
      margin-bottom: 0;
    }
  }

  &__clear-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    padding: 0;
    border: none;
    background: transparent;
    cursor: pointer;
    opacity: 0.6;

    &:hover {
      opacity: 1;
    }
  }

  &__tags {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  &__tag {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: 32px;
    padding: 0 14px;
    border: 0.8px solid #d6e0eb;
    border-radius: 48px;
    background: #fff;
    font-size: 13px;
    font-weight: 400;
    color: #0b3462;
    cursor: pointer;
    white-space: nowrap;
    transition: all 0.15s ease;

    &:active {
      background: rgba(28, 123, 255, 0.08);
      border-color: #1c7bff;
    }

    &--history {
      background: #eaf1f9;
      border-color: #eaf1f9;
    }
  }

  &__results {
    @include mobile-only {
      padding: 12px 8px 0;
    }

    @include web-only {
      padding: 0;
    }
  }

  &__result-count {
    margin: 0 0 12px;
    padding: 0 8px;
    font-size: 13px;
    color: rgba(11, 52, 98, 0.55);

    strong {
      color: #1c7bff;
      font-weight: 600;
    }
  }

  &__grid {
    display: grid;
    gap: 10px;
    grid-template-columns: 1fr;

    @include web-only {
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 20px;
    }
  }
}
</style>
