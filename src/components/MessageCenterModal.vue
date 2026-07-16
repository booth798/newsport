<script setup>
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import { fetchMessages } from '@/api/user';
import BaseModal from '@/components/BaseModal.vue';
import EmptyState from '@/components/EmptyState.vue';
import iconSystemMessage from '@/assets/images/common/icon_announcement.svg';
import iconServiceMessage from '@/assets/images/common/icon_profile_service.svg';

const props = defineProps({
  modelValue: { type: Boolean, default: false },
});

const emit = defineEmits(['update:modelValue']);
const { t } = useI18n();
const router = useRouter();
const messages = ref([]);
const loading = ref(false);
const error = ref(false);

// 取第一个非空字段，与安卓 JsonObject.text(vararg keys) 行为对齐
function pickText(source, ...keys) {
  for (const key of keys) {
    const value = source?.[key];
    if (value != null && String(value).trim() !== '') return String(value);
  }
  return '';
}

// 客服消息判定，与安卓 isCustomerService() 的关键字匹配逻辑一致
function isCustomerServiceMessage(source) {
  const flag = pickText(source, 'category', 'source', 'type', 'typeName', 'subject').toLowerCase();
  return (
    flag.includes('客服')
    || flag.includes('customer')
    || flag.includes('service')
    || ['cs', 'c_s', 'customer_service', 'customer-service'].includes(flag)
  );
}

// 将后端原始消息归一化为安卓 MessageListItem 的字段结构
const normalizedMessages = computed(() =>
  messages.value
    .map((message) => ({
      id: pickText(message, 'id', 'messageId'),
      title: pickText(message, 'title', 'typeName', 'subject'),
      content: pickText(message, 'content', 'body', 'message'),
      read: message?.read === true,
      isCustomerService: isCustomerServiceMessage(message),
    }))
    // 与安卓一致：无有效 id 的消息直接丢弃
    .filter((message) => message.id !== ''),
);

async function loadMessages() {
  try {
    loading.value = true;
    error.value = false;
    const res = await fetchMessages({ pageSize: 20 });
    messages.value = res.data || [];
  } catch {
    error.value = true;
    messages.value = [];
  } finally {
    loading.value = false;
  }
}

function close() {
  emit('update:modelValue', false);
}

function openMessage(message) {
  close();
  router.push({
    name: 'profile-messages',
    query: message.id ? { messageId: message.id } : undefined,
  });
}

watch(
  () => props.modelValue,
  (visible) => {
    if (visible) loadMessages();
  },
);
</script>

<template>
  <BaseModal :model-value="props.modelValue" :title="t('消息中心')" :description="t('查看您的系统消息')"
    @update:model-value="emit('update:modelValue', $event)">
    <div class="message-center-modal">
      <div v-if="loading" class="message-center-modal__state">
        <span class="message-center-modal__spinner" aria-hidden="true" />
        <span>{{ t('加载中') }}</span>
      </div>

      <div v-else-if="error" class="message-center-modal__state">
        <span>{{ t('加载失败') }}</span>
        <button type="button" class="message-center-modal__retry" @click="loadMessages">{{ t('重试') }}</button>
      </div>

      <EmptyState v-else-if="normalizedMessages.length === 0" :icon-size="96" />

      <div v-else class="message-center-modal__list">
        <button v-for="message in normalizedMessages" :key="message.id" type="button"
          class="message-center-modal__item" @click="openMessage(message)">
          <span class="message-center-modal__icon">
            <img :src="message.isCustomerService ? iconServiceMessage : iconSystemMessage" alt="" width="48"
              height="48" />
            <span v-if="!message.read" class="message-center-modal__dot" aria-hidden="true" />
          </span>
          <span class="message-center-modal__text">
            <strong>{{ message.title || t(message.isCustomerService ? '客服消息' : '系统消息') }}</strong>
            <span>{{ message.content }}</span>
          </span>
          <svg class="message-center-modal__arrow" width="22" height="22" viewBox="0 0 22 22" fill="none"
            aria-hidden="true">
            <path d="M8.5 5.5 L14 11 L8.5 16.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"
              stroke-linejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  </BaseModal>
</template>

<style lang="scss" scoped>
@use '@/styles/tools.scss' as *;

.message-center-modal {
  min-height: 360px;
  max-height: min(54dvh, 500px);
  overflow-y: auto;
  padding: 10px 20px;
  border-radius: 20px;
  background: #edf5ff;

  @include web-only {
    min-height: 420px;
  }

  &__list {
    display: flex;
    flex-direction: column;
  }

  &__item {
    display: flex;
    align-items: center;
    min-width: 0;
    padding: 16px 0;
    border: 0;
    border-bottom: 1px solid #d7e4f2;
    background: transparent;
    color: #174274;
    cursor: pointer;
    text-align: left;

    &:last-child {
      border-bottom: 0;
    }
  }

  &__icon {
    position: relative;
    width: 48px;
    height: 48px;
    flex: 0 0 48px;
    margin-right: 14px;

    img {
      display: block;
      width: 48px;
      height: 48px;
    }
  }

  // 未读红点，与安卓 item_message_view 的红点表现对齐（bg_dot_red / color_F03E30）
  &__dot {
    position: absolute;
    top: 2px;
    right: 2px;
    width: 9px;
    height: 9px;
    border: 1.5px solid #edf5ff;
    border-radius: 50%;
    background: #f03e30;
  }

  &__text {
    display: flex;
    min-width: 0;
    flex: 1;
    flex-direction: column;
    gap: 4px;

    strong,
    span {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    strong {
      font-size: 16px;
      font-weight: 600;
      line-height: 1.4;
    }

    span {
      color: #7790ae;
      font-size: 15px;
      line-height: 1.4;
    }
  }

  // 右侧箭头，对齐安卓 rightIv(icon060)；用主题色描边保证浅色背景下可见
  &__arrow {
    flex: 0 0 22px;
    margin-left: 12px;
    color: #9fb2c9;
  }

  &__state {
    display: flex;
    min-height: inherit;
    align-items: center;
    justify-content: center;
    gap: 10px;
    color: #7790ae;
    font-size: 15px;
  }

  &__spinner {
    width: 20px;
    height: 20px;
    border: 2px solid #c6d7ea;
    border-top-color: #246fec;
    border-radius: 50%;
    animation: message-center-spin .8s linear infinite;
  }

  &__retry {
    border: 0;
    background: transparent;
    color: #246fec;
    cursor: pointer;
    font: inherit;
  }
}

@keyframes message-center-spin {
  to { transform: rotate(360deg); }
}
</style>
