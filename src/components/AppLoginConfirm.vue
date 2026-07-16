<script setup>
/**
 * 未登录操作拦截提示：先出「请先登录」确认框，点「登录」再打开真正的登录弹窗。
 * 样式对齐 AppCustomerServiceConfirm。
 */
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';

import BaseModal from '@/components/BaseModal.vue';
import { useAppStore } from '@/store/modules/app';

const { t } = useI18n();
const appStore = useAppStore();
const { loginConfirmOpen } = storeToRefs(appStore);

function close() {
  appStore.closeLoginConfirm();
}

function confirmLogin() {
  appStore.closeLoginConfirm();
  appStore.openLoginModal();
}
</script>

<template>
  <BaseModal
    :model-value="loginConfirmOpen"
    :title="t('提示')"
    :show-close="false"
    @update:model-value="close"
  >
    <div class="app-login-dialog__body">
      <span class="app-login-dialog__info" aria-hidden="true">i</span>
      <p>{{ t('请先登录') }}</p>
    </div>
    <div class="app-login-dialog__actions">
      <button type="button" class="app-login-dialog__btn--cancel" @click="close">
        {{ t('取消') }}
      </button>
      <button type="button" class="app-login-dialog__btn--confirm" @click="confirmLogin">
        {{ t('登录') }}
      </button>
    </div>
  </BaseModal>
</template>

<style lang="scss" scoped>
@use '@/styles/tools.scss' as *;

.app-login-dialog__body {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 70px;
  border-radius: 12px;
  background: #fff;
  color: #0b3462;
  font-size: 16px;
  font-weight: 700;

  p {
    margin: 0;
  }
}

.app-login-dialog__info {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border: 1.5px solid #5d7899;
  border-radius: 50%;
  color: #5d7899;
  font-size: 12px;
  font-weight: 700;
  font-family: $font-family-num, $font-family-base;
}

.app-login-dialog__actions {
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

.app-login-dialog__btn--cancel {
  border: 1px solid #fff;
  background: transparent;
  color: #fff;
}

.app-login-dialog__btn--confirm {
  border: 0;
  background: #fff;
  color: var(--theme-primary);
}
</style>
