<script setup>
/**
 * 收款绑定列表：统一银行卡/区块链 Tab、选择态、移除态和新增入口。
 * 接口请求、删除确认和保存动作由业务父组件处理。
 */
import checkboxCheckedUrl from '@/assets/images/common/icon_checkbox_checked.png?url';
import checkboxUncheckedUrl from '@/assets/images/common/icon_checkbox_unchecked.png?url';
import addressRemoveUrl from '@/assets/images/common/address_remove_icon.svg?url';

defineProps({
  tabs: { type: Array, default: () => [] },
  activeTab: { type: String, default: '' },
  items: { type: Array, default: () => [] },
  selectedId: { type: [String, Number], default: '' },
  selectable: { type: Boolean, default: true },
  removable: { type: Boolean, default: false },
  addText: { type: String, required: true },
});

const emit = defineEmits(['update:activeTab', 'select', 'remove', 'add']);
</script>

<template>
  <div class="binding-list-panel">
    <div v-if="tabs.length" class="binding-list-panel__tabs" role="tablist">
      <button v-for="tab in tabs" :key="tab.key" type="button" role="tab" class="binding-list-panel__tab"
        :class="{ active: activeTab === tab.key }" :aria-selected="activeTab === tab.key"
        @click="emit('update:activeTab', tab.key)">
        {{ tab.label }}
      </button>
    </div>

    <div class="binding-list-panel__list">
      <div v-for="item in items" :key="item.id" class="binding-list-panel__item"
        :class="{ 'binding-list-panel__item--wallet': item.secondary }">
        <button type="button" class="binding-list-panel__item-main" :disabled="!selectable || removable"
          @click="emit('select', String(item.id))">
          <span class="binding-list-panel__info">
            <strong>{{ item.primary }}</strong>
            <span v-if="item.secondary">{{ item.secondary }}</span>
          </span>
        </button>

        <button v-if="removable" type="button" class="binding-list-panel__remove" :aria-label="item.removeLabel"
          @click="emit('remove', item)">
          <img :src="addressRemoveUrl" alt="" aria-hidden="true" />
        </button>
        <img v-else-if="selectable" class="binding-list-panel__radio"
          :src="String(selectedId) === String(item.id) ? checkboxCheckedUrl : checkboxUncheckedUrl"
          alt="" aria-hidden="true" />
      </div>

      <button type="button" class="binding-list-panel__add" @click="emit('add')">
        <slot name="add-icon" />
        {{ addText }}
      </button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/tools.scss' as *;

.binding-list-panel {
  display: flex;
  min-height: 0;
  flex-direction: column;
}

.binding-list-panel__tabs {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(0, 1fr));
  gap: 8px;
  height: 48px;
  margin-bottom: 12px;
  padding: 6px 8px;
  border-radius: 30px;
  background: var(--binding-list-tabs-bg, var(--surface-card));
  box-shadow: 0px 4px 10px 0px rgba(var(--theme-shadow-rgb), 0.18);
}

.binding-list-panel__tab {
  border: 0;
  border-radius: 24px;
  background: transparent;
  color: var(--theme-primary);
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
}

.binding-list-panel__tab.active {
  background: var(--theme-primary);
  color: #fff;
  box-shadow: 0 3px 9px rgba(var(--theme-primary-rgb), 0.3);
}

.binding-list-panel__list {
  display: flex;
  min-height: 0;
  flex-direction: column;
  gap: 10px;
}

.binding-list-panel__item {
  display: flex;
  align-items: center;
  min-height: 58px;
  padding: 0 16px;
  border: 1px solid var(--border-light);
  border-radius: 16px;
  background: #fff;
}

.binding-list-panel__item--wallet {
  min-height: 68px;
}

.binding-list-panel__item-main {
  display: flex;
  min-width: 0;
  flex: 1;
  padding: 12px 0;
  border: 0;
  background: transparent;
  color: var(--theme-text);
  text-align: left;
  cursor: pointer;
}

.binding-list-panel__item-main:disabled {
  cursor: default;
}

.binding-list-panel__info {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 6px;
}

.binding-list-panel__info strong,
.binding-list-panel__info span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.binding-list-panel__info strong {
  font-size: 16px;
  font-weight: 500;
}

.binding-list-panel__info span {
  color: rgba(var(--theme-text-rgb), 0.5);
  font-size: 12px;
}

.binding-list-panel__radio {
  width: 20px;
  height: 20px;
  flex: 0 0 20px;
}

.binding-list-panel__remove {
  display: inline-flex;
  width: 32px;
  height: 32px;
  flex: 0 0 32px;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
}

.binding-list-panel__remove img {
  display: block;
  width: 32px;
  height: 32px;
}

.binding-list-panel__add {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 58px;
  border: 0;
  border-radius: 16px;
  background: var(--binding-list-add-bg, var(--surface-card));
  color: var(--theme-primary);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  @include mobile-only {
    background: #FFFFFF !important;
  }
}

.binding-list-panel__add :deep(img) {
  width: 16px;
  height: 16px;
}
</style>
