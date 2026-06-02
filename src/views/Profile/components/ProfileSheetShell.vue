<script setup>
import { useI18n } from 'vue-i18n';

defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  title: {
    type: String,
    default: '',
  },
  subtitle: {
    type: String,
    default: '',
  },
  ariaLabel: {
    type: String,
    default: '',
  },
});

const emit = defineEmits(['update:modelValue']);

const { t } = useI18n();

function close() {
  emit('update:modelValue', false);
}
</script>

<template>
  <Teleport to="body">
    <Transition name="profile-sheet-fade">
      <div
        v-if="modelValue"
        class="profile-sheet"
        role="dialog"
        aria-modal="true"
        :aria-label="ariaLabel || title"
      >
        <div class="profile-sheet__backdrop" aria-hidden="true" @click="close" />

        <div class="profile-sheet__panel-wrap">
          <button
            type="button"
            class="profile-sheet__close norem"
            :aria-label="t('关闭')"
            @click="close"
          >
            <span aria-hidden="true">×</span>
          </button>

          <div class="profile-sheet__frame">
            <div class="profile-sheet__watermark" aria-hidden="true">UNIBET</div>

            <div class="profile-sheet__body">
              <div v-if="title || subtitle" class="profile-sheet__head">
                <h2 v-if="title" class="profile-sheet__title">{{ title }}</h2>
                <p v-if="subtitle" class="profile-sheet__subtitle">{{ subtitle }}</p>
              </div>

              <slot />
            </div>

            <div v-if="$slots.footer" class="profile-sheet__footer">
              <slot name="footer" />
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style lang="scss" scoped>
@use '@/styles/tools.scss' as *;

.profile-sheet {
  position: fixed;
  inset: 0;
  z-index: 1200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: calc(44px + env(safe-area-inset-top, 0px)) 12px calc(12px + env(safe-area-inset-bottom, 0px));
  box-sizing: border-box;
  overflow: hidden;

  @include web-only {
    padding: 24px;
  }

  &__backdrop {
    position: absolute;
    inset: 0;
    background: rgba(11, 52, 98, 0.55);
    backdrop-filter: blur(4px);
  }

  &__panel-wrap {
    position: relative;
    z-index: 2;
    display: flex;
    flex-direction: column;
    width: 100%;
    max-width: 420px;
    max-height: calc(100vh - 56px);
    flex-shrink: 0;
    overflow: hidden;

    @include web-only {
      max-width: 440px;
      max-height: min(90vh, 820px);
    }
  }

  &__close {
    position: absolute;
    top: 0;
    right: 12px;
    z-index: 3;
    width: 32px;
    height: 32px;
    padding: 0;
    border: 1.5px solid rgba(255, 255, 255, 0.95);
    border-radius: 50%;
    background: transparent;
    color: #fff;
    font-size: 20px;
    line-height: 1;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transform: translateY(calc(-100% - 10px));
    transition:
      background 0.2s ease,
      border-color 0.2s ease;

    &:hover {
      background: rgba(255, 255, 255, 0.12);
      border-color: #fff;
    }

    &:focus-visible {
      outline: 2px solid rgba(255, 255, 255, 0.6);
      outline-offset: 2px;
    }

    @include mobile-only {
      &.norem {
        width: 28px;
        height: 28px;
        right: 10px;
        border-width: 1px;
        font-size: 17px;
        transform: translateY(calc(-100% - 8px));
      }
    }

    @include web-only {
      right: 8px;
      transform: translateY(calc(-100% - 12px));
    }
  }

  &__frame {
    position: relative;
    z-index: 1;
    width: 100%;
    max-height: calc(100vh - 56px);
    box-sizing: border-box;
    border-radius: 24px;
    border: 0.8px solid rgba(214, 224, 235, 1);
    background: radial-gradient(100% 100% at 50% 100%, #68b3fd 0%, #0d6cfb 100%);
    box-shadow: 0 12px 40px rgba(21, 58, 118, 0.28);
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    overflow: hidden;

    @include web-only {
      max-height: min(90vh, 820px);
    }
  }

  &__footer {
    position: relative;
    z-index: 1;
    flex-shrink: 0;
  }

  &__watermark {
    position: absolute;
    left: 50%;
    top: 36px;
    transform: translate(-50%, -50%);
    z-index: 0;
    pointer-events: none;
    white-space: nowrap;
    font-family: $font-family-num, $font-family-base;
    font-size: clamp(56px, 20vw, 96px);
    font-weight: 900;
    line-height: 1;
    letter-spacing: 0.06em;
    color: rgba(232, 244, 255, 0.38);
    text-transform: uppercase;
    user-select: none;
  }

  &__body {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-height: 0;
    overflow-y: auto;
  }

  :slotted(*) {
    position: relative;
    z-index: 1;
  }

  &__head {
    padding: 8px 8px 4px;
    flex-shrink: 0;
  }

  &__title {
    margin: 0 0 4px;
    font-size: 20px;
    font-weight: 700;
    line-height: 1.2;
    color: #fff;
  }

  &__subtitle {
    margin: 0;
    font-size: 14px;
    line-height: 1.3;
    color: rgba(255, 255, 255, 0.88);
  }
}

.profile-sheet-fade-enter-active,
.profile-sheet-fade-leave-active {
  transition: opacity 0.25s ease;

  .profile-sheet__panel-wrap {
    transition: transform 0.3s cubic-bezier(0.34, 1.2, 0.64, 1);
  }
}

.profile-sheet-fade-enter-from,
.profile-sheet-fade-leave-to {
  opacity: 0;

  .profile-sheet__panel-wrap {
    transform: scale(0.95) translateY(16px);
  }
}
</style>
