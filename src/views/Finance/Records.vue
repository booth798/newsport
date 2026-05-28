<script setup>
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';

import { useAppStore } from '@/store/modules/app';

const { t } = useI18n();
const appStore = useAppStore();
const { isMobile } = storeToRefs(appStore);

const filterOptions = [
  { key: 'all', label: '全部' },
  { key: 'deposit', label: '充值' },
  { key: 'withdraw', label: '提现' },
  { key: 'order', label: '订单' },
];

const records = [
  { id: 1, kind: 'order', typeLabel: '买入', time: '2026-03-19 02:30', status: '待开奖', statusTone: 'pending', amount: '1000.00 CNY', remark: '0 - 0' },
  { id: 2, kind: 'order', typeLabel: '买入', time: '2026-03-19 02:30', status: '已结算', statusTone: 'settled', amount: '1000.00 CNY', remark: '0 - 1' },
  { id: 3, kind: 'order', typeLabel: '买入', time: '2026-03-19 02:30', status: '已取消', statusTone: 'canceled', amount: '1000.00 CNY', remark: '0 - 1' },
  { id: 4, kind: 'deposit', typeLabel: '充值', time: '2026-03-19 02:30', status: '已完成', statusTone: 'completed', amount: '1000.00 CNY', remark: '后台-银联卡-下充值' },
];

const selectedFilter = ref('all');
const filterOpen = ref(false);

const selectedFilterLabel = computed(() => {
  return filterOptions.find((item) => item.key === selectedFilter.value)?.label || '全部';
});

const filteredRecords = computed(() => {
  if (selectedFilter.value === 'all') return records;
  return records.filter((record) => record.kind === selectedFilter.value);
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

    <div class="records-list">
      <article v-for="record in filteredRecords" :key="record.id" class="record-card card-default">
        <header class="record-card__header">
          <span class="record-card__type" :class="{ 'record-card__type--deposit': record.kind === 'deposit' }">
            {{ t(record.typeLabel) }}
          </span>
          <time class="record-card__time">{{ record.time }}</time>
          <span class="record-card__status" :class="`record-card__status--${record.statusTone}`">
            {{ t(record.status) }}
          </span>
        </header>

        <div class="record-card__body">
          <div class="record-card__row">
            <span class="record-card__label">{{ t('金额') }}</span>
            <strong class="record-card__value">{{ record.amount }}</strong>
          </div>
          <div class="record-card__row">
            <span class="record-card__label">{{ t('备注') }}</span>
            <strong class="record-card__value">{{ record.remark }}</strong>
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
  gap: 10px;
  width: 100%;
  max-width: 100%;

  @include mobile-only {
    overflow-x: hidden;
  }
}

.records-summary {
  position: relative;
  z-index: 2;
  border-radius: 16px;
  border: 1px solid #FFFFFF;
  background: linear-gradient(180deg, rgb(139 188 255 / 20%) 0%, rgb(255 255 255 / 73%) 100%);
  box-shadow: 0px 4px 10px 0px #153A772E;
  color: var(--theme-text);
  padding: 14px 16px 16px;
  height: 106px;

  @include web-only {
  }

  @include mobile-only {
  }
}

.records-summary__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: var(--theme-text);
  font-size: 14px;
  font-weight: 500;
}

.records-summary__amount {
  display: flex;
  align-items: center;
  height: 38px;
  padding: 0 10px;
  border-radius: 6px;
  background: #1C7BFF1A;
  color: var(--theme-primary);
  font-size: 20px;
  font-weight: 500;

  @include web-only {
    margin-top: 12px;
  }
  @include mobile-only {
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
  gap: 6px;
  min-width: 64px;
  height: 24px;
  padding: 0 12px;
  border: none;
  border-radius: $radius-pill;
  background: var(--theme-primary);
  color: #fff;
  font-size:14px;
  font-weight: 400;
  cursor: pointer;
  box-shadow: 0px 2px 6px 0px #1C7BFF4D;
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
  border-radius: 16px;
  background: #fff;
  box-shadow: 0px 6px 20px 0px #153A772E;
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
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
}

.records-filter__option:hover,
.records-filter__option.active {
  color: var(--theme-primary);
  background: #1C7BFF1A;
  border-radius: 12px;
}

.records-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.record-card {
  box-sizing: border-box;
  overflow: hidden;
  box-shadow: 0px 4px 10px 0px #153A772E;
  border-radius: 16px;

  @include web-only {
    padding: 16px;
    background: #1C7BFF1A;
  }

  @include mobile-only {
    padding: 14px 16px;
  }
}

.record-card__header {
  display: grid;
  grid-template-columns: 92px minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;

  @include web-only {

  }

  @include mobile-only {
    grid-template-columns: 88px minmax(0, 1fr) auto;
  }
}

.record-card__type {
  color: var(--theme-primary);
  font-weight: 500;
  position: relative;
  margin-left: 6px;
  @include web-only {
    font-size: 16px;
  }
  @include mobile-only {
    font-size: 14px;
  }
  &::before {
    content: '';
    display: inline-block;
    position: absolute;
    top: 50%;
    left: -6px;
    transform: translateY(-50%);
    width: 2px;
    background: var(--theme-primary);
    @include web-only {
      height: 14px;
    }
    @include mobile-only {
      height: 12px;
    }
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
    font-size: 14px;
  }
  @include mobile-only {
    font-size: 12px;
  }
}

.record-card__status {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 60px;
  height: 24px;
  border-radius: 8px;
  font-size: 12px;
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
  border-radius: 12px;
  background: #FFFFFF;
  position: relative;
  overflow: hidden;
  &::before {
    content: '';
    width: calc(100% - 24px);
    margin: 0 12px;
    height: 0.5px;
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    @include web-only {
      background: var(--theme-divider);
    }
    @include mobile-only {
      background: #FFFFFF;
    }
  }
}

.record-card__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  
  @include web-only {
    height: 48px;
  }
  @include mobile-only {
    height: 44px;
    background: var(--surface-card);
  }
}


.record-card__label {
  color: var(--theme-text-1);
  font-weight: 400;
  @include web-only {
    font-size: 14px;
  }
  @include mobile-only {
    font-size: 12px;
  }
}

.record-card__value {
  margin-left: 16px;
  color: var(--theme-text);
  font-weight: 500;
  text-align: right;
  @include web-only {
    font-size: 16px;
  }
  @include mobile-only {
    font-size: 14px;
  }
}
</style>
