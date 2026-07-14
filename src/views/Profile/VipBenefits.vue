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
  loggedInAssetsFormatted,
  userProfile,
  vipLevelList: levels,
} = storeToRefs(userStore);

const error = ref('');
const activeTab = ref('detail');
const myVip = ref(null);
const selectedPrivilegeLevel = ref(null);
const privilegeLevelsRef = ref(null);
const privilegeDragState = ref({ pointerId: null, startX: 0, startScrollLeft: 0, moved: false });
const sideNavItems = computed(() => [
  { key: 'detail', label: t('VIP详情') },
  { key: 'privilege', label: t('VIP特权') },
]);

// 设计稿导出的背景图只用于卡片装饰，VIP 等级图统一使用本地静态资源。
const mobileCardBackground = getImageUrl('vip/vip-card-mobile.png');
const desktopCardBackground = getImageUrl('vip/vip-card-desktop.png');

const currentLevel = computed(() => Number(userProfile.value?.level ?? myVip.value?.level) || 0);
const currentLevelInfo = computed(
  () => levels.value.find((item) => Number(item.level) === currentLevel.value) || levels.value[0] || null,
);
const currentLevelName = computed(
  () => currentLevelInfo.value?.name || `VIP${currentLevel.value}`,
);
const selectedPrivilegeInfo = computed(
  () => levels.value.find((item) => Number(item.level) === selectedPrivilegeLevel.value)
    || currentLevelInfo.value,
);
const currentPrivilege = computed(() => ({
  freeWithdrawCount: selectedPrivilegeInfo.value?.freeWithdrawCount ?? 0,
  maxWithdraw: selectedPrivilegeInfo.value?.maxWithdraw ?? 0,
}));
const displayedAmount = computed(
  () => myVip.value?.totalDeposit ?? myVip.value?.totalBet ?? loggedInAssetsFormatted.value ?? 0,
);

function formatAmount(value) {
  const amount = Number(value);
  return Number.isFinite(amount)
    ? amount.toLocaleString('zh-CN', { maximumFractionDigits: 2 })
    : '0';
}

function getLevelName(level) {
  return level.name || `VIP${level.level}`;
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

function startPrivilegeDrag(event) {
  if (!privilegeLevelsRef.value || event.pointerType === 'touch') return;
  privilegeDragState.value = {
    pointerId: event.pointerId,
    startX: event.clientX,
    startScrollLeft: privilegeLevelsRef.value.scrollLeft,
    moved: false,
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
  if (privilegeDragState.value.pointerId !== event.pointerId) return;
  privilegeLevelsRef.value?.releasePointerCapture?.(event.pointerId);
  setTimeout(() => {
    privilegeDragState.value = { pointerId: null, startX: 0, startScrollLeft: 0, moved: false };
  }, 0);
}

function selectPrivilegeLevel(level) {
  // 点击始终优先切换等级，拖动仅改变列表滚动位置。
  selectedPrivilegeLevel.value = Number(level);
  scrollPrivilegeLevelToCenter(level);
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
    const scrollLeft = target.offsetLeft - (container.clientWidth / 2) + (target.offsetWidth / 2);
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
    // 进入特权 Tab 时默认展示当前会员等级的权益，并滚动居中。
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
          <p v-if="activeTab === 'detail'" class="vip-card__amount">
            <span>{{ t('总额度') }}：</span>
            <span>{{ formatAmount(displayedAmount) }}</span>
          </p>
          <p v-else class="vip-card__privilege">{{ t('提现优惠') }}：{{ currentPrivilege.freeWithdrawCount }}{{ t('次') }}
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
                  <b>{{ formatAmount(level.minTotalDeposit) }}</b>
                </article>
              </div>
            </template>
            <template v-else>
              <div class="vip-level-grid">
                <article v-for="level in levels" :key="level.level" class="vip-level-card">
                  <img :src="getLevelLogo(level.level)" :alt="getLevelName(level)" />
                  <div class="vip-level-card__name">{{level.name }}</div>
                  <b>{{ formatAmount(level.minTotalDeposit) }}<span>（{{ t('总额度') }}）</span></b>
                </article>
              </div>
            </template>
          </template>
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
                @pointerdown.stop="startPrivilegeDrag($event); selectPrivilegeLevel(level.level)">
                <img :src="getLevelLogo(level.level)" :alt="getLevelName(level)" />
                <div class="vip-name">{{ getLevelName(level) }}</div>
              </div>
            </div>

          </section>
          <section class="vip-panel vip-privilege-description">
            <div class="vip-privilege-summary">
              <div>
                <dt>{{ t('提现优惠') }}</dt>
                <dd>{{ currentPrivilege.freeWithdrawCount }}{{ t('次') }}</dd>
              </div>
              <div>
                <dt>{{ t('提现限额') }}</dt>
                <dd>{{ formatAmount(currentPrivilege.maxWithdraw) }}</dd>
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
    background: linear-gradient(90deg, #307cfb, #d1defc);
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
</style>
