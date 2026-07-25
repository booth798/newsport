<script setup>
/**
 * 全局弱提示：
 * - H5：对齐安卓 ToastHelper.showCenter，屏幕垂直水平居中
 * - PC：保持顶部彩色提示，暂不调整
 */
import { ref, computed } from 'vue';

const toasts = ref([]);
let _id = 0;

function show(message, { type = 'info', duration = 3000 } = {}) {
  const id = ++_id;
  toasts.value.push({ id, message, type });
  setTimeout(() => {
    toasts.value = toasts.value.filter((t) => t.id !== id);
  }, duration);
}

const visibleToasts = computed(() => toasts.value.slice(-5));

defineExpose({ show });
</script>

<template>
  <Teleport to="body">
    <TransitionGroup name="toast" tag="div" class="global-toast-stack" aria-live="polite">
      <div
        v-for="item in visibleToasts"
        :key="item.id"
        class="global-toast"
        :class="`global-toast--${item.type}`"
      >
        <span class="global-toast__icon" aria-hidden="true">
          <template v-if="item.type === 'success'">✓</template>
          <template v-else-if="item.type === 'error'">✕</template>
          <template v-else>ℹ</template>
        </span>
        <span class="global-toast__text">{{ item.message }}</span>
      </div>
    </TransitionGroup>
  </Teleport>
</template>

<style lang="scss" scoped>
@use '@/styles/tools.scss' as *;

.global-toast-stack {
  position: fixed;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  pointer-events: none;

  // PC：顶部堆叠，样式保持原样
  @include web-only {
    top: 80px;
    left: 50%;
    transform: translateX(-50%);
  }

  // H5：对齐安卓 Gravity.CENTER，整屏垂直水平居中
  @include mobile-only {
    inset: 0;
    justify-content: center;
    transform: none;
    padding: 0 24px;
    box-sizing: border-box;
  }
}

.global-toast {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  pointer-events: auto;
  white-space: nowrap;
  max-width: 100%;
  box-sizing: border-box;

  @include web-only {
    padding: 10px 20px;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 500;
    line-height: 1.4;
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12);

    &--success {
      background: #ecfdf5;
      color: #16a34a;
      border: 1px solid rgba(22, 163, 106, 0.2);
    }

    &--error {
      background: #fef2f2;
      color: #dc2626;
      border: 1px solid rgba(220, 38, 38, 0.2);
    }

    &--info {
      background: #eff6ff;
      color: #2563eb;
      border: 1px solid rgba(37, 99, 235, 0.2);
    }

    .global-toast__icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      font-size: 12px;
      flex-shrink: 0;
    }

    &--success .global-toast__icon {
      background: #16a34a;
      color: #fff;
    }

    &--error .global-toast__icon {
      background: #dc2626;
      color: #fff;
    }

    &--info .global-toast__icon {
      background: #2563eb;
      color: #fff;
    }
  }

  // H5：弱提示胶囊，宽度随文案自适应
  @include mobile-only {
    height: 36px;
    min-height: 36px;
    width: auto;
    padding: 0 12px;
    border: none;
    border-radius: 8px;
    background: #00000080;
    color: #fff;
    box-shadow: none;
    font-size: 13px;
    font-weight: 400;
    line-height: 1.2;
    white-space: normal;
    text-align: center;

    // success / error / info 统一为安卓弱提示样式
    &--success,
    &--error,
    &--info {
      background: #00000080;
      color: #fff;
      border: none;
    }

    .global-toast__icon {
      display: none;
    }

    .global-toast__text {
      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
      overflow: hidden;
      word-break: break-word;
    }
  }
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

@include web-only {
  .toast-enter-from {
    opacity: 0;
    transform: translateY(-12px);
  }

  .toast-leave-to {
    opacity: 0;
    transform: translateY(-8px) scale(0.95);
  }
}

@include mobile-only {
  .toast-enter-from,
  .toast-leave-to {
    opacity: 0;
    transform: scale(0.96);
  }
}
</style>
