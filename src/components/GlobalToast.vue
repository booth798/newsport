<script setup>
import { ref, computed } from 'vue';

const toasts = ref([]);
let _id = 0;

function show(message, { type = 'info', duration = 2500 } = {}) {
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
.global-toast-stack {
  position: fixed;
  top: 80px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  pointer-events: none;
}

.global-toast {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  line-height: 1.4;
  white-space: nowrap;
  pointer-events: auto;
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

  &__icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    font-size: 12px;
    flex-shrink: 0;
  }

  &--success &__icon {
    background: #16a34a;
    color: #fff;
  }

  &--error &__icon {
    background: #dc2626;
    color: #fff;
  }

  &--info &__icon {
    background: #2563eb;
    color: #fff;
  }
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from {
  opacity: 0;
  transform: translateY(-12px);
}

.toast-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(0.95);
}
</style>
