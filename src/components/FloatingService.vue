<script setup>
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
</script>

<template>
  <div class="floating-service" :title="t('在线客服')">
    <div class="floating-service__icon">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2C6.48 2 2 6.48 2 12C2 13.85 2.5 15.55 3.35 17L2 22L7 20.65C8.45 21.5 10.15 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C10.36 20 8.82 19.53 7.5 18.74L4 20L5.26 16.5C4.47 15.18 4 13.64 4 12C4 7.58 7.58 4 12 4C16.42 4 20 7.58 20 12C20 16.42 16.42 20 12 20Z" fill="currentColor"/>
        <circle cx="8" cy="12" r="1.5" fill="currentColor"/>
        <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
        <circle cx="16" cy="12" r="1.5" fill="currentColor"/>
      </svg>
    </div>
    <span class="floating-service__text">{{ t('在线客服') }}</span>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/tools.scss' as *;

.floating-service {
  position: fixed;
  z-index: 100;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  transition: transform 0.2s;

  &:hover {
    transform: scale(1.05);
  }

  @include web-only {
    right: 24px;
    bottom: 120px;
    background: linear-gradient(135deg, rgba(86, 150, 245, 1), rgba(15, 54, 117, 1));
    border-radius: 12px 0 0 12px;
    padding: 16px 12px;
    color: #fff;
    box-shadow: 8px 14px 40px 0 rgba(21, 102, 210, 0.32);
  }

  @include mobile-only {
    right: 12px;
    bottom: 80px;
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: var(--theme-primary);
    color: #fff;
    justify-content: center;
    box-shadow: 0 4px 16px rgba(28, 123, 255, 0.4);

    .floating-service__text {
      display: none;
    }
  }

  &__icon {
    width: 24px;
    height: 24px;
  }

  &__text {
    font-size: $font-size-xs;
    writing-mode: vertical-rl;
    letter-spacing: 2px;
  }
}
</style>
