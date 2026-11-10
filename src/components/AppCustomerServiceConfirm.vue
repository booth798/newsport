<script setup>
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useAppStore } from '@/store/modules/app';
import BaseModal from '@/components/BaseModal.vue';
import iconDialogInfoUrl from '@/assets/images/common/icon_dialog_info.svg?url';

const { t } = useI18n();
const router = useRouter();
const appStore = useAppStore();
const { customerServiceConfirmOpen } = storeToRefs(appStore);

function close() {
  appStore.closeCustomerServiceConfirm();
}

function confirmGoService() {
  appStore.closeCustomerServiceConfirm();
  router.push('/service');
}
</script>

<template>
  <BaseModal
    :model-value="customerServiceConfirmOpen"
    :title="t('提示')"
    @update:model-value="close"
    :show-close="false"
  >
    <div class="app-service-dialog__body">
      <span class="app-service-dialog__info" aria-hidden="true">
        <img :src="iconDialogInfoUrl" width="20" height="20" alt="" />
      </span>
      <p>{{ t('是否要联系在线客服') }}</p>
    </div>
    <div class="app-service-dialog__actions">
      <button type="button" class="app-service-dialog__btn--cancel" @click="close">
        {{ t('取消') }}
      </button>
      <button type="button" class="app-service-dialog__btn--confirm" @click="confirmGoService">
        {{ t('确定') }}
      </button>
    </div>
  </BaseModal>
</template>

<style lang="scss" scoped>
@use '@/styles/tools.scss' as *;

.app-service-dialog__body {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 70px;
  border-radius: 12px;
  background: #fff;

  p {
    margin: 0;
    // 与登录确认弹窗文案一致：16px / Regular / var(--theme-text)
    color: var(--theme-text);
    font-size: 16px;
    font-weight: 400;
    line-height: 1.4;
  }
}

.app-service-dialog__info {
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

.app-service-dialog__actions {
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

.app-service-dialog__btn--cancel {
  border: 1px solid #fff;
  color: #fff;
}

.app-service-dialog__btn--confirm {
  background: #fff;
  color: var(--theme-primary);
}
</style>
