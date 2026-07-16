<script setup>
/**
 * 提现注意事项弹窗：复用全站 BaseModal，并按风险等级区分普通与警示文案。
 */
import { useI18n } from 'vue-i18n';

import BaseModal from '@/components/BaseModal.vue';

defineProps({
  modelValue: { type: Boolean, default: false },
});

const emit = defineEmits(['update:modelValue']);
const { t } = useI18n();

const notices = [
  { key: '提现注意事项1', warning: false },
  { key: '提现注意事项2', warning: false },
  { key: '提现注意事项3', warning: true },
  { key: '提现注意事项4', warning: true },
];

function close() {
  emit('update:modelValue', false);
}
</script>

<template>
  <BaseModal
    :model-value="modelValue"
    :title="t('注意事项')"
    :button-text="t('知道了')"
    :show-close="false"
    @update:model-value="emit('update:modelValue', $event)"
    @confirm="close"
  >
    <ol class="withdraw-notice-modal">
      <li
        v-for="notice,index in notices"
        :key="notice.key"
        :class="{ 'withdraw-notice-modal__item--warning': notice.warning }"
      >
        <div>{{ index + 1 }}.</div>{{ t(notice.key) }}
      </li>
    </ol>
  </BaseModal>
</template>

<style lang="scss" scoped>
@use '@/styles/tools.scss' as *;

.withdraw-notice-modal {
  box-sizing: border-box;
  padding: 20px;
  border-radius: 20px;
  background: var(--auxiliary-1);
  color: #89a0bc;
  font-size: 16px;
  line-height: 1.55;
  li {
    flex: 1;
    display: flex;
    div {
      margin-right: 3px;
    }
  }
  @include mobile-only {
    padding: 18px 18px 18px 36px;
    border-radius: 18px;
    font-size: 14px;
  }
}

.withdraw-notice-modal__item--warning {
  color: #ff5a1f;
}
</style>
