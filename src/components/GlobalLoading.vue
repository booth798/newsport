<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

// 显隐由 request 层统一合并事件，组件只跟布尔态，避免二次计数导致闪烁
const visible = ref(false);

function onShow() {
  visible.value = true;
}

function onHide() {
  visible.value = false;
}

onMounted(() => {
  window.addEventListener('mysport:loading-show', onShow);
  window.addEventListener('mysport:loading-hide', onHide);
});

onBeforeUnmount(() => {
  window.removeEventListener('mysport:loading-show', onShow);
  window.removeEventListener('mysport:loading-hide', onHide);
});
</script>

<template>
  <Teleport to="body">
    <Transition name="loading-fade">
      <div v-if="visible" class="global-loading" aria-busy="true" role="status">
        <div class="global-loading__card">
          <div class="global-loading__spinner">
            <svg
              class="global-loading__icon"
              width="30"
              height="30"
              viewBox="0 0 30 30"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M15 1.875C22.248 1.875 28.125 7.75195 28.125 15C28.125 22.248 22.248 28.125 15 28.125C7.75195 28.125 1.875 22.248 1.875 15C1.875 7.75195 7.75195 1.875 15 1.875ZM15 3.04688C13.3858 3.04688 11.8215 3.36334 10.3479 3.98438C8.92407 4.58789 7.64648 5.44922 6.54785 6.54785C5.44922 7.64648 4.58496 8.92407 3.98438 10.3479C3.36334 11.8215 3.04688 13.3858 3.04688 15C3.04688 16.6142 3.36041 18.1785 3.98438 19.6521C4.58789 21.0759 5.44922 22.3535 6.54785 23.4521C7.64648 24.5508 8.92407 25.415 10.3479 26.0156C11.8215 26.6367 13.3858 26.9531 15 26.9531C16.6142 26.9531 18.1785 26.6396 19.6521 26.0156C21.0759 25.4121 22.3535 24.5508 23.4521 23.4521C24.5508 22.3535 25.415 21.0759 26.0156 19.6521C26.6367 18.1785 26.9531 16.6142 26.9531 15C26.9531 13.3858 26.6396 11.8215 26.0156 10.3479C25.4121 8.92407 24.5508 7.64648 23.4521 6.54785C22.3535 5.44922 21.0759 4.58496 19.6521 3.98438C18.1785 3.36334 16.6142 3.04688 15 3.04688ZM15 5.625C20.1752 5.62515 24.375 9.8248 24.375 15C24.375 20.1752 20.1752 24.3748 15 24.375C9.82469 24.375 5.625 20.1753 5.625 15C5.62501 9.8247 9.8247 5.625 15 5.625ZM15.0012 6.33667C13.9881 6.33667 13.0118 6.50676 12.1143 6.84326L14.7766 8.78052V11.6943L11.9275 13.7659L9.06006 12.8076L8.08105 9.7876C6.99306 11.2326 6.33676 13.0518 6.33667 15V15.2075L9.03687 13.2385L11.7688 14.1479L12.8906 17.6086L10.8362 20.2917H8.13599C9.16957 21.6003 10.5566 22.6144 12.1509 23.1787L11.2537 20.4224L13.2544 17.8125H16.9006L18.5706 20.2405L17.5879 23.2703C19.4272 22.6888 21.0018 21.5254 22.0898 19.9683H18.8855L17.1472 17.4414L18.1873 14.2249L21.2024 13.2886L23.6646 15.0757V15C23.6645 13.1065 23.0658 11.3623 22.0325 9.95483L21.084 12.8882L18.1165 13.8123L15.2075 11.6821V8.79395L17.8882 6.84326C16.9908 6.52373 16.0142 6.33679 15.0012 6.33667Z"
                fill="var(--theme-primary)"
              />
            </svg>
          </div>
          <span class="global-loading__text">{{ t('正在加载') }}...</span>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style lang="scss" scoped>
.global-loading {
  position: fixed;
  inset: 0;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.55);
  backdrop-filter: blur(2px);

  &__card {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 100px;
    height: 96px;
    gap: 8px;
    padding: 10px;
    background: #ffffff;
    border-radius: 16px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  }

  &__spinner {
    width: 30px;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: spin-ball 1.2s linear infinite;
  }

  &__icon {
    width: 30px;
    height: 30px;
  }

  &__text {
    font-size: 12px;
    font-weight: 500;
    color: var(--theme-primary);
    letter-spacing: 0.3px;
  }
}

@keyframes spin-ball {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.loading-fade-enter-active,
.loading-fade-leave-active {
  transition: opacity 0.25s ease;
}

.loading-fade-enter-from,
.loading-fade-leave-to {
  opacity: 0;
}
</style>
