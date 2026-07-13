<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

const props = defineProps({
  modelValue: {
    type: String,
    required: true,
  },
  ariaLabel: {
    type: String,
    default: '',
  },
});

const emit = defineEmits(['update:modelValue']);
const { locale, t } = useI18n();
const rootRef = ref(null);
const menuRef = ref(null);
const open = ref(false);

// 月份范围为上海时区当前月及之前 23 个月，并按时间升序展示。
const monthOptions = computed(() => {
  const [currentYear, currentMonth] = getShanghaiCurrentMonth().split('-').map(Number);
  return Array.from({ length: 24 }, (_, index) => {
    const offset = index - 23;
    const date = new Date(Date.UTC(currentYear, currentMonth - 1 + offset, 1));
    const value = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
    return { value, label: formatMonth(value) };
  });
});
const selectedLabel = computed(() => formatMonth(props.modelValue));

onMounted(() => {
  document.addEventListener('click', handleOutsideClick);
});

onBeforeUnmount(() => {
  document.removeEventListener('click', handleOutsideClick);
});

function getShanghaiCurrentMonth() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(new Date());
  const pick = (type) => parts.find((part) => part.type === type)?.value || '';
  return `${pick('year')}-${pick('month')}`;
}

function formatMonth(value) {
  const [year, month] = value.split('-').map(Number);
  if (!year || !month) return '';
  return new Intl.DateTimeFormat(locale.value, {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: 'long',
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

async function toggleMenu() {
  open.value = !open.value;
  if (!open.value) return;
  await nextTick();
  // 展开时将当前月份滚动到菜单可视区域中间。
  menuRef.value
    ?.querySelector(`[data-month="${props.modelValue}"]`)
    ?.scrollIntoView({ block: 'center' });
}

function selectMonth(month) {
  emit('update:modelValue', month);
  open.value = false;
}

function handleOutsideClick(event) {
  if (!rootRef.value?.contains(event.target)) {
    open.value = false;
  }
}
</script>

<template>
  <div ref="rootRef" class="month-selector">
    <button
      type="button"
      class="month-selector__trigger"
      :aria-label="ariaLabel || t('选择月份')"
      :aria-expanded="open"
      @click.stop="toggleMenu"
    >
      <span>{{ selectedLabel }}</span>
      <i aria-hidden="true"></i>
    </button>
    <div v-if="open" ref="menuRef" class="month-selector__menu" role="listbox">
      <button
        v-for="option in monthOptions"
        :key="option.value"
        type="button"
        role="option"
        :data-month="option.value"
        :aria-selected="modelValue === option.value"
        :class="{ active: modelValue === option.value }"
        @click="selectMonth(option.value)"
      >
        {{ option.label }}
      </button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/tools.scss' as *;

.month-selector {
  position: relative;
  z-index: 20;
}

.month-selector__trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 40px;
  padding: 0 8px;
  border: 0;
  background: transparent;
  color: var(--theme-text);
  font-size: 14px;
  white-space: nowrap;
  cursor: pointer;

  i {
    width: 8px;
    height: 8px;
    margin-top: -4px;
    border-right: 1.5px solid currentColor;
    border-bottom: 1.5px solid currentColor;
    transform: rotate(45deg);
  }
}

.month-selector__menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: 120px;
  max-height: 260px;
  overflow-y: auto;
  border: 1px solid var(--auxiliary-1);
  border-radius: 18px;
  background: var(--auxiliary-1);
  box-shadow: 0 5px 18px rgba(21, 58, 119, 0.2);
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }

  button {
    display: block;
    width: 100%;
    height: 52px;
    padding: 0 16px;
    border: 0;
    background: transparent;
    color: var(--theme-text);
    font-size: 14px;
    text-align: left;
    white-space: nowrap;
    cursor: pointer;

    &:hover,
    &.active {
      background: #eaf1f9;
    }
  }
}

@include web-only {
  .month-selector__trigger {
    font-size: 14px;
  }
}
</style>
