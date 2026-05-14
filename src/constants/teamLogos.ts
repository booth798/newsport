import bairenUrl from '@/assets/images/events/logo/bairen.png?url';
import guomiUrl from '@/assets/images/events/logo/guomi.png?url';
import hetafeiUrl from '@/assets/images/events/logo/hetafei.png?url';
import madeliUrl from '@/assets/images/events/logo/madeli.png?url';
import reciUrl from '@/assets/images/events/logo/reci.png?url';
import yatelandaUrl from '@/assets/images/events/logo/yatelanda.png?url';

/** 本地测试用：队名 → 静态队徽资源（与 `src/assets/images/events/logo` 下拼音文件名对应） */
const TEAM_LOGO_BY_NAME: Record<string, string> = {
  拜仁慕尼黑: bairenUrl,
  拜仁: bairenUrl,
  亚特兰大: yatelandaUrl,
  马德里竞技: madeliUrl,
  马竞: madeliUrl,
  赫塔菲: hetafeiUrl,
  托特纳姆热刺: reciUrl,
  热刺: reciUrl,
  国际米兰: guomiUrl,
  国米: guomiUrl,
};

/**
 * @param teamName 中文队名
 * @param overrideUrl 接口下发的队徽 URL，优先于本地映射
 */
export function resolveTeamLogoUrl(teamName: string, overrideUrl?: string): string | undefined {
  if (overrideUrl) return overrideUrl;
  return TEAM_LOGO_BY_NAME[teamName];
}
