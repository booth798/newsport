/** 提现密码规则：固定 6 位数字（设置 / 修改 / 提现校验共用） */
export const WITHDRAW_PASSWORD_PATTERN = /^\d{6}$/;
export const WITHDRAW_PASSWORD_MAX_LENGTH = 6;

/** 后端未设置提现密码相关错误码（与 meta/error-codes、业务文案对齐） */
export const WITHDRAW_PASSWORD_NOT_SET_CODES = new Set([
  'WITHDRAW_PASSWORD_NOT_SET',
  'WITHDRAW_PASSWORD_REQUIRED',
  'WITHDRAW_PWD_NOT_SET',
  'PASSWORD_NOT_SET',
]);

export function isValidWithdrawPassword(value) {
  return WITHDRAW_PASSWORD_PATTERN.test(String(value ?? '').trim());
}

/** 输入时只保留数字并截断到 6 位 */
export function sanitizeWithdrawPasswordInput(value) {
  return String(value ?? '').replace(/\D/g, '').slice(0, WITHDRAW_PASSWORD_MAX_LENGTH);
}

/**
 * 是否「请先设置提现/提款密码」类错误。
 * 命中后应弹确认窗引导去设置，而不是 toast「响应异常」文案。
 */
export function isWithdrawPasswordNotSetError(error) {
  const code = String(error?.code ?? '').trim().toUpperCase();
  const msg = String(error?.message ?? error?.msg ?? '').trim();
  if (code && WITHDRAW_PASSWORD_NOT_SET_CODES.has(code)) return true;
  if (/WITHDRAW.*PASSWORD.*(NOT_SET|REQUIRED|UNSET)/i.test(code)) return true;
  return /请先设置提[现款]密码|还没有设置提现密码|未设置提现密码|set.*withdraw(al)?\s*password/i.test(msg);
}
