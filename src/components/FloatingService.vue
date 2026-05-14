<script setup>
import { onBeforeUnmount, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';

import iconDownloadAppActive from '@/assets/images/float/icon-download-app-active.svg';
import iconDownloadAppDefault from '@/assets/images/float/icon-download-app-default.svg';
import iconDownloadAppHover from '@/assets/images/float/icon-download-app-hover.svg';
import iconServiceActive from '@/assets/images/float/icon-service-active.svg';
import iconServiceDefault from '@/assets/images/float/icon-service-default.svg';
import iconServiceHover from '@/assets/images/float/icon-service-hover.svg';
import toolbarBg from '@/assets/images/float/toolbar-bg.svg';
import { registerCustomerServiceOpener } from '@/utils/customerService';

const { t } = useI18n();

function handleServiceOpen() {
  // TODO: 接入在线客服 SDK / 外链等
}

function handleDownloadApp() {
  // TODO: 替换为实际 App 下载页或应用商店链接
}

onMounted(() => {
  registerCustomerServiceOpener(handleServiceOpen);
});

onBeforeUnmount(() => {
  registerCustomerServiceOpener(null);
});
</script>

<template>
  <div class="floating-service">
    <div class="floating-service__panel">
      <img class="floating-service__bg" :src="toolbarBg" alt="" draggable="false" />
      <div class="floating-service__actions">
        <button
          type="button"
          class="floating-service__btn"
          :aria-label="t('悬浮服务下载APP')"
          @click="handleDownloadApp"
        >
          <span class="floating-service__icon-stack" aria-hidden="true">
            <img
              class="floating-service__icon floating-service__icon--default"
              :src="iconDownloadAppDefault"
              alt=""
              draggable="false"
            />
            <img
              class="floating-service__icon floating-service__icon--hover"
              :src="iconDownloadAppHover"
              alt=""
              draggable="false"
            />
            <img
              class="floating-service__icon floating-service__icon--active"
              :src="iconDownloadAppActive"
              alt=""
              draggable="false"
            />
          </span>
        </button>
        <div class="floating-service__divider" role="presentation" />
        <button
          type="button"
          class="floating-service__btn"
          :title="t('在线客服')"
          :aria-label="t('在线客服')"
          @click="handleServiceOpen"
        >
          <span class="floating-service__icon-stack" aria-hidden="true">
            <img
              class="floating-service__icon floating-service__icon--default"
              :src="iconServiceDefault"
              alt=""
              draggable="false"
            />
            <img
              class="floating-service__icon floating-service__icon--hover"
              :src="iconServiceHover"
              alt=""
              draggable="false"
            />
            <img
              class="floating-service__icon floating-service__icon--active"
              :src="iconServiceActive"
              alt=""
              draggable="false"
            />
          </span>
        </button>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/tools.scss' as *;

.floating-service {
  display: none;

  @include web-only {
    position: fixed;
    z-index: 100;
    right: 14px;
    bottom: 120px;
    display: block;
    filter: drop-shadow(8px 14px 24px rgba(21, 102, 210, 0.28));
  }

  &__panel {
    position: relative;
    width: 58px;
  }

  &__bg {
    display: block;
    width: 100%;
    height: auto;
    vertical-align: top;
    pointer-events: none;
    user-select: none;
  }

  &__actions {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 10px 0 12px;
    box-sizing: border-box;
  }

  &__btn {
    flex: 1 1 0;
    min-height: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    padding: 0;
    border: none;
    background: transparent;
    cursor: pointer;
    color: inherit;

    &:focus-visible {
      outline: 2px solid #fff;
      outline-offset: 2px;
    }
  }

  &__divider {
    flex-shrink: 0;
    width: 36px;
    height: 1px;
    margin: 2px 0;
    background: rgba(255, 255, 255, 0.85);
  }

  &__icon-stack {
    position: relative;
    width: 38px;
    height: 68px;
  }

  &__icon {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: contain;
    pointer-events: none;
    user-select: none;

    &--hover,
    &--active {
      opacity: 0;
    }
  }

  &__btn:hover &__icon--default {
    opacity: 0;
  }

  &__btn:hover &__icon--hover {
    opacity: 1;
  }

  &__btn:active &__icon--default,
  &__btn:active &__icon--hover {
    opacity: 0;
  }

  &__btn:active &__icon--active {
    opacity: 1;
  }
}
</style>
