<script setup>
/**
 * 更换地址弹窗：展示已绑定的区块链收款地址，单选切换，或新增地址。
 * - 复用 BaseModal（蓝色标题 + 底部「确认」按钮）
 * - 列表白底卡片，右侧单选圆点，选中态蓝色对勾
 */
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import BaseModal from '@/components/BaseModal.vue';

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  // 地址列表：[{ id, chainType, address }]
  addresses: { type: Array, default: () => [] },
  // 当前选中地址 id
  selectedId: { type: [String, Number], default: '' },
});

const emit = defineEmits(['update:modelValue', 'confirm', 'add']);
const { t } = useI18n();

// 弹窗内的临时选择，确认后才回传父组件
const tempId = ref(props.selectedId);

watch(
  () => props.modelValue,
  (visible) => {
    if (visible) tempId.value = props.selectedId;
  },
);

function pick(id) {
  tempId.value = id;
}

function confirm() {
  emit('confirm', tempId.value);
  emit('update:modelValue', false);
}
</script>

<template>
  <BaseModal
    :model-value="props.modelValue"
    :title="t('更换地址')"
    :button-text="t('确认')"
    @update:model-value="emit('update:modelValue', $event)"
    @confirm="confirm"
  >
    <div class="addr-modal">
      <button
        v-for="item in props.addresses"
        :key="item.id"
        type="button"
        class="addr-modal__item"
        :class="{ 'addr-modal__item--active': tempId === item.id }"
        @click="pick(item.id)"
      >
        <span class="addr-modal__info">
          <span class="addr-modal__chain">{{ item.chainType }}</span>
          <span class="addr-modal__addr">{{ item.address }}</span>
        </span>
        <span class="addr-modal__radio" aria-hidden="true" />
      </button>

      <button type="button" class="addr-modal__add" @click="emit('add')">
        <span class="addr-modal__add-icon" aria-hidden="true">+</span>
        {{ t('添加其他地址') }}
      </button>
    </div>
  </BaseModal>
</template>

<style lang="scss" scoped>
@use '@/styles/tools.scss' as *;

.addr-modal {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  border-radius: 20px;
  background: #fff;
}

.addr-modal__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 4px;
  border: 0;
  border-bottom: 1px solid var(--theme-divider);
  background: transparent;
  text-align: left;
  cursor: pointer;
}

.addr-modal__info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.addr-modal__chain {
  color: var(--theme-text);
  font-size: 16px;
  font-weight: 600;
}

.addr-modal__addr {
  overflow: hidden;
  color: rgba(11, 52, 98, 0.5);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: $font-family-num, $font-family-base;
}

.addr-modal__radio {
  position: relative;
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  border: 1.5px solid #c3d4ea;
  border-radius: 50%;
}

.addr-modal__item--active .addr-modal__radio {
  border-color: var(--theme-primary);
  background: var(--theme-primary);

  &::after {
    content: '';
    position: absolute;
    top: 4px;
    left: 6px;
    width: 5px;
    height: 9px;
    border-right: 2px solid #fff;
    border-bottom: 2px solid #fff;
    transform: rotate(45deg);
  }
}

.addr-modal__add {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 44px;
  border: 0;
  border-radius: 12px;
  background: #eaf1f9;
  color: var(--theme-primary);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}

.addr-modal__add-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border: 1px solid currentColor;
  border-radius: 50%;
  font-size: 13px;
  line-height: 1;
}
</style>
