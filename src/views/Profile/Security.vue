<script setup>
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useToast } from '@/hooks/useToast';
import { changePassword } from '@/api/user';
import { useAppStore } from '@/store/modules/app';
import bgLoginUrl from '@/assets/images/common/bg_login.svg?url';
import iconEyeClosedUrl from '@/assets/images/common/icon_eye_closed.svg?url';
import iconEyeOpenUrl from '@/assets/images/common/icon_eye_open.svg?url';

const { t } = useI18n();
const router = useRouter();
const toast = useToast();
const appStore = useAppStore();
const { isMobile } = storeToRefs(appStore);

const activeSection = ref('');
const submitting = ref(false);
const showLogoutConfirm = ref(false);
const passwordVisibility = ref({
  loginCurrent: false,
  loginNew: false,
  loginConfirm: false,
  withdrawCurrent: false,
  withdrawNew: false,
  withdrawConfirm: false,
});

const loginCurrent = ref('');
const loginNew = ref('');
const loginConfirm = ref('');
const withdrawCurrent = ref('');
const withdrawNew = ref('');
const withdrawConfirm = ref('');

const resetForm = () => {
  loginCurrent.value = '';
  loginNew.value = '';
  loginConfirm.value = '';
  withdrawCurrent.value = '';
  withdrawNew.value = '';
  withdrawConfirm.value = '';
  Object.keys(passwordVisibility.value).forEach((field) => {
    passwordVisibility.value[field] = false;
  });
};

const toggleSection = (section) => {
  activeSection.value = activeSection.value === section ? '' : section;
  resetForm();
};

const openSecurityPanel = () => {
  activeSection.value = activeSection.value || 'login';
  resetForm();
};

const closeSecurityPanel = () => {
  activeSection.value = '';
  resetForm();
};

const togglePasswordVisible = (field) => {
  passwordVisibility.value[field] = !passwordVisibility.value[field];
};

const passwordInputType = (field) => (passwordVisibility.value[field] ? 'text' : 'password');

const passwordIcon = (field) => (passwordVisibility.value[field] ? iconEyeOpenUrl : iconEyeClosedUrl);

function handleLogout() {
  showLogoutConfirm.value = true;
}

function cancelLogout() {
  showLogoutConfirm.value = false;
}

function confirmLogout() {
  showLogoutConfirm.value = false;
  appStore.clearWebLogin();
  toast.success(t('操作成功'));
  router.push('/');
}

async function handleSave(section) {
  const current = section === 'login' ? loginCurrent.value : withdrawCurrent.value;
  const newPwd = section === 'login' ? loginNew.value : withdrawNew.value;
  const confirm = section === 'login' ? loginConfirm.value : withdrawConfirm.value;

  if (!current.trim()) { toast.error(t('请输入当前密码')); return; }
  if (!newPwd.trim()) { toast.error(t('请输入新密码')); return; }
  if (newPwd.length < 6) { toast.error(t('密码长度至少6位')); return; }
  if (!confirm.trim()) { toast.error(t('请确认新密码')); return; }
  if (newPwd !== confirm) { toast.error(t('两次密码输入不一致')); return; }

  try {
    submitting.value = true;
    await changePassword(section, current, newPwd);
    toast.success(t('操作成功'));
    resetForm();
    activeSection.value = '';
  } catch {
    toast.error(t('提交失败，请重试'));
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div class="profile-security">
    <template v-if="isMobile">
      <section class="settings-mobile-list" aria-label="settings">
        <button type="button" class="settings-mobile-row" @click="openSecurityPanel">
          <span>{{ t('安全设置') }}</span>
          <i aria-hidden="true" />
        </button>
        <button type="button" class="settings-mobile-row" @click="handleLogout">
          <span>{{ t('退出登录') }}</span>
          <i aria-hidden="true" />
        </button>
        <button type="button" class="settings-mobile-row" @click="router.push('/profile/about')">
          <span>{{ t('关于我们') }}</span>
          <i aria-hidden="true" />
        </button>
      </section>

      <Teleport to="body">
        <Transition name="settings-fade">
          <div v-if="activeSection" class="settings-security-overlay">
            <div class="settings-security-backdrop" @click="closeSecurityPanel" />
            <section
              class="settings-security-panel"
              :style="{ '--settings-panel-bg': `url(${bgLoginUrl})` }"
              aria-modal="true"
              role="dialog"
            >
              <h2>{{ t('安全设置') }}</h2>
              <div class="settings-security-tabs">
                <button
                  type="button"
                  :class="{ active: activeSection === 'login' }"
                  @click="activeSection = 'login'"
                >
                  {{ t('修改登入密码') }}
                </button>
                <button
                  type="button"
                  :class="{ active: activeSection === 'withdraw' }"
                  @click="activeSection = 'withdraw'"
                >
                  {{ t(activeSection === 'withdraw' ? '修改提现密码' : '新提现密码') }}
                </button>
              </div>

              <div class="settings-security-form">
                <div class="settings-security-tip">
                  <strong>{{ t('温馨提示') }}</strong>
                  <span v-if="activeSection === 'login'">{{ t('登录密码规则1') }}</span>
                  <span v-else>{{ t('提现密码规则1') }}</span>
                  <span v-if="activeSection === 'login'">{{ t('登录密码规则2') }}</span>
                  <span v-else>{{ t('提现密码规则2') }}</span>
                  <span v-if="activeSection === 'login'">{{ t('登录密码规则3') }}</span>
                  <span v-else>{{ t('提现密码规则3') }}</span>
                </div>

                <template v-if="activeSection === 'login'">
                  <label class="settings-security-field">
                    <span>{{ t('旧密码') }} <b>*</b></span>
                    <span class="settings-security-field__control">
                      <input v-model="loginCurrent" :type="passwordInputType('loginCurrent')" :placeholder="t('请输入旧登录密码')" />
                      <button type="button" :aria-label="t('显示密码')" @click="togglePasswordVisible('loginCurrent')">
                        <img :src="passwordIcon('loginCurrent')" alt="" />
                      </button>
                    </span>
                  </label>
                  <label class="settings-security-field">
                    <span>{{ t('新密码') }} <b>*</b></span>
                    <span class="settings-security-field__control">
                      <input v-model="loginNew" :type="passwordInputType('loginNew')" :placeholder="t('请输入新密码占位')" />
                      <button type="button" :aria-label="t('显示密码')" @click="togglePasswordVisible('loginNew')">
                        <img :src="passwordIcon('loginNew')" alt="" />
                      </button>
                    </span>
                  </label>
                  <label class="settings-security-field">
                    <span>{{ t('确认密码') }} <b>*</b></span>
                    <span class="settings-security-field__control">
                      <input v-model="loginConfirm" :type="passwordInputType('loginConfirm')" :placeholder="t('请再次输入新密码')" />
                      <button type="button" :aria-label="t('显示密码')" @click="togglePasswordVisible('loginConfirm')">
                        <img :src="passwordIcon('loginConfirm')" alt="" />
                      </button>
                    </span>
                  </label>
                </template>

                <template v-else>
                  <label class="settings-security-field">
                    <span>{{ t('旧提现密码') }} <b>*</b></span>
                    <span class="settings-security-field__control">
                      <input v-model="withdrawCurrent" :type="passwordInputType('withdrawCurrent')" :placeholder="t('请输入旧提现密码')" />
                      <button type="button" :aria-label="t('显示密码')" @click="togglePasswordVisible('withdrawCurrent')">
                        <img :src="passwordIcon('withdrawCurrent')" alt="" />
                      </button>
                    </span>
                  </label>
                  <label class="settings-security-field">
                    <span>{{ t('新提现密码') }} <b>*</b></span>
                    <span class="settings-security-field__control">
                      <input v-model="withdrawNew" :type="passwordInputType('withdrawNew')" :placeholder="t('请输入新提现密码占位')" />
                      <button type="button" :aria-label="t('显示密码')" @click="togglePasswordVisible('withdrawNew')">
                        <img :src="passwordIcon('withdrawNew')" alt="" />
                      </button>
                    </span>
                  </label>
                  <label class="settings-security-field">
                    <span>{{ t('确认提现密码') }} <b>*</b></span>
                    <span class="settings-security-field__control">
                      <input v-model="withdrawConfirm" :type="passwordInputType('withdrawConfirm')" :placeholder="t('请再次输入提现密码')" />
                      <button type="button" :aria-label="t('显示密码')" @click="togglePasswordVisible('withdrawConfirm')">
                        <img :src="passwordIcon('withdrawConfirm')" alt="" />
                      </button>
                    </span>
                  </label>
                </template>
              </div>

              <button type="button" class="settings-security-submit" :disabled="submitting" @click="handleSave(activeSection)">
                {{ t('确认修改') }}
              </button>
            </section>
            <button type="button" class="settings-security-close" :aria-label="t('关闭')" @click="closeSecurityPanel" />
          </div>
        </Transition>

        <Transition name="settings-fade">
          <div v-if="showLogoutConfirm" class="settings-logout-overlay" @click.self="cancelLogout">
            <section
              class="settings-logout-dialog"
              :style="{ '--settings-panel-bg': `url(${bgLoginUrl})` }"
              aria-modal="true"
              role="alertdialog"
            >
              <h2>{{ t('提示') }}</h2>
              <div class="settings-logout-dialog__body">
                <span class="settings-logout-dialog__info" aria-hidden="true">i</span>
                <p>{{ t('确定退出登录吗') }}</p>
              </div>
              <div class="settings-logout-dialog__actions">
                <button type="button" class="settings-logout-dialog__cancel" @click="cancelLogout">
                  {{ t('取消') }}
                </button>
                <button type="button" class="settings-logout-dialog__confirm" @click="confirmLogout">
                  {{ t('确定退出') }}
                </button>
              </div>
            </section>
          </div>
        </Transition>
      </Teleport>
    </template>

    <template v-else>
    <h3 class="section-title">{{ t('安全设置') }}</h3>

    <div class="security-list">
      <div class="security-item">
        <div class="security-item__header" @click="toggleSection('login')">
          <span class="security-item__label">{{ t('修改登入密码') }}</span>
          <span class="security-item__arrow" :class="{ open: activeSection === 'login' }">›</span>
        </div>
        <div v-if="activeSection === 'login'" class="security-item__form">
          <div class="form-group">
            <label class="form-label">{{ t('当前密码') }}</label>
            <input v-model="loginCurrent" type="password" class="form-input" :placeholder="t('请输入当前密码')" />
          </div>
          <div class="form-group">
            <label class="form-label">{{ t('新密码') }}</label>
            <input v-model="loginNew" type="password" class="form-input" :placeholder="t('请输入新密码')" />
          </div>
          <div class="form-group">
            <label class="form-label">{{ t('确认新密码') }}</label>
            <input v-model="loginConfirm" type="password" class="form-input" :placeholder="t('请确认新密码')" />
          </div>
          <button class="btn btn--primary save-btn" :disabled="submitting" @click="handleSave('login')">
            {{ submitting ? t('加载中') : t('保存') }}
          </button>
        </div>
      </div>

      <div class="security-item">
        <div class="security-item__header" @click="toggleSection('withdraw')">
          <span class="security-item__label">{{ t('修改提现密码') }}</span>
          <span class="security-item__arrow" :class="{ open: activeSection === 'withdraw' }">›</span>
        </div>
        <div v-if="activeSection === 'withdraw'" class="security-item__form">
          <div class="form-group">
            <label class="form-label">{{ t('当前密码') }}</label>
            <input v-model="withdrawCurrent" type="password" class="form-input" :placeholder="t('请输入当前密码')" />
          </div>
          <div class="form-group">
            <label class="form-label">{{ t('新密码') }}</label>
            <input v-model="withdrawNew" type="password" class="form-input" :placeholder="t('请输入新密码')" />
          </div>
          <div class="form-group">
            <label class="form-label">{{ t('确认新密码') }}</label>
            <input v-model="withdrawConfirm" type="password" class="form-input" :placeholder="t('请确认新密码')" />
          </div>
          <button class="btn btn--primary save-btn" :disabled="submitting" @click="handleSave('withdraw')">
            {{ submitting ? t('加载中') : t('保存') }}
          </button>
        </div>
      </div>
    </div>
    </template>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/tools.scss' as *;

.settings-mobile-list {
  overflow: hidden;
  border-radius: 12px;
  background: rgba(234, 241, 249, 0.72);
}

.settings-mobile-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  height: 46px;
  padding: 0 16px;
  border: none;
  border-bottom: 1px solid rgba(214, 224, 235, 0.42);
  background: transparent;
  color: #0b3462;
  font-size: 14px;
  font-weight: 500;
  text-align: left;

  &:last-child {
    border-bottom: none;
  }

  i {
    width: 8px;
    height: 8px;
    border-top: 1.5px solid rgba(11, 52, 98, 0.42);
    border-right: 1.5px solid rgba(11, 52, 98, 0.42);
    transform: rotate(45deg);
  }
}

.settings-security-overlay,
.settings-logout-overlay {
  position: fixed;
  inset: 0;
  z-index: 1200;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.58);
}

.settings-security-backdrop {
  position: absolute;
  inset: 0;
}

.settings-security-panel {
  position: relative;
  z-index: 1;
  width: min(339px, calc(100vw - 34px));
  padding: 14px 12px 12px;
  box-sizing: border-box;
  border: 1px solid rgba(255, 255, 255, 0.7);
  border-radius: 12px;
  background:
    var(--settings-panel-bg) center top / cover no-repeat,
    #2c7fff;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);

  h2 {
    margin: 0 0 12px;
    color: #fff;
    font-size: 18px;
    font-weight: 700;
    line-height: 1;
    text-align: center;
  }
}

.settings-security-tabs {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 4px;
  height: 47px;
  padding: 5px;
  border-radius: 23px;
  background: #fff;

  button {
    border: none;
    border-radius: 19px;
    background: transparent;
    color: #1c7bff;
    font-size: 14px;
    font-weight: 700;

    &.active {
      background: #1c7bff;
      color: #fff;
      box-shadow: 0 2px 6px rgba(28, 123, 255, 0.3);
    }
  }
}

.settings-security-form {
  margin-top: 10px;
  padding: 14px 12px 16px;
  border-radius: 12px;
  background: #fff;
}

.settings-security-tip {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 16px;
  padding: 12px;
  border-radius: 8px;
  background: #fff0e9;
  color: rgba(11, 52, 98, 0.36);
  font-size: 12px;
  line-height: 1.2;

  strong {
    color: #fb5c0d;
    font-size: 13px;
    font-weight: 700;
  }
}

.settings-security-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;

  > span:first-child {
    color: rgba(11, 52, 98, 0.62);
    font-size: 14px;
    font-weight: 500;
  }

  b {
    color: #ff2d2d;
    font-weight: 500;
  }
}

.settings-security-field__control {
  position: relative;
  display: block;
  width: 100%;
  height: 44px;

  input {
    width: 100%;
    height: 44px;
    padding: 0 42px 0 14px;
    box-sizing: border-box;
    border: 1px solid #e4f0fe;
    border-radius: 10px;
    background: #fff;
    color: #0b3462;
    font-size: 14px;
    outline: none;

    &:focus {
      border-color: #1c7bff;
      box-shadow: 0 0 0 1px rgba(28, 123, 255, 0.18);
    }

    &::placeholder {
      color: rgba(11, 52, 98, 0.28);
    }
  }

  button {
    position: absolute;
    right: 10px;
    top: 50%;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    padding: 0;
    border: none;
    background: transparent;
    transform: translateY(-50%);
  }

  img {
    width: 20px;
    height: 20px;
    opacity: 0.58;
  }
}

.settings-security-submit {
  width: 100%;
  height: 44px;
  margin-top: 10px;
  border: none;
  border-radius: 22px;
  background: #fff;
  color: #1c7bff;
  font-size: 16px;
  font-weight: 700;
}

.settings-security-close {
  position: absolute;
  left: 50%;
  bottom: 48px;
  z-index: 2;
  width: 24px;
  height: 24px;
  padding: 0;
  border: 1px solid rgba(255, 255, 255, 0.7);
  border-radius: 50%;
  background: transparent;
  transform: translateX(-50%);
}

.settings-security-close::before,
.settings-security-close::after {
  content: '';
  position: absolute;
  left: 6px;
  top: 11px;
  width: 10px;
  height: 1.5px;
  border-radius: 1px;
  background: rgba(255, 255, 255, 0.82);
}

.settings-security-close::before {
  transform: rotate(45deg);
}

.settings-security-close::after {
  transform: rotate(-45deg);
}

.settings-logout-dialog {
  width: min(339px, calc(100vw - 34px));
  padding: 14px 12px 12px;
  box-sizing: border-box;
  border: 1px solid rgba(255, 255, 255, 0.7);
  border-radius: 12px;
  background:
    var(--settings-panel-bg) center top / cover no-repeat,
    #2c7fff;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);

  h2 {
    margin: 0 0 12px;
    color: #fff;
    font-size: 18px;
    font-weight: 700;
    line-height: 1;
    text-align: center;
  }
}

.settings-logout-dialog__body {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 70px;
  border-radius: 12px;
  background: #fff;
  color: #0b3462;
  font-size: 16px;
  font-weight: 700;

  p {
    margin: 0;
  }
}

.settings-logout-dialog__info {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border: 1.5px solid #5d7899;
  border-radius: 50%;
  color: #5d7899;
  font-size: 12px;
  font-weight: 700;
  font-family: $font-family-num, $font-family-base;
}

.settings-logout-dialog__actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 10px;

  button {
    height: 44px;
    border: none;
    border-radius: 22px;
    font-size: 16px;
    font-weight: 700;
  }
}

.settings-logout-dialog__cancel {
  background: #fff;
  color: #ff2d2d;
}

.settings-logout-dialog__confirm {
  background: #ff3f3f;
  color: #fff;
}

.settings-fade-enter-active,
.settings-fade-leave-active {
  transition: opacity 0.18s ease;
}

.settings-fade-enter-from,
.settings-fade-leave-to {
  opacity: 0;
}

.section-title {
  font-size: $font-size-lg;
  font-weight: 700;
  color: var(--theme-text);
  margin-bottom: $spacing-3xl;
}

.security-list {
  display: flex;
  flex-direction: column;
}

.security-item {
  border-bottom: 1px solid var(--theme-divider);

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: $spacing-xl 0;
    cursor: pointer;
    transition: color 0.2s;

    &:hover {
      color: var(--theme-primary);
    }
  }

  &__label {
    font-size: $font-size-base;
    color: var(--theme-text);
  }

  &__arrow {
    font-size: 20px;
    color: var(--theme-text-1);
    transition: transform 0.2s;

    &.open {
      transform: rotate(90deg);
    }
  }

  &__form {
    display: flex;
    flex-direction: column;
    gap: $spacing-lg;
    padding-bottom: $spacing-xl;
  }
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;
}

.form-label {
  font-size: $font-size-md;
  color: var(--theme-text-1);
}

.form-input {
  height: 48px;
  border: 1.5px solid var(--theme-divider);
  border-radius: $radius-md;
  padding: 0 $spacing-lg;
  font-size: $font-size-base;
  color: var(--theme-text);
  background: transparent;
  outline: none;
  transition: border-color 0.2s;

  &:focus {
    border-color: var(--theme-primary);
  }
}

.save-btn {
  height: 48px;
  width: 200px;
  margin-top: $spacing-sm;

  @include mobile-only {
    width: 100%;
  }
}
</style>
