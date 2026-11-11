/**
 * 联赛筛选：按拼音首字母分组（☆ / A-Z）。
 * 汉字名称不得落入「#」；先剥离前导空白与符号再取首字符。
 */

/** 右侧索引（不含 #，避免无法归类的汉字被错误堆到 #） */
export const LEAGUE_INDEX_ENTRIES = ['☆', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')];

/**
 * 拼音首字母锚点（用于 localeCompare co-pinyin）。
 * 无 I/U/V：普通话声母不含这三个独立首字母。
 * 锚点必须是该字母在拼音序里尽量靠前的字。
 * 若锚点偏后，更靠前的同声母字会掉进上一字母（如「俄」<「鹅」会进 D，「然」<「日」会进 Q）。
 */
const PINYIN_REFS = [
  ['A', '阿'], ['B', '八'], ['C', '嚓'], ['D', '哒'],
  ['E', '俄'], ['F', '发'], ['G', '旮'], ['H', '哈'],
  ['J', '击'], ['K', '咔'], ['L', '垃'], ['M', '妈'],
  ['N', '拿'], ['O', '噢'], ['P', '啪'], ['Q', '七'],
  ['R', '然'], ['S', '撒'], ['T', '他'], ['W', '挖'],
  ['X', '夕'], ['Y', '压'], ['Z', '匝'],
];

/** 基本区 + 扩展 A + 兼容象形等常见汉字范围 */
function isCjkIdeograph(ch) {
  if (!ch) return false;
  const code = ch.codePointAt(0);
  return (
    (code >= 0x4e00 && code <= 0x9fff) // CJK Unified
    || (code >= 0x3400 && code <= 0x4dbf) // Ext A
    || (code >= 0xf900 && code <= 0xfaff) // Compatibility
    || (code >= 0x3007 && code <= 0x3007) // 〇
  );
}

/**
 * 从展示名取出可排序的首字符：跳过空白、标点、数字、不可见字符。
 * @param {string} str
 * @returns {string}
 */
export function getLeagueSortableFirstChar(str) {
  const raw = String(str ?? '');
  for (const ch of raw) {
    const code = ch.codePointAt(0);
    // 空白 / 格式控制 / 数字（避免「21世纪」等进 #）
    if (code <= 0x20 || (code >= 0x7f && code <= 0x9f)) continue;
    if (/\d/.test(ch)) continue;
    if (/[\u3000\ufeff\u200b-\u200d\u2060·・•‧．。、，,.\-_/\\|~～'"`「」『』【】\[\]()（）]/.test(ch)) {
      continue;
    }
    if (/[a-zA-Z]/.test(ch) || isCjkIdeograph(ch)) return ch;
    // 其它字母（含全角拉丁等）也尝试参与
    if (/\p{L}/u.test(ch)) return ch;
  }
  return '';
}

/**
 * 汉字 → 拼音首字母（依赖运行时 pinyin collation；失败时兜底 A，绝不返回 #）
 * @param {string} ch
 * @returns {string}
 */
function cjkToPinyinInitial(ch) {
  let compared = false;
  try {
    for (let i = PINYIN_REFS.length - 1; i >= 0; i -= 1) {
      const order = ch.localeCompare(PINYIN_REFS[i][1], 'zh-Hans-CN-u-co-pinyin');
      compared = true;
      if (order >= 0) return PINYIN_REFS[i][0];
    }
  } catch {
    compared = false;
  }
  // 排在首个锚点「阿」之前的字仍归 A，不再按码点兜底（避免误进 X 等组）。
  if (compared) return 'A';
  // 无拼音 collation 时按码点粗分到 A–Z，避免进 #
  const code = ch.codePointAt(0) - 0x4e00;
  if (code >= 0) {
    const idx = Math.min(PINYIN_REFS.length - 1, Math.floor((code / 0x5200) * PINYIN_REFS.length));
    return PINYIN_REFS[Math.max(0, idx)][0];
  }
  return 'A';
}

/**
 * 联赛名拼音首字母，仅返回 A–Z；无法识别时返回 ''（由调用方决定是否丢弃，不进 #）。
 * @param {string} str
 * @returns {string}
 */
export function getLeaguePinyinInitial(str) {
  const ch = getLeagueSortableFirstChar(str);
  if (!ch) return '';

  if (/[a-zA-Z]/.test(ch)) return ch.toUpperCase();

  // 全角拉丁 A–Z（ＦＦ２１–ＦＦ３Ａ / ＦＦ４１–ＦＦ５Ａ）
  const code = ch.codePointAt(0);
  if (code >= 0xff21 && code <= 0xff3a) return String.fromCharCode(code - 0xff21 + 65);
  if (code >= 0xff41 && code <= 0xff5a) return String.fromCharCode(code - 0xff41 + 65);

  if (isCjkIdeograph(ch) || /\p{Script=Han}/u.test(ch)) {
    return cjkToPinyinInitial(ch);
  }

  // 其它文字：尽量用大写拉丁；否则空串（由 getLeagueGroupInitial 兜底为 A，不进 #）
  if (/\p{L}/u.test(ch)) {
    const upper = ch.toUpperCase();
    if (/[A-Z]/.test(upper)) return upper;
  }
  return '';
}

/**
 * 分组用首字母：永远落在 A–Z（无有效字符时兜底 A，保证不出现 # 分组）
 * @param {string} str
 * @returns {string}
 */
export function getLeagueGroupInitial(str) {
  const initial = getLeaguePinyinInitial(str);
  return initial || 'A';
}
