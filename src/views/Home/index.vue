<script setup>
import MatchCard from './components/MatchCard.vue';
</script>

<template>
    <div class="card-container">
        <MatchCard v-for="item in 5" :key="item" />
    </div>
</template>

<style scoped lang="scss">
@use '@/styles/tools.scss' as *;
.card-container {
    display: grid;
    @include container;
    @include web-only {
        grid-template-columns: repeat(4, 1fr);
        grid-gap: 27.21px;
    }
    @include mobile-only {
        grid-template-columns: repeat(1, 1fr);
        gap: 10px;
    }
}
</style>
