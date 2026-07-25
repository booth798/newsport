<script setup>
/**
 * 财务提交二次确认：互转 / 提现共用。
 * 样式对齐 AppLoginConfirm（提示标题 + 信息条 + 取消/确定）。
 */
import { useI18n } from 'vue-i18n';

import BaseModal from '@/components/BaseModal.vue';
import iconDialogInfoUrl from '@/assets/images/common/icon_dialog_info.svg?url';

defineProps({
  modelValue: { type: Boolean, default: false },
  /** 确认文案，如「是否发起当前提现？」 */
  message: { type: String, required: true },
});

const emit = defineEmits(['update:modelValue', 'confirm']);
const { t } = useI18n();

function close() {
  emit('update:modelValue', false);
}

function onConfirm() {
  emit('update:modelValue', false);
  emit('confirm');
}
</script>

<template>
  <BaseModal
    :model-value="modelValue"
    :title="t('提示')"
    :show-close="false"
    :click-mask-to-close="false"
    @update:model-value="close"
  >
    <div class="finance-submit-confirm__body">
      <span class="finance-submit-confirm__info" aria-hidden="true">
        <img :src="iconDialogInfoUrl" width="20" height="20" alt="" />
      </span>
      <p>{{ message }}</p>
    </div>
    <div class="finance-submit-confirm__actions">
      <button type="button" class="finance-submit-confirm__btn--cancel" @click="close">
        {{ t('取消') }}
      </button>
      <button type="button" class="finance-submit-confirm__btn--confirm" @click="onConfirm">
        {{ t('确定') }}
      </button>
    </div>
  </BaseModal>
</template>

<style lang="scss" scoped>
.finance-submit-confirm__body {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 70px;
  padding: 0 12px;
  border-radius: 12px;
  background: #fff;
  box-sizing: border-box;

  p {
    margin: 0;
    color: #0b3462;
    font-size: 16px;
    font-weight: 400;
    line-height: 1.4;
    text-align: center;
  }
}

.finance-submit-confirm__info {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;

  img {
    display: block;
    width: 20px;
    height: 20px;
  }
}

.finance-submit-confirm__actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 10px;

  button {
    height: 44px;
    border-radius: 22px;
    font-size: 18px;
    font-weight: 400;
    cursor: pointer;
  }
}

.finance-submit-confirm__btn--cancel {
  border: 1px solid #fff;
  background: transparent;
  color: #fff;
}

.finance-submit-confirm__btn--confirm {
  border: 0;
  background: #fff;
  color: var(--theme-primary);
}
</style>
