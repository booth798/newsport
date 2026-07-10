<script setup>
import { useI18n } from 'vue-i18n';
import { getImageUrl } from '@/utils/common'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  // <slot name="header" /> 支持自定义头部内容
  title: { type: String, default: '' }, // 标题 不传则不显示标题
  description: { type: String, default: '' }, // 描述 不传则不显示描述
  buttonText: { type: String, default: '' }, // 按钮文本 不传则不显示按钮
  actionDisabled: { type: Boolean, default: false }, // 按钮是否禁用
});

const emit = defineEmits(['update:modelValue', 'confirm']);
const { t } = useI18n();

function close() { emit('update:modelValue', false); }
function confirm() { emit('confirm'); }
</script>

<template>
  <Teleport to="body">
    <Transition name="base-modal-fade">
      <div v-if="props.modelValue" class="base-modal" role="dialog" aria-modal="true" :aria-label="props.title">
        <!-- 遮罩层 -->
        <div class="base-modal__backdrop" aria-hidden="true" @click="close" />
        <div class="base-modal__panel-wrap">
          <img class="base-modal__close-icon" :src="getImageUrl('common/modal_close_icon.svg')" :aria-label="t('关闭')" @click="close" >
          <div class="base-modal__frame">
            <img class="base-modal__opacity-logo" :src="getImageUrl('common/modal_opacity_logo.svg')" alt="">
            <div class="base-modal__body">
              <template v-if="$slots.header">
                <slot name="header" />
              </template>
              <template v-else>
                <header v-if="props.title || props.description" class="base-modal__head">
                  <h2 v-if="props.title" class="base-modal__title">{{ props.title }}</h2>
                  <p v-if="props.description" class="base-modal__subtitle">{{ props.description }}</p>
                </header>
              </template>
              <div class="base-modal__content">
                <slot />
              </div>
            </div>
            <button v-if="props.buttonText" type="button" class="btn btn--default-1 base-modal__action"
              :disabled="props.actionDisabled" @click="confirm">
              {{ props.buttonText }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style lang="scss" scoped>
@use '@/styles/tools.scss' as *;

.base-modal {
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
    max-height: calc(100dvh - 56px);
    flex-shrink: 0;

    @include mobile-only {
      max-width: 342px;
    }
    @include web-only {
      max-width: 400px;
      max-height: min(90vh, 820px);
    }
  }
  .base-modal__close-icon{ 
    position: absolute;
    cursor: pointer;
    @include mobile-only {
      width: 24px;
      height: 24px;
      left: 50%;
      bottom: -30px;
      transform: translate(-50%, 100%);
    }

    @include web-only {
      width: 34px;
      height: 34px;
      right: 0;
      top: -18px;
      transform: translateY(-100%);
    }
  }

  &__frame {
    position: relative;
    z-index: 1;
    max-height: calc(100dvh - 56px);
    box-sizing: border-box;
    border-radius: 24px;
    border: 1px solid #FFFFFF;
    background: radial-gradient(100% 100% at 50% 100%, #68B3FD 0%, #0D6CFB 100%);
    padding: 0 12px 12px;
    display: flex;
    flex-direction: column;
    overflow: hidden;


    .base-modal__opacity-logo {
      position: absolute;
      left: 50%;
      transform: translateX(-50%);
      @include mobile-only {
        width: 342px;
      }

      @include web-only {
        width: 400px;
      }

    }
  }

  &__body {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  &__head {
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 80px;
  }

  &__title {
    color: #fff;
    @include mobile-only {
      font-size: 18px;
      font-weight: 500;
    }
    @include web-only {
      font-size: 24px;
      font-weight: 700;
    }
  }

  &__subtitle {
    margin: 0;
    line-height: 1.3;
    color: rgba(255, 255, 255, .88);
    margin-top: 5px;
    @include mobile-only {
      font-size: 12px;
      font-weight: 350;
    }
    @include web-only {
      font-size: 14px;
      font-weight: 350;
    }
  }

  &__content {
    min-height: 0;
  }

  &__action {
    position: relative;
    z-index: 1;
    width: 100%;
    flex-shrink: 0;
    font-size: 18px;
    margin-top: 10px;

    @include mobile-only {
      height: 44px;
    }
    @include web-only {
      height: 48px;
    }
  }
}

.base-modal-fade-enter-active,
.base-modal-fade-leave-active {
  transition: opacity .25s ease;
}

.base-modal-fade-enter-from,
.base-modal-fade-leave-to {
  opacity: 0;
}
</style>
