import { get, post, resolveApiAssetUrl } from './request';

/** 首页聚合查询（banners + hotMarkets + vip） */
export async function fetchHomeData() {
  const res = await get('/home');
  if (Array.isArray(res.data?.banners)) {
    res.data.banners = normalizeBanners(res.data.banners);
  }
  return res;
}

/** 获取 banner 列表 */
export async function fetchBanners(position = 'home', platform = 'h5') {
  const res = await get('/banners', { position, platform });
  if (Array.isArray(res.data)) {
    res.data = normalizeBanners(res.data);
  }
  return res;
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
      if (!norm.leagueIcon) norm.leagueIcon = resolveApiAssetUrl(info.logoUrl) || '';
    }
    return norm;
  });
  return { code: 200, data: list };
}

/** 联赛列表 */
export async function fetchLeagueList() {
  const res = await get('/leagues');
  const list = (res.data || []).map((l) => ({
    key: l.shortName || l.name,
    id: l.id,
    name: l.name,
    shortName: l.shortName,
    logoUrl: resolveApiAssetUrl(l.logoUrl),
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

/** 比赛列表（分页 + 过滤） */
export async function fetchMatchList(params = {}) {
  const [res, leagueRes] = await Promise.all([
    get('/matches', {
      leagueId: params.leagueId,
      date: params.date,
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
        if (!norm.leagueIcon) norm.leagueIcon = resolveApiAssetUrl(info.logoUrl) || '';
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
      norm.leagueIcon = resolveApiAssetUrl(found.logoUrl) || '';
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
      if (!res.data.leagueIcon) res.data.leagueIcon = resolveApiAssetUrl(info.logoUrl) || '';
    }
  }
  return res;
}

/** 市场列表（当前开盘） */
export async function fetchMarketList() {
  return get('/markets/open');
}

/** 市场分页列表 */
export async function fetchMarketListPaged(params = {}) {
  return get('/markets/list', {
    pageNum: params.pageNum || 1,
    pageSize: params.pageSize || 20,
    league: params.league,
    date: params.date,
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

  const marketRes = await get(`/markets/${matchId}/${period}`);
  const data = marketRes.data || {};
  const pools = data.pools || [];

  const rows = pools.map((p) => ({
    score: (p.score || '0:0').replace(':', '-'),
    scoreRaw: p.score || '0:0',
    probability: p.yieldPct != null ? `${Number(p.yieldPct).toFixed(2)}%` : '0.00%',
    yieldPct: p.yieldPct,
    volumeFormatted: formatVolume(p.poolAmount),
    poolAmount: p.poolAmount,
    buyerCount: p.buyerCount,
    suspended: p.suspended,
    feeRate: p.feeRate,
    initialProb: p.initialProb,
    _marketId: data.market?.marketId,
  }));

  return { code: 200, data: rows };
}

/** 赔率快照（历史曲线） */
export async function fetchPoolSnapshots(marketId, score, from, to) {
  return get(`/pools/${marketId}/snapshots`, { score, from, to });
}

/** 当前赔率列表 */
export async function fetchPoolYields(marketId) {
  return get(`/pools/${marketId}/yields`);
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
    leagueIcon: resolveApiAssetUrl(m.leagueLogoUrl || m.leagueIcon) || '',
    homeTeam: m.homeTeamShortName || m.homeTeamName || '',
    awayTeam: m.awayTeamShortName || m.awayTeamName || '',
    homeTeamLogo: resolveApiAssetUrl(m.homeTeamLogoUrl || m.homeTeamLogo) || '',
    awayTeamLogo: resolveApiAssetUrl(m.awayTeamLogoUrl || m.awayTeamLogo) || '',
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
  };
}

/** 将 /api/home hotMarkets（market 维度）聚合为 match 维度列表 */
export function normalizeHomeMarkets(hotMarkets) {
  if (!Array.isArray(hotMarkets) || !hotMarkets.length) return [];
  const matchMap = new Map();
  for (const mk of hotMarkets) {
    const mid = mk.matchId;
    if (!mid) continue;
    const existing = matchMap.get(mid);
    if (!existing) {
      matchMap.set(mid, { ...mk });
    } else {
      const pool = Number(mk.displayPool || mk.totalPool || 0);
      const existPool = Number(existing.displayPool || existing.totalPool || 0);
      if (pool > existPool) {
        existing.displayPool = mk.displayPool;
        existing.totalPool = mk.totalPool;
      }
    }
  }
  return Array.from(matchMap.values()).map((m) => normalizeMatch(m));
}

function normalizeBanners(banners) {
  return banners.map((banner) => ({
    ...banner,
    imageUrl: resolveApiAssetUrl(banner.imageUrl) || banner.imageUrl,
  }));
}

function computeCountdown(kickoffAt) {
  if (!kickoffAt) return { text: '', minutes: 0 };
  try {
    const diff = new Date(kickoffAt).getTime() - Date.now();
    if (diff <= 0) return { text: '', minutes: 0 };
    const totalMin = Math.floor(diff / 60000);
    const d = Math.floor(totalMin / 1440);
    const h = Math.floor((totalMin % 1440) / 60);
    const min = totalMin % 60;
    const parts = [];
    if (d > 0) parts.push(`${d}天`);
    if (h > 0 || d > 0) parts.push(`${h}时`);
    parts.push(`${min}分`);
    return { text: parts.join(''), minutes: totalMin };
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
  if (n == null) return '¥0.00';
  const num = Number(n);
  if (isNaN(num)) return '¥0.00';
  return `¥${num.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
