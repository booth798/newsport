<script setup>
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { logoutApi } from '@/api/user';
import { useToast } from '@/hooks/useToast';
import { useAppStore } from '@/store/modules/app';
import { useUserStore } from '@/store/modules/user';
import bgLoginUrl from '@/assets/images/common/bg_login.svg?url';

const { t } = useI18n();
const router = useRouter();
const toast = useToast();
const appStore = useAppStore();
const userStore = useUserStore();
const { logoutConfirmOpen } = storeToRefs(appStore);
const submitting = ref(false);

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
  <Teleport to="body">
    <Transition name="app-logout-fade">
      <div v-if="logoutConfirmOpen" class="app-logout-overlay" @click.self="close">
        <section
          class="app-logout-dialog"
          :style="{ '--app-logout-bg': `url(${bgLoginUrl})` }"
          aria-modal="true"
          role="alertdialog"
        >
          <h2>{{ t('提示') }}</h2>
          <div class="app-logout-dialog__body">
            <span class="app-logout-dialog__info" aria-hidden="true">i</span>
            <p>{{ t('确定退出登录吗') }}</p>
          </div>
          <div class="app-logout-dialog__actions">
            <button type="button" class="app-logout-dialog__cancel" :disabled="submitting" @click="close">
              {{ t('取消') }}
            </button>
            <button type="button" class="app-logout-dialog__confirm" :disabled="submitting" @click="confirmLogout">
              {{ submitting ? t('加载中') : t('确定退出') }}
            </button>
          </div>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<style lang="scss" scoped>
@use '@/styles/tools.scss' as *;

.app-logout-overlay {
  position: fixed;
  inset: 0;
  z-index: 1200;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.58);
}

.app-logout-dialog {
  width: min(339px, calc(100vw - 34px));
  padding: 14px 12px 12px;
  box-sizing: border-box;
  border: 1px solid rgba(255, 255, 255, 0.7);
  border-radius: 12px;
  background:
    var(--app-logout-bg) center top / cover no-repeat,
    #2c7fff;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);

  h2 {
    margin: 0 0 12px;
    color: #fff;
    font-size: 18px;
    font-weight: 700;
    line-height: 1;
    text-align: center;
  }
}

.app-logout-dialog__body {
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

.app-logout-dialog__info {
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

.app-logout-dialog__actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 10px;

  button {
    height: 44px;
    border: none;
    border-radius: 22px;
    font-size: 16px;
    font-weight: 700;
    cursor: pointer;

    &:disabled {
      cursor: default;
      opacity: 0.72;
    }
  }
}

.app-logout-dialog__cancel {
  background: #fff;
  color: #ff2d2d;
}

.app-logout-dialog__confirm {
  background: #ff3f3f;
  color: #fff;
}

.app-logout-fade-enter-active,
.app-logout-fade-leave-active {
  transition: opacity 0.18s ease;
}

.app-logout-fade-enter-from,
.app-logout-fade-leave-to {
  opacity: 0;
}
</style>
