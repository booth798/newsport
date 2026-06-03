<script setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  type: {
    type: String,
    default: '',
  },
  titleKey: {
    type: String,
    default: '提示',
  },
  subtitleKey: {
    type: String,
    default: '',
  },
});

const emit = defineEmits(['close']);
const { t } = useI18n();

const modalClass = computed(() => (props.type ? `profile-modal--${props.type}` : ''));
</script>

<template>
  <Teleport to="body">
    <Transition name="profile-modal-fade">
      <div v-if="visible" class="profile-modal-overlay" @click.self="emit('close')">
        <section class="profile-modal" :class="modalClass" role="dialog" aria-modal="true">
          <div class="profile-modal__header">
            <h2>{{ t(titleKey) }}</h2>
            <p v-if="subtitleKey">{{ t(subtitleKey) }}</p>
          </div>

          <div class="profile-modal__body">
            <slot />
          </div>
        </section>

        <button type="button" class="profile-modal-close" :aria-label="t('关闭')" @click="emit('close')">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M15 5L5 15M5 5l10 10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
          </svg>
        </button>
      </div>
    </Transition>
  </Teleport>
</template>

<style lang="scss">
@use '@/styles/tools.scss' as *;

.profile-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 1100;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.48);
  backdrop-filter: blur(1px);

  @include mobile-only {
    flex-direction: column;
    align-items: center;
    gap: 14px;
    padding: 80px $spacing-lg 40px;
    box-sizing: border-box;
    overflow-y: auto;
  }
}

.profile-modal {
  position: relative;
  box-sizing: border-box;
  overflow: visible;
  border: 1px solid rgba(255, 255, 255, 0.85);
  background:
    linear-gradient(90deg, rgba(255, 255, 255, 0.08) 0 1px, transparent 1px 12px),
    linear-gradient(135deg, #1478ff 0%, #3196ff 100%);
  box-shadow: 0 18px 38px rgba(3, 34, 81, 0.24);

  @include web-only {
    width: 400px;
    max-height: min(820px, calc(100vh - 96px));
    border-radius: 28px;
  }

  @include mobile-only {
    width: min(100%, 343px);
    max-height: calc(100vh - 168px);
    border-radius: $radius-lg;
  }
}

.profile-modal--logout {
  @include web-only {
    width: 343px;
  }
}

.profile-modal__header {
  min-height: 74px;
  padding: 26px 22px 8px;
  box-sizing: border-box;
  text-align: center;
  color: var(--auxiliary-1);
  background:
    radial-gradient(circle at 28% 18%, rgba(255, 255, 255, 0.08) 0 48px, transparent 49px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.09) 0 1px, transparent 1px 13px);

  h2 {
    margin: 0;
    font-size: $font-size-xl;
    font-weight: 700;
    line-height: 1.2;
  }

  p {
    margin: $spacing-xs 0 0;
    font-size: $font-size-md;
    line-height: 1.35;
    color: rgba(255, 255, 255, 0.82);
  }

  @include mobile-only {
    min-height: 72px;
    padding-top: 18px;
  }
}

.profile-modal__body {
  display: flex;
  flex-direction: column;
  gap: $spacing-md;
  padding: 0 $spacing-md $spacing-md;
  box-sizing: border-box;
  overflow-y: auto;

  @include web-only {
    max-height: calc(100vh - 188px);
  }

  @include mobile-only {
    max-height: calc(100vh - 250px);
  }
}

.profile-modal-card {
  box-sizing: border-box;
  border-radius: $radius-lg;
  background: var(--auxiliary-1);
}

.profile-modal-card--upload {
  padding: $spacing-xl $spacing-md $spacing-lg;
}

.profile-field-label {
  display: block;
  margin-bottom: $spacing-sm;
  color: rgba(11, 52, 98, 0.5);
  font-size: $font-size-base;
  line-height: 1.3;

  @include mobile-only {
    font-size: $font-size-md;
    margin-bottom: $spacing-xs;
  }
}

.profile-form-field {
  display: block;
  padding: $spacing-lg $spacing-md $spacing-md;
}

.profile-form-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: $spacing-lg $spacing-md;

  @include mobile-only {
    gap: 10px;
  }
}

.profile-form-card .profile-form-field {
  padding: 0;
}

.profile-modal-input {
  box-sizing: border-box;
  width: 100%;
  height: 48px;
  padding: 0 $spacing-lg;
  border: 1px solid var(--theme-divider);
  border-radius: $radius-md;
  outline: none;
  background: var(--auxiliary-1);
  color: var(--theme-text);
  font-size: $font-size-base;

  &:focus {
    border-color: var(--theme-primary);
    background: var(--surface-card);
  }

  &::placeholder {
    color: rgba(11, 52, 98, 0.42);
  }

  @include mobile-only {
    height: 42px;
  }
}

.profile-modal-select {
  appearance: none;
  cursor: pointer;
  background-image: url('@/assets/images/common/arrow_down_primary.svg');
  background-repeat: no-repeat;
  background-position: right 14px center;
  background-size: 12px 8px;
}

.profile-modal-submit {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 48px;
  border: 0;
  border-radius: $radius-pill;
  background: var(--auxiliary-1);
  color: var(--theme-primary);
  font-size: $font-size-lg;
  font-weight: 500;
  cursor: pointer;
}

.profile-modal-notice {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  min-height: 38px;
  padding: 0 $spacing-lg;
  border-radius: $radius-lg;
  background: rgba(251, 92, 13, 0.1);
  color: var(--auxiliary-3);
  font-size: $font-size-md;

  span {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 14px;
    height: 14px;
    border: 1px solid currentColor;
    border-radius: 50%;
    font-family: $font-family-num, $font-family-base;
    font-size: 10px;
    font-weight: 800;
    flex-shrink: 0;
  }

  p {
    margin: 0;
    line-height: 1.5;
    white-space: pre-line;
  }
}

.profile-modal-notice--stack {
  align-items: flex-start;
  padding: $spacing-md $spacing-lg;
  color: rgba(11, 52, 98, 0.55);

  strong {
    display: block;
    margin-bottom: 6px;
    color: var(--auxiliary-3);
    font-weight: 500;
  }
}

.profile-info-panel {
  padding: $spacing-lg;
}

.profile-info-row,
.profile-message-row {
  width: 100%;
  min-height: 64px;
  display: flex;
  align-items: center;
  padding: 0;
  border: 0;
  border-bottom: 1px solid var(--theme-divider);
  background: transparent;
  text-align: left;
  cursor: pointer;

  &:last-child {
    border-bottom: 0;
  }

  img {
    margin-left: auto;
    opacity: 0.65;
  }
}

.profile-info-row__icon,
.profile-message-row__icon {
  width: 34px;
  height: 34px;
  margin-right: $spacing-md;
  border-radius: 10px;
  flex-shrink: 0;
}

.profile-info-row__icon--wechat {
  background: #04c123;
}

.profile-info-row__icon--qq {
  background: #0b0b0b;
}

.profile-info-row__icon--email {
  background: var(--theme-primary);
}

.profile-info-row__icon--bank {
  background: #fb7c0d;
}

.profile-info-row__text,
.profile-message-row__text {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;

  strong {
    color: var(--theme-text);
    font-size: $font-size-md;
    font-weight: 700;
  }

  em {
    color: rgba(11, 52, 98, 0.45);
    font-size: $font-size-sm;
    font-style: normal;
  }
}

.profile-message-list {
  min-height: 306px;
  padding: $spacing-lg;
  background: var(--auxiliary-1);
}

.profile-message-row__icon {
  border-radius: 50%;
  background: #dce6f2;
  position: relative;

  &::after {
    content: '';
    position: absolute;
    left: 10px;
    top: 11px;
    width: 14px;
    height: 10px;
    border-radius: 3px;
    background: var(--auxiliary-1);
  }
}

.profile-modal-tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0;
  min-height: 48px;
  padding: $spacing-xs;
  border-radius: $radius-pill;
  background: var(--surface-card);

  button {
    border: 0;
    border-radius: $radius-pill;
    background: transparent;
    color: var(--theme-primary);
    font-size: $font-size-base;
    font-weight: 700;
    cursor: pointer;

    &.active {
      background: var(--theme-primary);
      color: var(--auxiliary-1);
      box-shadow: var(--shadow-primary-btn);
    }
  }
}

.profile-logout-card {
  padding: $spacing-2xl $spacing-xl;
  text-align: center;

  p {
    margin: 0 0 $spacing-xl;
    color: var(--theme-text);
    font-size: $font-size-base;
    font-weight: 600;
  }
}

.profile-logout-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: $spacing-md;
}

.profile-logout-btn {
  height: 44px;
  border: 0;
  border-radius: $radius-pill;
  font-size: $font-size-base;
  cursor: pointer;
}

.profile-logout-btn--cancel {
  background: var(--surface-card);
  color: var(--theme-text);
}

.profile-logout-btn--confirm {
  background: var(--auxiliary-2);
  color: var(--auxiliary-1);
}

.profile-modal-close {
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  padding: 0;
  border: 1px solid rgba(255, 255, 255, 0.78);
  border-radius: 50%;
  background: rgba(11, 52, 98, 0.24);
  color: var(--auxiliary-1);
  cursor: pointer;

  @include web-only {
    top: calc(50% - 300px);
    left: calc(50% + 166px);
  }

  @include mobile-only {
    position: static;
    flex: 0 0 auto;
    transform: none;
  }
}

.profile-modal-fade-enter-active,
.profile-modal-fade-leave-active {
  transition: opacity 0.2s;
}

.profile-modal-fade-enter-from,
.profile-modal-fade-leave-to {
  opacity: 0;
}
</style>
