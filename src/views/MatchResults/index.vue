<script setup>
/**
 * 赛事结果（PC 主视图，H5 兼容）
 * - 顶部返回栏 + 北京时间
 * - 左侧栏：Logo + 「赛事结果」
 * - 右侧：已结束赛事两列卡片（H5 单列），展示最终比分
 * 数据源：/matches 列表，取已结束赛事展示比赛结果。
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';

import iconNavBackMarketUrl from '@/assets/images/common/icon_nav_back_market.svg?url';
import AppSideNav from '@/components/AppSideNav.vue';
import EmptyState from '@/components/EmptyState.vue';
import { fetchMatchList } from '@/api/match';
import { resolveTeamLogoUrl } from '@/constants/teamLogos';
import { useAppStore } from '@/store/modules/app';

const { t } = useI18n();
const router = useRouter();
const appStore = useAppStore();
const { isMobile } = storeToRefs(appStore);

const sideNavItems = [{ key: 'results', label: t('赛事结果') }];

const matches = ref([]);
const loading = ref(true);
const error = ref(false);

const beijingNow = ref('');
let clockTimer = null;
let refreshTimer = null;

/** 已结束赛事的状态标识（兼容多种后端枚举） */
const FINISHED_STATUS = new Set(['FINISHED', 'FT', 'ENDED', 'FULL_TIME', 'FULLTIME', 'COMPLETE', 'COMPLETED', 'CLOSED']);

function isFinishedStatus(status) {
  return FINISHED_STATUS.has(String(status || '').toUpperCase());
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
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).formatToParts(new Date());
  const pick = (type) => parts.find((p) => p.type === type)?.value ?? '';
  beijingNow.value = `${pick('year')}-${pick('month')}-${pick('day')} ${pick('hour')}:${pick('minute')}:${pick('second')}`;
}

async function loadMatches() {
  try {
    error.value = false;
    if (!matches.value.length) loading.value = true;
    const res = await fetchMatchList({ status: 'FINISHED', pageSize: 50 });
    const records = res.data?.records || [];
    // 后端未按 status 过滤时，前端再兜底筛一次已结束赛事。
    const finished = records.filter((m) => isFinishedStatus(m.status));
    matches.value = finished.length ? finished : records;
  } catch {
    error.value = true;
    matches.value = [];
  } finally {
    loading.value = false;
  }
}

function goBack() {
  if (window.history.length > 1) router.back();
  else router.push('/');
}

onMounted(() => {
  updateBeijingClock();
  clockTimer = window.setInterval(updateBeijingClock, 1000);
  loadMatches();
  refreshTimer = window.setInterval(loadMatches, 60000);
});

onBeforeUnmount(() => {
  if (clockTimer) window.clearInterval(clockTimer);
  if (refreshTimer) window.clearInterval(refreshTimer);
});
</script>

<template>
  <div class="result-page">
    <!-- 顶部返回栏 + 北京时间 -->
    <header class="result-topbar">
      <span v-if="!isMobile" class="result-topbar__clock">Beijing Time: {{ beijingNow }}</span>
      <div class="result-topbar__bar">
        <button type="button" class="result-topbar__back" :aria-label="t('返回')" @click="goBack">
          <img :src="iconNavBackMarketUrl" width="48" height="48" alt="" />
        </button>
        <h1 v-if="isMobile" class="result-topbar__title">{{ t('赛事结果') }}</h1>
      </div>
    </header>

    <div class="result-layout">
      <AppSideNav v-if="!isMobile" :items="sideNavItems" active-key="results" />

      <main class="result-content">
        <!-- 加载 -->
        <div v-if="loading" class="result-state">
          <div class="result-spinner" />
          <span>{{ t('加载中') }}</span>
        </div>

        <!-- 错误 -->
        <div v-else-if="error" class="result-state">
          <span>{{ t('加载失败') }}</span>
          <button type="button" class="result-retry" @click="loadMatches">{{ t('重试') }}</button>
        </div>

        <!-- 空 -->
        <EmptyState v-else-if="!resultMatches.length" :text="t('暂无相关赛事')" />

        <!-- 卡片列表 -->
        <div v-else class="result-grid">
          <article v-for="m in resultMatches" :key="m.id" class="result-card">
            <div class="result-card__top">
              <span class="result-card__league">
                <svg class="result-card__gear" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M8 10a2 2 0 100-4 2 2 0 000 4z" stroke="#7b92ad" stroke-width="1.2"/>
                  <path d="M8 1.5l1 1.6 1.9-.4.4 1.9 1.6 1-1 .9 1 .9-1.6 1-.4 1.9-1.9-.4-1 1.6-1-1.6-1.9.4-.4-1.9-1.6-1 1-.9-1-.9 1.6-1 .4-1.9 1.9.4 1-1.6z" stroke="#7b92ad" stroke-width="1" stroke-linejoin="round"/>
                </svg>
                <img v-if="m.leagueIcon" class="result-card__league-logo" :src="m.leagueIcon" alt="" width="18" height="18" @error="(e) => e.target.style.display='none'" />
                <span class="result-card__league-name">{{ m.league }}</span>
              </span>
              <span class="result-card__badge">{{ t('已结束') }}</span>
            </div>

            <div class="result-card__body">
              <div class="result-card__team result-card__team--home">
                <span class="result-card__team-name">{{ m.homeTeam }}</span>
                <img v-if="m.homeLogo" class="result-card__team-logo" :src="m.homeLogo" alt="" width="28" height="28" @error="(e) => e.target.style.display='none'" />
              </div>

              <div class="result-card__center">
                <div class="result-card__score">
                  <span class="result-card__score-home">{{ m.homeScore }}</span>
                  <span class="result-card__score-sep">:</span>
                  <span class="result-card__score-away">{{ m.awayScore }}</span>
                </div>
                <span class="result-card__time">{{ m.time }}</span>
              </div>

              <div class="result-card__team result-card__team--away">
                <img v-if="m.awayLogo" class="result-card__team-logo" :src="m.awayLogo" alt="" width="28" height="28" @error="(e) => e.target.style.display='none'" />
                <span class="result-card__team-name">{{ m.awayTeam }}</span>
              </div>
            </div>
          </article>
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

/* --- 顶部返回栏 + 北京时间 --- */
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
    padding: 0 32px;
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

/* --- 布局 --- */
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

/* --- 状态 --- */
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
  to { transform: rotate(360deg); }
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

/* --- 卡片网格 --- */
.result-grid {
  display: grid;
  gap: 12px;

  @include web-only {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @include mobile-only {
    grid-template-columns: minmax(0, 1fr);
  }
}

.result-card {
  padding: 12px 16px;
  border-radius: 14px;
  background: #fff;
  border: 0.8px solid rgba(255, 255, 255, 0.9);
  box-shadow: 0 2px 12px rgba(21, 58, 118, 0.06);
  box-sizing: border-box;
}

.result-card__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.result-card__league {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
}

.result-card__gear {
  flex-shrink: 0;
  display: block;
}

.result-card__league-logo {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  object-fit: contain;
  flex-shrink: 0;
}

.result-card__league-name {
  font-size: 13px;
  color: #5d7899;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 已结束：灰色徽标区分进行中（蓝色） */
.result-card__badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 20px;
  padding: 0 8px;
  border-radius: 6px;
  background: rgba(11, 52, 98, 0.1);
  color: #5d7899;
  font-size: 11px;
  font-weight: 500;
  white-space: nowrap;
  flex-shrink: 0;
}

.result-card__body {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  gap: 10px;
  margin-top: 12px;
}

.result-card__team {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;

  &--home { justify-content: flex-end; }
  &--away { justify-content: flex-start; }
}

.result-card__team-name {
  font-size: 14px;
  font-weight: 500;
  color: #0b3462;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.result-card__team-logo {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  object-fit: contain;
  flex-shrink: 0;
}

.result-card__center {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}

.result-card__score {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: $font-family-num, $font-family-base;
  font-size: 20px;
  font-weight: 700;
  line-height: 1;
  color: #0b3462;
}

.result-card__score-sep { color: #0b3462; }

.result-card__time {
  font-family: $font-family-num, $font-family-base;
  font-size: 12px;
  color: rgba(11, 52, 98, 0.45);
  line-height: 1;
}
</style>
