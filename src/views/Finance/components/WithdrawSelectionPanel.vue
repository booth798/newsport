<script setup>
/**
 * 提现收款方式选择器：PC 使用公共弹窗，H5 使用独立全屏选择页。
 * 列表选择只保存在临时状态，点击「确认/完成」后才回传父页面。
 */
import { ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useI18n } from 'vue-i18n';
import { getImageUrl } from '@/utils/common';

import BaseModal from '@/components/BaseModal.vue';
import iconNavBackMarketUrl from '@/assets/images/common/icon_nav_back_market.svg?url';
import { useAppStore } from '@/store/modules/app';

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  title: { type: String, required: true },
  mobileTitle: { type: String, default: '' },
  items: { type: Array, default: () => [] },
  selectedId: { type: [String, Number], default: '' },
  addText: { type: String, required: true },
});

const emit = defineEmits(['update:modelValue', 'confirm', 'add']);
const { t } = useI18n();
const appStore = useAppStore();
const { isMobile } = storeToRefs(appStore);
const tempId = ref(String(props.selectedId ?? ''));

watch(
  () => props.modelValue,
  (visible) => {
    if (visible) tempId.value = String(props.selectedId ?? '');
  },
);

function close() {
  emit('update:modelValue', false);
}

function pick(id) {
  tempId.value = String(id ?? '');
}

function confirm() {
  if (!tempId.value) return;
  emit('confirm', tempId.value);
  close();
}

function add() {
  emit('add');
}
</script>

<template>
  <Teleport v-if="isMobile" to="body">
    <div v-if="props.modelValue" class="selection-page" role="dialog" aria-modal="true" :aria-label="props.mobileTitle || props.title">
      <header class="selection-page__header">
        <button type="button" class="selection-page__back" :aria-label="t('返回')" @click="close">
          <img :src="iconNavBackMarketUrl" alt="" />
        </button>
        <h2>{{ props.mobileTitle || props.title }}</h2>
        <button type="button" class="selection-page__done" :disabled="!tempId" @click="confirm">
          {{ t('完成') }}
        </button>
      </header>

      <main class="selection-page__content">
        <button
          v-for="item in props.items"
          :key="item.id"
          type="button"
          class="selection-item"
          :class="{ 'selection-item--active': tempId === String(item.id) }"
          @click="pick(item.id)"
        >
          <span class="selection-item__info">
            <strong>{{ item.primary }}</strong>
            <span v-if="item.secondary">{{ item.secondary }}</span>
          </span>
          <span class="selection-item__radio" aria-hidden="true" />
        </button>

        <button type="button" class="selection-add" @click="add">
          <img :src="getImageUrl('profile/add_address_icon.svg')" alt="">
          {{ props.addText }}
        </button>
      </main>
    </div>
  </Teleport>

  <BaseModal
    v-else
    :model-value="props.modelValue"
    :title="props.title"
    :button-text="t('确认')"
    :action-disabled="!tempId"
    @update:model-value="emit('update:modelValue', $event)"
    @confirm="confirm"
  >
    <div class="selection-modal">
      <button
        v-for="item in props.items"
        :key="item.id"
        type="button"
        class="selection-item"
        :class="{ 'selection-item--active': tempId === String(item.id) }"
        @click="pick(item.id)"
      >
        <span class="selection-item__info">
          <strong>{{ item.primary }}</strong>
          <span v-if="item.secondary">{{ item.secondary }}</span>
        </span>
        <span class="selection-item__radio" aria-hidden="true" />
      </button>

      <button type="button" class="selection-add" @click="add">
        <img :src="getImageUrl('profile/add_address_icon.svg')" alt="">
        {{ props.addText }}
      </button>
    </div>
  </BaseModal>
</template>

<style lang="scss" scoped>
@use '@/styles/tools.scss' as *;

.selection-page {
  position: fixed;
  inset: 0;
  z-index: 1400;
  box-sizing: border-box;
  overflow-y: auto;
  padding: calc(8px + env(safe-area-inset-top, 0px)) 8px calc(24px + env(safe-area-inset-bottom, 0px));
  background: #eaf1f9;
  color: var(--theme-text);
}

.selection-page__header {
  position: sticky;
  top: 0;
  z-index: 1;
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr) 44px;
  align-items: center;
  height: 48px;
  padding: 0 8px;
  border: 1px solid #fff;
  border-radius: 30px;
  background: #eaf1f9;

  h2 {
    margin: 0;
    overflow: hidden;
    color: var(--theme-text);
    font-size: 14px;
    font-weight: 500;
    text-align: center;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.selection-page__back,
.selection-page__done {
  height: 36px;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
}

.selection-page__back {
  display: flex;
  align-items: center;
  justify-content: center;

  img {
    width: 36px;
    height: 36px;
  }
}

.selection-page__done {
  color: var(--theme-primary);
  font-size: 14px;
  font-weight: 500;

  &:disabled {
    color: rgba(11, 52, 98, 0.35);
  }
}

.selection-page__content,
.selection-modal {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.selection-page__content {
  padding-top: 10px;
}

.selection-modal {
  min-height: 440px;
  padding: 16px;
  border-radius: 20px;
  background: #fff;
}

.selection-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 58px;
  padding: 12px 16px;
  border: 1px solid #d8e6f5;
  border-radius: 16px;
  background: #fff;
  color: var(--theme-text);
  text-align: left;
  cursor: pointer;
}

.selection-item__info {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 6px;

  strong {
    overflow: hidden;
    font-size: 16px;
    font-weight: 500;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  span {
    overflow: hidden;
    color: rgba(11, 52, 98, 0.45);
    font-family: $font-family-num, $font-family-base;
    font-size: 12px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.selection-item__radio {
  position: relative;
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  border: 1.5px solid #8da6c2;
  border-radius: 50%;
}

.selection-item--active .selection-item__radio {
  border-color: var(--theme-primary);

  &::after {
    position: absolute;
    top: 3px;
    left: 6px;
    width: 5px;
    height: 9px;
    border-right: 1.5px solid var(--theme-primary);
    border-bottom: 1.5px solid var(--theme-primary);
    content: '';
    transform: rotate(45deg);
  }
}

.selection-add {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 58px;
  border: 0;
  border-radius: 16px;
  background: #fff;
  color: var(--theme-primary);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;

  img {
    width: 16px;
    height: 16px;
  }
}

.selection-modal .selection-add {
  background: #eaf1f9;
}
</style>
