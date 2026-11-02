import { getCurrentLocale } from '@/store/modules/app';

const FALLBACK_MAP = {
  SESSION_INVALID:      { zhCN: '会话无效，请重新登录', enUS: 'Invalid session, please log in again' },
  SESSION_JWT_MISMATCH: { zhCN: '会话校验失败，请重新登录', enUS: 'Session verification failed, please log in again' },
  TOKEN_EXPIRED:        { zhCN: '登录已过期，请重新登录', enUS: 'Login expired, please log in again' },
  TOKEN_REVOKED:        { zhCN: '登录已失效，请重新登录', enUS: 'Login revoked, please log in again' },
  UNAUTHORIZED:         { zhCN: '您的登录已过期，请重新登录', enUS: 'Your login has expired. Please log in again' },
  LOGGED_IN_ELSEWHERE:  { zhCN: '您的账号已在其他设备登录，本次登录已下线', enUS: 'Your account has logged in on another device; this session was signed out' },
  ACCOUNT_DISABLED:     { zhCN: '账号已被禁用', enUS: 'Account disabled' },
  CUSTOMER_BLACKLISTED: { zhCN: '账户已被拉黑', enUS: 'Account blacklisted' },
  WITHDRAW_PASSWORD_NOT_SET: { zhCN: '请先设置提款密码', enUS: 'Please set withdrawal password first' },
  WITHDRAW_PASSWORD_REQUIRED: { zhCN: '请先设置提款密码', enUS: 'Please set withdrawal password first' },
  // 提现流水未完成：文案用 {outstanding} 占位，由 data.outstanding 填充
  TURNOVER_REQUIRED: {
    zhCN: '提领尚需消除流水 {outstanding}',
    enUS: 'Withdrawal requires remaining turnover {outstanding}',
  },
  BANK_NOT_SUPPORTED: {
    zhCN: '暂不支持该银行，请从列表中选择',
    enUS: 'Bank not supported, please choose one from the list',
  },
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

/** 占位符取值展示：4200.00 → 4200；非整数量保留原数值字符串 */
function formatPlaceholderValue(value) {
  if (value == null) return '';
  const num = Number(value);
  if (!Number.isFinite(num)) return String(value);
  if (Number.isInteger(num)) return String(num);
  // 去掉多余尾零，如 4200.50 → 4200.5
  return String(num);
}

/**
 * 将模板中的 {key} 用 data[key] 替换（支持远程错误码与本地 FALLBACK）。
 * @param {string} template
 * @param {Record<string, unknown>|null|undefined} data
 */
export function renderErrorTemplate(template, data) {
  const text = String(template ?? '');
  if (!text || !data || typeof data !== 'object') return text;
  return text.replace(/\{(\w+)\}/g, (matched, key) => {
    if (!Object.prototype.hasOwnProperty.call(data, key)) return matched;
    return formatPlaceholderValue(data[key]);
  });
}

/**
 * 按错误码解析文案；若模板含 {field} 且传入 data，则做占位符渲染。
 * @param {string} msg 错误码（响应体 msg）
 * @param {Record<string, unknown>|null|undefined} [data] 响应体 data
 */
export function resolveErrorMessage(msg, data) {
  if (!msg) return '';
  const remote = remoteMap[msg];
  const fallback = FALLBACK_MAP[msg];
  const entry = remote || fallback;
  if (!entry) return msg;
  const locale = getCurrentLocale();
  let template = locale === 'en-US' ? (entry.enUS || msg) : (entry.zhCN || msg);
  // 远程文案若无占位符、本地兜底有占位符，则用本地模板渲染（如 TURNOVER_REQUIRED + outstanding）
  const fallbackTemplate = fallback
    ? (locale === 'en-US' ? fallback.enUS : fallback.zhCN)
    : '';
  if (
    data
    && fallbackTemplate
    && /\{(\w+)\}/.test(fallbackTemplate)
    && !/\{(\w+)\}/.test(template)
  ) {
    template = fallbackTemplate;
  }
  return renderErrorTemplate(template, data);
}

export const FORCE_LOGOUT_CODES = new Set([
  'LOGGED_IN_ELSEWHERE',
  'TOKEN_EXPIRED',
  'TOKEN_REVOKED',
  'ACCOUNT_DISABLED',
  'CUSTOMER_BLACKLISTED',
  'UNAUTHORIZED'
]);

export function isForceLogoutCode(code) {
  return FORCE_LOGOUT_CODES.has(code);
}
