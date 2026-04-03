<script setup>
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const messages = ref([]);
</script>

<template>
  <div class="profile-messages">
    <h3 class="section-title">{{ t('消息中心') }}</h3>

    <div v-if="messages.length === 0" class="empty-state">
      <div class="empty-state__icon">📭</div>
      <div class="empty-state__text">{{ t('暂无数据') }}</div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/tools.scss' as *;

.section-title {
  font-size: $font-size-lg;
  font-weight: 700;
  color: var(--theme-text);
  margin-bottom: $spacing-3xl;
}

.empty-state {
  text-align: center;
  padding: 60px 0;

  &__icon {
    font-size: 48px;
    margin-bottom: $spacing-lg;
  }

  &__text {
    font-size: $font-size-md;
    color: var(--theme-text-1);
  }
}
</style>
