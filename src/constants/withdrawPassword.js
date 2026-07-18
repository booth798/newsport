/** 提现密码规则：固定 6 位数字（设置 / 修改 / 提现校验共用） */
export const WITHDRAW_PASSWORD_PATTERN = /^\d{6}$/;
export const WITHDRAW_PASSWORD_MAX_LENGTH = 6;

export function isValidWithdrawPassword(value) {
  return WITHDRAW_PASSWORD_PATTERN.test(String(value ?? '').trim());
}

/** 输入时只保留数字并截断到 6 位 */
export function sanitizeWithdrawPasswordInput(value) {
  return String(value ?? '').replace(/\D/g, '').slice(0, WITHDRAW_PASSWORD_MAX_LENGTH);
}
