<script setup>
import { useI18n } from 'vue-i18n';

import ProfileSheetShell from '@/views/Profile/components/ProfileSheetShell.vue';

defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['update:modelValue', 'confirm']);

const { t } = useI18n();

function cancel() {
  emit('update:modelValue', false);
}

function confirm() {
  emit('confirm');
}
</script>

<template>
  <ProfileSheetShell
    :model-value="modelValue"
    :title="t('提示')"
    :aria-label="t('提示')"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="logout-panel card-default">
      <span class="logout-panel__icon" aria-hidden="true">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="10" r="9" stroke="currentColor" stroke-width="1.5" />
          <path d="M10 9v5M10 6.5v.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
        </svg>
      </span>
      <p class="logout-panel__text">{{ t('确定退出登录吗') }}</p>
    </div>

    <template #footer>
      <div class="logout-actions">
        <button type="button" class="logout-actions__cancel" @click="cancel">
          {{ t('取消') }}
        </button>
        <button type="button" class="logout-actions__confirm" @click="confirm">
          {{ t('确定退出') }}
        </button>
      </div>
    </template>
  </ProfileSheetShell>
</template>

<style lang="scss" scoped>
@use '@/styles/tools.scss' as *;

.logout-panel {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px 14px;
  border-radius: 12px;

  &__icon {
    flex-shrink: 0;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: rgba(28, 123, 255, 0.1);
    color: var(--theme-primary);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &__text {
    margin: 0;
    font-size: 15px;
    font-weight: 500;
    line-height: 1.4;
    color: #0b3462;
    text-align: left;
  }
}

.logout-actions {
  display: flex;
  gap: 12px;
  width: 100%;

  &__cancel,
  &__confirm {
    flex: 1;
    height: 48px;
    border-radius: 24px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition:
      opacity 0.2s ease,
      background 0.2s ease;
  }

  &__cancel {
    border: none;
    background: #fff;
    color: #ef4444;
    box-shadow: var(--shadow-card);

    &:hover {
      opacity: 0.9;
    }
  }

  &__confirm {
    border: none;
    background: #ef4444;
    color: #fff;
    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.35);

    &:hover {
      background: #dc2626;
    }
  }
}
</style>
