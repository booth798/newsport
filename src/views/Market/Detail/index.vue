<script setup>
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';

const { t } = useI18n();
const route = useRoute();

const activeTab = ref('fulltime');
const buyType = ref('standard');
const buyAmount = ref('');
const showBuyPanel = ref(false);
const selectedOdds = ref(null);

const match = ref({
  id: route.params.id,
  league: '欧冠',
  date: '03-19 02:30',
  homeTeam: '亚特兰大',
  awayTeam: '拜仁慕尼黑',
  volume: '10.00M',
});

const results = ref([
  { label: '主胜', odds: 2.45, trend: 'up' },
  { label: '平局', odds: 3.20, trend: 'stable' },
  { label: '客胜', odds: 2.80, trend: 'down' },
]);

const halfResults = ref([
  { label: '主胜', odds: 2.90, trend: 'up' },
  { label: '平局', odds: 2.40, trend: 'stable' },
  { label: '客胜', odds: 3.50, trend: 'down' },
]);

const currentResults = computed(() =>
  activeTab.value === 'fulltime' ? results.value : halfResults.value
);

const selectOdds = (item) => {
  selectedOdds.value = item;
  showBuyPanel.value = true;
};

const closeBuyPanel = () => {
  showBuyPanel.value = false;
  selectedOdds.value = null;
  buyAmount.value = '';
};
</script>

<template>
  <div class="market-detail">
    <div class="market-detail__inner">
      <!-- 返回 -->
      <div class="market-detail__nav">
        <RouterLink to="/market" class="back-link">← {{ t('返回') }}</RouterLink>
      </div>

      <!-- 赛事头部 -->
      <div class="match-header card-default">
        <div class="match-header__league">{{ match.league }}</div>
        <div class="match-header__teams">
          <div class="match-header__team">
            <div class="team-avatar">{{ match.homeTeam.charAt(0) }}</div>
            <span class="team-name">{{ match.homeTeam }}</span>
          </div>
          <div class="match-header__center">
            <span class="match-header__vs">VS</span>
            <span class="match-header__date">{{ match.date }}</span>
          </div>
          <div class="match-header__team">
            <div class="team-avatar">{{ match.awayTeam.charAt(0) }}</div>
            <span class="team-name">{{ match.awayTeam }}</span>
          </div>
        </div>
        <div class="match-header__volume">
          总成交量：<strong>{{ match.volume }}</strong>
        </div>
      </div>

      <!-- 赛果切换 -->
      <div class="result-tabs">
        <button
          class="result-tab"
          :class="{ active: activeTab === 'fulltime' }"
          @click="activeTab = 'fulltime'"
        >
          {{ t('全场赛果') }}
        </button>
        <button
          class="result-tab"
          :class="{ active: activeTab === 'halftime' }"
          @click="activeTab = 'halftime'"
        >
          {{ t('半场赛果') }}
        </button>
      </div>

      <!-- 赔率列表 -->
      <div class="odds-list">
        <div
          v-for="item in currentResults"
          :key="item.label"
          class="odds-card card-default"
          :class="{ selected: selectedOdds === item }"
          @click="selectOdds(item)"
        >
          <span class="odds-card__label">{{ item.label }}</span>
          <span class="odds-card__value">{{ item.odds.toFixed(2) }}</span>
          <span
            class="odds-card__trend"
            :class="item.trend"
          >
            {{ item.trend === 'up' ? '↑' : item.trend === 'down' ? '↓' : '→' }}
          </span>
        </div>
      </div>

      <!-- 买入面板 -->
      <Transition name="slide">
        <div v-if="showBuyPanel" class="buy-panel card-default">
          <div class="buy-panel__header">
            <h3 class="buy-panel__title">
              {{ selectedOdds?.label }} · {{ t('赔率') }} {{ selectedOdds?.odds.toFixed(2) }}
            </h3>
            <button class="buy-panel__close" @click="closeBuyPanel">✕</button>
          </div>

          <div class="buy-panel__type">
            <button
              class="type-btn"
              :class="{ active: buyType === 'standard' }"
              @click="buyType = 'standard'"
            >
              {{ t('一般买入') }}
            </button>
            <button
              class="type-btn"
              :class="{ active: buyType === 'scheduled' }"
              @click="buyType = 'scheduled'"
            >
              {{ t('预约买入') }}
            </button>
          </div>

          <div class="buy-panel__amount">
            <label class="form-label">{{ t('买入金额') }}</label>
            <input
              v-model="buyAmount"
              type="number"
              class="form-input"
              placeholder="0.00"
            />
          </div>

          <div class="buy-panel__actions">
            <button class="btn btn--default-2 cancel-btn" @click="closeBuyPanel">
              {{ t('取消') }}
            </button>
            <button class="btn btn--primary confirm-btn">
              {{ t('确认买入') }}
            </button>
          </div>
        </div>
      </Transition>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/tools.scss' as *;

.market-detail {
  @include container;
  padding-top: $spacing-xl;
  padding-bottom: $spacing-4xl;

  &__inner {
    @include web-only {
      max-width: 800px;
      margin: 0 auto;
    }
  }

  &__nav {
    margin-bottom: $spacing-xl;
  }
}

.back-link {
  font-size: $font-size-md;
  color: var(--theme-primary);
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

// 赛事头部
.match-header {
  border-radius: $radius-lg;
  padding: $spacing-3xl;
  margin-bottom: $spacing-xl;
  text-align: center;

  @include mobile-only {
    padding: $spacing-lg;
  }

  &__league {
    font-size: $font-size-base;
    color: var(--theme-text-1);
    margin-bottom: $spacing-xl;
  }

  &__teams {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: $spacing-3xl;

    @include mobile-only {
      gap: $spacing-lg;
    }
  }

  &__team {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: $spacing-sm;
  }

  &__center {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: $spacing-sm;
  }

  &__vs {
    font-family: $font-family-num;
    font-size: 36px;
    font-weight: 800;
    color: var(--theme-primary);

    @include mobile-only {
      font-size: 24px;
    }
  }

  &__date {
    font-family: $font-family-num;
    font-size: $font-size-sm;
    color: var(--theme-text-1);
  }

  &__volume {
    margin-top: $spacing-xl;
    font-size: $font-size-md;
    color: var(--theme-text-1);

    strong {
      color: var(--theme-primary);
      font-family: $font-family-num;
      font-size: $font-size-xl;
    }
  }
}

.team-avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: #F0F7FF;
  border: 1px solid #E4F0FE;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: $font-size-xl;
  font-weight: 700;
  color: var(--theme-primary);

  @include mobile-only {
    width: 48px;
    height: 48px;
    font-size: $font-size-base;
  }
}

.team-name {
  font-size: $font-size-base;
  font-weight: 600;
  color: var(--theme-text);

  @include mobile-only {
    font-size: $font-size-md;
  }
}

// 赛果切换
.result-tabs {
  display: flex;
  gap: $spacing-sm;
  margin-bottom: $spacing-xl;
}

.result-tab {
  padding: 10px 24px;
  border-radius: $radius-pill;
  font-size: $font-size-base;
  color: var(--theme-text);
  background: var(--auxiliary-1);
  border: 1.5px solid var(--theme-divider);
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;

  &.active {
    background: var(--theme-primary);
    color: #fff;
    border-color: var(--theme-primary);
  }
}

// 赔率
.odds-list {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: $spacing-md;
  margin-bottom: $spacing-xl;

  @include mobile-only {
    gap: $spacing-sm;
  }
}

.odds-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: $spacing-xl;
  border-radius: $radius-lg;
  cursor: pointer;
  transition: all 0.2s;
  border: 2px solid transparent;

  &:hover {
    border-color: var(--theme-primary);
  }

  &.selected {
    border-color: var(--theme-primary);
    background: rgba(28, 123, 255, 0.06);
  }

  @include mobile-only {
    padding: $spacing-md;
  }

  &__label {
    font-size: $font-size-md;
    color: var(--theme-text-1);
  }

  &__value {
    font-family: $font-family-num;
    font-size: 28px;
    font-weight: 800;
    color: var(--theme-text);

    @include mobile-only {
      font-size: 20px;
    }
  }

  &__trend {
    font-size: $font-size-base;

    &.up { color: var(--auxiliary-2); }
    &.down { color: #16a34a; }
    &.stable { color: var(--theme-text-1); }
  }
}

// 买入面板
.buy-panel {
  border-radius: $radius-lg;
  padding: $spacing-3xl;

  @include mobile-only {
    padding: $spacing-lg;
  }

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: $spacing-xl;
  }

  &__title {
    font-size: $font-size-lg;
    font-weight: 700;
    color: var(--theme-text);
    margin: 0;
  }

  &__close {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: #f5f5f5;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    color: #999;
  }

  &__type {
    display: flex;
    gap: $spacing-sm;
    margin-bottom: $spacing-xl;
  }

  &__amount {
    margin-bottom: $spacing-xl;
  }

  &__actions {
    display: flex;
    gap: $spacing-md;
  }
}

.type-btn {
  flex: 1;
  height: 44px;
  border-radius: $radius-pill;
  border: 1.5px solid var(--theme-divider);
  background: transparent;
  font-size: $font-size-md;
  color: var(--theme-text);
  cursor: pointer;
  transition: all 0.2s;

  &.active {
    background: var(--theme-primary);
    color: #fff;
    border-color: var(--theme-primary);
  }
}

.form-label {
  display: block;
  font-size: $font-size-md;
  color: var(--theme-text-1);
  margin-bottom: $spacing-sm;
}

.form-input {
  width: 100%;
  height: 52px;
  border: 1.5px solid var(--theme-divider);
  border-radius: $radius-md;
  padding: 0 $spacing-lg;
  font-size: $font-size-xl;
  font-family: $font-family-num;
  color: var(--theme-text);
  background: transparent;
  outline: none;
  transition: border-color 0.2s;

  &:focus {
    border-color: var(--theme-primary);
  }
}

.cancel-btn {
  flex: 1;
  height: 48px;
  border: 1.5px solid var(--theme-divider);
}

.confirm-btn {
  flex: 2;
  height: 48px;
}

.slide-enter-active,
.slide-leave-active {
  transition: all 0.3s ease;
}

.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  transform: translateY(20px);
}
</style>
