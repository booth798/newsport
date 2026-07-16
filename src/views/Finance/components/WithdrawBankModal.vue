<script setup>
/** 银行卡选择入口：统一整理显示字段，具体 PC/H5 形态由选择器处理。 */
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import WithdrawSelectionPanel from './WithdrawSelectionPanel.vue';

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  bankCards: { type: Array, default: () => [] },
  selectedId: { type: [String, Number], default: '' },
});

const emit = defineEmits(['update:modelValue', 'confirm', 'add']);
const { t } = useI18n();

function bankLabel(card) {
  const account = String(card.cardNumber || '');
  const lastFour = account.replace(/\D/g, '').slice(-4);
  return lastFour ? `${card.bankName}(${lastFour})` : card.bankName;
}

const items = computed(() => props.bankCards.map((card) => ({
  id: String(card.id),
  primary: bankLabel(card),
  secondary: '',
})));
</script>

<template>
  <WithdrawSelectionPanel
    :model-value="props.modelValue"
    :title="t('更换银行卡')"
    :items="items"
    :selected-id="props.selectedId"
    :add-text="t('添加其他银行卡')"
    @update:model-value="emit('update:modelValue', $event)"
    @confirm="emit('confirm', $event)"
    @add="emit('add')"
  />
</template>
