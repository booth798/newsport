<script setup>
/**
 * 赛事结果 — UI 对齐 Figma 截图 / 安卓 EventResultsActivity
 * - 顶栏：返回 + 标题 + 搜索（进搜索页 mode=match&phase=finished）
 * - 日期：复用 MonthSelector includeDay（对齐 DateSelectDialog）
 * - 卡片：联赛左、「完场」右；比分条内嵌；主客队分均为蓝色
 * - 滚动触底加载下一页（PC / H5 共用）
 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';

import iconNavBackMarketUrl from '@/assets/images/common/icon_nav_back_market.svg?url';
import matchScoreArenaBgUrl from '@/assets/images/common/match_score_arena_bg.png';
import AppSearchButton from '@/components/AppSearchButton.vue';
import AppSideNav from '@/components/AppSideNav.vue';
import EmptyState from '@/components/EmptyState.vue';
import MonthSelector from '@/components/MonthSelector.vue';
import { fetchMatchList } from '@/api/match';
import { resolveTeamLogoUrl } from '@/constants/teamLogos';
import { useAppStore } from '@/store/modules/app';

const { t } = useI18n();
const router = useRouter();
const appStore = useAppStore();
const { isMobile } = storeToRefs(appStore);

const sideNavItems = [{ key: 'results', label: t('赛事结果') }];

const PAGE_SIZE = 20;
const matches = ref([]);
const loading = ref(true);
const loadingMore = ref(false);
const error = ref(false);
const pageNum = ref(1);
const hasMore = ref(false);
/** 列表底部哨兵：进入视口时触发下一页 */
const loadMoreSentinelRef = ref(null);
let loadMoreObserver = null;

const beijingNow = ref('');
let clockTimer = null;

function todayShanghai() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const pick = (type) => parts.find((p) => p.type === type)?.value ?? '';
  return `${pick('year')}-${pick('month')}-${pick('day')}`;
}

const selectedDate = ref(todayShanghai());

function kickoffTime(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  } catch {
    return '';
  }
}

const resultMatches = computed(() =>
  matches.value.map((m) => ({
    id: m.id,
    league: m.league,
    leagueIcon: m.leagueIcon,
    homeTeam: m.homeTeam,
    awayTeam: m.awayTeam,
    homeLogo: resolveTeamLogoUrl(m.homeTeam, m.homeTeamLogo),
    awayLogo: resolveTeamLogoUrl(m.awayTeam, m.awayTeamLogo),
    homeScore: m.homeScore ?? 0,
    awayScore: m.awayScore ?? 0,
    time: kickoffTime(m.kickoffAt),
  })),
);

function updateBeijingClock() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(new Date());
  const pick = (type) => parts.find((p) => p.type === type)?.value ?? '';
  beijingNow.value = `${pick('year')}-${pick('month')}-${pick('day')} ${pick('hour')}:${pick('minute')}:${pick('second')}`;
}

/** 依据分页元信息判断是否还有下一页 */
function computeHasMore(page, requestedPage, recordsLen) {
  if (!page) return recordsLen >= PAGE_SIZE;
  const total = page.total;
  const pages = page.pages;
  const current = page.current || requestedPage;
  const size = page.size || PAGE_SIZE;
  return pages != null
    ? current < pages
    : total != null
      ? current * size < total
      : recordsLen >= PAGE_SIZE;
}

/**
 * 拉取已完场赛事分页。
 * @param {number} page 页码
 * @param {boolean} append 是否追加
 */
async function loadPage(page, append = false) {
  if (append) {
    if (loadingMore.value || !hasMore.value) return;
    loadingMore.value = true;
  } else {
    loading.value = true;
    error.value = false;
  }
  try {
    const res = await fetchMatchList({
      phase: 'finished',
      date: selectedDate.value,
      pageNum: page,
      pageSize: PAGE_SIZE,
    });
    const records = res.data?.records || [];
    matches.value = append ? [...matches.value, ...records] : records;
    pageNum.value = page;
    hasMore.value = computeHasMore(res.data, page, records.length);
    error.value = false;
  } catch {
    if (!append) {
      error.value = true;
      matches.value = [];
      hasMore.value = false;
    }
  } finally {
    loading.value = false;
    loadingMore.value = false;
  }
}

function loadMatches() {
  return loadPage(1, false);
}

function loadMore() {
  if (loading.value || loadingMore.value || !hasMore.value) return;
  return loadPage(pageNum.value + 1, true);
}

function teardownLoadMoreObserver() {
  if (loadMoreObserver) {
    loadMoreObserver.disconnect();
    loadMoreObserver = null;
  }
}

/** 观察列表底部哨兵，进入视口即加载下一页（PC / H5） */
async function setupLoadMoreObserver() {
  teardownLoadMoreObserver();
  await nextTick();
  const el = loadMoreSentinelRef.value;
  if (!el || typeof IntersectionObserver === 'undefined') return;
  loadMoreObserver = new IntersectionObserver(
    (entries) => {
      if (entries.some((e) => e.isIntersecting)) loadMore();
    },
    { root: null, rootMargin: '120px 0px', threshold: 0 },
  );
  loadMoreObserver.observe(el);
}

watch(
  () => [hasMore.value, resultMatches.value.length, loading.value],
  () => {
    if (!loading.value && hasMore.value && resultMatches.value.length) {
      setupLoadMoreObserver();
    } else {
      teardownLoadMoreObserver();
    }
  },
);

function goBack() {
  if (window.history.length > 1) router.back();
  else router.push('/');
}

/** 对齐安卓：搜索页 match 模式 + phase=finished */
function goSearch() {
  router.push({
    name: 'market-search',
    query: { mode: 'match', phase: 'finished' },
  });
}

// 切换日期时从第一页重新拉取
watch(selectedDate, () => {
  loadMatches();
});

onMounted(() => {
  updateBeijingClock();
  clockTimer = window.setInterval(updateBeijingClock, 1000);
  loadMatches();
});

onBeforeUnmount(() => {
  if (clockTimer) window.clearInterval(clockTimer);
  teardownLoadMoreObserver();
});
</script>

<template>
  <div class="result-page">
    <header class="result-topbar">
      <span v-if="!isMobile" class="result-topbar__clock">Beijing Time: {{ beijingNow }}</span>
      <div class="result-topbar__bar">
        <button type="button" class="result-topbar__back" :aria-label="t('返回')" @click="goBack">
          <img :src="iconNavBackMarketUrl" width="48" height="48" alt="" />
        </button>
        <h1 v-if="isMobile" class="result-topbar__title">{{ t('赛事结果') }}</h1>
        <!-- 右上角搜索：复用 Header 同款圆形搜索按钮 -->
        <AppSearchButton class="result-topbar__search" :size="36" @click="goSearch" />
      </div>
    </header>

    <div class="result-layout">
      <AppSideNav v-if="!isMobile" :items="sideNavItems" active-key="results" />

      <main class="result-content">
        <div class="result-panel">
          <div class="result-date-row">
            <MonthSelector v-model="selectedDate" include-day :aria-label="t('日期选择')" />
          </div>

          <div v-if="loading" class="result-state">
            <div class="result-spinner" />
            <span>{{ t('加载中') }}</span>
          </div>

          <div v-else-if="error" class="result-state">
            <span>{{ t('加载失败') }}</span>
            <button type="button" class="result-retry" @click="loadMatches">{{ t('重试') }}</button>
          </div>

          <EmptyState v-else-if="!resultMatches.length" :text="t('暂无相关赛事')" />

          <template v-else>
            <div class="result-grid">
              <article v-for="m in resultMatches" :key="m.id" class="result-card">
                <div class="result-card__head">
                  <div class="result-card__league">
                    <img
                      v-if="m.leagueIcon"
                      class="result-card__league-logo"
                      :src="m.leagueIcon"
                      alt=""
                      width="18"
                      height="18"
                      @error="(e) => (e.target.style.display = 'none')"
                    />
                    <span class="result-card__league-name">{{ m.league }}</span>
                  </div>
                  <!-- 截图：右侧「完场」徽标 -->
                  <span class="result-card__badge">{{ t('完场') }}</span>
                </div>

                <div class="result-card__arena">
                  <img class="result-card__arena-bg" :src="matchScoreArenaBgUrl" alt="" aria-hidden="true" />
                  <div class="result-card__arena-inner">
                    <div class="result-card__team result-card__team--home">
                      <!-- 与首页一致：队名旁贴主/客角标 -->
                      <span class="result-card__team-name">
                        <span class="result-card__team-name-text">{{ m.homeTeam }}</span>
                        <span class="result-card__side-tag result-card__side-tag--home">{{ t('主') }}</span>
                      </span>
                      <span class="result-card__logo-wrap">
                        <img
                          v-if="m.homeLogo"
                          class="result-card__team-logo"
                          :src="m.homeLogo"
                          alt=""
                          @error="(e) => (e.target.style.display = 'none')"
                        />
                      </span>
                    </div>

                    <div class="result-card__center">
                      <div class="result-card__score">
                        <span>{{ m.homeScore }}</span>
                        <span class="result-card__score-sep">:</span>
                        <span>{{ m.awayScore }}</span>
                      </div>
                      <span class="result-card__time">{{ m.time }}</span>
                    </div>

                    <div class="result-card__team result-card__team--away">
                      <span class="result-card__logo-wrap">
                        <img
                          v-if="m.awayLogo"
                          class="result-card__team-logo"
                          :src="m.awayLogo"
                          alt=""
                          @error="(e) => (e.target.style.display = 'none')"
                        />
                      </span>
                      <span class="result-card__team-name">
                        <span class="result-card__team-name-text">{{ m.awayTeam }}</span>
                        <span class="result-card__side-tag result-card__side-tag--away">{{ t('客') }}</span>
                      </span>
                    </div>
                  </div>
                </div>
              </article>
            </div>

            <!-- 滚动加载哨兵 + 加载中提示（PC / H5） -->
            <div
              v-if="hasMore"
              ref="loadMoreSentinelRef"
              class="result-load-more"
              aria-hidden="true"
            >
              <div v-if="loadingMore" class="result-spinner" />
              <span v-if="loadingMore">{{ t('加载中') }}</span>
            </div>
          </template>
        </div>
      </main>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/tools.scss' as *;

.result-page {
  min-height: 100dvh;
  box-sizing: border-box;
  background: linear-gradient(180deg, #e3ecfb 0%, var(--theme-bg) 220px);

  @include web-only {
    padding: 30px 30px 60px;
  }

  @include mobile-only {
    padding: calc(env(safe-area-inset-top, 20px) + 8px) 8px 20px;
  }
}

.result-topbar {
  position: relative;

  @include web-only {
    width: min(1000px, calc(100vw - 60px));
    margin: 0 auto;
  }
}

.result-topbar__clock {
  position: absolute;
  top: -18px;
  right: 4px;
  font-family: $font-family-num, $font-family-base;
  font-size: 12px;
  font-weight: 500;
  color: rgba(11, 52, 98, 0.48);
  white-space: nowrap;
}

.result-topbar__bar {
  display: flex;
  align-items: center;
  box-sizing: border-box;

  @include web-only {
    height: 80px;
    padding: 0 24px 0 32px;
    border: 0.8px solid var(--auxiliary-1);
    border-radius: 40px;
    background: var(--surface-card);
  }

  @include mobile-only {
    position: relative;
    height: 52px;
    padding: 0 8px;
    border: 0.8px solid #fff;
    border-radius: 30px;
    background: var(--surface-card);
  }
}

.result-topbar__back {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  flex-shrink: 0;

  img {
    display: block;

    @include mobile-only {
      width: 40px;
      height: 40px;
    }
  }
}

.result-topbar__title {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: #0b3462;
  white-space: nowrap;
}

.result-topbar__search {
  margin-left: auto;
}

.result-layout {
  @include web-only {
    display: flex;
    gap: 20px;
    width: min(1000px, calc(100vw - 60px));
    margin: 20px auto 0;
    align-items: flex-start;
  }

  @include mobile-only {
    margin-top: 12px;
  }
}

.result-content {
  min-width: 0;

  @include web-only {
    flex: 1;
  }

  @include mobile-only {
    width: 100%;
  }
}

.result-panel {
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  padding: 10px;
  border-radius: 16px;
  border: 0.8px solid #fff;
  background: #eaf1f9;
}

.result-date-row {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 10px;
}

.result-grid {
  display: grid;
  gap: 10px;

  @include web-only {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @include mobile-only {
    grid-template-columns: minmax(0, 1fr);
  }
}

.result-card {
  box-sizing: border-box;
  padding: 12px;
  border-radius: 16px;
  background: #fff;
}

.result-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 24px;
}

.result-card__league {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
}

.result-card__league-logo {
  width: 18px;
  height: 18px;
  object-fit: contain;
  flex-shrink: 0;
}

.result-card__league-name {
  font-size: 14px;
  font-weight: 400;
  color: rgba(11, 52, 98, 0.5);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 截图：右侧「完场」浅灰胶囊 */
.result-card__badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 18px;
  padding: 0 10px;
  border-radius: 12px;
  background: #eaf1f9;
  color: rgba(11, 52, 98, 0.5);
  font-size: 10px;
  font-weight: 400;
  line-height: 1;
  white-space: nowrap;
  flex-shrink: 0;
}

.result-card__arena {
  position: relative;
  margin-top: 10px;
  height: 52px;
  border-radius: 16px;
  overflow: hidden;
  background: #eaf1f9;
}

.result-card__arena-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  pointer-events: none;
  opacity: 0.9;
}

.result-card__arena-inner {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 56px minmax(0, 1fr);
  align-items: center;
  height: 100%;
  padding: 0 6px;
  box-sizing: border-box;
}

.result-card__team {
  display: flex;
  align-items: center;
  gap: 5px;
  min-width: 0;

  &--home {
    justify-content: flex-end;
  }

  &--away {
    justify-content: flex-start;
  }
}

.result-card__team-name {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
  font-size: 14px;
  font-weight: 400;
  color: #0b3462;
  line-height: 1.2;
}

.result-card__team-name-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

/* 对齐首页 match-card__side-tag */
.result-card__side-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 14px;
  height: 14px;
  border-radius: 3px;
  font-size: 10px;
  font-weight: 400;
  line-height: 1;
  color: #fff;

  &--home {
    background: #1c7bff;
  }

  &--away {
    background: rgba(11, 52, 98, 0.5);
  }
}

.result-card__logo-wrap {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  padding: 4px;
  box-sizing: border-box;
  border-radius: 50%;
  background: #fff;
  border: 0.5px solid #e4f0fe;
  flex-shrink: 0;
}

.result-card__team-logo {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}

.result-card__center {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 56px;
  flex-shrink: 0;
}

/* 截图：比分整体蓝色 */
.result-card__score {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
  font-family: $font-family-num, $font-family-base;
  font-size: 20px;
  font-weight: 700;
  line-height: 1;
  color: #1c7bff;
}

.result-card__score-sep {
  color: #1c7bff;
}

.result-card__time {
  margin-top: 1px;
  font-family: $font-family-num, $font-family-base;
  font-size: 12px;
  color: rgba(11, 52, 98, 0.5);
  line-height: 1;
  text-align: center;
}

.result-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 260px;
  gap: 12px;
  color: #7b92ad;
  font-size: 14px;
}

.result-spinner {
  width: 24px;
  height: 24px;
  border: 3px solid #e4f0fe;
  border-top-color: #1c7bff;
  border-radius: 50%;
  animation: result-spin 0.8s linear infinite;
}

@keyframes result-spin {
  to {
    transform: rotate(360deg);
  }
}

.result-retry {
  height: 32px;
  padding: 0 20px;
  border: 1px solid #1c7bff;
  border-radius: 16px;
  background: transparent;
  color: #1c7bff;
  font-size: 14px;
  cursor: pointer;
}

.result-load-more {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 48px;
  margin-top: 12px;
  color: #7b92ad;
  font-size: 13px;
}
</style>
