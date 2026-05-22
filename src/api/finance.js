import { delay } from './mock';

/** 获取账户余额 */
export async function fetchBalance() {
  await delay(300);
  return {
    code: 0,
    data: {
      available: 10000.00,
      formatted: '10,000.00',
    },
  };
}

/** 充值 */
export async function submitDeposit(amount) {
  await delay(800);
  return { code: 0, message: '充值成功', data: { amount } };
}

/** 提领 */
export async function submitWithdraw(amount) {
  await delay(800);
  return { code: 0, message: '提领申请已提交', data: { amount } };
}

/** 获取交易记录 */
export async function fetchRecords(type = 'all') {
  await delay(500);
  const allRecords = [
    { id: 1, type: 'deposit', amount: '+¥5,000.00', time: '2026-05-20 14:30', status: '已完成', statusTone: 'completed' },
    { id: 2, type: 'trade', amount: '-¥1,200.00', time: '2026-05-19 10:15', status: '已成交', statusTone: 'completed', desc: '欧冠 亚特兰大 vs 拜仁 比分1-0' },
    { id: 3, type: 'withdraw', amount: '-¥3,000.00', time: '2026-05-18 09:00', status: '处理中', statusTone: 'pending' },
    { id: 4, type: 'trade', amount: '+¥2,580.00', time: '2026-05-17 22:30', status: '已结算', statusTone: 'completed', desc: '英超 利物浦 vs 曼联 比分2-1' },
    { id: 5, type: 'deposit', amount: '+¥10,000.00', time: '2026-05-16 11:00', status: '已完成', statusTone: 'completed' },
  ];
  const filtered = type === 'all' ? allRecords : allRecords.filter((r) => r.type === type);
  return { code: 0, data: filtered };
}
