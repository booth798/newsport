<script setup>
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import { fetchMessages, markAllRead } from '@/api/user';
import BaseModal from '@/components/BaseModal.vue';
import EmptyState from '@/components/EmptyState.vue';
import { useToast } from '@/hooks/useToast';
import iconSystemMessage from '@/assets/images/common/icon_announcement.svg';
import clean_all_read_icon from '@/assets/images/profile/clean_all_read_icon.svg';

const props = defineProps({
  modelValue: { type: Boolean, default: false },
});

const emit = defineEmits(['update:modelValue', 'read-all']);
const { t } = useI18n();
const router = useRouter();
const toast = useToast();
const messages = ref([]);
const loading = ref(false);
const error = ref(false);
const markingAllRead = ref(false);

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

const hasUnread = computed(() => normalizedMessages.value.some((m) => !m.read));

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

/** PC/H5：右上角一键已读 → POST /api/messages/read-all */
async function handleMarkAllRead() {
  if (markingAllRead.value || !hasUnread.value) return;
  markingAllRead.value = true;
  try {
    await markAllRead();
    messages.value = messages.value.map((m) => ({ ...m, read: true }));
    emit('read-all');
    toast.success(t('操作成功'));
  } catch (e) {
    toast.error(e?.message || t('操作失败'));
  } finally {
    markingAllRead.value = false;
  }
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
    <button
      type="button"
      class="message-center-modal__clean-all-read"
      :aria-label="t('全部已读')"
      :disabled="markingAllRead || !hasUnread"
      @click="handleMarkAllRead"
    >
      <img class="message-center-modal__clean-all-read-icon" :src="clean_all_read_icon" alt="" width="48" />
    </button>
    <div class="message-center-modal">
      <div class="message-center-modal__content">
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
          <div v-for="message in normalizedMessages" :key="message.id"
            class="message-center-modal__item" @click="openMessage(message)">
            <span class="message-center-modal__icon">
              <img :src="iconSystemMessage" />
              <span v-if="!message.read" class="message-center-modal__dot" aria-hidden="true" />
            </span>
            <span class="message-center-modal__text">
              <strong>{{ message.title || t(message.isCustomerService ? '客服消息' : '系统消息') }}</strong>
              <span>{{ message.content }}</span>
            </span>
            <svg class="message-center-modal__arrow" width="20" height="20" viewBox="0 0 22 22" fill="none"
              aria-hidden="true">
              <path d="M8.5 5.5 L14 11 L8.5 16.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"
                stroke-linejoin="round" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  </BaseModal>
</template>

<style lang="scss" scoped>
@use '@/styles/tools.scss' as *;

.message-center-modal {
  min-height: 360px;
  max-height: min(54dvh, 500px);
  border-radius: 20px;
  background: #FFFFFF;

  @include web-only {
    height: 413px;
    padding: 18px 20px;
  }
  @include mobile-only {
    height: 343px;
    padding: 16px 12px;
  }

  &__content {
    background: #EAF1F9;
    border-radius: 16px;
    height: 100%;
    overflow-y: auto;
    &::-webkit-scrollbar {
      display: none;
    }
    @include mobile-only {
      padding: 0 12px;
    }
    @include web-only {
      padding: 0 20px;
    }
  }

  &__clean-all-read {
    position: absolute;
    top: 12px;
    right: 0;
    padding: 0;
    border: 0;
    background: transparent;
    cursor: pointer;

    &:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }
  }

  &__clean-all-read-icon {
    display: block;
    width: 32px;
    height: auto;
    pointer-events: none;
  }

  &__list {
    display: flex;
    flex-direction: column;
  }

  &__item {
    display: flex;
    align-items: center;
    border-bottom: 1px solid rgba(255, 255, 255, 0.7);
    color: #174274;
    cursor: pointer;
    text-align: left;
    cursor: pointer;
    @include mobile-only {
      height: 54px;
    }
    @include web-only {
      height: 64px;
    }
  }

  &__icon {
    position: relative;
    width: 34px;
    height: 34px;
    margin-right: 10px;

    img {
      display: block;
      width: 34px;
      height: 34px;
    }
  }

  // 未读红点，与安卓 item_message_view 的红点表现对齐（bg_dot_red / color_F03E30）
  &__dot {
    position: absolute;
    top: 0;
    right: 0;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #f03e30;
  }

  &__text {
    display: flex;
    min-width: 0;
    flex: 1;
    flex-direction: column;

    @include mobile-only {
      font-size: 12px;
    }
    @include web-only {
      font-size: 14px;
    }

    strong,
    span {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    strong {
      font-weight: 500;
      line-height: 1.4;
    }

    span {
      color: #7790ae;
      line-height: 1.4;
      font-weight: 300;
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
