<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';

import { useAppStore } from '@/store/modules/app';
import { fetchMatchDetail, fetchScoreMarket } from '@/api/match';
import { useMarketWs } from '@/hooks/useMarketWs';
import MarketDetailScoreSection from '@/views/Market/Detail/components/MarketDetailScoreSection.vue';
import MarketBuySheet from '@/views/Market/Detail/components/MarketBuySheet.vue';
import HomeMatchCard from '@/views/Home/components/HomeMatchCard.vue';

import iconArrowRightUrl from '@/assets/images/common/icon_arrow_right.svg?url';
import iconVolumeThumbUpUrl from '@/assets/images/common/icon_volume_thumb_up.svg?url';
import logoMarketUrl from '@/assets/images/common/logo-market.svg?url';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const appStore = useAppStore();
const { isMobile } = storeToRefs(appStore);

const activeTab = ref('fulltime');
const expandedSections = ref({
  fulltime: true,
  halftime: false,
});

const mobileSections = [
  { tab: 'fulltime', titleKey: '全场赛果' },
  { tab: 'halftime', titleKey: '半场赛果' },
];
const showBuySheet = ref(false);
const selectedRow = ref(null);

const match = ref(null);
const loading = ref(true);
const error = ref(false);

const scoreRowsFulltime = ref([]);
const scoreRowsHalftime = ref([]);
const scoreRowsLoading = ref(false);

const scoreRows = ref([]);

const ftMarketId = ref(null);
const htMarketId = ref(null);
const activeMarketId = computed(() =>
  activeTab.value === 'halftime' ? htMarketId.value : ftMarketId.value,
);

const { yields: wsYields } = useMarketWs(activeMarketId);

watch(wsYields, (newYields) => {
  if (!newYields || !Object.keys(newYields).length) return;
  const rows = activeTab.value === 'halftime' ? scoreRowsHalftime : scoreRowsFulltime;
  rows.value = rows.value.map((row) => {
    const newVal = newYields[row.scoreRaw];
    if (newVal == null) return row;
    return {
      ...row,
      yieldPct: newVal,
      probability: `${Number(newVal).toFixed(2)}%`,
    };
  });
  scoreRows.value = rows.value;
}, { deep: true });

function scoreRowsForTab(tab) {
  return tab === 'halftime' ? scoreRowsHalftime.value : scoreRowsFulltime.value;
}

function isSectionExpanded(tab) {
  return expandedSections.value[tab];
}

function toggleSection(tab) {
  expandedSections.value[tab] = !expandedSections.value[tab];
}

async function loadMatchData(id) {
  try {
    loading.value = true;
    error.value = false;
    const [matchRes, fulltimeRes, halftimeRes] = await Promise.all([
      fetchMatchDetail(id),
      fetchScoreMarket(Number(id), 'fulltime'),
      fetchScoreMarket(Number(id), 'halftime'),
    ]);
    match.value = matchRes.data;
    scoreRowsFulltime.value = fulltimeRes.data;
    scoreRowsHalftime.value = halftimeRes.data;
    scoreRows.value = fulltimeRes.data;
    ftMarketId.value = fulltimeRes.data?.[0]?._marketId || null;
    htMarketId.value = halftimeRes.data?.[0]?._marketId || null;
  } catch {
    error.value = true;
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  await loadMatchData(route.params.id);
  if (route.query.autoBuy === '1') {
    const targetScore = route.query.score;
    const rows = scoreRowsFulltime.value;
    const row = targetScore
      ? rows.find((r) => r.score === targetScore) ?? rows[0]
      : rows[0];
    if (row) openBuySheet(row, 'fulltime');
  }
});

watch(activeTab, () => {
  scoreRows.value = activeTab.value === 'halftime' ? scoreRowsHalftime.value : scoreRowsFulltime.value;
  closeBuySheet();
});

watch(
  () => route.params.id,
  (id) => {
    expandedSections.value = { fulltime: true, halftime: false };
    closeBuySheet();
    loadMatchData(id);
  },
);

function defaultScoreRow(tab = 'fulltime') {
  const rows = scoreRowsForTab(tab);
  return rows.find((r) => r.score === '0-0') ?? rows[0] ?? null;
}

function openBuySheet(row, tab = activeTab.value) {
  if (!row) return;
  activeTab.value = tab;
  selectedRow.value = row;
  showBuySheet.value = true;
}

function openBuySheetFromHero() {
  openBuySheet(defaultScoreRow('fulltime'), 'fulltime');
}

function selectRow(row, tab = activeTab.value) {
  openBuySheet(row, tab);
}

function closeBuySheet() {
  showBuySheet.value = false;
  selectedRow.value = null;
}

function formatScoreLabel(score) {
  return score.replace('-', ' - ');
}

function goToPurchaseDetails(row, tab = activeTab.value) {
  router.push({
    name: 'trade-purchases',
    query: {
      tab: 'ordered',
      marketId: String(match.value.id),
      score: row.score,
      probability: row.probability,
      marketTab: tab,
      from: 'market',
    },
  });
}
</script>

<template>
  <div class="market-detail">
    <div v-if="loading" class="market-detail__loading">
      <div class="market-detail__spinner" />
      <span>{{ t('加载中') }}</span>
    </div>

    <div v-else-if="error" class="market-detail__error">
      <span>{{ t('加载失败') }}</span>
      <button type="button" class="market-detail__retry" @click="loadMatchData(route.params.id)">{{ t('重试') }}</button>
    </div>

    <div v-else-if="!isMobile" class="market-detail__layout">
      <aside class="market-detail__sidebar" aria-label="market-nav">
        <RouterLink to="/" class="market-detail__brand market-detail__brand--flush">
          <img :src="logoMarketUrl" alt="" class="market-detail__brand-img" width="180" height="96" />
        </RouterLink>
        <nav class="market-detail__side-nav">
          <button
            type="button"
            class="market-detail__side-tab"
            :class="{ 'market-detail__side-tab--active': activeTab === 'fulltime' }"
            @click="activeTab = 'fulltime'"
          >
            {{ t('全场赛果') }}
          </button>
          <div class="market-detail__side-divider" aria-hidden="true" />
          <button
            type="button"
            class="market-detail__side-tab"
            :class="{ 'market-detail__side-tab--active': activeTab === 'halftime' }"
            @click="activeTab = 'halftime'"
          >
            {{ t('半场赛果') }}
          </button>
        </nav>
      </aside>

      <div class="market-detail__main">
        <div class="market-detail__hero">
          <HomeMatchCard :match="match" detail-mode @enter-market="openBuySheetFromHero" />
        </div>

        <section
          id="score-market"
          class="score-table card-default"
          :class="{ 'score-table--halftime': activeTab === 'halftime' }"
        >
          <div class="score-table__head">
            <span class="score-table__head-label score-table__head-label--score">{{ t('比分') }}</span>
            <span class="score-table__head-label score-table__head-label--prob">{{ t('概率') }}</span>
            <span class="score-table__head-vol">
              <img
                class="score-table__head-vol-icon"
                :src="iconVolumeThumbUpUrl"
                width="20"
                height="20"
                alt=""
              />
              <span class="score-table__head-vol-text">{{ t('成交量') }}</span>
            </span>
          </div>
          <ul class="score-table__body">
            <li
              v-for="row in scoreRows"
              :key="`${activeTab}-${row.score}`"
              class="score-table__row"
              :class="{ 'score-table__row--active': selectedRow?.score === row.score && showBuySheet }"
              role="button"
              tabindex="0"
              @click="selectRow(row)"
              @keydown.enter.prevent="selectRow(row)"
            >
              <span class="score-table__cell score-table__cell--score">{{ formatScoreLabel(row.score) }}</span>
              <span class="score-table__cell score-table__cell--prob">{{ row.probability }}</span>
              <span class="score-table__cell score-table__cell--vol">{{ row.volumeFormatted }}</span>
              <img
                class="score-table__arrow"
                :src="iconArrowRightUrl"
                width="24"
                height="24"
                alt=""
                aria-hidden="true"
                @click.stop="goToPurchaseDetails(row)"
              />
            </li>
          </ul>
        </section>
      </div>
    </div>

    <!-- H5：赛事卡 + 全场/半场 pill tabs + 平铺列表 -->
    <div v-else class="market-detail__layout market-detail__layout--m">
      <div class="market-detail__main market-detail__main--m">
        <div class="m-detail-wrap">
          <div class="m-detail-wrap__hero">
            <HomeMatchCard :match="match" detail-mode @enter-market="openBuySheetFromHero" />
          </div>

          <section class="m-score-card">
          <div class="m-score-card__tab-bar">
            <div class="m-score-card__tabs">
              <button
                type="button"
                class="m-score-card__tab"
                :class="{ 'm-score-card__tab--active': activeTab === 'fulltime' }"
                @click="activeTab = 'fulltime'"
              >
                {{ t('全场') }}
              </button>
              <button
                type="button"
                class="m-score-card__tab"
                :class="{ 'm-score-card__tab--active': activeTab === 'halftime' }"
                @click="activeTab = 'halftime'"
              >
                {{ t('半场') }}
              </button>
            </div>
            <span class="m-score-card__vol-badge">
              <img
                class="m-score-card__vol-icon"
                :src="iconVolumeThumbUpUrl"
                width="14"
                height="14"
                alt=""
              />
              <span class="m-score-card__vol-text">{{ t('成交量') }}</span>
            </span>
          </div>

          <ul class="m-score-card__list">
            <li
              v-for="row in scoreRows"
              :key="`${activeTab}-${row.score}`"
              class="m-score-card__row"
              :class="{
                'm-score-card__row--active': selectedRow?.score === row.score && showBuySheet,
                'm-score-card__row--halftime': activeTab === 'halftime',
              }"
              role="button"
              tabindex="0"
              @click="selectRow(row)"
              @keydown.enter.prevent="selectRow(row)"
            >
              <span class="m-score-card__cell m-score-card__cell--score">{{ formatScoreLabel(row.score) }}</span>
              <span class="m-score-card__cell m-score-card__cell--prob">{{ row.probability }}</span>
              <span class="m-score-card__cell m-score-card__cell--vol">{{ row.volumeFormatted }}</span>
              <img
                class="m-score-card__arrow"
                :src="iconArrowRightUrl"
                width="16"
                height="16"
                alt=""
                aria-hidden="true"
                @click.stop="goToPurchaseDetails(row)"
              />
            </li>
          </ul>
        </section>
        </div>
      </div>
    </div>

    <MarketBuySheet
      :visible="showBuySheet"
      :match="match"
      :row="selectedRow"
      :market-tab="activeTab"
      @close="closeBuySheet"
    />
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/tools.scss' as *;

.market-detail {
  @include container;
  @include web-main-column-max;
  padding-top: $spacing-md;
  padding-bottom: $spacing-4xl;

  @include web-only {
    padding-top: 16px;
    /* 与侧栏 1px 白边形成对比 */
    background: #e3ecfb;
    border-radius: 0;
    box-sizing: border-box;
  }

  &__loading,
  &__error {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    min-height: 300px;
    color: var(--theme-text-1);
    font-size: $font-size-md;
  }

  &__spinner {
    width: 28px;
    height: 28px;
    border: 3px solid var(--theme-divider);
    border-top-color: var(--theme-primary);
    border-radius: 50%;
    animation: market-spin 0.8s linear infinite;
  }

  @keyframes market-spin {
    to { transform: rotate(360deg); }
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

  &__layout {
    display: flex;
    align-items: flex-start;
    gap: 16px;

    @include web-only {
      display: grid;
      grid-template-columns: 180px minmax(0, 800px);
      justify-content: center;
      align-items: start;
      gap: 28px;
    }

    @include mobile-only {
      flex-direction: column;
      gap: 12px;
    }
  }

  &__sidebar {
    display: flex;
    flex-direction: column;
    gap: 0;
    flex-shrink: 0;

    @include web-only {
      width: 180px;
      box-sizing: border-box;
      padding: 0 0 20px;
      /* 抵消 sticky 顶栏占位与主列起始位的差值，使侧栏白卡与右侧大卡片顶对齐 */
      // margin-top: -9px;
      background: #fff;
      border-radius: 32px;
      border: 1px solid #fff;
      box-shadow: 0 6px 20px 0 rgba(21, 58, 118, 0.18);
      position: sticky;
      top: $web-market-detail-sidebar-sticky-top;
      align-self: start;
      min-height: calc(100dvh - #{$web-market-detail-sidebar-sticky-top} - 36px);
      overflow-x: hidden;
      overflow-y: auto;
    }

    @include mobile-only {
      flex-direction: row;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      width: 100%;
      position: sticky;
      top: calc(#{$mobile-market-detail-sidebar-sticky-top} + 8px);
      z-index: 4;
      padding: 12px;
      margin-bottom: -4px;
      box-sizing: border-box;
      background: #fff;
      border-radius: 20px;
      border: 1px solid #fff;
      box-shadow: 0 4px 16px rgba(21, 58, 118, 0.12);
    }
  }

  &__brand {
    display: block;
    flex-shrink: 0;
    line-height: 0;
    text-decoration: none;
    color: inherit;

    &--flush {
      @include web-only {
        width: 100%;
        margin: 0;
      }
    }

    @include mobile-only {
      order: 0;
      max-width: 52%;
    }
  }

  &__brand-img {
    display: block;
    width: 100%;
    height: auto;
    vertical-align: top;

    @include web-only {
      width: 100%;
      max-width: none;
      margin: 0;
    }

    @include mobile-only {
      max-height: 44px;
      width: auto;
      max-width: 100%;
    }
  }

  &__side-nav {
    display: flex;
    flex-direction: column;
    gap: 0;

    @include web-only {
      flex: 1;
      padding: 14px 12px 0;
      box-sizing: border-box;
    }

    @include mobile-only {
      flex: 1;
      flex-direction: row;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: 8px;
    }
  }

  &__side-divider {
    @include web-only {
      height: 1px;
      margin: 10px 14px;
      background: rgba(11, 52, 98, 0.12);
      flex-shrink: 0;
    }

    @include mobile-only {
      display: none;
    }
  }

  &__side-tab {
    width: 100%;
    padding: 12px 14px;
    border-radius: 16px;
    border: none;
    background: transparent;
    font-size: 18px;
    font-weight: 400;
    color: #0b3462;
    cursor: pointer;
    text-align: center;
    transition:
      background 0.2s ease,
      color 0.2s ease;

    @include web-only {
      position: relative;
      z-index: 0;
      box-sizing: border-box;
      width: 156px;
      max-width: 100%;
      min-height: 56px;
      margin-inline: auto;
      padding: 0 14px 0 18px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;

      &:hover:not(.market-detail__side-tab--active) {
        background: rgba(28, 123, 255, 0.04);
        color: #0b3462;
      }

      &:focus-visible {
        outline: 2px solid rgba(28, 123, 255, 0.45);
        outline-offset: 2px;
      }
    }

    @include mobile-only {
      width: auto;
      padding: 8px 14px;
      font-size: 13px;
      font-weight: 600;
      border: 1.5px solid rgb(228, 240, 254);
      background: #fff;
      text-align: left;
    }

    &--active {
      @include web-only {
        z-index: 1;
        font-weight: 400;
        color: #1c7bff;
        /* Figma：#1C7BFF 10% */
        background: rgba(28, 123, 255, 0.1);
        box-shadow: none;
        border-left: 4px solid #1c7bff;
        padding-left: 14px;

        &:hover {
          background: rgba(28, 123, 255, 0.14);
          color: #1c7bff;
        }
      }

      @include mobile-only {
        border-color: #1c7bff;
        background: #1c7bff;
        color: #fff;
        box-shadow: none;
      }
    }
  }

  &__main {
    flex: 1;
    min-width: 0;

    @include web-only {
      flex: none;
      width: 800px;
      max-width: 100%;
      box-sizing: border-box;
      align-self: start;
    }
  }

  &__hero {
    margin-top: 0;
    margin-bottom: $spacing-lg;
  }

  @include mobile-only {
    padding-top: 8px;
    padding-bottom: calc($mobile-tab-bar-offset + $spacing-3xl);
    background: #e3ecfb;
  }

  &__layout--m {
    flex-direction: column;
    gap: 12px;
  }

  &__main--m {
    width: 100%;
    min-width: 0;
  }

  &__hero--m {
    margin-bottom: 12px;
  }

  &__sections {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
}

.m-detail-wrap {
  @include mobile-only {
    background: #eaf1f9;
    border: 0.8px solid #fff;
    border-radius: 16px;
    padding: 16px;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  &__hero {
    @include mobile-only {
      :deep(.match-card--detail-h5) {
        padding: 0;
        border-radius: 0;
        background: transparent;
        border: none;
        box-shadow: none;
      }
    }
  }
}

/* H5 比分市场卡片 — pill tabs + 平铺列表（Figma 355:3541） */
.m-score-card {
  @include mobile-only {
    background: #eaf1f9;
    border-radius: 16px;
    border: 1px solid #eaf1f9;
    overflow: hidden;
    padding: 12px;
    box-sizing: border-box;
  }

  &__tab-bar {
    @include mobile-only {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 12px;
    }
  }

  &__tabs {
    @include mobile-only {
      display: flex;
      align-items: center;
      gap: 6px;
    }
  }

  &__tab {
    @include mobile-only {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 69px;
      height: 28px;
      padding: 0;
      border-radius: 48px;
      border: 0.8px solid #d6e0eb;
      background: transparent;
      font-family: $font-family-base;
      font-size: 12px;
      font-weight: 350;
      color: #0b3462;
      cursor: pointer;
      transition:
        background 0.2s ease,
        color 0.2s ease,
        border-color 0.2s ease;
    }

    &--active {
      @include mobile-only {
        background: #1c7bff;
        border-color: #1c7bff;
        color: #fff;
        font-weight: 500;
        box-shadow: 0 3px 8px rgba(21, 58, 119, 0.1);
      }
    }
  }

  &__vol-badge {
    @include mobile-only {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 3px;
      width: 70px;
      height: 28px;
      border-radius: 35px;
      border: 0.5px solid #fff;
      background: #ff2d2d;
      color: #fff;
      flex-shrink: 0;
      box-shadow:
        inset 6px 6px 12px 0 rgba(255, 255, 255, 0.2),
        inset 3px 2px 10px 0 rgba(255, 255, 255, 0.2);
    }
  }

  &__vol-icon {
    @include mobile-only {
      display: block;
      width: 14px;
      height: 14px;
      flex-shrink: 0;
      pointer-events: none;
    }
  }

  &__vol-text {
    @include mobile-only {
      font-family: $font-family-base;
      font-size: 12px;
      font-weight: 500;
      line-height: 1;
      white-space: nowrap;
    }
  }

  &__list {
    @include mobile-only {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
  }

  &__row {
    @include mobile-only {
      display: grid;
      grid-template-columns: 50px 60px 1fr 16px;
      gap: 0;
      align-items: center;
      height: 40px;
      padding: 0 14px;
      border-radius: 12px;
      background: #eaf1f9;
      cursor: pointer;
      box-sizing: border-box;
      transition:
        background 0.15s ease,
        box-shadow 0.15s ease;
    }

    &:active {
      @include mobile-only {
        background: rgba(28, 123, 255, 0.12);
      }
    }

    &--active {
      @include mobile-only {
        background: rgba(28, 123, 255, 0.12);
      }
    }
  }

  &__cell {
    @include mobile-only {
      font-size: 14px;
      color: #0b3462;
      min-width: 0;
    }

    &--score {
      @include mobile-only {
        font-family: $font-family-base;
        font-weight: 700;
      }
    }

    &--prob {
      @include mobile-only {
        font-family: $font-family-base;
        font-weight: 700;
        color: #1c7bff;
      }
    }

    &--vol {
      @include mobile-only {
        font-family: $font-family-base;
        font-weight: 400;
        text-align: right;
      }
    }
  }

  &__row--halftime &__cell--prob {
    @include mobile-only {
      color: #fb5c0d;
    }
  }

  &__arrow {
    @include mobile-only {
      display: block;
      width: 16px;
      height: 16px;
      border-radius: 12px;
      flex-shrink: 0;
      justify-self: end;
      cursor: pointer;
    }
  }
}

.score-table {
  border-radius: 20px;
  overflow: hidden;
  border: 1px solid rgb(228, 240, 254);
  background: #fff;

  @include web-only {
    overflow: visible;
    padding: 25px 44px 32px;
    border-radius: 32px;
    border: 1px solid rgb(228, 240, 254);
    background: #fff;
    box-shadow: var(--shadow-card);
  }

  &__head {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1.4fr) 32px;
    gap: 8px;
    padding: 12px 14px;
    font-size: 13px;
    font-weight: 600;
    color: rgba(11, 52, 98, 0.65);
    background: #f3f8ff;
    border-bottom: 1px solid rgb(228, 240, 254);

    @include web-only {
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1.4fr) 24px;
      gap: 12px;
      align-items: center;
      min-height: 34px;
      padding: 0;
      margin-bottom: 16px;
      background: transparent;
      border-bottom: none;
    }
  }

  &__head-label {
    @include web-only {
      font-family: $font-family-base;
      font-size: 16px;
      font-weight: 500;
      line-height: 1;
      color: #0b3462;
    }

    &--score {
      @include web-only {
        text-align: left;
      }
    }

    &--prob {
      @include web-only {
        text-align: center;
      }
    }
  }

  &__head-vol {
    color: #e11d48;

    @include web-only {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      box-sizing: border-box;
      width: 100px;
      height: 34px;
      padding: 0 10px;
      border-radius: 49.58px;
      border: 1px solid #fff;
      background: rgba(255, 45, 45, 1);
      color: #fff;
      justify-self: end;
      box-shadow:
        0 4px 12px rgba(255, 45, 45, 0.28),
        inset 6px 6px 12px 0 rgba(255, 255, 255, 0.2),
        inset 3px 2px 10px 0 rgba(255, 255, 255, 0.2);
    }
  }

  &__head-vol-icon {
    @include web-only {
      display: block;
      width: 20px;
      height: 20px;
      flex-shrink: 0;
      pointer-events: none;
    }
  }

  &__head-vol-text {
    @include web-only {
      font-family: $font-family-base;
      font-size: 16px;
      font-weight: 500;
      line-height: 1;
      white-space: nowrap;
    }
  }

  &__body {
    list-style: none;
    margin: 0;
    padding: 0;

    @include web-only {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
  }

  &--halftime {
    @include web-only {
      .score-table__cell--prob {
        color: #fb5c0d;
      }
    }
  }

  &__row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1.4fr) 32px;
    gap: 8px;
    align-items: center;
    padding: 12px 14px;
    border-bottom: 1px solid rgb(240, 246, 255);
    cursor: pointer;
    transition:
      background 0.15s ease,
      box-shadow 0.15s ease;

    @include web-only {
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1.4fr) 24px;
      gap: 12px;
      min-height: 48px;
      padding: 10px 20px;
      border-bottom: none;
      border-radius: 16px;
      background: rgba(240, 247, 255, 0.92);
      border: 1px solid rgba(228, 240, 254, 0.9);
    }

    &:last-child {
      border-bottom: none;
    }

    &:hover {
      background: rgba(28, 123, 255, 0.04);

      @include web-only {
        background: rgba(228, 240, 254, 0.98);
        box-shadow: 0 2px 8px rgba(21, 58, 118, 0.08);
      }
    }

    &--active {
      background: rgba(28, 123, 255, 0.08);

      @include web-only {
        background: rgba(28, 123, 255, 0.12);
        border-color: rgba(28, 123, 255, 0.28);
        box-shadow: 0 2px 10px rgba(28, 123, 255, 0.12);
      }
    }
  }

  &__cell {
    font-size: $font-size-md;
    color: #0b3462;

    @include web-only {
      font-size: 16px;
    }

    &--score {
      font-family: $font-family-num;
      font-weight: 700;

      @include web-only {
        font-weight: 600;
        text-align: left;
      }
    }

    &--prob {
      @include web-only {
        font-family: $font-family-num;
        font-weight: 600;
        color: #1c7bff;
        text-align: center;
      }
    }

    &--vol {
      font-family: $font-family-num;
      font-weight: 600;
      color: #1c7bff;
      font-size: 13px;

      @include web-only {
        font-weight: 500;
        color: #0b3462;
        text-align: right;
      }
    }
  }

  &__arrow {
    text-align: center;
    font-size: 22px;
    font-weight: 700;
    color: #1c7bff;
    line-height: 1;

    @include web-only {
      display: block;
      width: 24px;
      height: 24px;
      flex-shrink: 0;
      justify-self: end;
      cursor: pointer;
    }
  }
}

</style>
