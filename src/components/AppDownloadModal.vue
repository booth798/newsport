<script setup>
/**
 * PC 下载 APP 大弹窗：并排同时展示安卓 / iOS 二维码。
 * 链接来自 SITE_CONFIG.appDownload。
 */
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import { getImageUrl } from '@/utils/common';
import { SITE_CONFIG } from '@/config/site';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { useModalLayer } from '@/hooks/useModalLayer';

const props = defineProps({
  modelValue: { type: Boolean, default: false },
});

const emit = defineEmits(['update:modelValue']);
const { t } = useI18n();

useBodyScrollLock(() => props.modelValue);
const { zIndex } = useModalLayer(() => props.modelValue);

const platforms = computed(() => [
  {
    key: 'android',
    label: t('安卓下载'),
    url: SITE_CONFIG.appDownload.android,
  },
  {
    key: 'ios',
    label: t('iOS下载'),
    url: SITE_CONFIG.appDownload.ios,
  },
]);

function close() {
  emit('update:modelValue', false);
}

function onBackdropClick() {
  close();
}

/** 根据下载链接生成二维码图片地址（大尺寸便于扫码） */
function qrSrc(url) {
  const data = encodeURIComponent(String(url || '').trim());
  return `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=12&color=0B3462&bgcolor=FFFFFF&data=${data}`;
}
</script>

<template>
  <Teleport to="body">
    <Transition name="app-dl-fade">
      <div
        v-if="modelValue"
        class="app-dl"
        role="dialog"
        aria-modal="true"
        :aria-label="t('下载APP')"
        :style="{ zIndex }"
      >
        <div class="app-dl__backdrop" aria-hidden="true" @click="onBackdropClick" />

        <div class="app-dl__panel-wrap">
          <button type="button" class="app-dl__close" :aria-label="t('关闭')" @click="close">
            <img :src="getImageUrl('common/modal_close_icon.svg')" alt="" width="34" height="34" />
          </button>

          <div class="app-dl__frame">
            <img
              class="app-dl__watermark"
              :src="getImageUrl('common/modal_opacity_logo.png')"
              alt=""
              aria-hidden="true"
            />

            <header class="app-dl__head">
              <h2 class="app-dl__title">{{ t('下载APP') }}</h2>
              <p class="app-dl__subtitle">{{ t('请使用手机扫描二维码下载') }}</p>
            </header>

            <div class="app-dl__body">
              <div
                v-for="item in platforms"
                :key="item.key"
                class="app-dl__card"
              >
                <div class="app-dl__qr-glow" aria-hidden="true" />
                <div class="app-dl__badge" :class="`app-dl__badge--${item.key}`">
                  {{ item.label }}
                </div>
                <div class="app-dl__qr-wrap">
                  <img
                    class="app-dl__qr"
                    :src="qrSrc(item.url)"
                    :alt="item.label"
                    width="260"
                    height="260"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style lang="scss" scoped>
@use '@/styles/tools.scss' as *;

.app-dl {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  box-sizing: border-box;
}

.app-dl__backdrop {
  position: absolute;
  inset: 0;
  background: rgba(var(--theme-text-rgb), 0.62);
  backdrop-filter: blur(6px);
}

.app-dl__panel-wrap {
  position: relative;
  z-index: 2;
  width: min(880px, calc(100vw - 64px));
}

.app-dl__close {
  position: absolute;
  top: -18px;
  right: 0;
  z-index: 3;
  width: 34px;
  height: 34px;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
  transform: translateY(-100%);

  img {
    display: block;
    width: 34px;
    height: 34px;
  }
}

.app-dl__frame {
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  padding: 32px 40px 40px;
  border-radius: 28px;
  border: 1px solid #fff;
  background: radial-gradient(120% 120% at 50% 100%, var(--theme-primary-end) 0%, var(--theme-primary) 55%, var(--theme-primary) 100%);
  box-shadow: 0 24px 64px rgba(var(--theme-text-rgb), 0.35);
  box-sizing: border-box;
}

.app-dl__watermark {
  position: absolute;
  left: 50%;
  top: 0;
  width: min(880px, 100%);
  transform: translateX(-50%);
  pointer-events: none;
  opacity: 0.5;
}

.app-dl__head {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  margin-bottom: 28px;
  text-align: center;
}

.app-dl__title {
  margin: 0;
  color: #fff;
  font-size: 30px;
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: 0.02em;
  text-shadow: 0 2px 8px rgba(var(--theme-text-rgb), 0.25);
}

.app-dl__subtitle {
  margin: 0;
  color: rgba(255, 255, 255, 0.92);
  font-size: 15px;
  font-weight: 400;
  line-height: 1.4;
}

.app-dl__body {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 24px;
}

.app-dl__card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  padding: 28px 24px 32px;
  border-radius: 24px;
  background: #fff;
  box-shadow: 0 16px 40px rgba(var(--theme-text-rgb), 0.16);
  box-sizing: border-box;
}

.app-dl__badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 120px;
  height: 36px;
  padding: 0 18px;
  border-radius: 999px;
  font-size: 15px;
  font-weight: 700;
  line-height: 1;
  color: #fff;

  &--android {
    background: linear-gradient(135deg, var(--theme-primary) 0%, var(--theme-primary) 100%);
  }

  &--ios {
    background: linear-gradient(135deg, var(--theme-text) 0%, var(--theme-text) 100%);
  }
}

.app-dl__qr-glow {
  position: absolute;
  top: 72px;
  left: 50%;
  width: 240px;
  height: 240px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(var(--theme-primary-rgb), 0.16) 0%, rgba(var(--theme-primary-rgb), 0) 70%);
  transform: translateX(-50%);
  pointer-events: none;
}

.app-dl__qr-wrap {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 288px;
  height: 288px;
  padding: 14px;
  border-radius: 20px;
  border: 1px solid rgba(var(--theme-primary-rgb), 0.18);
  background: linear-gradient(180deg, var(--surface-tint) 0%, #ffffff 100%);
  box-sizing: border-box;
}

.app-dl__qr {
  display: block;
  width: 260px;
  height: 260px;
  object-fit: contain;
}

.app-dl-fade-enter-active,
.app-dl-fade-leave-active {
  transition: opacity 0.2s ease;

  .app-dl__panel-wrap {
    transition: transform 0.22s ease, opacity 0.22s ease;
  }
}

.app-dl-fade-enter-from,
.app-dl-fade-leave-to {
  opacity: 0;

  .app-dl__panel-wrap {
    opacity: 0;
    transform: translateY(12px) scale(0.98);
  }
}
</style>
