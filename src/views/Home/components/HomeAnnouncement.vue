<script setup>
import { useI18n } from 'vue-i18n';
import noticeIconUrl from '@/assets/images/common/notice.svg?url';

const { t } = useI18n();

defineProps({
  text: {
    type: String,
    default: '',
  },
});
</script>

<template>
  <section id="home-announcement" class="announcement-section">
    <div class="announcement">
      <div class="announcement__icon">
        <img class="announcement__icon-img" :src="noticeIconUrl" alt="" />
      </div>
      <p class="announcement__text">{{ text || t('默认公告') }}</p>
    </div>
  </section>
</template>

<style lang="scss" scoped>
@use '@/styles/tools.scss' as *;

.announcement-section {
  position: relative;
}

.announcement {
  display: flex;
  align-items: center;
  background: var(--surface-card);
  border: 1.5px solid var(--auxiliary-1);
  box-shadow: var(--shadow-card);

  @include web-only {
    gap: 10px;
    border-radius: 40px;
    /* PC 稿图 1：左 20、上下 10，图标 36，总高约 56 */
    padding: 10px 24px 10px 20px;
    min-height: 56px;
    box-sizing: border-box;
  }

  /* H5 稿图 4/5/6：胶囊条、30 图标、左 10 / 上下 7、图文间距 6、阴影与 14px 主色字 */
  @include mobile-only {
    gap: 6px;
    border-radius: $radius-pill;
    padding: 7px 12px 7px 10px;
    min-height: 44px;
    box-sizing: border-box;
    box-shadow: 0 4px 8px 0 rgba(21, 58, 119, 0.18);
  }

  &__icon {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;

    @include web-only {
      width: 36px;
      height: 36px;
    }

    @include mobile-only {
      width: 30px;
      height: 30px;
    }
  }

  &__icon-img {
    display: block;
    object-fit: contain;

    @include web-only {
      width: 36px;
      height: 36px;
    }

    @include mobile-only {
      width: 30px;
      height: 30px;
    }
  }

  &__text {
    margin: 0;
    color: var(--theme-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;

    @include web-only {
      font-family: $font-family-base;
      font-size: $font-size-base;
      font-weight: 400;
      line-height: 1;
      letter-spacing: 0;
      color: var(--announcement-text-pc);
    }

    @include mobile-only {
      font-family: $font-family-base;
      font-size: $font-size-md;
      font-weight: 400;
      line-height: 1;
      letter-spacing: 0;
    }
  }
}
</style>

