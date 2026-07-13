<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';

import { useAppStore } from '@/store/modules/app';
import { fetchRecords, fetchLedgerSummary } from '@/api/finance';

const { t } = useI18n();
const appStore = useAppStore();
const { isMobile } = storeToRefs(appStore);

const filterOptions = [
  { key: 'all', label: '全部' },
  { key: 'deposit', label: '充值' },
  { key: 'withdraw', label: '提现' },
  { key: 'trade', label: '订单' },
];

const FILTER_TO_TYPES = {
  deposit: ['DEPOSIT', 'TRANSFER_IN', 'REFUND'],
  withdraw: ['WITHDRAW', 'TRANSFER_OUT'],
  trade: ['BET', 'PAYOUT', 'FEE'],
};

const records = ref([]);
const loading = ref(true);
const error = ref(false);
const selectedFilter = ref('all');
const filterOpen = ref(false);

const summary = ref({ totalIncome: 0, totalExpense: 0, netProfit: 0 });
const summaryLoading = ref(false);

const pageNum = ref(1);
const pageSize = 20;
const totalRecords = ref(0);
const totalPages = computed(() => Math.ceil(totalRecords.value / pageSize) || 1);

function formatSummaryMoney(val) {
  const n = Number(val) || 0;
  return n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

async function loadSummary() {
  summaryLoading.value = true;
  try {
    const res = await fetchLedgerSummary();
    summary.value = res.data || { totalIncome: 0, totalExpense: 0, netProfit: 0 };
  } catch { /* non-critical */ }
  finally { summaryLoading.value = false; }
}

async function loadRecords() {
  try {
    loading.value = true;
    error.value = false;
    const typesParam = FILTER_TO_TYPES[selectedFilter.value];
    const res = await fetchRecords({
      types: typesParam,
      pageNum: pageNum.value,
      pageSize,
    });
    records.value = res.data || [];
    totalRecords.value = res.total || 0;
  } catch {
    error.value = true;
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  loadSummary();
  loadRecords();
});

const selectedFilterLabel = computed(() => {
  return filterOptions.find((item) => item.key === selectedFilter.value)?.label || '全部';
});

watch(
  isMobile,
  (mobile) => { filterOpen.value = !mobile; },
  { immediate: true },
);

function selectFilter(key) {
  selectedFilter.value = key;
  pageNum.value = 1;
  if (isMobile.value) filterOpen.value = false;
  loadRecords();
}

function prevPage() {
  if (pageNum.value > 1) {
    pageNum.value--;
    loadRecords();
  }
}

function nextPage() {
  if (pageNum.value < totalPages.value) {
    pageNum.value++;
    loadRecords();
  }
}

function recordDescription(record) {
  return record.descKey ? t(record.descKey) : record.desc || '';
}
</script>

<template>
  <div class="records-page">
    <!-- 汇总卡片 -->
    <section class="records-summary">
      <div class="records-summary__top">
        <span>{{ t('账务汇总') }}</span>
        <div class="records-filter" :class="{ 'records-filter--open': filterOpen }">
          <button
            type="button"
            class="records-filter__trigger"
            :aria-expanded="filterOpen"
            @click="filterOpen = !filterOpen"
          >
            {{ t(selectedFilterLabel) }}
            <span class="records-filter__chevron" aria-hidden="true" />
          </button>
          <div v-show="filterOpen" class="records-filter__menu" role="menu">
            <button
              v-for="option in filterOptions"
              :key="option.key"
              type="button"
              class="records-filter__option"
              :class="{ active: selectedFilter === option.key }"
              role="menuitem"
              @click="selectFilter(option.key)"
            >
              {{ t(option.label) }}
            </button>
          </div>
        </div>
      </div>
      <div class="records-summary__stats">
        <div class="records-summary__stat">
          <span class="records-summary__stat-label">{{ t('总收入') }}</span>
          <span class="records-summary__stat-value records-summary__stat-value--income">+¥{{ formatSummaryMoney(summary.totalIncome) }}</span>
        </div>
        <div class="records-summary__stat">
          <span class="records-summary__stat-label">{{ t('总支出') }}</span>
          <span class="records-summary__stat-value records-summary__stat-value--expense">-¥{{ formatSummaryMoney(summary.totalExpense) }}</span>
        </div>
        <div class="records-summary__stat">
          <span class="records-summary__stat-label">{{ t('净收益') }}</span>
          <span class="records-summary__stat-value records-summary__stat-value--profit">¥{{ formatSummaryMoney(summary.netProfit) }}</span>
        </div>
      </div>
    </section>

    <!-- 列表 -->
    <div v-if="loading" class="records-list records-list--center">
      <div class="records-spinner" />
      <span>{{ t('加载中') }}</span>
    </div>
    <div v-else-if="error" class="records-list records-list--center">
      <span>{{ t('加载失败') }}</span>
      <button type="button" class="records-retry" @click="loadRecords">{{ t('重试') }}</button>
    </div>
    <div v-else-if="!records.length" class="records-list records-list--center">
      <span>{{ t('暂无数据') }}</span>
    </div>
    <div v-else class="records-list">
      <article v-for="record in records" :key="record.id" class="record-card">
        <header class="record-card__header">
          <span class="record-card__type" :class="{
            'record-card__type--deposit': record.type === 'deposit',
            'record-card__type--withdraw': record.type === 'withdraw',
          }">
            {{ t(record.typeLabel) }}
          </span>
          <time class="record-card__time">{{ record.time }}</time>
          <span class="record-card__amount" :class="{
            'record-card__amount--positive': record._raw?.amount >= 0,
            'record-card__amount--negative': record._raw?.amount < 0,
          }">
            {{ record.amount }}
          </span>
        </header>

        <div v-if="record._raw" class="record-card__body">
          <div v-if="record._raw.balanceAfter != null" class="record-card__row">
            <span class="record-card__label">{{ t('变动后余额') }}</span>
            <strong class="record-card__value">¥{{ formatSummaryMoney(record._raw.balanceAfter) }}</strong>
          </div>
          <div v-if="record._raw.matchLabel" class="record-card__row">
            <span class="record-card__label">{{ t('赛事') }}</span>
            <strong class="record-card__value">{{ record._raw.matchLabel }}</strong>
          </div>
          <div v-if="record._raw.matchScore" class="record-card__row">
            <span class="record-card__label">{{ t('比分') }}</span>
            <strong class="record-card__value">{{ record._raw.matchScore }}</strong>
          </div>
          <div v-if="record._raw.remark && !record._raw.matchLabel" class="record-card__row">
            <span class="record-card__label">{{ t('备注') }}</span>
            <strong class="record-card__value">{{ record._raw.remark }}</strong>
          </div>
        </div>
      </article>

      <!-- 分页 -->
      <div v-if="totalPages > 1" class="records-pagination">
        <button type="button" :disabled="pageNum <= 1" @click="prevPage">{{ t('上一页') }}</button>
        <span>{{ pageNum }} / {{ totalPages }}</span>
        <button type="button" :disabled="pageNum >= totalPages" @click="nextPage">{{ t('下一页') }}</button>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/tools.scss' as *;

.records-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  max-width: 100%;

  @include mobile-only {
    overflow-x: hidden;
  }
}

.records-spinner {
  width: 24px;
  height: 24px;
  border: 3px solid #e4f0fe;
  border-top-color: #1c7bff;
  border-radius: 50%;
  animation: records-spin 0.8s linear infinite;
}

@keyframes records-spin {
  to { transform: rotate(360deg); }
}

.records-retry {
  height: 32px;
  padding: 0 20px;
  border: 1px solid #1c7bff;
  border-radius: 16px;
  background: transparent;
  color: #1c7bff;
  font-size: 14px;
  cursor: pointer;
}

// --- 汇总卡片 ---
.records-summary {
  position: relative;
  z-index: 2;
  padding: 16px;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 4px 16px rgba(21, 58, 118, 0.08);
}

.records-summary__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: #0b3462;
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 12px;
}

.records-summary__stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.records-summary__stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px 0;
  border-radius: 10px;
  background: #f5f8fc;
}

.records-summary__stat-label {
  font-size: 12px;
  color: #6b7c93;
}

.records-summary__stat-value {
  font-family: $font-family-num, $font-family-base;
  font-size: 15px;
  font-weight: 700;

  &--income { color: #27ae60; }
  &--expense { color: #e74c3c; }
  &--profit { color: #1c7bff; }
}

// --- 筛选 ---
.records-filter {
  position: relative;
  flex-shrink: 0;
}

.records-filter__trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-width: 64px;
  height: 28px;
  padding: 0 12px;
  border: none;
  border-radius: 14px;
  background: #1c7bff;
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.records-filter__chevron {
  width: 0;
  height: 0;
  border-left: 4px solid transparent;
  border-right: 4px solid transparent;
  border-top: 5px solid currentColor;
  transform: translateY(1px);
}

.records-filter__menu {
  position: absolute;
  top: 35px;
  right: 0;
  width: 100px;
  padding: 6px;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 6px 20px rgba(21, 58, 118, 0.15);
  z-index: 10;
}

.records-filter__option {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 34px;
  border: none;
  background: transparent;
  color: #0b3462;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  border-radius: 8px;

  &:hover,
  &.active {
    color: #1c7bff;
    background: rgba(28, 123, 255, 0.1);
  }
}

// --- 列表 ---
.records-list {
  display: flex;
  flex-direction: column;
  gap: 8px;

  &--center {
    align-items: center;
    justify-content: center;
    min-height: 200px;
    gap: 12px;
    color: #6b7c93;
    font-size: 14px;
  }
}

.record-card {
  padding: 14px 16px;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 2px 8px rgba(21, 58, 118, 0.05);
}

.record-card__header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.record-card__type {
  position: relative;
  padding-left: 10px;
  font-size: 14px;
  font-weight: 600;
  color: #1c7bff;

  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 50%;
    width: 3px;
    height: 14px;
    border-radius: 2px;
    background: #1c7bff;
    transform: translateY(-50%);
  }

  &--deposit {
    color: #27ae60;
    &::before { background: #27ae60; }
  }

  &--withdraw {
    color: #e74c3c;
    &::before { background: #e74c3c; }
  }
}

.record-card__time {
  flex: 1;
  color: #6b7c93;
  font-size: 12px;
  text-align: center;
  white-space: nowrap;
}

.record-card__amount {
  font-family: $font-family-num, $font-family-base;
  font-size: 15px;
  font-weight: 700;
  white-space: nowrap;

  &--positive { color: #27ae60; }
  &--negative { color: #e74c3c; }
}

.record-card__body {
  display: flex;
  flex-direction: column;
  gap: 0;
  border-radius: 10px;
  background: #f5f8fc;
  overflow: hidden;
}

.record-card__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 36px;
  padding: 0 12px;

  &:not(:last-child) {
    border-bottom: 1px solid #eaf1f9;
  }
}

.record-card__label {
  font-size: 12px;
  color: #6b7c93;
}

.record-card__value {
  font-size: 13px;
  font-weight: 600;
  color: #0b3462;
  text-align: right;
  max-width: 60%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

// --- 分页 ---
.records-pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  padding: 12px 0;

  button {
    height: 32px;
    padding: 0 16px;
    border: 1px solid #e4f0fe;
    border-radius: 16px;
    background: #fff;
    color: #1c7bff;
    font-size: 13px;
    cursor: pointer;

    &:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
  }

  span {
    font-size: 13px;
    color: #6b7c93;
  }
}
</style>
