<script setup>
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';

import { getHotMatchById } from '@/constants/hotMatchCatalog';
import HomeMatchCard from '@/views/Home/components/HomeMatchCard.vue';

import logoMarketUrl from '@/assets/images/common/logo-market.svg?url';

const { t } = useI18n();
const route = useRoute();

const activeTab = ref('fulltime');
const buyType = ref('standard');
const buyAmount = ref('');
const showBuyPanel = ref(false);
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

watch(activeTab, () => {
  closeBuyPanel();
});

watch(
  () => route.params.id,
  (id) => {
    match.value = getHotMatchById(id);
    closeBuyPanel();
  },
);

function scrollToScoreMarket() {
  document.getElementById('score-market')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function selectRow(row) {
  selectedRow.value = row;
  showBuyPanel.value = true;
}

function closeBuyPanel() {
  showBuyPanel.value = false;
  selectedRow.value = null;
  buyAmount.value = '';
}
</script>

<template>
  <div class="market-detail">
    <div class="market-detail__layout">
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
          <HomeMatchCard :match="match" detail-mode @enter-market="scrollToScoreMarket" />
        </div>

        <section id="score-market" class="score-table card-default">
          <div class="score-table__head">
            <span>{{ t('比分') }}</span>
            <span>{{ t('概率') }}</span>
            <span class="score-table__head-vol">{{ t('成交量') }}</span>
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
              <span class="score-table__cell score-table__cell--score">{{ row.score }}</span>
              <span class="score-table__cell">{{ row.probability }}</span>
              <span class="score-table__cell score-table__cell--vol">{{ row.volumeFormatted }}</span>
              <span class="score-table__arrow" aria-hidden="true">›</span>
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
    padding-top: 20px;
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
      justify-content: center;
      /* 勿 stretch：否则侧栏被拉成与主列同高，position:sticky 无法相对主区“钉住” */
      align-items: flex-start;
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
      background: #fff;
      border-radius: 32px;
      border: 1px solid #fff;
      box-shadow: 0 6px 20px 0 rgba(21, 58, 118, 0.18);
      position: sticky;
      top: calc(#{$web-market-detail-sidebar-sticky-top} + 16px);
      align-self: flex-start;
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
      flex: 0 1 800px;
      width: 800px;
      max-width: 100%;
      box-sizing: border-box;
    }
  }

  &__hero {
    margin-bottom: $spacing-lg;
  }
}

.score-table {
  border-radius: 20px;
  overflow: hidden;
  border: 1px solid rgb(228, 240, 254);
  background: #fff;

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
      padding: 14px 18px;
      font-size: $font-size-md;
    }
  }

  &__head-vol {
    color: #e11d48;
  }

  &__body {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  &__row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1.4fr) 32px;
    gap: 8px;
    align-items: center;
    padding: 12px 14px;
    border-bottom: 1px solid rgb(240, 246, 255);
    cursor: pointer;
    transition: background 0.15s;

    @include web-only {
      padding: 14px 18px;
    }

    &:last-child {
      border-bottom: none;
    }

    &:hover {
      background: rgba(28, 123, 255, 0.04);
    }

    &--active {
      background: rgba(28, 123, 255, 0.08);
    }
  }

  &__cell {
    font-size: $font-size-md;
    color: #0b3462;

    &--score {
      font-family: $font-family-num;
      font-weight: 700;
    }

    &--vol {
      font-family: $font-family-num;
      font-weight: 600;
      color: #1c7bff;
      font-size: 13px;

      @include web-only {
        font-size: $font-size-md;
      }
    }
  }

  &__arrow {
    text-align: center;
    font-size: 22px;
    font-weight: 700;
    color: #1c7bff;
    line-height: 1;
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
