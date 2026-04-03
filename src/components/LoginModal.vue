<script setup>
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const props = defineProps({
  visible: Boolean,
});

const emit = defineEmits(['close']);

const account = ref('');
const password = ref('');
const isLogin = ref(true);

const close = () => emit('close');

const toggleMode = () => {
  isLogin.value = !isLogin.value;
  account.value = '';
  password.value = '';
};
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="visible" class="login-overlay" @click.self="close">
        <div class="login-modal">
          <button class="login-modal__close" @click="close">✕</button>

          <h2 class="login-modal__title">
            {{ isLogin ? t('登录') : t('注册') }}
          </h2>

          <div class="login-modal__form">
            <div class="form-group">
              <input
                v-model="account"
                class="form-input"
                :placeholder="t('请输入账号')"
                autocomplete="username"
              />
            </div>

            <div class="form-group">
              <input
                v-model="password"
                type="password"
                class="form-input"
                :placeholder="t('请输入密码')"
                autocomplete="current-password"
              />
            </div>

            <div v-if="isLogin" class="login-modal__forgot">
              <a href="javascript:;">{{ t('忘记密码') }}</a>
            </div>

            <button class="btn btn--primary login-modal__submit">
              {{ isLogin ? t('登录') : t('注册') }}
            </button>

            <div class="login-modal__switch">
              <span v-if="isLogin">
                {{ t('还没有账号') }}
                <a href="javascript:;" @click="toggleMode">{{ t('立即注册') }}</a>
              </span>
              <span v-else>
                已有账号？
                <a href="javascript:;" @click="toggleMode">{{ t('登录') }}</a>
              </span>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style lang="scss" scoped>
@use '@/styles/tools.scss' as *;

.login-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(4px);
}

.login-modal {
  position: relative;
  background: #fff;
  border-radius: $radius-lg;
  width: 440px;
  max-width: 90vw;
  padding: 48px 40px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);

  @include mobile-only {
    padding: 32px 20px;
    border-radius: $radius-md;
  }

  &__close {
    position: absolute;
    top: 16px;
    right: 16px;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: #f5f5f5;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    color: #999;
    transition: all 0.2s;

    &:hover {
      background: #eee;
      color: #333;
    }
  }

  &__title {
    font-size: 28px;
    font-weight: 700;
    color: var(--theme-text);
    text-align: center;
    margin-bottom: 32px;

    @include mobile-only {
      font-size: 22px;
      margin-bottom: 24px;
    }
  }

  &__form {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  &__forgot {
    text-align: right;
    margin-top: -8px;

    a {
      font-size: $font-size-md;
      color: var(--theme-primary);
    }
  }

  &__submit {
    width: 100%;
    height: 48px;
    font-size: $font-size-lg;
    margin-top: 8px;
  }

  &__switch {
    text-align: center;
    font-size: $font-size-md;
    color: var(--theme-text-1);

    a {
      color: var(--theme-primary);
      font-weight: 500;
    }
  }
}

.form-group {
  .form-input {
    width: 100%;
    height: 52px;
    border: 1.5px solid var(--theme-divider);
    border-radius: $radius-md;
    padding: 0 $spacing-lg;
    font-size: $font-size-base;
    color: var(--theme-text);
    background: #FAFBFD;
    outline: none;
    transition: border-color 0.2s;

    &:focus {
      border-color: var(--theme-primary);
      background: #fff;
    }

    &::placeholder {
      color: var(--theme-text-1);
    }
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
    transform: scale(0.9) translateY(20px);
  }
}
</style>
