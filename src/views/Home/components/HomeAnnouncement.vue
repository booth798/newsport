<script setup>
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
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="10" r="9" stroke="#1C7BFF" stroke-width="1.5"/>
          <path d="M10 6V11M10 13.5V14" stroke="#1C7BFF" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
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
    border-radius: 12px;
    padding: 10px 12px;
  }

  &__icon {
    flex-shrink: 0;
    width: 20px;
    height: 20px;
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

