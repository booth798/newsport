<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';

import { useAppStore } from '@/store/modules/app';
import { fetchRecords } from '@/api/finance';

const { t } = useI18n();
const appStore = useAppStore();
const { isMobile } = storeToRefs(appStore);

const filterOptions = [
  { key: 'all', label: '全部' },
  { key: 'deposit', label: '充值' },
  { key: 'withdraw', label: '提现' },
  { key: 'trade', label: '订单' },
];

const records = ref([]);
const loading = ref(true);
const error = ref(false);
const selectedFilter = ref('all');
const filterOpen = ref(false);

const FILTER_TO_TYPES = {
  deposit: ['DEPOSIT', 'TRANSFER_IN', 'REFUND'],
  withdraw: ['WITHDRAW', 'TRANSFER_OUT'],
  trade: ['BET', 'PAYOUT', 'FEE'],
};

const DEFAULT_RECORDS = [
  {
    id: 'demo-record-1',
    type: 'deposit',
    typeLabel: '充值',
    time: '2026-07-07 09:41',
    amount: '+1000.00',
    statusTone: 'success',
    descKey: '银行卡充值',
  },
  {
    id: 'demo-record-2',
    type: 'withdraw',
    typeLabel: '提现',
    time: '2026-07-06 18:20',
    amount: '-500.00',
    statusTone: 'warning',
    descKey: '中国银联提款',
  },
  {
    id: 'demo-record-3',
    type: 'trade',
    typeLabel: '订单',
    time: '2026-07-06 12:08',
    amount: '-100.00',
    statusTone: 'default',
    descKey: '比分市场买入',
  },
];

async function loadRecords() {
  try {
    loading.value = true;
    error.value = false;
    const typesParam = FILTER_TO_TYPES[selectedFilter.value];
    const res = await fetchRecords({ types: typesParam, pageSize: 50 });
    records.value = res.data?.length ? res.data : DEFAULT_RECORDS;
  } catch {
    records.value = DEFAULT_RECORDS;
    error.value = false;
  } finally {
    loading.value = false;
  }
}

onMounted(loadRecords);

const selectedFilterLabel = computed(() => {
  return filterOptions.find((item) => item.key === selectedFilter.value)?.label || '全部';
});

const filteredRecords = computed(() => {
  if (selectedFilter.value === 'all') return records.value;
  return records.value.filter((record) => record.type === selectedFilter.value);
});

watch(
  isMobile,
  (mobile) => {
    filterOpen.value = !mobile;
  },
  { immediate: true },
);

function selectFilter(key) {
  selectedFilter.value = key;
  if (isMobile.value) {
    filterOpen.value = false;
  }
  loadRecords();
}

function recordDescription(record) {
  return record.descKey ? t(record.descKey) : record.desc || '';
}
</script>

<template>
  <div class="records-page">
    <section class="records-summary">
      <div class="records-summary__top">
        <span>{{ t('已完成总合计') }}</span>
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
      <div class="records-summary__amount">13,764,059.00</div>
    </section>

    <div v-if="loading" class="records-list records-list--center">
      <span>{{ t('加载中') }}</span>
    </div>
    <div v-else-if="error" class="records-list records-list--center">
      <span>{{ t('加载失败') }}</span>
      <button type="button" @click="loadRecords">{{ t('重试') }}</button>
    </div>
    <div v-else-if="!filteredRecords.length" class="records-list records-list--center">
      <span>{{ t('暂无数据') }}</span>
    </div>
    <div v-else class="records-list">
      <article v-for="record in filteredRecords" :key="record.id" class="record-card card-default">
        <header class="record-card__header">
          <span class="record-card__type" :class="{ 'record-card__type--deposit': record.type === 'deposit' }">
            {{ t(record.typeLabel) }}
          </span>
          <time class="record-card__time">{{ record.time }}</time>
          <span class="record-card__status" :class="`record-card__status--${record.statusTone}`">
            {{ record.amount }}
          </span>
        </header>

        <div class="record-card__body">
          <div v-if="recordDescription(record)" class="record-card__row">
            <span class="record-card__label">{{ t('备注') }}</span>
            <strong class="record-card__value">{{ recordDescription(record) }}</strong>
          </div>
        </div>
      </article>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/tools.scss' as *;

.records-page {
  display: flex;
  flex-direction: column;
  gap: 18px;
  width: 100%;
  max-width: 100%;

  @include mobile-only {
    overflow-x: hidden;
  }
}

.records-summary {
  position: relative;
  z-index: 2;
  height: 96px;
  padding: 14px 16px 12px;
  border: 1px solid var(--auxiliary-1);
  border-radius: $radius-lg;
  background: linear-gradient(180deg, rgb(139 188 255 / 20%) 0%, rgb(255 255 255 / 73%) 100%);
  box-shadow: var(--shadow-card);
  color: var(--theme-text);
}

.records-summary__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $spacing-md;
  color: var(--theme-text);
  font-size: $font-size-md;
  font-weight: 700;
}

.records-summary__amount {
  display: flex;
  align-items: center;
  height: 38px;
  padding: 0 12px;
  border-radius: 8px;
  background: rgba(28, 123, 255, 0.1);
  color: var(--theme-primary);
  font-size: 20px;
  font-weight: 700;

  @include web-only {
    margin-top: $spacing-md;
  }
  @include mobile-only {
    height: 34px;
    margin-top: 14px;
  }
}

.records-filter {
  position: relative;
  flex-shrink: 0;
}

.records-filter__trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: $radius-sm;
  min-width: 64px;
  height: 24px;
  padding: 0 12px;
  border: none;
  border-radius: $radius-pill;
  background: var(--theme-primary);
  color: var(--auxiliary-1);
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: var(--shadow-primary-btn);
  @include web-only {
    height: 28px;
  }
  @include mobile-only {
    height: 24px;
  }
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
  left: 50%;
  transform: translateX(-50%);
  width: 100px;
  padding: 10px;
  border-radius: $radius-lg;
  background: var(--auxiliary-1);
  box-shadow: var(--shadow-card);
}

.records-filter__option {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 34px;
  border: none;
  background: transparent;
  color: var(--theme-text);
  font-size: $font-size-sm;
  font-weight: 500;
  cursor: pointer;
}

.records-filter__option:hover,
.records-filter__option.active {
  color: var(--theme-primary);
  background: rgba(28, 123, 255, 0.1);
  border-radius: $radius-md;
}

.records-list {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.record-card {
  box-sizing: border-box;
  overflow: hidden;
  border-radius: $radius-lg;
  box-shadow: var(--shadow-card);

  @include web-only {
    padding: $spacing-lg;
    background: rgba(28, 123, 255, 0.1);
  }

  @include mobile-only {
    padding: 17px 14px;
  }
}

.record-card__header {
  display: grid;
  grid-template-columns: 92px minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  margin-bottom: $spacing-md;

  @include mobile-only {
    grid-template-columns: 88px minmax(0, 1fr) auto;
    margin-bottom: 16px;
  }
}

.record-card__type {
  color: var(--theme-primary);
  font-weight: 500;
  position: relative;
  margin-left: $radius-sm;
  @include web-only {
    font-size: $font-size-base;
  }
  @include mobile-only {
    font-size: 15px;
    font-weight: 700;
  }
}

.record-card__type::before {
  content: '';
  display: inline-block;
  position: absolute;
  top: 50%;
  left: -6px;
  width: 2px;
  background: var(--theme-primary);
  transform: translateY(-50%);

  @include web-only {
    height: 14px;
  }

  @include mobile-only {
    height: $spacing-md;
  }
}

.record-card__type--deposit {
  color: var(--auxiliary-3);
}

.record-card__time {
  color: var(--theme-text);
  text-align: center;
  white-space: nowrap;
  font-weight: 300;
  @include web-only {
    font-size: $font-size-md;
  }
  @include mobile-only {
    font-size: 13px;
  }
}

.record-card__status {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 60px;
  height: $spacing-2xl;
  border-radius: $spacing-sm;
  font-size: $font-size-sm;
  font-weight: 400;
  text-align: center;
}

.record-card__status--pending {
  background: #dbeafe;
  color: var(--theme-primary);
}

.record-card__status--settled,
.record-card__status--completed {
  background: #eef3f8;
  color: var(--theme-text);
}

.record-card__status--canceled {
  background: #ffe7ea;
  color: var(--auxiliary-2);
}

.record-card__body {
  border-radius: $radius-md;
  background: var(--auxiliary-1);
  position: relative;
  overflow: hidden;
}

.record-card__body::before {
  content: '';
  position: absolute;
  top: 50%;
  width: calc(100% - 24px);
  height: 0.5px;
  margin: 0 $spacing-md;
  transform: translateY(-50%);

  @include web-only {
    background: var(--theme-divider);
  }

  @include mobile-only {
    background: var(--auxiliary-1);
  }
}

.record-card__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 $spacing-md;
  
  @include web-only {
    height: 48px;
  }
  @include mobile-only {
    height: 40px;
    background: var(--surface-card);
    border-radius: 12px;
  }
}


.record-card__label {
  color: var(--theme-text-1);
  font-weight: 400;
  @include web-only {
    font-size: $font-size-md;
  }
  @include mobile-only {
    font-size: 14px;
  }
}

.record-card__value {
  margin-left: $spacing-lg;
  color: var(--theme-text);
  font-weight: 500;
  text-align: right;
  @include web-only {
    font-size: $font-size-base;
  }
  @include mobile-only {
    font-size: 15px;
    font-weight: 700;
  }
}
</style>
