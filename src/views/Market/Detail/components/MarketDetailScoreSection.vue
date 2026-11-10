<script setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import iconArrowRightUrl from '@/assets/images/common/icon_arrow_right.png?url';
import iconChevronDownUrl from '@/assets/images/common/icon_drawer_section_chevron_down.png?url';
import iconChevronUpUrl from '@/assets/images/common/icon_drawer_section_chevron_up.png?url';
import iconVolumeThumbUpUrl from '@/assets/images/common/icon_volume_thumb_up.svg?url';

const props = defineProps({
  titleKey: {
    type: String,
    required: true,
  },
  tab: {
    type: String,
    required: true,
    validator: (v) => v === 'fulltime' || v === 'halftime',
  },
  rows: {
    type: Array,
    required: true,
  },
  expanded: {
    type: Boolean,
    default: false,
  },
  activeScore: {
    type: String,
    default: null,
  },
  showActive: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['toggle', 'select-row', 'open-purchase']);

const { t } = useI18n();

const chevronSrc = computed(() => (props.expanded ? iconChevronUpUrl : iconChevronDownUrl));

function formatScoreLabel(score) {
  return score.replace('-', ' - ');
}
</script>

<template>
  <section class="score-section">
    <button type="button" class="score-section__header" @click="emit('toggle')">
      <span class="score-section__title">{{ t(titleKey) }}</span>
      <span class="score-section__vol">
        <img class="score-section__vol-icon" :src="iconVolumeThumbUpUrl" width="16" height="16" alt="" />
        <span class="score-section__vol-text">{{ t('成交量') }}</span>
      </span>
      <img class="score-section__chevron" :src="chevronSrc" width="20" height="20" alt="" />
    </button>

    <div v-show="expanded" class="score-section__body">
      <ul class="score-section__list">
        <li
          v-for="row in rows"
          :key="`${tab}-${row.score}`"
          class="score-section__row"
          :class="{
            'score-section__row--active': showActive && activeScore === row.score,
            [`score-section__row--${tab}`]: true,
          }"
          role="button"
          tabindex="0"
          @click="emit('select-row', row)"
          @keydown.enter.prevent="emit('select-row', row)"
        >
          <span class="score-section__cell score-section__cell--score">{{ formatScoreLabel(row.score) }}</span>
          <span class="score-section__cell score-section__cell--prob">{{ row.probability }}</span>
          <span class="score-section__cell score-section__cell--vol">{{ row.volumeFormatted }}</span>
          <img
            class="score-section__arrow"
            :src="iconArrowRightUrl"
            width="24"
            height="24"
            alt=""
            aria-hidden="true"
            @click.stop="emit('open-purchase', row)"
          />
        </li>
      </ul>
    </div>
  </section>
</template>

<style lang="scss" scoped>
@use '@/styles/tools.scss' as *;

.score-section {
  background: #fff;
  border-radius: 16px;
  border: 1px solid rgb(var(--theme-divider-rgb));
  box-shadow: var(--shadow-card);
  overflow: hidden;

  &__header {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto 20px;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 14px 12px;
    border: none;
    background: #fff;
    cursor: pointer;
    text-align: left;
    box-sizing: border-box;
  }

  &__title {
    font-family: $font-family-base;
    font-size: 16px;
    font-weight: 600;
    line-height: 1.2;
    color: var(--theme-text);
  }

  &__vol {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 3px;
    box-sizing: border-box;
    height: 28px;
    padding: 0 10px;
    border-radius: 49.58px;
    border: 1px solid #fff;
    background: rgba(var(--theme-primary-rgb), 1);
    color: #fff;
    flex-shrink: 0;
    box-shadow:
      0 3px 8px rgba(var(--theme-primary-rgb), 0.24),
      inset 4px 4px 8px 0 rgba(255, 255, 255, 0.18),
      inset 2px 1px 6px 0 rgba(255, 255, 255, 0.18);
  }

  &__vol-icon {
    display: block;
    width: 16px;
    height: 16px;
    flex-shrink: 0;
    pointer-events: none;
  }

  &__vol-text {
    font-family: $font-family-base;
    font-size: 13px;
    font-weight: 500;
    line-height: 1;
    white-space: nowrap;
  }

  &__chevron {
    display: block;
    width: 20px;
    height: 20px;
    flex-shrink: 0;
    justify-self: end;
    pointer-events: none;
  }

  &__body {
    padding: 0 12px 12px;
  }

  &__list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  &__row {
    display: grid;
    grid-template-columns: minmax(0, 0.9fr) minmax(0, 0.8fr) minmax(0, 1.3fr) 24px;
    gap: 6px;
    align-items: center;
    min-height: 44px;
    padding: 10px 12px;
    border-radius: 16px;
    background: var(--surface-card);
    border: 1px solid rgba(var(--theme-divider-rgb), 0.95);
    cursor: pointer;
    transition:
      background 0.15s ease,
      border-color 0.15s ease;

    &--active {
      background: rgba(var(--theme-primary-rgb), 0.1);
      border-color: rgba(var(--theme-primary-rgb), 0.28);
    }
  }

  &__cell {
    font-size: 14px;
    color: var(--theme-text);
    min-width: 0;

    &--score {
      font-family: $font-family-num;
      font-weight: 600;
    }

    &--prob {
      font-family: $font-family-num;
      font-weight: 600;
      text-align: center;
    }

    &--vol {
      font-family: $font-family-num;
      font-weight: 500;
      font-size: 12px;
      text-align: right;
    }
  }

  &__row--fulltime &__cell--prob,
  &__row--halftime &__cell--prob {
    color: var(--theme-primary);
  }

  &__arrow {
    display: block;
    width: 24px;
    height: 24px;
    flex-shrink: 0;
    justify-self: end;
    cursor: pointer;
  }
}
</style>
