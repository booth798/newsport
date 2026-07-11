<script setup>
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';

import BaseModal from '@/components/BaseModal.vue';
import { useAppStore } from '@/store/modules/app';

const props = defineProps({
  modelValue: { type: Boolean, default: false },
});

const emit = defineEmits(['update:modelValue']);
const { t } = useI18n();
const appStore = useAppStore();
const { locale } = storeToRefs(appStore);
const selectedLocale = ref(locale.value);
const languageOptions = [
  { value: 'zh-CN', labelKey: '中文' },
  { value: 'en-US', labelKey: '英文' },
];

// 每次打开时以当前已生效的语言作为初始选项，取消不会改变全局语言。
watch(
  () => props.modelValue,
  (visible) => {
    if (visible) selectedLocale.value = locale.value;
  },
);

function close() {
  emit('update:modelValue', false);
}

function confirm() {
  appStore.setLocale(selectedLocale.value);
  close();
}
</script>

<template>
  <BaseModal :model-value="props.modelValue" :title="t('语言设置')" @update:model-value="close">
    <div class="language-setting-modal__options" role="radiogroup" :aria-label="t('语言设置')">
      <button
        v-for="option in languageOptions"
        :key="option.value"
        type="button"
        class="language-setting-modal__option"
        :aria-checked="selectedLocale === option.value"
        role="radio"
        @click="selectedLocale = option.value"
      >
        <span>{{ t(option.labelKey) }}</span>
        <i :class="{ 'is-selected': selectedLocale === option.value }" aria-hidden="true" />
      </button>
    </div>
    <div class="language-setting-modal__actions">
      <button type="button" class="language-setting-modal__cancel" @click="close">
        {{ t('取消') }}
      </button>
      <button type="button" class="language-setting-modal__confirm" @click="confirm">
        {{ t('确定') }}
      </button>
    </div>
  </BaseModal>
</template>

<style lang="scss" scoped>
@use '@/styles/tools.scss' as *;
.language-setting-modal__options {
  overflow: hidden;
  border-radius: 16px;
  background: #fff;
  padding: 16px 18px;
  display: flex;
  flex-direction: column;
  @include web-only {
    height: 108px;
  }
  @include mobile-only {
    height: 120px;
  }
}

.language-setting-modal__option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  flex: 1;
  background: transparent;
  color: #171e24;
  text-align: left;
  cursor: pointer;
  @include web-only {
    font-size: 16px;
  }
  @include mobile-only {
    font-size: 14px;
  }
  &:focus-visible {
    outline: 2px solid #0d6cfb;
    outline-offset: -2px;
  }

  i {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    box-sizing: border-box;
    border: 1.5px solid rgba(11, 52, 98, 0.48);
    border-radius: 50%;

    &.is-selected {
      border-color: #0d6cfb;

      &::after {
        width: 10px;
        height: 5px;
        border-bottom: 1.5px solid #0d6cfb;
        border-left: 1.5px solid #0d6cfb;
        content: '';
        transform: translateY(-1px) rotate(-45deg);
      }
    }
  }
}

.language-setting-modal__actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 16px;

  button {
    height: 44px;
    border-radius: 22px;
    font-size: 18px;
    cursor: pointer;
  }
}

.language-setting-modal__cancel {
  border: 1px solid #fff;
  background: transparent;
  color: #fff;
}

.language-setting-modal__confirm {
  background: #fff;
  color: #0d6cfb;
}
</style>
