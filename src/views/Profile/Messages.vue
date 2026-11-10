<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';

import { fetchMessages, markMessageRead } from '@/api/user';

const { t } = useI18n();
const route = useRoute();

const messages = ref([]);
const loading = ref(true);
const error = ref(false);

const selectedMessage = computed(() => {
  const messageId = Array.isArray(route.query.messageId)
    ? route.query.messageId[0]
    : route.query.messageId;
  if (messageId != null && messageId !== '') {
    return messages.value.find((message) => String(message.id) === String(messageId)) || null;
  }
  return messages.value[0] || null;
});

const messageTitle = computed(() => selectedMessage.value?.title || t('系统消息'));
const messageContent = computed(() => selectedMessage.value?.content || '');

async function loadMessages() {
  try {
    loading.value = true;
    error.value = false;
    const res = await fetchMessages({ pageSize: 50 });
    messages.value = res.data || [];
  } catch {
    messages.value = [];
    error.value = true;
  } finally {
    loading.value = false;
  }
}

async function markSelectedMessageRead(message) {
  if (!message || message.read || message.id == null) return;
  try {
    await markMessageRead(message.id);
    message.read = true;
  } catch {
    // 阅读状态失败不阻塞消息正文展示。
  }
}

watch(selectedMessage, markSelectedMessageRead, { immediate: true });

onMounted(() => {
  loadMessages();
});
</script>

<template>
  <div class="message-page">
    <main class="message-page__content">
      <div v-if="loading" class="message-page__state">
        <span class="message-page__spinner" aria-hidden="true" />
        <span>{{ t('加载中') }}</span>
      </div>

      <div v-else-if="error" class="message-page__state">
        <span>{{ t('加载失败') }}</span>
        <button type="button" class="message-page__retry" @click="loadMessages">{{ t('重试') }}</button>
      </div>

      <div v-else-if="!selectedMessage" class="message-page__state">
        <span>{{ t('暂无消息') }}</span>
      </div>

      <article v-else class="message-detail">
        <h2 class="message-detail__heading">{{ t('系统消息') }}</h2>
        <div class="message-detail__body">
          <p class="message-detail__title">{{ messageTitle }}</p>
          <p class="message-detail__text">{{ messageContent }}</p>
        </div>
      </article>
    </main>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/tools.scss' as *;

.message-page {
  min-height: calc(100dvh - 120px);
  box-sizing: border-box;
  color: var(--theme-text);
  background: var(--theme-bg);

  @include web-only {
    padding: 40px 40px 44px;
  }

  @include mobile-only {
    min-height: calc(100dvh - env(safe-area-inset-top, 20px) - 64px);
    padding: 8px 8px 20px;
  }
}

.message-page__content {
  width: min(1050px, calc(100vw - 80px));
  min-height: max(560px, calc(100dvh - 215px));
  margin: 0 auto;
  box-sizing: border-box;
  border: 1px solid rgba(255, 255, 255, 0.9);
  border-radius: 40px;
  background: #fff;
  box-shadow: 0 10px 24px rgba(var(--theme-shadow-rgb), 0.14);

  @include mobile-only {
    width: 100%;
    min-height: calc(100dvh - env(safe-area-inset-top, 20px) - 92px);
    border-radius: 16px;
    box-shadow: none;
  }
}

.message-page__state {
  display: flex;
  min-height: 260px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: rgba(var(--theme-text-rgb), 0.55);
  font-size: 16px;
}

.message-page__spinner {
  width: 28px;
  height: 28px;
  border: 3px solid var(--theme-divider);
  border-top-color: var(--theme-primary);
  border-radius: 50%;
  animation: message-page-spin 0.8s linear infinite;
}

@keyframes message-page-spin {
  to { transform: rotate(360deg); }
}

.message-page__retry {
  height: 34px;
  padding: 0 20px;
  border: 1px solid var(--theme-primary);
  border-radius: 17px;
  background: transparent;
  color: var(--theme-primary);
  cursor: pointer;
}

.message-detail {
  min-height: inherit;
  box-sizing: border-box;
  @include web-only {
    padding: 40px;
  }
  @include mobile-only {
    padding: 24px 18px 32px;
  }
}

.message-detail__heading {
  margin: 0;
  color: var(--theme-primary);
  font-size: 20px;
  font-weight: 700;
  line-height: 1.35;
  text-align: center;

  @include mobile-only {
    display: none;
  }
}

.message-detail__body {
  @include web-only {
    margin-top: 40px;
  }
  @include mobile-only {
    margin-top: 0;
  }
}

.message-detail__title,
.message-detail__text {
  margin: 0;
  color: var(--theme-text);
  font-weight: 400;
  white-space: pre-line;
  overflow-wrap: anywhere;
  @include web-only {
    font-size: 14px;
  }
  @include mobile-only {
    font-size: 16px;
  }
}

.message-detail__text {
  margin-top: 30px;
  line-height: 2;
  @include mobile-only {
    margin-top: 16px;
  }
}
</style>
