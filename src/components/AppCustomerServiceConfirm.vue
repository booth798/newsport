<script setup>
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useAppStore } from '@/store/modules/app';
import bgLoginUrl from '@/assets/images/common/bg_login.svg?url';

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
  <Teleport to="body">
    <Transition name="app-service-fade">
      <div v-if="customerServiceConfirmOpen" class="app-service-mask" @click.self="close">
        <section
          class="app-service-dialog"
          :style="{ '--app-service-bg': `url(${bgLoginUrl})` }"
          aria-modal="true"
          role="alertdialog"
        >
          <h2 class="app-service-dialog__title">{{ t('提示') }}</h2>
          <div class="app-service-dialog__body">
            <span class="app-service-dialog__info" aria-hidden="true">i</span>
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
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<style lang="scss" scoped>
@use '@/styles/tools.scss' as *;

.app-service-mask {
  position: fixed;
  inset: 0;
  z-index: 10001;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.58);
}

.app-service-dialog {
  width: min(339px, calc(100vw - 34px));
  padding: 14px 12px 12px;
  box-sizing: border-box;
  border: 1px solid rgba(255, 255, 255, 0.7);
  border-radius: 12px;
  background:
    var(--app-service-bg) center top / cover no-repeat,
    #2c7fff;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);

  &__title {
    margin: 0 0 12px;
    color: #fff;
    font-size: 18px;
    font-weight: 700;
    line-height: 1;
    text-align: center;
  }

  &__body {
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

  &__info {
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

  &__actions {
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

  &__btn--cancel {
    border: 1px solid #FFFFFF;
    color: #FFFFFF;
  }

  &__btn--confirm {
    background: #FFFFFF;
    color: var(--theme-primary);
  }
}

.app-service-fade-enter-active,
.app-service-fade-leave-active {
  transition: opacity 0.18s ease;
}

.app-service-fade-enter-from,
.app-service-fade-leave-to {
  opacity: 0;
}
</style>
