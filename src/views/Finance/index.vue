<script setup>
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';
import { computed } from 'vue';

const { t } = useI18n();
const route = useRoute();

const tabs = [
  { label: '充值', to: '/finance/deposit' },
  { label: '提领', to: '/finance/withdraw' },
  { label: '交易记录', to: '/finance/records' },
];

const activeTab = computed(() => route.path);
</script>

<template>
  <div class="finance-layout">
    <div class="finance-layout__inner">
      <nav class="finance-tabs">
        <RouterLink
          v-for="tab in tabs"
          :key="tab.to"
          :to="tab.to"
          class="finance-tab"
          :class="{ active: activeTab === tab.to }"
        >
          {{ t(tab.label) }}
        </RouterLink>
      </nav>

      <div class="finance-content">
        <RouterView />
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/tools.scss' as *;

.finance-layout {
  @include container;
  padding-top: $spacing-xl;
  padding-bottom: $spacing-4xl;

  &__inner {
    @include web-only {
      max-width: $web-content-max;
      margin: 0 auto;
    }
  }
}

.finance-tabs {
  display: flex;
  gap: $spacing-sm;
  margin-bottom: $spacing-xl;
  border-bottom: 1px solid var(--theme-divider);
  padding-bottom: $spacing-lg;

  @include mobile-only {
    overflow-x: auto;
  }
}

.finance-tab {
  padding: 10px $spacing-xl;
  border-radius: $radius-pill;
  font-size: $font-size-base;
  color: var(--theme-text);
  transition: all 0.2s;
  white-space: nowrap;
  font-weight: 500;

  &:hover,
  &.active {
    background: var(--theme-primary);
    color: #fff;
  }
}
</style>
