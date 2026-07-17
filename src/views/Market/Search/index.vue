<script setup>
/**
 * 搜索页：对齐安卓 MarketSearchActivity
 * - 默认市场搜索：GET /markets/list?teamName=&period=FT
 * - mode=match：赛事搜索（联赛/主客队本地过滤），phase 透传 finished/live/all
 * - 空白关键词不请求；清空关键词时清空列表
 */
import { computed, nextTick, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';

import { fetchMarketListPaged, fetchMatchList } from '@/api/match';
import { useAppStore } from '@/store/modules/app';
import { useToast } from '@/hooks/useToast';
import EmptyState from '@/components/EmptyState.vue';
import HomeMatchCard from '@/views/Home/components/HomeMatchCard.vue';
import { resolveTeamLogoUrl } from '@/constants/teamLogos';

import iconNavBackMarketUrl from '@/assets/images/common/icon_nav_back_market.svg?url';
import matchScoreArenaBgUrl from '@/assets/images/common/match_score_arena_bg.png';

const PAGE_SIZE = 20;
const MATCH_SEARCH_PAGE_SIZE = 100;

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const toast = useToast();
const appStore = useAppStore();
const { isMobile } = storeToRefs(appStore);

/** 对齐安卓 EXTRA_MATCH_SEARCH_MODE / EXTRA_MATCH_SEARCH_PHASE */
const matchSearchMode = computed(() => String(route.query.mode || '') === 'match');
const matchSearchPhase = computed(() => {
  const phase = String(route.query.phase || 'all').trim();
  return phase || 'all';
});

const searchInputRef = ref(null);
const searchQuery = ref('');
const results = ref([]);
const matchResults = ref([]);
const loading = ref(false);
const hasSearched = ref(false);
const searching = ref(false);
let searchRequestSerial = 0;

const trimmedQuery = computed(() => searchQuery.value.trim());
const showEmpty = computed(() => {
  if (!hasSearched.value || loading.value) return false;
  return matchSearchMode.value ? matchResults.value.length === 0 : results.value.length === 0;
});
const showResults = computed(() => {
  if (!hasSearched.value || loading.value) return false;
  return matchSearchMode.value ? matchResults.value.length > 0 : results.value.length > 0;
});
const resultCount = computed(() => (
  matchSearchMode.value ? matchResults.value.length : results.value.length
));
const searchPlaceholder = computed(() => (
  matchSearchMode.value || isMobile.value ? t('搜索球队名称') : t('搜索赛事、联赛、球队')
));

/** 与市场列表页一致：映射盘口 scores 与 kickoffAt，供 HomeMatchCard 展示 */
function normalizeMarketRecord(r) {
  return {
    // 列表项唯一标识用 marketId，避免同场 FT/HT 互相覆盖
    id: r.marketId || `${r.matchId}:${r.period}` || r.id,
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

function kickoffTime(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  } catch {
    return '';
  }
}

/** 对齐安卓 MatchListAdapter.displayScore：优先全场，其次半场，否则 "-" */
function displayScore(fullTime, halfTime) {
  const value = fullTime ?? halfTime;
  return value == null || value === '' ? '-' : String(value);
}

/**
 * 对齐安卓过滤字段：leagueName / homeTeamName / awayTeamName
 * 同时兼容短名，避免 normalize 后只剩短名导致搜不到
 */
function matchKeywordFields(m) {
  return [
    m.leagueName,
    m.leagueShortName,
    m.league,
    m.homeTeamName,
    m.homeTeamShortName,
    m.homeTeam,
    m.awayTeamName,
    m.awayTeamShortName,
    m.awayTeam,
  ];
}

/** 赛事结果卡片数据（对齐 item_event_results_view / MatchListAdapter） */
function normalizeMatchRecord(m) {
  const homeName = m.homeTeamName || m.homeTeam || '';
  const awayName = m.awayTeamName || m.awayTeam || '';
  return {
    id: m.id,
    // 展示对齐安卓：用全称 leagueName / homeTeamName / awayTeamName
    league: m.leagueName || m.league || '',
    leagueIcon: m.leagueIcon || m.leagueLogoUrl || '',
    homeTeam: homeName,
    awayTeam: awayName,
    homeLogo: resolveTeamLogoUrl(homeName, m.homeTeamLogo),
    awayLogo: resolveTeamLogoUrl(awayName, m.awayTeamLogo),
    homeScore: displayScore(m.ftHomeScore, m.htHomeScore),
    awayScore: displayScore(m.ftAwayScore, m.htAwayScore),
    time: kickoffTime(m.kickoffAt),
  };
}

async function doSearch() {
  const keyword = trimmedQuery.value;
  // 与安卓一致：空白关键词不请求；进行中的搜索忽略重复触发
  if (!keyword || searching.value) return;

  searching.value = true;
  loading.value = true;
  hasSearched.value = true;
  const requestSerial = ++searchRequestSerial;

  try {
    if (matchSearchMode.value) {
      // 对齐安卓：MatchRepository.list(page=1, size=100, phase)，再本地 contains 过滤
      const res = await fetchMatchList({
        pageNum: 1,
        pageSize: MATCH_SEARCH_PAGE_SIZE,
        phase: matchSearchPhase.value,
      });
      if (requestSerial !== searchRequestSerial) return;
      const records = res?.data?.records ?? [];
      const lower = keyword.toLowerCase();
      matchResults.value = records
        .filter((m) => matchKeywordFields(m)
          .some((v) => String(v || '').toLowerCase().includes(lower)))
        .map(normalizeMatchRecord);
      results.value = [];
      return;
    }

    // 对齐安卓 HomeRepository.markets：teamName + period=FT（全场，避免半场盘口混入）
    const res = await fetchMarketListPaged({
      pageNum: 1,
      pageSize: PAGE_SIZE,
      teamName: keyword,
      period: 'FT',
    });
    if (requestSerial !== searchRequestSerial) return;
    // period=FT 后仅全场盘口；仍按 marketId 映射，避免同场重复
    results.value = (res?.data?.records ?? []).map(normalizeMarketRecord);
    matchResults.value = [];
  } catch (error) {
    if (requestSerial !== searchRequestSerial) return;
    results.value = [];
    matchResults.value = [];
    toast.error(error?.message || t('加载失败'));
  } finally {
    if (requestSerial === searchRequestSerial) {
      searching.value = false;
      loading.value = false;
    }
  }
}

function onInputChange() {
  if (!trimmedQuery.value) {
    searchRequestSerial += 1;
    hasSearched.value = false;
    results.value = [];
    matchResults.value = [];
    loading.value = false;
    searching.value = false;
  }
}

function clearInput() {
  searchRequestSerial += 1;
  searchQuery.value = '';
  hasSearched.value = false;
  results.value = [];
  matchResults.value = [];
  loading.value = false;
  searching.value = false;
  nextTick(() => searchInputRef.value?.focus());
}

function goBack() {
  router.back();
}

onMounted(async () => {
  await nextTick();
  searchInputRef.value?.focus();
});
</script>

<template>
  <div class="search-page">
    <!-- H5：紧凑头（返回 + 居中标题）+ 独立搜索框行 -->
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
            :placeholder="searchPlaceholder"
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

    <!-- 桌面端：返回 + 搜索框 + 搜索按钮 -->
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
            :placeholder="searchPlaceholder"
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

    <div v-if="loading" class="search-page__state" role="status" :aria-label="t('加载中')">
      <div class="search-page__spinner" />
    </div>

    <div v-else-if="showResults" class="search-page__results">
      <!-- 市场搜索保留条数提示；赛事结果搜索对齐安卓，仅列表 -->
      <p v-if="!matchSearchMode" class="search-page__result-count">
        {{ t('搜索到') }} <strong>{{ resultCount }}</strong> {{ t('条相关赛事') }}
      </p>

      <!-- match 模式：赛事结果卡片（对齐 item_event_results_view） -->
      <div v-if="matchSearchMode" class="search-page__match-grid">
        <article v-for="m in matchResults" :key="m.id" class="match-card">
          <div class="match-card__head">
            <div class="match-card__league">
              <img
                v-if="m.leagueIcon"
                class="match-card__league-logo"
                :src="m.leagueIcon"
                alt=""
                width="18"
                height="18"
                @error="(e) => (e.target.style.display = 'none')"
              />
              <span class="match-card__league-name">{{ m.league }}</span>
            </div>
            <span class="match-card__badge">{{ t('完场') }}</span>
          </div>

          <div class="match-card__arena">
            <img class="match-card__arena-bg" :src="matchScoreArenaBgUrl" alt="" aria-hidden="true" />
            <div class="match-card__arena-inner">
              <div class="match-card__team match-card__team--home">
                <span class="match-card__team-name">{{ m.homeTeam }}</span>
                <span class="match-card__logo-wrap">
                  <img
                    v-if="m.homeLogo"
                    class="match-card__team-logo"
                    :src="m.homeLogo"
                    alt=""
                    @error="(e) => (e.target.style.display = 'none')"
                  />
                </span>
              </div>

              <div class="match-card__center">
                <div class="match-card__score">
                  <span>{{ m.homeScore }}</span>
                  <span class="match-card__score-sep">:</span>
                  <span>{{ m.awayScore }}</span>
                </div>
                <span class="match-card__time">{{ m.time }}</span>
              </div>

              <div class="match-card__team match-card__team--away">
                <span class="match-card__logo-wrap">
                  <img
                    v-if="m.awayLogo"
                    class="match-card__team-logo"
                    :src="m.awayLogo"
                    alt=""
                    @error="(e) => (e.target.style.display = 'none')"
                  />
                </span>
                <span class="match-card__team-name">{{ m.awayTeam }}</span>
              </div>
            </div>
          </div>
        </article>
      </div>

      <!-- 市场搜索：HomeMatchCard -->
      <div v-else class="search-page__grid">
        <HomeMatchCard
          v-for="match in results"
          :key="match._dedupeKey || match.id"
          :match="match"
        />
      </div>
    </div>

    <div v-else-if="showEmpty" class="search-page__empty">
      <EmptyState :icon-size="96" :text="t('没有相关内容，请重新尝试')" />
    </div>
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

  &__match-grid {
    display: grid;
    gap: 10px;
    grid-template-columns: 1fr;

    @include web-only {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
}

/* 赛事结果卡片样式（与 MatchResults 页一致） */
.match-card {
  box-sizing: border-box;
  padding: 12px;
  border-radius: 16px;
  background: #fff;
}

.match-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 24px;
}

.match-card__league {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
}

.match-card__league-logo {
  width: 18px;
  height: 18px;
  object-fit: contain;
  flex-shrink: 0;
}

.match-card__league-name {
  font-size: 14px;
  font-weight: 400;
  color: rgba(11, 52, 98, 0.5);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.match-card__badge {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 22px;
  padding: 0 10px;
  border-radius: 48px;
  background: #eef2f7;
  font-size: 12px;
  font-weight: 400;
  color: rgba(11, 52, 98, 0.55);
}

.match-card__arena {
  position: relative;
  margin-top: 10px;
  border-radius: 12px;
  overflow: hidden;
  min-height: 72px;
}

.match-card__arena-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  pointer-events: none;
}

.match-card__arena-inner {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 72px;
  padding: 12px 10px;
  box-sizing: border-box;
}

.match-card__team {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  flex: 1;

  &--home {
    justify-content: flex-end;
  }

  &--away {
    justify-content: flex-start;
  }
}

.match-card__team-name {
  font-size: 13px;
  font-weight: 500;
  color: #0b3462;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 72px;

  @include web-only {
    max-width: 100px;
  }
}

.match-card__logo-wrap {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.match-card__team-logo {
  width: 22px;
  height: 22px;
  object-fit: contain;
}

.match-card__center {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  min-width: 64px;
}

.match-card__score {
  display: inline-flex;
  align-items: baseline;
  gap: 4px;
  font-family: $font-family-num, $font-family-base;
  font-size: 22px;
  font-weight: 700;
  color: #1c7bff;
  line-height: 1.1;
}

.match-card__score-sep {
  font-weight: 500;
  opacity: 0.85;
}

.match-card__time {
  font-size: 12px;
  color: rgba(11, 52, 98, 0.45);
}
</style>
