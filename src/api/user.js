import { get, post, put, request } from './request';
import { bootstrapEncrypt, decryptResponse, saveSession } from './encrypt';

/** 滑动验证码初始化 */
export async function captchaInit() {
  return get('/captcha/slider/init');
}

/** 滑动验证码校验 */
export async function captchaVerify(captchaId, x) {
  return post('/captcha/slider/verify', { captchaId, x });
}

async function bootstrapRequest(url, payload, extraHeaders = {}) {
  const { encryptedBody, headers, aesKey } = await bootstrapEncrypt(payload);
  const fullUrl = `/api${url}`;
  const mergedHeaders = {
    ...headers,
    ...extraHeaders,
    'Content-Type': 'application/json',
  };
  const token = localStorage.getItem('mysport:token');
  if (token) mergedHeaders['X-Customer-Token'] = token;

  const res = await fetch(fullUrl, {
    method: 'POST',
    headers: mergedHeaders,
    body: JSON.stringify(encryptedBody),
  });

  if (res.status === 401) throw new Error('登录已过期，请重新登录');

  const json = await res.json();

  if (json.iv && json.d) {
    const decrypted = await decryptResponse(aesKey, json);
    if (decrypted.code !== 200 && decrypted.code !== 0) {
      throw new Error(decrypted.msg || `API Error ${decrypted.code}`);
    }
    if (decrypted.data?.sessionId) {
      await saveSession(decrypted.data.sessionId, aesKey);
    }
    return decrypted;
  }

  if (!res.ok || (json.code !== 200 && json.code !== 0)) {
    throw new Error(json.msg || `HTTP ${res.status}`);
  }

  if (json.data?.sessionId) {
    await saveSession(json.data.sessionId, aesKey);
  }
  return json;
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
  return post('/auth/logout');
}

/** 刷新 token */
export async function refreshTokenApi() {
  return post('/auth/refresh');
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
      winRate: stats.winRate != null ? `${stats.winRate}%` : '0%',
      totalProfit: formatMoney(stats.profit),
      _customer: customer,
      _wallet: wallet,
      _stats: stats,
    },
  };
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

/** 获取消息列表 */
export async function fetchMessages(params = {}) {
  return get('/messages', {
    pageNum: params.pageNum || 1,
    pageSize: params.pageSize || 20,
    category: params.category,
    unread: params.unread,
  });
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
  const { del } = await import('./request');
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
