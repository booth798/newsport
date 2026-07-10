<script setup>
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';

import { fetchVipMe } from '@/api/user';
import { useUserStore } from '@/store/modules/user';

const { t } = useI18n();
const router = useRouter();
const userStore = useUserStore();
// VIP 等级列表由全局 user store 维护，个人页和 VIP 中心复用同一份数据。
const { vipLevelList: levels } = storeToRefs(userStore);

const loading = ref(true);
const error = ref('');
const myVip = ref(null);

const progressPercent = computed(() => {
  if (!myVip.value || !myVip.value.nextLevelBet) return 0;
  const total = Number(myVip.value.nextLevelBet);
  if (total <= 0) return 100;
  const current = Number(myVip.value.totalBet) || 0;
  return Math.min(Math.round((current / total) * 100), 100);
});

const currentLevelName = computed(() => {
  if (!myVip.value) return '';
  const matched = levels.value.find((lv) => lv.level === myVip.value.level);
  return matched?.name || `VIP${myVip.value.level}`;
});

const nextLevelName = computed(() => {
  if (!myVip.value) return '';
  const nextLevel = myVip.value.level + 1;
  const matched = levels.value.find((lv) => lv.level === nextLevel);
  return matched?.name || '';
});

function formatMoney(val) {
  if (val == null) return '0';
  const n = Number(val);
  if (isNaN(n)) return String(val);
  return n.toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

async function loadData() {
  loading.value = true;
  error.value = '';
  try {
    // 等级列表走全局缓存，我的 VIP 信息仍按页面进入时实时请求。
    const [, meRes] = await Promise.all([
      userStore.loadVipLevels(),
      fetchVipMe(),
    ]);
    myVip.value = meRes.data || null;
  } catch {
    error.value = t('加载失败');
  } finally {
    loading.value = false;
  }
}

function goToService() {
  router.push('/service');
}

onMounted(loadData);
</script>

<template>
  <div class="vip-page">
    <div class="vip-page__inner">
      <!-- 加载中 -->
      <div v-if="loading" class="vip-state">
        <div class="vip-spinner" />
        <span>{{ t('加载中') }}</span>
      </div>

      <!-- 错误态 -->
      <div v-else-if="error" class="vip-state vip-state--error">
        <span>{{ error }}</span>
        <button type="button" class="btn btn--primary vip-state__retry" @click="loadData">
          {{ t('重试') }}
        </button>
      </div>

      <template v-else>
        <!-- 顶部VIP卡片 -->
        <section class="vip-hero">
          <div class="vip-hero__body">
            <div class="vip-hero__level-badge">
              {{ currentLevelName }}
            </div>
            <h2 class="vip-hero__title">{{ t('VIP中心') }}</h2>
            <p class="vip-hero__desc">
              {{ t('尊享专属特权与福利') }}
            </p>
          </div>

          <div class="vip-progress">
            <div class="vip-progress__labels">
              <span>{{ currentLevelName }}</span>
              <span v-if="nextLevelName">{{ nextLevelName }}</span>
            </div>
            <div class="vip-progress__bar">
              <div class="vip-progress__fill" :style="{ width: `${progressPercent}%` }" />
            </div>
            <div class="vip-progress__info">
              <span>
                {{ t('当前投注') }}:
                <strong>{{ formatMoney(myVip?.totalBet) }}</strong>
              </span>
              <span v-if="myVip?.nextLevelBet">
                {{ t('下一等级') }}:
                <strong>{{ formatMoney(myVip.nextLevelBet) }}</strong>
              </span>
            </div>
          </div>
        </section>

        <!-- 等级列表 -->
        <section class="vip-levels" aria-label="vip-levels">
          <h3 class="vip-levels__title">{{ t('等级特权') }}</h3>

          <div v-if="levels.length === 0" class="vip-state">
            <span>{{ t('暂无数据') }}</span>
          </div>

          <ul v-else class="vip-level-list">
            <li
              v-for="lv in levels"
              :key="lv.level"
              class="vip-level-card card-default"
              :class="{ 'vip-level-card--current': myVip && lv.level === myVip.level }"
            >
              <div class="vip-level-card__header">
                <span class="vip-level-card__name">{{ lv.name || `VIP${lv.level}` }}</span>
                <span
                  v-if="myVip && lv.level === myVip.level"
                  class="vip-level-card__badge"
                >
                  {{ t('当前等级') }}
                </span>
              </div>
              <div class="vip-level-card__body">
                <div class="vip-level-card__requirement">
                  <span class="vip-level-card__label">{{ t('所需投注额') }}</span>
                  <strong class="vip-level-card__amount">{{ formatMoney(lv.requiredBet || lv.minBet) }}</strong>
                </div>
                <p v-if="lv.description || lv.privileges" class="vip-level-card__desc">
                  {{ lv.description || lv.privileges }}
                </p>
              </div>
            </li>
          </ul>
        </section>

        <!-- 联系客服按钮 -->
        <div class="vip-actions">
          <button type="button" class="btn btn--primary vip-actions__btn" @click="goToService">
            {{ t('联系客服') }}
          </button>
        </div>
      </template>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/tools.scss' as *;

.vip-page {
  width: 100%;
  max-width: 100vw;
  min-height: 100vh;
  min-height: 100dvh;
  overflow-x: hidden;
  background: var(--theme-bg);

  @include web-only {
    padding: 10px 30px $spacing-2xl;
  }

  @include mobile-only {
    padding: 0 $spacing-sm $spacing-md;
  }
}

.vip-page__inner {
  margin: 0 auto;

  @include web-only {
    width: min(100%, 860px);
  }

  @include mobile-only {
    width: 100%;
  }
}

// --- 通用状态 ---

.vip-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: $spacing-sm;
  min-height: 240px;
  color: var(--theme-text-1);
  font-size: $font-size-md;
}

.vip-state--error {
  color: var(--auxiliary-2);
}

.vip-state__retry {
  height: 32px;
  padding: 0 $spacing-lg;
  border-radius: $radius-pill;
  font-size: $font-size-sm;
}

.vip-spinner {
  width: 24px;
  height: 24px;
  border: 3px solid var(--theme-divider);
  border-top-color: var(--theme-primary);
  border-radius: 50%;
  animation: vip-spin 0.8s linear infinite;
}

@keyframes vip-spin {
  to { transform: rotate(360deg); }
}

// --- VIP 顶部卡片 ---

.vip-hero {
  position: relative;
  overflow: hidden;
  color: var(--auxiliary-1);
  background: linear-gradient(135deg, #0f6fff 0%, #2888ff 50%, #6a3de8 100%);

  @include web-only {
    border-radius: $radius-xl;
    padding: $spacing-3xl;
  }

  @include mobile-only {
    border-radius: $radius-lg;
    padding: $spacing-xl $spacing-lg;
  }
}

.vip-hero__body {
  text-align: center;
}

.vip-hero__level-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: $spacing-xs $spacing-lg;
  border-radius: $radius-pill;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(4px);
  font-weight: 700;

  @include web-only {
    font-size: $font-size-xl;
    height: 40px;
  }

  @include mobile-only {
    font-size: $font-size-base;
    height: 32px;
  }
}

.vip-hero__title {
  margin: $spacing-md 0 $spacing-xs;
  font-weight: 800;

  @include web-only {
    font-size: 28px;
  }

  @include mobile-only {
    font-size: $font-size-xl;
  }
}

.vip-hero__desc {
  margin: 0;
  color: rgba(255, 255, 255, 0.82);

  @include web-only {
    font-size: $font-size-base;
  }

  @include mobile-only {
    font-size: $font-size-sm;
  }
}

// --- 进度条 ---

.vip-progress {
  margin-top: $spacing-2xl;
}

.vip-progress__labels {
  display: flex;
  justify-content: space-between;
  margin-bottom: $spacing-xs;
  font-size: $font-size-sm;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
}

.vip-progress__bar {
  height: 8px;
  border-radius: $radius-pill;
  background: rgba(255, 255, 255, 0.2);
  overflow: hidden;
}

.vip-progress__fill {
  height: 100%;
  border-radius: $radius-pill;
  background: var(--auxiliary-1);
  transition: width 0.6s ease;
}

.vip-progress__info {
  display: flex;
  justify-content: space-between;
  margin-top: $spacing-sm;
  color: rgba(255, 255, 255, 0.75);

  @include web-only {
    font-size: $font-size-md;
  }

  @include mobile-only {
    font-size: $font-size-sm;
  }

  strong {
    font-family: $font-family-num, $font-family-base;
    color: var(--auxiliary-1);
  }
}

// --- 等级列表 ---

.vip-levels {
  @include web-only {
    margin-top: $spacing-3xl;
  }

  @include mobile-only {
    margin-top: $spacing-xl;
  }
}

.vip-levels__title {
  margin: 0 0 $spacing-lg;
  color: var(--theme-text);
  font-weight: 700;

  @include web-only {
    font-size: $font-size-xl;
  }

  @include mobile-only {
    font-size: $font-size-lg;
  }
}

.vip-level-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: $spacing-md;
}

.vip-level-card {
  border-radius: $radius-lg;
  transition: transform 0.18s ease, box-shadow 0.18s ease;

  @include web-only {
    padding: $spacing-xl $spacing-2xl;
  }

  @include mobile-only {
    padding: $spacing-lg;
  }
}

.vip-level-card--current {
  border: 2px solid var(--theme-primary);
  box-shadow: 0 4px 16px rgba(28, 123, 255, 0.12);
}

.vip-level-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $spacing-sm;
}

.vip-level-card__name {
  color: var(--theme-text);
  font-weight: 700;

  @include web-only {
    font-size: $font-size-lg;
  }

  @include mobile-only {
    font-size: $font-size-base;
  }
}

.vip-level-card__badge {
  display: inline-flex;
  align-items: center;
  height: 24px;
  padding: 0 $spacing-md;
  border-radius: $radius-pill;
  background: var(--theme-primary);
  color: var(--auxiliary-1);
  font-size: $font-size-sm;
  font-weight: 600;
}

.vip-level-card__body {
  margin-top: $spacing-sm;
}

.vip-level-card__requirement {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
}

.vip-level-card__label {
  color: var(--theme-text-1);
  font-size: $font-size-sm;
}

.vip-level-card__amount {
  font-family: $font-family-num, $font-family-base;
  color: var(--theme-primary);

  @include web-only {
    font-size: $font-size-lg;
  }

  @include mobile-only {
    font-size: $font-size-base;
  }
}

.vip-level-card__desc {
  margin: $spacing-sm 0 0;
  color: var(--theme-text-1);
  font-size: $font-size-sm;
  line-height: 1.6;
}

// --- 底部操作 ---

.vip-actions {
  display: flex;
  justify-content: center;

  @include web-only {
    margin-top: $spacing-3xl;
    padding-bottom: $spacing-2xl;
  }

  @include mobile-only {
    margin-top: $spacing-xl;
    padding-bottom: $spacing-lg;
  }
}

.vip-actions__btn {
  border-radius: $radius-pill;
  font-weight: 700;

  @include web-only {
    height: 48px;
    padding: 0 $spacing-4xl;
    font-size: $font-size-lg;
  }

  @include mobile-only {
    height: 44px;
    padding: 0 $spacing-3xl;
    font-size: $font-size-base;
  }
}
</style>
