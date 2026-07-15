<script setup>
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import { fetchMessages } from '@/api/user';
import BaseModal from '@/components/BaseModal.vue';
import EmptyState from '@/components/EmptyState.vue';
import arrowMoreIcon from '@/assets/images/common/icon_arrow_more.svg';

const props = defineProps({
  modelValue: { type: Boolean, default: false },
});

const emit = defineEmits(['update:modelValue']);
const { t } = useI18n();
const router = useRouter();
const messages = ref([]);
const loading = ref(false);
const error = ref(false);

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
    query: message.id == null ? undefined : { messageId: String(message.id) },
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

      <EmptyState v-else-if="messages.length === 0" :icon-size="96" />

      <div v-else class="message-center-modal__list">
        <button v-for="message in messages" :key="message.id" type="button" class="message-center-modal__item"
          @click="openMessage(message)">
          <span class="message-center-modal__icon" aria-hidden="true" />
          <span class="message-center-modal__text">
            <strong>{{ message.title || t(message.category || message.type || '系统消息') }}</strong>
            <span>{{ message.content || message.summary || '' }}</span>
          </span>
          <img :src="arrowMoreIcon" alt="" width="20" height="20" />
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
    border-radius: 50%;
    background: #fff;

    &::before {
      content: '';
      position: absolute;
      top: 15px;
      left: 11px;
      width: 26px;
      height: 19px;
      border-radius: 5px;
      background: #b5c3d4;
    }

    &::after {
      content: '';
      position: absolute;
      top: 22px;
      left: 17px;
      width: 14px;
      height: 2px;
      border-radius: 2px;
      background: #fff;
    }
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

  &__item > img {
    flex: 0 0 20px;
    margin-left: 12px;
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
