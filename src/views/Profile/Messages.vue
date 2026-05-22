<script setup>
import { onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { fetchMessages } from '@/api/user';

const { t } = useI18n();
const messages = ref([]);
const loading = ref(true);
const error = ref(false);

async function loadMessages() {
  try {
    loading.value = true;
    error.value = false;
    const res = await fetchMessages();
    messages.value = res.data || [];
  } catch {
    error.value = true;
  } finally {
    loading.value = false;
  }
}

onMounted(loadMessages);
</script>

<template>
  <div class="profile-messages">
    <h3 class="section-title">{{ t('消息中心') }}</h3>

    <div v-if="loading" class="msg-state">
      <div class="msg-spinner" />
      <span>{{ t('加载中') }}</span>
    </div>

    <div v-else-if="error" class="msg-state">
      <span>{{ t('加载失败') }}</span>
      <button type="button" class="msg-retry" @click="loadMessages">{{ t('重试') }}</button>
    </div>

    <div v-else-if="messages.length === 0" class="empty-state">
      <div class="empty-state__icon">📭</div>
      <div class="empty-state__text">{{ t('暂无数据') }}</div>
    </div>

    <div v-else class="msg-list">
      <div v-for="msg in messages" :key="msg.id" class="msg-item" :class="{ 'msg-item--unread': !msg.read }">
        <div class="msg-item__head">
          <span class="msg-item__title">{{ msg.title }}</span>
          <span class="msg-item__time">{{ msg.time }}</span>
        </div>
        <p class="msg-item__content">{{ msg.content }}</p>
      </div>
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

.msg-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  min-height: 200px;
  color: var(--theme-text-1);
  font-size: $font-size-md;
}

.msg-spinner {
  width: 28px;
  height: 28px;
  border: 3px solid var(--theme-divider);
  border-top-color: var(--theme-primary);
  border-radius: 50%;
  animation: msg-spin 0.8s linear infinite;
}

@keyframes msg-spin {
  to { transform: rotate(360deg); }
}

.msg-retry {
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

.msg-list {
  display: flex;
  flex-direction: column;
}

.msg-item {
  padding: $spacing-lg 0;
  border-bottom: 1px solid var(--theme-divider);

  &:last-child {
    border-bottom: none;
  }

  &--unread {
    .msg-item__title::before {
      content: '';
      display: inline-block;
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #ef4444;
      margin-right: 6px;
      vertical-align: middle;
    }
  }

  &__head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 6px;
  }

  &__title {
    font-size: $font-size-md;
    font-weight: 600;
    color: var(--theme-text);
  }

  &__time {
    font-size: $font-size-xs;
    color: var(--theme-text-1);
  }

  &__content {
    margin: 0;
    font-size: $font-size-sm;
    color: var(--theme-text-1);
    line-height: 1.5;
  }
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
