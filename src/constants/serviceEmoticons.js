/**
 * 在线客服表情（对齐安卓 online_service_emotion.xml）
 * 发送/存储为花括号占位符文本，如 `{微笑}`；展示时替换为对应 PNG。
 */

/** @type {{ code: string, file: string }[]} */
export const SERVICE_EMOTICONS = [
  { code: '{微笑}', file: 'f_static_hehe.png' },
  { code: '{爱你}', file: 'f_static_aini.png' },
  { code: '{拜拜}', file: 'f_static_baibai.png' },
  { code: '{悲伤}', file: 'f_static_beishang.png' },
  { code: '{鄙视}', file: 'f_static_bishi.png' },
  { code: '{闭嘴}', file: 'f_static_bizui.png' },
  { code: '{馋嘴}', file: 'f_static_chanzui.png' },
  { code: '{吃惊}', file: 'f_static_chijing.png' },
  { code: '{打脸}', file: 'f_static_dalian.png' },
  { code: '{敲打}', file: 'f_static_ding.png' },
  { code: '{感冒}', file: 'f_static_ganmao.png' },
  { code: '{鼓掌}', file: 'f_static_guzhang.png' },
  { code: '{哈哈}', file: 'f_static_haha.png' },
  { code: '{害羞}', file: 'f_static_haixiu.png' },
  { code: '{流汗}', file: 'f_static_han.png' },
  { code: '{嘿嘿}', file: 'f_static_heiheihei.png' },
  { code: '{黑线}', file: 'f_static_heixian.png' },
  { code: '{怨恨}', file: 'f_static_heng.png' },
  { code: '{坏笑}', file: 'f_static_huaixiao.png' },
  { code: '{花心}', file: 'f_static_huaxin.png' },
  { code: '{调皮}', file: 'f_static_jiyan.png' },
  { code: '{可爱}', file: 'f_static_keai.png' },
  { code: '{可怜}', file: 'f_static_kelian.png' },
  { code: '{装酷}', file: 'f_static_ku.png' },
  { code: '{瞌睡}', file: 'f_static_kun.png' },
  { code: '{流泪}', file: 'f_static_lei.png' },
  { code: '{发怒}', file: 'f_static_nu.png' },
  { code: '{亲亲}', file: 'f_static_qinqin.png' },
  { code: '{傻眼}', file: 'f_static_shayan.png' },
  { code: '{生病}', file: 'f_static_shengbing.png' },
  { code: '{衰衰}', file: 'f_static_shuai.png' },
  { code: '{骷髅}', file: 'f_static_kulou.png' },
  { code: '{睡觉}', file: 'f_static_shuijiao.png' },
  { code: '{龇牙}', file: 'f_static_xixi.png' },
  { code: '{开心}', file: 'f_static_taikaixin.png' },
  { code: '{跪舔}', file: 'f_static_tian.png' },
  { code: '{偷笑}', file: 'f_static_touxiao.png' },
  { code: '{挖鼻}', file: 'f_static_wabishi.png' },
  { code: '{委屈}', file: 'f_static_weiqu.png' },
  { code: '{捂眼}', file: 'f_static_wu.png' },
  { code: '{笑哭}', file: 'f_static_xiaoku.png' },
  { code: '{惊喜}', file: 'f_static_xingxingyan.png' },
  { code: '{嘘嘘}', file: 'f_static_xu.png' },
  { code: '{阴险}', file: 'f_static_yinxian.png' },
  { code: '{疑问}', file: 'f_static_yiwen.png' },
  { code: '{右哼}', file: 'f_static_youhengheng.png' },
  { code: '{左哼}', file: 'f_static_zuohengheng.png' },
  { code: '{头晕}', file: 'f_static_yun.png' },
  { code: '{运背}', file: 'f_static_yunbei.png' },
  { code: '{抓狂}', file: 'f_static_zhuakuang.png' },
  { code: '{肥皂}', file: 'f_static_feizao.png' },
  { code: '{狗狗}', file: 'f_static_doge.png' },
  { code: '{二哈}', file: 'f_static_erha.png' },
  { code: '{猫猫}', file: 'f_static_miao.png' },
  { code: '{神兽}', file: 'f_static_shenshou.png' },
  { code: '{兔子}', file: 'f_static_tuzi.png' },
  { code: '{熊猫}', file: 'f_static_xiongmao.png' },
  { code: '{猪头}', file: 'f_static_zhutou.png' },
  { code: '{小鸡}', file: 'f_static_xiaoji.png' },
  { code: '{机智}', file: 'f_static_jizhi.png' },
  { code: '{好冷}', file: 'f_static_cold.png' },
  { code: '{奋斗}', file: 'f_static_keep_fighting.png' },
  { code: '{OK}', file: 'f_static_no_prob.png' },
  { code: '{抱拳}', file: 'f_static_social.png' },
  { code: '{吃瓜}', file: 'f_static_watermelon.png' },
  { code: '{啤酒}', file: 'f_static_beer.png' },
  { code: '{赞}', file: 'f_static_good.png' },
  { code: '{加油}', file: 'f_static_comeon.png' },
  { code: '{感谢}', file: 'f_static_thanks.png' },
  { code: '{给力}', file: 'f_static_awesome.png' },
  { code: '{鲜花}', file: 'f_static_flower.png' },
];

const urlByFile = import.meta.glob('../assets/images/service/emoticons/f_static_*.png', {
  eager: true,
  query: '?url',
  import: 'default',
});

function resolveEmoticonUrl(file) {
  const key = Object.keys(urlByFile).find((path) => path.endsWith(`/${file}`));
  return key ? urlByFile[key] : '';
}

/** 面板用：占位符 + 图片 URL */
export const SERVICE_EMOTICON_ITEMS = SERVICE_EMOTICONS.map((item) => ({
  code: item.code,
  src: resolveEmoticonUrl(item.file),
}));

/** code → src */
export const SERVICE_EMOTICON_SRC_MAP = Object.fromEntries(
  SERVICE_EMOTICON_ITEMS.filter((i) => i.src).map((i) => [i.code, i.src]),
);

/** 匹配全部占位符的正则（对齐安卓 Pattern.quote + |） */
export const SERVICE_EMOTICON_PATTERN = new RegExp(
  SERVICE_EMOTICONS.map((i) => i.code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'),
  'g',
);

/**
 * 将含表情占位符的文本拆成片段，供气泡安全渲染（不对用户文本用 v-html）
 * @returns {{ type: 'text' | 'emoji', text?: string, src?: string, code?: string }[]}
 */
export function parseServiceEmoticonSegments(text) {
  const raw = String(text || '');
  if (!raw) return [];
  const segments = [];
  let lastIndex = 0;
  SERVICE_EMOTICON_PATTERN.lastIndex = 0;
  let match = SERVICE_EMOTICON_PATTERN.exec(raw);
  while (match) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', text: raw.slice(lastIndex, match.index) });
    }
    const code = match[0];
    const src = SERVICE_EMOTICON_SRC_MAP[code];
    if (src) {
      segments.push({ type: 'emoji', code, src });
    } else {
      segments.push({ type: 'text', text: code });
    }
    lastIndex = match.index + code.length;
    match = SERVICE_EMOTICON_PATTERN.exec(raw);
  }
  if (lastIndex < raw.length) {
    segments.push({ type: 'text', text: raw.slice(lastIndex) });
  }
  return segments;
}

/** 创建输入框内的表情 img（对齐安卓 ImageSpan，发送时仍用 data-emoticon 占位符） */
export function createServiceEmoticonImage(code) {
  const src = SERVICE_EMOTICON_SRC_MAP[code];
  if (!src) return null;
  const img = document.createElement('img');
  img.src = src;
  img.alt = code;
  img.dataset.emoticon = code;
  img.className = 'service-reply-input__emoticon';
  img.draggable = false;
  return img;
}

/**
 * 从 contenteditable 序列化为发送文本（img → `{微笑}`）
 * 对齐安卓 EditText.toString() 仍为占位符
 */
export function serializeServiceEmoticonEditor(root) {
  if (!root) return '';
  const parts = [];

  function walk(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      parts.push(node.nodeValue || '');
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const tag = node.tagName;
    if (tag === 'IMG' && node.dataset.emoticon) {
      parts.push(node.dataset.emoticon);
      return;
    }
    if (tag === 'BR') {
      parts.push('\n');
      return;
    }
    const isBlock = tag === 'DIV' || tag === 'P';
    if (isBlock && parts.length > 0 && !parts[parts.length - 1].endsWith('\n')) {
      parts.push('\n');
    }
    for (const child of node.childNodes) walk(child);
  }

  for (const child of root.childNodes) walk(child);
  return parts.join('').replace(/\n+$/, '');
}

/** 用占位符文本重建输入框 DOM（文本 + 表情图） */
export function renderServiceEmoticonEditor(root, text) {
  if (!root) return;
  root.innerHTML = '';
  const segments = parseServiceEmoticonSegments(text);
  if (!segments.length) return;
  const frag = document.createDocumentFragment();
  for (const seg of segments) {
    if (seg.type === 'emoji') {
      const img = createServiceEmoticonImage(seg.code);
      if (img) frag.appendChild(img);
      else frag.appendChild(document.createTextNode(seg.code));
    } else {
      frag.appendChild(document.createTextNode(seg.text || ''));
    }
  }
  root.appendChild(frag);
}

/**
 * 当前选区对应的「序列化文本」偏移
 * 表情按占位符字符长度计（与安卓 ImageSpan 底层文本一致）
 */
export function getServiceEmoticonCaretOffset(root) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || !root.contains(sel.focusNode)) {
    return serializeServiceEmoticonEditor(root).length;
  }
  const end = { node: sel.focusNode, offset: sel.focusOffset };
  let total = 0;
  let found = false;

  function measureNode(node) {
    if (node.nodeType === Node.TEXT_NODE) return (node.nodeValue || '').length;
    if (node.nodeType !== Node.ELEMENT_NODE) return 0;
    if (node.tagName === 'IMG' && node.dataset.emoticon) return node.dataset.emoticon.length;
    if (node.tagName === 'BR') return 1;
    let sum = 0;
    for (const child of node.childNodes) sum += measureNode(child);
    return sum;
  }

  function walk(node) {
    if (found) return;
    if (node === end.node && node.nodeType === Node.TEXT_NODE) {
      total += end.offset;
      found = true;
      return;
    }
    if (node.nodeType === Node.TEXT_NODE) {
      total += (node.nodeValue || '').length;
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;

    if (node === end.node) {
      const children = Array.from(node.childNodes);
      for (let i = 0; i < end.offset && i < children.length; i += 1) {
        total += measureNode(children[i]);
      }
      found = true;
      return;
    }

    if (node.tagName === 'IMG' && node.dataset.emoticon) {
      total += node.dataset.emoticon.length;
      return;
    }
    if (node.tagName === 'BR') {
      total += 1;
      return;
    }
    for (const child of node.childNodes) {
      walk(child);
      if (found) return;
    }
  }

  walk(root);
  return total;
}

/** 按序列化偏移恢复光标 */
export function setServiceEmoticonCaretOffset(root, targetOffset) {
  const sel = window.getSelection();
  if (!sel || !root) return;
  let remaining = Math.max(0, targetOffset);
  /** @type {{ node: Node, offset: number } | null} */
  let pos = null;

  function walk(node) {
    if (pos) return;
    if (node.nodeType === Node.TEXT_NODE) {
      const len = (node.nodeValue || '').length;
      if (remaining <= len) {
        pos = { node, offset: remaining };
        return;
      }
      remaining -= len;
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    if (node.tagName === 'IMG' && node.dataset.emoticon) {
      const len = node.dataset.emoticon.length;
      if (remaining <= len) {
        const parent = node.parentNode;
        pos = {
          node: parent,
          offset: Array.from(parent.childNodes).indexOf(node) + 1,
        };
        return;
      }
      remaining -= len;
      return;
    }
    if (node.tagName === 'BR') {
      if (remaining <= 1) {
        const parent = node.parentNode;
        pos = {
          node: parent,
          offset: Array.from(parent.childNodes).indexOf(node) + 1,
        };
        return;
      }
      remaining -= 1;
      return;
    }
    for (const child of node.childNodes) {
      walk(child);
      if (pos) return;
    }
  }

  walk(root);
  const range = document.createRange();
  if (pos) {
    try {
      range.setStart(pos.node, pos.offset);
    } catch {
      range.selectNodeContents(root);
      range.collapse(false);
    }
  } else {
    range.selectNodeContents(root);
    range.collapse(false);
  }
  range.collapse(true);
  sel.removeAllRanges();
  sel.addRange(range);
}
