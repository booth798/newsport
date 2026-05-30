import { delay } from './mock';
import { DEFAULT_HOT_MATCHES, getHotMatchById } from '@/constants/hotMatchCatalog';
import { MARKET_LEAGUE_LIST } from '@/constants/marketLeagues';

/** 获取首页热门赛事列表 */
export async function fetchHotMatches() {
  await delay(500);
  return { code: 0, data: DEFAULT_HOT_MATCHES };
}

/** 获取全部赛事联赛列表（市场列表页） */
export async function fetchLeagueList() {
  await delay(300);
  return { code: 0, data: MARKET_LEAGUE_LIST };
}

/** 获取指定联赛下的赛事列表（联赛市场页） */
export async function fetchLeagueMatches(league) {
  await delay(350);
  const data = DEFAULT_HOT_MATCHES.filter((m) => m.league === league);
  return { code: 0, data };
}

/** 获取市场列表（带分类筛选） */
export async function fetchMarketList(sport = 'all') {
  await delay(400);
  const SPORT_LEAGUES = {
    football: ['欧冠', '英超', '西甲', '德甲', '意甲', '法甲'],
    basketball: ['NBA', 'CBA', '欧篮'],
    esports: ['LPL', 'LCK', 'DOTA2'],
  };
  const allMarkets = [
    { id: 1, league: '欧冠', sport: 'football', date: '03-19 02:30', homeTeam: '亚特兰大', awayTeam: '拜仁慕尼黑', homeOdds: 2.45, drawOdds: 3.20, awayOdds: 2.80, volume: '10.00M', status: 'upcoming' },
    { id: 2, league: '英超', sport: 'football', date: '03-19 03:00', homeTeam: '利物浦', awayTeam: '曼联', homeOdds: 1.85, drawOdds: 3.50, awayOdds: 4.20, volume: '8.50M', status: 'upcoming' },
    { id: 3, league: '西甲', sport: 'football', date: '03-20 01:00', homeTeam: '巴塞罗那', awayTeam: '皇家马德里', homeOdds: 2.10, drawOdds: 3.30, awayOdds: 3.40, volume: '15.00M', status: 'upcoming' },
    { id: 4, league: '德甲', sport: 'football', date: '03-20 03:30', homeTeam: '多特蒙德', awayTeam: '勒沃库森', homeOdds: 2.60, drawOdds: 3.10, awayOdds: 2.70, volume: '6.20M', status: 'live' },
    { id: 5, league: '意甲', sport: 'football', date: '03-21 01:00', homeTeam: 'AC米兰', awayTeam: '国际米兰', homeOdds: 3.20, drawOdds: 3.10, awayOdds: 2.25, volume: '12.80M', status: 'upcoming' },
  ];
  const filtered = sport === 'all' ? allMarkets : allMarkets.filter((m) => m.sport === sport);
  return { code: 0, data: filtered };
}

/** 获取赛事详情 */
export async function fetchMatchDetail(id) {
  await delay(300);
  const match = getHotMatchById(id);
  return { code: 0, data: match };
}

function formatVolumeMoney(n) {
  return `¥${n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** 获取比分市场数据（全场/半场） */
export async function fetchScoreMarket(matchId, tab = 'fulltime') {
  await delay(350);
  const rows = [];
  const tabSalt = tab === 'halftime' ? 41 : 0;
  for (let h = 0; h <= 3; h += 1) {
    for (let a = 0; a <= 3; a += 1) {
      const k = (h * 4 + a + matchId * 7 + tabSalt) % 97;
      const prob = 2.1 + (k * 0.191) % 9.2;
      const volumeBase = 6_000_000 + (k * 97_127 + h * 11_000 + a * 19_000) % 92_000_000;
      rows.push({
        score: `${h}-${a}`,
        probability: `${prob.toFixed(2)}%`,
        volumeFormatted: formatVolumeMoney(volumeBase),
      });
    }
  }
  return { code: 0, data: rows };
}
