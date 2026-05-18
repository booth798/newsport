<script setup>
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';

import { getOrderedPurchaseList, getScheduledPurchaseList } from '@/constants/purchaseOrders';
import { useAppStore } from '@/store/modules/app';
import PurchaseOrderCard from '@/views/Trade/PurchaseDetails/components/PurchaseOrderCard.vue';

import logoMarketUrl from '@/assets/images/common/logo-market.svg?url';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const appStore = useAppStore();
const { isMobile } = storeToRefs(appStore);

const sideTab = ref(route.query.tab === 'scheduled' ? 'scheduled' : 'ordered');
const expandedIds = ref(new Set());

const marketId = computed(() => {
  const raw = route.query.marketId;
  const id = Number(Array.isArray(raw) ? raw[0] : raw);
  return Number.isFinite(id) && id > 0 ? id : 2;
});

const highlightScore = computed(() => {
  const raw = route.query.score;
  return typeof raw === 'string' ? raw : Array.isArray(raw) ? raw[0] : null;
});

const highlightProbability = computed(() => {
  const raw = route.query.probability;
  return typeof raw === 'string' ? raw : Array.isArray(raw) ? raw[0] : null;
});

const listOptions = computed(() => ({
  highlightScore: highlightScore.value,
  highlightProbability: highlightProbability.value,
}));

const orders = computed(() =>
  sideTab.value === 'scheduled'
    ? getScheduledPurchaseList(marketId.value, listOptions.value)
    : getOrderedPurchaseList(marketId.value, listOptions.value),
);

function syncExpandedFromQuery() {
  const next = new Set();
  const score = highlightScore.value;
  if (score) {
    const match = orders.value.find((o) => o.score === score);
    if (match) next.add(match.id);
  }
  expandedIds.value = next;
}

watch([orders, highlightScore], syncExpandedFromQuery, { immediate: true });

watch(
  () => route.query.tab,
  (tab) => {
    sideTab.value = tab === 'scheduled' ? 'scheduled' : 'ordered';
  },
);

function setSideTab(tab) {
  sideTab.value = tab;
  router.replace({
    name: 'trade-purchases',
    query: { ...route.query, tab },
  });
}

function isExpanded(id) {
  return expandedIds.value.has(id);
}

function toggleCard(id) {
  const next = new Set(expandedIds.value);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  expandedIds.value = next;
}
</script>

<template>
  <div class="purchase-details">
    <div v-if="!isMobile" class="purchase-details__layout">
      <aside class="purchase-details__sidebar" aria-label="purchase-nav">
        <RouterLink to="/" class="purchase-details__brand purchase-details__brand--flush">
          <img :src="logoMarketUrl" alt="" class="purchase-details__brand-img" width="180" height="96" />
        </RouterLink>
        <nav class="purchase-details__side-nav">
          <button
            type="button"
            class="purchase-details__side-tab"
            :class="{ 'purchase-details__side-tab--active': sideTab === 'ordered' }"
            @click="setSideTab('ordered')"
          >
            {{ t('已下单') }}
          </button>
          <div class="purchase-details__side-divider" aria-hidden="true" />
          <button
            type="button"
            class="purchase-details__side-tab"
            :class="{ 'purchase-details__side-tab--active': sideTab === 'scheduled' }"
            @click="setSideTab('scheduled')"
          >
            {{ t('预约中') }}
          </button>
        </nav>
      </aside>

      <div class="purchase-details__main">
        <div class="purchase-details__grid">
          <PurchaseOrderCard
            v-for="order in orders"
            :key="order.id"
            :order="order"
            :expanded="isExpanded(order.id)"
            @toggle="toggleCard(order.id)"
          />
        </div>
      </div>
    </div>

    <div v-else class="purchase-details__layout purchase-details__layout--m">
      <aside class="purchase-details__sidebar purchase-details__sidebar--m">
        <RouterLink to="/" class="purchase-details__brand">
          <img :src="logoMarketUrl" alt="" class="purchase-details__brand-img" width="120" height="64" />
        </RouterLink>
        <nav class="purchase-details__side-nav">
          <button
            type="button"
            class="purchase-details__side-tab"
            :class="{ 'purchase-details__side-tab--active': sideTab === 'ordered' }"
            @click="setSideTab('ordered')"
          >
            {{ t('已下单') }}
          </button>
          <button
            type="button"
            class="purchase-details__side-tab"
            :class="{ 'purchase-details__side-tab--active': sideTab === 'scheduled' }"
            @click="setSideTab('scheduled')"
          >
            {{ t('预约中') }}
          </button>
        </nav>
      </aside>

      <div class="purchase-details__main purchase-details__main--m">
        <div class="purchase-details__grid purchase-details__grid--m">
          <PurchaseOrderCard
            v-for="order in orders"
            :key="order.id"
            :order="order"
            :expanded="isExpanded(order.id)"
            @toggle="toggleCard(order.id)"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/tools.scss' as *;

.purchase-details {
  @include container;
  @include web-main-column-max;
  padding-top: 8px;
  padding-bottom: $spacing-4xl;

  @include web-only {
    padding-top: 16px;
    background: #e3ecfb;
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

    &--m {
      flex-direction: column;
      gap: 12px;
    }
  }

  &__sidebar {
    display: flex;
    flex-direction: column;
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
      top: $web-market-detail-sidebar-sticky-top;
      align-self: start;
      min-height: calc(100vh - #{$web-market-detail-sidebar-sticky-top} - 36px);
      overflow-x: hidden;
      overflow-y: auto;
    }

    &--m {
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

    &--flush {
      @include web-only {
        width: 100%;
      }
    }
  }

  &__brand-img {
    display: block;
    width: 100%;
    height: auto;
  }

  &__side-nav {
    display: flex;
    flex-direction: column;

    @include web-only {
      flex: 1;
      padding: 14px 12px 0;
    }

    @include mobile-only {
      flex: 1;
      flex-direction: row;
      justify-content: flex-end;
      gap: 8px;
    }
  }

  &__side-divider {
    @include web-only {
      height: 1px;
      margin: 10px 14px;
      background: rgba(11, 52, 98, 0.12);
    }

    @include mobile-only {
      display: none;
    }
  }

  &__side-tab {
    width: 100%;
    border: none;
    background: transparent;
    color: #0b3462;
    cursor: pointer;
    text-align: center;
    transition:
      background 0.2s ease,
      color 0.2s ease;

    @include web-only {
      box-sizing: border-box;
      width: 156px;
      max-width: 100%;
      min-height: 56px;
      margin-inline: auto;
      padding: 0 14px 0 18px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 16px;
      font-size: 22px;
      font-weight: 400;

      &--active {
        color: #1c7bff;
        background: rgba(28, 123, 255, 0.1);
        border-left: 4px solid #1c7bff;
        padding-left: 14px;
      }
    }

    @include mobile-only {
      width: auto;
      padding: 8px 14px;
      border-radius: 999px;
      font-size: 13px;
      font-weight: 600;
      border: 1.5px solid rgb(228, 240, 254);
      background: #fff;

      &--active {
        border-color: #1c7bff;
        background: #1c7bff;
        color: #fff;
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

  &__grid {
    @include web-only {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 16px;
      align-items: start;
    }

    &--m {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
  }
}
</style>
