<script setup>
import { computed, ref } from 'vue';

defineOptions({
  inheritAttrs: false,
});

const props = defineProps({
  modelValue: {
    type: [String, Number],
    default: '',
  },
  type: {
    type: String,
    default: 'text',
  },
  placeholder: {
    type: String,
    default: '',
  },
});

const emit = defineEmits(['update:modelValue', 'focus', 'blur']);

const inputRef = ref(null);
const isFocused = ref(false);
const hasValue = computed(() => props.modelValue !== null && props.modelValue !== undefined && String(props.modelValue).length > 0);

function focusInput() {
  inputRef.value?.focus();
}

function handleInput(event) {
  emit('update:modelValue', event.target.value);
}

function handleFocus(event) {
  isFocused.value = true;
  emit('focus', event);
}

function handleBlur(event) {
  isFocused.value = false;
  emit('blur', event);
}
</script>

<template>
  <div
    class="base-input"
    :class="{
      'base-input--filled': hasValue,
      'base-input--focused': isFocused,
      'base-input--with-suffix': $slots.suffix,
    }"
    @click="focusInput"
  >
    <input
      ref="inputRef"
      class="base-input__control"
      :value="modelValue"
      :type="type"
      :placeholder="placeholder"
      v-bind="$attrs"
      @input="handleInput"
      @focus="handleFocus"
      @blur="handleBlur"
    />
    <div v-if="$slots.suffix" class="base-input__suffix" @click.stop>
      <slot name="suffix" />
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/tools.scss' as *;

.base-input {
  display: flex;
  align-items: center;
  border: 1px solid var(--theme-divider);
  background: var(--auxiliary-1);
  box-sizing: border-box;
  transition: border-color 0.18s ease, background-color 0.18s ease;
  cursor: text;
  @include mobile-only {
    min-height: 44px;
    padding: 0 14px;
    border-radius: 12px;
  }
  @include web-only {
    min-height: 52px;
    padding: 0 20px;
    border-radius: 16px;
  }
}

.base-input--focused {
  border-color: var(--theme-primary);
  background: var(--surface-card);
}

.base-input__control {
  width: 100%;
  min-width: 0;
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  box-sizing: border-box;
  font-weight: 400;
  color: var(--theme-text);
  @include mobile-only {
    padding: 12px 0;
    font-size: 14px;
  }
  @include web-only {
    padding: 14px 0;
    font-size: 16px;
  }
}

.base-input__control::placeholder {
  color: var(--theme-text-1);
  font-weight: 400;
  @include mobile-only {
    font-size: 14px;
  }
  @include web-only {
    font-size: 16px;
  }
}

.base-input__control:disabled {
  cursor: not-allowed;
}

.base-input--with-suffix {
  gap: 8px;
}

.base-input__suffix {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: var(--theme-primary);
}
</style>
