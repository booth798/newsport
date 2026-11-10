<script setup>
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { logoutApi } from '@/api/user';
import { useToast } from '@/hooks/useToast';
import { useAppStore } from '@/store/modules/app';
import { useUserStore } from '@/store/modules/user';
import BaseModal from '@/components/BaseModal.vue';
import iconDialogInfoUrl from '@/assets/images/common/icon_dialog_info.svg?url';

const { t } = useI18n();
const router = useRouter();
const toast = useToast();
const appStore = useAppStore();
const userStore = useUserStore();
const { logoutConfirmOpen } = storeToRefs(appStore);
const submitting = ref(false);

// 拦截公共弹窗的关闭事件，登出请求进行期间保持弹窗打开。
const logoutConfirmVisible = computed({
  get: () => logoutConfirmOpen.value,
  set: (visible) => {
    if (!visible) close();
  },
});

function close() {
  if (submitting.value) return;
  appStore.closeLogoutConfirm();
}

async function confirmLogout() {
  if (submitting.value) return;
  submitting.value = true;
  try {
    try {
      await logoutApi();
    } catch {
      // 后端登出失败时仍清理本地登录态，避免用户停留在失效会话。
    }
    userStore.clearWebLogin();
    toast.success(t('操作成功'));
    appStore.closeLogoutConfirm();
    router.push('/');
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <BaseModal v-model="logoutConfirmVisible" :title="t('提示')" :show-close="false">
    <div class="app-logout-dialog__body">
      <span class="app-logout-dialog__info" aria-hidden="true">
        <img :src="iconDialogInfoUrl" width="20" height="20" alt="" />
      </span>
      <p>{{ t('确定退出登录吗') }}</p>
    </div>
    <div class="app-logout-dialog__actions">
      <button type="button" class="app-logout-dialog__cancel" :disabled="submitting" @click="close">
        {{ t('取消') }}
      </button>
      <button type="button" class="btn--prompt" :disabled="submitting" @click="confirmLogout">
        {{ submitting ? t('加载中') : t('确定退出') }}
      </button>
    </div>
  </BaseModal>
</template>

<style lang="scss" scoped>
@use '@/styles/tools.scss' as *;

.app-logout-dialog__body {
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

.app-logout-dialog__info {
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

.app-logout-dialog__actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 10px;

  button {
    height: 44px;
    border: none;
    border-radius: 22px;
    font-size: 18px;
    font-weight: 400;
    cursor: pointer;

    &:disabled {
      cursor: default;
      opacity: 0.72;
    }
  }
}

.app-logout-dialog__cancel {
  background: #fff;
  color: var(--auxiliary-2);
}

</style>
