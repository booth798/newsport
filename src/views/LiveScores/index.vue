<script setup>
/**
 * 即时比分（PC 主视图，H5 兼容）
 * - 顶部返回栏 + 北京时间
 * - 左侧栏：Logo + 「即时比分」
 * - 右侧：进行中赛事两列卡片（H5 单列）
 * - 滚动触底加载下一页（PC / H5 共用）
 * 数据源：/matches 列表，phase=live。
 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';

import iconNavBackMarketUrl from '@/assets/images/common/icon_back_white.png?url';
import AppSideNav from '@/components/AppSideNav.vue';
import EmptyState from '@/components/EmptyState.vue';
import { fetchMatchList } from '@/api/match';
import { resolveTeamLogoUrl } from '@/constants/teamLogos';
import { useAppStore } from '@/store/modules/app';

const { t } = useI18n();
const router = useRouter();
const appStore = useAppStore();
const { isMobile } = storeToRefs(appStore);

const sideNavItems = [{ key: 'live', label: t('即时比分') }];

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
let refreshTimer = null;

/** 进行中赛事的状态标识（兼容多种后端枚举） */
const LIVE_STATUS = new Set(['LIVE', 'IN_PROGRESS', 'RUNNING', 'PLAYING', '1H', '2H', 'HT', 'INPLAY']);

function isLiveStatus(status) {
  return LIVE_STATUS.has(String(status || '').toUpperCase());
}

/** 依据开赛时间估算进行中分钟数（后端未直接下发分钟时兜底） */
function liveMinute(match) {
  const raw = match.minute ?? match.liveMinute ?? match.playedMinutes;
  if (raw != null && `${raw}` !== '') return Number(raw);
  if (!match.kickoffAt) return null;
  const diffMin = Math.floor((Date.now() - new Date(match.kickoffAt).getTime()) / 60000);
  if (diffMin < 0) return null;
  return Math.min(diffMin, 120);
}

function statusBadge(match) {
  if (isLiveStatus(match.status)) {
    const min = liveMinute(match);
    return min != null ? `${t('进行中')} ${min}'` : t('进行中');
  }
  return match.statusLabel || t('进行中');
}

function kickoffTime(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${mi}`;
  } catch { return ''; }
}

const liveMatches = computed(() =>
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
    badge: statusBadge(m),
    time: kickoffTime(m.kickoffAt),
  })),
);

function updateBeijingClock() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
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
 * 拉取即时比分页。
 * @param {number} page 页码
 * @param {boolean} append 是否追加到现有列表
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
      phase: 'live',
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

/**
 * 定时软刷新：按已加载页数一次性回拉，保留当前列表长度并更新比分。
 */
async function softRefresh() {
  if (loading.value || loadingMore.value) return;
  try {
    const size = Math.max(PAGE_SIZE * pageNum.value, matches.value.length, PAGE_SIZE);
    const res = await fetchMatchList({
      phase: 'live',
      pageNum: 1,
      pageSize: size,
    });
    const records = res.data?.records || [];
    matches.value = records;
    // 用「虚拟当前页」估算是否还有更多：已加载量 / PAGE_SIZE
    const virtualPage = Math.max(1, Math.ceil(records.length / PAGE_SIZE) || 1);
    pageNum.value = virtualPage;
    if (res.data?.total != null) {
      hasMore.value = records.length < Number(res.data.total);
    } else if (res.data?.pages != null) {
      hasMore.value = virtualPage < Number(res.data.pages);
    } else {
      hasMore.value = records.length >= size && records.length >= PAGE_SIZE;
    }
  } catch {
    // 定时刷新失败不打断现有列表
  }
}

function teardownLoadMoreObserver() {
  if (loadMoreObserver) {
    loadMoreObserver.disconnect();
    loadMoreObserver = null;
  }
}

/** 观察列表底部哨兵，进入视口即加载下一页（PC / H5 窗口滚动均适用） */
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
  () => [hasMore.value, liveMatches.value.length, loading.value],
  () => {
    if (!loading.value && hasMore.value && liveMatches.value.length) {
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

onMounted(() => {
  updateBeijingClock();
  clockTimer = window.setInterval(updateBeijingClock, 1000);
  loadMatches();
  refreshTimer = window.setInterval(softRefresh, 30000);
});

onBeforeUnmount(() => {
  if (clockTimer) window.clearInterval(clockTimer);
  if (refreshTimer) window.clearInterval(refreshTimer);
  teardownLoadMoreObserver();
});
</script>

<template>
  <div class="live-page">
    <!-- 顶部返回栏 + 北京时间 -->
    <header class="live-topbar">
      <span v-if="!isMobile" class="live-topbar__clock">Beijing Time: {{ beijingNow }}</span>
      <div class="live-topbar__bar">
        <button type="button" class="live-topbar__back" :aria-label="t('返回')" @click="goBack">
          <img :src="iconNavBackMarketUrl" width="48" height="48" alt="" />
        </button>
        <h1 v-if="isMobile" class="live-topbar__title">{{ t('即时比分') }}</h1>
      </div>
    </header>

    <div class="live-layout">
      <AppSideNav v-if="!isMobile" :items="sideNavItems" active-key="live" />

      <main class="live-content">
        <!-- 加载 -->
        <div v-if="loading" class="live-state">
          <div class="live-spinner" />
          <span>{{ t('加载中') }}</span>
        </div>

        <!-- 错误 -->
        <div v-else-if="error" class="live-state">
          <span>{{ t('加载失败') }}</span>
          <button type="button" class="live-retry" @click="loadMatches">{{ t('重试') }}</button>
        </div>

        <!-- 空 -->
        <EmptyState v-else-if="!liveMatches.length" :text="t('暂无相关赛事')" />

        <!-- 卡片列表 -->
        <template v-else>
          <div class="live-grid">
            <article v-for="m in liveMatches" :key="m.id" class="live-card">
              <div class="live-card__top">
                <span class="live-card__league">
                  <svg class="live-card__gear" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path d="M8 10a2 2 0 100-4 2 2 0 000 4z" stroke="var(--theme-text-muted)" stroke-width="1.2"/>
                    <path d="M8 1.5l1 1.6 1.9-.4.4 1.9 1.6 1-1 .9 1 .9-1.6 1-.4 1.9-1.9-.4-1 1.6-1-1.6-1.9.4-.4-1.9-1.6-1 1-.9-1-.9 1.6-1 .4-1.9 1.9.4 1-1.6z" stroke="var(--theme-text-muted)" stroke-width="1" stroke-linejoin="round"/>
                  </svg>
                  <img v-if="m.leagueIcon" class="live-card__league-logo" :src="m.leagueIcon" alt="" width="18" height="18" @error="(e) => e.target.style.display='none'" />
                  <span class="live-card__league-name">{{ m.league }}</span>
                </span>
                <span class="live-card__badge">{{ m.badge }}</span>
              </div>

              <div class="live-card__body">
                <div class="live-card__team live-card__team--home">
                  <!-- 与首页一致：队名旁贴主/客角标 -->
                  <span class="live-card__team-name">
                    <span class="live-card__team-name-text">{{ m.homeTeam }}</span>
                    <span class="live-card__side-tag live-card__side-tag--home">{{ t('主') }}</span>
                  </span>
                  <img v-if="m.homeLogo" class="live-card__team-logo" :src="m.homeLogo" alt="" width="28" height="28" @error="(e) => e.target.style.display='none'" />
                </div>

                <div class="live-card__center">
                  <div class="live-card__score">
                    <span class="live-card__score-home">{{ m.homeScore }}</span>
                    <span class="live-card__score-sep">:</span>
                    <span class="live-card__score-away">{{ m.awayScore }}</span>
                  </div>
                  <span class="live-card__time">{{ m.time }}</span>
                </div>

                <div class="live-card__team live-card__team--away">
                  <img v-if="m.awayLogo" class="live-card__team-logo" :src="m.awayLogo" alt="" width="28" height="28" @error="(e) => e.target.style.display='none'" />
                  <span class="live-card__team-name">
                    <span class="live-card__team-name-text">{{ m.awayTeam }}</span>
                    <span class="live-card__side-tag live-card__side-tag--away">{{ t('客') }}</span>
                  </span>
                </div>
              </div>
            </article>
          </div>

          <!-- 滚动加载哨兵 + 加载中提示（PC / H5） -->
          <div
            v-if="hasMore"
            ref="loadMoreSentinelRef"
            class="live-load-more"
            aria-hidden="true"
          >
            <div v-if="loadingMore" class="live-spinner" />
            <span v-if="loadingMore">{{ t('加载中') }}</span>
          </div>
        </template>
      </main>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/tools.scss' as *;

.live-page {
  min-height: 100dvh;
  box-sizing: border-box;
  background: linear-gradient(180deg, var(--theme-bg) 0%, var(--theme-bg) 220px);

  @include web-only {
    padding: 30px 30px 60px;
  }

  @include mobile-only {
    padding: calc(env(safe-area-inset-top, 20px) + 8px) 8px 20px;
  }
}

/* --- 顶部返回栏 + 北京时间 --- */
.live-topbar {
  position: relative;

  @include web-only {
    width: min(1000px, calc(100vw - 60px));
    margin: 0 auto;
  }
}

.live-topbar__clock {
  position: absolute;
  top: -18px;
  right: 4px;
  font-family: $font-family-num, $font-family-base;
  font-size: 12px;
  font-weight: 500;
  color: rgba(var(--theme-text-rgb), 0.48);
  white-space: nowrap;
}

.live-topbar__bar {
  display: flex;
  align-items: center;
  box-sizing: border-box;

  @include web-only {
    height: 80px;
    padding: 0 32px;
    border: 0.8px solid var(--auxiliary-1);
    border-radius: 40px;
    background: var(--theme-primary);
  }

  @include mobile-only {
    position: relative;
    height: 52px;
    padding: 0 8px;
    border: 0.8px solid #fff;
    border-radius: 30px;
    background: var(--theme-primary);
  }
}

.live-topbar__back {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  flex-shrink: 0;
  transition: opacity 0.2s ease;

  &:hover { opacity: 0.85; }

  img {
    display: block;

    @include mobile-only {
      width: 40px;
      height: 40px;
    }
  }
}

.live-topbar__title {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: var(--auxiliary-1);
  white-space: nowrap;
}

/* --- 布局 --- */
.live-layout {
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

.live-content {
  min-width: 0;

  @include web-only {
    flex: 1;
  }

  @include mobile-only {
    width: 100%;
    padding: 10px;
    border: 0.8px solid #fff;
    border-radius: 16px;
    background: var(--surface-card);
    box-sizing: border-box;
  }
}

/* --- 状态 --- */
.live-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 260px;
  gap: 12px;
  color: var(--theme-text-muted);
  font-size: 14px;
}

.live-spinner {
  width: 24px;
  height: 24px;
  border: 3px solid var(--theme-divider);
  border-top-color: var(--theme-primary);
  border-radius: 50%;
  animation: live-spin 0.8s linear infinite;
}

@keyframes live-spin {
  to { transform: rotate(360deg); }
}

.live-retry {
  height: 32px;
  padding: 0 20px;
  border: 1px solid var(--theme-primary);
  border-radius: 16px;
  background: transparent;
  color: var(--theme-primary);
  font-size: 14px;
  cursor: pointer;
}

/* --- 卡片网格 --- */
.live-grid {
  display: grid;
  gap: 12px;

  @include web-only {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @include mobile-only {
    grid-template-columns: minmax(0, 1fr);
  }
}

.live-card {
  padding: 12px 16px;
  border-radius: 14px;
  background: #fff;
  border: 0.8px solid rgba(255, 255, 255, 0.9);
  box-shadow: 0 2px 12px rgba(var(--theme-shadow-rgb), 0.06);
  box-sizing: border-box;
}

.live-card__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.live-card__league {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
}

.live-card__gear {
  flex-shrink: 0;
  display: block;
}

.live-card__league-logo {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  object-fit: contain;
  flex-shrink: 0;
}

.live-card__league-name {
  font-size: 13px;
  color: var(--theme-text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.live-card__badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 20px;
  padding: 0 8px;
  border-radius: 6px;
  background: var(--theme-primary);
  color: #fff;
  font-size: 11px;
  font-weight: 500;
  white-space: nowrap;
  flex-shrink: 0;
}

.live-card__body {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  gap: 10px;
  min-height: 52px;
  margin-top: 12px;
  padding: 0 6px;
  border: 1px solid var(--theme-divider);
  border-radius: 16px;
  background: #fff url('@/assets/images/common/match_score_arena_bg.png') center / 100% 100% no-repeat;
  box-sizing: border-box;
}

.live-card__team {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;

  &--home { justify-content: flex-end; }
  &--away { justify-content: flex-start; }
}

.live-card__team-name {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
  font-size: 14px;
  font-weight: 500;
  color: var(--theme-text);
}

.live-card__team-name-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

/* 对齐首页 match-card__side-tag */
.live-card__side-tag {
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
    background: var(--theme-primary);
  }

  &--away {
    background: rgba(var(--theme-text-rgb), 0.5);
  }
}

.live-card__team-logo {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  object-fit: contain;
  flex-shrink: 0;
}

.live-card__center {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}

.live-card__score {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: $font-family-num, $font-family-base;
  font-size: 20px;
  font-weight: 700;
  line-height: 1;
}

.live-card__score-home { color: var(--theme-primary); }
.live-card__score-sep { color: var(--theme-text); }
.live-card__score-away { color: var(--theme-text); }

.live-card__time {
  font-family: $font-family-num, $font-family-base;
  font-size: 12px;
  color: rgba(var(--theme-text-rgb), 0.45);
  line-height: 1;
}

.live-load-more {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 48px;
  margin-top: 12px;
  color: var(--theme-text-muted);
  font-size: 13px;
}
</style>
