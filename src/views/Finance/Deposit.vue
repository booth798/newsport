<script setup>
/**
 * 充值页（按设计稿：充值改为线下客服操作，本页仅展示充值记录）
 * - 顶部橙色提示：请「联系客服」进行充值操作
 * - 月份选择器筛选
 * - 充值记录卡片：日期 + 状态徽标 / 金额 / 备注
 */
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';

import MonthSelector from '@/components/MonthSelector.vue';
import { fetchDepositList } from '@/api/finance';
import { useToast } from '@/hooks/useToast';
import { useAppStore } from '@/store/modules/app';

const { locale, t } = useI18n();
const route = useRoute();
const router = useRouter();
const toast = useToast();
const appStore = useAppStore();

const PAGE_SIZE = 20;

const loading = ref(true);
const error = ref(false);
const loadingMore = ref(false);
const records = ref([]);
const total = ref(0);
const pageNum = ref(1);

const hasMore = computed(() => records.value.length < total.value);

// 月份与路由同步，PC 选择器与移动端 Header 共用同一状态。
const selectedMonth = computed({
  get() {
    const month = Array.isArray(route.query.month) ? route.query.month[0] : route.query.month;
    return /^\d{4}-(0[1-9]|1[0-2])$/.test(month || '') ? month : getCurrentMonth();
  },
  set(month) {
    router.replace({ query: { ...route.query, month } });
  },
});

function getCurrentMonth() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(new Date());
  const pick = (type) => parts.find((part) => part.type === type)?.value || '';
  return `${pick('year')}-${pick('month')}`;
}

function statusInfo(status, statusLabel) {
  const s = String(status || '').toUpperCase();
  if (['SUCCESS', 'COMPLETED', 'DONE', 'PAID', 'FINISHED'].includes(s)) {
    return { tone: 'completed', label: statusLabel || t('已完成') };
  }
  if (['PENDING', 'PROCESSING', 'REVIEWING', 'CREATED', 'WAIT'].includes(s)) {
    return { tone: 'processing', label: statusLabel || t('处理中') };
  }
  if (['CANCELLED', 'CANCELED', 'FAILED', 'REJECTED', 'EXPIRED'].includes(s)) {
    return { tone: 'cancelled', label: statusLabel || t('已取消') };
  }
  return { tone: 'completed', label: statusLabel || t('已完成') };
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
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const parts = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(date);
  const p = (type) => parts.find((item) => item.type === type)?.value || '';
  return `${p('year')}-${p('month')}-${p('day')} ${p('hour')}:${p('minute')}`;
}

function normalizeRecord(r) {
  const info = statusInfo(r.status, r.statusLabel);
  return {
    id: r.id || r.depositOrderId || r.orderNo,
    createdAt: formatDateTime(r.createdAt || r.completedAt || r.createTime),
    amount: formatMoney(r.amount),
    currency: r.currency || 'CNY',
    remark: r.remark || r.note || r.desc || t('系统充值'),
    statusLabel: info.label,
    statusTone: info.tone,
  };
}

function buildParams(page) {
  return { pageNum: page, pageSize: PAGE_SIZE, month: selectedMonth.value };
}

function applyResponse(res, append, requestedPage) {
  const data = res?.data || {};
  const next = (data.records || []).map(normalizeRecord);
  records.value = append ? [...records.value, ...next] : next;
  total.value = Number(data.total) || records.value.length;
  pageNum.value = Number(data.pageNum) || requestedPage;
}

async function loadPage() {
  loading.value = true;
  error.value = false;
  try {
    const res = await fetchDepositList(buildParams(1));
    applyResponse(res, false, 1);
  } catch {
    error.value = true;
  } finally {
    loading.value = false;
  }
}

async function loadMore() {
  if (loadingMore.value || !hasMore.value) return;
  const nextPage = pageNum.value + 1;
  try {
    loadingMore.value = true;
    const res = await fetchDepositList(buildParams(nextPage));
    applyResponse(res, true, nextPage);
  } catch {
    toast.error(t('加载失败'));
  } finally {
    loadingMore.value = false;
  }
}

function contactService() {
  appStore.openCustomerServiceConfirm();
}

watch(selectedMonth, () => {
  loadPage();
});

onMounted(() => {
  loadPage();
});
</script>

<template>
  <div class="deposit-page" aria-label="deposit">
    <main class="deposit-panel">
      <!-- 提示：充值走线下客服 -->
      <div class="deposit-notice">
        <span class="deposit-notice__icon" aria-hidden="true">i</span>
        <span class="deposit-notice__text">
          {{ t('充值操作提示前') }}<button type="button" class="deposit-notice__link" @click="contactService">{{ t('联系客服') }}</button>{{ t('充值操作提示后') }}
        </span>
      </div>

      <!-- 月份筛选 -->
      <div class="deposit-toolbar">
        <MonthSelector v-model="selectedMonth" :aria-label="t('选择月份')" />
      </div>

      <!-- 加载 -->
      <div v-if="loading" class="deposit-state">
        <div class="deposit-spinner" />
        <span>{{ t('加载中') }}</span>
      </div>

      <!-- 错误 -->
      <div v-else-if="error" class="deposit-state">
        <span>{{ t('加载失败') }}</span>
        <button type="button" class="deposit-retry" @click="loadPage">{{ t('重试') }}</button>
      </div>

      <!-- 空 -->
      <div v-else-if="!records.length" class="deposit-state">
        <span>{{ t('暂无记录') }}</span>
      </div>

      <!-- 记录列表 -->
      <template v-else>
        <article v-for="record in records" :key="record.id" class="deposit-record">
          <div class="deposit-record__header">
            <time>{{ record.createdAt }}</time>
            <span class="deposit-record__badge" :class="`deposit-record__badge--${record.statusTone}`">
              {{ record.statusLabel }}
            </span>
          </div>
          <dl class="deposit-record__body">
            <div>
              <dt>{{ t('金额') }}</dt>
              <dd>{{ record.amount }} {{ record.currency }}</dd>
            </div>
            <div>
              <dt>{{ t('备注') }}</dt>
              <dd>{{ record.remark }}</dd>
            </div>
          </dl>
        </article>

        <button
          v-if="hasMore"
          type="button"
          class="deposit-more"
          :disabled="loadingMore"
          @click="loadMore"
        >
          {{ loadingMore ? t('加载中') : t('加载更多') }}
        </button>
      </template>
    </main>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/tools.scss' as *;

.deposit-page {
  width: 100%;
  color: var(--theme-text);
}

.deposit-panel {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 14px;

  @include web-only {
    min-height: min(690px, calc(100dvh - 20px));
    padding: 24px;
    border: 1px solid var(--auxiliary-1);
    border-radius: 32px;
    background: var(--auxiliary-1);
    box-shadow: var(--shadow-card);
  }

  @include mobile-only {
    gap: 12px;
  }
}

/* ---------- 提示条 ---------- */
.deposit-notice {
  display: flex;
  align-items: center;
  gap: 6px;
  box-sizing: border-box;
  min-height: 40px;
  padding: 8px 14px;
  border-radius: 12px;
  background: rgba(251, 92, 13, 0.1);
  color: #fb5c0d;
  font-size: 13px;
  line-height: 1.5;
}

.deposit-notice__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 15px;
  height: 15px;
  border: 1px solid currentColor;
  border-radius: 50%;
  font-family: $font-family-num, $font-family-base;
  font-size: 10px;
  font-weight: 700;
  line-height: 1;
  flex-shrink: 0;
}

.deposit-notice__text {
  color: rgba(11, 52, 98, 0.5);
}

.deposit-notice__link {
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--theme-primary);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
}

/* ---------- 月份筛选 ---------- */
.deposit-toolbar {
  display: flex;
  align-items: center;
  justify-content: flex-end;

  @include mobile-only {
    display: none;
  }
}

/* ---------- 状态 ---------- */
.deposit-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 240px;
  gap: 12px;
  color: #7b92ad;
  font-size: 14px;
}

.deposit-spinner {
  width: 24px;
  height: 24px;
  border: 3px solid #e4f0fe;
  border-top-color: #1c7bff;
  border-radius: 50%;
  animation: deposit-spin 0.8s linear infinite;
}

@keyframes deposit-spin {
  to { transform: rotate(360deg); }
}

.deposit-retry {
  height: 32px;
  padding: 0 20px;
  border: 1px solid #1c7bff;
  border-radius: 16px;
  background: transparent;
  color: #1c7bff;
  font-size: 14px;
  cursor: pointer;
}

/* ---------- 记录卡片 ---------- */
.deposit-record {
  box-sizing: border-box;
  padding: 16px;
  border-radius: 16px;
  background: rgba(28, 123, 255, 0.1);

  @include mobile-only {
    background: var(--auxiliary-1);
    box-shadow: 0 2px 12px rgba(21, 58, 118, 0.06);
  }
}

.deposit-record__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;

  time {
    color: var(--theme-text);
    font-size: 14px;
    font-weight: 300;
  }
}

.deposit-record__badge {
  min-width: 56px;
  padding: 4px 12px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  text-align: center;

  &--completed {
    background: rgba(11, 52, 98, 0.1);
    color: #5d7899;
  }

  &--processing {
    background: rgba(28, 123, 255, 0.15);
    color: #1c7bff;
  }

  &--cancelled {
    background: rgba(255, 45, 45, 0.12);
    color: #ff2d2d;
  }
}

.deposit-record__body {
  margin: 0;
  padding: 0 12px;
  border-radius: 12px;
  background: var(--auxiliary-1);

  div {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 48px;

    & + div {
      border-top: 1px solid var(--theme-divider);
    }
  }

  dt,
  dd {
    margin: 0;
  }

  dt {
    color: rgba(11, 52, 98, 0.5);
    font-size: 14px;
  }

  dd {
    color: var(--theme-text);
    font-size: 16px;
    font-weight: 500;
    font-family: $font-family-num, $font-family-base;
  }
}

/* ---------- 加载更多 ---------- */
.deposit-more {
  align-self: center;
  padding: 8px 20px;
  border: 0;
  background: transparent;
  color: rgba(11, 52, 98, 0.5);
  font-size: 14px;
  cursor: pointer;
}
</style>
