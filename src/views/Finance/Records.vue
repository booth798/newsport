<script setup>
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const tabs = [
  { key: 'all', label: '全部' },
  { key: 'deposit', label: '充值' },
  { key: 'withdraw', label: '提领' },
  { key: 'trade', label: '交易记录' },
];
const activeTab = ref('all');

const records = ref([]);
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
        <div v-if="records.length === 0" class="records-empty">
          {{ t('暂无数据') }}
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
}

.records-empty {
  text-align: center;
  padding: 80px 0;
  color: var(--theme-text-1);
  font-size: $font-size-base;
}
</style>
