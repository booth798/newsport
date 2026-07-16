<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';

import iconMoreUrl from '@/assets/images/common/icon_more.svg?url';
import iconNavBackMarketUrl from '@/assets/images/common/icon_nav_back_market.svg?url';
import { fetchMessages, markMessageRead } from '@/api/user';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();

const messages = ref([]);
const loading = ref(true);
const error = ref(false);
const beijingNow = ref('');
let clockTimer = null;

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

function updateBeijingClock() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(new Date());
  const pick = (type) => parts.find((part) => part.type === type)?.value || '';
  beijingNow.value = `${pick('year')}-${pick('month')}-${pick('day')} ${pick('hour')}:${pick('minute')}:${pick('second')}`;
}

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

function goBack() {
  if (window.history.length > 1) {
    router.back();
    return;
  }
  router.push('/profile');
}

function openProfileMenu() {
  router.push('/profile');
}

watch(selectedMessage, markSelectedMessageRead, { immediate: true });

onMounted(() => {
  updateBeijingClock();
  clockTimer = window.setInterval(updateBeijingClock, 1000);
  loadMessages();
});

onBeforeUnmount(() => {
  if (clockTimer) window.clearInterval(clockTimer);
});
</script>

<template>
  <div class="message-page">
    <header class="message-page__topbar">
      <span class="message-page__clock">Beijing Time: {{ beijingNow }}</span>
      <div class="message-page__nav">
        <button type="button" class="message-page__back" :aria-label="t('返回')" @click="goBack">
          <img :src="iconNavBackMarketUrl" width="48" height="48" alt="" />
        </button>
        <h1 class="message-page__mobile-title">{{ t('系统消息') }}</h1>
        <button
          type="button"
          class="message-page__menu"
          :aria-label="t('我的')"
          @click="openProfileMenu"
        >
          <img :src="iconMoreUrl" width="48" height="48" alt="" />
        </button>
      </div>
    </header>

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
  min-height: 100dvh;
  box-sizing: border-box;
  color: #0b3462;
  background: var(--theme-bg);

  @include web-only {
    padding: 40px 40px 44px;
  }

  @include mobile-only {
    padding: calc(env(safe-area-inset-top, 20px) + 8px) 8px 20px;
  }
}

.message-page__topbar {
  position: relative;

  @include web-only {
    width: 100%;
  }
}

.message-page__clock {
  position: absolute;
  top: -28px;
  right: 4px;
  color: rgba(11, 52, 98, 0.48);
  font-family: $font-family-num, $font-family-base;
  font-size: 14px;
  font-weight: 500;
  line-height: 1;
  white-space: nowrap;

  @include mobile-only {
    display: none;
  }
}

.message-page__nav {
  position: relative;
  display: flex;
  align-items: center;
  box-sizing: border-box;
  height: 104px;
  padding: 0 28px;
  border: 1px solid #fff;
  border-radius: 52px;
  background: rgba(240, 247, 255, 0.56);

  @include mobile-only {
    height: 48px;
    padding: 0 8px;
    border-radius: 28px;
  }
}

.message-page__back,
.message-page__menu {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
  transition: opacity 0.2s ease;

  &:hover { opacity: 0.82; }

  &:focus-visible {
    outline: 2px solid var(--theme-primary);
    outline-offset: 3px;
  }

  img {
    display: block;
    width: 48px;
    height: 48px;
  }

  @include mobile-only {
    img {
      width: 40px;
      height: 40px;
    }
  }
}

.message-page__menu {
  margin-left: auto;

  @include mobile-only {
    display: none;
  }
}

.message-page__mobile-title {
  display: none;

  @include mobile-only {
    position: absolute;
    left: 50%;
    display: block;
    margin: 0;
    transform: translateX(-50%);
    color: #0b3462;
    font-size: 16px;
    font-weight: 700;
    line-height: 1;
    white-space: nowrap;
  }
}

.message-page__content {
  width: min(1050px, calc(100vw - 80px));
  min-height: max(560px, calc(100dvh - 215px));
  margin: 26px auto 0;
  box-sizing: border-box;
  border: 1px solid rgba(255, 255, 255, 0.9);
  border-radius: 40px;
  background: #fff;
  box-shadow: 0 10px 24px rgba(21, 58, 119, 0.14);

  @include mobile-only {
    width: 100%;
    min-height: calc(100dvh - 160px);
    margin-top: 8px;
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
  color: rgba(11, 52, 98, 0.55);
  font-size: 16px;
}

.message-page__spinner {
  width: 28px;
  height: 28px;
  border: 3px solid #e4f0fe;
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
  padding: 52px 52px 64px;

  @include mobile-only {
    padding: 24px 18px 32px;
  }
}

.message-detail__heading {
  margin: 0;
  color: var(--theme-primary);
  font-size: 28px;
  font-weight: 700;
  line-height: 1.35;
  text-align: center;

  @include mobile-only {
    display: none;
  }
}

.message-detail__body {
  margin-top: 52px;

  @include mobile-only {
    margin-top: 0;
  }
}

.message-detail__title,
.message-detail__text {
  margin: 0;
  color: #0b3462;
  font-size: 20px;
  font-weight: 400;
  line-height: 1.8;
  white-space: pre-line;
  overflow-wrap: anywhere;

  @include mobile-only {
    font-size: 16px;
    line-height: 1.5;
  }
}

.message-detail__text {
  margin-top: 30px;

  @include mobile-only {
    margin-top: 16px;
  }
}
</style>
