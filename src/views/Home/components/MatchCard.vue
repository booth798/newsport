<script setup>
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

defineProps({
  match: {
    type: Object,
    required: true,
  },
});
</script>

<template>
  <RouterLink :to="`/market/${match.id}`" class="match-card">
    <!-- 顶部：联赛 + 日期 + 倒计时 -->
    <div class="match-card__top">
      <div class="match-card__league">
        <div class="match-card__league-icon">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <circle cx="9" cy="9" r="8" stroke="#E1E9F3" stroke-width="0.5" fill="#fff" />
            <circle cx="9" cy="9" r="5" fill="#006BFF" fill-opacity="0.15" />
          </svg>
        </div>
        <span class="match-card__league-name">{{ match.league }}</span>
      </div>
      <div class="match-card__meta">
        <span class="match-card__date">{{ match.date }}</span>
        <span class="match-card__countdown">
          <span class="match-card__countdown-label">开赛倒数</span>
          <span class="match-card__countdown-time">{{ match.countdown }}</span>
        </span>
      </div>
    </div>

    <div class="match-card__divider" />

    <!-- 对阵区域 -->
    <div class="match-card__match">
      <!-- 成交量 -->
      <div class="match-card__volume">
        <span class="match-card__volume-label">总成交量：</span>
        <span class="match-card__volume-value">{{ match.volume }}</span>
      </div>

      <!-- 对阵 -->
      <div class="match-card__versus">
        <div class="match-card__team">
          <div class="match-card__team-logo">
            <svg width="34" height="34" viewBox="0 0 34 34" fill="none">
              <circle cx="17" cy="17" r="15" fill="#F0F7FF" stroke="#E4F0FE" stroke-width="0.5" />
              <text x="17" y="21" text-anchor="middle" fill="#1C7BFF" font-size="12" font-weight="600">{{
                match.homeTeam.charAt(0) }}</text>
            </svg>
          </div>
          <span class="match-card__team-name">{{ match.homeTeam }}</span>
        </div>

        <div class="match-card__scores">
          <span class="match-card__score match-card__score--home">{{ match.homeScore }}</span>
          <span class="match-card__vs">VS</span>
          <span class="match-card__score match-card__score--away">{{ match.awayScore }}</span>
        </div>

        <div class="match-card__team">
          <div class="match-card__team-logo">
            <svg width="34" height="34" viewBox="0 0 34 34" fill="none">
              <circle cx="17" cy="17" r="15" fill="#F0F7FF" stroke="#E4F0FE" stroke-width="0.5" />
              <text x="17" y="21" text-anchor="middle" fill="#1C7BFF" font-size="12" font-weight="600">{{
                match.awayTeam.charAt(0) }}</text>
            </svg>
          </div>
          <span class="match-card__team-name">{{ match.awayTeam }}</span>
        </div>
      </div>
    </div>

    <!-- 底部按钮 -->
    <div class="match-card__action">
      <span class="btn btn--primary match-card__btn">{{ t('进入市场') }}</span>
    </div>
  </RouterLink>
</template>

<style lang="scss" scoped>
@use '@/styles/tools.scss' as *;

.match-card {
  display: flex;
  flex-direction: column;
  background: var(--auxiliary-1);
  border-radius: 32px;
  border: 1.5px solid var(--auxiliary-1);
  box-shadow: var(--shadow-card);
  overflow: hidden;
  transition: transform 0.2s, box-shadow 0.2s;
  cursor: pointer;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.2);
  }

  @include web-only {
    padding: 20px;
    min-height: 460px;
  }

  @include mobile-only {
    padding: 12px;
    border-radius: 16px;
  }

  // 顶部
  &__top {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  &__league {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  &__league-icon {
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;

    @include mobile-only {
      width: 20px;
      height: 20px;
    }
  }

  &__league-name {
    font-size: $font-size-lg;
    font-weight: 500;
    color: var(--theme-text);

    @include mobile-only {
      font-size: $font-size-md;
    }
  }

  &__meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  &__date {
    font-family: $font-family-num;
    font-size: $font-size-lg;
    font-weight: 700;
    color: var(--theme-text);

    @include mobile-only {
      font-size: $font-size-md;
    }
  }

  &__countdown {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 14px;
    background: rgba(31, 124, 255, 0.2);
    border-radius: 14px;

    @include mobile-only {
      padding: 4px 8px;
      gap: 4px;
    }
  }

  &__countdown-label {
    font-size: $font-size-sm;
    color: #1F7CFF;
    font-weight: 500;

    @include mobile-only {
      font-size: $font-size-xs;
    }
  }

  &__countdown-time {
    font-size: $font-size-sm;
    color: #1F7CFF;
    font-weight: 600;

    @include mobile-only {
      font-size: $font-size-xs;
    }
  }

  // 分割线
  &__divider {
    height: 1px;
    background: var(--theme-divider);
    margin: 12px 0;

    @include mobile-only {
      margin: 8px 0;
    }
  }

  // 对阵
  &__match {
    flex: 1;
    background: var(--auxiliary-1);
    border: 1px solid var(--theme-divider);
    border-radius: 24px;
    padding: 16px;
    display: flex;
    flex-direction: column;
    position: relative;
    overflow: hidden;

    @include mobile-only {
      border-radius: 12px;
      padding: 10px;
    }
  }

  &__volume {
    display: flex;
    align-items: baseline;
    justify-content: center;
    margin-bottom: 12px;

    @include mobile-only {
      margin-bottom: 8px;
    }
  }

  &__volume-label {
    font-size: $font-size-md;
    color: var(--theme-text);
    opacity: 0.5;

    @include mobile-only {
      font-size: $font-size-xs;
    }
  }

  &__volume-value {
    font-size: 22px;
    font-weight: 700;
    color: var(--theme-primary);

    @include mobile-only {
      font-size: $font-size-base;
    }
  }

  &__versus {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex: 1;
  }

  &__team {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    flex: 1;

    @include mobile-only {
      gap: 4px;
    }
  }

  &__team-logo {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    overflow: hidden;
    border: 0.5px solid var(--theme-divider);
    display: flex;
    align-items: center;
    justify-content: center;

    @include mobile-only {
      width: 32px;
      height: 32px;
    }
  }

  &__team-name {
    font-size: $font-size-base;
    font-weight: 500;
    color: var(--theme-text);
    text-align: center;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;

    @include mobile-only {
      font-size: $font-size-xs;
    }
  }

  &__scores {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }

  &__vs {
    font-family: $font-family-num;
    font-size: 24px;
    font-weight: 700;
    color: var(--theme-primary);

    @include mobile-only {
      font-size: $font-size-base;
    }
  }

  &__score {
    width: 50px;
    height: 36px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: $font-family-num;
    font-size: 26px;
    font-weight: 800;

    @include mobile-only {
      width: 36px;
      height: 28px;
      font-size: $font-size-lg;
    }

    &--home {
      background: #1F7CFF;
      color: #fff;
    }

    &--away {
      background: var(--theme-divider);
      color: var(--theme-text);
    }
  }

  // 底部按钮
  &__action {
    margin-top: 12px;

    @include mobile-only {
      margin-top: 8px;
    }
  }

  &__btn {
    width: 100%;
    font-size: $font-size-lg;
    font-weight: 500;

    @include web-only {
      height: 48px;
    }

    @include mobile-only {
      height: 36px;
      font-size: $font-size-md;
    }
  }
}
</style>
