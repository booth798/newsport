<script setup>
/** 区块链地址选择入口：统一整理显示字段，具体 PC/H5 形态由选择器处理。 */
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import WithdrawSelectionPanel from './WithdrawSelectionPanel.vue';

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  addresses: { type: Array, default: () => [] },
  selectedId: { type: [String, Number], default: '' },
});

const emit = defineEmits(['update:modelValue', 'confirm', 'add']);
const { t } = useI18n();

const items = computed(() => props.addresses.map((item) => ({
  id: String(item.id),
  primary: item.chainType,
  secondary: item.address,
})));
</script>

<template>
  <WithdrawSelectionPanel
    :model-value="props.modelValue"
    :title="t('更换地址')"
    :mobile-title="t('更换区块链')"
    :items="items"
    :selected-id="props.selectedId"
    :add-text="t('添加其他区块链')"
    @update:model-value="emit('update:modelValue', $event)"
    @confirm="emit('confirm', $event)"
    @add="emit('add')"
  />
</template>
