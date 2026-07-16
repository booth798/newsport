<script setup>
/**
 * 更换银行卡弹窗：在已绑定的银行卡之间切换，也可打开新增绑定弹窗。
 */
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import BaseModal from '@/components/BaseModal.vue';

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  bankCards: { type: Array, default: () => [] },
  selectedId: { type: [String, Number], default: '' },
});

const emit = defineEmits(['update:modelValue', 'confirm', 'add']);
const { t } = useI18n();
const tempId = ref(props.selectedId);

watch(
  () => props.modelValue,
  (visible) => {
    if (visible) tempId.value = props.selectedId;
  },
);

function confirm() {
  emit('confirm', tempId.value);
  emit('update:modelValue', false);
}
</script>

<template>
  <BaseModal
    :model-value="props.modelValue"
    :title="t('更换银行卡')"
    :button-text="t('确认')"
    @update:model-value="emit('update:modelValue', $event)"
    @confirm="confirm"
  >
    <div class="bank-modal">
      <button
        v-for="card in props.bankCards"
        :key="card.id"
        type="button"
        class="bank-modal__item"
        :class="{ 'bank-modal__item--active': tempId === card.id }"
        @click="tempId = card.id"
      >
        <span class="bank-modal__info">
          <strong>{{ card.bankName }}</strong>
          <span>{{ card.cardNumber }}</span>
        </span>
        <span class="bank-modal__radio" aria-hidden="true" />
      </button>

      <button type="button" class="bank-modal__add" @click="emit('add')">
        <span aria-hidden="true">+</span>
        {{ t('添加其他银行卡') }}
      </button>
    </div>
  </BaseModal>
</template>

<style lang="scss" scoped>
.bank-modal {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  border-radius: 20px;
  background: var(--auxiliary-1);
}

.bank-modal__item {
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

.bank-modal__info {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 4px;

  strong {
    color: var(--theme-text);
    font-size: 16px;
    font-weight: 600;
  }

  span {
    overflow: hidden;
    color: rgba(11, 52, 98, 0.5);
    font-size: 12px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.bank-modal__radio {
  position: relative;
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  border: 1.5px solid #c3d4ea;
  border-radius: 50%;
}

.bank-modal__item--active .bank-modal__radio {
  border-color: var(--theme-primary);
  background: var(--theme-primary);

  &::after {
    position: absolute;
    top: 4px;
    left: 6px;
    width: 5px;
    height: 9px;
    border-right: 2px solid var(--auxiliary-1);
    border-bottom: 2px solid var(--auxiliary-1);
    content: '';
    transform: rotate(45deg);
  }
}

.bank-modal__add {
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

  span {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    border: 1px solid currentColor;
    border-radius: 50%;
  }
}
</style>
