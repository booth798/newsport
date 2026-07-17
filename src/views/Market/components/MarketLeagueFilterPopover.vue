<script setup>
/**
 * PC 市场页联赛筛选弹层（对齐 Figma 下拉面板）。
 * 选择逻辑与 H5 `/market/filter` 一致，写入 leagueFilter store；仅用于桌面端。
 */
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';

import { fetchLeagueList, fetchMarketListCounts } from '@/api/match';
import { useLeagueFilterStore } from '@/store/modules/leagueFilter';
import iconCheckedUrl from '@/assets/images/common/icon_checkbox_checked.svg?url';
import iconUncheckedUrl from '@/assets/images/common/icon_checkbox_unchecked.svg?url';

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
const previewCount = ref(0);
const previewLoading = ref(false);
let previewTimer = null;
const rootRef = ref(null);

const INDEX_ENTRIES = ['☆', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''), '#'];
const PINYIN_REFS = [
  ['A', '啊'], ['B', '八'], ['C', '嚓'], ['D', '哒'],
  ['E', '鹅'], ['F', '发'], ['G', '旮'], ['H', '哈'],
  ['J', '击'], ['K', '咔'], ['L', '垃'], ['M', '妈'],
  ['N', '拿'], ['O', '噢'], ['P', '啪'], ['Q', '七'],
  ['R', '日'], ['S', '撒'], ['T', '他'], ['W', '挖'],
  ['X', '夕'], ['Y', '压'], ['Z', '匝'],
];

function leagueDisplayName(league) {
  const name = (league.name || '').trim();
  const shortName = (league.shortName || '').trim();
  const isEn = String(locale.value || '').toLowerCase().startsWith('en');
  return isEn ? (name || shortName) : (shortName || name);
}

function getPinyinInitial(str) {
  if (!str) return '#';
  const ch = str.charAt(0);
  if (/[a-zA-Z]/.test(ch)) return ch.toUpperCase();
  if (!/[\u4e00-\u9fff]/.test(ch)) return '#';
  for (let i = PINYIN_REFS.length - 1; i >= 0; i--) {
    if (ch.localeCompare(PINYIN_REFS[i][1], 'zh-Hans-CN-u-co-pinyin') >= 0) {
      return PINYIN_REFS[i][0];
    }
  }
  return 'A';
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
    const initial = getPinyinInitial(name);
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

const confirmLabel = computed(() => {
  const n = previewCount.value;
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
  const s = new Set(selectedIds.value);
  if (s.has(id)) s.delete(id);
  else s.add(id);
  selectedIds.value = s;
  isSelectAll.value = s.size > 0 && s.size === allLeagues.value.length;
  schedulePreviewCount();
}

function onSelectAll() {
  // 全选可切换：勾选 → 全选；再点取消勾选 → 全部不选
  if (isSelectAll.value) {
    selectedIds.value = new Set();
    isSelectAll.value = false;
    schedulePreviewCount();
    return;
  }
  selectedIds.value = new Set(allLeagues.value.map((l) => l.id));
  isSelectAll.value = true;
  schedulePreviewCount();
}

function onSelectCustom() {
  // 切到自选：退出全选态；若当前为全选集合则清空，便于重新勾选
  if (isSelectAll.value || selectedIds.value.size === allLeagues.value.length) {
    selectedIds.value = new Set();
  }
  isSelectAll.value = false;
  schedulePreviewCount();
}

function finish() {
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
    await refreshPreviewCount();
  } catch {
    error.value = true;
  } finally {
    loading.value = false;
  }
}

/** 预估当前勾选对应的赛事场次，用于「确定(N)」展示（对齐设计稿） */
async function refreshPreviewCount() {
  previewLoading.value = true;
  try {
    if (isSelectAll.value) {
      const res = await fetchMarketListCounts({ period: 'FT' }).catch(() => null);
      const d = res?.data;
      previewCount.value = Number(d?.all ?? d?.total ?? 0) || 0;
      return;
    }
    // 全部不选：场次为 0
    if (selectedIds.value.size === 0) {
      previewCount.value = 0;
      return;
    }
    const names = allLeagues.value
      .filter((l) => selectedIds.value.has(l.id))
      .map(leagueDisplayName);
    const results = await Promise.all(
      names.map((lg) =>
        fetchMarketListCounts({ league: lg, period: 'FT' }).catch(() => null),
      ),
    );
    previewCount.value = results.reduce((acc, r) => {
      const d = r?.data;
      if (!d) return acc;
      return acc + Number(d.all ?? d.total ?? 0);
    }, 0);
  } finally {
    previewLoading.value = false;
  }
}

function schedulePreviewCount() {
  if (previewTimer) clearTimeout(previewTimer);
  previewTimer = setTimeout(() => {
    refreshPreviewCount();
  }, 280);
}

function onDocPointerDown(e) {
  if (!props.modelValue) return;
  const el = rootRef.value;
  if (el && el.contains(e.target)) return;
  // 点击筛选触发按钮由父级 toggle，避免 pointerdown 先关再被 click 打开
  if (e.target.closest?.('[data-league-filter-trigger]')) return;
  cancel();
}

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      loadLeagues();
      document.addEventListener('pointerdown', onDocPointerDown, true);
    } else {
      document.removeEventListener('pointerdown', onDocPointerDown, true);
    }
  },
);

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onDocPointerDown, true);
  if (previewTimer) clearTimeout(previewTimer);
});
</script>

<template>
  <div
    v-show="modelValue"
    ref="rootRef"
    class="league-filter-pop"
    role="dialog"
    :aria-label="t('筛选联赛')"
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
      <div class="league-filter-pop__body">
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
            >
              <img
                class="league-filter-pop__pill-check"
                :src="selectedIds.has(league.id) ? iconCheckedUrl : iconUncheckedUrl"
                width="18"
                height="18"
                alt=""
              />
              <span class="league-filter-pop__pill-label">{{ league.shortName || league.name }}</span>
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
            <img
              class="league-filter-pop__mode-icon"
              :src="isSelectAll ? iconCheckedUrl : iconUncheckedUrl"
              width="18"
              height="18"
              alt=""
            />
            <span>{{ t('全选') }}</span>
          </button>
          <button
            type="button"
            class="league-filter-pop__mode"
            :class="{ 'league-filter-pop__mode--active': !isSelectAll }"
            @click="onSelectCustom"
          >
            <img
              class="league-filter-pop__mode-icon"
              :src="!isSelectAll ? iconCheckedUrl : iconUncheckedUrl"
              width="18"
              height="18"
              alt=""
            />
            <span>{{ t('自选') }}</span>
          </button>
        </div>
        <div class="league-filter-pop__actions">
          <button
            type="button"
            class="league-filter-pop__confirm"
            :disabled="previewLoading"
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
</template>

<style lang="scss" scoped>
@use '@/styles/tools.scss' as *;

.league-filter-pop {
  position: absolute;
  top: calc(100% + 10px);
  left: 0;
  z-index: 30;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  width: min(920px, calc(100vw - 48px));
  max-height: min(520px, calc(100vh - 200px));
  padding: 20px 20px 16px;
  border-radius: 24px;
  background: #fff;
  border: 1px solid #e8eef6;
  box-shadow: 0 12px 40px rgba(21, 58, 119, 0.16);
}

.league-filter-pop__state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  min-height: 200px;
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
  padding-right: 4px;
  scrollbar-width: thin;
}

.league-filter-pop__group + .league-filter-pop__group {
  margin-top: 18px;
}

.league-filter-pop__group-label {
  margin: 0 0 10px;
  font-size: 14px;
  font-weight: 500;
  color: #0b3462;
}

.league-filter-pop__grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 10px 12px;
}

.league-filter-pop__pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  height: 36px;
  padding: 0 10px;
  border: 1px solid #e4eef8;
  border-radius: 10px;
  background: #fff;
  color: #0b3462;
  font-size: 14px;
  font-weight: 400;
  cursor: pointer;
  transition:
    background 0.15s ease,
    border-color 0.15s ease,
    color 0.15s ease;

  &:hover {
    border-color: rgba(28, 123, 255, 0.45);
  }

  &--selected {
    border-color: rgba(28, 123, 255, 0.35);
    background: rgba(28, 123, 255, 0.08);
    color: #1c7bff;
  }
}

.league-filter-pop__pill-check {
  flex-shrink: 0;
  display: block;
  width: 18px;
  height: 18px;
}

.league-filter-pop__pill-label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.league-filter-pop__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px solid #eef3f9;
}

.league-filter-pop__modes {
  display: flex;
  align-items: center;
  gap: 18px;
}

.league-filter-pop__mode {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0;
  border: none;
  background: transparent;
  color: rgba(11, 52, 98, 0.55);
  font-size: 14px;
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
}

.league-filter-pop__actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.league-filter-pop__confirm {
  min-width: 120px;
  height: 40px;
  padding: 0 20px;
  border: none;
  border-radius: 999px;
  background: #1c7bff;
  color: #fff;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(28, 123, 255, 0.28);

  &:disabled {
    opacity: 0.72;
    cursor: default;
  }
}

.league-filter-pop__cancel {
  min-width: 88px;
  height: 40px;
  padding: 0 18px;
  border: 1px solid #ff2d2d;
  border-radius: 999px;
  background: #fff;
  color: #ff2d2d;
  font-size: 15px;
  font-weight: 400;
  cursor: pointer;
}

@keyframes league-filter-spin {
  to { transform: rotate(360deg); }
}
</style>
