<script setup>
import { computed, nextTick, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';

import { getHotMatchById } from '@/constants/hotMatchCatalog';
import { useAppStore } from '@/store/modules/app';
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
const buyType = ref('standard');
const buyAmount = ref('');
const showBuyPanel = ref(false);
const showBuySheet = ref(false);
const selectedRow = ref(null);

const match = ref(getHotMatchById(route.params.id));

function formatVolumeMoney(n) {
  return `¥${n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function buildScoreRows(matchId, tab) {
  const rows = [];
  const tabSalt = tab === 'halftime' ? 41 : 0;
  for (let h = 0; h <= 3; h += 1) {
    for (let a = 0; a <= 3; a += 1) {
      const k = (h * 4 + a + matchId * 7 + tabSalt) % 97;
      const prob = 2.1 + (k * 0.191) % 9.2;
      const volumeBase = 6_000_000 + (k * 97_127 + h * 11_000 + a * 19_000) % 92_000_000;
      rows.push({
        score: `${h}-${a}`,
        probability: `${prob.toFixed(2)}%`,
        volumeFormatted: formatVolumeMoney(volumeBase),
      });
    }
  }
  return rows;
}

const scoreRows = computed(() => buildScoreRows(match.value.id, activeTab.value));
const scoreRowsFulltime = computed(() => buildScoreRows(match.value.id, 'fulltime'));
const scoreRowsHalftime = computed(() => buildScoreRows(match.value.id, 'halftime'));

function scoreRowsForTab(tab) {
  return tab === 'halftime' ? scoreRowsHalftime.value : scoreRowsFulltime.value;
}

function isSectionExpanded(tab) {
  return expandedSections.value[tab];
}

function toggleSection(tab) {
  expandedSections.value[tab] = !expandedSections.value[tab];
}

watch(activeTab, () => {
  closeBuyPanel();
  closeBuySheet();
});

watch(
  () => route.params.id,
  (id) => {
    match.value = getHotMatchById(id);
    expandedSections.value = { fulltime: true, halftime: false };
    closeBuyPanel();
    closeBuySheet();
  },
);

function scrollToScoreMarket() {
  document.getElementById('score-market')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function defaultScoreRow(tab = 'fulltime') {
  const rows = scoreRowsForTab(tab);
  return rows.find((r) => r.score === '0-0') ?? rows[0] ?? null;
}

function openBuySheet(row, tab = activeTab.value) {
  if (!row) return;
  activeTab.value = tab;
  selectedRow.value = row;
  if (isMobile.value) {
    showBuySheet.value = true;
    showBuyPanel.value = false;
  } else {
    showBuyPanel.value = true;
    showBuySheet.value = false;
  }
}

function openBuySheetFromHero() {
  openBuySheet(defaultScoreRow('fulltime'), 'fulltime');
}

/** 顶部「进入市场」：H5 弹层；PC 打开下方买入区并滚到盘口 */
function onEnterMarket() {
  openBuySheetFromHero();
  if (!isMobile.value) {
    nextTick(() => scrollToScoreMarket());
  }
}

function selectRow(row, tab = activeTab.value) {
  openBuySheet(row, tab);
}

function closeBuyPanel() {
  showBuyPanel.value = false;
  if (!showBuySheet.value) {
    selectedRow.value = null;
    buyAmount.value = '';
  }
}

function closeBuySheet() {
  showBuySheet.value = false;
  selectedRow.value = null;
  buyAmount.value = '';
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
    <div v-if="!isMobile" class="market-detail__layout">
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
          <HomeMatchCard :match="match" detail-mode @enter-market="onEnterMarket" />
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
              :class="{ 'score-table__row--active': selectedRow?.score === row.score && showBuyPanel }"
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

        <Transition name="slide">
          <div v-if="showBuyPanel" class="buy-panel card-default">
            <div class="buy-panel__header">
              <h3 class="buy-panel__title">
                {{ t('比分') }} {{ selectedRow?.score }} · {{ selectedRow?.probability }}
              </h3>
              <button type="button" class="buy-panel__close" @click="closeBuyPanel">✕</button>
            </div>

            <div class="buy-panel__type">
              <button type="button" class="type-btn" :class="{ active: buyType === 'standard' }" @click="buyType = 'standard'">
                {{ t('一般买入') }}
              </button>
              <button type="button" class="type-btn" :class="{ active: buyType === 'scheduled' }" @click="buyType = 'scheduled'">
                {{ t('预约买入') }}
              </button>
            </div>

            <div class="buy-panel__amount">
              <label class="form-label">{{ t('买入金额') }}</label>
              <input v-model="buyAmount" type="number" class="form-input" placeholder="0.00" />
            </div>

            <div class="buy-panel__actions">
              <button type="button" class="btn btn--default-2 cancel-btn" @click="closeBuyPanel">
                {{ t('取消') }}
              </button>
              <button type="button" class="btn btn--primary confirm-btn">
                {{ t('确认买入') }}
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </div>

    <!-- H5：赛事卡 + 全场/半场折叠面板 -->
    <div v-else class="market-detail__layout market-detail__layout--m">
      <div class="market-detail__main market-detail__main--m">
        <div class="market-detail__hero market-detail__hero--m">
          <HomeMatchCard :match="match" detail-mode @enter-market="openBuySheetFromHero" />
        </div>

        <div class="market-detail__sections">
          <MarketDetailScoreSection
            v-for="sec in mobileSections"
            :key="sec.tab"
            :title-key="sec.titleKey"
            :tab="sec.tab"
            :rows="scoreRowsForTab(sec.tab)"
            :expanded="isSectionExpanded(sec.tab)"
            :active-score="selectedRow?.score"
            :show-active="showBuyPanel && activeTab === sec.tab"
            @toggle="toggleSection(sec.tab)"
            @select-row="selectRow($event, sec.tab)"
            @open-purchase="goToPurchaseDetails($event, sec.tab)"
          />
        </div>

        <MarketBuySheet
          :visible="showBuySheet"
          :match="match"
          :row="selectedRow"
          :market-tab="activeTab"
          @close="closeBuySheet"
        />
      </div>
    </div>
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
      min-height: calc(100vh - #{$web-market-detail-sidebar-sticky-top} - 36px);
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

.buy-panel {
  margin-top: $spacing-xl;
  border-radius: $radius-lg;
  padding: $spacing-3xl;

  @include mobile-only {
    padding: $spacing-lg;
  }

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: $spacing-xl;
  }

  &__title {
    font-size: $font-size-lg;
    font-weight: 700;
    color: var(--theme-text);
    margin: 0;
  }

  &__close {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: var(--surface-tint);
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    color: var(--theme-text-1);
  }

  &__type {
    display: flex;
    gap: $spacing-sm;
    margin-bottom: $spacing-xl;
  }

  &__amount {
    margin-bottom: $spacing-xl;
  }

  &__actions {
    display: flex;
    gap: $spacing-md;
  }
}

.type-btn {
  flex: 1;
  height: 44px;
  border-radius: $radius-pill;
  border: 1.5px solid var(--theme-divider);
  background: transparent;
  font-size: $font-size-md;
  color: var(--theme-text);
  cursor: pointer;
  transition: all 0.2s;

  &.active {
    background: var(--theme-primary);
    color: #fff;
    border-color: var(--theme-primary);
  }
}

.form-label {
  display: block;
  font-size: $font-size-md;
  color: var(--theme-text-1);
  margin-bottom: $spacing-sm;
}

.form-input {
  width: 100%;
  height: 52px;
  border: 1.5px solid var(--theme-divider);
  border-radius: $radius-md;
  padding: 0 $spacing-lg;
  font-size: $font-size-xl;
  font-family: $font-family-num;
  color: var(--theme-text);
  background: transparent;
  outline: none;
  transition: border-color 0.2s;

  &:focus {
    border-color: var(--theme-primary);
  }
}

.cancel-btn {
  flex: 1;
  height: 48px;
  border: 1.5px solid var(--theme-divider);
}

.confirm-btn {
  flex: 2;
  height: 48px;
}

.slide-enter-active,
.slide-leave-active {
  transition: all 0.3s ease;
}

.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  transform: translateY(20px);
}
</style>
