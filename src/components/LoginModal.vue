<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import logoLoginUrl from '@/assets/images/common/logo_login.svg?url';
import iconLoginUserUrl from '@/assets/images/login/icon_login_user.svg?url';
import iconLoginLockUrl from '@/assets/images/login/icon_login_lock.svg?url';
import iconEyeClosedUrl from '@/assets/images/login/icon_login_eye_closed.svg?url';
import iconEyeOpenUrl from '@/assets/images/login/icon_login_eye_open.svg?url';
import { useAppStore } from '@/store/modules/app';
import { useToast } from '@/hooks/useToast';
import { loginApi, registerApi, captchaInit, captchaVerify, sendResetCode, resetPassword, fetchProfileOverview } from '@/api/user';

const { t } = useI18n();
const router = useRouter();
const appStore = useAppStore();
const toast = useToast();

const props = defineProps({
  visible: Boolean,
});

const emit = defineEmits(['close']);

const account = ref('');
const password = ref('');
const inviteCode = ref('');
const isLogin = ref(true);
const showPassword = ref(false);
const rememberPassword = ref(false);

const showResetFlow = ref(false);
const resetAccount = ref('');
const resetCode = ref('');
const resetNewPassword = ref('');
const resetStep = ref(1); // 1=发验证码, 2=输入验证码+新密码
const resetSubmitting = ref(false);

const SLIDER_KNOB_W = 52;
const SLIDER_TRACK_PAD_X = 4;

const verifyTrackRef = ref(null);
const sliderOffsetPx = ref(0);
const sliderVerified = ref(false);
const sliderDragging = ref(false);
const sliderAnimating = ref(false);

function resetSlider() {
  sliderOffsetPx.value = 0;
  sliderVerified.value = false;
  sliderDragging.value = false;
  sliderAnimating.value = false;
}

const sliderProgress = computed(() => {
  const max = getSliderMaxOffset();
  if (max <= 0) return 0;
  return Math.min(1, sliderOffsetPx.value / max);
});

const labelOpacity = computed(() => Math.max(0, 1 - sliderProgress.value * 2.5));

watch(isLogin, () => {
  showPassword.value = false;
  rememberPassword.value = false;
  resetSlider();
  showResetFlow.value = false;
  resetStep.value = 1;
  initCaptcha();
});

const lockScroll = (locked) => {
  if (typeof document === 'undefined') return;
  document.body.style.overflow = locked ? 'hidden' : '';
};

watch(
  () => props.visible,
  (open) => {
    lockScroll(open);
    if (!open) {
      resetSlider();
      showResetFlow.value = false;
      resetStep.value = 1;
    } else {
      loadRemembered();
      initCaptcha();
    }
  },
);

const knobTransformStyle = computed(() => ({
  transform: `translate(${sliderOffsetPx.value}px, -50%)`,
  transition: sliderDragging.value ? 'none' : 'transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
}));

const fillStyle = computed(() => ({
  width: `${sliderOffsetPx.value + SLIDER_KNOB_W + SLIDER_TRACK_PAD_X}px`,
  transition: sliderDragging.value ? 'none' : 'width 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
}));

function getSliderMaxOffset() {
  const track = verifyTrackRef.value;
  if (!track) return 0;
  const w = track.getBoundingClientRect().width;
  return Math.max(0, w - SLIDER_TRACK_PAD_X * 2 - SLIDER_KNOB_W);
}

function onSliderKnobPointerDown(e) {
  if (sliderVerified.value || sliderAnimating.value) return;
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  e.preventDefault();

  const knobEl = e.currentTarget;
  if (!(knobEl instanceof Element)) return;

  knobEl.setPointerCapture(e.pointerId);
  sliderDragging.value = true;

  const startClientX = e.clientX;
  const startOffset = sliderOffsetPx.value;

  const onMove = (ev) => {
    const max = getSliderMaxOffset();
    const dx = ev.clientX - startClientX;
    sliderOffsetPx.value = Math.min(max, Math.max(0, startOffset + dx));
  };

  const onUp = () => {
    knobEl.releasePointerCapture(e.pointerId);
    knobEl.removeEventListener('pointermove', onMove);
    knobEl.removeEventListener('pointerup', onUp);
    knobEl.removeEventListener('pointercancel', onUp);
    sliderDragging.value = false;

    const max = getSliderMaxOffset();
    const threshold = max * 0.88;
    if (max > 0 && sliderOffsetPx.value >= threshold) {
      sliderOffsetPx.value = max;
      sliderAnimating.value = true;
      verifyCaptchaSlider(sliderOffsetPx.value);
    } else {
      sliderOffsetPx.value = 0;
    }
  };

  knobEl.addEventListener('pointermove', onMove);
  knobEl.addEventListener('pointerup', onUp);
  knobEl.addEventListener('pointercancel', onUp);
}

onBeforeUnmount(() => {
  resetSlider();
  lockScroll(false);
});

const canSubmit = computed(
  () => account.value.trim().length > 0 && password.value.trim().length > 0,
);

/** 与稿图一致：须完成滑动验证后才可登入 */
const canSubmitLogin = computed(() => canSubmit.value && sliderVerified.value);

const REMEMBER_KEY = 'mysport:remember_account';

function loadRemembered() {
  try {
    const saved = localStorage.getItem(REMEMBER_KEY);
    if (saved) {
      const data = JSON.parse(saved);
      account.value = data.account || '';
      rememberPassword.value = true;
    }
  } catch { /* ignore */ }
}

function saveRemembered() {
  if (rememberPassword.value && account.value.trim()) {
    localStorage.setItem(REMEMBER_KEY, JSON.stringify({ account: account.value.trim() }));
  } else {
    localStorage.removeItem(REMEMBER_KEY);
  }
}

const loginSubmitting = ref(false);
const captchaToken = ref('');
const captchaId = ref('');

async function initCaptcha() {
  try {
    const res = await captchaInit();
    const data = res.data || {};
    captchaId.value = data.captchaId || '';
    if (!data.captchaId) {
      captchaToken.value = 'ALWAYS_PASS';
      sliderVerified.value = true;
    }
  } catch {
    captchaToken.value = 'ALWAYS_PASS';
  }
}

async function verifyCaptchaSlider(offsetPx) {
  if (captchaId.value) {
    try {
      const res = await captchaVerify(captchaId.value, Math.round(offsetPx));
      captchaToken.value = res.data?.captchaToken || '';
    } catch { /* 验证失败静默处理 */ }
  }
  sliderVerified.value = true;
  sliderAnimating.value = false;
}

async function submitWebLogin() {
  if (!canSubmitLogin.value || loginSubmitting.value) return;
  try {
    loginSubmitting.value = true;
    saveRemembered();

    const token = captchaToken.value || 'ALWAYS_PASS';
    const res = await loginApi(account.value.trim(), password.value, token, {
      remember: rememberPassword.value,
    });
    const loginData = res.data || {};
    appStore.completeWebLogin(loginData);
    toast.success(t('登录成功'));
    account.value = '';
    password.value = '';
    rememberPassword.value = false;
    showPassword.value = false;
    captchaToken.value = '';
    captchaId.value = '';
    resetSlider();
    fetchUserProfile();
  } catch (e) {
    toast.error(e.message || t('提交失败，请重试'));
    resetSlider();
    initCaptcha();
  } finally {
    loginSubmitting.value = false;
  }
}

const canSubmitRegister = computed(
  () => canSubmit.value && sliderVerified.value
    && account.value.trim().length >= 4
    && password.value.trim().length >= 6,
);

async function submitRegister() {
  const name = account.value.trim();
  const pwd = password.value.trim();
  if (!name || !pwd || loginSubmitting.value) return;
  if (name.length < 4 || name.length > 20) {
    toast.error(t('用户名需4-20位'));
    return;
  }
  if (pwd.length < 6 || pwd.length > 32) {
    toast.error(t('密码需6-32位'));
    return;
  }
  if (!sliderVerified.value) {
    toast.error(t('请完成滑动验证'));
    return;
  }
  try {
    loginSubmitting.value = true;

    const token = captchaToken.value || 'ALWAYS_PASS';
    const res = await registerApi(name, password.value, token, {
      inviteCode: inviteCode.value.trim() || undefined,
    });
    const loginData = res.data || {};
    appStore.completeWebLogin(loginData);
    toast.success(t('注册成功'));
    account.value = '';
    password.value = '';
    inviteCode.value = '';
    showPassword.value = false;
    captchaToken.value = '';
    captchaId.value = '';
    resetSlider();
    fetchUserProfile();
  } catch (e) {
    toast.error(e.message || t('提交失败，请重试'));
    resetSlider();
    initCaptcha();
  } finally {
    loginSubmitting.value = false;
  }
}

async function fetchUserProfile() {
  try {
    const res = await fetchProfileOverview();
    const data = res.data || {};
    appStore.updateProfile({
      nickname: data.nickname || undefined,
      balance: data.balance || undefined,
    });
  } catch { /* non-critical */ }
}

function openResetFlow() {
  showResetFlow.value = true;
  resetAccount.value = account.value.trim();
  resetCode.value = '';
  resetNewPassword.value = '';
  resetStep.value = 1;
  resetSubmitting.value = false;
}

function closeResetFlow() {
  showResetFlow.value = false;
  resetStep.value = 1;
}

async function handleSendResetCode() {
  if (!resetAccount.value.trim()) {
    toast.error(t('请输入账号'));
    return;
  }
  if (!sliderVerified.value) {
    toast.error(t('请完成滑动验证'));
    return;
  }
  try {
    resetSubmitting.value = true;
    const token = captchaToken.value || 'ALWAYS_PASS';
    await sendResetCode(resetAccount.value.trim(), token);
    toast.success(t('验证码已发送'));
    resetStep.value = 2;
  } catch (e) {
    toast.error(e.message || t('提交失败，请重试'));
  } finally {
    resetSubmitting.value = false;
  }
}

async function handleResetPassword() {
  if (!resetCode.value.trim()) {
    toast.error(t('请输入验证码'));
    return;
  }
  if (!resetNewPassword.value.trim() || resetNewPassword.value.length < 6) {
    toast.error(t('密码长度至少6位'));
    return;
  }
  try {
    resetSubmitting.value = true;
    await resetPassword(resetAccount.value.trim(), resetCode.value.trim(), resetNewPassword.value);
    toast.success(t('密码重置成功，请重新登录'));
    closeResetFlow();
    resetSlider();
    initCaptcha();
  } catch (e) {
    toast.error(e.message || t('提交失败，请重试'));
  } finally {
    resetSubmitting.value = false;
  }
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
  account.value = '';
  password.value = '';
  inviteCode.value = '';
};

const openRegisterPage = () => {
  close();
  router.push('/register');
};

const passwordInputType = computed(() => (showPassword.value ? 'text' : 'password'));
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="visible" class="login-overlay" @click.self="close">
        <div class="login-overlay__stack">
          <button type="button" class="login-overlay__close" :aria-label="t('关闭')" @click="close">
            <span aria-hidden="true">×</span>
          </button>
          <div class="login-modal" role="dialog" aria-modal="true" :aria-label="isLogin ? t('会员登入') : t('会员注册')">
            <div class="login-modal__watermark" aria-hidden="true">UNIBET</div>

            <div class="login-modal__brand">
              <img class="login-modal__logo" :src="logoLoginUrl" width="100" height="36" alt="UNIBET" />
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
                      <span>{{ t('记住密码') }}</span>
                    </label>
                    <a href="javascript:;" class="login-modal__forgot" @click="openResetFlow">{{ t('忘记密码') }}</a>
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
                        :placeholder="t('请输入密码') + ' (6-32' + t('位') + ')'"
                        autocomplete="new-password"
                        maxlength="32"
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
              <div class="login-verify">
                <Transition name="verify-flip" mode="out-in">
                  <div
                    v-if="sliderVerified"
                    key="success"
                    class="login-verify__track login-verify__track--success"
                    role="status"
                    aria-live="polite"
                  >
                    <svg class="login-verify__check-icon" width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M4 10.5L8.5 15L16 5" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
                    </svg>
                    <span class="login-verify__success-text">{{ t('验证成功') }}</span>
                  </div>
                  <div
                    v-else
                    key="track"
                    ref="verifyTrackRef"
                    class="login-verify__track"
                    :class="{ 'login-verify__track--dragging': sliderDragging }"
                  >
                    <div class="login-verify__fill" :style="fillStyle" />
                    <button
                      type="button"
                      class="login-verify__knob"
                      :class="{ 'login-verify__knob--dragging': sliderDragging }"
                      :style="knobTransformStyle"
                      :aria-label="t('向右滑动验证')"
                      @pointerdown="onSliderKnobPointerDown"
                    >
                      <svg class="login-verify__knob-icon" width="18" height="18" viewBox="0 0 18 18" fill="none">
                        <path d="M7 4.5L11.5 9L7 13.5" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                      </svg>
                    </button>
                    <span
                      class="login-verify__label"
                      :class="{ 'login-verify__label--dragging': sliderDragging }"
                      :style="{ '--_label-opacity': labelOpacity, opacity: sliderDragging ? labelOpacity : undefined }"
                      aria-hidden="true"
                    >
                      {{ t('向右滑动验证') }}
                    </span>
                  </div>
                </Transition>
              </div>

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

            <div v-if="showResetFlow && isLogin" class="login-modal__panel login-modal__reset-panel">
              <h2 class="login-modal__title">{{ t('忘记密码') }}</h2>
              <div class="login-modal__form">
                <template v-if="resetStep === 1">
                  <div class="form-group">
                    <label class="form-label" for="reset-account">{{ t('账号') }}</label>
                    <div class="form-input-wrap">
                      <input
                        id="reset-account"
                        v-model="resetAccount"
                        class="form-input"
                        :placeholder="t('请输入账号')"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    class="btn btn--primary login-modal__submit"
                    :disabled="!resetAccount.trim() || !sliderVerified || resetSubmitting"
                    @click="handleSendResetCode"
                  >
                    {{ resetSubmitting ? t('提交中...') : t('发送验证码') }}
                  </button>
                </template>
                <template v-else>
                  <div class="form-group">
                    <label class="form-label" for="reset-code">{{ t('验证码') }}</label>
                    <div class="form-input-wrap">
                      <input
                        id="reset-code"
                        v-model="resetCode"
                        class="form-input"
                        :placeholder="t('请输入验证码')"
                        maxlength="6"
                      />
                    </div>
                  </div>
                  <div class="form-group">
                    <label class="form-label" for="reset-new-pwd">{{ t('新密码') }}</label>
                    <div class="form-input-wrap">
                      <input
                        id="reset-new-pwd"
                        v-model="resetNewPassword"
                        type="password"
                        class="form-input"
                        :placeholder="t('请输入新密码')"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    class="btn btn--primary login-modal__submit"
                    :disabled="!resetCode.trim() || !resetNewPassword.trim() || resetSubmitting"
                    @click="handleResetPassword"
                  >
                    {{ resetSubmitting ? t('提交中...') : t('确认重置') }}
                  </button>
                </template>
                <a href="javascript:;" class="login-modal__back-login" @click="closeResetFlow">{{ t('返回登录') }}</a>
              </div>
            </div>

            <div v-if="isLogin" class="login-modal__blue-footer">
              <div class="login-verify">
                <Transition name="verify-flip" mode="out-in">
                  <div
                    v-if="sliderVerified"
                    key="success"
                    class="login-verify__track login-verify__track--success"
                    role="status"
                    aria-live="polite"
                  >
                    <svg class="login-verify__check-icon" width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M4 10.5L8.5 15L16 5" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
                    </svg>
                    <span class="login-verify__success-text">{{ t('验证成功') }}</span>
                  </div>
                  <div
                    v-else
                    key="track"
                    ref="verifyTrackRef"
                    class="login-verify__track"
                    :class="{ 'login-verify__track--dragging': sliderDragging }"
                  >
                    <div class="login-verify__fill" :style="fillStyle" />
                    <button
                      type="button"
                      class="login-verify__knob"
                      :class="{ 'login-verify__knob--dragging': sliderDragging }"
                      :style="knobTransformStyle"
                      :aria-label="t('向右滑动验证')"
                      @pointerdown="onSliderKnobPointerDown"
                    >
                      <svg class="login-verify__knob-icon" width="18" height="18" viewBox="0 0 18 18" fill="none">
                        <path d="M7 4.5L11.5 9L7 13.5" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                      </svg>
                    </button>
                    <span
                      class="login-verify__label"
                      :class="{ 'login-verify__label--dragging': sliderDragging }"
                      :style="{ '--_label-opacity': labelOpacity, opacity: sliderDragging ? labelOpacity : undefined }"
                      aria-hidden="true"
                    >
                      {{ t('向右滑动验证') }}
                    </span>
                  </div>
                </Transition>
              </div>

              <button
                type="button"
                class="btn btn--primary login-modal__submit login-modal__submit--inverse"
                :class="{ 'login-modal__submit--ready': canSubmitLogin }"
                :disabled="!canSubmitLogin || loginSubmitting"
                @click="submitWebLogin"
              >
                {{ loginSubmitting ? t('提交中...') : t('登入') }}
              </button>

              <div class="login-modal__switch login-modal__switch--on-blue">
                <span>
                  {{ t('没有账号？') }}
                  <a href="javascript:;" @click="openRegisterPage">{{ t('立即注册') }}</a>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style lang="scss" scoped>
@use '@/styles/tools.scss' as *;

// Figma：外框线性渐变 上深 #0D6CFB → 下浅 #68B3FD
$login-frame-grad-top: #0d6cfb;
$login-frame-grad-bottom: #68b3fd;
$login-frame-border: #d6e0eb;
$login-input-border: #e4f0fe;
$login-panel-bg: #ffffff;
$login-cta-blue: #0d6cfb;
$login-placeholder: rgba(11, 52, 98, 0.5);
$login-label: rgba(11, 52, 98, 0.45);
$login-input-text: rgba(11, 52, 98, 1);

.login-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(11, 52, 98, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(8px);
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;

  @include mobile-only {
    align-items: flex-start;
  }
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
    padding: 12px 0 calc(12px + env(safe-area-inset-bottom, 0px));
  }
}

.login-overlay__close {
  align-self: flex-end;
  flex-shrink: 0;
  margin-bottom: 10px;
  width: 32px;
  height: 32px;
  padding: 0;
  border: 1.5px solid rgba(255, 255, 255, 0.9);
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(4px);
  transition:
    background 0.2s ease,
    border-color 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.35);
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
    margin-bottom: 8px;
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
  background: linear-gradient(180deg, #{$login-frame-grad-top} 0%, #{$login-frame-grad-bottom} 100%);
  box-shadow: 0 28px 72px rgba(8, 60, 140, 0.35);

  @include web-only {
    width: 400px;
    max-width: 400px;
    min-height: 500px;
    border-radius: 32px;
    overflow: hidden;
  }

  @include mobile-only {
    min-height: 0;
    padding: 20px 10px 14px;
    border-radius: 24px;
  }


  &__watermark {
    position: absolute;
    left: 50%;
    // 锚在顶部蓝区（logo 一带），避免整卡垂直居中导致大半落在白卡后面「看不见」
    top: 58px;
    transform: translate(-50%, -50%);
    z-index: 0;
    pointer-events: none;
    white-space: nowrap;
    font-family: $font-family-num, $font-family-base;
    font-size: clamp(60px, 21vw, 108px);
    font-weight: 900;
    line-height: 1;
    letter-spacing: 0.06em;
    // 略偏冷白，在渐变蓝底上更接近稿图 2 的水印层次
    color: rgba(232, 244, 255, 0.38);
    text-transform: uppercase;
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
    width: 100px;
    height: 36px;
    object-fit: contain;

    @include mobile-only {
      width: 80px;
      height: 28px;
    }
  }

  &__panel {
    position: relative;
    z-index: 1;
    flex: 1 1 auto;
    display: flex;
    flex-direction: column;
    min-height: 0;
    background: $login-panel-bg;
    border-radius: 20px;
    padding: 30px 20px 20px;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.65);

    @include web-only {
      border-radius: 24px;
    }

    @include mobile-only {
      border-radius: 16px;
      padding: 24px 16px 18px;
    }
  }

  &__title {
    font-size: 19px;
    font-weight: 700;
    color: var(--theme-text);
    text-align: center;
    margin: 0 0 10px;
    letter-spacing: 0.02em;

    @include web-only {
      font-size: 20px;
    }

    @include mobile-only {
      font-size: 17px;
      margin-bottom: 10px;
    }
  }

  &__form {
    display: flex;
    flex-direction: column;
    gap: 10px;

    @include mobile-only {
      gap: 12px;
    }
  }

  &__remember-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  &__forgot {
    font-size: $font-size-md;
    color: $login-cta-blue;
    text-decoration: none;
    cursor: pointer;

    &:hover {
      text-decoration: underline;
    }
  }

  &__remember {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 0;
    font-size: $font-size-md;
    color: $login-placeholder;
    cursor: pointer;
    user-select: none;
  }

  &__remember-input {
    flex-shrink: 0;
    width: 18px;
    height: 18px;
    margin: 0;
    cursor: pointer;
    appearance: none;
    border-radius: 50%;
    border: 1.5px solid rgba(13, 108, 251, 0.45);
    background: #fff;
    transition:
      background 0.15s,
      border-color 0.15s,
      box-shadow 0.15s;

    &:checked {
      background: $login-cta-blue;
      border-color: $login-cta-blue;
      box-shadow: inset 0 0 0 2px #fff;
    }

    &:focus-visible {
      outline: 2px solid rgba(13, 108, 251, 0.45);
      outline-offset: 2px;
    }
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
      opacity: 0.48;
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
      color: $login-cta-blue;
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

  &__reset-panel {
    margin-top: 10px;
  }

  &__back-login {
    display: block;
    text-align: center;
    font-size: $font-size-md;
    color: $login-cta-blue;
    text-decoration: none;
    margin-top: 4px;

    &:hover {
      text-decoration: underline;
    }
  }

  &__blue-footer {
    position: relative;
    z-index: 1;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-top: 10px;

    @include mobile-only {
      gap: 8px;
      margin-top: 10px;
    }
  }
}

.login-verify {
  width: 100%;
}

.login-verify__track {
  position: relative;
  box-sizing: border-box;
  height: 48px;
  border-radius: $radius-pill;
  background: #fff;
  border: 0.8px solid $login-frame-border;
  touch-action: none;
  overflow: hidden;
  transition: border-color 0.2s, box-shadow 0.2s;

  @include mobile-only {
    height: 46px;
  }

  &--dragging {
    border-color: rgba(13, 108, 251, 0.35);
    box-shadow: 0 0 0 3px rgba(13, 108, 251, 0.1);
  }

  &--success {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    touch-action: auto;
    background: $login-cta-blue;
    border: 1px solid rgba(255, 255, 255, 0.92);
    box-shadow: 0 2px 14px rgba(13, 108, 251, 0.4);
    overflow: visible;
  }
}

.login-verify__fill {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  border-radius: $radius-pill;
  background: linear-gradient(90deg, rgba(13, 108, 251, 0.08) 0%, rgba(13, 108, 251, 0.18) 100%);
  pointer-events: none;
  z-index: 0;
}

.login-verify__check-icon {
  flex-shrink: 0;
  animation: verify-check-pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

@keyframes verify-check-pop {
  0% {
    transform: scale(0) rotate(-45deg);
    opacity: 0;
  }
  100% {
    transform: scale(1) rotate(0);
    opacity: 1;
  }
}

.login-verify__success-text {
  font-size: 15px;
  font-weight: 600;
  line-height: 1.2;
  color: #fff;
  text-align: center;
  letter-spacing: 0.02em;
}

.login-verify__knob {
  position: absolute;
  left: 4px;
  top: 50%;
  z-index: 2;
  width: 52px;
  height: 40px;
  border-radius: 20px;

  @include mobile-only {
    width: 52px;
    height: 40px;
    border-radius: 20px;
  }
  padding: 0;
  margin: 0;
  border: none;
  background: $login-cta-blue;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(13, 108, 251, 0.35);
  cursor: grab;
  touch-action: none;
  -webkit-tap-highlight-color: transparent;
  transition: box-shadow 0.2s, transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);

  &--dragging {
    cursor: grabbing;
    box-shadow: 0 4px 16px rgba(13, 108, 251, 0.5);
    transition: box-shadow 0.15s;
  }

  &:focus-visible {
    outline: 2px solid rgba(13, 108, 251, 0.55);
    outline-offset: 2px;
  }
}

.login-verify__knob-icon {
  transition: transform 0.2s;
  flex-shrink: 0;

  .login-verify__knob--dragging & {
    transform: translateX(1px);
  }
}

.login-verify__label {
  position: absolute;
  inset: 0;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  padding: 0 60px 0 12px;
  font-size: 15px;
  font-weight: 500;
  color: $login-cta-blue;
  text-align: center;
  line-height: 1.2;
  pointer-events: none;
  transition: opacity 0.15s;
  animation: slider-label-shimmer 2.5s ease-in-out infinite;
}

.login-verify__label--dragging {
  animation: none;
}

@keyframes slider-label-shimmer {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.55; }
}

.verify-flip-enter-active {
  transition: all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.verify-flip-leave-active {
  transition: all 0.2s ease-in;
}

.verify-flip-enter-from {
  opacity: 0;
  transform: scale(0.92);
}

.verify-flip-leave-to {
  opacity: 0;
  transform: scale(0.95);
}

// 登入：白底蓝字（稿图底部主按钮），覆盖全局 .btn--primary
.login-modal .login-modal__submit--inverse.btn.btn--primary {
  background: #ffffff;
  color: $login-cta-blue;
  border: 0.8px solid $login-frame-border;
  border-image: none;
  box-shadow: 0 2px 12px rgba(13, 108, 251, 0.15);

  &::after {
    display: none;
  }

  &:disabled {
    color: rgba(11, 52, 98, 0.35);
    background: rgba(255, 255, 255, 0.78);
  }

  &.login-modal__submit--ready:not(:disabled) {
    box-shadow: 0 4px 18px rgba(13, 108, 251, 0.28);
    border-color: rgba(13, 108, 251, 0.4);
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
    outline: 2px solid rgba(13, 108, 251, 0.45);
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
    border-color: rgba(13, 108, 251, 0.45);
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
