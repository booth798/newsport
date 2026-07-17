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
const { forceLogoutAlertOpen } = storeToRefs(appStore);

function confirm() {
  appStore.closeForceLogoutAlert();
  router.replace('/');
  appStore.openLoginModal();
}
</script>

<template>
  <BaseModal
    :model-value="forceLogoutAlertOpen"
    :title="t('提示')"
    :show-close="false"
    :click-mask-to-close="false"
    @update:model-value="confirm"
  >
    <div class="force-logout-dialog__body">
      <span class="force-logout-dialog__info" aria-hidden="true">
        <img :src="iconDialogInfoUrl" width="20" height="20" alt="" />
      </span>
      <p>{{ t('您的账号已在其他设备登录，本次登录已下线') }}</p>
    </div>
    <div class="force-logout-dialog__actions">
      <button type="button" class="force-logout-dialog__btn" @click="confirm">
        {{ t('知道了') }}
      </button>
    </div>
  </BaseModal>
</template>

<style lang="scss" scoped>
@use '@/styles/tools.scss' as *;

.force-logout-dialog__body {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 70px;
  border-radius: 12px;
  background: #fff;

  p {
    margin: 0;
    // 与登录确认弹窗文案一致：16px / Regular / #0B3462
    color: #0b3462;
    font-size: 16px;
    font-weight: 400;
    line-height: 1.4;
  }
}

.force-logout-dialog__info {
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

.force-logout-dialog__actions {
  display: flex;
  justify-content: center;
  margin-top: 10px;
}

.force-logout-dialog__btn {
  width: 50%;
  height: 44px;
  border: none;
  border-radius: 22px;
  background: #FFFFFF;
  color: #1C7BFF;
  font-size: 18px;
  font-weight: 400;
  cursor: pointer;
}
</style>
