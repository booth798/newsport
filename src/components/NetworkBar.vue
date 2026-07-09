<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const visible = ref(false);
let hideTimer = null;

function onNetworkWarn() {
  visible.value = true;
  clearTimeout(hideTimer);
  hideTimer = setTimeout(() => {
    visible.value = false;
  }, 5000);
}

function onNetworkRecover() {
  visible.value = false;
  clearTimeout(hideTimer);
}

function dismiss() {
  visible.value = false;
  clearTimeout(hideTimer);
}

onMounted(() => {
  window.addEventListener('mysport:network-warn', onNetworkWarn);
  window.addEventListener('mysport:network-recover', onNetworkRecover);
});

onBeforeUnmount(() => {
  window.removeEventListener('mysport:network-warn', onNetworkWarn);
  window.removeEventListener('mysport:network-recover', onNetworkRecover);
  clearTimeout(hideTimer);
});
</script>

<template>
  <Teleport to="body">
    <Transition name="network-bar-slide">
      <div v-if="visible" class="network-bar" role="alert">
        <div class="network-bar__inner">
          <svg class="network-bar__icon" width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M8 1.33334C4.31867 1.33334 1.33333 4.31868 1.33333 8.00001C1.33333 11.6813 4.31867 14.6667 8 14.6667C11.6813 14.6667 14.6667 11.6813 14.6667 8.00001C14.6667 4.31868 11.6813 1.33334 8 1.33334ZM8 4.33334C8.36819 4.33334 8.66667 4.63181 8.66667 5.00001V8.66668C8.66667 9.03487 8.36819 9.33334 8 9.33334C7.63181 9.33334 7.33333 9.03487 7.33333 8.66668V5.00001C7.33333 4.63181 7.63181 4.33334 8 4.33334ZM8 10.3333C7.63181 10.3333 7.33333 10.6318 7.33333 11C7.33333 11.3682 7.63181 11.6667 8 11.6667C8.36819 11.6667 8.66667 11.3682 8.66667 11C8.66667 10.6318 8.36819 10.3333 8 10.3333Z" fill="currentColor"/>
          </svg>
          <span class="network-bar__text">{{ t('网络不稳定，请检查网络连接') }}</span>
          <button type="button" class="network-bar__close" :aria-label="t('关闭')" @click="dismiss">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M9 3L3 9M3 3l6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style lang="scss" scoped>
.network-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 10001;
  display: flex;
  justify-content: center;
  padding: 0 16px;
  pointer-events: none;

  &__inner {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    max-width: 600px;
    padding: 10px 16px;
    margin-top: 8px;
    background: #fff3e0;
    border: 1px solid #ffcc02;
    border-radius: 10px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
    pointer-events: auto;
  }

  &__icon {
    flex-shrink: 0;
    color: #f59e0b;
  }

  &__text {
    flex: 1;
    font-size: 13px;
    font-weight: 500;
    color: #92400e;
    line-height: 1.4;
  }

  &__close {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    padding: 0;
    border: 0;
    border-radius: 50%;
    background: transparent;
    color: #92400e;
    cursor: pointer;
    transition: background 0.2s;

    &:hover,
    &:active {
      background: rgba(0, 0, 0, 0.06);
    }
  }
}

.network-bar-slide-enter-active,
.network-bar-slide-leave-active {
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.network-bar-slide-enter-from,
.network-bar-slide-leave-to {
  opacity: 0;
  transform: translateY(-100%);
}
</style>
