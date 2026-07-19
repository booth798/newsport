<script setup>
/**
 * 未设置提现密码确认弹窗（对齐安卓 ToAddPasswordDialog）。
 * 文案：您还没有设置提现密码，是否去设置？ → 取消 / 去设置。
 */
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';

import BaseModal from '@/components/BaseModal.vue';
import { useAppStore } from '@/store/modules/app';
import iconDialogInfoUrl from '@/assets/images/common/icon_dialog_info.svg?url';

const { t } = useI18n();
const appStore = useAppStore();
const { withdrawPasswordConfirmOpen } = storeToRefs(appStore);

function close() {
  appStore.closeWithdrawPasswordConfirm();
}

function confirmGoSet() {
  appStore.closeWithdrawPasswordConfirm();
  // 打开安全设置并定位到「设置提现密码」tab
  appStore.openProfileSecurityModal('withdraw');
}
</script>

<template>
  <BaseModal
    :model-value="withdrawPasswordConfirmOpen"
    :title="t('提示')"
    :show-close="false"
    @update:model-value="close"
  >
    <div class="app-withdraw-pwd-dialog__body">
      <span class="app-withdraw-pwd-dialog__info" aria-hidden="true">
        <img :src="iconDialogInfoUrl" width="20" height="20" alt="" />
      </span>
      <p>{{ t('您还没有设置提现密码，是否去设置？') }}</p>
    </div>
    <div class="app-withdraw-pwd-dialog__actions">
      <button type="button" class="app-withdraw-pwd-dialog__btn--cancel" @click="close">
        {{ t('取消') }}
      </button>
      <button type="button" class="app-withdraw-pwd-dialog__btn--confirm" @click="confirmGoSet">
        {{ t('去设置') }}
      </button>
    </div>
  </BaseModal>
</template>

<style lang="scss" scoped>
.app-withdraw-pwd-dialog__body {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 70px;
  padding: 12px 16px;
  border-radius: 12px;
  background: #fff;
  box-sizing: border-box;

  p {
    margin: 0;
    color: #0b3462;
    font-size: 16px;
    font-weight: 400;
    line-height: 1.4;
  }
}

.app-withdraw-pwd-dialog__info {
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

.app-withdraw-pwd-dialog__actions {
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

.app-withdraw-pwd-dialog__btn--cancel {
  border: 1px solid #fff;
  background: transparent;
  color: #fff;
}

.app-withdraw-pwd-dialog__btn--confirm {
  border: 0;
  background: #fff;
  color: var(--theme-primary);
}
</style>
