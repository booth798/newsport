<script setup>
/**
 * 注册成功弹窗：展示账号/密码，支持下载保存到本地（对齐 mychat registerPopup）。
 */
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import BaseModal from '@/components/BaseModal.vue';
import { useToast } from '@/hooks/useToast';

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  account: { type: String, default: '' },
  password: { type: String, default: '' },
  /** 底部主按钮文案；空则用「去登录」 */
  confirmText: { type: String, default: '' },
});

const emit = defineEmits(['update:modelValue', 'confirm']);

const { t } = useI18n();
const toast = useToast();

const displayConfirmText = computed(() => props.confirmText || t('去登录'));

function close() {
  emit('update:modelValue', false);
}

function onConfirm() {
  emit('confirm');
  close();
}

/** 下载账号密码文本，便于用户本地保管 */
function saveAccountInfo() {
  const account = String(props.account || '').trim();
  const password = String(props.password || '');
  if (!account) {
    toast.error(t('提交失败，请重试'));
    return;
  }

  const content = [
    t('账号信息'),
    '------------------------',
    `${t('账号')}：${account}`,
    `${t('密码')}：${password}`,
    '------------------------',
    t('请妥善保管您的账号信息'),
  ].join('\n');

  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${t('账号信息')}_${account}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  toast.success(t('已保存'));
}
</script>

<template>
  <BaseModal
    :model-value="props.modelValue"
    :title="t('注册成功')"
    :show-close="true"
    :click-mask-to-close="false"
    @update:model-value="close"
  >
    <div class="register-success-modal">
      <p class="register-success-modal__hint">{{ t('恭喜您成功注册UNIBET！') }}</p>

      <div class="register-success-modal__info">
        <div class="register-success-modal__row">
          <span class="register-success-modal__label">{{ t('账号') }}</span>
          <span class="register-success-modal__value">{{ account }}</span>
        </div>
        <div class="register-success-modal__row">
          <span class="register-success-modal__label">{{ t('密码') }}</span>
          <span class="register-success-modal__value">{{ password }}</span>
        </div>
      </div>

      <button type="button" class="register-success-modal__save" @click="saveAccountInfo">
        {{ t('保存账户及密码到电脑') }}
      </button>

      <button type="button" class="register-success-modal__confirm" @click="onConfirm">
        {{ displayConfirmText }}
      </button>
    </div>
  </BaseModal>
</template>

<style lang="scss" scoped>
.register-success-modal {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 12px;
}

.register-success-modal__hint {
  margin: 0;
  text-align: center;
  color: var(--theme-text);
  font-size: 15px;
  font-weight: 400;
  line-height: 1.4;
}

.register-success-modal__info {
  padding: 8px 0;
  border-radius: 12px;
  background: var(--surface-tint);
}

.register-success-modal__row {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 40px;
  padding: 0 16px;
  color: var(--theme-text);
  font-size: 14px;
  line-height: 1.3;
}

.register-success-modal__label {
  flex-shrink: 0;
  min-width: 40px;
  font-weight: 700;
}

.register-success-modal__value {
  flex: 1;
  min-width: 0;
  word-break: break-all;
  font-weight: 400;
}

.register-success-modal__save {
  width: 100%;
  height: 44px;
  border: none;
  border-radius: 22px;
  background: var(--theme-primary);
  color: #fff;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
}

.register-success-modal__confirm {
  width: 100%;
  height: 44px;
  border: none;
  border-radius: 22px;
  background: #fff;
  color: var(--theme-primary);
  font-size: 16px;
  font-weight: 400;
  cursor: pointer;
}
</style>
