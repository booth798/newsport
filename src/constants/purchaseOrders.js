import { getHotMatchById } from '@/constants/hotMatchCatalog';

const STATUS_ORDERED = [
  { key: '待开奖', tone: 'pending' },
  { key: '已完成', tone: 'completed' },
  { key: '已逃散', tone: 'lost' },
];

const PLATFORMS = ['UNI BET平台', 'UNIBET平台'];

function formatMoney(n) {
  return n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function buildOrder(id, match, overrides = {}) {
  const status = STATUS_ORDERED[id % STATUS_ORDERED.length];
  const h = (id * 3) % 4;
  const a = (id * 5) % 4;
  const prob = (2.1 + (id * 0.37) % 9.2).toFixed(2);
  const amount = 100 + (id * 137) % 900;
  const tradeAmount = 615000 + (id * 48291) % 400000;
  const profit = 31082 + (id * 1207) % 50000;

  return {
    id: String(id),
    platform: PLATFORMS[id % PLATFORMS.length],
    dateShort: match?.date ?? '03-19 02:30',
    statusKey: status.key,
    statusTone: status.tone,
    league: match?.league ?? '欧冠',
    homeTeam: match?.homeTeam ?? '马德里竞技',
    awayTeam: match?.awayTeam ?? '托特纳姆热刺',
    tradeAmount,
    tradeAmountFormatted: formatMoney(tradeAmount),
    profit,
    profitFormatted: `¥${formatMoney(profit)}`,
    orderNo: `NO.B01774853483511738${id}`,
    tradeTime: `2026-03-30 14:30:${String(id % 60).padStart(2, '0')}`,
    marketLabel: `比分 ${h}-${a} @ ${prob}%`,
    score: `${h}-${a}`,
    probability: `${prob}%`,
    betAmount: amount,
    betAmountFormatted: formatMoney(amount),
    fee: 1 + (id % 3),
    feeFormatted: formatMoney(1 + (id % 3)),
    estimatedProfit: 66 + (id % 40),
    estimatedProfitFormatted: formatMoney(66 + (id % 40)),
    canCancel: status.tone === 'pending',
    ...overrides,
  };
}

/** 已下单列表（演示数据） */
export function getOrderedPurchaseList(matchId, { highlightScore, highlightProbability } = {}) {
  const match = getHotMatchById(matchId);
  return Array.from({ length: 8 }, (_, i) => {
    const overrides = {};
    if (highlightScore && i === 0) {
      const prob = highlightProbability ?? '2.10';
      overrides.score = highlightScore;
      overrides.probability = prob.endsWith('%') ? prob : `${prob}%`;
      overrides.marketLabel = `比分 ${highlightScore} @ ${overrides.probability}`;
    }
    return buildOrder(i + 1, match, overrides);
  });
}

/** 预约中列表（演示数据） */
export function getScheduledPurchaseList(matchId, { highlightScore, highlightProbability } = {}) {
  const match = getHotMatchById(matchId);
  return Array.from({ length: 6 }, (_, i) => {
    const overrides = {
      statusKey: '预约中',
      statusTone: 'scheduled',
      canCancel: true,
    };
    if (highlightScore && i === 0) {
      const prob = highlightProbability ?? '2.10';
      overrides.score = highlightScore;
      overrides.probability = prob.endsWith('%') ? prob : `${prob}%`;
      overrides.marketLabel = `比分 ${highlightScore} @ ${overrides.probability}`;
    }
    return buildOrder(i + 1, match, overrides);
  });
}
