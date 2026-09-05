import { get, post } from './request';

/** 首页聚合查询（banners + hotMarkets + vip） */
export async function fetchHomeData() {
  return get('/home');
}

/** 获取 banner 列表 */
export async function fetchBanners(position = 'home', platform = 'h5') {
  return get('/banners', { position, platform });
}

/** 上报 Banner 点击 */
export async function reportBannerClick(id) {
  return post(`/banners/${id}/click`);
}

/** 首页推荐赛事 */
export async function fetchHotMatches() {
  const [matchRes, leagueRes] = await Promise.all([
    get('/matches/hot'),
    get('/leagues').catch(() => ({ data: [] })),
  ]);
  const leagueMap = buildLeagueMap(leagueRes.data || []);
  const list = (matchRes.data || []).map((m) => {
    const norm = normalizeMatch(m);
    const info = leagueMap[m.leagueId];
    if (info) {
      norm.league = info.shortName || info.name || norm.league;
      if (!norm.leagueIcon) norm.leagueIcon = info.logoUrl || '';
    }
    return norm;
  });
  return { code: 200, data: list };
}

/** 联赛列表 */
export async function fetchLeagueList() {
  const res = await get('/leagues');
  const list = (res.data || []).map((l) => ({
    key: l.id,
    id: l.id,
    name: l.name,
    shortName: l.shortName,
    logoUrl: l.logoUrl,
    category: l.category,
    region: l.region,
    hot: l.hot,
    sortOrder: l.sortOrder,
  }));
  return { code: 200, data: list };
}

/** 热门联赛 tab */
export async function fetchHotLeagues() {
  return get('/leagues/hot');
}

/** 首页 Tab 分页大小，对齐安卓 HomeTabPageFragment.PAGE_SIZE */
export const HOME_TAB_PAGE_SIZE = 20;

/**
 * 首页联赛 Tab 的赛事列表
 * 对齐安卓首页联赛 Tab：请求 /markets/list?league=<联赛名>&pageSize=20，再按 onePerEvent 归并。
 */
export async function fetchHomeLeagueMatches(leagueName, pageNum = 1) {
  const res = await get('/markets/list', {
    league: leagueName,
    pageNum,
    pageSize: HOME_TAB_PAGE_SIZE,
  });
  const records = res.data?.records || [];
  return {
    code: 200,
    data: normalizeHomeMarkets(records),
    records,
    page: res.data,
  };
}

/**
 * 首页「热门」Tab：无 league 过滤的盘口列表（pageSize=20）
 * 对齐安卓 HomeTabPageFragment 在 cachedHotMarkets 为空或翻页时走的 HomeRepository.markets。
 */
export async function fetchHomeHotMarketPage(pageNum = 1) {
  const res = await get('/markets/list', {
    pageNum,
    pageSize: HOME_TAB_PAGE_SIZE,
  });
  const records = res.data?.records || [];
  return {
    code: 200,
    data: normalizeHomeMarkets(records),
    records,
    page: res.data,
  };
}

/**
 * 是否还有下一页（对齐安卓 HomeTabPageFragment.hasNextPage）
 * @param {object|null} page 分页元信息
 * @param {number} loadedCount 本页原始 records 条数
 * @param {number} requestedPage 请求的页码
 */
export function homeTabHasNextPage(page, loadedCount, requestedPage) {
  if (!page) return loadedCount >= HOME_TAB_PAGE_SIZE;
  const current = page.current || requestedPage;
  const size = page.size || HOME_TAB_PAGE_SIZE;
  const total = page.total;
  if (total != null) return current * size < total;
  if (page.pages != null) return current < page.pages;
  return loadedCount >= HOME_TAB_PAGE_SIZE;
}

/**
 * 比赛列表（分页 + 过滤）
 * phase：赛事阶段过滤，取值 all / live（进行中）/ upcoming（未开赛）/ finished（已结束），
 *        对齐安卓端 MatchRepository.list 的 phase 参数，由服务端完成筛选。
 */
export async function fetchMatchList(params = {}) {
  const [res, leagueRes] = await Promise.all([
    get('/matches', {
      leagueId: params.leagueId,
      date: params.date,
      phase: params.phase,
      status: params.status,
      hot: params.hot,
      pageNum: params.pageNum || 1,
      pageSize: params.pageSize || 20,
    }),
    get('/leagues').catch(() => ({ data: [] })),
  ]);
  const leagueMap = buildLeagueMap(leagueRes.data || []);
  if (res.data?.records) {
    res.data.records = res.data.records.map((m) => {
      const norm = normalizeMatch(m);
      const info = leagueMap[m.leagueId];
      if (info) {
        norm.league = info.shortName || info.name || norm.league;
        if (!norm.leagueIcon) norm.leagueIcon = info.logoUrl || '';
      }
      return norm;
    });
  }
  return res;
}

/** 获取指定联赛下的赛事列表 */
export async function fetchLeagueMatches(league) {
  const leagueRes = await get('/leagues');
  const leagues = leagueRes.data || [];
  const found = leagues.find(
    (l) => l.name === league || l.shortName === league,
  );
  if (!found) return { code: 200, data: [] };

  const res = await get('/matches', {
    leagueId: found.id,
    pageNum: 1,
    pageSize: 50,
  });
  const records = res.data?.records || [];
  return {
    code: 200,
    data: records.map((m) => {
      const norm = normalizeMatch(m);
      norm.league = found.shortName || found.name || norm.league;
      norm.leagueIcon = found.logoUrl || '';
      return norm;
    }),
  };
}

/** 赛事详情 */
export async function fetchMatchDetail(id) {
  const [res, leagueRes] = await Promise.all([
    get(`/matches/${id}`),
    get('/leagues').catch(() => ({ data: [] })),
  ]);
  if (res.data) {
    res.data = normalizeMatch(res.data);
    const leagueMap = buildLeagueMap(leagueRes.data || []);
    const info = leagueMap[res.data.leagueId];
    if (info) {
      res.data.league = info.shortName || info.name || res.data.league;
      if (!res.data.leagueIcon) res.data.leagueIcon = info.logoUrl || '';
    }
  }
  return res;
}

/** 市场列表（当前开盘） */
export async function fetchMarketList() {
  return get('/markets/open');
}

/**
 * 市场分页列表
 * period：盘口周期，市场页固定传 'FT'（全场），对齐安卓端 HomeRepository.markets，
 *         避免半场盘口造成同一赛事重复。
 */
export async function fetchMarketListPaged(params = {}) {
  return get('/markets/list', {
    pageNum: params.pageNum || 1,
    pageSize: params.pageSize || 20,
    league: params.league,
    teamName: params.teamName,
    date: params.date,
    day: params.day,
    period: params.period,
  });
}

/** 一场比赛的全部 period 摘要 */
export async function fetchMarketsByMatch(matchId) {
  return get(`/markets/${matchId}`);
}

/** 一场比赛某 period 含 pool 列表 */
export async function fetchMarketPeriod(matchId, period = 'FT') {
  return get(`/markets/${matchId}/${period}`);
}

/** 比分赔率列表 */
export async function fetchScoreMarket(matchId, tab = 'fulltime') {
  const period = tab === 'halftime' ? 'HT' : 'FT';

  const marketRes = await get(`/markets/${String(matchId)}/${period}`);
  const data = marketRes.data || {};
  const market = data.market || {};
  const pools = data.pools || [];
  const marketFeeRate = market.feeRate;

  if (import.meta.env.DEV) {
    console.log(`[ScoreMarket] ${period} matchId=${matchId} marketId=${market.marketId} pools=${pools.length}`);
  }

  const rows = pools.map((p) => ({
    score: (p.score || '0:0').replace(':', '-'),
    scoreRaw: p.score || '0:0',
    probability: p.yieldPct != null ? `${Number(p.yieldPct).toFixed(2)}%` : '0.00%',
    yieldPct: p.yieldPct,
    volumeFormatted: formatVolume(p.poolAmount),
    poolAmount: p.poolAmount,
    buyerCount: p.buyerCount,
    suspended: p.suspended,
    feeRate: p.feeRate ?? marketFeeRate,
    initialProb: p.initialProb,
    _marketId: market.marketId,
  }));

  return { code: 200, data: rows, market };
}

/** 赔率快照（历史曲线） */
export async function fetchPoolSnapshots(marketId, score, from, to) {
  return get(`/pools/${marketId}/snapshots`, { score, from, to });
}

/** 当前赔率列表（后台轮询用，静默不触发全局 loading） */
export async function fetchPoolYields(marketId) {
  return get(`/pools/${marketId}/yields`, undefined, { silent: true });
}

/**
 * 比赛场次统计
 * 返回各阶段场次数 { all, live, upcoming, finished }，可带 leagueId、date 过滤。
 */
export async function fetchMatchCounts(params = {}) {
  return get('/matches/counts', {
    leagueId: params.leagueId,
    date: params.date,
  });
}

/**
 * 市场分页列表统计
 * 返回 { all, today, tomorrow }；可带 league、teamName、period 过滤，
 * 对齐安卓端 HomeRepository.marketCounts（市场页固定传 period='FT'）。
 */
export async function fetchMarketListCounts(params = {}) {
  return get('/markets/list/counts', {
    league: params.league,
    teamName: params.teamName,
    period: params.period,
  });
}

/** 系统公开配置 */
export async function fetchPublicConfig() {
  return get('/system/public-config');
}

function normalizeMatch(m) {
  if (!m) return m;
  const cd = computeCountdown(m.kickoffAt);
  return {
    ...m,
    id: m.id || m.matchId,
    league: m.leagueShortName || m.leagueName || '',
    leagueId: m.leagueId,
    leagueIcon: m.leagueLogoUrl || m.leagueIcon || '',
    homeTeam: m.homeTeamShortName || m.homeTeamName || '',
    awayTeam: m.awayTeamShortName || m.awayTeamName || '',
    homeTeamLogo: m.homeTeamLogoUrl || m.homeTeamLogo || '',
    awayTeamLogo: m.awayTeamLogoUrl || m.awayTeamLogo || '',
    homeScore: m.ftHomeScore ?? 0,
    awayScore: m.ftAwayScore ?? 0,
    htHomeScore: m.htHomeScore ?? 0,
    htAwayScore: m.htAwayScore ?? 0,
    date: m.kickoffAt ? formatDate(m.kickoffAt) : '',
    kickoffAt: m.kickoffAt,
    betCloseAt: m.betCloseAt,
    status: m.matchStatus || m.status || '',
    hot: m.matchHot ?? m.hot ?? false,
    volume: m.displayPool != null ? formatVolume(m.displayPool)
      : m.totalVolume != null ? formatVolume(m.totalVolume)
      : m.totalPool != null ? formatVolume(m.totalPool) : '',
    countdown: cd.text,
    countdownMinutes: cd.minutes,
    topPools: buildTopPools(m),
  };
}

/**
 * 将盘口列表按「每场赛事一条」归并，对齐安卓 MarketEventReducer.onePerEvent：
 * - 优先保留全场（FT）盘口，否则取该赛事第一条
 * - 不累加各时段池金额（使用选中盘口自身的 displayPool）
 */
export function normalizeHomeMarkets(hotMarkets) {
  if (!Array.isArray(hotMarkets) || !hotMarkets.length) return [];

  const groups = new Map();
  for (const mk of hotMarkets) {
    const key = homeEventKey(mk);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(mk);
  }

  return Array.from(groups.values()).map((eventRecords) => {
    const picked =
      eventRecords.find((m) => isFullTimePeriod(m.period)) || eventRecords[0];
    return normalizeMatch({
      ...picked,
      id: picked.matchId || picked.marketId || picked.id,
      scores: picked.scores,
      topPools: picked.scores || picked.topPools,
    });
  });
}

/** 安卓 MarketEventReducer.eventKey：优先 matchId，否则联赛+开赛+主客队 */
function homeEventKey(item) {
  const matchId = String(item?.matchId ?? '').trim();
  if (matchId) return `match:${matchId}`;
  return [
    item?.leagueName || item?.league || '',
    item?.kickoffAt || '',
    item?.homeTeamName || item?.homeTeam || '',
    item?.awayTeamName || item?.awayTeam || '',
  ]
    .map((s) => String(s).trim())
    .join('|');
}

function isFullTimePeriod(period) {
  const p = String(period || '').trim().toUpperCase();
  return p === 'FT' || p === 'FULL' || p === 'FULL_TIME';
}

function buildTopPools(m) {
  const raw = m.topPools || m.scores;
  if (!Array.isArray(raw) || !raw.length) return [];
  // 对齐安卓端首页（HomeTabPageAdapter：item.scores.take(3)）：
  // 按后端返回的原始顺序取前 3 个比分（0:0 0:1 0:2 …），不按赔率重排。
  return raw.slice(0, 3).map((p) => ({
    score: (p.score || '0:0').replace(':', '-'),
    probability: p.yieldPct != null ? `${Number(p.yieldPct).toFixed(2)}%` : '0.00%',
  }));
}

function computeCountdown(kickoffAt) {
  if (!kickoffAt) return { text: '', minutes: 0 };
  try {
    const diff = new Date(kickoffAt).getTime() - Date.now();
    if (diff <= 0) return { text: '', minutes: 0 };
    // 统一输出 HH:MM:SS 格式（如 10:48:46），天数折算进小时
    const totalSec = Math.floor(diff / 1000);
    const totalHours = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    const text = `${String(totalHours).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return { text, minutes: Math.floor(diff / 60000) };
  } catch {
    return { text: '', minutes: 0 };
  }
}

function formatDate(iso) {
  try {
    const d = new Date(iso);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    return `${mm}-${dd} ${hh}:${mi}`;
  } catch {
    return '';
  }
}

function buildLeagueMap(leagues) {
  const map = {};
  for (const l of leagues) {
    map[l.id] = l;
  }
  return map;
}

function formatVolume(n) {
  if (n == null) return '0.00';
  const num = Number(n);
  if (isNaN(num)) return '0.00';
  return num.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
