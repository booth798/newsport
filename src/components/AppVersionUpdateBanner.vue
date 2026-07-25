<script setup>
/**
 * 版本更新提示：底部浮层，不锁滚动、不全屏遮罩，避免打断进行中的操作。
 * 视觉对齐站点主色 / 圆角 / 卡片阴影体系。
 */
import { storeToRefs } from 'pinia';
import { useI18n } from 'vue-i18n';

import { useAppStore } from '@/store/modules/app';
import { useAppVersionCheck } from '@/hooks/useAppVersionCheck';

const { t } = useI18n();
const appStore = useAppStore();
const { isMobile } = storeToRefs(appStore);

const { updateAvailable, snooze, refreshNow } = useAppVersionCheck();
</script>

<template>
  <Teleport to="body">
    <Transition name="version-update">
      <div
        v-if="updateAvailable"
        class="version-update"
        :class="{ 'version-update--mobile': isMobile }"
        role="alertdialog"
        aria-modal="false"
        :aria-label="t('发现新版本')"
      >
        <div class="version-update__card">
          <div class="version-update__glow" aria-hidden="true" />
          <div class="version-update__icon" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M18.5 11a7.5 7.5 0 1 1-2.2-5.3"
                stroke="#fff"
                stroke-width="1.8"
                stroke-linecap="round"
              />
              <path
                d="M18.5 4.5v4.2h-4.2"
                stroke="#fff"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </div>

          <div class="version-update__copy">
            <h3 class="version-update__title">{{ t('发现新版本') }}</h3>
            <p class="version-update__desc">{{ t('检测到版本更新，请刷新网页以获得最新体验') }}</p>
          </div>

          <div class="version-update__actions">
            <button type="button" class="version-update__btn version-update__btn--ghost" @click="snooze">
              {{ t('稍后') }}
            </button>
            <button type="button" class="version-update__btn version-update__btn--primary" @click="refreshNow">
              {{ t('立即刷新') }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style lang="scss" scoped>
@use '@/styles/tools.scss' as *;

.version-update {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 28px;
  z-index: 10050;
  display: flex;
  justify-content: center;
  padding: 0 20px;
  pointer-events: none;

  &--mobile {
    bottom: calc(#{$mobile-tab-bar-offset} + env(safe-area-inset-bottom, 0px) + 12px);
  }
}

.version-update__card {
  pointer-events: auto;
  position: relative;
  overflow: hidden;
  display: grid;
  grid-template-columns: auto 1fr;
  grid-template-areas:
    'icon copy'
    'actions actions';
  gap: 12px 14px;
  width: min(420px, 100%);
  padding: 16px 16px 14px;
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.85);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.96) 0%, rgba(234, 241, 249, 0.96) 100%);
  box-shadow:
    0 12px 32px rgba(21, 58, 119, 0.18),
    0 2px 8px rgba(21, 58, 119, 0.08);
  backdrop-filter: blur(12px);

  @include web-only {
    grid-template-columns: auto 1fr auto;
    grid-template-areas: 'icon copy actions';
    align-items: center;
    width: min(560px, 100%);
    padding: 16px 18px;
    gap: 14px 16px;
  }
}

.version-update__glow {
  position: absolute;
  top: -48px;
  right: -36px;
  width: 140px;
  height: 140px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(28, 123, 255, 0.18) 0%, rgba(28, 123, 255, 0) 70%);
  pointer-events: none;
}

.version-update__icon {
  grid-area: icon;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 14px;
  background: linear-gradient(145deg, #3b8dff 0%, #1c7bff 55%, #0f64db 100%);
  box-shadow: 0 8px 16px rgba(28, 123, 255, 0.28);
  flex-shrink: 0;
}

.version-update__copy {
  grid-area: copy;
  min-width: 0;
}

.version-update__title {
  margin: 0 0 4px;
  color: #0b3462;
  font-size: 16px;
  font-weight: 600;
  line-height: 1.3;
}

.version-update__desc {
  margin: 0;
  color: rgba(11, 52, 98, 0.65);
  font-size: 13px;
  font-weight: 400;
  line-height: 1.45;
}

.version-update__actions {
  grid-area: actions;
  display: grid;
  grid-template-columns: 1fr 1.2fr;
  gap: 10px;

  @include web-only {
    display: flex;
    align-items: center;
    gap: 10px;
  }
}

.version-update__btn {
  height: 40px;
  padding: 0 16px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease,
    background 0.18s ease,
    border-color 0.18s ease;

  &:active {
    transform: scale(0.98);
  }

  &--ghost {
    border: 1px solid rgba(28, 123, 255, 0.28);
    background: rgba(255, 255, 255, 0.72);
    color: #1c7bff;

    &:hover {
      border-color: rgba(28, 123, 255, 0.45);
      background: #fff;
    }
  }

  &--primary {
    border: 0;
    background: linear-gradient(135deg, #3b8dff 0%, #1c7bff 100%);
    color: #fff;
    box-shadow: 0 6px 14px rgba(28, 123, 255, 0.28);

    &:hover {
      box-shadow: 0 8px 18px rgba(28, 123, 255, 0.34);
    }
  }

  @include web-only {
    min-width: 88px;
  }
}

.version-update-enter-active,
.version-update-leave-active {
  transition:
    opacity 0.28s ease,
    transform 0.32s cubic-bezier(0.22, 1, 0.36, 1);
}

.version-update-enter-from,
.version-update-leave-to {
  opacity: 0;
  transform: translateY(18px) scale(0.98);
}
</style>
