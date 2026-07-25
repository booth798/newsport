<script setup>
/**
 * 未开赛（PC 主视图，H5 兼容）
 * - 顶部返回栏 + 北京时间
 * - 左侧栏：Logo + 「未开赛」
 * - 右侧：未开赛赛事两列卡片（H5 单列），展示对阵与开赛时间
 * 数据源：/matches 列表 phase=upcoming。
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

const sideNavItems = [{ key: 'upcoming', label: t('未开赛') }];

const matches = ref([]);
const loading = ref(true);
const error = ref(false);

const beijingNow = ref('');
let clockTimer = null;
let refreshTimer = null;

/** 未开赛卡片展示的开赛日期时间（MM-DD HH:MM） */
function kickoffDateTime(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    return `${mm}-${dd} ${hh}:${mi}`;
  } catch { return ''; }
}

const upcomingMatches = computed(() =>
  matches.value.map((m) => ({
    id: m.id,
    league: m.league,
    leagueIcon: m.leagueIcon,
    homeTeam: m.homeTeam,
    awayTeam: m.awayTeam,
    homeLogo: resolveTeamLogoUrl(m.homeTeam, m.homeTeamLogo),
    awayLogo: resolveTeamLogoUrl(m.awayTeam, m.awayTeamLogo),
    time: kickoffDateTime(m.kickoffAt),
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
    // 使用服务端 phase=upcoming 过滤未开赛赛事（对齐安卓端 phase 过滤）。
    const res = await fetchMatchList({ phase: 'upcoming', pageSize: 50 });
    matches.value = res.data?.records || [];
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
  // 未开赛列表变动较慢，60s 刷新一次即可。
  refreshTimer = window.setInterval(loadMatches, 60000);
});

onBeforeUnmount(() => {
  if (clockTimer) window.clearInterval(clockTimer);
  if (refreshTimer) window.clearInterval(refreshTimer);
});
</script>

<template>
  <div class="upcoming-page">
    <!-- 顶部返回栏 + 北京时间 -->
    <header class="upcoming-topbar">
      <span v-if="!isMobile" class="upcoming-topbar__clock">Beijing Time: {{ beijingNow }}</span>
      <div class="upcoming-topbar__bar">
        <button type="button" class="upcoming-topbar__back" :aria-label="t('返回')" @click="goBack">
          <img :src="iconNavBackMarketUrl" width="48" height="48" alt="" />
        </button>
        <h1 v-if="isMobile" class="upcoming-topbar__title">{{ t('未开赛') }}</h1>
      </div>
    </header>

    <div class="upcoming-layout">
      <AppSideNav v-if="!isMobile" :items="sideNavItems" active-key="upcoming" />

      <main class="upcoming-content">
        <!-- 加载 -->
        <div v-if="loading" class="upcoming-state">
          <div class="upcoming-spinner" />
          <span>{{ t('加载中') }}</span>
        </div>

        <!-- 错误 -->
        <div v-else-if="error" class="upcoming-state">
          <span>{{ t('加载失败') }}</span>
          <button type="button" class="upcoming-retry" @click="loadMatches">{{ t('重试') }}</button>
        </div>

        <!-- 空 -->
        <EmptyState v-else-if="!upcomingMatches.length" :text="t('暂无相关赛事')" />

        <!-- 卡片列表 -->
        <div v-else class="upcoming-grid">
          <article v-for="m in upcomingMatches" :key="m.id" class="upcoming-card">
            <div class="upcoming-card__top">
              <span class="upcoming-card__league">
                <svg class="upcoming-card__gear" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M8 10a2 2 0 100-4 2 2 0 000 4z" stroke="#7b92ad" stroke-width="1.2"/>
                  <path d="M8 1.5l1 1.6 1.9-.4.4 1.9 1.6 1-1 .9 1 .9-1.6 1-.4 1.9-1.9-.4-1 1.6-1-1.6-1.9.4-.4-1.9-1.6-1 1-.9-1-.9 1.6-1 .4-1.9 1.9.4 1-1.6z" stroke="#7b92ad" stroke-width="1" stroke-linejoin="round"/>
                </svg>
                <img v-if="m.leagueIcon" class="upcoming-card__league-logo" :src="m.leagueIcon" alt="" width="18" height="18" @error="(e) => e.target.style.display='none'" />
                <span class="upcoming-card__league-name">{{ m.league }}</span>
              </span>
              <span class="upcoming-card__badge">{{ t('未开赛') }}</span>
            </div>

            <div class="upcoming-card__body">
              <div class="upcoming-card__team upcoming-card__team--home">
                <span class="upcoming-card__team-name">{{ m.homeTeam }}</span>
                <img v-if="m.homeLogo" class="upcoming-card__team-logo" :src="m.homeLogo" alt="" width="28" height="28" @error="(e) => e.target.style.display='none'" />
              </div>

              <div class="upcoming-card__center">
                <span class="upcoming-card__vs">VS</span>
                <span class="upcoming-card__time">{{ m.time }}</span>
              </div>

              <div class="upcoming-card__team upcoming-card__team--away">
                <img v-if="m.awayLogo" class="upcoming-card__team-logo" :src="m.awayLogo" alt="" width="28" height="28" @error="(e) => e.target.style.display='none'" />
                <span class="upcoming-card__team-name">{{ m.awayTeam }}</span>
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

.upcoming-page {
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
.upcoming-topbar {
  position: relative;

  @include web-only {
    width: min(1000px, calc(100vw - 60px));
    margin: 0 auto;
  }
}

.upcoming-topbar__clock {
  position: absolute;
  top: -18px;
  right: 4px;
  font-family: $font-family-num, $font-family-base;
  font-size: 12px;
  font-weight: 500;
  color: rgba(11, 52, 98, 0.48);
  white-space: nowrap;
}

.upcoming-topbar__bar {
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

.upcoming-topbar__back {
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

.upcoming-topbar__title {
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
.upcoming-layout {
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

.upcoming-content {
  min-width: 0;

  @include web-only {
    flex: 1;
  }

  @include mobile-only {
    width: 100%;
  }
}

/* --- 状态 --- */
.upcoming-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 260px;
  gap: 12px;
  color: #7b92ad;
  font-size: 14px;
}

.upcoming-spinner {
  width: 24px;
  height: 24px;
  border: 3px solid #e4f0fe;
  border-top-color: #1c7bff;
  border-radius: 50%;
  animation: upcoming-spin 0.8s linear infinite;
}

@keyframes upcoming-spin {
  to { transform: rotate(360deg); }
}

.upcoming-retry {
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
.upcoming-grid {
  display: grid;
  gap: 12px;

  @include web-only {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @include mobile-only {
    grid-template-columns: minmax(0, 1fr);
  }
}

.upcoming-card {
  padding: 12px 16px;
  border-radius: 14px;
  background: #fff;
  border: 0.8px solid rgba(255, 255, 255, 0.9);
  box-shadow: 0 2px 12px rgba(21, 58, 118, 0.06);
  box-sizing: border-box;
}

.upcoming-card__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.upcoming-card__league {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
}

.upcoming-card__gear {
  flex-shrink: 0;
  display: block;
}

.upcoming-card__league-logo {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  object-fit: contain;
  flex-shrink: 0;
}

.upcoming-card__league-name {
  font-size: 13px;
  color: #5d7899;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 未开赛：绿色徽标区分进行中（蓝色）与已结束（灰色） */
.upcoming-card__badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 20px;
  padding: 0 8px;
  border-radius: 6px;
  background: rgba(31, 178, 107, 0.12);
  color: #1fa85f;
  font-size: 11px;
  font-weight: 500;
  white-space: nowrap;
  flex-shrink: 0;
}

.upcoming-card__body {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  gap: 10px;
  margin-top: 12px;
}

.upcoming-card__team {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;

  &--home { justify-content: flex-end; }
  &--away { justify-content: flex-start; }
}

.upcoming-card__team-name {
  font-size: 14px;
  font-weight: 500;
  color: #0b3462;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.upcoming-card__team-logo {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  object-fit: contain;
  flex-shrink: 0;
}

.upcoming-card__center {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.upcoming-card__vs {
  font-family: $font-family-num, $font-family-base;
  font-size: 16px;
  font-weight: 700;
  line-height: 1;
  color: #1c7bff;
}

.upcoming-card__time {
  font-family: $font-family-num, $font-family-base;
  font-size: 12px;
  color: rgba(11, 52, 98, 0.45);
  line-height: 1;
  white-space: nowrap;
}
</style>
