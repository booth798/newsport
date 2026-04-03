<script setup>
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const quickActions = [
  { label: '个人资料', to: '/profile/info' },
  { label: '消息中心', to: '/profile/messages' },
  { label: '实名认证', to: '/profile/verify' },
  { label: '安全设置', to: '/profile/security' },
  { label: '银行卡', to: '/profile/bank-card' },
  { label: '区块链', to: '/profile/blockchain' },
];
</script>

<template>
  <div class="profile-overview">
    <h3 class="section-title">{{ t('我的') }}</h3>
    <div class="quick-grid">
      <RouterLink
        v-for="action in quickActions"
        :key="action.to"
        :to="action.to"
        class="quick-card"
      >
        <span class="quick-card__label">{{ t(action.label) }}</span>
        <span class="quick-card__arrow">→</span>
      </RouterLink>
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

.quick-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: $spacing-md;

  @include mobile-only {
    grid-template-columns: 1fr;
  }
}

.quick-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: $spacing-lg $spacing-xl;
  border: 1.5px solid var(--theme-divider);
  border-radius: $radius-md;
  transition: all 0.2s;

  &:hover {
    border-color: var(--theme-primary);
    background: rgba(28, 123, 255, 0.04);
  }

  &__label {
    font-size: $font-size-md;
    color: var(--theme-text);
  }

  &__arrow {
    color: var(--theme-text-1);
  }
}
</style>
