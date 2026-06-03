<script setup>
import { useI18n } from 'vue-i18n';

const emit = defineEmits(['cancel', 'confirm']);
const { t } = useI18n();
</script>

<template>
  <div class="profile-modal-card profile-logout-card">
    <p>{{ t('确定要退出登录吗？') }}</p>
    <div class="profile-logout-actions">
      <button type="button" class="profile-logout-btn profile-logout-btn--cancel" @click="emit('cancel')">
        {{ t('取消') }}
      </button>
      <button type="button" class="profile-logout-btn profile-logout-btn--confirm" @click="emit('confirm')">
        {{ t('确定退出') }}
      </button>
    </div>
  </div>
</template>
