/** 全部赛事页联赛列表（与首页热门赛事联赛 Tab 一致，不含「热门」） */
export const MARKET_LEAGUE_LIST = [
  { key: '欧冠' },
  { key: '英超' },
  { key: '法甲' },
  { key: '德甲' },
  { key: '意甲' },
  { key: '西甲' },
];

export function isValidMarketLeague(league) {
  return MARKET_LEAGUE_LIST.some((item) => item.key === league);
}
