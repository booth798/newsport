<script setup>
/**
 * 月份 / 日期选择器
 * - 默认：仅年月（v-model='YYYY-MM'），对齐账务页筛选
 * - includeDay：年月日（v-model='YYYY-MM-DD'），对齐安卓 DateSelectDialog(includeDay=true)
 * 弹窗样式复用现有 BaseModal 滚轮交互。
 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';

import BaseModal from '@/components/BaseModal.vue';
import { useAppStore } from '@/store/modules/app';

const props = defineProps({
  modelValue: {
    type: String,
    required: true,
  },
  ariaLabel: {
    type: String,
    default: '',
  },
  /** 可选月份窗口（含当前月往前的月份数量），默认近 24 个月；仅 includeDay=false 时生效 */
  monthsBack: {
    type: Number,
    default: 23,
  },
  /** 为 true 时增加「日」列，v-model 为 YYYY-MM-DD（对齐安卓 includeDay） */
  includeDay: {
    type: Boolean,
    default: false,
  },
  /** includeDay 时年份可选范围：当前年前后各 yearRange 年（对齐安卓 YEAR_RANGE=10） */
  yearRange: {
    type: Number,
    default: 10,
  },
});

const emit = defineEmits(['update:modelValue']);
const { locale, t } = useI18n();
const appStore = useAppStore();
const { isMobile } = storeToRefs(appStore);

const ITEM_HEIGHT = 44; // 滚轮单项高度，与样式保持一致

const rootRef = ref(null);
const menuRef = ref(null);
const open = ref(false); // 桌面端下拉（仅年月模式）

// 滚轮弹窗
const pickerOpen = ref(false);
const yearColRef = ref(null);
const monthColRef = ref(null);
const dayColRef = ref(null);
const draftYear = ref(0);
const draftMonth = ref(1);
const draftDay = ref(1);
let yearScrollTimer = null;
let monthScrollTimer = null;
let dayScrollTimer = null;
let programmaticScroll = false;

const shanghaiToday = computed(() => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const pick = (type) => Number(parts.find((part) => part.type === type)?.value || 0);
  return { year: pick('year'), month: pick('month'), day: pick('day') };
});

// 当前上海时区月份边界（仅年月模式）
const currentMonthStr = computed(() => {
  const { year, month } = shanghaiToday.value;
  return `${year}-${pad2(month)}`;
});
const bounds = computed(() => {
  const [cy, cm] = currentMonthStr.value.split('-').map(Number);
  const earliest = new Date(Date.UTC(cy, cm - 1 - props.monthsBack, 1));
  return {
    curYear: cy,
    curMonth: cm,
    earliestYear: earliest.getUTCFullYear(),
    earliestMonth: earliest.getUTCMonth() + 1,
  };
});

// 年份列：年月模式用 earliest→current；选日模式用 ±yearRange
const yearOptions = computed(() => {
  if (props.includeDay) {
    const cy = shanghaiToday.value.year;
    const start = cy - props.yearRange;
    const end = cy + props.yearRange;
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }
  const { earliestYear, curYear } = bounds.value;
  return Array.from({ length: curYear - earliestYear + 1 }, (_, i) => earliestYear + i);
});
const monthOptions = Array.from({ length: 12 }, (_, i) => i + 1);
const dayOptions = computed(() => {
  const days = daysInMonth(draftYear.value, draftMonth.value);
  return Array.from({ length: days }, (_, i) => i + 1);
});

const selectedLabel = computed(() => (
  props.includeDay ? formatDateLabel(props.modelValue) : formatMonth(props.modelValue)
));
const yearUnit = computed(() => (locale.value.startsWith('zh') ? '年' : ''));
const monthUnit = computed(() => (locale.value.startsWith('zh') ? '月' : ''));
const dayUnit = computed(() => (locale.value.startsWith('zh') ? '日' : ''));
const triggerAriaLabel = computed(() => (
  props.ariaLabel || (props.includeDay ? t('日期选择') : t('选择月份'))
));

// 桌面端下拉的月份列表（近 12 个月，升序；仅年月模式）
const dropdownOptions = computed(() => {
  const { curYear, curMonth } = bounds.value;
  return Array.from({ length: 12 }, (_, index) => {
    const offset = index - 11;
    const date = new Date(Date.UTC(curYear, curMonth - 1 + offset, 1));
    const value = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
    return { value, label: formatMonth(value) };
  });
});

onMounted(() => {
  document.addEventListener('click', handleOutsideClick);
});

onBeforeUnmount(() => {
  document.removeEventListener('click', handleOutsideClick);
  clearTimeout(yearScrollTimer);
  clearTimeout(monthScrollTimer);
  clearTimeout(dayScrollTimer);
});

function pad2(n) {
  return String(n).padStart(2, '0');
}

function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

function formatMonth(value) {
  const [year, month] = String(value).split('-').map(Number);
  if (!year || !month) return '';
  return new Intl.DateTimeFormat(locale.value, {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: 'long',
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

function formatDateLabel(value) {
  const { year, month, day } = parseDateValue(value);
  const date = new Date(year, month - 1, day);
  const isEn = String(locale.value).startsWith('en');
  return new Intl.DateTimeFormat(isEn ? 'en-US' : 'zh-CN', {
    year: 'numeric',
    month: isEn ? 'long' : 'numeric',
    day: 'numeric',
    weekday: 'short',
  }).format(date);
}

// 将 year-month 限制在允许范围内，返回 'YYYY-MM'
function clampMonthValue(year, month) {
  const { curYear, curMonth, earliestYear, earliestMonth } = bounds.value;
  let value = `${year}-${pad2(month)}`;
  const max = `${curYear}-${pad2(curMonth)}`;
  const min = `${earliestYear}-${pad2(earliestMonth)}`;
  if (value > max) value = max;
  if (value < min) value = min;
  return value;
}

function toDateValue(year, month, day) {
  const maxDay = daysInMonth(year, month);
  const safeDay = Math.min(day, maxDay);
  return `${year}-${pad2(month)}-${pad2(safeDay)}`;
}

/* ─── 触发交互：选日模式始终滚轮；年月模式移动端滚轮 / 桌面下拉 ─── */
async function handleTriggerClick() {
  if (props.includeDay || isMobile.value) {
    openPicker();
  } else {
    await toggleMenu();
  }
}

/* ─── 桌面下拉（仅年月） ─── */
async function toggleMenu() {
  open.value = !open.value;
  if (!open.value) return;
  await nextTick();
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

/* ─── 滚轮弹窗 ─── */
function parseMonthValue(value) {
  const [y, m] = String(value).split('-').map(Number);
  const { curYear, curMonth } = bounds.value;
  return [y || curYear, m || curMonth];
}

function parseDateValue(value) {
  const [y, m, d] = String(value || '').split('-').map(Number);
  const t = shanghaiToday.value;
  return {
    year: y || t.year,
    month: m || t.month,
    day: d || t.day,
  };
}

async function openPicker() {
  if (props.includeDay) {
    const { year, month, day } = parseDateValue(props.modelValue);
    draftYear.value = year;
    draftMonth.value = month;
    draftDay.value = Math.min(day, daysInMonth(year, month));
  } else {
    const [y, m] = clampMonthValue(...parseMonthValue(props.modelValue)).split('-').map(Number);
    draftYear.value = y;
    draftMonth.value = m;
    draftDay.value = 1;
  }
  pickerOpen.value = true;
  await nextTick();
  scrollColumnToIndex(yearColRef.value, yearIndex());
  scrollColumnToIndex(monthColRef.value, draftMonth.value - 1);
  if (props.includeDay) {
    scrollColumnToIndex(dayColRef.value, draftDay.value - 1);
  }
}

function closePicker() {
  pickerOpen.value = false;
}

function confirmPicker() {
  if (props.includeDay) {
    emit('update:modelValue', toDateValue(draftYear.value, draftMonth.value, draftDay.value));
  } else {
    emit('update:modelValue', clampMonthValue(draftYear.value, draftMonth.value));
  }
  pickerOpen.value = false;
}

function yearIndex() {
  const idx = yearOptions.value.indexOf(draftYear.value);
  if (idx >= 0) return idx;
  return props.includeDay
    ? Math.floor(yearOptions.value.length / 2)
    : yearOptions.value.length - 1;
}

function scrollColumnToIndex(el, index) {
  if (!el) return;
  programmaticScroll = true;
  el.scrollTop = Math.max(0, index) * ITEM_HEIGHT;
  // 释放标记，避免把这次程序化滚动当成用户滚动
  window.requestAnimationFrame(() => {
    programmaticScroll = false;
  });
}

function onYearScroll() {
  if (programmaticScroll) return;
  clearTimeout(yearScrollTimer);
  yearScrollTimer = setTimeout(() => {
    const el = yearColRef.value;
    if (!el) return;
    const index = Math.max(0, Math.min(yearOptions.value.length - 1, Math.round(el.scrollTop / ITEM_HEIGHT)));
    draftYear.value = yearOptions.value[index];
    if (props.includeDay) clampDraftDay();
    else clampDraftMonth();
  }, 90);
}

function onMonthScroll() {
  if (programmaticScroll) return;
  clearTimeout(monthScrollTimer);
  monthScrollTimer = setTimeout(() => {
    const el = monthColRef.value;
    if (!el) return;
    const index = Math.max(0, Math.min(11, Math.round(el.scrollTop / ITEM_HEIGHT)));
    draftMonth.value = index + 1;
    if (props.includeDay) clampDraftDay();
    else clampDraftMonth();
  }, 90);
}

function onDayScroll() {
  if (programmaticScroll) return;
  clearTimeout(dayScrollTimer);
  dayScrollTimer = setTimeout(() => {
    const el = dayColRef.value;
    if (!el) return;
    const maxIdx = dayOptions.value.length - 1;
    const index = Math.max(0, Math.min(maxIdx, Math.round(el.scrollTop / ITEM_HEIGHT)));
    draftDay.value = dayOptions.value[index];
  }, 90);
}

// 若草稿月份超出允许范围，回拉到合法月份并同步滚轮位置（仅年月模式）
function clampDraftMonth() {
  const clamped = clampMonthValue(draftYear.value, draftMonth.value);
  const [cy, cm] = clamped.split('-').map(Number);
  if (cy !== draftYear.value) {
    draftYear.value = cy;
    scrollColumnToIndex(yearColRef.value, yearIndex());
  }
  if (cm !== draftMonth.value) {
    draftMonth.value = cm;
    scrollColumnToIndex(monthColRef.value, cm - 1);
  }
}

/** 选日模式：年/月变化后校正日不超过当月最大日 */
function clampDraftDay() {
  const max = daysInMonth(draftYear.value, draftMonth.value);
  if (draftDay.value > max) {
    draftDay.value = max;
    scrollColumnToIndex(dayColRef.value, draftDay.value - 1);
  }
}

// 语言或外部值变化时，同步桌面下拉的关闭状态
watch(
  () => props.modelValue,
  () => {
    open.value = false;
  },
);
</script>

<template>
  <div ref="rootRef" class="month-selector">
    <button
      type="button"
      class="month-selector__trigger"
      :aria-label="triggerAriaLabel"
      :aria-expanded="open || pickerOpen"
      @click.stop="handleTriggerClick"
    >
      <span>{{ selectedLabel }}</span>
      <i aria-hidden="true"></i>
    </button>

    <!-- 桌面端：下拉列表（仅年月模式） -->
    <div v-if="open && !isMobile && !includeDay" ref="menuRef" class="month-selector__menu" role="listbox">
      <button
        v-for="option in dropdownOptions"
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

    <!-- 滚轮选择弹窗（对齐 App DateSelectDialog） -->
    <BaseModal
      :model-value="pickerOpen"
      :title="t('日期选择')"
      :show-close="false"
      @update:model-value="closePicker"
    >
      <div class="month-picker">
        <div
          class="month-picker__wheels"
          :class="{ 'month-picker__wheels--with-day': includeDay }"
        >
          <div class="month-picker__highlight" aria-hidden="true"></div>
          <div ref="yearColRef" class="month-picker__col" @scroll="onYearScroll">
            <div class="month-picker__pad" aria-hidden="true"></div>
            <div
              v-for="year in yearOptions"
              :key="year"
              class="month-picker__item"
              :class="{ active: year === draftYear }"
            >
              {{ year }}{{ yearUnit }}
            </div>
            <div class="month-picker__pad" aria-hidden="true"></div>
          </div>
          <div ref="monthColRef" class="month-picker__col" @scroll="onMonthScroll">
            <div class="month-picker__pad" aria-hidden="true"></div>
            <div
              v-for="month in monthOptions"
              :key="month"
              class="month-picker__item"
              :class="{ active: month === draftMonth }"
            >
              {{ month }}{{ monthUnit }}
            </div>
            <div class="month-picker__pad" aria-hidden="true"></div>
          </div>
          <div
            v-if="includeDay"
            ref="dayColRef"
            class="month-picker__col"
            @scroll="onDayScroll"
          >
            <div class="month-picker__pad" aria-hidden="true"></div>
            <div
              v-for="day in dayOptions"
              :key="day"
              class="month-picker__item"
              :class="{ active: day === draftDay }"
            >
              {{ day }}{{ dayUnit }}
            </div>
            <div class="month-picker__pad" aria-hidden="true"></div>
          </div>
        </div>
      </div>
      <div class="month-picker__actions">
        <button type="button" class="month-picker__btn month-picker__btn--cancel" @click="closePicker">
          {{ t('取消') }}
        </button>
        <button type="button" class="month-picker__btn month-picker__btn--confirm" @click="confirmPicker">
          {{ t('确定') }}
        </button>
      </div>
    </BaseModal>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/tools.scss' as *;

.month-selector {
  position: relative;
  z-index: 20;
  display: flex;
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

/* ─── 滚轮选择 ─── */
.month-picker {
  padding: 8px 0 4px;
  border-radius: 16px;
  background: #fff;
}

.month-picker__wheels {
  position: relative;
  display: grid;
  grid-template-columns: 1fr 1fr;
  height: 220px; // 5 行 * 44px

  &--with-day {
    grid-template-columns: 1fr 1fr 1fr;
  }
}

.month-picker__highlight {
  position: absolute;
  left: 12px;
  right: 12px;
  top: 50%;
  height: 44px;
  transform: translateY(-50%);
  border-top: 1px solid rgba(28, 123, 255, 0.25);
  border-bottom: 1px solid rgba(28, 123, 255, 0.25);
  pointer-events: none;
}

.month-picker__col {
  height: 100%;
  overflow-y: auto;
  scroll-snap-type: y mandatory;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;

  &::-webkit-scrollbar {
    display: none;
  }
}

// 上下留白 = (容器高度 - 单项高度) / 2 = (220 - 44) / 2 = 88px
.month-picker__pad {
  height: 88px;
}

.month-picker__item {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 44px;
  scroll-snap-align: center;
  color: rgba(11, 52, 98, 0.35);
  font-family: $font-family-num, $font-family-base;
  font-size: 18px;
  transition: color 0.15s ease, font-weight 0.15s ease;

  &.active {
    color: #0b3462;
    font-weight: 600;
  }
}

.month-picker__actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 10px;
}

.month-picker__btn {
  height: 44px;
  border-radius: 22px;
  font-size: 18px;
  font-weight: 400;
  cursor: pointer;
}

.month-picker__btn--cancel {
  border: 1px solid #fff;
  background: transparent;
  color: #fff;
}

.month-picker__btn--confirm {
  border: 0;
  background: #fff;
  color: var(--theme-primary);
}
</style>
