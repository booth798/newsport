/**
 * 登录「记住密码」本地存储（对齐安卓 UserSessionManager.saveRememberedLogin）。
 * Web 端仅做本地回填用的轻量编码，非安全加密；取消勾选或登录时未勾选会清除。
 */

const STORAGE_KEY = 'mysport:remember_login_v1';
/** 旧版只存账号，读取时迁移 */
const LEGACY_KEY = 'mysport:remember_account';

/** UTF-8 → Base64，避免中文账号直接 btoa 失败 */
function encodePayload(value) {
  const bytes = new TextEncoder().encode(String(value ?? ''));
  let binary = '';
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary);
}

function decodePayload(value) {
  if (!value) return '';
  try {
    const binary = atob(String(value));
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return '';
  }
}

/**
 * @returns {{ account: string, password: string } | null}
 */
export function getRememberedLogin() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      const account = decodePayload(data?.a).trim();
      const password = decodePayload(data?.p);
      if (account && password) return { account, password };
    }

    // 兼容旧 key：仅账号
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const data = JSON.parse(legacy);
      const account = String(data?.account || '').trim();
      if (account) return { account, password: '' };
    }
  } catch {
    /* ignore corrupt storage */
  }
  return null;
}

/** 登录成功且勾选记住时写入账号+密码 */
export function saveRememberedLogin(account, password) {
  const a = String(account || '').trim();
  const p = String(password || '');
  if (!a || !p) {
    clearRememberedLogin();
    return;
  }
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      a: encodePayload(a),
      p: encodePayload(p),
    }),
  );
  localStorage.removeItem(LEGACY_KEY);
}

/** 取消记住或登录未勾选时清空 */
export function clearRememberedLogin() {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(LEGACY_KEY);
}
