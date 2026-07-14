import { getCurrentLocale } from '@/store/modules/app';

const FALLBACK_MAP = {
  SESSION_INVALID:      { zhCN: '会话无效，请重新登录', enUS: 'Invalid session, please log in again' },
  SESSION_JWT_MISMATCH: { zhCN: '会话校验失败，请重新登录', enUS: 'Session verification failed, please log in again' },
  TOKEN_EXPIRED:        { zhCN: '登录已过期，请重新登录', enUS: 'Login expired, please log in again' },
  TOKEN_REVOKED:        { zhCN: '登录已失效，请重新登录', enUS: 'Login revoked, please log in again' },
  UNAUTHORIZED:         { zhCN: '请先登录', enUS: 'Please log in first' },
  LOGGED_IN_ELSEWHERE:  { zhCN: '您的账号已在其他设备登录，本次登录已下线', enUS: 'Your account has logged in on another device; this session was signed out' },
  ACCOUNT_DISABLED:     { zhCN: '账号已被禁用', enUS: 'Account disabled' },
  CUSTOMER_BLACKLISTED: { zhCN: '账户已被拉黑', enUS: 'Account blacklisted' },
};

let remoteMap = {};
let loaded = false;
let loading = null;

export async function loadErrorCodes() {
  if (loaded) return;
  if (loading) return loading;
  loading = (async () => {
    try {
      const res = await fetch('/api/meta/error-codes');
      const json = await res.json();
      if (json.code === 200 && Array.isArray(json.data)) {
        const map = {};
        for (const item of json.data) {
          if (item.code) {
            map[item.code] = { zhCN: item.zhCN || '', enUS: item.enUS || '' };
          }
        }
        remoteMap = map;
        loaded = true;
        if (import.meta.env.DEV) {
          console.log(`%c[ErrorCodes]%c 已加载 ${Object.keys(map).length} 个错误码`, 'background:#1565c0;color:#fff;padding:2px 6px;border-radius:3px', '');
        }
      }
    } catch {
      /* 非关键，静默失败 */
    } finally {
      loading = null;
    }
  })();
  return loading;
}

export function resolveErrorMessage(msg) {
  if (!msg) return '';
  const entry = remoteMap[msg] || FALLBACK_MAP[msg];
  if (!entry) return msg;
  const locale = getCurrentLocale();
  return locale === 'en-US' ? entry.enUS : entry.zhCN;
}

export const FORCE_LOGOUT_CODES = new Set([
  'LOGGED_IN_ELSEWHERE',
  'TOKEN_EXPIRED',
  'TOKEN_REVOKED',
  'ACCOUNT_DISABLED',
  'CUSTOMER_BLACKLISTED',
]);

export function isForceLogoutCode(code) {
  return FORCE_LOGOUT_CODES.has(code);
}
