<script setup>
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const cards = ref([]);
</script>

<template>
  <div class="profile-bank">
    <h3 class="section-title">{{ t('银行卡') }}</h3>

    <div class="bind-tabs">
      <RouterLink to="/profile/bank-card" class="bind-tab active">{{ t('银行卡') }}</RouterLink>
      <RouterLink to="/profile/blockchain" class="bind-tab">{{ t('区块链') }}</RouterLink>
    </div>

    <div v-if="cards.length === 0" class="empty-state">
      <div class="empty-state__text">{{ t('暂无数据') }}</div>
      <button class="btn btn--primary add-btn">+ {{ t('银行卡') }}</button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/tools.scss' as *;

.section-title {
  font-size: $font-size-lg;
  font-weight: 700;
  color: var(--theme-text);
  margin-bottom: $spacing-xl;
}

.bind-tabs {
  display: flex;
  gap: $spacing-sm;
  margin-bottom: $spacing-3xl;
}

.bind-tab {
  padding: 8px 20px;
  border-radius: $radius-pill;
  font-size: $font-size-md;
  color: var(--theme-text);
  border: 1.5px solid var(--theme-divider);
  transition: all 0.2s;
  background: transparent;

  &:hover,
  &.active {
    background: var(--theme-primary);
    color: #fff;
    border-color: var(--theme-primary);
  }
}

.empty-state {
  text-align: center;
  padding: 60px 0;

  &__text {
    font-size: $font-size-md;
    color: var(--theme-text-1);
    margin-bottom: $spacing-xl;
  }
}

.add-btn {
  height: 44px;
  padding: 0 32px;
}
</style>
