<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import logoLoginUrl from '@/assets/images/common/logo_login.png?url';
import logoWatermarkUrl from '@/assets/images/common/modal_opacity_logo.png?url';
import iconLoginUserUrl from '@/assets/images/login/icon_login_user.svg?url';
import iconLoginLockUrl from '@/assets/images/login/icon_login_lock.svg?url';
import iconEyeClosedUrl from '@/assets/images/login/icon_login_eye_closed.svg?url';
import iconEyeOpenUrl from '@/assets/images/login/icon_login_eye_open.svg?url';
import iconContactSupportUrl from '@/assets/images/login/icon_login_service.svg?url';
import { useAppStore } from '@/store/modules/app';
import { useUserStore } from '@/store/modules/user';
import { useToast } from '@/hooks/useToast';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { loginApi, registerApi } from '@/api/user';
import {
  clearRememberedLogin,
  getRememberedLogin,
  saveRememberedLogin,
} from '@/utils/rememberLogin';
import {
  clearRegisterAgentCode,
  getRegisterAttributionOptions,
} from '@/utils/registerAttribution';
import { validateLoginPassword } from '@/constants/loginPassword';
import RegisterSuccessModal from '@/components/RegisterSuccessModal.vue';

const { t } = useI18n();
const appStore = useAppStore();
const userStore = useUserStore();
const toast = useToast();

const props = defineProps({
  visible: Boolean,
});

const emit = defineEmits(['close']);

// 锁定背后滚动并补偿滚动条宽度，避免弹窗打开时页面横向跳动。
useBodyScrollLock(() => props.visible);

const account = ref('');
const password = ref('');
const inviteCode = ref('');
const isLogin = ref(true);
const showPassword = ref(false);
const rememberPassword = ref(false);
const loginSubmitting = ref(false);
/** 注册成功后展示账号密码保存弹窗 */
const registerSuccessOpen = ref(false);
const registeredAccount = ref('');
const registeredPassword = ref('');

watch(isLogin, (loginMode) => {
  showPassword.value = false;
  // 切回登录态时回填记住的账号密码；注册态不清除本地记忆，只清空表单密码
  if (loginMode) {
    loadRemembered();
  } else {
    password.value = '';
    rememberPassword.value = false;
  }
});

watch(
  () => props.visible,
  (open) => {
    if (!open) return;
    // PC / H5 共用弹窗：每次打开登录层都尝试回填记住密码
    isLogin.value = true;
    loadRemembered();
  },
);

const canSubmit = computed(
  () => account.value.trim().length > 0 && password.value.trim().length > 0,
);

/** 后端已取消滑块验证，账号密码非空即可登入 */
const canSubmitLogin = computed(() => canSubmit.value);

/** 从本地回填账号+密码（对齐安卓 rememberedLogin） */
function loadRemembered() {
  const remembered = getRememberedLogin();
  if (!remembered) {
    rememberPassword.value = false;
    return;
  }
  account.value = remembered.account;
  password.value = remembered.password;
  rememberPassword.value = true;
}

/** 登录成功后按勾选结果持久化或清除 */
function persistRememberedAfterLogin() {
  if (rememberPassword.value) {
    saveRememberedLogin(account.value.trim(), password.value);
  } else {
    clearRememberedLogin();
  }
}

function resetLoginFormFields() {
  account.value = '';
  password.value = '';
  rememberPassword.value = false;
  showPassword.value = false;
}

async function submitWebLogin() {
  if (!canSubmitLogin.value || loginSubmitting.value) return;
  try {
    loginSubmitting.value = true;
    const res = await loginApi(account.value.trim(), password.value, {
      remember: rememberPassword.value,
    });
    // 仅登录成功后再写入/清除本地记忆（对齐安卓）
    persistRememberedAfterLogin();
    const loginData = res.data || {};
    userStore.completeWebLogin(loginData);
    appStore.closeLoginModal();
    toast.success(t('登录成功'));
    resetLoginFormFields();
    userStore.loadUserProfile({ force: true }).catch(() => {});
  } catch (e) {
    toast.error(e.message || t('提交失败，请重试'));
  } finally {
    loginSubmitting.value = false;
  }
}

const canSubmitRegister = computed(
  () => canSubmit.value
    && account.value.trim().length >= 4
    && validateLoginPassword(password.value.trim(), account.value.trim()).ok,
);

async function submitRegister() {
  const name = account.value.trim();
  const pwd = password.value.trim();
  if (!name || !pwd || loginSubmitting.value) return;
  if (name.length < 4 || name.length > 20) {
    toast.error(t('用户名需4-20位'));
    return;
  }
  // 注册密码：6-12 位须含字母和数字（允许特殊字符），且不能包含账号
  const passwordCheck = validateLoginPassword(pwd, name);
  if (!passwordCheck.ok) {
    toast.error(t(passwordCheck.messageKey));
    return;
  }
  try {
    loginSubmitting.value = true;
    // inviteCode：表单邀请码；agentCode：推广链接 ?ac=（PC/H5 共用弹窗）
    const res = await registerApi(
      name,
      password.value,
      getRegisterAttributionOptions({
        inviteCode: inviteCode.value.trim() || undefined,
      }),
    );
    clearRegisterAgentCode();
    const loginData = res.data || {};
    // 先记下凭据再清空表单，供注册成功弹窗保存
    registeredAccount.value = name;
    registeredPassword.value = pwd;
    userStore.completeWebLogin(loginData);
    appStore.closeLoginModal();
    account.value = '';
    password.value = '';
    inviteCode.value = '';
    showPassword.value = false;
    registerSuccessOpen.value = true;
    userStore.loadUserProfile({ force: true }).catch(() => {});
  } catch (e) {
    toast.error(e.message || t('提交失败，请重试'));
  } finally {
    loginSubmitting.value = false;
  }
}

function onRegisterSuccessConfirm() {
  registeredAccount.value = '';
  registeredPassword.value = '';
}

const close = () => emit('close');

function onKeydown(e) {
  if (e.key === 'Escape' && props.visible) close();
}

function onViewportResize() {
  const active = document.activeElement;
  if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) {
    requestAnimationFrame(() => {
      active.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }
}

onMounted(() => {
  document.addEventListener('keydown', onKeydown);
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', onViewportResize);
  }
});

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown);
  if (window.visualViewport) {
    window.visualViewport.removeEventListener('resize', onViewportResize);
  }
});

const toggleMode = () => {
  isLogin.value = !isLogin.value;
  inviteCode.value = '';
  // 切到注册：清空表单；切回登录由 isLogin watch 回填记住的账号密码
  if (!isLogin.value) {
    account.value = '';
    password.value = '';
    rememberPassword.value = false;
  }
};

const passwordInputType = computed(() => (showPassword.value ? 'text' : 'password'));
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="visible" class="login-overlay" @click.self="close">
        <div class="login-overlay__stack">
          <div class="login-modal" role="dialog" aria-modal="true" :aria-label="isLogin ? t('会员登入') : t('会员注册')">
            <img class="login-modal__watermark" :src="logoWatermarkUrl" alt="" aria-hidden="true" />

            <div class="login-modal__brand">
              <img class="login-modal__logo" :src="logoLoginUrl" width="132" height="36" alt="Ladbrokes" />
            </div>

            <div class="login-modal__panel">
              <h2 class="login-modal__title">
                {{ isLogin ? t('会员登入') : t('会员注册') }}
              </h2>

              <div class="login-modal__form">
                <template v-if="isLogin">
                  <div class="form-group form-group--compact">
                    <label class="form-label form-label--sr-only" for="login-modal-account">{{ t('账号') }}</label>
                    <div class="form-input-wrap">
                      <span class="form-input__prefix" aria-hidden="true">
                        <img class="form-input__prefix-img" :src="iconLoginUserUrl" width="28" height="28" alt="" />
                      </span>
                      <input
                        id="login-modal-account"
                        v-model="account"
                        class="form-input form-input--has-prefix"
                        :placeholder="t('请输入账号')"
                        autocomplete="username"
                      />
                    </div>
                  </div>

                  <div class="form-group form-group--compact">
                    <label class="form-label form-label--sr-only" for="login-modal-password">{{ t('密码') }}</label>
                    <div class="form-input-wrap">
                      <span class="form-input__prefix" aria-hidden="true">
                        <img class="form-input__prefix-img" :src="iconLoginLockUrl" width="28" height="28" alt="" />
                      </span>
                      <input
                        id="login-modal-password"
                        v-model="password"
                        class="form-input form-input--has-prefix form-input--has-suffix"
                        :class="{ 'form-input--password-dots': !showPassword }"
                        :type="passwordInputType"
                        :placeholder="t('请输入密码')"
                        autocomplete="current-password"
                      />
                      <button
                        type="button"
                        class="form-input__eye"
                        :aria-label="showPassword ? t('隐藏密码') : t('显示密码')"
                        @click="showPassword = !showPassword"
                      >
                        <img
                          :src="showPassword ? iconEyeOpenUrl : iconEyeClosedUrl"
                          width="28"
                          height="28"
                          alt=""
                        />
                      </button>
                    </div>
                  </div>

                  <div class="login-modal__remember-row">
                    <label class="login-modal__remember">
                      <input v-model="rememberPassword" type="checkbox" class="login-modal__remember-input" />
                      <span class="login-modal__remember-mark" aria-hidden="true" />
                      <span>{{ t('记住密码') }}</span>
                    </label>
                  </div>
                </template>

                <template v-else>
                  <div class="form-group form-group--compact">
                    <label class="form-label form-label--sr-only" for="login-modal-account-reg">{{ t('用户名') }}</label>
                    <div class="form-input-wrap">
                      <span class="form-input__prefix" aria-hidden="true">
                        <img class="form-input__prefix-img" :src="iconLoginUserUrl" width="28" height="28" alt="" />
                      </span>
                      <input
                        id="login-modal-account-reg"
                        v-model="account"
                        class="form-input form-input--has-prefix"
                        :placeholder="t('请输入用户名') + ' (4-20' + t('位') + ')'"
                        autocomplete="username"
                        maxlength="20"
                      />
                    </div>
                  </div>

                  <div class="form-group form-group--compact">
                    <label class="form-label form-label--sr-only" for="login-modal-password-reg">{{ t('密码') }}</label>
                    <div class="form-input-wrap">
                      <span class="form-input__prefix" aria-hidden="true">
                        <img class="form-input__prefix-img" :src="iconLoginLockUrl" width="28" height="28" alt="" />
                      </span>
                      <input
                        id="login-modal-password-reg"
                        v-model="password"
                        class="form-input form-input--has-prefix form-input--has-suffix"
                        :class="{ 'form-input--password-dots': !showPassword }"
                        :type="passwordInputType"
                        :placeholder="t('请输入密码') + ' (6-12' + t('位') + ')'"
                        autocomplete="new-password"
                        maxlength="12"
                      />
                      <button
                        type="button"
                        class="form-input__eye"
                        :aria-label="showPassword ? t('隐藏密码') : t('显示密码')"
                        @click="showPassword = !showPassword"
                      >
                        <img
                          :src="showPassword ? iconEyeOpenUrl : iconEyeClosedUrl"
                          width="28"
                          height="28"
                          alt=""
                        />
                      </button>
                    </div>
                  </div>

                  <div class="form-group form-group--compact">
                    <label class="form-label form-label--sr-only" for="login-modal-invite-code">{{ t('邀请码') }}</label>
                    <div class="form-input-wrap">
                      <span class="form-input__prefix" aria-hidden="true">
                        <img class="form-input__prefix-img" :src="iconLoginUserUrl" width="28" height="28" alt="" />
                      </span>
                      <input
                        id="login-modal-invite-code"
                        v-model="inviteCode"
                        class="form-input form-input--has-prefix"
                        :placeholder="t('邀请码') + ' (' + t('选填') + ')'"
                        autocomplete="off"
                      />
                    </div>
                  </div>
                </template>
              </div>
            </div>

            <div v-if="!isLogin" class="login-modal__blue-footer">
              <button
                type="button"
                class="btn btn--primary login-modal__submit login-modal__submit--inverse"
                :class="{ 'login-modal__submit--ready': canSubmitRegister }"
                :disabled="!canSubmitRegister || loginSubmitting"
                @click="submitRegister"
              >
                {{ loginSubmitting ? t('提交中...') : t('注册') }}
              </button>

              <div class="login-modal__switch login-modal__switch--on-blue">
                <span>
                  {{ t('已有账号？') }}
                  <a href="javascript:;" @click="toggleMode">{{ t('立即登入') }}</a>
                </span>
              </div>
            </div>

            <div v-if="isLogin" class="login-modal__blue-footer">
              <button
                type="button"
                class="btn btn--primary login-modal__submit login-modal__submit--inverse"
                :class="{ 'login-modal__submit--ready': canSubmitLogin }"
                :disabled="!canSubmitLogin || loginSubmitting"
                @click="submitWebLogin"
              >
                {{ loginSubmitting ? t('提交中...') : t('登入') }}
              </button>

              <button type="button" class="login-modal__service" @click="appStore.openCustomerServiceConfirm">
                <img :src="iconContactSupportUrl" alt="" aria-hidden="true" />
                <span>{{ t('联系客服') }}</span>
              </button>
            </div>
          </div>
          <button type="button" class="login-overlay__close" :aria-label="t('关闭')" @click="close">
            <span aria-hidden="true">×</span>
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>

  <!-- 注册成功：展示账号密码并支持下载保存 -->
  <RegisterSuccessModal
    v-model="registerSuccessOpen"
    :account="registeredAccount"
    :password="registeredPassword"
    :confirm-text="t('完成')"
    @confirm="onRegisterSuccessConfirm"
  />
</template>

<style lang="scss" scoped>
@use '@/styles/tools.scss' as *;

// Ladbrokes 品牌框：与 PC / H5 弹窗导出稿一致的红色渐变。
$login-frame-grad-top: var(--theme-primary);
$login-frame-grad-bottom: var(--theme-primary-end);
$login-frame-border: var(--border-light);
$login-input-border: var(--theme-divider);
$login-panel-bg: #ffffff;
$login-cta-color: var(--theme-primary);
$login-placeholder: rgba(var(--theme-text-rgb), 0.5);
$login-label: rgba(var(--theme-text-rgb), 0.45);
$login-input-text: rgba(var(--theme-text-rgb), 1);

.login-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.72);
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: none;
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;

}

.login-overlay__stack {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-width: min(400px, calc(100vw - 24px));
  box-sizing: border-box;
  flex-shrink: 0;

  @include web-only {
    max-height: 100%;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 16px 0;
  }

  @include mobile-only {
    max-width: calc(100vw - 32px);
    padding: 0 0 calc(20px + env(safe-area-inset-bottom, 0px));
  }
}

.login-overlay__close {
  align-self: center;
  flex-shrink: 0;
  margin-top: 28px;
  width: 32px;
  height: 32px;
  padding: 0;
  border: 1.5px solid rgba(255, 255, 255, 0.9);
  border-radius: 50%;
  background: transparent;
  color: #fff;
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition:
    background 0.2s ease,
    border-color 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.18);
    border-color: #fff;
  }

  &:focus-visible {
    outline: 2px solid rgba(255, 255, 255, 0.6);
    outline-offset: 2px;
  }

  @include mobile-only {
    width: 28px;
    height: 28px;
    font-size: 17px;
    border-width: 1px;
    margin-top: 24px;
  }
}

.login-modal {
  position: relative;
  box-sizing: border-box;
  overflow: visible;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  width: 100%;
  max-width: 100%;
  padding: 20px 12px;
  border-radius: 28px;
  border: 0.8px solid $login-frame-border;
  background: linear-gradient(180deg, $login-frame-grad-top 0%, $login-frame-grad-bottom 100%);
  box-shadow: 0 28px 72px rgba(var(--theme-shadow-rgb), 0.35);

  @include web-only {
    width: 400px;
    max-width: 400px;
    // 去掉滑块后按内容撑开。
    min-height: 0;
    border-radius: 32px;
    overflow: hidden;
  }

  @include mobile-only {
    min-height: 0;
    padding: 18px 12px 14px;
    border-radius: 24px;
  }


  &__watermark {
    position: absolute;
    left: 50%;
    top: 0;
    width: 100%;
    height: 80px;
    object-fit: contain;
    transform: translateX(-50%);
    z-index: 0;
    pointer-events: none;
    user-select: none;
  }

  &__brand {
    position: relative;
    z-index: 1;
    flex-shrink: 0;
    display: flex;
    justify-content: center;
    align-items: center;
    margin-bottom: 10px;

    @include mobile-only {
      margin-bottom: 7px;
    }
  }

  &__logo {
    display: block;
    width: 132px;
    height: 36px;
    object-fit: contain;

    @include mobile-only {
      width: 110px;
      height: 30px;
    }
  }

  &__panel {
    position: relative;
    z-index: 1;
    flex: 0 0 auto;
    display: flex;
    flex-direction: column;
    min-height: 0;
    background: $login-panel-bg;
    border-radius: 20px;
    padding: 28px 20px 20px;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.65);

    @include web-only {
      border-radius: 24px;
    }

    @include mobile-only {
      border-radius: 24px;
      padding: 28px 20px 18px;
    }
  }

  &__title {
    font-size: 24px;
    font-weight: 500;
    color: var(--theme-text);
    text-align: center;
    margin: 0 0 24px;
    letter-spacing: 0.02em;

    @include web-only {
      font-size: 20px;
    }

    @include mobile-only {
      font-size: 24px;
      margin-bottom: 24px;
    }
  }

  &__form {
    display: flex;
    flex-direction: column;
    gap: 16px;

    @include mobile-only {
      gap: 16px;
    }
  }

  &__remember-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }


  &__remember {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 0;
    font-size: 18px;
    color: $login-placeholder;
    cursor: pointer;
    user-select: none;
  }

  &__remember-input {
    position: absolute;
    width: 1px;
    height: 1px;
    margin: -1px;
    opacity: 0;
    pointer-events: none;

    &:focus-visible {
      outline: 2px solid rgba(var(--theme-primary-rgb), 0.45);
      outline-offset: 2px;
    }
  }

  &__remember-mark {
    position: relative;
    flex-shrink: 0;
    width: 18px;
    height: 18px;
    box-sizing: border-box;
    border: 1.5px solid $login-cta-color;
    border-radius: 50%;
    background: #fff;

    &::after {
      content: '';
      position: absolute;
      left: 5px;
      top: 2px;
      width: 5px;
      height: 9px;
      border-right: 1.7px solid $login-cta-color;
      border-bottom: 1.7px solid $login-cta-color;
      transform: rotate(45deg) scale(0);
      transform-origin: center;
      transition: transform 0.15s ease;
    }
  }

  &__remember-input:checked + &__remember-mark::after {
    transform: rotate(45deg) scale(1);
  }

  &__submit {
    width: 100%;
    height: 48px;
    font-size: $font-size-lg;
    font-weight: 600;
    margin-top: 0;
    border-radius: $radius-pill;
    transition:
      opacity 0.2s,
      box-shadow 0.2s,
      border-color 0.2s,
      color 0.2s,
      background 0.2s;

    &:disabled {
      opacity: 1;
      cursor: not-allowed;
      box-shadow: none;
    }

    @include web-only {
      height: 48px;
    }

    @include mobile-only {
      height: 46px;
      font-size: $font-size-base;
    }

    &--register {
      margin-top: 0;
    }
  }

  &__switch {
    text-align: center;
    font-size: $font-size-md;
    color: var(--theme-text-1);
    margin-top: 0;

    a {
      color: $login-cta-color;
      font-weight: 500;
      text-decoration: none;
      margin-left: 2px;

      &:hover {
        text-decoration: underline;
      }
    }

    &--on-blue {
      color: rgba(255, 255, 255, 0.75);

      a {
        color: #fff;
        font-weight: 600;
      }
    }
  }

  &__blue-footer {
    position: relative;
    z-index: 1;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: 12px;
    // 去掉滑块后不再用 auto 顶开，固定与白卡间距
    margin-top: 16px;
    padding-top: 0;
    padding-bottom: 4px;

    @include mobile-only {
      gap: 10px;
      margin-top: 14px;
      padding-bottom: 2px;
    }
  }

  &__service {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    min-height: 30px;
    padding: 0;
    border: 0;
    background: transparent;
    color: #fff;
    font: inherit;
    font-size: 18px;
    cursor: pointer;

    img {
      display: block;
      width: 28px;
      height: 28px;
      object-fit: contain;
    }

    &:focus-visible {
      outline: 2px solid rgba(255, 255, 255, 0.8);
      outline-offset: 4px;
      border-radius: 4px;
    }

    @include mobile-only {
      font-size: 18px;
      min-height: 32px;
    }
  }
}

// 登入：白底品牌红字，覆盖全局 .btn--primary
.login-modal .login-modal__submit--inverse.btn.btn--primary {
  background: #ffffff;
  color: $login-cta-color;
  border: 0.8px solid $login-frame-border;
  border-image: none;
  box-shadow: 0 2px 12px rgba(var(--theme-primary-rgb), 0.15);

  &::after {
    display: none;
  }

  &:disabled {
    color: rgba(var(--theme-text-rgb), 0.35);
    background: rgba(255, 255, 255, 0.78);
  }

  &.login-modal__submit--ready:not(:disabled) {
    box-shadow: 0 4px 18px rgba(var(--theme-primary-rgb), 0.28);
    border-color: rgba(var(--theme-primary-rgb), 0.4);
  }
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;

  &--compact {
    gap: 0;
    position: relative;
  }
}

.form-label {
  font-size: $font-size-sm;
  font-weight: 500;
  color: $login-label;
  line-height: 1.2;
  text-align: left;

  &--sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
}

.form-input-wrap {
  position: relative;
}

.form-input__prefix {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  pointer-events: none;
  z-index: 1;
}

.form-input__prefix-img {
  width: 28px;
  height: 28px;
  display: block;
}

.form-input__eye {
  position: absolute;
  right: 6px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: 8px;

  img {
    display: block;
    width: 28px;
    height: 28px;
    pointer-events: none;
  }

  &:focus-visible {
    outline: 2px solid rgba(var(--theme-primary-rgb), 0.45);
    outline-offset: 1px;
  }
}

.form-group .form-input {
  width: 100%;
  height: 52px;
  border: 1px solid $login-input-border;
  border-radius: 16px;
  padding: 0 14px;
  font-family: $font-family-base;
  font-size: 16px;
  font-weight: 400;
  line-height: 1.25;
  color: $login-input-text;
  caret-color: $login-input-text;
  background-color: #fff;
  outline: none;
  transition: border-color 0.2s;
  box-sizing: border-box;

  @include mobile-only {
    height: 50px;
    border-radius: 14px;
    font-size: 15px;
  }

  &--has-prefix {
    padding-left: 48px;
  }

  &--has-suffix {
    padding-right: 48px;
  }

  &:focus {
    border-color: rgba(var(--theme-primary-rgb), 0.45);
    background-color: #fff;
  }

  &::placeholder {
    color: $login-placeholder;
  }

  &.form-input--password-dots:not(:placeholder-shown) {
    font-size: 20px;
    font-weight: 500;
    letter-spacing: 0.32em;
    line-height: 52px;

    @include mobile-only {
      font-size: 18px;
      line-height: 50px;
    }
  }

  &.form-input--password-dots:placeholder-shown {
    font-size: 16px;
    letter-spacing: normal;
    line-height: 1.25;

    @include mobile-only {
      font-size: 15px;
    }
  }

  // 输入、自动填充时保持白底（避免 Chrome 黄底、focus 改色等）
  &:-webkit-autofill,
  &:-webkit-autofill:hover,
  &:-webkit-autofill:focus,
  &:-webkit-autofill:active {
    -webkit-box-shadow: 0 0 0 1000px #fff inset;
    box-shadow: 0 0 0 1000px #fff inset;
    -webkit-text-fill-color: $login-input-text;
    caret-color: $login-input-text;
    transition: border-color 0.2s, box-shadow 0s 1000s;
  }

  &:autofill {
    box-shadow: 0 0 0 1000px #fff inset;
    -webkit-text-fill-color: $login-input-text;
  }
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s;

  .login-modal {
    transition: transform 0.3s;
  }
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;

  .login-modal {
    transform: scale(0.96) translateY(12px);
  }
}
</style>
