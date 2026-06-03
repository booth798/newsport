<script setup>
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';

const emit = defineEmits(['submit']);
const { t } = useI18n();

const securityTab = ref('login');
const loginOldPassword = ref('');
const loginNewPassword = ref('');
const loginConfirmPassword = ref('');
const withdrawOldPassword = ref('');
const withdrawNewPassword = ref('');
const withdrawConfirmPassword = ref('');
</script>

<template>
  <div class="profile-modal-tabs">
    <button type="button" :class="{ active: securityTab === 'login' }" @click="securityTab = 'login'">
      {{ t('修改登入密码') }}
    </button>
    <button type="button" :class="{ active: securityTab === 'withdraw' }" @click="securityTab = 'withdraw'">
      {{ t('修改提现密码') }}
    </button>
  </div>

  <div class="profile-modal-card profile-form-card">
    <div class="profile-modal-notice profile-modal-notice--stack">
      <span>!</span>
      <div>
        <strong>{{ t('温馨提示') }}</strong>
        <p>{{ t(securityTab === 'login' ? '登入密码温馨提示' : '提现密码温馨提示') }}</p>
      </div>
    </div>

    <template v-if="securityTab === 'login'">
      <label class="profile-form-field">
        <span class="profile-field-label">{{ t('旧密码') }} *</span>
        <input v-model="loginOldPassword" type="password" class="profile-modal-input" :placeholder="t('请输入旧的登入密码')" />
      </label>
      <label class="profile-form-field">
        <span class="profile-field-label">{{ t('新密码') }} *</span>
        <input v-model="loginNewPassword" type="password" class="profile-modal-input" :placeholder="t('请输入新密码（6-12位字符）')" />
      </label>
      <label class="profile-form-field">
        <span class="profile-field-label">{{ t('确认密码') }} *</span>
        <input v-model="loginConfirmPassword" type="password" class="profile-modal-input" :placeholder="t('请再次输入新密码')" />
      </label>
    </template>

    <template v-else>
      <label class="profile-form-field">
        <span class="profile-field-label">{{ t('旧提现密码') }} *</span>
        <input v-model="withdrawOldPassword" type="password" class="profile-modal-input" :placeholder="t('请输入旧的提现密码')" />
      </label>
      <label class="profile-form-field">
        <span class="profile-field-label">{{ t('新提现密码') }} *</span>
        <input v-model="withdrawNewPassword" type="password" class="profile-modal-input" :placeholder="t('请输入提现密码（6-20位字符）')" />
      </label>
      <label class="profile-form-field">
        <span class="profile-field-label">{{ t('确认提现密码') }} *</span>
        <input v-model="withdrawConfirmPassword" type="password" class="profile-modal-input" :placeholder="t('请再次输入提现密码')" />
      </label>
    </template>
  </div>

  <button type="button" class="profile-modal-submit" @click="emit('submit')">
    {{ t('确认修改') }}
  </button>
</template>
