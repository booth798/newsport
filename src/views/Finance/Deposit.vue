<script setup>
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';

import { fetchDepositChannels, submitDeposit, fetchBalance } from '@/api/finance';
import { useToast } from '@/hooks/useToast';

const { t } = useI18n();
const toast = useToast();

const QUICK_AMOUNTS = [100, 500, 1000, 5000];

const DEFAULT_CHANNELS = [
  { channelCode: 'BANK', channelName: '银行转账', minAmount: 10, maxAmount: 50000 },
  { channelCode: 'ALIPAY', channelName: '支付宝', minAmount: 10, maxAmount: 50000 },
  { channelCode: 'USDT', channelName: 'USDT', minAmount: 10, maxAmount: 50000 },
];

const DEFAULT_BALANCE = {
  currency: 'CNY',
  formatted: '1,342,512.35',
};

const loading = ref(true);
const error = ref(false);
const submitting = ref(false);

const balance = ref(null);
const channels = ref([]);
const selectedChannel = ref(null);
const amount = ref('');

const currentChannel = computed(() =>
  channels.value.find((c) => c.channelCode === selectedChannel.value),
);

const isEmpty = computed(() => !loading.value && !error.value && channels.value.length === 0);

onMounted(() => {
  loadData();
});

async function loadData() {
  loading.value = true;
  error.value = false;
  balance.value = DEFAULT_BALANCE;
  channels.value = DEFAULT_CHANNELS;
  selectedChannel.value = DEFAULT_CHANNELS[0].channelCode;
  loading.value = false;
  try {
    const withTimeout = (promise, fallback) =>
      Promise.race([
        promise,
        new Promise((resolve) => {
          window.setTimeout(() => resolve(fallback), 1800);
        }),
      ]);
    const [balanceRes, channelsRes] = await Promise.all([
      withTimeout(fetchBalance(), { data: DEFAULT_BALANCE }).catch(() => ({ data: DEFAULT_BALANCE })),
      withTimeout(fetchDepositChannels(), null).catch(() => null),
    ]);
    balance.value = balanceRes.data || DEFAULT_BALANCE;

    const list = channelsRes?.data;
    channels.value = Array.isArray(list) && list.length > 0 ? list : DEFAULT_CHANNELS;
    selectedChannel.value = channels.value[0]?.channelCode ?? null;
  } catch {
    balance.value = DEFAULT_BALANCE;
    channels.value = DEFAULT_CHANNELS;
    selectedChannel.value = DEFAULT_CHANNELS[0].channelCode;
  } finally { /* default content is already visible while network refreshes */ }
}

function selectAmount(val) {
  amount.value = String(val);
}

async function handleSubmit() {
  const val = Number(amount.value);
  if (!amount.value.trim()) {
    toast.error(t('请输入充值金额'));
    return;
  }
  if (!Number.isFinite(val) || val <= 0) {
    toast.error(t('金额必须大于零'));
    return;
  }
  if (!selectedChannel.value) {
    toast.error(t('请选择充值渠道'));
    return;
  }

  const ch = currentChannel.value;
  if (ch) {
    if (val < ch.minAmount) {
      toast.error(t('最低充值金额为') + ` ${ch.minAmount}`);
      return;
    }
    if (val > ch.maxAmount) {
      toast.error(t('最高充值金额为') + ` ${ch.maxAmount}`);
      return;
    }
  }

  try {
    submitting.value = true;
    await submitDeposit(selectedChannel.value, val);
    toast.success(t('充值提交成功'));
    amount.value = '';
    const res = await fetchBalance().catch(() => null);
    if (res?.data) balance.value = res.data;
  } catch {
    toast.error(t('提交失败请重试'));
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div class="deposit-page" aria-label="deposit">
    <!-- Loading -->
    <div v-if="loading" class="deposit-state">
      <span class="deposit-state__text">{{ t('加载中...') }}</span>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="deposit-state deposit-state--error">
      <span class="deposit-state__text">{{ t('加载失败') }}</span>
      <button class="btn btn--primary deposit-state__retry" type="button" @click="loadData">
        {{ t('重试') }}
      </button>
    </div>

    <!-- Empty (no channels at all — defensive) -->
    <div v-else-if="isEmpty" class="deposit-state">
      <span class="deposit-state__text">{{ t('暂无可用充值渠道') }}</span>
    </div>

    <!-- Main content -->
    <template v-else>
      <!-- Balance card -->
      <section v-if="balance" class="deposit-balance card-default">
        <span class="deposit-balance__label">{{ t('钱包余额') }}</span>
        <span class="deposit-balance__value">
          {{ balance.currency === 'CNY' ? '\u00A5' : '' }}{{ balance.formatted }}
        </span>
      </section>

      <!-- Channel selector -->
      <section class="deposit-channels card-default">
        <span class="deposit-channels__title">{{ t('充值渠道') }}</span>
        <div class="deposit-channels__list">
          <button
            v-for="ch in channels"
            :key="ch.channelCode"
            type="button"
            class="deposit-channels__btn"
            :class="{ active: selectedChannel === ch.channelCode }"
            @click="selectedChannel = ch.channelCode"
          >
            {{ t(ch.channelName) }}
          </button>
        </div>
      </section>

      <!-- Form -->
      <form class="deposit-form card-default" @submit.prevent="handleSubmit">
        <!-- Notice -->
        <div class="deposit-form__notice">
          <span class="deposit-form__notice-icon">!</span>
          <span>{{ t('充值金额到账后将自动更新余额，请耐心等待') }}</span>
        </div>

        <!-- Amount -->
        <label class="finance-field">
          <span class="finance-field__label">{{ t('充值金额') }}</span>
          <input
            v-model="amount"
            class="finance-field__input"
            inputmode="decimal"
            :placeholder="
              currentChannel
                ? `${t('限额')} ${currentChannel.minAmount} - ${currentChannel.maxAmount}`
                : t('请输入金额')
            "
          />
        </label>

        <!-- Quick amounts -->
        <div class="deposit-quick">
          <button
            v-for="q in QUICK_AMOUNTS"
            :key="q"
            type="button"
            class="deposit-quick__btn"
            :class="{ active: amount === String(q) }"
            @click="selectAmount(q)"
          >
            {{ q }}
          </button>
        </div>

        <!-- Notice list -->
        <div class="deposit-tips">
          <p class="deposit-tips__title">{{ t('充值说明') }}</p>
          <ul class="deposit-tips__list">
            <li>{{ t('充值成功后资金将在短时间内到账') }}</li>
            <li>{{ t('请确认充值金额与实际转账金额一致') }}</li>
            <li>{{ t('如遇问题请联系在线客服') }}</li>
          </ul>
        </div>

        <!-- Submit -->
        <button
          class="btn btn--primary deposit-form__submit"
          type="submit"
          :disabled="submitting"
        >
          {{ submitting ? t('提交中...') : t('确认充值') }}
        </button>
      </form>
    </template>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/tools.scss' as *;

.deposit-page {
  display: flex;
  flex-direction: column;
  gap: 14px;
  width: 100%;
  max-width: 100%;
  overflow-x: hidden;
}

/* ---------- States ---------- */
.deposit-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;

  @include web-only {
    min-height: min(690px, calc(100dvh - 12px));
  }

  @include mobile-only {
    min-height: calc(100dvh - 60px);
  }
}

.deposit-state__text {
  color: var(--theme-text-2, #999);
  font-size: $font-size-base;
}

.deposit-state__retry {
  width: 120px;
  height: 40px;
  font-size: $font-size-base;
}

/* ---------- Balance ---------- */
.deposit-balance {
  box-sizing: border-box;
  width: 100%;
  max-width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;

  @include web-only {
    height: 92px;
    padding: 0 $spacing-2xl;
    border-radius: $radius-xl;
  }

  @include mobile-only {
    height: 84px;
    padding: 0 $spacing-lg;
    border-radius: $radius-lg;
  }
}

.deposit-balance__label {
  color: var(--theme-text-1);
  font-weight: 500;

  @include web-only {
    font-size: $font-size-base;
  }

  @include mobile-only {
    font-size: $font-size-md;
  }
}

.deposit-balance__value {
  color: var(--theme-primary);
  font-family: $font-family-num, $font-family-base;
  font-weight: 700;

  @include web-only {
    font-size: 24px;
  }

  @include mobile-only {
    font-size: $font-size-lg;
  }
}

/* ---------- Channels ---------- */
.deposit-channels {
  box-sizing: border-box;
  width: 100%;
  max-width: 100%;

  @include web-only {
    padding: $spacing-2xl;
    border-radius: $radius-xl;
  }

  @include mobile-only {
    padding: $spacing-lg;
    border-radius: $radius-lg;
  }
}

.deposit-channels__title {
  display: block;
  color: var(--theme-text-1);
  font-weight: 500;
  margin-bottom: 14px;

  @include web-only {
    font-size: $font-size-base;
  }

  @include mobile-only {
    font-size: $font-size-md;
  }
}

.deposit-channels__list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.deposit-channels__btn {
  height: 44px;
  padding: 0 24px;
  border: 1px solid var(--theme-divider);
  border-radius: $radius-pill;
  background: var(--auxiliary-1);
  color: var(--theme-text);
  font-size: 15px;
  cursor: pointer;
  transition:
    border-color 0.18s ease,
    color 0.18s ease,
    background 0.18s ease;

  @include mobile-only {
    flex: 1 1 0;
    min-width: 0;
    padding: 0 12px;
    font-size: $font-size-md;
  }
}

.deposit-channels__btn:hover,
.deposit-channels__btn.active {
  border-color: var(--theme-primary);
  color: var(--theme-primary);
  background: var(--surface-card);
  box-shadow: var(--shadow-primary-btn);
}

/* ---------- Form ---------- */
.deposit-form {
  box-sizing: border-box;
  width: 100%;
  max-width: 100%;

  @include web-only {
    padding: $spacing-2xl $spacing-2xl 30px;
    border-radius: $radius-xl;
  }

  @include mobile-only {
    padding: $spacing-lg;
    border-radius: $radius-lg;
  }
}

.deposit-form__notice {
  display: flex;
  align-items: center;
  gap: $spacing-xs;
  height: 38px;
  padding: 0 $spacing-xl;
  margin-bottom: 18px;
  box-sizing: border-box;
  border-radius: $radius-lg;
  background: rgba(251, 92, 13, 0.1);
  color: var(--auxiliary-3);
  font-size: $font-size-md;
  font-weight: 400;
}

.deposit-form__notice-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  border: 1px solid currentColor;
  border-radius: 50%;
  font-family: $font-family-num, $font-family-base;
  font-size: 10px;
  font-weight: 800;
  line-height: 1;
}

/* ---------- Quick amounts ---------- */
.deposit-quick {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: $spacing-xl;
}

.deposit-quick__btn {
  height: 40px;
  border: 1px solid var(--theme-divider);
  border-radius: $radius-md;
  background: var(--auxiliary-1);
  color: var(--theme-text);
  font-family: $font-family-num, $font-family-base;
  font-size: $font-size-base;
  font-weight: 500;
  cursor: pointer;
  transition:
    border-color 0.18s ease,
    color 0.18s ease,
    background 0.18s ease;

  @include web-only {
    flex: 0 0 calc(25% - 8px);
  }

  @include mobile-only {
    flex: 1 1 calc(50% - 5px);
  }
}

.deposit-quick__btn:hover,
.deposit-quick__btn.active {
  border-color: var(--theme-primary);
  color: var(--theme-primary);
  background: rgba(28, 123, 255, 0.06);
}

/* ---------- Tips ---------- */
.deposit-tips {
  margin-bottom: 24px;
  padding: 14px $spacing-xl;
  border-radius: $radius-lg;
  background: var(--surface-card, #f7f9fc);
}

.deposit-tips__title {
  margin: 0 0 8px;
  color: var(--theme-text-1);
  font-weight: 500;

  @include web-only {
    font-size: $font-size-base;
  }

  @include mobile-only {
    font-size: $font-size-md;
  }
}

.deposit-tips__list {
  margin: 0;
  padding: 0 0 0 18px;
  color: var(--theme-text-2, #999);
  font-size: $font-size-md;
  line-height: 1.8;
}

/* ---------- Submit ---------- */
.deposit-form__submit {
  display: block;
  width: 100%;
  height: 44px;
  font-size: $font-size-lg;

  @include web-only {
    width: 300px;
    height: 48px;
    margin: 0 auto;
  }
}

/* ---------- Finance field (mirrors Withdraw.vue) ---------- */
.finance-field {
  display: flex;
  flex-direction: column;

  @include web-only {
    margin-bottom: $spacing-xl;
    gap: 10px;
  }

  @include mobile-only {
    margin-bottom: $spacing-lg;
    gap: 6px;
  }
}

.finance-field__label {
  color: var(--theme-text-1);
  font-weight: 400;

  @include web-only {
    font-size: $font-size-base;
  }

  @include mobile-only {
    font-size: $font-size-md;
  }
}

.finance-field__input {
  box-sizing: border-box;
  width: 100%;
  border: 1px solid var(--theme-divider);
  border-radius: $radius-md;
  outline: none;
  background: var(--auxiliary-1);
  color: var(--theme-text);
  font-weight: 400;

  @include web-only {
    height: 52px;
    font-size: $font-size-base;
    padding: 0 $spacing-xl;
  }

  @include mobile-only {
    font-size: $font-size-md;
    height: 44px;
    padding: 0 14px;
  }
}

.finance-field__input:focus {
  border-color: var(--theme-primary);
  background: var(--surface-card);
}

.finance-field__input::placeholder {
  color: var(--theme-text-3, #bbb);
}
</style>
