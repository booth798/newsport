import { delay } from './mock';
import { getOrderedPurchaseList, getScheduledPurchaseList } from '@/constants/purchaseOrders';

/** 获取已下单列表 */
export async function fetchOrderedList(matchId, options = {}) {
  await delay(450);
  const list = getOrderedPurchaseList(matchId, options);
  return { code: 0, data: list };
}

/** 获取预约中列表 */
export async function fetchScheduledList(matchId, options = {}) {
  await delay(450);
  const list = getScheduledPurchaseList(matchId, options);
  return { code: 0, data: list };
}

/** 取消订单 */
export async function cancelOrder(orderId) {
  await delay(600);
  return { code: 0, message: '取消成功' };
}

/** 提交买入 */
export async function submitBuyOrder(payload) {
  await delay(800);
  const orderNo = `NO.B0177485348351173${Date.now() % 10000}`;
  return {
    code: 0,
    data: {
      orderNo,
      amount: payload.amount,
      yieldPercent: payload.yieldPercent,
      profit: (payload.amount * (payload.yieldPercent / 100)).toFixed(2),
    },
  };
}
