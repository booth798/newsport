/** 登录密码：6-12 位，须同时含字母与数字；允许特殊字符 */
export const LOGIN_PASSWORD_MIN_LENGTH = 6;
export const LOGIN_PASSWORD_MAX_LENGTH = 12;
// 允许字母、数字及特殊字符，仅要求长度与「至少各含一个字母、数字」
export const LOGIN_PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d).{6,12}$/;

/**
 * 密码是否包含账号（英文大小写不敏感）。
 * @param {string} password
 * @param {string|string[]|null|undefined} accountOrAccounts 账号 / 候选账号列表
 */
export function passwordContainsAccount(password, accountOrAccounts) {
  const pwd = String(password ?? '').toLowerCase();
  if (!pwd) return false;

  const list = (Array.isArray(accountOrAccounts) ? accountOrAccounts : [accountOrAccounts])
    .map((item) => String(item ?? '').trim().toLowerCase())
    .filter((item) => item.length > 0);

  return list.some((account) => pwd.includes(account));
}

/**
 * 校验登录密码格式（长度 + 字母 + 数字；特殊字符不限制）。
 * @returns {boolean}
 */
export function isLoginPasswordFormatValid(password) {
  return LOGIN_PASSWORD_PATTERN.test(String(password ?? ''));
}

/**
 * 登录密码完整校验（格式 + 不包含账号）。
 * @returns {{ ok: true } | { ok: false, messageKey: string }}
 */
export function validateLoginPassword(password, accountOrAccounts) {
  const value = String(password ?? '');
  if (!isLoginPasswordFormatValid(value)) {
    return { ok: false, messageKey: '登录密码格式提示' };
  }
  if (passwordContainsAccount(value, accountOrAccounts)) {
    return { ok: false, messageKey: '登录密码不能包含账号' };
  }
  return { ok: true };
}
