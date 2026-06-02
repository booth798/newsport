<script setup>
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import { fetchMessages } from '@/api/user';

import ProfileSheetShell from '@/views/Profile/components/ProfileSheetShell.vue';

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['update:modelValue']);

const { t } = useI18n();

const messages = ref([]);
const loading = ref(false);
const error = ref(false);

function isServiceMessage(msg) {
  return msg.type === 'service' || (msg.title && msg.title.includes('客服'));
}

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

watch(
  () => props.modelValue,
  (open) => {
    if (open) loadMessages();
  },
);
</script>

<template>
  <ProfileSheetShell
    :model-value="modelValue"
    :title="t('消息中心')"
    :subtitle="t('查看您的系统消息')"
    :aria-label="t('消息中心')"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="messages-panel card-default">
      <div v-if="loading" class="messages-panel__state">
        <div class="messages-panel__spinner" />
        <span>{{ t('加载中') }}</span>
      </div>

      <div v-else-if="error" class="messages-panel__state">
        <span>{{ t('加载失败') }}</span>
        <button type="button" class="messages-panel__retry" @click="loadMessages">
          {{ t('重试') }}
        </button>
      </div>

      <div v-else-if="messages.length === 0" class="messages-panel__state">
        <span>{{ t('暂无数据') }}</span>
      </div>

      <ul v-else class="messages-panel__list">
        <li v-for="msg in messages" :key="msg.id" class="messages-panel__item">
          <span class="messages-panel__icon" :class="{ 'messages-panel__icon--service': isServiceMessage(msg) }">
            <svg v-if="isServiceMessage(msg)" width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <circle cx="10" cy="10" r="9" stroke="currentColor" stroke-width="1.5" />
              <path d="M10 9v5M10 6.5v.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
            </svg>
            <svg v-else width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path
                d="M4 5.5h12a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H8l-3.5 2.5V6.5a1 1 0 0 1 1-1Z"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linejoin="round"
              />
            </svg>
          </span>
          <div class="messages-panel__content">
            <p class="messages-panel__title">
              {{ isServiceMessage(msg) ? t('客服消息') : t('系统消息') }}
            </p>
            <p class="messages-panel__snippet">{{ msg.content }}</p>
          </div>
          <span class="messages-panel__chevron" aria-hidden="true">›</span>
        </li>
      </ul>
    </div>
  </ProfileSheetShell>
</template>

<style lang="scss" scoped>
@use '@/styles/tools.scss' as *;

.messages-panel {
  padding: 4px 0;
  border-radius: 12px;
  flex-shrink: 0;

  &__state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
    min-height: 120px;
    padding: 16px;
    color: rgba(11, 52, 98, 0.55);
    font-size: 14px;
  }

  &__spinner {
    width: 24px;
    height: 24px;
    border: 2.5px solid var(--theme-divider);
    border-top-color: var(--theme-primary);
    border-radius: 50%;
    animation: messages-spin 0.8s linear infinite;
  }

  &__retry {
    padding: 6px 20px;
    border-radius: $radius-pill;
    border: 1.5px solid var(--theme-primary);
    background: transparent;
    color: var(--theme-primary);
    font-size: 14px;
    cursor: pointer;
  }

  &__list {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  &__item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 14px 12px;
    border-bottom: 1px solid rgba(11, 52, 98, 0.08);
    cursor: pointer;
    transition: background 0.15s ease;

    &:last-child {
      border-bottom: none;
    }

    &:hover {
      background: rgba(28, 123, 255, 0.04);
    }
  }

  &__icon {
    flex-shrink: 0;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: rgba(11, 52, 98, 0.06);
    color: rgba(11, 52, 98, 0.45);
    display: flex;
    align-items: center;
    justify-content: center;

    &--service {
      background: rgba(28, 123, 255, 0.08);
      color: var(--theme-primary);
    }
  }

  &__content {
    flex: 1;
    min-width: 0;
  }

  &__title {
    margin: 0 0 2px;
    font-size: 14px;
    font-weight: 600;
    color: #0b3462;
  }

  &__snippet {
    margin: 0;
    font-size: 13px;
    line-height: 1.35;
    color: rgba(11, 52, 98, 0.55);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__chevron {
    flex-shrink: 0;
    font-size: 20px;
    line-height: 1;
    color: rgba(11, 52, 98, 0.35);
  }
}

@keyframes messages-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
