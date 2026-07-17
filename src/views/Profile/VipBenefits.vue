<script setup>
import { computed, nextTick, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';

import { fetchVipMe } from '@/api/user';
import AppSideNav from '@/components/AppSideNav.vue';
import { useAppStore } from '@/store/modules/app';
import { useUserStore } from '@/store/modules/user';
import { getImageUrl } from '@/utils/common';

const { t } = useI18n();
const router = useRouter();
const appStore = useAppStore();
const userStore = useUserStore();
const { isMobile } = storeToRefs(appStore);
const {
  isLoggedIn,
  userProfile,
  vipLevelList: levels,
} = storeToRefs(userStore);

const error = ref('');
const activeTab = ref('detail');
const myVip = ref(null);
const selectedPrivilegeLevel = ref(null);
const privilegeLevelsRef = ref(null);
const privilegeDragState = ref({
  pointerId: null,
  startX: 0,
  startScrollLeft: 0,
  moved: false,
  pendingLevel: null,
});
const sideNavItems = computed(() => [
  { key: 'detail', label: t('VIP详情') },
  { key: 'privilege', label: t('VIP特权') },
]);

// 设计稿导出的背景图只用于卡片装饰，VIP 等级图统一使用本地静态资源。
const mobileCardBackground = getImageUrl('vip/vip-card-mobile.png');
const desktopCardBackground = getImageUrl('vip/vip-card-desktop.png');

/** 对齐安卓 VipRightsActivity.vipLevel：优先解析数字 level */
function parseVipLevel(source) {
  if (source == null) return 0;
  if (typeof source === 'number' && Number.isFinite(source)) return Math.max(0, Math.trunc(source));
  const candidates = typeof source === 'object'
    ? [source.level, source.levelName, source.name, source.vipLevel]
    : [source];
  for (const raw of candidates) {
    if (raw == null || raw === '') continue;
    if (typeof raw === 'number' && Number.isFinite(raw)) return Math.max(0, Math.trunc(raw));
    const matched = String(raw).match(/(?:vip\s*)?v?\s*(\d+)/i);
    if (matched) return Math.max(0, Number(matched[1]));
    const asNum = Number(raw);
    if (Number.isFinite(asNum)) return Math.max(0, Math.trunc(asNum));
  }
  return 0;
}

// 当前等级来自 GET /vip/me，与安卓 bindCurrentVip 一致。
const currentLevel = computed(() => parseVipLevel(myVip.value ?? userProfile.value));
const currentLevelName = computed(() => `VIP${currentLevel.value}`);

/**
 * 特权规则对齐安卓 applyVipWithdrawalRule：
 * 选中当前等级时优先用 /vip/me 的 freeWithdrawCount / singleWithdrawLimit；
 * 其它等级用 /vip/levels 的 freeWithdrawCount / (singleWithdrawLimit ?? maxWithdraw)。
 */
const currentPrivilege = computed(() => {
  const selected = Number(selectedPrivilegeLevel.value);
  const levelInfo = levels.value.find((item) => Number(item.level) === selected) || null;
  const isCurrent = selected === currentLevel.value;
  const fromMe = myVip.value || {};

  let freeWithdrawCount = levelInfo?.freeWithdrawCount ?? 0;
  let singleWithdrawLimit = levelInfo?.singleWithdrawLimit ?? levelInfo?.maxWithdraw ?? null;

  if (isCurrent) {
    if (fromMe.freeWithdrawCount != null) freeWithdrawCount = fromMe.freeWithdrawCount;
    if (fromMe.singleWithdrawLimit != null) singleWithdrawLimit = fromMe.singleWithdrawLimit;
  }

  return {
    freeWithdrawCount: Number(freeWithdrawCount) || 0,
    singleWithdrawLimit,
  };
});

/** 总额度对齐安卓：VipMeVO.currentHoldings（持有额=余额+冻结） */
const displayedHoldings = computed(() => {
  const holdings = myVip.value?.currentHoldings;
  if (holdings != null && holdings !== '') return holdings;
  return 0;
});

/** 持有额展示：对齐 AppTools.formatAmount，en-US 固定两位 */
function formatHoldingsAmount(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return '0.00';
  return amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** 门槛/限额展示：对齐安卓 formatVipLimit（#,##0.##）；空值显示 0 */
function formatVipLimit(value) {
  if (value == null || value === '') return '0';
  const amount = Number(value);
  if (!Number.isFinite(amount)) return '0';
  return amount.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

/** 特权列表文案对齐安卓 vip_level_format：VIP%1$d */
function getLevelName(level) {
  const n = typeof level === 'object' ? Number(level?.level) : Number(level);
  return `VIP${Number.isFinite(n) ? n : 0}`;
}

function getLevelImage(level) {
  // 等级资源按接口 level 命名，未识别的值回退至 VIP0，避免图片请求 404。
  const normalizedLevel = Number.isInteger(Number(level)) && Number(level) >= 0 && Number(level) <= 16
    ? Number(level)
    : 0;
  return getImageUrl(`vip/vip_level_${normalizedLevel}.svg`);
}

function getLevelLogo(level) {
  // 等级列表与特权选择器使用同一套本地图标资源。
  const normalizedLevel = Number.isInteger(Number(level)) && Number(level) >= 0 && Number(level) <= 16
    ? Number(level)
    : 0;
  return getImageUrl(`vip/vip_level_logo_${normalizedLevel}.svg`);
}

function startPrivilegeDrag(event, level = null) {
  if (!privilegeLevelsRef.value || event.pointerType === 'touch') return;
  privilegeDragState.value = {
    pointerId: event.pointerId,
    startX: event.clientX,
    startScrollLeft: privilegeLevelsRef.value.scrollLeft,
    moved: false,
    pendingLevel: level,
  };
  privilegeLevelsRef.value.setPointerCapture?.(event.pointerId);
}

function dragPrivilegeLevels(event) {
  const state = privilegeDragState.value;
  if (!privilegeLevelsRef.value || state.pointerId !== event.pointerId) return;

  const offset = event.clientX - state.startX;
  if (Math.abs(offset) > 3) state.moved = true;
  privilegeLevelsRef.value.scrollLeft = state.startScrollLeft - offset;
}

function endPrivilegeDrag(event) {
  const state = privilegeDragState.value;
  if (state.pointerId !== event.pointerId) return;
  privilegeLevelsRef.value?.releasePointerCapture?.(event.pointerId);

  // 只有按下与松开之间没有形成拖拽时，才将当前等级切换为选中状态。
  if (!state.moved && state.pendingLevel !== null) {
    selectPrivilegeLevel(state.pendingLevel);
  }

  // 保留 moved 到 click 事件结束，避免拖拽松手后生成的 click 误选等级。
  setTimeout(() => {
    privilegeDragState.value = {
      pointerId: null,
      startX: 0,
      startScrollLeft: 0,
      moved: false,
      pendingLevel: null,
    };
  }, 0);
}

function selectPrivilegeLevel(level) {
  selectedPrivilegeLevel.value = Number(level);
  // 点击选中后，PC 与移动端都将目标等级平滑滚动到可视区域中央。
  scrollPrivilegeLevelToCenter(level);
}

function handlePrivilegeClick(level) {
  // 触屏设备依赖原生 click；鼠标拖拽产生的 click 在此被过滤。
  if (privilegeDragState.value.moved || privilegeDragState.value.pointerId !== null) return;
  selectPrivilegeLevel(level);
}

/**
 * 将指定等级项平滑滚动到容器水平居中位置，
 * 通过 offsetLeft 计算目标偏移量，使选中项视觉居中。
 */
function scrollPrivilegeLevelToCenter(level) {
  nextTick(() => {
    const container = privilegeLevelsRef.value;
    if (!container) return;
    const items = container.querySelectorAll('.vip-privilege-levels__item');
    const idx = levels.value.findIndex((l) => Number(l.level) === Number(level));
    const target = items[idx];
    if (!target) return;
    // 使用元素相对视口的位置换算内容区坐标，避免 PC 端父级 padding 影响 offsetLeft。
    const containerRect = container.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const targetCenter = container.scrollLeft
      + targetRect.left
      - containerRect.left
      + (targetRect.width / 2);
    const scrollLeft = targetCenter - (container.clientWidth / 2);
    container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
  });
}

async function loadData() {
  error.value = '';
  try {
    // 等级配置跨页面复用；未登录时仅展示公开等级权益，避免请求个人 VIP 接口。
    const requests = [userStore.loadVipLevels()];
    if (isLoggedIn.value) requests.push(fetchVipMe());
    const [, vipResponse] = await Promise.all(requests);
    myVip.value = vipResponse?.data || null;
    // 进入特权 Tab 时默认展示当前会员等级的权益，并在列表渲染后滚动居中。
    selectedPrivilegeLevel.value = currentLevel.value;
    scrollPrivilegeLevelToCenter(currentLevel.value);
  } catch {
    error.value = t('加载失败');
  } finally {
  }
}

onMounted(loadData);
</script>

<template>
  <div class="vip-benefits">
    <div class="sticky-container" v-if="isMobile">
      <div class="vip-details-navbar">
        <img class="back-icon" :src="getImageUrl('common/icon_nav_back_market.svg')" @click="router.back()">
        <div class="title-container">
          <img :src="getImageUrl('vip/title_left_icon.svg')">
          <span>{{ t('VIP详情') }}</span>
          <img :src="getImageUrl('vip/title_right_icon.svg')">
        </div>
      </div>
    </div>
    <div class="vip-benefits__layout">
      <AppSideNav :items="sideNavItems" :active-key="activeTab" @select="activeTab = $event" />

      <main class="vip-benefits__content">
        <section class="vip-card">
          <img class="vip-card__background vip-card__background--mobile" :src="mobileCardBackground" alt="" />
          <img class="vip-card__background vip-card__background--desktop" :src="desktopCardBackground" alt="" />
          <img class="vip-card__level" :src="getLevelImage(currentLevel)" :alt="currentLevelName" />
          <!-- 对齐安卓：顶部始终展示总额度 = currentHoldings，不随 Tab 切换 -->
          <p class="vip-card__amount">
            <span>{{ t('总额度') }}：</span>
            <span>{{ formatHoldingsAmount(displayedHoldings) }}</span>
          </p>
        </section>

        <nav class="vip-tabs" :aria-label="t('VIP权益')">
          <button v-for="tab in [{ key: 'detail', label: t('VIP详情') }, { key: 'privilege', label: t('VIP特权') }]"
            :key="tab.key" type="button" :class="{ 'btn--primary active': activeTab === tab.key }"
            @click="activeTab = tab.key">
            {{ tab.label }}
          </button>
        </nav>

        <section v-if="activeTab === 'detail'" class="vip-panel">
          <h2>{{ t('各等级门槛') }}</h2>
          <template v-if="levels.length">
            <template v-if="isMobile">
              <div class="vip-level-grid">
                <article v-for="level in levels" :key="level.level" class="vip-level-card">
                  <img :src="getLevelLogo(level.level)" :alt="getLevelName(level)" />
                  <span>{{ t('总额度') }}</span>
                  <b>{{ formatHoldingsAmount(level.minTotalDeposit) }}</b>
                </article>
              </div>
            </template>
            <template v-else>
              <div class="vip-level-grid">
                <article v-for="level in levels" :key="level.level" class="vip-level-card">
                  <img :src="getLevelLogo(level.level)" :alt="getLevelName(level)" />
                  <div class="vip-level-card__name">{{ getLevelName(level) }}</div>
                  <b>{{ formatHoldingsAmount(level.minTotalDeposit) }}<span>（{{ t('总额度') }}）</span></b>
                </article>
              </div>
            </template>
          </template>
        </section>

        <section v-if="activeTab === 'detail'" class="vip-panel vip-level-notes">
          <div>
            <h2>{{ t('门槛条件释义') }}</h2>
            <p>{{ t('总额度释义') }}</p>
          </div>
          <div>
            <h2>{{ t('等级升降说明') }}</h2>
            <p>{{ t('等级升降说明内容') }}</p>
          </div>
          <div>
            <h2>{{ t('其他说明') }}</h2>
            <p>{{ t('其他说明说明内容') }}</p>
          </div>
        </section>

        <template v-else>
          <section class="vip-panel vip-panel--privileges">
            <h2>{{ t('各等级权限') }}</h2>
            <div
              ref="privilegeLevelsRef"
              class="vip-privilege-levels"
              :class="{ 'vip-privilege-levels--dragging': privilegeDragState.pointerId !== null }"
              @pointerdown="startPrivilegeDrag"
              @pointermove="dragPrivilegeLevels"
              @pointerup="endPrivilegeDrag"
              @pointercancel="endPrivilegeDrag"
            >
              <div class="vip-privilege-levels__item" v-for="level in levels" :key="level.level"
                :class="{ 'vip-privilege-levels__item--active': Number(level.level) === selectedPrivilegeLevel }"
                @pointerdown.stop="startPrivilegeDrag($event, level.level)"
                @click="handlePrivilegeClick(level.level)">
                <img :src="getLevelLogo(level.level)" :alt="getLevelName(level)" />
                <div class="vip-name">{{ getLevelName(level) }}</div>
              </div>
            </div>

          </section>
          <section class="vip-panel vip-privilege-description">
            <div class="vip-privilege-summary">
              <div>
                <dt>{{ t('提现优惠') }}</dt>
                <!-- 对齐安卓 vip_withdraw_count_format：%d 次 -->
                <dd>{{ currentPrivilege.freeWithdrawCount }} {{ t('次') }}</dd>
              </div>
              <div>
                <dt>{{ t('提现限额') }}</dt>
                <dd>{{ formatVipLimit(currentPrivilege.singleWithdrawLimit) }}</dd>
              </div>
            </div>
            <div>
              <h2>{{ t('提现优惠') }}</h2>
              <p>{{ t('提现优惠说明') }}</p>
            </div>
            <div>
              <h2>{{ t('提现限额') }}</h2>
              <p>{{ t('提现限额说明') }}</p>
            </div>
          </section>
        </template>
      </main>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/tools.scss' as *;

.vip-benefits {
  color: #0b3462;

  @include web-only {
    min-height: 100vh;
    margin: -18px -8px 0;
  }

  @include mobile-only {
    min-height: 100dvh;
    margin: -18px -8px 0;
    padding-top: 20px;
    padding-bottom: 20px;
    background: #D1DFFA;
  }

  .sticky-container {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 48px;
    z-index: 10;
  }

  .vip-details-navbar {
    position: relative;
    height: 100%;

    .back-icon {
      position: absolute;
      width: 36px;
      height: 36px;
      left: 20px;
      top: 50%;
      transform: translateY(-50%);
      cursor: pointer;
    }

    .title-container {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 16px;
      font-size: 16px;
      font-weight: 500;
      color: #0B3462;
      position: absolute;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);

      img {
        width: 17px;
        height: 5px;
      }
    }
  }
}

.vip-benefits__layout {
  @include web-only {
    display: flex;
    gap: 20px;
    width: 1000px;
    margin: 10px auto 60px;
  }

  @include mobile-only {
    display: block;
    width: auto;
    margin: 0;
  }
}

.vip-panel {
  background: #fff;
  box-shadow: 0 6px 20px rgba(21, 58, 119, .18);
}

.vip-benefits__content {
  min-width: 0;

  @include web-only {
    width: 800px;
  }

  @include mobile-only {
    width: 100%;
  }
}

.vip-card {
  position: relative;
  overflow: hidden;
  color: #fdfefe;

  @include web-only {
    height: 200px;
    padding: 34px 30px;
    border: 1px solid #fff;
    border-radius: 32px;
    box-shadow: 0 6px 20px rgba(21, 58, 119, .18);
    background: linear-gradient(90deg, #307CFB 0%, #D1DEFC 100%);
  }

  @include mobile-only {
    height: 214px;
    padding: 73px 30px 0;
    border: 0;
    border-radius: 0;
    box-shadow: none;
  }
}

.vip-card__background {
  position: absolute;
  object-fit: cover;
  pointer-events: none;
}

.vip-card__background--desktop {
  @include web-only {
    height: 200px;
    right: 0px;
    top: 0;
  }

  @include mobile-only {
    display: none;
  }
}

.vip-card__background--mobile {
  @include web-only {
    display: none;
  }

  @include mobile-only {
    display: block;
    width: 100%;
    height: 214px;
    left: 0;
    top: 0;
  }
}

.vip-card__level {
  position: relative;
  display: block;
  object-fit: contain;
  object-position: left center;

  @include web-only {
    width: 150px;
    height: 48px;
  }

  @include mobile-only {
    width: 124px;
    height: 40px;
  }
}

.vip-card__amount,
.vip-card__privilege {
  position: absolute;
  left: 30px;
  margin: 0;

  @include web-only {
    bottom: 20px;
    font-size: 14px;
  }

  @include mobile-only {
    bottom: 30px;
    font-size: 12px;
  }
}

.vip-card__amount {
  color: #fef38e;
  font-weight: 500;
  @include web-only {
    font-size: 18px;
    span {
      &:nth-child(2) {
        color: #FEF38E;
        font-weight: 500;
      }
    }
  }

  @include mobile-only {
    font-size: 16px;

    span {
      &:nth-child(2) {
        display: block;
        color: #FEF38E;
        margin-top: 2px;
      }
    }
  }
}

.vip-card__amount span {
  color: #fdfefe;
  font-size: 14px;
  font-weight: 400;
}

.vip-tabs {
  @include web-only {
    display: none;
  }

  @include mobile-only {
    display: flex;
    justify-content: center;
    gap: 11px;
    margin: 0 18px;
    padding: 6px 8px;
    border: 1px solid #fff;
    border-radius: 30px;
    box-shadow: 0 4px 10px #153A772E;
    background: #EAF1F9;
  }

  button {
    @include mobile-only {
      flex: 1;
      height: 36px;
      border-radius: 32px;
      color: #1c7bff;
      font-size: 16px;
      cursor: pointer;
    }
  }

  .active {
    @include mobile-only {
      color: #fff !important;
    }
  }
}

.vip-panel {
  @include web-only {
    margin-top: 20px;
    border-radius: 32px;
    padding: 24px;
  }

  @include mobile-only {
    margin: 8px;
    padding: 14px 8px;
    border-radius: 16px;
    box-shadow: none;
  }

  h2 {
    margin: 0;

    @include web-only {
      font-size: 16px;
    }

    @include mobile-only {
      color: #1c7bff;
      font-size: 16px;
    }
  }
}

.vip-level-grid {
  display: grid;

  @include web-only {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
    margin-top: 14px;
    .vip-level-card__name {
      font-size: 14px;
      color: #0B3462;
      font-weight: 400;
    }
    b span {
      font-weight: 400;
    }
  }

  @include mobile-only {
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 3px;
    margin-top: 8px;
  }
}

.vip-level-card {
  position: relative;
  border: 1px solid #e4f0fe;

  @include web-only {
    display: grid;
    grid-template-columns: 70px 1fr auto;
    align-items: center;
    height: 80px;
    padding: 0 12px;
    border-radius: 12px;
  }

  @include mobile-only {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    height: 96px;
    padding: 4px;
    border-radius: 16px;
    text-align: center;
  }

  img {
    width: 60px;
    object-fit: contain;

    @include web-only {
      height: 60px;
    }

    @include mobile-only {
      height: 54px;
    }
  }

  strong {
    @include web-only {
      font-size: 14px;
    }

    @include mobile-only {
      font-size: 10px;
    }
  }

  span {
    color: rgba(11, 52, 98, .5);

    @include web-only {
      font-size: 14px;
    }

    @include mobile-only {
      font-size: 10px;
    }
  }

  b {
    color: #1c7bff;

    @include web-only {
      font-size: 16px;
    }

    @include mobile-only {
      margin-top: 2px;
      color: #0B3462;
      font-size: 10px;
    }
  }
}


.vip-privilege-levels {
  display: flex;
  overflow-x: auto;

  &::-webkit-scrollbar {
    display: none;
  }

  @include web-only {
    gap: 10px;
    margin-top: 14px;
    padding-bottom: 2px;
    cursor: grab;
    user-select: none;
    /* 首尾留白，使边缘等级项也能滚动到居中位置 */
    scroll-padding-inline: 50%;
  }

  @include mobile-only {
    gap: 10px;
    margin-top: 8px;
    padding-bottom: 2px;
    /* 首尾留白，使边缘等级项也能滚动到居中位置 */
    scroll-padding-inline: 50%;
  }

  &--dragging {
    @include web-only {
      cursor: grabbing;
    }
  }

  .vip-privilege-levels__item {
    border: 1px solid #e4f0fe;
    border-radius: 12px;
    color: #0b3462;
    background: #fff;
    cursor: pointer;
   
    @include web-only {
      flex: 0 0 130px;
      height: 102px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      .vip-name {
        margin-top: 6px;
      }
    }

    @include mobile-only {
      flex: 0 0 83px !important;
      width: 83px;
      height: 80px;
    }

    &.vip-privilege-levels__item--active {
      border-color: #1c7bff !important;

      .vip-name {
        color: #1C7BFF;
      }
    }

    img {
      display: block;
      margin: 0 auto;
      object-fit: contain;

      @include web-only {
        width: 60px;
        height: 60px;
      }

      @include mobile-only {
        width: 56px;
        height: 54px;
      }
    }

    .vip-name {
      text-align: center;

      @include web-only {
        font-size: 14px;
      }

      @include mobile-only {
        font-size: 10px;
      }
    }
  }
}

.vip-privilege-summary {
  border-radius: 16px;

  @include web-only {
    margin: 20px 0 0;
  }

  div {
    display: flex;
    justify-content: space-between;
    align-items: center;

    @include web-only {
      min-height: 48px;
    }

    @include mobile-only {
      min-height: 30px;
    }

    +div {
      border-top: 1px solid #e4f0fe;
    }
  }

  dt {
    color: rgba(11, 52, 98, .5);

    @include web-only {
      font-size: 14px;
    }

    @include mobile-only {
      font-size: 12px;
    }
  }

  dd {
    color: #1c7bff;
    font-weight: 400;

    @include web-only {
      font-size: 16px;
    }

    @include mobile-only {
      font-size: 12px;
    }
  }
}

.vip-privilege-description {
  @include web-only {
    display: grid;
    min-height: 400px;
  }

  @include mobile-only {
    padding: 18px 8px;
    min-height: 418px;
  }

  h2 {
    color: #1c7bff;

    @include web-only {
      font-size: 18px;
    }

    @include mobile-only {
      font-size: 16px;
      font-weight: 400;
      margin-top: 30px;
    }
  }

  p {
    margin: 8px 0 0;
    color: #0B3462;

    @include web-only {
      font-size: 14px;
      line-height: 26px;
    }

    @include mobile-only {
      font-size: 12px;
      line-height: 20px;
    }
  }
}

.vip-level-notes {
  h2 {
    color: #1c7bff;
    font-weight: 400;
  }

  p {
    margin: 8px 0 0;
    color: #0b3462;

    @include web-only {
      font-size: 14px;
      line-height: 26px;
    }

    @include mobile-only {
      font-size: 12px;
      line-height: 20px;
    }
  }

  div + div {
    margin-top: 18px;
  }
}
</style>
