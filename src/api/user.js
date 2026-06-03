import { delay } from './mock';

/** 模拟登录 */
export async function loginApi(account, password) {
  await delay(700);
  return {
    code: 0,
    data: {
      userId: account,
      assets: '1,342,512.35',
      token: 'mock_token_' + Date.now(),
    },
  };
}

/** 模拟注册 */
export async function registerApi(account, password) {
  await delay(800);
  return {
    code: 0,
    data: {
      userId: account,
      assets: '0.00',
      token: 'mock_token_' + Date.now(),
    },
  };
}

/** 获取用户信息 */
export async function fetchUserProfile() {
  await delay(300);
  return {
    code: 0,
    data: {
      nickname: 'User_888',
      phone: '138****8888',
      avatar: null,
      verifyStatus: 'unverified',
      bankCards: [],
      wallets: [],
    },
  };
}

/** 个人中心首页概览（演示数据） */
export async function fetchProfileSummary() {
  await delay(300);
  return {
    code: 0,
    data: {
      nickname: 'Y05741',
      memberId: 'U2026023923',
      balance: '1,342,512.35',
      currency: 'CNY',
      vipLevel: 3,
      totalBet: '3,151,724.00',
      winRate: '12.8%',
      totalProfit: '952,256.00',
    },
  };
}

/** 保存个人资料 */
export async function updateProfile(data) {
  await delay(500);
  return { code: 0, message: '保存成功' };
}

/** 实名认证 */
export async function submitVerification(realName, idNumber) {
  await delay(1000);
  return { code: 0, message: '提交成功' };
}

/** 修改密码 */
export async function changePassword(type, currentPwd, newPwd) {
  await delay(600);
  return { code: 0, message: '修改成功' };
}

/** 添加银行卡 */
export async function addBankCard(cardData) {
  await delay(700);
  return {
    code: 0,
    data: {
      id: 'card_' + Date.now(),
      ...cardData,
      maskedNumber: '****' + (cardData.cardNumber || '').slice(-4),
    },
  };
}

/** 添加区块链钱包 */
export async function addWallet(type, address) {
  await delay(700);
  return {
    code: 0,
    data: { id: 'wallet_' + Date.now(), type, address },
  };
}

/** 获取消息列表 */
export async function fetchMessages() {
  await delay(400);
  return {
    code: 0,
    data: [
      { id: 1, title: '系统通知', content: '欢迎加入MySport，开始您的体育投资之旅！', time: '2026-05-22 10:00', read: false },
      { id: 2, title: '交易提醒', content: '您的订单 NO.B017748534835 已成交，请查看买入明细。', time: '2026-05-21 15:30', read: true },
      { id: 3, title: '赛事预告', content: '欧冠半决赛即将开赛，热门比分市场已开放，快来参与！', time: '2026-05-20 09:00', read: true },
    ],
  };
}
