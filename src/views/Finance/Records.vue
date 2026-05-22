<script setup>
import { onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { fetchRecords } from '@/api/finance';

const { t } = useI18n();

const tabs = [
  { key: 'all', label: '全部' },
  { key: 'deposit', label: '充值' },
  { key: 'withdraw', label: '提领' },
  { key: 'trade', label: '交易记录' },
];
const activeTab = ref('all');
const records = ref([]);
const loading = ref(true);
const error = ref(false);

async function loadRecords() {
  try {
    loading.value = true;
    error.value = false;
    const res = await fetchRecords(activeTab.value);
    records.value = res.data || [];
  } catch {
    error.value = true;
  } finally {
    loading.value = false;
  }
}

onMounted(loadRecords);
watch(activeTab, loadRecords);
</script>

<template>
  <div class="records-page">
    <div class="records-page__inner">
      <h2 class="page-title">{{ t('交易记录') }}</h2>

      <div class="records-tabs">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          class="records-tab"
          :class="{ active: activeTab === tab.key }"
          @click="activeTab = tab.key"
        >
          {{ t(tab.label) }}
        </button>
      </div>

      <div class="records-list card-default">
        <div v-if="loading" class="records-state">
          <div class="records-spinner" />
          <span>{{ t('加载中') }}</span>
        </div>
        <div v-else-if="error" class="records-state">
          <span>{{ t('加载失败') }}</span>
          <button type="button" class="records-retry" @click="loadRecords">{{ t('重试') }}</button>
        </div>
        <div v-else-if="records.length === 0" class="records-empty">
          {{ t('暂无数据') }}
        </div>
        <div v-else class="records-items">
          <div v-for="record in records" :key="record.id" class="record-item">
            <div class="record-item__left">
              <span class="record-item__type">{{ record.type === 'deposit' ? t('充值') : record.type === 'withdraw' ? t('提领') : t('交易记录') }}</span>
              <span class="record-item__time">{{ record.time }}</span>
              <span v-if="record.desc" class="record-item__desc">{{ record.desc }}</span>
            </div>
            <div class="record-item__right">
              <span class="record-item__amount" :class="{ 'record-item__amount--plus': record.amount.startsWith('+') }">{{ record.amount }}</span>
              <span class="record-item__status" :class="`record-item__status--${record.statusTone}`">{{ record.status }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/tools.scss' as *;

.records-page {
  padding-top: 0;
  padding-bottom: $spacing-xl;
}

.page-title {
  font-size: $font-size-xl;
  font-weight: 700;
  color: var(--theme-text);
  margin-bottom: $spacing-xl;
}

.records-tabs {
  display: flex;
  gap: $spacing-sm;
  margin-bottom: $spacing-xl;
  overflow-x: auto;
}

.records-tab {
  padding: 8px 20px;
  border-radius: $radius-pill;
  font-size: $font-size-md;
  color: var(--theme-text);
  background: var(--auxiliary-1);
  border: 1.5px solid var(--theme-divider);
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;

  &:hover,
  &.active {
    background: var(--theme-primary);
    color: #fff;
    border-color: var(--theme-primary);
  }
}

.records-list {
  border-radius: $radius-lg;
  min-height: 300px;
  padding: $spacing-lg;
}

.records-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  min-height: 240px;
  color: var(--theme-text-1);
  font-size: $font-size-md;
}

.records-spinner {
  width: 28px;
  height: 28px;
  border: 3px solid var(--theme-divider);
  border-top-color: var(--theme-primary);
  border-radius: 50%;
  animation: rec-spin 0.8s linear infinite;
}

@keyframes rec-spin {
  to { transform: rotate(360deg); }
}

.records-retry {
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

.records-empty {
  text-align: center;
  padding: 80px 0;
  color: var(--theme-text-1);
  font-size: $font-size-base;
}

.records-items {
  display: flex;
  flex-direction: column;
}

.record-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: $spacing-lg 0;
  border-bottom: 1px solid var(--theme-divider);

  &:last-child {
    border-bottom: none;
  }

  &__left {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  &__type {
    font-size: $font-size-md;
    font-weight: 600;
    color: var(--theme-text);
  }

  &__time {
    font-size: $font-size-sm;
    color: var(--theme-text-1);
  }

  &__desc {
    font-size: $font-size-sm;
    color: var(--theme-text-1);
    margin-top: 2px;
  }

  &__right {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 4px;
  }

  &__amount {
    font-family: $font-family-num;
    font-size: $font-size-base;
    font-weight: 700;
    color: var(--theme-text);

    &--plus {
      color: #16a34a;
    }
  }

  &__status {
    font-size: $font-size-xs;
    padding: 2px 8px;
    border-radius: $radius-pill;

    &--completed {
      background: rgba(34, 197, 94, 0.1);
      color: #16a34a;
    }

    &--pending {
      background: rgba(245, 158, 11, 0.1);
      color: #d97706;
    }
  }
}
</style>
