import { get, post, put, del, request } from './request';
import { bootstrapEncrypt, decryptResponse, saveSession } from './encrypt';
import { resolveErrorMessage } from './errorCodes';

/** 滑动验证码初始化 */
export async function captchaInit() {
  return get('/captcha/slider/init');
}

/** 滑动验证码校验 */
export async function captchaVerify(captchaId, x) {
  return post('/captcha/slider/verify', { captchaId, x });
}

const __DEV__ = import.meta.env.DEV;
const _S = {
  tag:     'background:#1565c0;color:#fff;padding:2px 6px;border-radius:3px;font-weight:bold',
  method:  'color:#e65100;font-weight:bold',
  url:     'color:#1b5e20',
  encrypt: 'background:#6a1b9a;color:#fff;padding:1px 5px;border-radius:3px;font-size:10px',
};

async function bootstrapRequest(url, payload, extraHeaders = {}) {
  if (__DEV__) {
    try {
      console.log(
        `%c API %c POST %c${url} %cBOOTSTRAP`,
        _S.tag, _S.method, _S.url, _S.encrypt,
      );
      console.log('%c请求参数（明文）', 'font-weight:bold;color:#1565c0', payload);
    } catch { /* */ }
  }

  const { encryptedBody, headers, aesKey } = await bootstrapEncrypt(payload);
  const fullUrl = `/api${url}`;
  const mergedHeaders = {
    ...headers,
    ...extraHeaders,
    'Content-Type': 'application/json',
  };
  const token = localStorage.getItem('mysport:token');
  if (token) mergedHeaders['X-Customer-Token'] = `Bearer ${token}`;

  try {
    const res = await fetch(fullUrl, {
      method: 'POST',
      headers: mergedHeaders,
      body: JSON.stringify(encryptedBody),
    });

    if (res.status === 401) throw new Error(resolveErrorMessage('TOKEN_EXPIRED'));

    const json = await res.json();

    if (json.iv && json.d) {
      const decrypted = await decryptResponse(aesKey, json);

      if (__DEV__) {
        try {
          console.log('%c响应数据', 'font-weight:bold;color:#2e7d32', decrypted);
        } catch { /* */ }
      }

      if (decrypted.code !== 200 && decrypted.code !== 0) {
        throw new Error(resolveErrorMessage(decrypted.msg) || `API Error ${decrypted.code}`);
      }
      if (decrypted.data?.sessionId) {
        await saveSession(decrypted.data.sessionId, aesKey);
      }
      return decrypted;
    }

    if (__DEV__) {
      try {
        console.log('%c响应数据', 'font-weight:bold;color:#2e7d32', json);
      } catch { /* */ }
    }

    if (!res.ok || (json.code !== 200 && json.code !== 0)) {
      throw new Error(resolveErrorMessage(json.msg) || `HTTP ${res.status}`);
    }

    if (json.data?.sessionId) {
      await saveSession(json.data.sessionId, aesKey);
    }
    return json;
  } catch (e) {
    if (__DEV__) {
      try {
        console.log('%c响应异常', 'color:#c62828;font-weight:bold', e.message);
      } catch { /* */ }
    }
    throw e;
  }
}

/** 登录（BOOTSTRAP 加密） */
export async function loginApi(account, password, captchaToken, options = {}) {
  return bootstrapRequest('/auth/login', {
    account,
    password,
    captchaToken: captchaToken || 'ALWAYS_PASS',
    remember: options.remember ?? false,
  }, { 'X-Device-Type': 'H5' });
}

/** 注册（BOOTSTRAP 加密） */
export async function registerApi(username, password, captchaToken, options = {}) {
  return bootstrapRequest('/auth/register', {
    username,
    password,
    captchaToken: captchaToken || 'ALWAYS_PASS',
    inviteCode: options.inviteCode,
    agentCode: options.agentCode,
    phone: options.phone,
    email: options.email,
  }, { 'X-Device-Type': 'H5' });
}

/** 登出 */
export async function logoutApi() {
  const { clearSession } = await import('./encrypt');
  try {
    await post('/auth/logout');
  } finally {
    clearSession();
  }
}

/** 刷新 token（需要 X-Refresh-Token 头） */
export async function refreshTokenApi() {
  const { getRefreshToken } = await import('./request');
  const rt = getRefreshToken();
  return request('/auth/refresh', {
    method: 'POST',
    headers: { 'X-Refresh-Token': rt },
  });
}

/** 忘记密码 — 发送验证码（明文豁免） */
export async function sendResetCode(account, captchaToken) {
  return post('/auth/reset/send-code', { account, captchaToken });
}

/** 忘记密码 — 验码改密（BOOTSTRAP 加密） */
export async function resetPassword(account, code, newPassword) {
  return bootstrapRequest('/auth/reset', { account, code, newPassword });
}

/** 获取当前用户信息 */
export async function fetchUserProfile() {
  return get('/customer/me');
}

/** 个人中心统计 */
export async function fetchProfileSummary() {
  const [meRes, statsRes, walletRes] = await Promise.all([
    get('/customer/me'),
    get('/customer/me/stats').catch(() => ({ data: {} })),
    get('/wallet').catch(() => ({ data: {} })),
  ]);
  const customer = meRes.data || {};
  const stats = statsRes.data || {};
  const wallet = walletRes.data || {};
  return {
    code: 200,
    data: {
      nickname: customer.username || '',
      memberId: customer.customerNo || '',
      balance: formatMoney(wallet.balance),
      currency: wallet.currency || 'CNY',
      vipLevel: customer.vipLevel || 1,
      totalBet: formatMoney(stats.totalBet),
      winRate: stats.winRate != null ? stats.winRate : 0,
      winRateFormatted: stats.winRate != null ? `${Number(stats.winRate).toFixed(1)}%` : '0%',
      totalProfit: stats.profit != null ? stats.profit : 0,
      totalProfitFormatted: stats.profit != null
        ? `${Number(stats.profit) >= 0 ? '+' : ''}¥${formatMoney(stats.profit)}`
        : '¥0.00',
      _customer: customer,
      _wallet: wallet,
      _stats: stats,
    },
  };
}

/** 设置头像（fileRef 由 uploadFile(purpose=avatar) 返回） */
export async function updateAvatar(fileRef) {
  return put('/customer/me/avatar', { fileRef });
}

/** 保存个人资料（联系方式） */
export async function updateProfile(data) {
  return put('/customer/me/contact', data);
}

/** 实名认证提交 */
export async function submitVerification(payload) {
  return post('/kyc/submit', payload);
}

/** 查询实名认证状态 */
export async function fetchKycStatus() {
  return get('/kyc/me');
}

/** 修改登录密码 */
export async function changePassword(type, currentPwd, newPwd) {
  if (type === 'login') {
    return put('/security/login-password', {
      oldPassword: currentPwd,
      newPassword: newPwd,
    });
  }
  return put('/security/withdraw-password', {
    oldPassword: currentPwd,
    newPassword: newPwd,
  });
}

/** 获取消息列表（解包分页结构，返回 { data: MessageVO[], total }） */
export async function fetchMessages(params = {}) {
  const res = await get('/messages', {
    pageNum: params.pageNum || 1,
    pageSize: params.pageSize || 20,
    category: params.category,
    unread: params.unread,
  });
  const page = res.data || {};
  const list = (page.records || page.list || (Array.isArray(page) ? page : [])).map((m) => ({
    ...m,
    time: m.pushAt ? formatTime(m.pushAt) : (m.createdAt ? formatTime(m.createdAt) : ''),
  }));
  return { ...res, data: list, total: page.total ?? list.length };
}

function formatTime(iso) {
  try {
    const d = new Date(iso);
    const y = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    return `${y}-${mm}-${dd} ${hh}:${mi}`;
  } catch {
    return '';
  }
}

/** 未读消息数 */
export async function fetchUnreadCount() {
  return get('/messages/unread-count');
}

/** 标记单条消息已读 */
export async function markMessageRead(id) {
  return post(`/messages/${id}/read`);
}

/** 全部消息已读 */
export async function markAllRead() {
  return post('/messages/read-all');
}

/** 获取收款方式列表 */
export async function fetchBindings() {
  return get('/bindings');
}

/** 绑定银行卡 */
export async function addBankCard(cardData) {
  return post('/bindings/bank-card', cardData);
}

/** 绑定区块链钱包 */
export async function addWallet(data) {
  return post('/bindings/crypto', data);
}

/** 解绑收款方式 */
export async function removeBinding(type, id) {
  return del(`/bindings/${type}/${id}`);
}

/** 设为默认收款方式 */
export async function setDefaultBinding(type, id) {
  return post(`/bindings/${type}/${id}/set-default`);
}

/** VIP 等级列表 */
export async function fetchVipLevels() {
  return get('/vip/levels');
}

/** 我的 VIP */
export async function fetchVipMe() {
  return get('/vip/me');
}

function formatMoney(val) {
  if (val == null) return '0.00';
  const n = Number(val);
  if (isNaN(n)) return String(val);
  return n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
