<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';

import EmptyState from '@/components/EmptyState.vue';
import MonthSelector from '@/components/MonthSelector.vue';
import { fetchDepositList } from '@/api/finance';
import { useAppStore } from '@/store/modules/app';

import { getImageUrl } from '@/utils/common';


const PAGE_SIZE = 20;

const { locale, t } = useI18n();
const route = useRoute();
const router = useRouter();
const appStore = useAppStore();

const panelRef = ref(null);
const loading = ref(true);
const loadingMore = ref(false);
const error = ref(false);
const orders = ref([]);
const pageNum = ref(1);
const total = ref(0);
const hasMore = ref(false);

const { isMobile } = storeToRefs(appStore);

const selectedMonth = computed({
  get() {
    const month = Array.isArray(route.query.month) ? route.query.month[0] : route.query.month;
    return /^\d{4}-(0[1-9]|1[0-2])$/.test(month || '') ? month : getCurrentMonth();
  },
  set(month) {
    // PC 月份选择器同步到路由，移动端 Header 会展示同一个筛选月份。
    router.replace({ query: { ...route.query, month } });
  },
});

const isEmpty = computed(() => !loading.value && !error.value && orders.value.length === 0);

onMounted(() => {
  loadPage(1);
  panelRef.value?.addEventListener('scroll', handlePanelScroll, { passive: true });
});

onBeforeUnmount(() => {
  panelRef.value?.removeEventListener('scroll', handlePanelScroll);
});

// 月份来自页面或移动端 Header，变化后从第一页重新加载充值订单。
watch(selectedMonth, () => {
  loadPage(1);
});

async function loadPage(page = 1, append = false) {
  if (append) {
    loadingMore.value = true;
  } else {
    loading.value = true;
  }
  error.value = false;
  try {
    const response = await fetchDepositList({
      pageNum: page,
      pageSize: PAGE_SIZE,
      month: selectedMonth.value,
    });
    applyOrderResponse(response, page, append);
  } catch {
    error.value = true;
  } finally {
    loading.value = false;
    loadingMore.value = false;
  }
}

function applyOrderResponse(response, page, append) {
  const data = response?.data;
  const rawList = Array.isArray(data) ? data : data?.records || data?.list || [];
  const nextOrders = rawList.map(normalizeOrder);
  orders.value = append ? [...orders.value, ...nextOrders] : nextOrders;
  pageNum.value = page;

  const totalValue = Array.isArray(data) ? response?.total : data?.total;
  const pagesValue = Array.isArray(data) ? response?.pages : data?.pages;
  total.value = Number(totalValue) || 0;
  hasMore.value = pagesValue != null
    ? page < Number(pagesValue)
    : total.value > 0
      ? orders.value.length < total.value
      : nextOrders.length >= PAGE_SIZE;
}

function normalizeOrder(order, index) {
  const id = order.id || order.orderNo || `deposit-order-${pageNum.value}-${index}`;
  return {
    id,
    orderNo: order.orderNo || id,
    // 展示仅保留金额数字，不拼接 CNY
    amount: formatMoney(order.amount),
    remark: '系统充值',
    statusLabel: mapStatusLabel(order.status),
    createdAt: formatDateTime(order.createdAt),
    _raw: order,
  };
}

function mapStatusLabel(status) {
  const normalized = String(status || '').toUpperCase();
  if (['COMPLETED', 'SUCCESS', 'SUCCESSFUL', 'PAID', 'APPROVED', 'DONE'].includes(normalized)) {
    return '已完成';
  }
  if (['PENDING', 'CREATED', 'PROCESSING', 'WAITING'].includes(normalized)) {
    return '处理中';
  }
  if (['REJECTED', 'FAILED', 'CANCELLED', 'CANCELED', 'EXPIRED'].includes(normalized)) {
    return '已取消';
  }
  return status || '处理中';
}

function getCurrentMonth() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(new Date());
  const pick = (type) => parts.find((part) => part.type === type)?.value || '';
  return `${pick('year')}-${pick('month')}`;
}

function formatMoney(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '0.00';
  return number.toLocaleString(locale.value, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDateTime(value) {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const parts = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const pick = (type) => parts.find((part) => part.type === type)?.value || '';
  return `${pick('year')}-${pick('month')}-${pick('day')} ${pick('hour')}:${pick('minute')}`;
}

function handleCustomerService() {
  appStore.openCustomerServiceConfirm();
}

function handlePanelScroll() {
  const el = panelRef.value;
  if (!el || loading.value || loadingMore.value || !hasMore.value) return;
  if (el.scrollTop + el.clientHeight >= el.scrollHeight - 80) {
    loadPage(pageNum.value + 1, true);
  }
}
</script>

<template>
  <div class="deposit-record-page">
    <section ref="panelRef" class="deposit-record-panel">
      <button type="button" class="deposit-record-notice" @click="handleCustomerService">
        <img :src="getImageUrl('common/icon_tips.svg')" alt="">
        <strong>{{ t('请联系客服进行充值操作') }}</strong>
        <i aria-hidden="true"></i>
      </button>

      <div class="deposit-record-toolbar">
        <MonthSelector v-model="selectedMonth" :aria-label="t('选择月份')" />
      </div>

      <!-- 页面状态统一在列表区域内展示，避免 PC 右侧区域出现空白。 -->
      <div v-if="loading" class="deposit-record-state">
        <span>{{ t('加载中') }}</span>
      </div>
      <div v-else-if="error" class="deposit-record-state">
        <span>{{ t('加载失败') }}</span>
        <button type="button" class="deposit-record-state__retry" @click="loadPage(1)">
          {{ t('重试') }}
        </button>
      </div>
      <EmptyState
        v-else-if="isEmpty"
        class="deposit-record-empty"
        :text="t('暂无充值记录')"
        :icon-size="isMobile ? 110 : 120"
      />

      <template v-else>
        <div class="deposit-order-list">
          <article
            v-for="order in orders"
            :key="order.id"
            class="deposit-order-card"
          >
            <header class="deposit-order-card__header">
              <time>{{ order.createdAt }}</time>
              <span>{{ t(order.statusLabel) }}</span>
            </header>

            <dl class="deposit-order-card__body">
              <div>
                <dt>{{ t('金额') }}</dt>
                <dd>{{ order.amount }}</dd>
              </div>
              <div>
                <dt>{{ t('备注') }}</dt>
                <dd>{{ t(order.remark) }}</dd>
              </div>
            </dl>
          </article>

          <div v-if="loadingMore" class="deposit-record-more">{{ t('加载中') }}</div>
          <div v-else-if="!hasMore" class="deposit-record-more">{{ t('没有更多了') }}</div>
        </div>
      </template>
    </section>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/tools.scss' as *;

.deposit-record-page {
  width: 100%;
  color: var(--theme-text);
}

.deposit-record-panel {
  display: flex;
  flex-direction: column;
  box-sizing: border-box;

  @include web-only {
    height: min(818px, calc(100dvh - 20px));
    padding: 22px 22px 32px;
    overflow-y: auto;
    border: 1px solid var(--auxiliary-1);
    border-radius: 30px;
    background: var(--auxiliary-1);
    box-shadow: var(--shadow-card);
    scrollbar-width: none;

    &::-webkit-scrollbar {
      display: none;
    }
  }

  @include mobile-only {
    min-height: calc(100dvh - 80px - #{$mobile-tab-bar-offset});
  }
}

.deposit-record-notice {
  display: flex;
  align-items: center;
  width: 100%;
  background: #FEEEE6;
  color: #FB5C0D;
  cursor: pointer;
  img {
    width: 18px;
    margin-right: 4px;
  }
  strong {
    flex: 1;
    font-size: 14px;
    font-weight: 400;
    text-align: left;
  }

  i {
    display: none;
    width: 9px;
    height: 9px;
    border-top: 1.5px solid currentColor;
    border-right: 1.5px solid currentColor;
    transform: rotate(45deg);
    color: #0C3462;
  }

  @include web-only {
    height: 36px;
    padding: 0 20px;
    border-radius: 18px;
  }

  @include mobile-only {
    height: 34px;
    padding: 0 12px;
    border-radius: 12px;

    i {
      display: block;
    }
  }
}

.deposit-record-toolbar {
  display: flex;
  justify-content: flex-end;
  margin: 14px 0 16px;

  @include mobile-only {
    display: none;
  }
}

.deposit-record-state,
.deposit-record-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 260px;
  gap: 12px;
  color: rgba(11, 52, 98, 0.5);
  font-size: 14px;
}

.deposit-record-state__retry {
  height: 36px;
  padding: 0 22px;
  border: 0;
  border-radius: 18px;
  background: var(--theme-primary);
  color: var(--auxiliary-1);
  font-size: 14px;
  cursor: pointer;
  box-shadow: var(--shadow-primary-btn);
}

.deposit-order-list {
  display: flex;
  flex-direction: column;
  gap: 14px;

  @include mobile-only {
    gap: 10px;
    margin-top: 10px;
  }
}

.deposit-order-card {
  box-sizing: border-box;
  background: #e7f1ff;

  @include web-only {
    padding: 17px 16px;
    border-radius: 14px;
  }

  @include mobile-only {
    background: var(--auxiliary-1);
    padding: 17px 20px;
    border-radius: 16px;
  }
}

.deposit-order-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;

  time {
    color: rgba(11, 52, 98, 0.8);
    font-family: $font-family-num, $font-family-base;
    font-size: 14px;
  }

  span {
    min-width: 62px;
    height: 30px;
    padding: 0 10px;
    border-radius: 6px;
    background: rgba(199, 214, 232, 0.62);
    color: var(--theme-text);
    font-size: 14px;
    line-height: 30px;
    text-align: center;
  }
}

.deposit-order-card__body {
  margin: 0;
  padding: 0 12px;
  border-radius: 12px;
  background: var(--auxiliary-1);

  @include mobile-only {
    padding: 0 14px;
    background: #eaf2fb;
  }

  div {
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: 44px;

    & + div {
      border-top: 1px solid rgba(255, 255, 255, 0.75);
    }
  }

  dt,
  dd {
    margin: 0;
  }

  dt {
    color: rgba(11, 52, 98, 0.45);
    font-size: 14px;
  }

  dd {
    color: var(--theme-text);
    font-family: $font-family-num, $font-family-base;
    font-size: 16px;
    font-weight: 500;
  }
}

.deposit-record-more {
  padding: 8px 0 2px;
  color: rgba(11, 52, 98, 0.45);
  font-size: 14px;
  text-align: center;
}
</style>
