<template>
  <div class="deposit-page" aria-label="deposit" />
</template>

<style lang="scss" scoped>
@use '@/styles/tools.scss' as *;

.deposit-page {
  min-height: 560px;

  @include web-only {
    min-height: min(690px, calc(100vh - 12px));
  }

  @include mobile-only {
    min-height: calc(100vh - 60px);
  }
}
</style>
