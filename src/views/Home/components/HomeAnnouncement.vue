<script setup>
import noticeIconUrl from '@/assets/images/common/notice.svg?url';

defineProps({
  text: {
    type: String,
    default:
      '大中华区人工客服工作时间为09:00-21:00，为了给大家更好的体验感，请尽量在这个时间段办理相关业务，感谢配合，如有造成不便敬请理解。',
  },
});
</script>

<template>
  <section class="announcement-section">
    <div class="announcement">
      <div class="announcement__icon">
        <img class="announcement__icon-img" :src="noticeIconUrl" alt="" />
      </div>
      <p class="announcement__text">{{ text }}</p>
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
  gap: 10px;
  background: var(--surface-card);
  border: 1.5px solid var(--auxiliary-1);
  box-shadow: var(--shadow-card);

  @include web-only {
    border-radius: 40px;
    padding: 16px 24px;
  }

  @include mobile-only {
    border-radius: $radius-pill;
    padding: 8px 12px;
    min-height: 36px;
  }

  &__icon {
    flex-shrink: 0;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;

    @include web-only {
      width: 36px;
      height: 36px;
    }
  }

  &__icon-img {
    width: 20px;
    height: 20px;
    display: block;
    object-fit: contain;

    @include web-only {
      width: 36px;
      height: 36px;
    }
  }

  &__text {
    margin: 0;
    font-size: $font-size-base;
    color: var(--theme-primary);
    line-height: 1.45;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;

    @include mobile-only {
      font-size: $font-size-sm;
    }
  }
}
</style>

