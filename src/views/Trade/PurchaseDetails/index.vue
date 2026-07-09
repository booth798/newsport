<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';

import { fetchOrderedList, fetchScheduledList } from '@/api/order';
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
const orders = ref([]);
const loading = ref(true);
const error = ref(false);

const matchId = computed(() => {
  const raw = route.query.matchId || route.query.marketId;
  const id = Number(Array.isArray(raw) ? raw[0] : raw);
  return Number.isFinite(id) && id > 0 ? id : undefined;
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

async function loadOrders() {
  try {
    loading.value = true;
    error.value = false;
    const fetcher = sideTab.value === 'scheduled' ? fetchScheduledList : fetchOrderedList;
    const res = await fetcher(matchId.value, listOptions.value);
    orders.value = res.data || [];
    syncExpandedFromQuery();
  } catch {
    orders.value = sideTab.value === 'scheduled'
      ? getScheduledPurchaseList(matchId.value, listOptions.value)
      : getOrderedPurchaseList(matchId.value, listOptions.value);
    syncExpandedFromQuery();
    error.value = false;
  } finally {
    loading.value = false;
  }
}

function syncExpandedFromQuery() {
  const next = new Set();
  const score = highlightScore.value;
  if (score) {
    const match = orders.value.find((o) => o.score === score);
    if (match) next.add(match.id);
  }
  expandedIds.value = next;
}

onMounted(loadOrders);

watch(
  () => route.query.tab,
  (tab) => {
    sideTab.value = tab === 'scheduled' ? 'scheduled' : 'ordered';
  },
);

watch(sideTab, loadOrders);

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

function handleCancelled(orderId) {
  orders.value = orders.value.filter((o) => o.id !== orderId);
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
        <div v-if="loading" class="purchase-details__state">
          <div class="purchase-details__spinner" />
          <span>{{ t('加载中') }}</span>
        </div>
        <div v-else-if="error" class="purchase-details__state">
          <span>{{ t('加载失败') }}</span>
          <button type="button" class="purchase-details__retry" @click="loadOrders">{{ t('重试') }}</button>
        </div>
        <div v-else-if="orders.length === 0" class="purchase-details__state">
          <span>{{ t('暂无数据') }}</span>
        </div>
        <div v-else class="purchase-details__grid">
          <PurchaseOrderCard
            v-for="order in orders"
            :key="order.id"
            :order="order"
            :expanded="isExpanded(order.id)"
            @toggle="toggleCard(order.id)"
            @cancelled="handleCancelled"
          />
        </div>
      </div>
    </div>

    <div v-else class="purchase-details__mobile">
      <nav class="purchase-details__tabs card-primary norem" :aria-label="t('买入明细')">
        <button
          type="button"
          class="purchase-details__tab btn"
          :class="sideTab === 'ordered' ? 'btn--primary' : 'purchase-details__tab--idle'"
          @click="setSideTab('ordered')"
        >
          {{ t('已下单') }}
        </button>
        <button
          type="button"
          class="purchase-details__tab btn"
          :class="sideTab === 'scheduled' ? 'btn--primary' : 'purchase-details__tab--idle'"
          @click="setSideTab('scheduled')"
        >
          {{ t('预约中') }}
        </button>
      </nav>

      <div v-if="loading" class="purchase-details__state">
        <div class="purchase-details__spinner" />
        <span>{{ t('加载中') }}</span>
      </div>
      <div v-else-if="error" class="purchase-details__state">
        <span>{{ t('加载失败') }}</span>
        <button type="button" class="purchase-details__retry" @click="loadOrders">{{ t('重试') }}</button>
      </div>
      <div v-else-if="orders.length === 0" class="purchase-details__state">
        <span>{{ t('暂无数据') }}</span>
      </div>
      <div v-else class="purchase-details__list">
        <PurchaseOrderCard
          v-for="order in orders"
          :key="order.id"
          :order="order"
          :expanded="isExpanded(order.id)"
          @toggle="toggleCard(order.id)"
          @cancelled="handleCancelled"
        />
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

  @include mobile-only {
    padding-top: 0;
    padding-bottom: 16px;
    background: transparent;
    box-sizing: border-box;
  }

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
      min-height: calc(100dvh - #{$web-market-detail-sidebar-sticky-top} - 36px);
      overflow-x: hidden;
      overflow-y: auto;
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

  }

  &__mobile {
    display: flex;
    flex-direction: column;
    gap: 12px;
    width: 100%;
    box-sizing: border-box;
  }

  &__tabs {
    display: flex;
    align-items: stretch;
    gap: 4px;
    width: 100%;
    padding: 4px;
    box-sizing: border-box;
    border-radius: 999px;
  }

  &__tab {
    flex: 1;
    min-height: 36px;
    padding: 8px 16px;
    border-radius: 999px;
    font-size: 15px;
    font-weight: 600;
    line-height: 1.2;

    &--idle {
      background: rgba(255, 255, 255, 0.55);
      color: var(--theme-primary);
      border: none;
      box-shadow: none;

      &::after {
        display: none;
      }
    }
  }

  &__list {
    display: flex;
    flex-direction: column;
    gap: 12px;
    width: 100%;
  }

  &__state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    min-height: 240px;
    color: var(--theme-text-1);
    font-size: $font-size-md;
  }

  &__spinner {
    width: 28px;
    height: 28px;
    border: 3px solid var(--theme-divider);
    border-top-color: var(--theme-primary);
    border-radius: 50%;
    animation: purchase-spin 0.8s linear infinite;
  }

  @keyframes purchase-spin {
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
}
</style>
