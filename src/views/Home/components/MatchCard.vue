<script setup>
  
</script>

<template>
  <div class="card-default">
    <div class="btn btn--primary">
      {{ $t('进入市场') }}
    </div>
    <div class="btn btn--prompt">
      {{ $t('进入市场') }}
    </div>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/tools.scss' as *;
.card-default {
    border-radius: 32px;
    @include web-only {
        height: 460px;
        .btn--primary, .btn--prompt {
            height: 48px;
        }
    }
    @include mobile-only {
        height: 263px;
        .btn--primary, .btn--prompt {
            height: 36px;
        }
    }
}
</style>