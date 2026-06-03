<script setup>
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';

const emit = defineEmits(['submit']);
const { t } = useI18n();

const verifyRealName = ref('');
const verifyIdNumber = ref('');
</script>

<template>
  <div class="profile-modal-card profile-form-card">
    <div class="profile-modal-notice profile-modal-notice--stack">
      <span>!</span>
      <div>
        <strong>{{ t('温馨提示') }}</strong>
        <p>{{ t('实名认证温馨提示') }}</p>
      </div>
    </div>
    <label class="profile-form-field">
      <span class="profile-field-label">{{ t('真实姓名') }} *</span>
      <input v-model="verifyRealName" class="profile-modal-input" :placeholder="t('请填写真实姓名')" />
    </label>
    <label class="profile-form-field">
      <span class="profile-field-label">{{ t('身份证号码') }} *</span>
      <input v-model="verifyIdNumber" class="profile-modal-input" :placeholder="t('请填写真实身份证号码')" />
    </label>
  </div>
  <button type="button" class="profile-modal-submit" @click="emit('submit')">
    {{ t('提交认证') }}
  </button>
</template>
