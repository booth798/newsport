<script setup>
/**
 * PC 市场页联赛筛选弹层（对齐 Figma 下拉面板）。
 * 选择逻辑与 H5 `/market/filter` 一致，写入 leagueFilter store；仅用于桌面端。
 */
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { Circle, CircleCheckBig } from 'lucide-vue-next';

import { fetchLeagueList } from '@/api/match';
import { useLeagueFilterStore } from '@/store/modules/leagueFilter';
import leagueFilterBackgroundUrl from '@/assets/images/common/league_filter_popover_bg.png';
import { LEAGUE_INDEX_ENTRIES, getLeagueGroupInitial } from '@/utils/leaguePinyin';

const props = defineProps({
  modelValue: { type: Boolean, default: false },
});

const emit = defineEmits(['update:modelValue', 'confirm', 'cancel']);

const { t, locale } = useI18n();
const filterStore = useLeagueFilterStore();
const { selectedLeagues, isAllSelected } = storeToRefs(filterStore);

const loading = ref(false);
const error = ref(false);
const allLeagues = ref([]);
const selectedIds = ref(new Set());
const isSelectAll = ref(false);
const rootRef = ref(null);
const bodyRef = ref(null);
/** 长文案截断时的悬浮完整提示（fixed，避免被 overflow 裁切） */
const hoverTip = ref(null);

const INDEX_ENTRIES = LEAGUE_INDEX_ENTRIES;

function leagueDisplayName(league) {
  const name = (league.name || '').trim();
  const shortName = (league.shortName || '').trim();
  const isEn = String(locale.value || '').toLowerCase().startsWith('en');
  return isEn ? (name || shortName) : (shortName || name);
}

/** 悬浮完整名：优先全称，保证比 pill 截断文案更完整 */
function leagueTipText(league) {
  const name = (league.name || '').trim();
  const shortName = (league.shortName || '').trim();
  return name || shortName || leagueDisplayName(league);
}

function clearHoverTip() {
  hoverTip.value = null;
}

/**
 * 仅当 pill 标签实际溢出时展示完整名称提示，样式对齐市场主题色。
 */
function onPillMouseEnter(event, league) {
  const pill = event.currentTarget;
  if (!(pill instanceof HTMLElement)) return;
  const labelEl = pill.querySelector('.league-filter-pop__pill-label');
  if (!(labelEl instanceof HTMLElement)) return;
  const text = leagueTipText(league);
  if (!text) return;
  // 未截断则不打扰；全称比展示名更长时也提示
  const truncated = labelEl.scrollWidth > labelEl.clientWidth + 1;
  const fullerThanLabel = text !== (labelEl.textContent || '').trim();
  if (!truncated && !fullerThanLabel) return;

  const rect = pill.getBoundingClientRect();
  hoverTip.value = {
    text,
    left: rect.left + rect.width / 2,
    top: rect.top - 6,
  };
}

const groupedLeagues = computed(() => {
  const groups = new Map();
  const hotList = allLeagues.value.filter((l) => l.hot);
  if (hotList.length) groups.set('☆', hotList);

  const hotIds = new Set(hotList.map((l) => l.id));
  const sorted = [...allLeagues.value]
    .filter((l) => !hotIds.has(l.id))
    .sort((a, b) => {
      const na = a.shortName || a.name || '';
      const nb = b.shortName || b.name || '';
      return na.localeCompare(nb, 'zh-Hans-CN-u-co-pinyin');
    });

  for (const league of sorted) {
    const name = league.shortName || league.name || '';
    // 拼音首字母 A–Z；不再使用 # 兜底分组
    const initial = getLeagueGroupInitial(name);
    if (!groups.has(initial)) groups.set(initial, []);
    groups.get(initial).push(league);
  }

  const result = [];
  for (const key of INDEX_ENTRIES) {
    const items = groups.get(key);
    if (items?.length) {
      result.push({
        key,
        label: key === '☆' ? t('热门') : key,
        leagues: items,
      });
    }
  }
  return result;
});

/** 本地勾选数量（对齐 H5「已选」；不走场次统计接口） */
const selectedCount = computed(() => selectedIds.value.size);

const confirmLabel = computed(() => {
  const n = selectedCount.value;
  return n > 0 ? `${t('确定')}(${n})` : t('确定');
});

function close() {
  emit('update:modelValue', false);
}

function cancel() {
  close();
  emit('cancel');
}

function toggleLeague(id) {
  // 对齐 H5：勾选仅改本地状态，不请求场次统计接口
  const s = new Set(selectedIds.value);
  if (s.has(id)) s.delete(id);
  else s.add(id);
  selectedIds.value = s;
  isSelectAll.value = s.size > 0 && s.size === allLeagues.value.length;
}

function onSelectAll() {
  // 全选可切换：勾选 → 全选；再点取消勾选 → 全部不选
  if (isSelectAll.value) {
    selectedIds.value = new Set();
    isSelectAll.value = false;
    return;
  }
  selectedIds.value = new Set(allLeagues.value.map((l) => l.id));
  isSelectAll.value = true;
}

function onSelectCustom() {
  // 切到自选：退出全选态；若当前为全选集合则清空，便于重新勾选
  if (isSelectAll.value || selectedIds.value.size === allLeagues.value.length) {
    selectedIds.value = new Set();
  }
  isSelectAll.value = false;
}

function finish() {
  // 对齐 H5：点确定才写入 store，市场列表再按筛选结果请求
  const names = isSelectAll.value
    ? []
    : allLeagues.value
      .filter((l) => selectedIds.value.has(l.id))
      .map(leagueDisplayName);
  filterStore.setSelection(names, isSelectAll.value);
  close();
  emit('confirm');
}

function restoreFromStore() {
  if (isAllSelected.value) {
    selectedIds.value = new Set(allLeagues.value.map((l) => l.id));
    isSelectAll.value = true;
    return;
  }
  if (selectedLeagues.value.length > 0) {
    const nameSet = new Set(selectedLeagues.value);
    selectedIds.value = new Set(
      allLeagues.value
        .filter((l) => nameSet.has(leagueDisplayName(l)))
        .map((l) => l.id),
    );
    isSelectAll.value = false;
    return;
  }
  selectedIds.value = new Set();
  isSelectAll.value = false;
}

async function loadLeagues() {
  try {
    loading.value = true;
    error.value = false;
    const res = await fetchLeagueList();
    allLeagues.value = res.data || [];
    restoreFromStore();
  } catch {
    error.value = true;
  } finally {
    loading.value = false;
  }
}

function onDocPointerDown(e) {
  if (!props.modelValue) return;
  const el = rootRef.value;
  if (el && el.contains(e.target)) return;
  // 点击筛选触发按钮由父级 toggle，避免 pointerdown 先关再被 click 打开
  if (e.target.closest?.('[data-league-filter-trigger]')) return;
  cancel();
}

/**
 * 按视口剩余高度收缩弹层，避免小分辨率底部确定/取消被裁切。
 * 首选高度约 480，且不超过「弹层顶边 → 视口底边」可用空间。
 */
function fitPanelToViewport() {
  const el = rootRef.value;
  if (!el) return;
  const top = el.getBoundingClientRect().top;
  const bottomGap = 24;
  const available = Math.floor(window.innerHeight - top - bottomGap);
  const preferred = 480;
  const minH = 320;
  const next = Math.max(minH, Math.min(preferred, available));
  el.style.height = `${next}px`;
  el.style.maxHeight = `${Math.max(minH, available)}px`;
}

function onViewportResize() {
  if (!props.modelValue) return;
  fitPanelToViewport();
}

watch(
  () => props.modelValue,
  async (open) => {
    if (open) {
      loadLeagues();
      document.addEventListener('pointerdown', onDocPointerDown, true);
      window.addEventListener('resize', onViewportResize);
      // 等 v-show 渲染后再量测顶边位置
      await nextTick();
      fitPanelToViewport();
    } else {
      clearHoverTip();
      document.removeEventListener('pointerdown', onDocPointerDown, true);
      window.removeEventListener('resize', onViewportResize);
    }
  },
);

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onDocPointerDown, true);
  window.removeEventListener('resize', onViewportResize);
  clearHoverTip();
});
</script>

<template>
  <div
    v-show="modelValue"
    ref="rootRef"
    class="league-filter-pop"
    role="dialog"
    :aria-label="t('筛选联赛')"
    :style="{ backgroundImage: `url(${leagueFilterBackgroundUrl})` }"
  >
    <div v-if="loading" class="league-filter-pop__state">
      <div class="league-filter-pop__spinner" />
      <span>{{ t('加载中') }}</span>
    </div>

    <div v-else-if="error" class="league-filter-pop__state">
      <span>{{ t('加载失败') }}</span>
      <button type="button" class="league-filter-pop__retry" @click="loadLeagues">
        {{ t('重试') }}
      </button>
    </div>

    <template v-else>
      <div
        ref="bodyRef"
        class="league-filter-pop__body"
        @scroll="clearHoverTip"
      >
        <!-- 对齐 H5：展示本地已勾选联赛数，不请求场次统计 -->
        <p v-if="selectedCount > 0" class="league-filter-pop__hint">
          {{ t('已选') }}（{{ selectedCount }}）
        </p>
        <section
          v-for="group in groupedLeagues"
          :key="group.key"
          class="league-filter-pop__group"
        >
          <h3 class="league-filter-pop__group-label">{{ group.label }}</h3>
          <div class="league-filter-pop__grid">
            <button
              v-for="league in group.leagues"
              :key="league.id"
              type="button"
              class="league-filter-pop__pill"
              :class="{ 'league-filter-pop__pill--selected': selectedIds.has(league.id) }"
              @click="toggleLeague(league.id)"
              @mouseenter="onPillMouseEnter($event, league)"
              @mouseleave="clearHoverTip"
            >
              <CircleCheckBig
                v-if="selectedIds.has(league.id)"
                class="league-filter-pop__pill-check"
                :size="18"
                :stroke-width="1.8"
                aria-hidden="true"
              />
              <Circle
                v-else
                class="league-filter-pop__pill-check league-filter-pop__pill-check--empty"
                :size="18"
                :stroke-width="1.4"
                aria-hidden="true"
              />
              <span class="league-filter-pop__pill-label">{{ leagueDisplayName(league) }}</span>
            </button>
          </div>
        </section>
      </div>

      <footer class="league-filter-pop__footer">
        <div class="league-filter-pop__modes">
          <button
            type="button"
            class="league-filter-pop__mode"
            :class="{ 'league-filter-pop__mode--active': isSelectAll }"
            @click="onSelectAll"
          >
            <CircleCheckBig
              v-if="isSelectAll"
              class="league-filter-pop__mode-icon"
              :size="18"
              :stroke-width="1.8"
              aria-hidden="true"
            />
            <Circle
              v-else
              class="league-filter-pop__mode-icon league-filter-pop__mode-icon--empty"
              :size="18"
              :stroke-width="1.4"
              aria-hidden="true"
            />
            <span>{{ t('全选') }}</span>
          </button>
          <button
            type="button"
            class="league-filter-pop__mode"
            :class="{ 'league-filter-pop__mode--active': !isSelectAll }"
            @click="onSelectCustom"
          >
            <CircleCheckBig
              v-if="!isSelectAll"
              class="league-filter-pop__mode-icon"
              :size="18"
              :stroke-width="1.8"
              aria-hidden="true"
            />
            <Circle
              v-else
              class="league-filter-pop__mode-icon league-filter-pop__mode-icon--empty"
              :size="18"
              :stroke-width="1.4"
              aria-hidden="true"
            />
            <span>{{ t('自选') }}</span>
          </button>
        </div>
        <div class="league-filter-pop__actions">
          <button
            type="button"
            class="league-filter-pop__confirm"
            @click="finish"
          >
            {{ confirmLabel }}
          </button>
          <button type="button" class="league-filter-pop__cancel" @click="cancel">
            {{ t('取消') }}
          </button>
        </div>
      </footer>
    </template>
  </div>

  <!-- 悬浮完整联赛名：挂到 body，避免弹层 overflow 裁切 -->
  <Teleport to="body">
    <div
      v-if="hoverTip"
      class="league-filter-tip"
      role="tooltip"
      :style="{ left: `${hoverTip.left}px`, top: `${hoverTip.top}px` }"
    >
      {{ hoverTip.text }}
    </div>
  </Teleport>
</template>

<style lang="scss" scoped>
@use '@/styles/tools.scss' as *;

.league-filter-pop {
  position: absolute;
  top: calc(100% + 8px);
  left: -40px;
  z-index: 30;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  /*
   * 背景图设计稿比例 416×530（资源 1248×1590 @3x）。
   * 默认高度压到约 480，并靠 JS 按视口剩余空间再收缩，避免低分辨率底部按钮被裁切。
   */
  width: 500px;
  height: 480px;
  max-width: min(500px, calc(100vw - 48px));
  max-height: min(480px, calc(100dvh - 200px));
  padding: 48px 22px 64px;
  background-position: center;
  background-repeat: no-repeat;
  background-size: 100% 100%;
  filter: drop-shadow(0 6px 20px rgba(21, 58, 119, 0.18));
}

.league-filter-pop__state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  flex: 1;
  min-height: 0;
  color: #0b3462;
  font-size: 14px;
}

.league-filter-pop__spinner {
  width: 28px;
  height: 28px;
  border: 3px solid #d6e0eb;
  border-top-color: #1c7bff;
  border-radius: 50%;
  animation: league-filter-spin 0.8s linear infinite;
}

.league-filter-pop__retry {
  padding: 6px 18px;
  border-radius: 999px;
  border: 1px solid #1c7bff;
  background: transparent;
  color: #1c7bff;
  cursor: pointer;
}

.league-filter-pop__body {
  flex: 1;
  min-height: 0;
  overflow: auto;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }
}

.league-filter-pop__hint {
  margin: 0 0 12px;
  font-size: 14px;
  font-weight: 400;
  color: #1c7bff;
}

.league-filter-pop__group + .league-filter-pop__group {
  margin-top: 20px;
}

.league-filter-pop__group-label {
  margin: 0 0 10px;
  font-size: 16px;
  line-height: 24px;
  font-weight: 500;
  color: #0b3462;
}

.league-filter-pop__grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px 10px;
}

.league-filter-pop__pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  height: 34px;
  padding: 0 10px;
  border: 0;
  border-radius: 6px;
  background: #fff;
  color: #0b3462;
  font-size: 14px;
  font-weight: 400;
  cursor: pointer;
  transition:
    box-shadow 0.15s ease,
    color 0.15s ease;

  &:hover {
    box-shadow: inset 0 0 0 1px rgba(28, 123, 255, 0.35);
  }

  &--selected {
    background: #fff;
    color: #0b3462;
  }

  &:focus-visible {
    outline: 2px solid rgba(28, 123, 255, 0.45);
    outline-offset: 1px;
  }
}

.league-filter-pop__pill-check {
  flex-shrink: 0;
  display: block;
  width: 18px;
  height: 18px;
  color: #fff;
  fill: #1c7bff;

  &--empty {
    color: rgba(11, 52, 98, 0.5);
    fill: none;
  }
}

.league-filter-pop__pill-label {
  min-width: 0;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: left;
}

.league-filter-pop__footer {
  position: absolute;
  right: 2px;
  bottom: 2px;
  left: 2px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  height: 56px;
  padding: 0 16px;
  border-radius: 0 0 14px 14px;
  background: #fff;
}

.league-filter-pop__modes {
  display: flex;
  align-items: center;
  gap: 22px;
}

.league-filter-pop__mode {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0;
  border: none;
  background: transparent;
  color: #0b3462;
  font-size: 16px;
  cursor: pointer;

  &--active {
    color: #1c7bff;
    font-weight: 500;
  }
}

.league-filter-pop__mode-icon {
  display: block;
  width: 18px;
  height: 18px;
  color: #fff;
  fill: #1c7bff;

  &--empty {
    color: rgba(11, 52, 98, 0.5);
    fill: none;
  }
}

.league-filter-pop__actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.league-filter-pop__confirm {
  width: 108px;
  height: 36px;
  padding: 0 8px;
  border: 1px solid #1c7bff;
  border-radius: 8px;
  background: #fff;
  color: #1c7bff;
  font-size: 16px;
  font-weight: 400;
  cursor: pointer;
  white-space: nowrap;

  &:disabled {
    opacity: 0.72;
    cursor: default;
  }
}

.league-filter-pop__cancel {
  width: 88px;
  height: 36px;
  padding: 0 8px;
  border: 1px solid #ff2d2d;
  border-radius: 8px;
  background: #fff;
  color: #ff2d2d;
  font-size: 16px;
  font-weight: 400;
  cursor: pointer;
}

@keyframes league-filter-spin {
  to { transform: rotate(360deg); }
}
</style>

<!-- Teleport 到 body 的提示不受 scoped 影响，单独写主题样式 -->
<style lang="scss">
.league-filter-tip {
  position: fixed;
  z-index: 4000;
  box-sizing: border-box;
  max-width: min(280px, calc(100vw - 24px));
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid rgba(28, 123, 255, 0.28);
  background: #fff;
  color: #0b3462;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.4;
  letter-spacing: 0.01em;
  word-break: break-word;
  white-space: normal;
  pointer-events: none;
  transform: translate(-50%, -100%);
  box-shadow:
    0 4px 16px rgba(21, 58, 119, 0.14),
    0 0 0 0.8px rgba(255, 255, 255, 0.8) inset;

  &::after {
    content: '';
    position: absolute;
    left: 50%;
    bottom: -5px;
    width: 10px;
    height: 10px;
    border-right: 1px solid rgba(28, 123, 255, 0.28);
    border-bottom: 1px solid rgba(28, 123, 255, 0.28);
    background: #fff;
    transform: translateX(-50%) rotate(45deg);
  }
}
</style>
