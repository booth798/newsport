<script setup>
/**
 * PC 下载 APP 弹窗：并排展示安卓 / iOS 下载二维码。
 * 链接来自 SITE_CONFIG.appDownload；二维码用公开 API 生成，避免引入依赖。
 */
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import BaseModal from '@/components/BaseModal.vue';
import { SITE_CONFIG } from '@/config/site';

defineProps({
  modelValue: { type: Boolean, default: false },
});

const emit = defineEmits(['update:modelValue']);
const { t } = useI18n();

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

/** 根据下载链接生成二维码图片地址 */
function qrSrc(url) {
  const data = encodeURIComponent(String(url || '').trim());
  return `https://api.qrserver.com/v1/create-qr-code/?size=148x148&margin=8&color=0B3462&bgcolor=FFFFFF&data=${data}`;
}
</script>

<template>
  <BaseModal
    :model-value="modelValue"
    :title="t('下载APP')"
    :show-close="true"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="app-download">
      <p class="app-download__hint">{{ t('请使用手机扫描二维码下载') }}</p>
      <div class="app-download__grid">
        <div
          v-for="item in platforms"
          :key="item.key"
          class="app-download__card"
        >
          <div class="app-download__qr-wrap">
            <img
              class="app-download__qr"
              :src="qrSrc(item.url)"
              :alt="item.label"
              width="148"
              height="148"
            />
          </div>
          <p class="app-download__label">{{ item.label }}</p>
        </div>
      </div>
    </div>
  </BaseModal>
</template>

<style lang="scss" scoped>
@use '@/styles/tools.scss' as *;

.app-download {
  padding: 4px 2px 8px;
}

.app-download__hint {
  margin: 0 0 14px;
  color: rgba(11, 52, 98, 0.55);
  font-size: 14px;
  line-height: 1.4;
  text-align: center;
}

.app-download__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.app-download__card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 14px 10px 12px;
  border-radius: 16px;
  background: #fff;
  box-sizing: border-box;
}

.app-download__qr-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 160px;
  height: 160px;
  padding: 6px;
  border-radius: 14px;
  border: 1px solid rgba(28, 123, 255, 0.18);
  background: linear-gradient(180deg, #f5f9ff 0%, #ffffff 100%);
  box-sizing: border-box;
}

.app-download__qr {
  display: block;
  width: 148px;
  height: 148px;
  object-fit: contain;
}

.app-download__label {
  margin: 0;
  color: #0b3462;
  font-size: 15px;
  font-weight: 600;
  line-height: 1.2;
}
</style>
